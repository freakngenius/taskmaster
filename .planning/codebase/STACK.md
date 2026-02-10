# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- Ruby 3.4.7 - Backend server and Rails framework
- JavaScript/TypeScript - Frontend controllers with Stimulus and Hotwire
- Python 3.9+ - Voice agent service via LiveKit Agents

**Secondary:**
- HTML/ERB - Server-rendered views
- CSS - Styling with Propshaft asset pipeline

## Runtime

**Environment:**
- Ruby on Rails 8.1.1 - Web framework
- Puma - Ruby web server
- Python 3.9+ - LiveKit agent runtime

**Package Manager:**
- Bundler - Ruby dependency management (Gemfile/Gemfile.lock)
- uv - Python package manager (livekit-agent/pyproject.toml)
- ImportMap Rails - JavaScript module imports

## Frameworks

**Core:**
- Rails 8.1.1 - Full-stack web framework
- Stimulus Rails - JavaScript framework for controllers (`app/javascript/controllers/`)
- Turbo Rails - Dynamic page updates with HTTP
- Propshaft - Asset pipeline for CSS/JS

**Voice & Real-time:**
- LiveKit Server SDK (Ruby gem) - WebRTC infrastructure and voice agent dispatch
- LiveKit Agents 1.3+ (Python) - Voice AI agent framework
- LiveKit Client 2.9.0 - Browser WebRTC client (via ImportMap)

**Task & Queue Management:**
- Solid Queue - Rails queue system for background jobs
- Solid Cable - WebSocket adapter for Action Cable
- Solid Cache - SQLite-backed cache store
- Acts As List - Ordered list/position management

**Testing:**
- Capybara - Browser automation for integration tests
- Selenium WebDriver - WebDriver support
- pytest - Python test framework (in livekit-agent/pyproject.toml)
- pytest-asyncio - Async test support for Python

**Development:**
- Kamal - Docker deployment via SSH
- Bootsnap - Rails boot time optimization
- Thruster - HTTP caching and X-Sendfile for Puma
- Image Processing - Active Storage image variants
- Dotenv Rails - Environment variable loading

**Quality & Security:**
- Brakeman - Static security analysis
- Bundler Audit - Gem vulnerability scanning
- RuboCop Rails Omakase - Rails style enforcement
- Ruff - Python linter and formatter (in livekit-agent)

## Key Dependencies

**Critical:**
- sqlite3 >= 2.1 - SQLite database adapter (used for development and production)
- livekit-server-sdk - LiveKit API client for room creation and agent dispatch
- livekit-agents[silero,turn-detector]~=1.3 - Python agent framework with Silero VAD and turn detection
- livekit-plugins-elevenlabs~=1.3 - ElevenLabs TTS integration for voice synthesis
- livekit-plugins-noise-cancellation~=0.2 - Noise suppression for audio

**Infrastructure:**
- turbo-rails - HTTP-based dynamic updates
- stimulus-rails - DOM behavior framework
- jbuilder - JSON API builder (serialization)
- tzinfo-data - Timezone data for Windows/JRuby
- puma >= 5.0 - Web server with threading

**Frontend Libraries (via ImportMap):**
- livekit-client@2.9.0 - WebRTC client for voice connections
- sortablejs@1.15.3 - Drag-and-drop task reordering
- stripe-gradient - Animated gradient utility

**Python Dependencies:**
- python-dotenv - Environment variable loading
- python-handlebars>=0.0.3 - Template rendering for agent responses
- aiohttp - Async HTTP client
- av - Audio/video codec support

## Configuration

**Environment Variables:**
- `LIVEKIT_URL` - WebSocket URL for LiveKit server (e.g., wss://your-project.livekit.cloud)
- `LIVEKIT_API_KEY` - LiveKit API credentials
- `LIVEKIT_API_SECRET` - LiveKit secret for token signing
- `OPENAI_API_KEY` - OpenAI API access (Whisper transcription + GPT-4o mini chat)
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice synthesis
- `ELEVENLABS_VOICE_ID` - Voice ID for TTS (default: nCYk9voia6xxvTOh6pzy)
- `RAILS_MAX_THREADS` - Puma thread pool size (default: 5)
- `PORT` - Puma listener port (default: 4000)
- `RAILS_MASTER_KEY` - Encryption key for credentials (required in production)
- `SOLID_QUEUE_IN_PUMA` - Run job queue inside Puma process
- `JOB_CONCURRENCY` - Job processing thread count
- `WEB_CONCURRENCY` - Puma process count

**Configuration Files:**
- `config/database.yml` - SQLite configuration for dev/test/production (separate cache/queue DBs)
- `config/cable.yml` - Action Cable (WebSocket) adapter configuration
- `config/queue.yml` - Solid Queue dispatcher and worker settings
- `config/cache.yml` - Solid Cache store with 256MB max size
- `config/puma.rb` - Puma server threading and plugin configuration
- `config/deploy.yml` - Kamal Docker deployment configuration
- `config/importmap.rb` - JavaScript module pinning via ImportMap Rails
- `.env.example` - Template for LiveKit environment variables
- `.ruby-version` - Ruby version constraint (3.4.7)

## Database

**Primary:**
- SQLite 3.8.0+ - Main application database (storage/development.sqlite3)

**Specialized SQLite Databases (Production):**
- `storage/production_cache.sqlite3` - Solid Cache backing store
- `storage/production_queue.sqlite3` - Solid Queue backing store
- `storage/production_cable.sqlite3` - Solid Cable (WebSocket) message store

## Platform Requirements

**Development:**
- Ruby 3.4.7
- Node.js (for asset compilation, not explicitly required in modern Rails)
- Python 3.9+ (for livekit-agent development)
- SQLite 3.8.0+

**Production:**
- Docker container (via Kamal) with Ruby 3.4.7
- Single or multi-server deployment via SSH
- Persistent volume mount for SQLite database files
- HTTPS proxy or Let's Encrypt for SSL (Kamal can automate)
- 256MB cache allocation minimum

**External Services:**
- LiveKit Cloud instance (WebRTC infrastructure)
- OpenAI API endpoint (Whisper + GPT-4o mini)
- ElevenLabs API endpoint (voice synthesis)

## Asset Pipeline

**JavaScript:**
- ImportMap Rails for ES module loading (no build step required)
- Stimulus controllers for interactivity
- Turbo for dynamic page updates
- External CDN modules: livekit-client, sortablejs, stripe-gradient

**CSS:**
- Propshaft for asset compilation
- Default Rails stylesheet configuration
- Imported styles from app/assets/stylesheets/

---

*Stack analysis: 2026-02-09*
