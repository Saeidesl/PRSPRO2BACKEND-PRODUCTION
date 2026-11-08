## 🎯 Current Objective

پشتیبانی از واردکردن PDF آماده (تک‌صفحه‌ای و چندصفحه‌ای) به طراح قالب موجود؛ حفظ PDF به‌عنوان پس‌زمینه اصلی و افزودن اطلاعات پویا روی صفحات؛ ذخیره قالب قابل استفاده مجدد برای تمام پروژه‌های همان Tenant و تولید خروجی PDF/چاپ با حفظ چیدمان اصلی.

انتخاب محصولی تأییدشده: هر دو نوع PDF تک‌صفحه‌ای و چندصفحه‌ای باید پشتیبانی شوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه فعال تنظیمات حاشیه چاپ: Frontend `feat/print-margin-controls-20261108`؛ Backend مستندسازی `docs/print-margin-controls-20261108`. اصلاح قبلی چاپ موبایل در Frontend PR #59 و مستندات Backend در PR #32 ادغام شده‌اند.
- Backend baseline از main: `8f850258599a6437251c83c3994fa910120c05b7`
- Frontend baseline از main: `4fcae36435120c5f489986765b6613b8db38e3b2`
- هر دو مخزن پیش از شروع دارای `TODO5.md = Ready for the next feature` و `ARCHITECTURE.md` بودند؛ فاز قبلی بسته شده بود.
- هیچ تغییری روی main یا مخازن توسعه مجاز نیست.
- تسک مستقل اعلان تلگرام که در سابقه قبلی PAUSED BY PRODUCT OWNER بوده، خارج از دامنه این فاز است.

### معماری فعلی قالب و چاپ — Backend
- `PrintTemplateService.js`:
  - `list/get/create/update/deactivate` مدیریت کتابخانه قالب‌های tenant-scoped را انجام می‌دهد.
  - `resolve(id, body, params)` پروژه را با کنترل Tenant و دسترسی بررسی می‌کند؛ داده‌های پروژه، اطلاعات مرکزی و پاسخ فرم‌های رویداد را بر اساس Definition.bindings حل می‌کند.
  - `_definition`, `_public`, `_template`, `_parse` برای ساختار و ارائه قالب استفاده می‌شوند.
- `PrintTemplateRepository.js`:
  - شیت موجود `36_PrintTemplates`.
  - ستون `DefinitionJSON` ساختار قالب را نگه می‌دارد؛ repository در صورت نیاز schema را به‌شکل additive تضمین می‌کند.
- `PrintTemplateValidator.js`:
  - `parseDefinition` نسخه schema 1، صفحه، عناصر و bindingها را اعتبارسنجی می‌کند.
  - JSON فعلی حداکثر 45,000 نویسه است؛ فایل PDF نباید در DefinitionJSON یا سلول Google Sheets قرار گیرد.
- `Router.js`: مسیرهای موجود `/print-templates` و `/print-templates/:id/resolve` به سرویس قالب متصل هستند. مسیر جدید فقط در صورت اثبات نیاز معماری و بررسی امنیتی اضافه شود.
- خروجی فعلی PDF در مرورگر Frontend تولید/چاپ می‌شود؛ سرویس فعلی resolve داده را برمی‌گرداند و PDF را merge نمی‌کند.
- اصل امنیتی: فایل و metadata باید به Tenant و قالب مربوط متصل باشند؛ دسترسی فایل از مسیر امن و موجود پیوست/ذخیره‌سازی بررسی شود.

### معماری فعلی قالب و چاپ — Frontend
- `js/modules/print-designer.js` ماژول مرکزی `PMS.Modules.PrintDesigner` است.
- `blankDefinition()`: ساختار فعلی شامل `schemaVersion`, `page`, `elements`, `bindings`.
- `createElement()`, `handleEditorAction()`, `renderCanvas()`, `renderInspector()`, `renderLayers()`: ساخت و ویرایش المان‌های متن، فیلد، جدول، تصویر و شکل‌ها.
- `saveTemplate()`, `loadLibrary()`, `editTemplate()`: ذخیره و بازیابی قالب از API موجود.
- `loadOutputOptions()`, `resolveOutput()`, `renderOutputDocument()`, `printOutput()`: انتخاب پروژه/قالب، دریافت داده، ساخت پیش‌نمایش و چاپ مرورگر.
- `css/print-template-library.css`: استایل کتابخانه، محیط طراحی، پیش‌نمایش و چاپ.
- `PMS.Api` مسیر انحصاری درخواست‌های Frontend است.
- در خروجی فعلی، یک `article.pt-print-page` از ابعاد و المان‌های تعریف ساخته می‌شود؛ renderer خروجی چندصفحه‌ای است؛ `loadOutputPdfPages` پس‌زمینه PDF را به تصویر تبدیل می‌کند و `renderOutputDocument` برای هر صفحه یک `article.pt-print-page` با ابعاد واقعی می‌سازد. چاپ از `printOutput` انجام می‌شود؛ در Task 3، تنظیمات حاشیه کاربر در `pages/print-output.html` و `PrintDesigner.loadOutputMargins/saveOutputMargins/resetOutputMargins/refreshOutputPreview` پیاده‌سازی می‌شود و در `localStorage` همین دستگاه نگهداری می‌شود. چهار مقدار بالا/پایین/راست/چپ بر حسب میلی‌متر روی تمام قالب‌ها اعمال شده و `renderOutputDocument` صفحه را با حفظ نسبت در محدوده امن Letter/A4 مقیاس می‌کند.
- قابلیت جدید باید در همین ماژول و همان تعریف قالب توسعه یابد؛ ایجاد صفحه/کتابخانه/جریان موازی ممنوع است.

### تصمیمات فنی و الزامات طراحی
- PDF اصلی به‌صورت فایل مستقل در فضای ذخیره‌سازی امن موجود یا یک مسیر فایل‌محور سازگار با معماری فعلی نگهداری شود؛ نه در Google Sheets و نه در JSON قالب.
- Definition فقط شناسه فایل، مشخصات سند/صفحات، تنظیمات و مختصات عناصر را نگهداری کند.
- پشتیبانی از PDF تک‌صفحه‌ای و چندصفحه‌ای؛ هر صفحه باید ابعاد/جهت واقعی خود را حفظ کند.
- کاربر بتواند روی هر صفحه فیلدهای پویا، متن، تصویر و جدول را اضافه و جابه‌جا کند.
- لایه PDF اصلی در محیط طراحی به‌عنوان پس‌زمینه ثابت و غیرقابل‌ویرایش نمایش داده شود.
- قالب ذخیره‌شده برای تمام پروژه‌های مجاز همان Tenant قابل استفاده باشد.
- خروجی نهایی باید PDF اصلی را حفظ کند و اطلاعات پروژه را روی صفحات درست قرار دهد؛ بدون بازسازی ظاهری PDF از صفر.
- حفظ مجوزها، tenant scoping، محدودیت اندازه/تعداد صفحات، کنترل MIME واقعی، اعتبارسنجی فایل، و سازگاری با قالب‌های قدیمی الزامی است.
- وابستگی PDF (نمایش/ویرایش/ترکیب) قبل از انتخاب نهایی بررسی شود؛ از افزودن کتابخانه غیرضروری یا حجیم اجتناب شود.
- هیچ مهاجرت مخرب، حذف قالب‌های قبلی، تغییر داده عملیاتی یا deploy بدون آزمون و تأیید لازم انجام نشود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**: بررسی شاخه‌ها، آخرین commitها، TODO5/ARCHITECTURE و معماری فعلی قالب/چاپ در دو مخزن.
  - *Log:* هر دو مخزن عملیاتی در دسترس بودند. آخرین commitهای main هنگام شروع: Backend `8f850258599a6437251c83c3994fa910120c05b7` و Frontend `4fcae36435120c5f489986765b6613b8db38e3b2`؛ هر دو TODO5 آماده فاز بعد و ARCHITECTURE موجود بود. شاخه `feat/pdf-template-background-20261108` جداگانه از همین baselineها در هر دو مخزن ساخته شد. مسیرهای اصلی Backend: `PrintTemplateService.js`, `PrintTemplateRepository.js`, `PrintTemplateValidator.js`, `Router.js`, شیت `36_PrintTemplates`; مسیر اصلی Frontend: `js/modules/print-designer.js`, `css/print-template-library.css` و API موجود `/print-templates`. محدودیت فعلی DefinitionJSON برابر 45,000 نویسه است؛ PDF باید مستقل ذخیره شود. renderer فعلی خروجی یک صفحه HTML با `renderOutputDocument` و چاپ مرورگر با `printOutput` دارد؛ پس‌زمینه PDF و صفحات چندگانه ندارد.
- [x] **Task 2 — PDF Asset و نمایش چندصفحه‌ای در طراح**: انتخاب/آپلود امن PDF، ذخیره فایل مستقل، ثبت metadata در Definition و نمایش صفحات واقعی PDF در همان محیط طراحی؛ حفظ ابعاد و ترتیب صفحات.
  - *Implementation checkpoint (2026-11-08):* در Backend، GoogleDriveStorage.uploadBase64ToTenant(data, tenantId) فایل را مستقیماً در پوشه TENANT_<TenantID> زیر پوشه اصلی Drive ذخیره می‌کند؛ MIME مجاز و امضای واقعی %PDF- بررسی می‌شود. PrintTemplateRepository.HEADERS به‌صورت additive شامل PdfStorageKey, PdfFileName, PdfMimeType, PdfFileSize, PdfPageCount شده است. PrintTemplateService.uploadPdf/downloadPdf فایل را با کنترل Tenant به قالب متصل می‌کند و StorageKey را به Frontend افشا نمی‌کند. مسیرهای API: POST /print-templates/:id/pdf با مجوز SYSTEM_SETTINGS و GET /print-templates/:id/pdf با SYSTEM_SETTINGS یا PROJECT_VIEW. در Frontend، pages/print-designer.html کنترل انتخاب PDF، index.html کتابخانه PDF.js نسخه ثابت 3.11.174، js/modules/print-designer.js بارگذاری/نمایش صفحات و اختصاص pageIndex به المان‌ها، و css/print-template-library.css صفحه‌بندی/پس‌زمینه را اضافه می‌کنند. فایل حداکثر ۱۰ مگابایت و سند حداکثر ۵۰ صفحه است؛ رندر صفحات با IntersectionObserver به‌صورت lazy انجام می‌شود. فایل PDF در Drive می‌ماند و فقط metadata/ابعاد صفحات در Google Sheets/Definition ثبت می‌شود. فایل قبلی هنگام جایگزینی حذف نمی‌شود.
  - *Static QA:* Syntax check پنج فایل JS تغییرکرده PASS شد؛ آزمون mock برای اعتبارسنجی صفحه مقصد، رد فایل PDF با امضای نامعتبر، ذخیره در پوشه Tenant و جلوگیری از دسترسی Tenant دیگر PASS شد.
  - *Acceptance Log (2026-11-08):* Frontend PR #57 با squash در commit `f088d6b3445b061461308c420cb86546ef99c818` روی main ادغام شد. Frontend GitHub Pages deployment Run `42474033571` با conclusion=success پایان یافت؛ CI، cross-repository QA و frontend agent suite نیز موفق شدند. کاربر نسخه عملیاتی را آزمایش و Task 2 را تأیید کرد. مشاهده مستقیم سایت از محیط دستیار ممکن نبود؛ تأیید عملیاتی بر اساس تست و تأیید Product Owner ثبت شد.
  - *Log:* Backend: `GoogleDriveStorage.uploadBase64ToTenant`, `PrintTemplateRepository.HEADERS` و `PrintTemplateService.uploadPdf/downloadPdf`؛ metadata در `36_PrintTemplates` و endpointهای `POST/GET /print-templates/:id/pdf`. Frontend: `pages/print-designer.html`, `index.html`, `js/modules/print-designer.js` (PDF.js، بارگذاری صفحات، `pageIndex`، `loadOutputPdfPages`, `renderOutputDocument`, `printOutput`)، `css/print-template-library.css` و `tests/print-template-library.test.js`. PR #57 پس‌زمینه PDF را به خروجی و صفحات چاپ متصل کرد؛ PDF در Drive مستقل از Sheet باقی می‌ماند.
- [ ] **Task 3 — اصلاح ابعاد فیزیکی صفحه و پایداری چاپ PDF (IN PROGRESS)**: اصلاح چاپ چندصفحه‌ای PDF در مرورگرهای موبایل و دسکتاپ؛ جلوگیری از شکستن یک صفحه PDF بین چند برگ چاپی؛ هماهنگی ابعاد واقعی صفحه، CSS و اندازه کاغذ مقصد؛ حفظ نسبت و جایگاه پس‌زمینه و عناصر روی تمام صفحات؛ افزودن کنترل‌های کاربری برای فاصله بالا، پایین، راست و چپ، با ذخیره خودکار تنظیمات روی دستگاه و اعمال آن‌ها روی همه قالب‌ها بدون تغییر کد.
  - *Test feedback (2026-11-08):* Product Owner تست PR #58 را انجام داد؛ مشکل کمتر شد اما همچنان در Android Print Preview، کاغذ Letter انتخاب می‌شود و انتهای یک صفحه PDF به برگ دوم منتقل می‌گردد. Task 3 باز می‌ماند.
  - *Implementation round 2:* به‌جای اتکا به پذیرش ابعاد سفارشی `@page` در چاپگر موبایل، کل صفحه PDF (پس‌زمینه و تمام المان‌های absolute) داخل یک لایه مشترک مقیاس می‌شود. ضریب fit بر اساس محدوده امن مشترک Letter/A4 (203×272mm) محاسبه و ابعاد فیزیکی article در حالت چاپ به اندازه مقیاس‌یافته تغییر می‌کند؛ پیش‌نمایش روی صفحه بدون تغییر اندازه می‌ماند. قواعد `@page` نام‌گذاری‌شده حذف و newline واقعی/ساختار CSS چاپ ساده‌سازی می‌شود. آزمون‌های ساختاری باید حفظ نسبت، اندازه صفحه چاپ و page-break را پوشش دهند.
- [ ] **Task 4 — آزمون، ادغام و تحویل عملیاتی**: تست فایل‌های تک/چندصفحه‌ای، داده/تصویر/جدول، قالب‌های قدیمی، tenant access، حجم/خطاها، رگرسیون و انتشار مطابق workflow موجود؛ سپس ارائه دستور تست به Product Owner و توقف تا تأیید.


- *Product requirement update (2026-11-08):* کاربر درخواست کرد فاصله بالا/پایین/طرفین در صفحه «تولید و چاپ اسناد» قابل تنظیم باشد تا برای هر فرم نیازی به تغییر کد نباشد. تصمیم پیاده‌سازی: کنترل‌های حاشیه بر حسب میلی‌متر در همان صفحه خروجی چاپ، با مقادیر قابل ویرایش و ذخیره خودکار در مرورگر همان دستگاه؛ تنظیمات در چاپ همه قالب‌ها اعمال می‌شود و به قالب یا داده پروژه وابسته نیست. این کار بدون تغییر Backend/API/Google Sheets انجام می‌شود.

- *Implementation round 3 (2026-11-08):* صفحه `pages/print-output.html` چهار ورودی حاشیه برحسب میلی‌متر و دکمه بازنشانی دارد؛ `PrintDesigner.initOutput` مقدارها را بارگذاری و کنترل‌ها را متصل می‌کند. `PMS_PRINT_OUTPUT_MARGINS_V1` در localStorage مرورگر ذخیره می‌شود، بنابراین تغییر کد یا ذخیره جداگانه برای هر فرم لازم نیست. `saveOutputMargins` و `resetOutputMargins` پیش‌نمایش موجود را بدون بارگذاری دوباره PDF به‌روز می‌کنند؛ `renderOutputDocument` ضریب fit را بر اساس محدوده امن 203×272mm و مجموع حاشیه‌ها محاسبه می‌کند. `css/print-template-library.css` کنترل‌ها را responsive کرده و لایه چاپ را به حاشیه‌های تنظیم‌شده منتقل می‌کند. هیچ تغییر Backend/API/Google Sheets/داده عملیاتی لازم نیست.
