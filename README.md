# Taskmaster

A Rails 8 application.

## Notable Bits

### [`livekit-agent/`](livekit-agent/)

A modified version of the starter voice AI agent that LiveKit gives you. This is a python server agent built with [LiveKit Agents](https://github.com/livekit/agents) and deployed to [LiveKit Cloud](https://cloud.livekit.io/). The task_agent_controller.js connects to this backend with WebRTC to handle the conversation. LiveKit does all the orchestration with ElevenLabs for voice and Whisper (I think) for the speech-to-text.

### [`task_agent_controller.js`](app/javascript/controllers/task_agent_controller.js)

The Stimulus controller that powers the voice interface. Handles microphone activation, connects to LiveKit rooms via WebRTC, manages the audio waveform visualization, and defines all the tool configurations that let the AI agent interact with the task list. The agent's system prompt and available tools (create_task, update_task, delete_task, reorder_task, etc.) are all configured here.

### [`app/controllers/`](app/controllers/)

The Rails controllers that handle user interactions. The lists and tasks controllers serve the HTML interface that users see and interact with directly. The API tasks controller provides the JSON endpoints that the LiveKit agent calls when executing tool actions—each endpoint returns undo instructions so the agent can reverse its actions if needed.

### [`app/models/`](app/models/)

The Task and List models that get persisted to the database.
