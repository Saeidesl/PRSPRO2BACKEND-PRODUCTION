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
- [ ] Task 2 — Backend selected performer compatibility (IN PROGRESS)
  - *Log:* `_createUnlocked_` now uses `event.PerformedBy || user.ID` for all users. Existing same-tenant active-user validation and creator attribution are preserved. Added `tests/ordinary-event-performer-selection.test.js`.
- [ ] Task 3 — Frontend & Integration Validation
