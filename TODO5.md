## 🎯 Current Objective

تبدیل هوشمند PDF و تصاویر فرم‌های آماده کارخانه به قالب PMS، با حفظ چیدمان اصلی و اتصال بخش‌های قابل‌پرشدن به منابع داده موجود.

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
- در خروجی فعلی، یک `article.pt-print-page` از ابعاد و المان‌های تعریف ساخته می‌شود؛ renderer خروجی چندصفحه‌ای است؛ `loadOutputPdfPages` پس‌زمینه PDF را به تصویر تبدیل می‌کند و `renderOutputDocument` برای هر صفحه یک `article.pt-print-page` با ابعاد واقعی می‌سازد. چاپ از `printOutput` انجام می‌شود؛ در Task 3، تنظیمات حاشیه کاربر در `pages/print-output.html` و `PrintDesigner.loadOutputMargins/saveOutputMargins/resetOutputMargins/refreshOutputPreview` پیاده‌سازی می‌شود و در `localStorage` همین دستگاه نگهداری می‌شود. چهار مقدار بالا/پایین/راست/چپ بر حسب میلی‌متر روی تمام قالب‌ها اعمال شده و `renderOutputDocument` صفحه را با حفظ نسبت در محدوده محافظه‌کارانه چاپگر موبایل سازگار با Letter/A4 مقیاس می‌کند.
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
- [x] **Task 3 — اصلاح ابعاد فیزیکی صفحه و پایداری چاپ PDF**: اصلاح چاپ چندصفحه‌ای PDF در مرورگرهای موبایل و دسکتاپ؛ جلوگیری از شکستن یک صفحه PDF بین چند برگ چاپی؛ هماهنگی ابعاد واقعی صفحه، CSS و اندازه کاغذ مقصد؛ حفظ نسبت و جایگاه پس‌زمینه و عناصر روی تمام صفحات؛ افزودن کنترل‌های کاربری برای فاصله بالا، پایین، راست و چپ، با ذخیره خودکار تنظیمات روی دستگاه و اعمال آن‌ها روی همه قالب‌ها بدون تغییر کد.
  - *Test feedback (2026-11-08):* Product Owner تست PR #59 را انجام داد؛ مشکل کمتر شد اما همچنان در Android Print Preview، کاغذ Letter انتخاب می‌شود و انتهای یک صفحه PDF به برگ دوم منتقل می‌گردد. Task 3 باز می‌ماند.
  - *Implementation round 2:* به‌جای اتکا به پذیرش ابعاد سفارشی `@page` در چاپگر موبایل، کل صفحه PDF (پس‌زمینه و تمام المان‌های absolute) داخل یک لایه مشترک مقیاس می‌شود. ضریب fit بر اساس محدوده امن مشترک Letter/A4 (190×250mm) محاسبه و ابعاد فیزیکی article در حالت چاپ به اندازه مقیاس‌یافته تغییر می‌کند؛ پیش‌نمایش روی صفحه بدون تغییر اندازه می‌ماند. قواعد `@page` نام‌گذاری‌شده حذف و newline واقعی/ساختار CSS چاپ ساده‌سازی می‌شود. آزمون‌های ساختاری باید حفظ نسبت، اندازه صفحه چاپ و page-break را پوشش دهند.
- [x] **Task 4 — آزمون، ادغام و تحویل عملیاتی**: تست فایل‌های تک/چندصفحه‌ای، داده/تصویر/جدول، قالب‌های قدیمی، tenant access، حجم/خطاها، رگرسیون و انتشار مطابق workflow موجود؛ سپس ارائه دستور تست به Product Owner و توقف تا تأیید.


- *Product requirement update (2026-11-08):* کاربر درخواست کرد فاصله بالا/پایین/طرفین در صفحه «تولید و چاپ اسناد» قابل تنظیم باشد تا برای هر فرم نیازی به تغییر کد نباشد. تصمیم پیاده‌سازی: کنترل‌های حاشیه بر حسب میلی‌متر در همان صفحه خروجی چاپ، با مقادیر قابل ویرایش و ذخیره خودکار در مرورگر همان دستگاه؛ تنظیمات در چاپ همه قالب‌ها اعمال می‌شود و به قالب یا داده پروژه وابسته نیست. این کار بدون تغییر Backend/API/Google Sheets انجام می‌شود.

- *Implementation round 3 (2026-11-08):* صفحه `pages/print-output.html` چهار ورودی حاشیه برحسب میلی‌متر و دکمه بازنشانی دارد؛ `PrintDesigner.initOutput` مقدارها را بارگذاری و کنترل‌ها را متصل می‌کند. `PMS_PRINT_OUTPUT_MARGINS_V1` در localStorage مرورگر ذخیره می‌شود، بنابراین تغییر کد یا ذخیره جداگانه برای هر فرم لازم نیست. `saveOutputMargins` و `resetOutputMargins` پیش‌نمایش موجود را بدون بارگذاری دوباره PDF به‌روز می‌کنند؛ `renderOutputDocument` ضریب fit را بر اساس محدوده امن 190×250mm و مجموع حاشیه‌ها محاسبه می‌کند. `css/print-template-library.css` کنترل‌ها را responsive کرده و لایه چاپ را به حاشیه‌های تنظیم‌شده منتقل می‌کند. هیچ تغییر Backend/API/Google Sheets/داده عملیاتی لازم نیست.

- *QA checkpoint (2026-11-08):* تغییرات تنظیم حاشیه در PR #33 روی شاخه `docs/print-margin-controls-20261108` ثبت شده‌اند؛ HEAD: `a9f400a44490093c774e2112ea5e71b3b7d6b1ba`. این PR فقط شامل TODO5.md است و کد اجرایی Backend تغییر نکرده؛ در نتیجه اجرای تست Backend لازم نیست. PR هنوز ادغام نشده و Task 3 باز است؛ ادغام و انتشار منوط به تأیید صریح Product Owner است.

- *Documentation merge checkpoint (2026-11-08):* Backend PR #33 صرفاً مستندات TODO5 را با squash در main ادغام کرد؛ merge commit `2c8dfbc150b78cdee7808f87fa61fccc487c6c28`. هیچ کد اجرایی Backend، API، مجوز، Google Sheets یا داده عملیاتی تغییر نکرد؛ بنابراین Backend deployment لازم نیست.


- *Acceptance Log (2026-11-08):* Product Owner تأیید کرد اصلاح نهایی ابعاد فیزیکی A4 در نسخه عملیاتی درست نمایش داده می‌شود. Task 3 تکمیل شد.
- *Task 4 completion log (2026-11-08):* Frontend PR #62 با squash در commit `5a0c9e806e0b1b5e372ae776b66da63e070a52f2` روی `main` ادغام شد. چهار workflow نهایی Frontend checks، Cross-repository QA، Frontend Agent Suite و Comprehensive UI Performance Audit موفق بودند. اصلاح شامل `js/modules/print-designer.js`، `css/print-template-library.css`، `index.html` و `tests/print-template-library.test.js` بود؛ Backend/API/Google Sheets تغییری نداشت. Product Owner تست A4 را موفق تأیید کرد. فاز اصلاح چاپ از نظر این دو تسک تکمیل شد؛ این ثبت به معنی تأیید یا بستن فاز جدید تبدیل هوشمند نیست.

## فاز جدید — تبدیل هوشمند PDF و تصاویر فرم‌های آماده کارخانه

### 🎯 Current Objective
تبدیل PDF و تصاویر فرم‌های آماده کارخانه به قالب هوشمند PMS، با حفظ چیدمان اصلی، تشخیص خودکار ساختار سند و اتصال بخش‌های قابل‌پرشدن به منابع داده موجود؛ توسعه در همان Print Designer و بدون ایجاد مسیر موازی.

### 🗺️ Discovery Notes
- Frontend entry point موجود: `pages/print-designer.html` و ماژول `js/modules/print-designer.js`.
- PDF.js نسخه ثابت `3.11.174` در `index.html` بارگذاری شده و PDF موجود در ماژول با `pdfDocument`, `renderPdfBackgrounds()`, `renderCanvas()` و صفحه‌های دارای `pageIndex` مدیریت می‌شود.
- Definition فعلی در `blankDefinition()` شامل `schemaVersion`, `page`, `elements`, `bindings` است؛ عناصر مختصات فیزیکی میلی‌متری دارند و با `createElement()`, `renderCanvas()`, `renderInspector()` و `renderLayers()` ویرایش می‌شوند.
- منابع داده فعلی از `PrintDesigner.sources` و APIهای موجود دریافت می‌شوند؛ bindingهای مجاز شامل `PROJECT_FIELD`, `PROJECT_INFORMATION`, `EVENT_FORM_FIELD`, `EVENT_FORM_RESPONSE` هستند.
- Backend: `PrintTemplateService.js`, `PrintTemplateValidator.js`, `PrintTemplateRepository.js`; فایل PDF مستقل در Drive و metadata در `36_PrintTemplates` نگهداری می‌شود. `DefinitionJSON` سقف 45,000 نویسه دارد.
- `PrintTemplateValidator.parseDefinition()` صفحه‌ها، عناصر، bindingها و pageIndex را اعتبارسنجی می‌کند؛ `PrintTemplateService.resolve()` داده واقعی را با کنترل Tenant و دسترسی پروژه resolve می‌کند.
- مسیر داده موجود باید حفظ شود: `saveTemplate()/loadLibrary()/editTemplate()` → API موجود `/print-templates` → `36_PrintTemplates`؛ خروجی از `resolveOutput()/renderOutputDocument()/printOutput()`.
- مسیر فایل و داده فعلی، و کنترل Tenant/مجوزها، مرجع قطعی باقی می‌مانند. هیچ سندی بدون اجازه کاربر به سرویس OCR/AI بیرونی ارسال نمی‌شود.

### 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery پایه و تعیین معماری موجود**: بررسی TODO5/ARCHITECTURE، شاخه‌ها، آخرین commitها و مسیرهای واقعی Print Designer و Print Template در هر دو مخزن.
  - *Log:* هر دو مخزن عملیاتی بررسی شدند. شاخه‌های فاز جدید از `main` ایجاد شدند: `feat/smart-pdf-form-conversion-20261108`. آخرین commitهای مشاهده‌شده هنگام شروع بررسی: Backend `0265f30f3b9036f0484486505f9a28e7d7ae4da6` و Frontend `94241930d33504b11a005fe04d80fa2ac015f59f`. Task 3 و Task 4 فاز قبلی پس از تأیید کاربر تکمیل شدند. معماری فعلی PDF.js، Definition، عناصر، bindingها، API، ذخیره‌سازی Drive و resolve بررسی شد.
- [x] **Task 2 — تکمیل Discovery و انتخاب موتور تشخیص سند**: مقایسه استخراج متن PDF با PDF.js، OCR محلی برای صفحات اسکن‌شده، تشخیص ساختار جدول/کادر/خط و گزینه‌های کمک‌گرفتن از مدل بینایی؛ ارزیابی دقت فارسی، عملکرد موبایل، حجم وابستگی، هزینه و محرمانگی؛ تعیین قرارداد خروجی ساختاریافته برای تبدیل به Definition فعلی.
- [ ] **Task 3 — پیاده‌سازی تبدیل و اتصال هوشمند در Print Designer (IN PROGRESS)**: دریافت PDF/JPG/PNG، تحلیل صفحه‌به‌صفحه، تشخیص اجزا و محل‌های ورود داده، پیشنهاد binding به منابع PMS، امکان اصلاح دستی و تولید Definition سازگار؛ بدون مسیر موازی و بدون تغییر غیرضروری Backend.
- [ ] **Task 4 — آزمون پذیرش و تحویل**: تست PDF متنی، PDF اسکن‌شده، تصاویر، فرم فارسی/انگلیسی، جدول چندردیفی، چندصفحه‌ای، موبایل، حفظ چیدمان، قالب‌های قدیمی، کنترل دسترسی و عملکرد؛ ارائه نسخه قابل تست و توقف برای تأیید Product Owner.

- *Task 2 Discovery Log (2026-11-08):* تصمیم فنی مرحله اول: (۱) PDF.js برای استخراج متن/مختصات از PDFهای متنی و تشخیص صفحه‌های فاقد متن؛ (۲) بارگذاری تنبل OCR مرورگری فقط برای صفحات اسکن‌شده، با Tesseract.js و مدل‌های `fas` و `eng`؛ (۳) استفاده از bounding boxهای OCR همراه با تحلیل خطوط افقی/عمودی برای پیشنهاد کادرها و جدول‌ها؛ (۴) نمایش overlay قابل اصلاح به کاربر؛ (۵) تبدیل خروجی تأییدشده به `elements` و `bindings` در Definition موجود. OCR فقط با اقدام صریح کاربر آغاز می‌شود تا دانلود مدل و مصرف CPU در استفاده عادی رخ ندهد. تشخیص خودکار به‌عنوان پیشنهاد است و بدون تأیید کاربر ذخیره نهایی نمی‌شود. مدل‌های تشخیص layout پیشرفته مانند Surya برای این مرحله انتخاب نشدند، زیرا به runtime مدل جداگانه (vLLM/llama.cpp یا سرویس میزبانی‌شده) نیاز دارند و پیچیدگی/ریسک عملیاتی و ملاحظات ارسال اسناد را بالا می‌برند. هیچ سرویس OCR/AI بیرونی و هیچ API/Sheet جدیدی در این مرحله لازم نیست.

- *Task 3 implementation checkpoint (2026-11-08):* در همان `pages/print-designer.html` و `PMS.Modules.PrintDesigner` امکان ورود PDF و تصویر JPG/JPEG/PNG/WebP اضافه شد. تصویر در مرورگر و با jsPDF به PDF تک‌صفحه‌ای تبدیل می‌شود تا از همان مسیر امن فعلی `POST /print-templates/:id/pdf` و ذخیره مستقل Drive استفاده کند؛ مسیر ذخیره‌سازی یا API موازی ایجاد نشده است. تشخیص هوشمند با اقدام صریح کاربر شروع می‌شود: ابتدا متن و مختصات با PDF.js استخراج می‌شوند؛ برای صفحات اسکن‌شده یا متن ناقص، Tesseract.js به‌صورت تنبل و روی دستگاه کاربر با زبان‌های `fas+eng` بارگذاری و اجرا می‌شود. خطوط متنی گروه‌بندی شده، محل‌های ورود داده از برچسب‌های رایج فرم شناسایی و به‌صورت المان‌های `field` روی همان پس‌زمینه PDF پیشنهاد می‌شوند. تطبیق دقیق/واژه‌ای با کاتالوگ موجود `PROJECT_FIELD`, `PROJECT_INFORMATION`, `EVENT_FORM_FIELD` برای پیشنهاد binding انجام می‌شود؛ نتیجه در Definition موجود ویرایش‌پذیر است و تا ذخیره صریح کاربر قالب نهایی نمی‌شود. `index.html` cache key به `20261108-smart-form-conversion-1` تغییر کرد. تست‌های ساختاری برای ورودی تصویر/PDF، OCR محلی، استخراج متن و binding اضافه شده‌اند. تغییرات اجرایی فقط Frontend هستند؛ Backend، Router، مجوزها، API، Google Sheets و داده عملیاتی تغییر نکرده‌اند. این checkpoint به معنی تکمیل Task 3 یا تأیید دقت OCR در فرم‌های واقعی نیست؛ آزمون‌های CI و پذیرش عملیاتی هنوز لازم‌اند.
- *Task 3 QA checkpoint (2026-11-08):* روی commit Frontend `bfa3561d3fefc4807352baae5f9a16068e7ef1f8`، بررسی syntax JavaScript موفق شد؛ Frontend regression شامل ۲۲۲ تست با نتیجه ۲۲۲ PASS و صفر FAIL پایان یافت (Run `42497093867`). Cross-repository QA شامل تست‌های Backend، اعتبارسنجی manifest و سازگاری Frontend/Backend موفق شد (Run `42497093873`). Frontend Agent Suite شامل contract/diff review و asset/CSS QA موفق شد (Run `42497093847`). آزمون‌های مرورگر keyboard و Jalali date-time نیز در Comprehensive UI Performance Audit موفق‌اند؛ بخش UI inventory/performance در Run `42497093856` هنگام ثبت این checkpoint هنوز در حال اجراست. بنابراین Task 3 همچنان IN PROGRESS است؛ آزمون عملی PDF متنی، PDF اسکن‌شده و تصاویر واقعی کارخانه و پذیرش Product Owner باقی مانده است.