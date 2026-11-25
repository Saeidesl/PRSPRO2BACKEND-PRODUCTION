## 🎯 Current Objective

Implement secure editing and removal (soft-void) of existing events for SYS_ADMIN and users with explicit EVENT_EDIT permission, using the existing event UI, API routes, audit and tenant/project access rules. Preserve event/form/attachment and project workflow integrity; avoid destructive hard deletion.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

- Operational backend: Saeidesl/PRSPRO2BACKEND-PRODUCTION, branch feature/event-edit-delete-20261125; Apps Script V8 / Google Sheets.
- Operational frontend: Saeidesl/PRSPRO2-PRODUCTION, branch feature/event-edit-delete-20261125; HTML/CSS/JS.
- Event read routes: GET /events and GET /events/:id; Router.js delegates to EventService.
- Existing event status mutation: PUT /events/:id/void is protected by EVENT_EDIT and calls EventService.void(id, reason, params); this existing voiding pattern will be reused for delete/withdrawal rather than hard-delete.
- Event persistence: EventRepository uses sheet 13_Events; updateById via EventRepository.update; existing audit service.
- Scope: permission checks must be server-side, tenant-bound, and project-access-aware. SYS_ADMIN bypass is through existing AccessControlService. Permission-bearing virtual/ordinary users must use EVENT_EDIT.
- Editing must not silently replay workflow transitions or overwrite form-response snapshots/central information unless explicitly and safely supported by existing flow; event form data and attachment links must remain intact.
- No parallel workflow, database schema, or API implementation unless discovery proves necessary.

## 📋 Macro-Task Queue & Implementation Log

- [x] Task 1 — Discovery & Planning
  - *Log:* Reviewed operational mainline EventService.js, Router.js, EventRepository.js and Frontend events.js/router.js. Existing EVENT_EDIT permission and soft-void route identified; dedicated branches created in both operational repositories.
- [ ] Task 2 — Backend event edit/removal authorization and integrity (IN PROGRESS)
  - *Implementation log:* Added atomic `PUT /events/:id/basic-fields` with EVENT_EDIT guard and EventService.updateFieldsFromTemplate. Date and description validate together and persist in one repository update under script lock, tenant/project/department and version checks, downstream-event safeguard, and audit. Existing single-field route retained for compatibility; logical void path remains unchanged. Pending regression verification.
- [ ] Task 3 — Frontend event actions and editing experience
- [ ] Task 4 — Integration, automated regression tests and release readiness

- *Compatibility correction (2026-11-25):* Restored `updateFieldFromTemplate` as a backward-compatible adapter that reads the current event fields and delegates to the atomic update method; the legacy route no longer calls a missing service method. Runtime validation pending.
- *Integration review (2026-11-25):* Draft PR opened for integration review; static inspection confirms Router.js atomic route uses `PUT /events/:id/basic-fields`, server-side `EVENT_EDIT`, and service validates both fields, tenant/project scope, department, downstream events, and optimistic version before one update + audit. PR and live verification still pending; CI statuses are empty.
