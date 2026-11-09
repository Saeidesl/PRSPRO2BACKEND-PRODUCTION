## 🎯 Current Objective
حفظ کیفیت اصلی تصویرهای مستقل در خروجی PDF قالب چاپ؛ فایل اصلی باید بدون فشرده‌سازی مجدد یا rasterize شدن همراه لایه طراحی، مستقیماً در PDF embed شود و ابعاد/نسبت تصویر حفظ گردد.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feature/template-image-quality-20261109`؛ مبنا `main` با commit `5bc7b32448323b5f00345c985ea45c5d6eadc8a6`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feature/template-image-quality-20261109`؛ مبنا `main` با commit `41b03aa19ffaceaa10d5f82c8686ad4076c6ab20`.
- فاز قبلی حفظ PDF اصلی بسته شد؛ PRهای مستنداتی Backend #41 و Frontend #69 ادغام شده‌اند. TODO5 هر دو مخزن در شروع این فاز برابر `Ready for the next feature` بود.

### معماری کشف‌شده Backend
- پشته: Google Apps Script V8، Google Sheets؛ فایل‌ها در Google Drive tenant-scoped.
- `Router.js`: مسیرهای GET/POST/PUT/DELETE و مجوزها؛ GET قالب‌ها با `SYSTEM_SETTINGS` یا `PROJECT_VIEW`، ایجاد/آپلود/ویرایش با `SYSTEM_SETTINGS`.
- `PrintTemplateService.js`: `_template(id, tenantId)` مالکیت Tenant و وضعیت قالب را کنترل می‌کند؛ `_definition(row)` تعریف را از `PrintTemplateValidator.parseDefinition` می‌خواند؛ `create`, `update`, `uploadPdf`, `downloadPdf`, `deactivate`, `resolve`.
- `PrintTemplateRepository.js`: شیت موجود `36_PrintTemplates`؛ ستون‌های فعلی شامل `DefinitionJSON` و metadata PDF هستند. `ensureSchema` ستون‌های کمبود را به‌صورت افزایشی اضافه می‌کند.
- `GoogleDriveStorage.js`: `uploadBase64ToTenant(data, tenantId)`، `getFile`، `getFileAsBase64`، `delete`؛ فایل‌ها در پوشه `TENANT_<id>` ذخیره می‌شوند.
- `StorageRepository.js`: facade موجود برای upload/read/delete؛ در صورت نیاز توسعه، همین مسیر گسترش یابد.
- مسیرهای موجود PDF: `GET/POST /print-templates/:id/pdf`. مسیرهای CRUD قالب در `Router.js`.
- اعتبارسنجی تعریف در `PrintTemplateValidator.js` باید برای metadata عنصر تصویر و reference asset بررسی و در صورت لزوم به‌صورت backward-compatible توسعه یابد.
- هیچ Sheet یا داده عملیاتی جدیدی هنوز ایجاد/تغییر نشده است. سیاست نهایی ذخیره metadata تصویر (Definition یا metadata افزایشی در همان 36_PrintTemplates) باید با بررسی کامل validator/repository و محدودیت payload در Task 2 قطعی شود؛ از ذخیره base64 تصویر در Google Sheets/Definition اجتناب شود.

### قرارداد هدف و قیود
- هر تصویر به یک عنصر از `Definition.elements` متصل باشد؛ حداقل metadata شامل شناسه asset، نام فایل، MIME، موقعیت، ابعاد و pageIndex.
- محتوای باینری تصویر در Google Drive tenant-scoped بماند؛ API دریافت تصویر باید ابتدا مالکیت قالب و تعلق asset به همان قالب/Tenant را بررسی کند.
- ورودی JPG/JPEG، PNG و WebP مطابق سیاست MIME/حجم فعلی؛ سقف و محدودیت‌ها باید در Task 2 با AttachmentValidator و تنظیمات فایل هماهنگ شود.
- فایل تصویر ورودی نباید با `imageFileToPdf` یا مسیر import پس‌زمینه پردازش شود. آن مسیر فقط برای تبدیل فرم اسکن‌شده/تصویر به پس‌زمینه PDF/OCR حفظ می‌شود.
- هیچ مسیر موازی Print Designer یا سیستم attachment عمومی جدید ایجاد نشود. از مدل موجود `Definition.elements` و سرویس/Storage موجود استفاده شود.
- PDF نهایی تصویر را مستقیماً به‌عنوان image XObject/embed در PDF درج کند؛ تصویر به PDF مستقل تبدیل یا با PDF ادغام‌شده واسط جایگزین نشود.
- حفظ PDF اصلی، CropBox/rotation، ترتیب لایه‌ها، چندصفحه‌ای، tenant isolation، مجوزها و backward compatibility الزامی است.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی دو مخزن عملیاتی، شاخه‌ها، commitهای مبنا، TODO5/ARCHITECTURE و مسیر فعلی Print Template، Storage و PDF انجام شد. فاز قبلی بسته و مستندات آن ادغام شده‌اند.
  - *Log:* Backend: `Router.js` مسیرهای قالب و مجوزهای `SYSTEM_SETTINGS/PROJECT_VIEW`؛ `PrintTemplateService.js` مالکیت Tenant و CRUD/PDF؛ `PrintTemplateRepository.js` و شیت `36_PrintTemplates`؛ `GoogleDriveStorage.js` ذخیره tenant-scoped و read/delete؛ `StorageRepository.js` facade. Frontend: `pages/print-designer.html`، `js/modules/print-designer.js`، `css/print-template-library.css`، `tests/print-template-library.test.js` و `index.html`. placeholder فعلی `add-image` از `createElement('image')` استفاده می‌کند؛ مسیر `imageFileToPdf` برای import پس‌زمینه است و نباید برای عنصر تصویر استفاده شود. خروجی PDF فعلی در `generateSourcePdfOutput` با pdf-lib ساخته می‌شود و باید مسیر embed تصویر را حفظ کند.
- [x] **Task 2 — چرخه امن Asset تصویر قالب در Backend:** API بارگذاری و دریافت تصویر متصل به قالب پیاده‌سازی و در PR #42 ادغام شد.
  - *Log:* `PrintTemplateRepository.js`: ستون افزایشی `ImageAssetsJSON` در `36_PrintTemplates`؛ `PrintTemplateValidator.js`: اعتبارسنجی assetId و جلوگیری از ذخیره base64 در Definition؛ `PrintTemplateService.js`: `uploadImage/downloadImage`، ذخیره tenant-scoped در Google Drive، کنترل مالکیت، MIME/signature، سقف 10MB و پاک‌سازی شکست؛ `Router.js`: مسیرهای `POST/GET /print-templates/:id/images`؛ `tests/print-templates.test.js`: تست upload/download و tenant isolation. PR #42 با commit `fbd8cb8351201e258b25be2c90ef3ed91624405e` ادغام و سپس Apps Script production sync/deploy در workflow run `42603283136` موفق شد.
- [x] **Task 3 — تجربه افزودن و ویرایش تصویر در Frontend:** انتخاب تصویر از دستگاه در همان Print Designer، ایجاد عنصر واقعی، نمایش، drag/resize، ذخیره و بازیابی و چندصفحه‌ای؛ تست عملیاتی Product Owner موفق بود.
  - *Log:* Frontend `pages/print-designer.html`, `js/modules/print-designer.js`, `css/print-template-library.css`, `index.html`, `tests/print-template-library.test.js`; PR #70 با commit `00937880ad161c272e2eb2b11ad419a989666940` ادغام شد. کاربر ذخیره قالب، بازگشایی و ماندگاری تصویر را در نسخه عملیاتی تأیید کرد.
- [x] **Task 4 — حفظ کیفیت اصلی تصویر در خروجی PDF:** حفظ کیفیت تصویرهای مستقل در PDF با درج مستقیم JPG/PNG و تبدیل WebP به PNG در ابعاد پیکسلی اصلی؛ کاربر تست نهایی خروجی PDF را در 2026-11-09 موفق اعلام و تسک را تأیید کرد.
  - *Log:* در این تسک تغییر Runtime/API/Schema یا داده عملیاتی Backend لازم نبود؛ چرخه امن Asset تصویر از تسک 2 استفاده شد: `PrintTemplateService.uploadImage/downloadImage`، `Router.js` مسیرهای `POST /print-templates/:id/images` و `GET /print-templates/:id/images/:assetId`، metadata ستون `ImageAssetsJSON` در شیت `36_PrintTemplates` و فایل باینری tenant-scoped در Google Drive. PR #43 صرفاً ثبت/همگام‌سازی مستندات تسک در `TODO5.md` بود و منطق Backend را تغییر نداد. درج مستقیم تصویر و تولید PDF در Frontend انجام شد؛ تست نهایی کیفیت PDF توسط Product Owner در 2026-11-09 موفق تأیید شد.

