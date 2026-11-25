## 🎯 Current Objective

Allow SYS_ADMIN/ADMIN users to select the actual event performer during event creation. Preserve creator identity separately, use existing Event.PerformedBy and Event.CreatedBy fields, validate performer tenant and active status server-side, and retain the existing event-create workflow.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

- Operational backend repository: Saeidesl/PRSPRO2BACKEND-PRODUCTION, branch feature/admin-event-performer-selection; Google Apps Script V8 and Google Sheets.
- Operational frontend repository: Saeidesl/PRSPRO2-PRODUCTION, branch feature/admin-event-performer-selection; HTML/CSS/JavaScript.
- Backend event create path: Router.js routes POST /events to EventService.create; EventService._createUnlocked_ resolves authenticated user, checks admin status, and writes PerformedBy plus CreatedBy.
- EventService enriches events with CreatorName and PerformedByName.
- User lookup via existing GET /users and UserService.list; admins bypass permission check. UserRepository is the existing lookup mechanism.
- Frontend event modal: js/modules/events.js; submission via PMS.Api.post('/events', payload). API client is js/core/api.js; cache-busting script URL is in index.html.
- Tenant boundary: performer must be same TenantID and active. Non-admin event attribution remains authenticated-user enforced by Backend.
- No new database columns, parallel APIs, or workflows are intended.

## 📋 Macro-Task Queue & Implementation Log

- [x] Task 1 — Discovery & Planning
  - *Log:* Inspected operational main branches, EventService.js, EventValidator.js, UserRepository.js, UserService.js, Router.js, frontend pages/events.html, js/modules/events.js and js/core/api.js. Existing CreatedBy/PerformedBy attribution and GET /users route identified. Dedicated feature branches created from main.
- [ ] Task 2 — Backend Validation & Attribution (IN PROGRESS)
  - *Log:* EventService.js now rejects a selected performer who is not in the authenticated tenant or is inactive. CreatedBy remains authenticated user; existing admin-only selection path remains. Added tests/admin-event-performer-validation.test.js static contract test.
- [ ] Task 3 — Frontend Selection UI
- [ ] Task 4 — Integration & Regression Validation


## 🎯 Current Objective — Performer Selection for Ordinary Users

Allow ordinary event creators to select an active performer in their tenant. Default selection remains the current user; Creator attribution and authorization checks remain intact.

## 📋 Macro-Task Queue & Implementation Log — Extension

- [x] Task 1 — Discovery & Planning
  - *Log:* Reviewed existing EventService performer validation and event-create path. No database/schema or route changes required.
- [x] Task 2 — Backend selected performer compatibility
  - *Log:* `_createUnlocked_` now uses `event.PerformedBy || user.ID` for all users. Existing same-tenant active-user validation and creator attribution are preserved. Added `tests/ordinary-event-performer-selection.test.js`.
- [x] Task 3 — Frontend & Integration Validation
  - *Log:* Frontend PR #165 merged into operational main (SHA `be0dd759eee2fe6f56056ee21949cde48d0471a5`); backend PR #99 merged (SHA `357e89e1c95892c2095c426609df1296177a255e`). CI suites passed for source checks, PMS agent suite, diagnostics and frontend checks. User acceptance test pending.


## 🎯 Current Objective — Fix ordinary-user performer list access

Resolve the reported failure loading the user list with ordinary accounts while preserving tenant isolation and exposing only sanitized user records.

## 📋 Macro-Task Queue & Implementation Log — Extension

- [x] Task 1 — Discovery: Reviewed the `/users` route, `UserService.list`, tenant filtering/sanitization, permission gate, and frontend failure handling.
- [ ] Task 2 — Backend route adjustment (IN PROGRESS): Removed the role-code gate for the authenticated read-only `/users` list used by performer selection; authentication remains required and `UserService.list` continues to restrict results to the current tenant and sanitize records. Added a contract test.
- [ ] Task 3 — CI/regression verification and PR review.
- [ ] Task 4 — Production deployment/live acceptance (requires approved operational deployment workflow and live verification).


## 🎯 Current Objective — Production deployment and live acceptance for performer list fix

Track release of merged fix for ordinary-user performer-list access. CI is verified; Apps Script source sync/deployment and live acceptance remain pending.

## 📋 Macro-Task Queue & Implementation Log — Extension

- [x] Task 1 — Discovery and deployment workflow review
  - *Log:* Reviewed the operational sync workflow `.github/workflows/sync-apps-script.yml`. It requires manual `workflow_dispatch`, explicit confirmation input, and for deployment the repository variable `ALLOW_APPS_SCRIPT_DEPLOY=true`. The GitHub connector available here has no workflow-dispatch action, so the release cannot be triggered from this session.
- [x] Task 2 — Backend fix merged
  - *Log:* PR #100 merged to `main` at commit `2cd698a8c08d31b03cf57e6d608020faf45b54c4`. `Router.js` authenticates `GET /users` and calls existing `UserService.list(params)`; tenant scoping and sanitization remain in `UserService.js`. Test contract updated in `tests/event-performer-users-list-permission.test.js`.
- [x] Task 3 — CI verification
  - *Log:* Backend source checks, PMS agent suite, and procurement performance diagnostics all passed for merge commit `2cd698a8c08d31b03cf57e6d608020faf45b54c4`.
- [ ] Task 4 — Apps Script release and live acceptance (IN PROGRESS; blocked on workflow-dispatch capability)
  - *Log:* No source push or web-app deployment has been triggered from this session. Manual dispatch of the production workflow is required; production deployment is gated by `ALLOW_APPS_SCRIPT_DEPLOY` and explicit confirmation. Live ordinary-user validation is still pending.
