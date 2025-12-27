# Task Master

Try a live version at https://taskmaster.keithschacht.com

About the project: https://keithschacht.com/2025/Dec/27/voice-first-todo-list-that-updates-live-as-you-talk/

Note: This repo is not a fully functioning app because Task Master lives as part of a larger repo that is coupled to a few other pieces. However, I extracted the interesting parts of code into this repo in case you want to poke around. If there is enough interest, I/we could turn this into an open-source version of Task Master so it could be run as a stand-alone project.

## Notable Bits

Core architecture: When you ask the agent to do something, a livekit javascript WebRTC connection hears you, it routes the audio to a livekit server agent running in LiveKit Cloud, that agent decides to make a tool call which goes to app/controllers/api/tasks_controller.rb, a task.rb model instance updates and it broadcasts the change to your browser (and all other browsers) that are listening via an ActionCable socket connection.

### [`livekit-agent/`](livekit-agent/)

A modified version of the starter voice AI agent that LiveKit gives you. This is a python server agent built with [LiveKit Agents](https://github.com/livekit/agents) and deployed to [LiveKit Cloud](https://cloud.livekit.io/). The task_agent_controller.js connects to this backend with WebRTC to handle the conversation. LiveKit does all the orchestration with ElevenLabs for voice and Whisper (I think) for the speech-to-text.

### [`task_agent_controller.js`](app/javascript/controllers/task_agent_controller.js)

The Stimulus controller that powers the voice interface. Handles microphone activation, connects to LiveKit rooms via WebRTC, manages the audio waveform visualization, and defines all the tool configurations that let the AI agent interact with the task list. The agent's system prompt and available tools (create_task, update_task, delete_task, reorder_task, etc.) are all configured here.

### [`app/controllers/`](app/controllers/)

The Rails controllers that handle user interactions. The lists and tasks controllers serve the HTML interface that users see and interact with directly. The API tasks controller provides the JSON endpoints that the LiveKit agent calls when executing tool actions—each endpoint returns undo instructions so the agent can reverse its actions if needed.

### [`app/models/`](app/models/)

The Task and List models that get persisted to the database.
