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
- [ ] Task 3 — Frontend event actions and editing experience
- [ ] Task 4 — Integration, automated regression tests and release readiness