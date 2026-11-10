## 🎯 Current Objective
فاز اصلاح پایداری صفحه طراحی قالب چاپ (Print Designer) — جلوگیری از نمایش پیش‌نمایش کهنه، مدیریت امن وضعیت ذخیره و جلوگیری از باقی‌ماندن فایل‌های بلااستفاده؛ بدون ایجاد مسیر موازی و بدون تغییر داده‌های عملیاتی.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و مبنای فاز
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه کاری مشترک: `feature/print-designer-stability` (از main عملیاتی ساخته شد؛ main دست‌نخورده می‌ماند).
- Backend main baseline: `65e108d349232055628080e6b83ef9f21cd25580`.
- Frontend main baseline: `50182ef949c239064d295aee984a327cc40f593f`.
- هر دو main در زمان شروع محافظت‌شده نبودند؛ تغییرات ابتدا فقط روی شاخه کاری انجام و سپس از طریق PR ادغام شدند.

### Backend — مسیرهای واقعی
- `Router.js`: قراردادهای موجود:
  - `GET /print-templates`, `GET /print-templates/sources`
  - `POST /print-templates`, `PUT /print-templates/:id`, `DELETE /print-templates/:id`
  - `GET/POST /print-templates/:id/pdf`
  - `GET/POST /print-templates/:id/images` و `GET /print-templates/:id/images/:assetId`
  - `POST /print-templates/preview`, `POST /print-templates/:id/resolve`
  - مجوزها: مدیریت با `SYSTEM_SETTINGS` و مشاهده/resolve با `PROJECT_VIEW` یا دسترسی‌های فعلی مسیر.
- `PrintTemplateService.js`:
  - `create()`, `update()`, `get()`, `list()`, `preview()`, `resolve()`, `uploadPdf()`, `downloadPdf()`, `uploadImage()`, `downloadImage()`, `deactivate()`.
  - `_template()` و `_public()` برای دسترسی Tenant و نمایش داده.
  - `uploadPdf()` فایل را در Drive ذخیره و سپس metadata/Definition را در رکورد قالب به‌روزرسانی می‌کند؛ پاک‌سازی فایل قبلی فقط پس از ثبت موفق فایل جدید و patch انجام می‌شود.
- `PrintTemplateRepository.js`:
  - شیت موجود `36_PrintTemplates`.
  - ستون‌های PDF: `PdfStorageKey`, `PdfFileName`, `PdfMimeType`, `PdfFileSize`, `PdfPageCount`; تصاویر در `ImageAssetsJSON`.
  - `ensureSchema()`, `getAll()`, `findById()`, `insert()`, `update()`.
- `PrintTemplateValidator.js`: `parseDefinition()` ساختار `Definition.pdf.pages`، عناصر، `pageIndex` و bindingها را اعتبارسنجی می‌کند.
- `GoogleDriveStorage.js`: `uploadBase64ToTenant()`, `getFileAsBase64()`, `delete()`; فایل‌ها در پوشه `TENANT_<TenantID>` نگهداری می‌شوند.
- `tests/print-templates.test.js`: آزمون‌های Backend برای قراردادها و رفتار قالب/PDF/تصویر.
- عدم نیاز به Sheet، API یا مدل ذخیره‌سازی جدید.

### Frontend — مسیرهای واقعی و قرارداد مصرف
- `pages/print-designer.html`: صفحه واحد کتابخانه، فرم ویرایش، بوم طراحی و پیش‌نمایش زنده؛ شناسه‌های مهم `pt-template-form`, `pt-design-canvas`, `pt-live-preview-project`, `pt-live-preview-content`, `pt-live-preview-print`.
- `js/modules/print-designer.js`، ماژول `PMS.Modules.PrintDesigner`:
  - راه‌اندازی: `initLibrary()`, `loadLibrary()`, `bindEditor()`, `bindLivePreview()`.
  - وضعیت فرم: `resetForm()`, `editTemplate()`, `saveTemplate()`, `deleteTemplate()`.
  - PDF: `handleImportFile()`, `handlePdfFile()`, `loadTemplatePdf()`, `renderPdfBackgrounds()`, `fileToBase64()`.
  - تاریخچه/طراحی: `commitHistory()`, `restoreHistory()`, `renderEditor()`, `renderCanvas()`, `renderInspector()`.
  - پیش‌نمایش: `scheduleLivePreview()`, `createLivePreviewDefinition()`, `renderLivePreview()`, `clearLivePreviewPdf()`, `printLivePreview()`.
- `css/print-template-library.css`: شبکه پیش‌نمایش، استایل واکنش‌گرا و قوانین چاپ.
- `index.html`: وابستگی‌های PDF.js و pdf-lib و cache key ماژول.
- `tests/print-template-library.test.js`: آزمون‌های ساختاری/رگرسیون preview، PDF اصلی، تصویر مستقل، خروجی و واکنش‌گرایی.
- پیش‌نمایش از `POST /print-templates/preview` با `ProjectID` و `Definition` ذخیره‌نشده استفاده می‌کند؛ سند PDF اصلی در مسیر خروجی با pdf-lib حفظ و overlay روی آن قرار می‌گیرد.
- قابلیت‌های PDF اصلی، تصویر پس‌زمینه، تصویر مستقل، Definition و bindingهای فعلی و چاپ/دانلود باید حفظ شوند.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5 و ARCHITECTURE هر دو مخزن، شاخه و commit مبنا، صفحه و ماژول Frontend، APIها، سرویس و ذخیره‌سازی Backend، تست‌ها و ثبت نقشه فنی و محدوده اصلاحات. یافته‌ها: invalidation ناقص preview در Reset/تغییر پروژه، ذخیره چندمرحله‌ای قالب جدید و عدم پاک‌سازی PDF جایگزین‌شده.
- [x] **Task 2 — Stabilize preview and save lifecycle:** تکمیل اصلاحات Frontend/Backend و پذیرش عملی کاربر.
  - *Log:* Frontend در `js/modules/print-designer.js`: افزودن `clearLivePreview(message)` برای افزایش sequence، لغو timer، پاک‌کردن pending/ready و Blob و غیرفعال‌سازی چاپ؛ فراخوانی در `resetForm()` و `editTemplate()`؛ invalidate و پاک‌سازی preview در نبود پروژه؛ جلوگیری از اعمال پاسخ PDF قدیمی؛ در شکست عملیات چندمرحله‌ای ساخت قالب جدید، غیرفعال‌سازی جبرانی رکورد ایجادشده از مسیر API موجود `DELETE /print-templates/:id`، بدون حذف فیزیکی فایل‌های پیوست. Backend در `PrintTemplateService.js`: افزودن `_isStorageKeyReferenced(storageKey, tenantId, excludedTemplateId)` و `_deleteStorageKeyIfUnreferenced(...)`؛ در `uploadPdf()` فایل جدید ابتدا ذخیره و metadata ثبت می‌شود، در شکست update فایل جدیدِ بدون ارجاع پاک می‌شود و PDF قبلی تنها پس از موفقیت ثبت/audit و اثبات عدم ارجاع در PDF یا `ImageAssetsJSON` سایر قالب‌ها حذف می‌شود. تست‌های رگرسیون در `tests/print-template-library.test.js` و `tests/print-templates.test.js` افزوده شدند. شیت `36_PrintTemplates`، قراردادهای Router و APIها تغییر ساختاری نکردند.
- [x] **Task 3 — Regression validation & delivery:** تست‌های خودکار، بررسی سازگاری، انتشار و تست عملی تکمیل شد.
  - *Log:* Backend checks و PMS agent suite روی commit عملیاتی `af0e82ccd2c169230e0e1785fe63b93d989f7e21` موفق؛ Frontend checks و cross-repository QA روی commit `c72744611252c1fa45f7feac34dc9ffd2e894cd1` موفق؛ GitHub Pages deploy موفق؛ Workflow رسمی `Sync and deploy backend to Google Apps Script (PRODUCTION)` برای همان commit Backend با نتیجه success تکمیل شد. PRهای Backend #52 و Frontend #80 با روش squash در main ادغام شدند؛ commitهای ادغام به‌ترتیب `af0e82ccd2c169230e0e1785fe63b93d989f7e21` و `c72744611252c1fa45f7feac34dc9ffd2e894cd1`. شاخه‌های feature حفظ شده‌اند و main فقط از مسیر PR تغییر کرده است. تست زنده توسط کاربر تأیید شد. تنها استثنا: PMS comprehensive UI performance audit به علت authentication failure در محیط audit ناموفق ماند؛ این مورد مانع build/deploy نبود و تست عملی کاربر موفق اعلام شد.

## 🧹 Approved Follow-up Fix — Print Designer Literal Newlines

- [x] **Task 1 — Discovery & Planning:** محل دقیق دو رشته متنی اضافی در `pages/print-designer.html` شناسایی شد.
  - *Log:* دو رشته literal `\\n` در مرز بعد از `#pt-image-file` و بعد از `#pt-page-tabs` پیدا شدند. دامنه اصلاح فقط همین دو محل بود.
- [x] **Task 2 — اصلاح HTML:** دو رشته اضافی با line break واقعی HTML جایگزین شدند.
  - *Log:* فقط `pages/print-designer.html` تغییر کرد؛ هیچ منطق اجرایی، API، داده، فایل PDF، ورودی PDF یا قابلیت افزودن تصویر مستقل حذف یا تغییر داده نشد. تغییر در PR فرانت‌اند #81 با squash merge وارد `main` شد؛ commit ادغام: `698924bbf0d3a5115cef5c63c5f6c8688c51ceec`.
- [x] **Task 3 — Regression، انتشار و پذیرش:** بررسی کد و تست عملی کاربر موفق بود.
  - *Log:* در نسخه `main` تعداد رشته‌های literal `\\n` برابر صفر و ورودی‌های `pt-pdf-file`، `pt-image-file` و بخش `pt-pdf-import` همچنان موجود بودند. Frontend checks و PMS cross-repository QA موفق شدند؛ ممیزی مرورگر نیز با نتیجه success پایان یافت. انتشار GitHub Pages از workflow متصل به push شاخه `main` انجام‌پذیر است؛ کاربر نسخه زنده را بررسی و حذف دو عبارت و حفظ قابلیت‌های فایل را تأیید کرد. Backend runtime/API/DB تغییری نداشت؛ PR #53 صرفاً مستندسازی بود.
