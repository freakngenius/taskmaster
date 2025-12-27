import json
import logging

import httpx
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    get_job_context,
    inference,
    room_io,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("dynamic-agent")

load_dotenv(".env.local")

DEFAULT_INSTRUCTIONS = (
    """You are a helpful voice assistant. Be concise and conversational."""
)


def _get_user_participant(room: rtc.Room) -> rtc.RemoteParticipant | None:
    for p in room.remote_participants.values():
        if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD:
            return p
    return None


def _snake_to_camel(name: str) -> str:
    """Convert snake_case to camelCase for RPC method names."""
    parts = name.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


def _build_tool_schema(name: str, description: str, args: dict) -> dict:
    """Build a function tool schema from name, description, and args."""
    properties = {}
    required = []
    for arg_name, arg_desc in args.items():
        properties[arg_name] = {"type": "string", "description": arg_desc}
        required.append(arg_name)

    return {
        "type": "function",
        "name": name,
        "description": description,
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": False,
        },
    }


def _create_rpc_tool(tool_config: dict):
    """Dynamically create a function tool that calls an RPC method on the browser."""
    name = tool_config["name"]
    description = tool_config.get("description", "")
    args = tool_config.get("args", {})
    rpc_method = _snake_to_camel(name)

    raw_schema = _build_tool_schema(name, description, args)

    async def handler(raw_arguments: dict, context: RunContext):
        logger.info(f"[CLIENT TOOL] {name} called with: {raw_arguments}")
        try:
            room = get_job_context().room
            participant = _get_user_participant(room)
            if not participant:
                return "No browser participant found"
            result = await room.local_participant.perform_rpc(
                destination_identity=participant.identity,
                method=rpc_method,
                payload=json.dumps(raw_arguments) if raw_arguments else "",
            )
            logger.info(f"[CLIENT TOOL] {name} result: {result}")
            return f"Result: {result}"
        except Exception as e:
            logger.error(f"[CLIENT TOOL] {name} error: {e}")
            return f"Error: {e}"

    return function_tool(handler, raw_schema=raw_schema)


class ServerToolConfigError(Exception):
    """Raised when a server tool has invalid configuration."""

    pass


def _validate_server_tool_config(tool_config: dict) -> None:
    """Validate that a server tool has all required fields."""
    required_fields = ["name", "url", "method", "description"]
    missing = [f for f in required_fields if not tool_config.get(f)]
    if missing:
        raise ServerToolConfigError(
            f"Server tool '{tool_config.get('name', 'unknown')}' missing required fields: {missing}"
        )

    valid_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
    method = tool_config.get("method", "").upper()
    if method not in valid_methods:
        raise ServerToolConfigError(
            f"Server tool '{tool_config.get('name')}' has invalid method '{tool_config.get('method')}'. "
            f"Must be one of: {valid_methods}"
        )


def _create_server_tool(tool_config: dict, tool_token: str):
    """Dynamically create a function tool that makes an HTTP request to a server."""
    _validate_server_tool_config(tool_config)

    name = tool_config["name"]
    description = tool_config["description"]
    args = tool_config.get("args", {})
    url = tool_config["url"]
    method = tool_config["method"].upper()

    raw_schema = _build_tool_schema(name, description, args)

    async def handler(raw_arguments: dict, context: RunContext):
        request_url = url
        body_args = raw_arguments.copy() if raw_arguments else {}

        if "id" in body_args:
            request_url = f"{url}/{body_args.pop('id')}"

        logger.info(f"[SERVER TOOL] {name} {method} {request_url} with: {body_args}")
        try:
            async with httpx.AsyncClient() as client:
                if method == "GET":
                    response = await client.get(
                        request_url,
                        params=body_args,
                        headers={"Authorization": f"Bearer {tool_token}"},
                        timeout=10.0,
                    )
                else:
                    response = await client.request(
                        method,
                        request_url,
                        json=body_args if body_args else None,
                        headers={"Authorization": f"Bearer {tool_token}"},
                        timeout=10.0,
                    )
                response.raise_for_status()
                result = response.json()
                logger.info(f"[SERVER TOOL] {name} result: {result}")
                return f"Result: {json.dumps(result)}"
        except httpx.HTTPStatusError as e:
            logger.error(f"[SERVER TOOL] {name} HTTP error: {e.response.status_code}")
            return f"Error: HTTP {e.response.status_code}"
        except Exception as e:
            logger.error(f"[SERVER TOOL] {name} error: {e}")
            return f"Error: {e}"

    return function_tool(handler, raw_schema=raw_schema)


class DynamicAgent(Agent):
    def __init__(self, config: dict, tool_token: str | None = None) -> None:
        self._config = config
        self._tool_token = tool_token

        instructions = config.get("instructions", DEFAULT_INSTRUCTIONS)
        tool_configs = config.get("tools", [])

        dynamic_tools = []
        client_tools = []
        server_tools = []

        for t in tool_configs:
            tool_type = t.get("type", "client")
            if tool_type == "server":
                if tool_token:
                    dynamic_tools.append(_create_server_tool(t, tool_token))
                    server_tools.append(t.get("name"))
                else:
                    logger.warning(
                        f"[DynamicAgent] Skipping server tool '{t.get('name')}' - no tool token available"
                    )
            else:
                dynamic_tools.append(_create_rpc_tool(t))
                client_tools.append(t.get("name"))

        logger.info(
            f"[DynamicAgent] Initialized with {len(dynamic_tools)} tools: "
            f"client={client_tools}, server={server_tools}"
        )

        super().__init__(instructions=instructions, tools=dynamic_tools)

    async def on_enter(self):
        greeting = self._config.get("greeting")
        greeting_instructions = self._config.get("greeting_instructions")

        if greeting:
            await self.session.say(greeting, allow_interruptions=True)
        elif greeting_instructions:
            await self.session.generate_reply(
                instructions=greeting_instructions,
                allow_interruptions=True,
            )


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="Drew-94d")
async def entrypoint(ctx: JobContext):
    config = {}
    if ctx.job.metadata:
        try:
            config = json.loads(ctx.job.metadata)
            logger.info(
                f"[Entrypoint] Parsed config from metadata: {list(config.keys())}"
            )
        except json.JSONDecodeError as e:
            logger.warning(f"[Entrypoint] Failed to parse metadata as JSON: {e}")

    tool_token = config.get("auth", {}).get("tool_token")

    tts_config = config.get("tts", {})
    tts_model = tts_config.get("model", "elevenlabs/eleven_flash_v2_5")
    tts_voice = tts_config.get("voice", "cgSgspJ2msm6clMCkdW9")
    tts_language = tts_config.get("language", "en-US")

    session = AgentSession(
        stt=inference.STT(model="deepgram/flux-general", language="en"),
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=inference.TTS(
            model=tts_model,
            voice=tts_voice,
            language=tts_language,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=DynamicAgent(config, tool_token=tool_token),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC(),
            ),
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)
