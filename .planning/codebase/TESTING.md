# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Rails Test Framework:**
- Framework: Minitest (Rails default)
- Test runner: `bin/rails test`
- System testing: Selenium with headless Chrome
- Config: `test/test_helper.rb` and `test/application_system_test_case.rb`

**Python Test Framework (LiveKit Agent):**
- Framework: pytest
- Async support: pytest-asyncio
- Config: `livekit-agent/pyproject.toml`
- Run: `uv run pytest`

**JavaScript Testing:**
- No automated test framework configured
- Manual testing via browser/console

**Run Commands:**
```bash
# Rails tests
bin/rails test                          # Run all tests
bin/rails test test/models              # Run model tests
bin/rails test:system                   # Run system tests

# Python tests
cd livekit-agent && uv run pytest       # Run pytest suite
cd livekit-agent && uv run pytest tests/ -v  # Verbose

# JavaScript
# Manual testing only - open browser console
```

## Test File Organization

**Rails:**
- Location: `test/` directory with subdirectories matching app structure
- Naming: `*_test.rb` suffix (Rails convention, not shown but followed)
- Structure:
  ```
  test/
  ├── models/          # Model unit tests (.keep file present)
  ├── controllers/     # Controller tests (.keep file present)
  ├── helpers/         # Helper tests (.keep file present)
  ├── integration/     # Integration tests (.keep file present)
  ├── system/          # System tests with Selenium (.keep file present)
  ├── fixtures/        # Test data/fixtures
  ├── test_helper.rb   # Test setup and configuration
  └── application_system_test_case.rb  # System test base class
  ```

**Python (LiveKit Agent):**
- Location: `tests/` directory (inferred from pyproject.toml configuration)
- Async test support configured with pytest-asyncio
- Test discovery automatic via pytest naming conventions

## Test Structure

**Rails Test Case Setup:**
```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end
```

**System Test Setup:**
```ruby
# test/application_system_test_case.rb
require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]
end
```

**Patterns:**
- Parallel test execution enabled by default (uses all available processors)
- Fixtures auto-loaded from `test/fixtures/*.yml`
- Selenium headless Chrome driver for system tests
- Standard viewport size 1400x1400 for consistent screenshots/testing

## Testing Strategy (Inferred from Code)

**No Existing Test Files:**
The codebase currently has no test files in `test/models/`, `test/controllers/`, etc. (only `.keep` placeholder files present).

**Fixtures:**
- Fixtures directory exists at `test/fixtures/files/`
- No YAML fixture files currently visible
- Standard Rails fixture setup available but not yet utilized

## Python Testing (LiveKit Agent)

**Configuration (from `pyproject.toml`):**
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"

[dependency-groups]
dev = [
    "pytest",
    "pytest-asyncio",
    "ruff",
]
```

**Patterns:**
- Async test support via pytest-asyncio plugin
- Auto asyncio mode enabled for cleaner test syntax
- Each test gets its own event loop scope
- Tests should be written for agent behavior, tools, and workflows per AGENTS.md

**Expected Test Structure (per AGENTS.md guidance):**
```python
# Test-driven development recommended
# Write tests before implementing tools/handlers

import pytest
from livekit.agents import RunContext

@pytest.mark.asyncio
async def test_tool_behavior():
    # Test tool execution
    pass

@pytest.mark.asyncio
async def test_agent_workflow():
    # Test agent behavior
    pass
```

## Mocking & Isolation

**Rails:**
- No explicit mocking gem configured (not in Gemfile)
- Can use Mock objects from Minitest standard library
- Database transactions rolled back between tests (standard Rails behavior)
- Fixtures provide test data isolation

**Python:**
- Standard unittest.mock available from Python stdlib
- pytest fixtures for setup/teardown
- Async fixtures via pytest-asyncio

**No Mocking Library Configured:**
- Both Rails and Python tests rely on standard library mocking
- Consider adding `mocha` gem or `unittest.mock` when mocking becomes necessary

## Test Data & Fixtures

**Rails Fixtures:**
- Location: `test/fixtures/`
- Format: YAML files corresponding to model names
- Examples: `test/fixtures/tasks.yml`, `test/fixtures/lists.yml`
- Auto-loaded by test helper; data available as instance variables in tests

**Example Fixture Pattern (to be created):**
```yaml
# test/fixtures/tasks.yml
task_one:
  title: "Fix hyperdrive"
  completed: false
  list: default_list

task_two:
  title: "Calibrate flux capacitor"
  completed: false
  list: default_list
```

**Python Test Data:**
- Use pytest fixtures for setup
- Factory functions for complex object creation
- Config from environment or test-specific setup

## Coverage

**Requirements:** Not explicitly enforced

**Current Status:**
- No test coverage measurement configured
- 0% coverage due to no tests written
- All code paths untested

**Adding Coverage (Recommended):**
```bash
# For Rails: add simplecov gem
gem "simplecov", require: false, group: :test

# In test_helper.rb:
require "simplecov"
SimpleCov.start "rails"

# Run coverage:
COVERAGE=true bin/rails test
```

## Test Types & Scope

**Unit Tests (To Be Implemented):**
- Location: `test/models/`
- Scope: Individual model behavior, validations, scopes, associations
- Example targets: `Task` model validations, `List` pristine? logic, `Project` color fallbacks

**Integration Tests (To Be Implemented):**
- Location: `test/integration/`
- Scope: Multiple models working together, complex workflows
- Example targets: Task creation triggering broadcasts, project-task color inheritance

**System Tests (To Be Implemented):**
- Location: `test/system/`
- Scope: Full user workflows via browser automation
- Framework: Selenium with headless Chrome
- Example tests:
  - Create task via UI, verify it appears
  - Toggle task completion
  - Keyboard shortcuts functionality
  - Voice agent interaction flow
  - Sticky note board operations

**Controller Tests (To Be Implemented):**
- Location: `test/controllers/`
- Scope: API endpoints, request/response handling, status codes
- Test routes in `Api::TasksController`, `Api::ProjectsController`
- Verify JSON response format and undo_by functionality
- Test authentication via tool token and session

## Testing Guidelines (Per AGENTS.md)

**LiveKit Agent Testing:**
The AGENTS.md file recommends test-driven development when:
- Modifying core agent behavior (instructions, tools, tasks/workflows/handoffs)
- Adding new tools
- Implementing workflow changes

**Process:**
1. Write tests for desired behavior first
2. Implement functionality
3. Iterate until tests pass
4. This ensures agent reliability given voice AI latency sensitivity

## Common Patterns to Implement

**Model Test Pattern:**
```ruby
# test/models/task_test.rb
class TaskTest < ActiveSupport::TestCase
  fixtures :tasks, :lists

  test "auto_star_when_due_today updates starred when due today" do
    task = tasks(:task_one)
    task.update(due_at: Date.current)
    assert task.starred?
  end
end
```

**Controller API Test Pattern:**
```ruby
# test/controllers/api/tasks_controller_test.rb
class Api::TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @guest = guests(:one)
    session[:guest_id] = @guest.id
  end

  test "should create task" do
    assert_difference("Task.count") do
      post api_tasks_url, params: { title: "New task", text: nil }
    end
    assert_response :created
  end
end
```

**System Test Pattern:**
```ruby
# test/system/tasks_test.rb
class TasksSystemTest < ApplicationSystemTestCase
  test "create and complete task" do
    visit root_path
    fill_in "task_title", with: "Test task"
    click_on "Create"
    assert_text "Test task"
    click_on "Complete"
    assert_no_text "Test task"
  end
end
```

**Python Async Test Pattern:**
```python
# tests/test_agent.py
import pytest
from livekit.agents import RunContext

@pytest.mark.asyncio
async def test_star_tasks_due_today():
    # Setup
    # Execute
    # Assert
    pass
```

## JavaScript Testing (Manual for Now)

**Stimulus Controller Testing Approach:**
- No automated tests currently configured
- Manual testing via browser console
- Consider adding Jest or Vitest if test coverage becomes requirement
- Controllers to test manually:
  - `task_agent_controller.js` - mic activation, agent lifecycle
  - `keyboard_shortcuts_controller.js` - keyboard event handling
  - `editable_column_controller.js` - drag-and-drop, editing
  - `task_action_controller.js` - task manipulation via UI

---

*Testing analysis: 2026-02-09*

## Summary

**Current State:**
- Test infrastructure in place (Minitest for Rails, pytest for Python)
- No test files written yet
- Headless Chrome configured for system testing

**Next Steps:**
- Write model tests for core business logic (Task, Project, List models)
- Add controller tests for API endpoints
- Create system tests for UI workflows
- Implement Python tests for agent behavior (test-driven per AGENTS.md)
- Consider adding JavaScript testing framework if needed
