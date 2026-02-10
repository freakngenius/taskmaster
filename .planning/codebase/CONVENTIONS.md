# Coding Conventions

**Analysis Date:** 2026-02-09

## Naming Patterns

**Files:**
- Ruby models: `snake_case` with model name (e.g., `task.rb`, `list.rb`, `guest.rb`)
- Controllers: `snake_case` with `_controller.rb` suffix (e.g., `tasks_controller.rb`, `api/tasks_controller.rb`)
- JavaScript controllers: `snake_case` with `_controller.js` suffix (e.g., `task_agent_controller.js`, `keyboard_shortcuts_controller.js`)
- Modules/Concerns: `snake_case` (e.g., `task/position.rb` for `Task::Position` module)
- Views: `snake_case` with `.html.erb` extension (e.g., `_task.html.erb`, `show.html.erb`)
- Python modules: `snake_case` with `.py` extension (e.g., `agent.py`)

**Classes & Modules:**
- PascalCase for class names (e.g., `Task`, `Project`, `Guest`, `ApplicationController`)
- Namespaced classes use `::` separator (e.g., `Api::TasksController`, `Task::Position`)
- Exception classes inherit from standard exception types and end with `Error` or custom exception name (e.g., `ServerToolConfigError`)

**Functions/Methods:**
- snake_case for method names (e.g., `create_default_project`, `auto_star_when_due_today`, `verify_mic_audio`)
- Private methods prefixed with `private` section (see Error Handling)
- Predicate methods end with `?` (e.g., `pristine?`, `completed?`, `showing_completed?`)
- Bang methods `!` for mutations/dangerous operations (e.g., `create_tool_token!`)
- Class methods for factories/utility operations (e.g., `Task.star_tasks_due_today`)

**Variables:**
- snake_case for local and instance variables (e.g., `@current_guest`, `@default_list`, `previous_values`)
- UPPERCASE_WITH_UNDERSCORES for constants (e.g., `STARTER_TASKS`, `INACTIVITY_TIMEOUT_MS`, `DEFAULT_INSTRUCTIONS`)
- JavaScript instance properties initialized in `connect()` (e.g., `this.room`, `this.audioContext`, `this.isThinking`)

**Database Columns:**
- snake_case column names (e.g., `due_at`, `completed`, `project_id`, `created_at`, `updated_at`)
- Boolean columns often prefixed with `is_` or stand-alone (e.g., `completed`, `starred`, `today`)
- Foreign key columns use `model_id` pattern (e.g., `project_id`, `list_id`, `guest_id`)

## Code Style

**Formatting:**
- Linter: RuboCop with `rubocop-rails-omakase` gem for Omakase Ruby styling
- Python: Ruff formatter/linter configured in `livekit-agent/pyproject.toml`
  - Line length: 88 characters
  - Quote style: double quotes
  - Indent: spaces

**Ruby Style Rules (from Omakase):**
- Two-space indentation (Rails convention)
- Single quotes preferred unless string interpolation needed
- Class/method definitions without extra blank lines
- Consistent spacing around operators
- No unnecessary parentheses

**JavaScript Style:**
- ES6 class syntax with proper method definitions
- Arrow functions for callbacks and handlers
- `const` and `let` for variable declarations, no `var`
- Stimulus controller classes extend base `Controller` class
- Static properties for targets and values (e.g., `static targets = ["container"]`, `static values = { index: { type: Number } }`)

## Import Organization

**Ruby:**
1. Standard library requires (e.g., `require "json"`, `require "logging"`)
2. Gem requires (e.g., `from livekit import`, `from dotenv import`)
3. Local application files (implicit through Rails autoloading)
4. Module includes (e.g., `include Task::Position`, `include GuestAuth`)

**JavaScript (Stimulus Controllers):**
1. Framework imports (e.g., `import { Controller } from "@hotwired/stimulus"`)
2. Library imports (e.g., `import { Room, RoomEvent, Track } from "livekit-client"`)
3. Statements follow imports

**Python:**
1. Standard library imports
2. Third-party package imports
3. Local module imports
4. Configured in pyproject.toml with ruff rule "I" (isort)

## Error Handling

**Rails Models:**
- Use Rails validations (`validates :title, presence: true`)
- Model errors collected in `errors` object, rendered as JSON in controllers
- Rescue specific exceptions (e.g., `ActiveRecord::RecordNotFound`) with return value

**Rails Controllers:**
```ruby
def set_task
  @task = @default_list.tasks.find(params[:id])
rescue ActiveRecord::RecordNotFound
  render json: {error: "Task not found"}, status: :not_found
end
```

- Return appropriate HTTP status codes (`:not_found`, `:unprocessable_entity`, `:unauthorized`)
- Error responses as JSON with `error` key: `{ error: "message" }`

**JavaScript (Stimulus):**
```javascript
.catch(error => {
  console.error("[TaskAgent] getUserMedia error:", error)
  if (error.name === "NotAllowedError") {
    // Handle specific error
  }
})
```

- Try-catch blocks for async operations or promise chains
- Console error logging with controller context prefix

**Python:**
```python
class ServerToolConfigError(Exception):
    """Raised when a server tool has invalid configuration."""
    pass
```

- Custom exception classes inherit from `Exception`
- Include docstrings explaining when exception is raised
- Log errors with logger before returning error message

## Logging

**Framework:** Rails.logger in Ruby, Python logging module in Python, console in JavaScript

**Rails Logging:**
```ruby
Rails.logger.info "[AUTO-STAR] Task #{id}: due_at=#{task_date}, today=#{today_date}"
Rails.logger.error "[CLIENT TOOL] #{name} error: #{e}"
```
- Use descriptive prefixes in brackets (e.g., `[AUTO-STAR]`, `[TaskAgent]`, `[AddSticky]`)
- Include context information (IDs, states, values)
- Use appropriate log levels: `info` for normal operations, `error` for failures

**JavaScript Logging:**
```javascript
console.log("[TaskAgent] Controller connected")
console.error("[TaskAgent] getUserMedia error:", error)
```
- Prefix with controller name in brackets
- Log major lifecycle events and errors
- Use `console.log` for info, `console.error` for errors, `console.debug` for debug details

**Python Logging:**
```python
logger = logging.getLogger("dynamic-agent")
logger.info(f"[CLIENT TOOL] {name} called with: {raw_arguments}")
logger.error(f"[CLIENT TOOL] {name} error: {e}")
```
- Initialize logger at module level
- Use f-strings for message formatting
- Prefixes for traceability

## Comments

**When to Comment:**
- Complex business logic (e.g., timezone comparisons, position shifting algorithms)
- Non-obvious state management or side effects
- Workarounds or intentional deviations from standard patterns
- Integration points with external systems

**Examples from codebase:**
```ruby
# Compare dates as strings to avoid timezone issues
task_date = due_at.to_date.to_s
today_date = Date.current.to_s

# Graceful fallback if font_color column doesn't exist yet
def safe_font_color
  return "#1a1a1a" unless self.class.column_names.include?("font_color")
  font_color.presence || "#1a1a1a"
end
```

**JSDoc/TSDoc:**
- Not used extensively in this codebase
- Code should be self-documenting through clear naming and simple functions
- Add JSDoc for complex helper functions or when parameter types are unclear

## Function Design

**Size:**
- Keep methods focused and small (typically 10-20 lines for Ruby, similar for JavaScript)
- Extract complex logic into helper methods
- Example: `auto_star_when_due_today` (14 lines) handles one concern

**Parameters:**
- Use keyword arguments/hashes for multiple parameters in Ruby
- Pass options hash for configuration: `def as_json(options = nil)`
- JavaScript parameters often passed as part of element data attributes via Stimulus values

**Return Values:**
- Explicit returns with meaningful values
- Ruby models return self or true/false from validation/save operations
- Controller actions render JSON responses, don't return values
- JavaScript methods update DOM or state, often return undefined

## Module Design

**Exports:**
- Rails models inherit from `ApplicationRecord` and include modules as needed
- Controllers inherit from `ApplicationController` or `ActionController`
- JavaScript Stimulus controllers export default class extending `Controller`

**Concerns/Modules:**
- `GuestAuth` concern handles guest authentication setup
- `ToolTokenAuthenticatable` concern for tool token validation
- `Task::Position` module included in Task model for positioning logic
- Each concern/module has single responsibility

**Barrel Files:**
- JavaScript controllers registered in `index.js` via individual imports and registered with Stimulus
- Rails autoloading handles module discovery

## API JSON Responses

**Response Format:**
```ruby
render json: {tasks:, undo_by: "..."}        # Success with undo info
render json: {error: "message"}, status: :code  # Errors
render json: {success: true, deleted_count: 0}  # Batch operations
```

- Include `undo_by` field in API responses for voice agent undo capabilities
- Error responses always have `error` key with string message
- Status codes match HTTP semantics (201 for create, 422 for validation, 401 for auth)

## Conventions Summary

- **Naming**: snake_case for identifiers, PascalCase for classes, descriptive predicates with `?`
- **Organization**: Models with scopes, controllers with private setup methods, concerns for cross-cutting logic
- **Error handling**: Rescue specific exceptions, render appropriate HTTP status codes
- **Logging**: Prefixed context tags for traceability in complex async operations
- **Comments**: Explain "why", not "what"; code should be self-documenting
- **Architecture**: Separation of concerns via modules, clear data flow, explicit state transitions

---

*Convention analysis: 2026-02-09*
