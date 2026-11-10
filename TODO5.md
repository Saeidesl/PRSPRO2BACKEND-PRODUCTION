## 🎯 Current Objective
فاز اصلاح پایداری صفحه طراحی قالب چاپ (Print Designer) — جلوگیری از نمایش پیش‌نمایش کهنه، مدیریت امن وضعیت ذخیره و جلوگیری از باقی‌ماندن فایل‌های بلااستفاده؛ بدون ایجاد مسیر موازی و بدون تغییر داده‌های عملیاتی.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و مبنای فاز
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه کاری مشترک: `feature/print-designer-stability` (از main عملیاتی ساخته شد؛ main دست‌نخورده می‌ماند).
- Backend main baseline: `65e108d349232055628080e6b83ef9f21cd25580`.
- Frontend main baseline: `50182ef949c239064d295aee984a327cc40f593f`.
- هر دو main در زمان شروع محافظت‌شده نبودند؛ برای این فاز فقط شاخه کاری تغییر می‌کند.

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
  - `uploadPdf()` فایل را در Drive ذخیره و سپس metadata/Definition را در رکورد قالب به‌روزرسانی می‌کند؛ محل مناسب برای پاک‌سازی امن فایل قبلی فقط پس از ثبت موفق فایل جدید و patch است.
- `PrintTemplateRepository.js`:
  - شیت موجود `36_PrintTemplates`.
  - ستون‌های PDF: `PdfStorageKey`, `PdfFileName`, `PdfMimeType`, `PdfFileSize`, `PdfPageCount`; تصاویر در `ImageAssetsJSON`.
  - `ensureSchema()`, `getAll()`, `findById()`, `insert()`, `update()`.
- `PrintTemplateValidator.js`:
  - `parseDefinition()` ساختار `Definition.pdf.pages`, عناصر، `pageIndex` و bindingها را اعتبارسنجی می‌کند.
- `GoogleDriveStorage.js`:
  - `uploadBase64ToTenant()`, `getFileAsBase64()`, `delete()`.
  - فایل‌ها در پوشه `TENANT_<TenantID>` نگهداری می‌شوند؛ سقف عمومی فایل از `AppConfig.FILES.MAX_SIZE_MB` اعمال می‌شود؛ PDF signature کنترل می‌شود.
- `tests/print-templates.test.js`: آزمون‌های Backend برای قراردادها و رفتار قالب/PDF/تصویر.
- عدم نیاز کشف‌شده به Sheet، API یا مدل ذخیره‌سازی جدید.

### Frontend — مسیرهای واقعی و قرارداد مصرف
- `pages/print-designer.html`: صفحه واحد کتابخانه، فرم ویرایش، بوم طراحی و پیش‌نمایش زنده؛ شناسه‌های مهم `pt-template-form`, `pt-design-canvas`, `pt-live-preview-project`, `pt-live-preview-content`, `pt-live-preview-print`.
- `js/modules/print-designer.js`، ماژول `PMS.Modules.PrintDesigner`:
  - راه‌اندازی: `initLibrary()`, `loadLibrary()`, `bindEditor()`, `bindLivePreview()`.
  - وضعیت فرم: `resetForm()`, `editTemplate()`, `saveTemplate()`, `deleteTemplate()`.
  - PDF: `handleImportFile()`, `handlePdfFile()`, `loadTemplatePdf()`, `renderPdfBackgrounds()`, `fileToBase64()`.
  - تاریخچه/طراحی: `commitHistory()`, `restoreHistory()`, `renderEditor()`, `renderCanvas()`, `renderInspector()`.
  - پیش‌نمایش: `scheduleLivePreview()`, `createLivePreviewDefinition()`, `renderLivePreview()`, `clearLivePreviewPdf()`, `printLivePreview()`.
  - ذخیره قالب جدید به‌ترتیب رکورد را می‌سازد، تصاویر pending را آپلود می‌کند و در صورت وجود PDF آن را از API موجود می‌فرستد؛ ویرایش با `PUT` و APIهای موجود ادامه می‌یابد.
- `css/print-template-library.css`: شبکه `.pt-editor-preview-layout`، `.pt-live-preview-panel`، استایل واکنش‌گرا و قوانین چاپ.
- `index.html`: بارگذاری وابستگی‌های PDF.js و pdf-lib و cache key ماژول.
- `tests/print-template-library.test.js`: ۳۴ تست ساختاری/رگرسیون در baseline؛ تست‌های preview، PDF اصلی، تصویر مستقل، خروجی و واکنش‌گرایی.
- پیش‌نمایش از `POST /print-templates/preview` با `ProjectID` و `Definition` ذخیره‌نشده استفاده می‌کند؛ سند PDF اصلی در مسیر خروجی با pdf-lib حفظ و overlay روی آن قرار می‌گیرد.
- حفظ قابلیت‌های الزامی: PDF اصلی، تصویر پس‌زمینه، افزودن تصویر مستقل به صفحه، Definition و bindingهای فعلی، چاپ/دانلود خروجی نهایی.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5 و ARCHITECTURE هر دو مخزن، شاخه و commit مبنا، صفحه و ماژول Frontend، APIها، سرویس و ذخیره‌سازی Backend، تست‌ها و ثبت نقشه فنی و محدوده اصلاحات. یافته قطعی: تغییر پروژه/Reset پیش‌نمایش را invalid نمی‌کند؛ `resetForm()` پیش‌نمایش را پاک نمی‌کند؛ `scheduleLivePreview()` با نبود پروژه sequence را باطل نمی‌کند؛ `saveTemplate()` در قالب جدید چند درخواست مرحله‌ای دارد و شکست مراحل بعدی می‌تواند رکورد اولیه را باقی بگذارد؛ `uploadPdf()` فایل قبلی را پس از جایگزینی پاک نمی‌کند. ادعای وجود متن `\\n` در HTML در بازبینی خط‌به‌خط تأیید نشد و از فهرست باگ‌ها حذف شد.
- [ ] **Task 2 — Stabilize preview and save lifecycle (IN PROGRESS):** اصلاح invalidation و پاک‌سازی preview در تغییر/حذف پروژه، Reset و شروع قالب جدید؛ جلوگیری از برگشت پاسخ async کهنه؛ مدیریت rollback/پاک‌سازی رکورد و دارایی‌های قالب جدید در شکست ذخیره چندمرحله‌ای؛ پاک‌سازی فایل PDF قبلی فقط بعد از موفقیت ثبت فایل جدید، با رعایت Tenant و جلوگیری از حذف فایل مرجع فعال.
- [ ] **Task 3 — Regression validation & delivery:** اجرای تست‌های Backend و Frontend، افزودن تست برای سناریوهای شکست/پاسخ دیررس/پاک‌سازی PDF، بازبینی قراردادها و داده، بررسی workflowهای موجود، commit و push فقط روی شاخه کاری، گزارش دقیق وضعیت انتشار (بدون ادعای استقرار تا زمان تأیید workflow و تست زنده).

