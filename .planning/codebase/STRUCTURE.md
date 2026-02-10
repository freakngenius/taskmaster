# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
/Users/keka/taskmaster/taskmaster/
├── app/                              # Rails application code
│   ├── assets/                       # CSS/image assets
│   │   ├── images/
│   │   └── stylesheets/              # CSS files (application.css, tasks.css, sticky_notes.css)
│   ├── controllers/                  # Rails controllers
│   │   ├── api/                      # API endpoints (tasks, projects, voice, livekit)
│   │   ├── concerns/                 # Shared modules (guest_auth, tool_token_authenticatable)
│   │   ├── application_controller.rb # Base controller
│   │   ├── lists_controller.rb       # List CRUD and display
│   │   └── tasks_controller.rb       # Legacy web-based task controller
│   ├── helpers/                      # View helpers
│   │   └── application_helper.rb
│   ├── javascript/                   # JavaScript/Stimulus controllers
│   │   └── controllers/              # Stimulus JS controllers for interactivity
│   ├── jobs/                         # Background jobs (ActiveJob)
│   │   └── application_job.rb
│   ├── mailers/                      # Action Mailer classes
│   │   └── application_mailer.rb
│   ├── models/                       # ActiveRecord models
│   │   ├── task/                     # Task concern modules (position.rb)
│   │   ├── concerns/                 # Model mixins
│   │   ├── guest.rb                  # Guest (user session) model
│   │   ├── list.rb                   # Task list container
│   │   ├── project.rb                # Kanban column
│   │   ├── task.rb                   # Individual task item
│   │   ├── tool_token.rb             # Voice agent auth token
│   │   ├── setting.rb                # Environment config accessor
│   │   ├── current.rb                # Current context (if used)
│   │   └── application_record.rb     # Base model
│   └── views/                        # ERB templates
│       ├── layouts/                  # Layout templates
│       │   ├── application.html.erb  # Root layout
│       │   └── tasks.html.erb        # Task board layout
│       ├── lists/                    # List views
│       │   └── show.html.erb         # Main task board UI
│       ├── tasks/                    # Task partials
│       │   ├── _task.html.erb
│       │   ├── _today_tasks.html.erb
│       │   ├── _category_tasks.html.erb
│       │   ├── _category_column.html.erb
│       │   └── _sticky_note.html.erb
│       ├── projects/                 # Project partials
│       │   └── _project_notes.html.erb
│       └── pwa/                      # PWA manifest (if enabled)
│
├── config/                           # Rails configuration
│   ├── environments/                 # Environment-specific configs
│   ├── initializers/                 # Startup code
│   ├── application.rb                # Main Rails config
│   ├── boot.rb
│   ├── importmap.rb                  # JavaScript import map
│   ├── puma.rb                       # Web server config
│   ├── routes.rb                     # Route definitions
│   └── database.yml                  # Database config
│
├── db/                               # Database
│   ├── migrations/                   # Schema migrations
│   ├── schema.rb                     # Current schema snapshot
│   └── development.sqlite3           # SQLite database file
│
├── lib/                              # Library code
│   └── tasks/                        # Rake tasks
│       └── tasks.rake
│
├── livekit-agent/                    # Python LiveKit agent
│   ├── src/                          # Agent source code
│   │   └── agent.py                  # Main agent entrypoint
│   ├── pyproject.toml                # Python dependencies
│   ├── uv.lock                       # Python lockfile
│   └── AGENTS.md                     # Agent development guide
│
├── public/                           # Static assets
│   ├── icon.png, icon.svg            # App icons
│   └── sounds/                       # Audio files
│
├── test/                             # Test files
│   ├── application_system_test_case.rb
│   ├── test_helper.rb
│   └── .DS_Store
│
├── Gemfile                           # Ruby dependencies
├── Gemfile.lock                      # Ruby lockfile
├── config.ru                         # Rack config
└── .env.local                        # Environment variables (not committed)
```

## Directory Purposes

**app/controllers/api/:**
- Purpose: REST API endpoints for voice agent and browser UI
- Contains: TasksController, ProjectsController, VoiceController, LivekitController
- Key files: `app/controllers/api/tasks_controller.rb`, `app/controllers/api/projects_controller.rb`

**app/controllers/concerns/:**
- Purpose: Shared authentication and authorization logic
- Contains: GuestAuth module (session management), ToolTokenAuthenticatable module (bearer token validation)
- Key files: `app/controllers/concerns/guest_auth.rb`, `app/controllers/concerns/tool_token_authenticatable.rb`

**app/javascript/controllers/:**
- Purpose: Stimulus JS controllers for client-side interactivity
- Contains: Keyboard shortcuts, voice agent UI (waveform, thinking state), task editing, project management
- Key files: `task_agent_controller.js` (voice integration), `task_action_controller.js` (CRUD actions)

**app/models/:**
- Purpose: Data models and business logic
- Contains: Guest, List, Task, Project, ToolToken, Setting classes
- Key files: `task.rb` (position tracking, auto-starring, broadcasting), `project.rb` (color management)

**app/views/lists/:**
- Purpose: Main task board template
- Key file: `show.html.erb` (renders projects, today pane, task grid with Stimulus hooks)

**app/views/tasks/:**
- Purpose: Task partial templates for rendering and re-rendering
- Key files: `_task.html.erb` (single task), `_today_tasks.html.erb` (Turbo update target), `_sticky_note.html.erb` (project task)

**config/routes.rb:**
- Purpose: Route definitions
- Key routes: root -> lists#show, /api/tasks, /api/projects, /api/voice, /api/livekit

**db/migrations/:**
- Purpose: Schema evolution
- Key tables: guests, lists, tasks, projects, tool_tokens

**livekit-agent/src/:**
- Purpose: Python voice agent logic
- Key file: `agent.py` (entrypoint, tool definitions, message building)

## Key File Locations

**Entry Points:**
- `app/views/layouts/application.html.erb`: HTML root, loads stylesheets and importmap
- `app/views/lists/show.html.erb`: Main task board UI, Stimulus controller mounts
- `livekit-agent/src/agent.py`: Voice agent Python entrypoint

**Configuration:**
- `config/application.rb`: Rails configuration
- `config/routes.rb`: URL routing (root, /api/*, nested resources)
- `config/puma.rb`: Web server setup
- `Gemfile`: Ruby dependencies (Rails 8.1.1, Turbo, Stimulus, LiveKit SDK)
- `livekit-agent/pyproject.toml`: Python dependencies (livekit-agents, elevenlabs, silero)

**Core Logic:**
- `app/controllers/api/tasks_controller.rb`: Task CRUD API, tool token auth, position reordering
- `app/controllers/api/voice_controller.rb`: OpenAI API calls, tool execution, conversation history
- `app/models/task.rb`: Task validations, relationships, auto-starring, Turbo broadcasts
- `app/models/guest.rb`: Guest relationships, tool token creation
- `app/javascript/controllers/task_agent_controller.js`: Voice session lifecycle, LiveKit room management

**Testing:**
- `test/test_helper.rb`: Test configuration
- `test/application_system_test_case.rb`: Selenium-based E2E test base

**Special:**
- `db/schema.rb`: Current database schema (auto-generated from migrations)
- `config/importmap.rb`: JavaScript ES modules mapping

## Naming Conventions

**Files:**
- Controllers: `{resource}_controller.rb` (e.g., `tasks_controller.rb`, `api/projects_controller.rb`)
- Models: Singular (e.g., `task.rb`, `guest.rb`)
- Views: `{action}.html.erb` or `_{component}.html.erb` for partials (e.g., `show.html.erb`, `_task.html.erb`)
- Stimulus controllers: `{feature}_controller.js` (e.g., `task_agent_controller.js`)
- Migrations: Timestamp + description (e.g., `20260204000001_create_guests.rb`)

**Directories:**
- Plural for collections (e.g., `app/controllers/`, `app/models/`)
- Singular for nested resources (e.g., `app/views/lists/`, `app/controllers/api/`)
- Concerns in `concerns/` subdirectory with module names matching feature (e.g., `guest_auth.rb`, `tool_token_authenticatable.rb`)

## Where to Add New Code

**New Feature (Task Filtering by Project):**
- Primary code: `app/controllers/api/tasks_controller.rb` (add filter logic)
- Model: `app/models/task.rb` (add scope like `scope :by_project, -> (project_id) { where(project_id:) }`)
- View: `app/views/tasks/_task.html.erb` (adjust rendering if needed)
- Tests: `test/controllers/api/tasks_controller_test.rb`

**New Stimulus Controller (Drag and Drop):**
- Implementation: `app/javascript/controllers/drag_controller.js`
- Mount: Add `data-controller="drag"` to ERB template
- Integration: Update `app/views/lists/show.html.erb` to wire controller

**New API Endpoint (Bulk Task Update):**
- Controller: `app/controllers/api/tasks_controller.rb` (add action like `bulk_update`)
- Route: `config/routes.rb` (add `patch "tasks/bulk", to: "api/tasks#bulk_update"`)
- Authentication: Include `before_action :authenticate_request!` (inherited from module)
- Response: Render JSON with success/error

**Utilities/Helpers:**
- Shared helpers: `app/helpers/application_helper.rb`
- Model concerns: `app/models/concerns/` (extract common logic into modules)
- Controller concerns: `app/controllers/concerns/` (shared auth, validation, formatting)
- Library code: `lib/` (utilities, services not tied to models/controllers)

## Special Directories

**db/:**
- Purpose: Database schema and migrations
- Generated: schema.rb is auto-generated by Rails
- Committed: Migrations committed, schema.rb and development.sqlite3 not committed to production repos

**livekit-agent/:**
- Purpose: Separate Python microservice for voice AI
- Generated: uv.lock generated by uv package manager
- Committed: Source code and pyproject.toml committed, virtual env not committed

**public/:**
- Purpose: Static assets served directly (icons, sounds, service worker if enabled)
- Generated: Assets may be generated by build process in production
- Committed: Source assets (SVG, PNG) committed, compiled assets may not be

**config/initializers/:**
- Purpose: Rails startup configuration (not shown but contains Rails-generated files)
- Generated: Some files auto-generated by Rails generators
- Committed: Initializers committed (contain secrets should be in env)

**tmp/, log/, storage/:**
- Purpose: Runtime generated files (caches, logs, uploaded files)
- Generated: Always generated at runtime
- Committed: Never committed

---

*Structure analysis: 2026-02-09*
