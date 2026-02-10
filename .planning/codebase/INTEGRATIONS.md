# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**Voice Communication & Real-time:**
- LiveKit Cloud - WebRTC infrastructure for voice agent sessions
  - SDK/Client: `livekit-server-sdk` (Ruby), `livekit-agents` (Python), `livekit-client` (Browser JS)
  - Auth: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
  - URL: `LIVEKIT_URL` environment variable
  - Usage: Room creation, agent dispatch, participant management
  - Code: `app/controllers/api/livekit_controller.rb` creates access tokens and dispatches agent "Drew-94d"

**Speech Recognition (STT):**
- OpenAI Whisper API - Audio-to-text transcription
  - SDK/Client: Net::HTTP (custom HTTP client)
  - Auth: `OPENAI_API_KEY` Bearer token
  - Endpoint: `https://api.openai.com/v1/audio/transcriptions`
  - Model: whisper-1
  - Usage: Transcribe user voice input to text
  - Code: `Api::VoiceController#transcribe_audio` (lines 141-186)
  - Input: Base64-encoded WebM audio
  - Output: Transcription text

**AI Chat & Logic:**
- OpenAI GPT-4o Mini - Text generation and function calling
  - SDK/Client: Net::HTTP (custom HTTP client)
  - Auth: `OPENAI_API_KEY` Bearer token
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Model: gpt-4o-mini
  - Max Tokens: 500
  - Usage: Process user commands and generate responses with tool calls
  - Code: `Api::VoiceController#chat_completion` (lines 188-314)
  - Features: Tool/function calling, system prompts, conversation history

**Speech Synthesis (TTS):**
- ElevenLabs Elevenlabs API - Text-to-speech voice generation
  - SDK/Client: Net::HTTP (custom HTTP client)
  - Auth: `ELEVENLABS_API_KEY` via xi-api-key header
  - Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
  - Model: eleven_flash_v2_5
  - Voice Settings: stability 0.5, similarity_boost 0.75
  - Voice ID: `ELEVENLABS_VOICE_ID` (default: nCYk9voia6xxvTOh6pzy)
  - Usage: Convert text responses to audio for voice playback
  - Code: `Api::VoiceController#generate_speech` (lines 316-347)
  - Output: Base64-encoded audio binary

**Python Agent Audio Processing:**
- ElevenLabs TTS Plugin - Python voice synthesis
  - Package: `livekit-plugins-elevenlabs~=1.3`
  - Integration: Integrated into LiveKit agent framework
  - Code: `livekit-agent/src/agent.py` uses elevenlabs plugin
  - Usage: Real-time voice generation in agent sessions

- Silero Voice Activity Detection (VAD) - Speech detection
  - Package: `livekit-agents[silero]`
  - Model: Pre-trained Silero VAD for Python
  - Usage: Detects when user starts/stops speaking
  - Code: Configured in agent.py dependencies

- LiveKit Turn Detector - Conversation turn detection
  - Package: `livekit-agents[turn-detector]`
  - Integration: MultilingualModel from livekit.plugins.turn_detector
  - Usage: Determines when to hand over conversation turn
  - Code: Imported in `livekit-agent/src/agent.py` (line 21)

- Noise Cancellation Plugin - Audio quality
  - Package: `livekit-plugins-noise-cancellation~=0.2`
  - Usage: Removes background noise from incoming audio

## Data Storage

**Databases:**
- SQLite 3.8.0+
  - Primary Database: `storage/development.sqlite3` (dev) / `storage/production.sqlite3` (prod)
  - Cache Database: `storage/production_cache.sqlite3`
  - Queue Database: `storage/production_queue.sqlite3`
  - Cable Database: `storage/production_cable.sqlite3`
  - Client: sqlite3 gem via ActiveRecord
  - Configuration: `config/database.yml`
  - Schema: Migrations in `db/migrate/`

**File Storage:**
- Local filesystem only - No external S3 or cloud storage
  - Asset storage via Propshaft (compiled CSS/JS)
  - Image processing via Active Storage (if used)
  - Path: `public/assets/` for compiled assets

**Caching:**
- Solid Cache (SQLite-backed) - Database-backed caching
  - Configuration: `config/cache.yml`
  - Max Size: 256 megabytes
  - Namespace: Environment-based
  - Production: Uses separate `cache` SQLite database
  - Retention: Configurable max_age (not set by default)

## Authentication & Identity

**Custom Authentication:**
- Session-based for browser clients
  - Session store: SQLite via Solid Cache
  - Session cookie: Rails standard mechanism
  - Code: `GuestAuth` concern in `app/controllers/concerns/guest_auth.rb`

- Tool Token authentication for voice agent
  - Bearer token in Authorization header
  - Token model: `ToolToken` (has_many on Guest)
  - Expiration: 1 hour default
  - Code: `ToolTokenAuthenticatable` concern + `Api::TasksController`
  - Usage: Authenticates voice agent API requests to task management endpoints

- Guest model for session isolation
  - Model: `app/models/guest.rb`
  - Has many lists, tasks, projects, and tool_tokens
  - Identifier: Unique per guest session
  - No OAuth or third-party auth; application-managed identities

## Real-time Communication

**WebSocket (Action Cable):**
- Technology: Turbo Streams + Action Cable
- Adapter (Development): Async in-process
- Adapter (Production): Solid Cable with SQLite backing
- Configuration: `config/cable.yml`
- Message Retention (Prod): 1 day
- Polling Interval (Prod): 0.1 seconds
- Usage: Live updates to task lists when voice agent modifies tasks
- Code: `Api::VoiceController#broadcast_refresh` broadcasts to `tasks_#{guest_id}` channel

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logging:**
- Rails Logger via console/file
- Custom log entries in controllers: `[LiveKit API]`, `[Voice]`, `[LLM RESPONSE]` prefixes
- Request logging in `Api::TasksController#log_response`
- Backtrace logging on LiveKit dispatch failures

**Structured Logging:**
- API response logging with JSON pretty-printing
- LiveKit API interactions logged with room/user identities
- Audio transcription and speech generation results logged

## CI/CD & Deployment

**Hosting:**
- Kamal + Docker - SSH-based deployment to servers
- Configuration: `config/deploy.yml`
- Deployment: `bin/kamal` commands
- Registry: Configurable (default: localhost:5555)
- SSL: Auto-provisioning via Let's Encrypt available

**Environment:**
- Docker container with Ruby 3.4.7
- Single or multi-server architecture
- Persistent volume: `taskmaster_storage:/rails/storage`
- Service name: taskmaster

**CI Pipeline:**
- None detected - No GitHub Actions, GitLab CI, or similar configured
- Local deployment only via Kamal

## Webhooks & Callbacks

**Incoming:**
- None detected - Application is a consumer of external APIs only

**Outgoing:**
- RPC calls from voice agent to browser
  - Transport: LiveKit participant RPC
  - Code: `livekit-agent/src/agent.py` performs RPC to browser via `room.local_participant.perform_rpc()`
  - Methods: Dynamic tool calls converted to camelCase RPC method names
  - Example: `deleteTask` RPC called from agent to remove tasks from UI

- Turbo Stream updates from server to browser
  - Transport: WebSocket via Action Cable
  - Usage: Real-time task list refresh on voice agent actions
  - Channel: `Turbo::StreamsChannel` broadcasts to `tasks_{guest_id}`

## Environment Configuration

**Required Environment Variables:**
```
LIVEKIT_URL              # WebSocket URL for LiveKit (e.g., wss://project.livekit.cloud)
LIVEKIT_API_KEY          # LiveKit API key
LIVEKIT_API_SECRET       # LiveKit API secret
OPENAI_API_KEY           # OpenAI API key for Whisper + GPT-4o mini
ELEVENLABS_API_KEY       # ElevenLabs API key
```

**Optional Environment Variables:**
```
ELEVENLABS_VOICE_ID      # Voice ID for TTS (default: nCYk9voia6xxvTOh6pzy)
RAILS_MASTER_KEY         # Encryption key for credentials (auto-generated in dev)
SOLID_QUEUE_IN_PUMA      # Run job queue in web process (default for single-server)
JOB_CONCURRENCY          # Job processing threads (default: 1)
WEB_CONCURRENCY          # Puma process count
RAILS_MAX_THREADS        # Puma thread pool size (default: 5)
PORT                     # HTTP port (default: 4000)
RAILS_LOG_LEVEL          # Log verbosity (debug/info/warn/error)
```

**Secrets Location:**
- Development: `.env` file (created from `.env.example`)
- Production: `.kamal/secrets` directory (used by Kamal)
- Rails Encrypted Credentials: `config/credentials.yml.enc` (RAILS_MASTER_KEY required)

## Data Flow

**Voice Agent Interaction:**
1. Browser connects to LiveKit server via WebSocket (livekit-client)
2. Voice input captured and encoded to Base64 WebM
3. POST to `/api/voice` with audio data and conversation history
4. Rails transcribes audio via OpenAI Whisper
5. Rails sends transcription + task context to GPT-4o mini
6. GPT-4o mini returns response text + tool calls
7. Tool calls executed against task database
8. Response text converted to speech via ElevenLabs
9. Browser receives: transcription, response text, audio, updated conversation
10. Task updates broadcast to any connected clients via Action Cable

**Python Agent Architecture:**
- LiveKit Agents framework handles WebRTC connections
- ElevenLabs and Silero plugins handle audio/speech
- Turn detector manages conversation flow
- RPC calls back to browser update UI in real-time
- Function tools dynamically created from config

---

*Integration audit: 2026-02-09*
