# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** Multi-tier Rails MVC + Hotwire (Turbo/Stimulus) frontend with separate Python LiveKit voice agent backend.

**Key Characteristics:**
- Guest-based stateless authentication with session management
- Real-time UI updates via Turbo Streams over Action Cable
- Dual API layers: browser UI (server-rendered ERB + Stimulus) and voice agent (JSON REST)
- Token-based authentication for voice agent tool execution
- Separation of concerns: Rails backend, Stimulus frontend controllers, Python LiveKit agent

## Layers

**Presentation Layer:**
- Purpose: Render dynamic task board UI, handle real-time updates, manage Stimulus controllers
- Location: `app/views/`, `app/javascript/controllers/`
- Contains: ERB templates (lists, tasks, projects), Stimulus controller classes for interactivity
- Depends on: Rails ActionView, Turbo, Stimulus, ActionCable subscriptions
- Used by: Browsers, voice agent UI for real-time synchronization

**API Layer:**
- Purpose: Provide REST endpoints for both browser UI and voice agent tool execution
- Location: `app/controllers/api/`
- Contains: `TasksController`, `ProjectsController`, `VoiceController`, `LivekitController`
- Depends on: Models, authentication concerns, OpenAI/ElevenLabs external APIs
- Used by: JavaScript controllers, voice agent via tool tokens, browser requests

**Authentication Layer:**
- Purpose: Manage guest sessions and tool token validation for voice agent
- Location: `app/controllers/concerns/guest_auth.rb`, `app/controllers/concerns/tool_token_authenticatable.rb`
- Contains: Session-based guest creation, tool token scoping and validation
- Depends on: Guest and ToolToken models
- Used by: API controllers, web controllers

**Model Layer (Business Logic):**
- Purpose: Represent domain entities, relationships, and persistence
- Location: `app/models/`
- Contains: Guest, List, Task, Project, ToolToken, Setting classes
- Depends on: ActiveRecord, database schema, external APIs (OpenAI, ElevenLabs)
- Used by: Controllers, views, background jobs

**Voice Agent Layer:**
- Purpose: Bridge browser frontend to LiveKit voice agent, execute agent commands on backend
- Location: `livekit-agent/src/agent.py`, `app/controllers/api/voice_controller.rb`
- Contains: Python agent with tool definitions, voice command orchestration
- Depends on: LiveKit SDK, OpenAI API (gpt-4o-mini), ElevenLabs TTS, Rails backend
- Used by: Browser-side task agent controller triggering voice sessions

## Data Flow

**Browser to Rails to Voice Agent (Creating a Task):**

1. User clicks microphone button in browser (task_agent_controller.js)
2. JavaScript requests LiveKit token from `/api/livekit` endpoint
3. Rails creates temporary tool token and room dispatch
4. Browser connects to LiveKit room with Python voice agent
5. User speaks task description: "Add fix hyperdrive to Repairs project"
6. Python agent transcribes audio with OpenAI Whisper
7. Agent calls `create_task` function tool with {title, project_id}
8. Function tool sends HTTP request to `/api/tasks#create` with tool token
9. Rails API creates task and broadcasts update via Turbo Stream
10. Browser receives Turbo Stream update and re-renders task list
11. Python agent generates TTS response via ElevenLabs
12. Browser plays audio response

**Real-time Updates (Turbo Streams):**

1. Browser connects ActionCable subscription to list (turbo_stream_from in views/lists/show.html.erb)
2. Task model triggers `broadcast_changes` callback on update/create/destroy
3. Broadcasts Turbo Stream update to list channel
4. All connected browsers receive partial re-renders
5. Projects column and today pane update automatically

**Tool Token Lifecycle:**

1. Browser requests voice session via `/api/livekit` → creates ToolToken with 1-hour expiry
2. ToolToken passed to agent as `config["auth"]["tool_token"]`
3. Voice agent includes token in Authorization header for tool function calls
4. Rails validates token presence and expiration before execution
5. ToolToken expires after 1 hour or session ends

**State Management:**

- Guest state: Session cookie (`session[:guest_id]`) persists across browser sessions
- Task/Project state: SQLite database, synchronized via Turbo Streams to all clients
- Voice agent state: In-memory conversation history, tool execution results
- UI state: Stimulus controller properties (isThinking, animationId, inactivityTimeout)

## Key Abstractions

**Guest:**
- Purpose: Isolate user data, manage authentication context
- Examples: `app/models/guest.rb`, GuestAuth concern
- Pattern: Every HTTP request ensures a guest session exists (GuestAuth#ensure_guest creates if missing)
- Relationships: has_many lists, has_many tasks (through lists), has_many tool_tokens

**List:**
- Purpose: Container for tasks and projects (one list per guest currently)
- Examples: `app/models/list.rb`
- Pattern: belongs_to guest, has_many tasks and projects. Creates default project on creation.
- Broadcasts: turbo_stream_from integration for real-time updates

**Task:**
- Purpose: Individual to-do item with position, completion state, project association
- Examples: `app/models/task.rb`, `app/models/task/position.rb`
- Pattern: Position module handles sequencing. Broadcasts changes to project column and today pane on mutation.
- Callbacks: auto_star_when_due_today, add_to_today_when_starred, broadcast_changes

**Project:**
- Purpose: Kanban-style column grouping tasks, visual styling with color
- Examples: `app/models/project.rb`
- Pattern: acts_as_list for position ordering. Safe fallback colors for display.
- as_json: Returns complete project with ordered tasks for API responses

**ToolToken:**
- Purpose: Time-limited bearer tokens for voice agent API access
- Examples: `app/models/tool_token.rb`
- Pattern: Generated on demand in LivekitController, validated in API controllers
- Scope: active scope filters by expiration time

**Setting:**
- Purpose: Centralized environment variable access
- Examples: `app/models/setting.rb`
- Pattern: Class methods that fetch from ENV with defaults (e.g., elevenlabs_voice_id)
- Used by: VoiceController for API credentials, LivekitController for LiveKit config

**Stimulus Controllers:**
- Purpose: Client-side interactivity without full page reloads
- Examples: `task_agent_controller.js`, `editable_column_controller.js`, `task_action_controller.js`
- Pattern: Mount on data-controller attributes in ERB templates, trigger actions on events
- State: Instance properties for canvas, room, audio context, animation state

## Entry Points

**Web Browser (Lists#show):**
- Location: `app/controllers/lists_controller.rb#show` (no code, renders default layout)
- Triggers: GET / (root route)
- Responsibilities: Renders task board ERB template, initializes Stimulus controllers, connects ActionCable
- View: `app/views/lists/show.html.erb`

**Voice Session (Microphone Click):**
- Location: `app/javascript/controllers/task_agent_controller.js#activateMic()`
- Triggers: User clicks microphone icon
- Responsibilities: Requests LiveKit token, initializes room, starts audio stream
- Calls: `/api/livekit#create` → connects to LiveKit agent

**Voice Agent (Python Entry):**
- Location: `livekit-agent/src/agent.py`
- Triggers: LiveKit room connection from browser
- Responsibilities: Transcribe audio, call LLM, execute tool functions, generate TTS
- Tool execution: HTTP POST to `/api/tasks#create`, `/api/projects#create`, etc. with tool token

**API Root Endpoint:**
- Location: `config/routes.rb`
- Routes: `/api/tasks`, `/api/projects`, `/api/voice`, `/api/livekit`
- Authentication: ToolTokenAuthenticatable (token from Authorization header) OR session (from cookie)

## Error Handling

**Strategy:** Try-catch wrappers in controller actions, render JSON error responses, log to Rails.logger

**Patterns:**

- Model validation failures render unprocessable_entity (422) with error messages
- RecordNotFound rescue in set_* filters returns not_found (404)
- External API failures (OpenAI, ElevenLabs, LiveKit) logged with error context, graceful nil returns
- JavaScript catches Promise rejections in Stimulus controllers, toggles UI visibility (hiding spinners, showing error messages)
- Voice controller logs comprehensive context: "[Voice]", "[LiveKit API]", "[CLIENT TOOL]" prefixes

## Cross-Cutting Concerns

**Logging:** Extensive logging via Rails.logger with contextual prefixes. Voice controller logs API requests/responses with JSON pretty-print. Timestamps and request IDs via Rails standard logging.

**Validation:** Active Record model validations (presence, length, uniqueness). Controller-level param whitelisting with permit(). ToolToken active scope validates expiration.

**Authentication:** GuestAuth concern ensures session[:guest_id] exists on every request. ToolTokenAuthenticatable validates Authorization header or falls back to session. Api controllers support both mechanisms for flexibility (browser UI and voice agent).

**Broadcasting:** Task model broadcasts via Turbo::StreamsChannel to list-scoped channels. Triggers on save/destroy callbacks. Updates specific targets (project column, today pane) with partial renders.

---

*Architecture analysis: 2026-02-09*
