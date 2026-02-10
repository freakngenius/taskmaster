# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Monolithic Voice Controller:**
- Issue: `app/controllers/api/voice_controller.rb` (497 lines) contains hardcoded system prompts and duplicates AI instructions that also appear in `task_agent_controller.js` (911 lines). Any changes to voice behavior require updating both locations.
- Files: `app/controllers/api/voice_controller.rb`, `app/javascript/controllers/task_agent_controller.js`
- Impact: Maintenance burden increases with each feature addition; inconsistencies between server and client implementations could cause unexpected behavior
- Fix approach: Extract shared instructions and tool definitions to a centralized configuration module; reference from both controller and JavaScript

**Excessive Console Logging in Production:**
- Issue: 98+ console.log/warn/error statements scattered across JavaScript controllers without environment-aware filtering. All logging goes to user's browser console in production.
- Files: Multiple files in `app/javascript/controllers/` including `task_agent_controller.js`, `editable_column_controller.js`, `add_sticky_controller.js`
- Impact: Performance overhead; potential information leakage (detailed debug info visible to users); logs are lost on page refresh since no backend aggregation
- Fix approach: Implement structured logging with environment detection; send critical errors to backend logging service only; remove debug logs or gate them behind feature flags

**Task Model Fragmentation:**
- Issue: Task model (`app/models/task.rb`) handles multiple concerns: color inheritance from projects, auto-starring for due dates, and today pane synchronization. Task Position included as separate module but logic spread across multiple before/after hooks.
- Files: `app/models/task.rb`, `app/models/task/position.rb`
- Impact: Complex interdependencies make the model fragile; changes to one concern risk breaking others; difficult to test individual behaviors in isolation
- Fix approach: Extract concerns into dedicated service objects (e.g., `TaskColorService`, `TaskSchedulingService`); simplify model to delegation pattern

**Duplicate Authentication Logic:**
- Issue: Authentication middleware (`authenticate_request!`) copied identically between `app/controllers/api/tasks_controller.rb` and `app/controllers/api/projects_controller.rb` with manual token validation, fallback to session auth
- Files: `app/controllers/api/tasks_controller.rb:15-34`, `app/controllers/api/projects_controller.rb:15-34`
- Impact: Any security fix in one controller requires updates in another; inconsistent auth behavior if implementations drift
- Fix approach: Consolidate into `ToolTokenAuthenticatable` concern or move to application_controller.rb; provide single, tested authentication point

**Client-Side State Synchronization Issues:**
- Issue: Project colors and font colors synced through multiple data attribute sources in `app/javascript/controllers/editable_column_controller.js` with fallback chains (lines 316-321) and redundant dataset updates
- Files: `app/javascript/controllers/editable_column_controller.js:283-322`, `app/javascript/controllers/add_sticky_controller.js:9-46`
- Impact: Color state can become out-of-sync between elements; style updates sometimes fail silently; difficult to debug synchronization issues
- Fix approach: Implement single source of truth using Stimulus values; broadcast color changes through custom events; eliminate parallel data attribute updates

## Known Bugs

**Inactivity Timeout Not Resetting Properly:**
- Symptoms: Voice agent may disconnect unexpectedly even during active conversation if user pauses speaking for 3 minutes
- Files: `app/javascript/controllers/task_agent_controller.js:29-43`
- Trigger: User takes >3 minutes between speech turns; timeout fires even during thinking/transcription phases
- Workaround: None; user must restart conversation. Consider extending timeout to 5-10 minutes for multi-step tasks

**Color Validation Allows Invalid Hex:**
- Symptoms: Project colors sometimes render as black (#000000) or don't apply to new sticky notes
- Files: `app/javascript/controllers/editable_column_controller.js:282-288`, `app/models/project.rb:24-26`
- Trigger: Non-6-digit hex codes or colors not starting with '#' pass validation; fallback logic hides rather than rejects invalid input
- Workaround: Re-save project with valid hex code from color picker

**Task Position Reordering Fails Silently:**
- Symptoms: Drag-reordering UI shows task moved, but after refresh returns to original position
- Files: `app/controllers/api/tasks_controller.rb:74-89` (position validation missing), `app/javascript/controllers/sortable_controller.js`
- Trigger: Reorder outside bounds (-1 position or beyond task count) or during concurrent updates
- Workaround: Refresh page to see correct order; avoid dragging while voice agent is processing updates

**LiveKit Agent Doesn't Join Room:**
- Symptoms: Voice UI shows "Thinking" animation indefinitely; agent never responds; user sees no error
- Files: `app/javascript/controllers/task_agent_controller.js:548-553` (10-second timeout logs warning but doesn't notify user)
- Trigger: LiveKit Python agent not running, dispatch fails silently, or room creation timing issue
- Workaround: Check Rails logs for dispatch errors; restart both Rails app and Python agent; look for "Agent dispatch FAILED" in logs

## Security Considerations

**Tool Token Expiration Not Enforced Consistently:**
- Risk: Tool tokens created with 1-hour expiration (`app/models/guest.rb:11`) but no server-side validation that expired tokens are rejected before database query
- Files: `app/controllers/api/tasks_controller.rb:20`, `app/controllers/api/projects_controller.rb:20`, `app/models/tool_token.rb:6`
- Current mitigation: `ToolToken.active` scope filters by expires_at, but scope used inconsistently; deleted tokens can be queried directly
- Recommendations: Enforce token expiration in `authenticate_request!` before database lookup; add explicit check for `!token.expired?`; consider token revocation list for emergencies

**Agent Configuration Passed Unsanitized:**
- Risk: User-controlled `agentConfig` from JavaScript (`task_agent_controller.js:89-231`) passed directly to LiveKit agent dispatch via `to_unsafe_h` (line 62 in `livekit_controller.rb`)
- Files: `app/controllers/api/livekit_controller.rb:62`, `app/javascript/controllers/task_agent_controller.js:240-245`
- Current mitigation: None; instructions and tool definitions sent as-is
- Recommendations: Validate agent config schema server-side; whitelist allowed keys and values; sanitize instruction text to prevent prompt injection; log dispatched configs for audit

**API Endpoints Lack Rate Limiting:**
- Risk: Voice agent and browser UI can make unlimited requests to task/project CRUD endpoints; no protection against rapid-fire or automated abuse
- Files: `app/controllers/api/tasks_controller.rb`, `app/controllers/api/projects_controller.rb`
- Current mitigation: Authentication only; assumes all authenticated users are trustworthy
- Recommendations: Implement request throttling per guest; limit voice operations (create/delete) to 10/minute; add exponential backoff for tool calls; monitor for suspicious patterns

**Session-Based Auth Without CSRF Protection on API Routes:**
- Risk: `skip_before_action :verify_authenticity_token` on API controllers allows CSRF attacks if user visits malicious site while authenticated
- Files: `app/controllers/api/tasks_controller.rb:5`, `app/controllers/api/projects_controller.rb:5`, `app/controllers/api/voice_controller.rb:9`, `app/controllers/api/livekit_controller.rb:6`
- Current mitigation: Token-based auth available as fallback
- Recommendations: Require Bearer token authentication for all API calls; remove session fallback or enforce CSRF token on session-authenticated requests; document why CSRF is disabled

**Sensitive Data Logged to Browser Console and Rails Logs:**
- Risk: Task content, project structures, user identifiers exposed in browser console and Rails logs without redaction
- Files: `app/javascript/controllers/` (98 console.log calls), `app/controllers/api/tasks_controller.rb:131` (full response logged), `app/controllers/api/projects_controller.rb:104` (full response logged)
- Current mitigation: None; logs are world-visible in production
- Recommendations: Remove console.logs from production builds; implement structured backend logging with PII redaction; add data classification to sensitive fields

**No Input Validation on Task/Project Names:**
- Risk: Task titles allow 500 characters without length enforcement at API level; project names have presence validation only; could enable DoS via oversized payloads or XSS via unescaped content
- Files: `app/models/task.rb:13`, `app/models/project.rb:5`
- Current mitigation: Template escaping in views; relies on Rails HTML safety
- Recommendations: Add client-side max-length; validate title length on API before save; implement content type checking (reject HTML/script tags); add rate limiting on creation

## Performance Bottlenecks

**Unbounded Task/Project List Rendering:**
- Problem: No pagination or lazy loading; all tasks for a guest loaded and rendered on initial page load
- Files: `app/controllers/lists_controller.rb` (loads all tasks), `app/views/lists/show.html.erb`
- Cause: N+1 query pattern if projects/tasks not pre-loaded; browser DOM gets heavy with hundreds of sticky notes
- Improvement path: Implement pagination (50 tasks per page); lazy load hidden projects; use virtual scrolling for large lists; add database indexes on (guest_id, completed, position)

**Turbo Broadcast Overhead:**
- Problem: Every task update triggers broadcasts to all subscribed channels; with many concurrent users, broadcast messages queue up and slow down real-time updates
- Files: `app/models/task.rb:78-97` (broadcast_changes fires on every save), multiple broadcast calls on create/update/destroy
- Cause: Blanket broadcasts to list instead of targeted updates; no debouncing for rapid changes; full partial re-render sent to clients
- Improvement path: Implement targeted broadcasts by task/project ID; batch updates within 100ms windows; send delta updates instead of full HTML; add background job queue

**Large Task Agent Controller State:**
- Problem: `task_agent_controller.js` (911 lines) holds extensive state in instance variables; animation frames continuously render waveform even when invisible
- Files: `app/javascript/controllers/task_agent_controller.js:742-834` (waveform rendering loop)
- Cause: 60fps canvas redraw regardless of visibility; large preloaded configuration object; multiple event listeners never cleaned up
- Improvement path: Implement requestAnimationFrame cancellation on disconnect; use Intersection Observer to stop drawing when off-screen; lazy-load agent config only when needed; consolidate event listeners

**No Database Query Optimization:**
- Problem: Task and project queries lack explicit select/includes directives; broadcasting partial rendering fetches project multiple times per action
- Files: `app/models/task.rb:78-97` (accesses project in broadcast without pre-load), `app/controllers/api/projects_controller.rb:39`
- Cause: Implicit N+1 queries when accessing associations in loops; no query logging/analysis in development
- Improvement path: Add includes(:project) to task queries; use select to fetch only needed columns; implement bullet gem for N+1 detection; add query analysis to CI

## Fragile Areas

**Sticky Note HTML String Building:**
- Files: `app/javascript/controllers/add_sticky_controller.js:80+` (template literal with HTML)
- Why fragile: Manual string concatenation with no templating; task ID and colors interpolated directly; missing proper DOM creation
- Safe modification: Use document.createElement + setAttribute instead of innerHTML; extract template to HTML element; validate color format before interpolation
- Test coverage: No unit tests for insertStickyNote method; visual regression tests recommended

**Voice Command Parsing and Tool Invocation:**
- Files: `app/controllers/api/voice_controller.rb:188-314` (chat_completion and tool execution), `app/javascript/controllers/task_agent_controller.js:143-231` (tool definitions)
- Why fragile: Tool calls executed based on LLM output without validation; function names matched by string; argument parsing with JSON.parse without error handling
- Safe modification: Validate tool names against whitelist before execution; wrap JSON.parse in try-catch; add argument schema validation; test with adversarial LLM outputs
- Test coverage: No tests for execute_tool_calls method; hardcoded tool list requires manual sync

**Modal DOM Creation in JavaScript:**
- Files: `app/javascript/controllers/editable_column_controller.js:100-217` (createModal method)
- Why fragile: Large HTML string created in JavaScript; event listeners attached inline without delegation; no cleanup if modal already exists
- Safe modification: Move modal template to data attribute or hidden template element; use event delegation for all modal interactions; implement proper modal lifecycle hooks
- Test coverage: No DOM tests; modal behavior tested manually only

**Broadcast to List with Project Context:**
- Files: `app/models/task.rb:81-97` (broadcast_changes method)
- Why fragile: Assumes list always available; broadcasts to list but targets project-specific element; if project deleted, broadcast still references missing target
- Safe modification: Check project existence before broadcasting; implement separate broadcast method for project vs list context; add error handling for missing broadcast targets
- Test coverage: No tests for broadcast behavior; integration tests miss concurrent delete scenarios

**Session-Based Guest Lookup:**
- Files: `app/controllers/concerns/guest_auth.rb:25-27` (current_guest method)
- Why fragile: Recreates guest if session ID invalid; no audit of created guests; guest.lists.first returns nil if no lists exist, causing downstream errors
- Safe modification: Validate session[:guest_id] exists before using; add error state handling for missing lists; implement soft delete instead of recreation
- Test coverage: No tests for guest creation or recovery flows

## Scaling Limits

**SQLite Database Limits:**
- Current capacity: Single file, adequate for <10k tasks per user, single server deployment
- Limit: Concurrent writes block readers (SQLite locking); no built-in replication; maximum practical database size ~10GB
- Scaling path: Migrate to PostgreSQL for concurrent access; implement read replicas; add connection pooling; consider sharding by guest_id if user base grows

**In-Memory LiveKit Room State:**
- Current capacity: Python agent holds room and participant state in memory; one agent process per room
- Limit: Single agent process can handle 1-2 concurrent conversations before latency increases; no load balancing
- Scaling path: Deploy multiple agent processes behind load balancer; implement room pooling; use Redis for session state sharing

**Browser Memory Usage:**
- Current capacity: Large projects (100+ sticky notes) use 50-100MB RAM; waveform visualization continuous 60fps updates
- Limit: Mobile devices with <512MB available RAM may see slowdowns; page becomes laggy with 200+ tasks
- Scaling path: Implement virtual scrolling for sticky notes; lazy load projects; stop waveform when idle; implement service worker caching

## Dependencies at Risk

**livekit-server-sdk (Ruby):**
- Risk: Hardcoded agent name "Drew-94d" in dispatch call (`app/controllers/api/livekit_controller.rb:43`) means agent must be deployed with exact name or requests fail silently
- Impact: Adding agents or changing agent names requires code changes; no fallback mechanism if named agent unavailable
- Migration plan: Extract agent name to configuration; implement agent discovery/registry; add error handling for unknown agents

**Elevenlabs TTS (Python):**
- Risk: Dependency on external TTS service; API key stored in environment; no fallback if service is down or rate-limited
- Impact: Voice responses fail silently; no indication to user why agent isn't speaking; errors logged but not surfaced
- Migration plan: Implement TTS service abstraction; add fallback to alternative provider (Google Cloud TTS, AWS Polly); cache generated speech

**LiveKit Agents Framework (Python):**
- Risk: Framework undergoing rapid development; version pinning missing in `pyproject.toml`; breaking changes between minor versions possible
- Impact: Dependency updates could break agent without warning; version constraints not documented
- Migration plan: Pin to specific version range; add integration tests that detect breaking changes; monitor LiveKit release notes for deprecations

## Missing Critical Features

**Undo/Redo System Not Implemented:**
- Problem: API responses include `undo_by` hints (e.g., "delete_task(id: 123)") but client doesn't track changes or implement undo queue
- Blocks: Users cannot easily recover from accidental deletions; multi-step operations require manual recovery
- Impact: High frustration for voice interface where users can't easily reverse commands spoken by accident

**Offline Support Missing:**
- Problem: No service worker implementation; all functionality requires network connectivity
- Blocks: Voice interface unusable on unreliable connections; drafts not saved locally; no conflict resolution if connectivity restored
- Impact: Mobile users experience data loss on network interruption

**User Preferences/Settings Not Persisted:**
- Problem: Font size, zoom level, layout preferences reset on page refresh
- Blocks: Users must reconfigure settings each session; accessibility preferences not remembered
- Impact: Reduces usability for users with visual needs

**Voice Command History/Transcripts Not Logged:**
- Problem: Conversation history only in memory; lost on disconnect; no way to audit what commands were executed
- Blocks: Users cannot review or correct mistaken voice commands; no debugging history for failed operations
- Impact: Trust issues with voice interface; difficult to troubleshoot execution errors

## Test Coverage Gaps

**Voice Controller Tool Execution:**
- What's not tested: `execute_tool_calls` method, tool call argument validation, error handling for failed tool calls, concurrent tool execution
- Files: `app/controllers/api/voice_controller.rb:382-410`
- Risk: Tool invocations could fail or execute with wrong arguments without detection; malformed arguments passed to database operations
- Priority: High

**LiveKit Room Connection and Disconnection:**
- What's not tested: Room connection failures, agent join timeout, participant tracking, audio track subscription, room cleanup
- Files: `app/javascript/controllers/task_agent_controller.js:495-669`
- Risk: Partial connection states could leave zombie connections; resources not cleaned up; debugging connection issues difficult
- Priority: High

**Project Color Synchronization:**
- What's not tested: Color propagation to existing tasks, font color cascading, color fallback logic, concurrent color updates
- Files: `app/models/project.rb`, `app/javascript/controllers/editable_column_controller.js`
- Risk: Color state diverges between UI and database; concurrent updates lost; fallback logic masks actual errors
- Priority: Medium

**API Authentication:**
- What's not tested: Expired token rejection, missing authorization header, invalid token format, session fallback behavior, concurrent auth requests
- Files: `app/controllers/api/tasks_controller.rb:15-34`, `app/controllers/api/projects_controller.rb:15-34`
- Risk: Auth bypass through timing attacks, expired tokens accepted, session hijacking possible
- Priority: High

**Broadcast Message Delivery:**
- What's not tested: Broadcast to missing channels, partial render failures, concurrent broadcast races, subscriber cleanup
- Files: `app/models/task.rb:78-118`
- Risk: UI updates fail to reach clients; stale data persists; memory leaks from unsubscribed channels
- Priority: Medium

---

*Concerns audit: 2026-02-09*
