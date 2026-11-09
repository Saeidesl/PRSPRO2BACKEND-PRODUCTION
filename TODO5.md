## 🎯 Current Objective

Preserve the exact uploaded source PDF through the complete smart-template workflow: import the original document into the existing designer, keep its pages as the immutable source, place PMS-bound elements above it, and produce a final PDF/print output without rasterizing the original pages.

Acceptance criteria:
- The source PDF remains the canonical document; no page is reconstructed from screenshots or PNG/JPEG backgrounds.
- Original page geometry, page count, rotation, vector content, embedded images, and text remain intact in the final PDF.
- PMS overlay elements are added as a separate layer and remain aligned with the source page.
- Persian/RTL text, existing image attachments, tables, shapes, multi-page documents, and page margins remain usable.
- Existing PDF upload/download APIs, tenant isolation, template definitions, bindings, and workflows remain compatible.
- Browser print is not treated as proof of a vector-preserving PDF output; final PDF generation must be validated by inspecting the resulting PDF structure and rendering.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### Repositories and branch
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`, production branch `main`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`, production branch `main`.
- Implementation branch: `feat/preserve-original-pdf-output-20261109` in both repositories; changes were integrated through approved PRs.
- Backend stack: Google Apps Script V8 + Google Sheets; file storage in tenant-scoped Google Drive.
- Frontend stack: HTML/CSS/JavaScript; PDF.js for PDF inspection and preview; pdf-lib 1.17.1 for source-preserving composition.

### Existing PDF source flow
- `pages/print-designer.html`: existing PDF/image import control and designer canvas.
- `js/modules/print-designer.js:handleImportFile`: routes PDF files to `handlePdfFile(file)`; image imports retain their existing image-to-PDF path.
- `handlePdfFile`: inspects PDF page dimensions/rotation and retains the original PDF file/document.
- `renderPdfBackgrounds` / `renderCanvas`: PDF.js canvas is used for designer visualization; editable PMS elements remain in the existing `definition.elements` model.
- `saveTemplate`: uploads the original PDF through existing `POST /print-templates/:id/pdf`.
- `loadTemplatePdf` / `editTemplate`: retrieves the stored source PDF through the existing API.

### Final output flow after implementation
- `resolveOutput` continues to use the existing `POST /print-templates/:id/resolve` API.
- `fetchOutputPdfBytes`: retrieves the stored source PDF through the existing tenant-scoped PDF API and validates the PDF signature.
- `generateSourcePdfOutput`: uses pdf-lib to load the original document and preserve its page objects/content, then embeds the PMS overlay without rasterizing the source pages.
- `renderOutputDocument(..., {overlayOnly:true})`: renders only PMS overlay elements to transparent canvases; source PDF pages are not converted to page-background PNGs.
- `drawPdfOverlayOnSourcePage`: aligns overlay placement with source page geometry, crop boxes, and rotation.
- `renderFinalPdfPreview`: uses PDF.js to render the generated PDF for on-screen preview; this is preview-only and does not replace the PDF source content.
- `downloadOutputPdf` / `clearGeneratedOutputPdf`: manage the generated PDF output; print action opens the generated PDF for native browser PDF printing.
- Templates without a source PDF retain the existing HTML print workflow.

### Existing Backend contract — unchanged
- `Router.js`: existing routes for `/print-templates`, `/print-templates/:id/pdf`, and `/print-templates/:id/resolve`.
- `PrintTemplateService.js`: existing tenant-scoped PDF upload/download and template resolution.
- `PrintTemplateRepository.js`: metadata and Definition remain in existing sheet `36_PrintTemplates`; PDF bytes remain in tenant-scoped Google Drive storage.
- No Backend runtime, API, or database schema changes were required.

### Integration and safety constraints
- No parallel template editor, storage path, template definition, API, or database structure was created.
- Existing image-import-to-PDF behavior remains intact.
- Existing stored PDFs, template records, permissions, tenant boundaries, and operational data were not migrated or deleted.
- The generated output preserves the original PDF pages and adds PMS elements as an overlay.
- Frontend/Backend API contracts remain unchanged.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** inspected both operational repositories, production branches, TODO5/ARCHITECTURE, source-PDF import/save flow, output renderer, print CSS, existing APIs, and regression tests. Confirmed the source PDF was already retained during import/save; rasterization occurred in the output renderer and browser-print path. Existing Backend APIs and storage were sufficient.
- [x] **Task 2 — Preserve source PDF in final document generation:** implemented source-PDF composition in the existing designer/output workflow. Original PDF pages remain the base document; PMS elements are overlaid without converting the source pages to raster images.
  - *Log:* Frontend `js/modules/print-designer.js`: added `fetchOutputPdfBytes`, `generateSourcePdfOutput`, overlay-only rendering, `drawPdfOverlayOnSourcePage`, final PDF preview, download/cleanup handlers, and PDF output printing; integrated pdf-lib 1.17.1; retained the existing non-PDF template print path. Frontend `pages/print-output.html`: added output download control and margin-settings target. Frontend `css/print-template-library.css`: added overlay host, preview, output controls, and responsive styling. Frontend `tests/print-template-library.test.js`: added regression checks for source-PDF preservation, overlays, rotation/crop alignment, fonts/images, download flow, and asset versioning. Backend runtime files `Router.js`, `PrintTemplateService.js`, and `PrintTemplateRepository.js`, APIs, and sheet `36_PrintTemplates` schema were intentionally unchanged; existing tenant-scoped PDF upload/download/resolve APIs were reused. TODO5 tracking was synchronized in both operational repositories.
- [x] **Task 3 — Regression, compatibility, and acceptance:** JavaScript syntax checks and targeted structural/regression assertions passed. Frontend and Backend changes were merged through approved PRs; Frontend GitHub Pages deployment was initiated and Backend source was manually pushed and deployed to the isolated production Apps Script project. The user completed the live PDF workflow test and explicitly confirmed acceptance.
  - *Log:* Verified syntax for `js/modules/print-designer.js` and `tests/print-template-library.test.js`; added/updated regression assertions in `tests/print-template-library.test.js` for source preservation and overlay alignment. Frontend PR #68 merged to production main as `704db5a0003359cf3b27f3a13a258dc29b156fda`; Backend PR #40 merged to production main as `07a5eae94d0ecc440ffb660b7d9316954d375552`. Frontend Pages workflow run `42579012157` was initiated after merge. Backend deployment used `.github/workflows/sync-apps-script.yml` with the production `push_and_deploy` workflow. User tested the deployed template workflow and confirmed success on 2026-11-09. No phase archive or ARCHITECTURE append performed; phase closure remains pending explicit user request.

### Implementation Log
- Source PDF remains the original document throughout import, storage, output generation, preview, download, and print.
- No Backend runtime/API/database changes were needed.
- Task implementation and user acceptance are complete. Phase remains open until explicitly requested to close.
