## 🎯 Current Objective

Allow SYS_ADMIN/ADMIN users to select the actual event performer during event creation. Preserve creator identity separately, use existing Event.PerformedBy and Event.CreatedBy fields, validate performer tenant and active status server-side, and retain the existing event-create workflow.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

- Operational backend repository: Saeidesl/PRSPRO2BACKEND-PRODUCTION, branch feature/admin-event-performer-selection; Google Apps Script V8 and Google Sheets.
- Operational frontend repository: Saeidesl/PRSPRO2-PRODUCTION, branch feature/admin-event-performer-selection; HTML/CSS/JavaScript.
- Backend event create path: Router.js routes POST /events to EventService.create; EventService._createUnlocked_ resolves authenticated user, checks admin status, currently permits admin-provided PerformedBy (default current user) and writes PerformedBy plus CreatedBy.
- Backend enrichment already resolves CreatorName from CreatedBy and PerformedByName from PerformedBy in EventService.
- Tenant boundary: performer must belong to same TenantID as authenticated creator; UserRepository is existing lookup mechanism. Active status must be verified.
- Frontend event modal is generated dynamically in js/modules/events.js openForm; event submission payload is assembled near submit flow and sent through PMS.Api.post('/events', payload). PMS.Api is the standardized API client.
- Users endpoint /users is routed by Router.js with USER_VIEW permission; admins are generally allowed by AccessControlService.
- UI performer selector is admin-only; default is current admin user. Non-admin payload must not be allowed to spoof PerformedBy.

## 📋 Macro-Task Queue & Implementation Log

- [x] Task 1 — Discovery & Planning: inspected operational repositories, default branches, EventService event creation and performer/creator attribution, event modal/payload paths, and tenant/user validation.
  - *Log:* Backend EventService.js _createUnlocked_ already uses event.PerformedBy only for admins, defaulting to authenticated user; CreatedBy always remains authenticated user. Existing event enrichment maps PerformedByName and CreatorName. Frontend modal lives in js/modules/events.js and payload is posted via PMS.Api.post('/events'). User lookup route and access layer exist. New isolated feature branches created from main in both authorized operational repos.
- [ ] Task 2 — Backend Validation & API Lookup (IN PROGRESS): validate selected performer is active and tenant-scoped, preserve CreatedBy, reject non-admin spoofing, and ensure frontend can obtain user choices through existing API.
- [ ] Task 3 — Frontend Selection UI: show an active-user selector only to admins in the existing event form, submit selected performer, default to admin, and keep non-admin UX unchanged.
- [ ] Task 4 — Integration & Regression Validation: verify tenant security, create event attribution, histories/report projections, non-admin behavior, project and independent events, and run available automated tests.
