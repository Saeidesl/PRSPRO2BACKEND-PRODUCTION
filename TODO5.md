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
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`, branch `feat/preserve-original-pdf-output-20261109`, based on main `2ea57b4cf8066eaeec49633d0936c60cfa710834`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`, branch `feat/preserve-original-pdf-output-20261109`, based on main `b383b2aca875b04b7f1c0b61fe624d50532aa101`.
- Backend stack: Google Apps Script V8 + Google Sheets; file storage in tenant-scoped Google Drive.
- Frontend stack: HTML/CSS/JavaScript; PDF.js 3.11.174 currently loaded in `index.html`.

### Existing PDF source flow
- `pages/print-designer.html`: existing PDF/image import control `#pt-pdf-file` and designer canvas.
- `js/modules/print-designer.js:handleImportFile`: routes PDF files to `handlePdfFile(file)`; image imports alone use `imageFileToPdf(file)`.
- `js/modules/print-designer.js:handlePdfFile`: reads the original File, validates 1–50 pages and 10 MB, uses PDF.js to inspect page dimensions/rotation, retains `this.pdfFile` and `this.pdfDocument`, and records `definition.pdf.pages`.
- `renderPdfBackgrounds` / `renderCanvas`: PDF.js raster canvas is currently a visual editor background only; overlays live in the existing `definition.elements` model.
- `saveTemplate`: uploads the original `this.pdfFile` through the existing `POST /print-templates/:id/pdf` flow; it does not save a reconstructed PDF.
- `loadTemplatePdf` / `editTemplate`: retrieves the stored original PDF and reopens it through PDF.js.

### Existing output flow and confirmed limitation
- `resolveOutput` calls the existing `POST /print-templates/:id/resolve` API and passes the resolved project/form data to the renderer.
- `loadOutputPdfPages(templateId, definition)`: calls the existing `GET /print-templates/:id/pdf` API, loads the source PDF with PDF.js, renders every page at target 300 DPI (12 MP cap), and converts each page to PNG Blob URLs.
- `renderOutputDocument(template, project, data)`: adds those PNGs as `.pt-output-pdf-background` images and positions current Definition elements above them.
- `printOutput`: invokes browser `window.print()`; current browser-print result is HTML containing rasterized PDF page backgrounds, not the original PDF page objects.
- `css/print-template-library.css`: `.pt-output-pdf-background`, `.pt-print-page-content`, page-fit scaling, print margins, and print CSS currently implement this image-background output.
- `tests/print-template-library.test.js`: existing regression assertions explicitly expect `loadOutputPdfPages`, PNG background images, and browser print. These assertions must be replaced/extended for the new PDF-preserving output contract.

### Existing Backend contract — preserve unless discovery proves otherwise
- `Router.js`: existing routes for `/print-templates`, `/print-templates/:id/pdf`, and `/print-templates/:id/resolve`.
- `PrintTemplateService.js`: existing tenant-scoped PDF upload/download and template resolution.
- `PrintTemplateRepository.js`: metadata and Definition are stored in existing sheet `36_PrintTemplates`; PDF bytes remain in tenant-scoped Google Drive storage.
- Existing APIs and database schema should remain unchanged if frontend can retrieve the source PDF and resolved data through the current contracts.

### Integration and safety constraints
- Do not create a parallel template editor, storage path, template definition, or API.
- Preserve current image-import-to-PDF behavior; this phase's source-preservation requirement concerns PDFs.
- Do not alter operational data, existing stored PDF files, template records, permissions, or tenant boundaries.
- Evaluate PDF composition library availability, license, browser compatibility, font embedding, Persian shaping/RTL, page rotation/crop boxes, and image embedding before selecting an implementation.
- Final validation must prove source-page content remains vector/text/image objects rather than full-page raster images, and that overlay coordinates match pages of different sizes/orientations.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** inspected operational repositories, main branches, TODO5/ARCHITECTURE, current source-PDF import/save flow, output renderer, print CSS, and regression tests. Confirmed the source PDF is already retained during import/save; rasterization occurs only in `loadOutputPdfPages` and the downstream HTML/browser-print output. Backend APIs and storage are already sufficient for source retrieval.
- [ ] **Task 2 — Preserve source PDF in final document generation (IN PROGRESS):** implement a validated PDF composition path that loads the stored original PDF, retains its original page objects/content and geometry, and overlays the existing PMS elements without flattening the source pages. Preserve RTL/Persian rendering, images, tables, shapes, margins, multi-page alignment, and a safe fallback/error path. Avoid unnecessary Backend runtime/schema changes.
- [ ] **Task 3 — Regression, compatibility, and acceptance:** update tests for source-PDF preservation and overlay alignment; validate PDF object/content structure, page dimensions/rotation, Persian/RTL text, images, multi-page and mobile workflow; run Frontend and Backend regression checks; review deployment workflow status. Report exact user acceptance steps and pause for approval before closing the task.

### Implementation Log
- Discovery only. No runtime code, API, database, or deployment changes have been made.
