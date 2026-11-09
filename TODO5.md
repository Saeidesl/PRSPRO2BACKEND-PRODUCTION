## 🎯 Current Objective
حذف کامل مسیر تشخیص هوشمند فیلدها از نسخه عملیاتی PMS؛ حذف UI، الگوریتم استخراج/تشخیص، OCR، اتصال‌های تشخیص و تست‌های اختصاصی آن، بدون آسیب به ورود دستی PDF/تصویر، ویرایش دستی فیلدها، قالب‌ساز، پیش‌نمایش زنده و چاپ.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه‌های عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feat/remove-smart-field-detection-20261109`، مبنا `main` با commit `682193d2f4cb0b2985947ce050116f21377fcb8e`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feat/remove-smart-field-detection-20261109`، مبنا `main` با commit `c88bfd9526782fc23af8a1f737b35523b7830590`.
- تسک چاپ در قالب‌ساز به درخواست Product Owner در حالت توقف باقی می‌ماند؛ هیچ وضعیت پذیرش یا Log آن تغییر نمی‌کند.

### یافته‌های قطعی Frontend
- `pages/print-designer.html`: کنترل تشخیص با شناسه `pt-smart-detect` و متن راهنمای OCR در خطوط 15–16.
- `js/modules/print-designer.js`:
  - محدوده مستقل تشخیص: `normalizeSmartText`, `smartSourceCatalog`, `suggestSmartBinding`, `normalizeSmartLineText`, `getSmartTextDirection`, `groupSmartTextLines`, `smartLineToElements`, `runSmartDetection` (تقریباً خطوط 615–837).
  - اتصال UI: listener دکمه در `initLibrary`؛ enable/disable دکمه در `handlePdfFile`, `resetForm`, `editTemplate`.
  - OCR پویا: بارگذاری `tesseract.js@5.1.1` از CDN، ساخت worker با زبان‌های `fas+eng` و `worker.recognize`.
  - مسیر مستقل و لازم ورود دستی سند: `handleImportFile`, `handlePdfFile`, `imageFileToPdf`. این مسیر PDF یا تصویر را به‌عنوان پس‌زمینه سند در همان قالب‌ساز وارد می‌کند و باید حفظ شود؛ حذف تشخیص هوشمند نباید ورود دستی سند را حذف کند.
  - PDF.js برای بارگذاری، بررسی صفحات و رندر PDF در بخش‌های دیگر قالب‌ساز نیز استفاده می‌شود؛ وابستگی `pdf.min.js` و worker آن حذف نشود.
  - `pt-field-hint` و `pt-output-field` برای نمایش عمومی فیلدهای دستی نیز استفاده می‌شوند؛ این استایل‌ها حذف نشوند.
- `css/print-template-library.css`: قواعد اختصاصی دکمه `#pt-smart-detect` حذف‌پذیرند؛ استایل عمومی hint/output field حفظ شود.
- `tests/print-template-library.test.js`: تست‌های اختصاصی smart conversion/OCR/detection و grouping باید با تست‌های عدم وجود مسیر تشخیص جایگزین شوند؛ تست ورود دستی PDF/تصویر، فیلدهای دستی، PDF اصلی، پیش‌نمایش و چاپ حفظ شود.
- `index.html`: PDF.js نسخه 3.11.174 برای رندر و پردازش عادی PDF لازم است؛ فقط اگر وابستگی اختصاصی دیگری برای OCR پیدا شد حذف می‌شود.

### یافته‌های قطعی Backend
- `Router.js`, `PrintTemplateService.js`, `PrintTemplateValidator.js`: در بررسی محتوای اجرایی فعلی، منطق تشخیص فیلد، OCR، Tesseract یا endpoint مختص تشخیص پیدا نشد.
- `POST /print-templates/preview` و resolver مربوط به پیش‌نمایش زنده، مستقل از تشخیص هوشمند هستند و باید حفظ شوند.
- در حال حاضر هیچ تغییر runtime، API، permission، Sheet یا داده عملیاتی Backend برای حذف این قابلیت لازم/موجه نیست؛ بررسی نهایی repository-wide و تست cross-repository الزامی است.

### مرزهای حذف و حفظ
- حذف: دکمه/متن تشخیص، توابع و الگوریتم‌های تشخیص متن/برچسب/مختصات، پیشنهاد خودکار binding، OCR و بارگذاری Tesseract، اتصال event handler و stateهای مربوط، CSS اختصاصی دکمه و تست‌های مثبت قابلیت.
- حفظ: ورود دستی PDF و JPG/PNG/WebP به‌عنوان پس‌زمینه، PDF.js و worker برای کارکردهای عادی PDF، افزودن/ویرایش دستی فیلدها، bindingهای دستی موجود، `pt-field-hint` و `pt-output-field` عمومی، preview resolver و مسیرهای ذخیره/خروجی/چاپ.
- هیچ API، Sheet، جدول یا مسیر موازی جدید ایجاد نشود؛ هیچ داده یا قالب ذخیره‌شده حذف یا migrate نشود.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی شاخه‌ها، آخرین commitهای main، TODO5/ARCHITECTURE و ردیابی وابستگی‌های تشخیص در دو مخزن انجام شد.
  - *Log:* Frontend main=`c88bfd9526782fc23af8a1f737b35523b7830590`؛ Backend main=`682193d2f4cb0b2985947ce050116f21377fcb8e`. مسیر تشخیص در `pages/print-designer.html`، `js/modules/print-designer.js`، `css/print-template-library.css` و `tests/print-template-library.test.js` شناسایی شد. Backend runtime در `Router.js`، `PrintTemplateService.js` و `PrintTemplateValidator.js` فاقد پیاده‌سازی تشخیص/OCR است. PDF.js، ورود دستی سند، renderer فیلد و API preview وابستگی‌های مستقل و قابل حفظ‌اند. شاخه عملیاتی اختصاصی در هر دو مخزن از main ساخته شد.
- [ ] **Task 2 — حذف کامل مسیر تشخیص هوشمند از Frontend (IN PROGRESS):** حذف UI، توابع تشخیص، OCR/Tesseract، اتصال‌ها و CSS اختصاصی؛ پاک‌سازی تست‌های مثبت قدیمی و جایگزینی با تست عدم وجود قابلیت؛ حفظ کامل ورود دستی PDF/تصویر، فیلدهای دستی، PDF.js، preview و چاپ.
- [ ] **Task 3 — ممیزی نهایی، سازگاری، ادغام و انتشار:** جست‌وجوی سراسری آثار اجرایی در هر دو مخزن، اجرای تست‌های Frontend و Cross-repository QA، بررسی عدم Regression و سپس PR/ادغام/انتشار فقط از workflowهای موجود. Backend فقط در صورت کشف کد اجرایی مرتبط تغییر خواهد کرد؛ در غیر این صورت بدون تغییر runtime باقی می‌ماند.

---

## 🎯 Current Objective
افزودن پیش‌نمایش زنده و واقعی خروجی چاپ در محیط قالب‌ساز، بدون ذخیره اجباری قالب.

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

### فاز فوری — اصلاح ثبت فرم‌های متصل به رویداد (2026-11-09)
#### مخازن، شاخه‌ها و مبنا
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `fix/event-form-submit-a4-validation-20261109`، مبنا `main` با commit `683d16d8c69b84bb891739918148a392abafb9a8`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `fix/event-form-submit-a4-validation-20261109`، مبنا `main` با commit `7f7d1c904b0b4dff043ae41bc2388fa8a462d863`.
- تسک قبلی حفظ کیفیت تصویر PDF باز و بدون تغییر در وضعیت پذیرش، به حالت تعلیق منتقل شده است؛ هیچ فایل runtime یا تغییر آن تسک بازنویسی نشده است.

#### یافته‌های واقعی Frontend
- `pages/events.html`: صفحه میزبان جریان اصلی ثبت رویداد؛ فرم اصلی `#event-create-form`.
- `js/modules/events.js`:
  - `renderConfiguredForms()` همان DOM فرم‌های متصل را داخل برگه A4 موجود قرار می‌دهد و فرم جدید/موازی نمی‌سازد.
  - `prepareConfiguredFormsA4()` ظرف فعلی را در برگه A4 قرار می‌دهد؛ `openConfiguredFormsA4()` و `closeConfiguredFormsA4()` فقط وضعیت نمایش `#event-configured-forms-section` را تغییر می‌دهند و داده‌های کنترل‌ها را پاک نمی‌کنند.
  - submit listener نزدیک خطوط 2068–2085 قبل از اجرای `submitForm()` بررسی می‌کند اگر `#event-configured-forms-section.hidden` باشد، A4 را باز و ارسال را متوقف کند. این شرط مستقل از کامل بودن پاسخ‌هاست و علت مستقیم بازشدن دوباره فرم پس از بستن آن است.
  - `submitForm()` در حال حاضر `form.reportValidity()` را پیش از `collectConfiguredFormResponses(projectId)` روی کل فرم اجرا می‌کند؛ کنترل‌های اجباری داخل برگه پنهان ممکن است مانع اعتبارسنجی/تمرکز صحیح شوند.
  - `collectConfiguredFormResponses()` پاسخ‌های SINGLE/MULTIPLE و فایل‌ها را از همان DOM جمع می‌کند و برای فیلدهای اجباری و ستون‌های چندردیفی اعتبارسنجی سفارشی دارد.
  - API ثبت نهایی همان `PMS.Api.post('/events', payload)` با `FormResponses` و `IdempotencyKey` است.
- `css/events.css`: نمایش/پنهان‌سازی overlay A4 و حالت واکنش‌گرا.
- `tests/event-form-a4-modal.test.js`: تست فعلی به‌طور صریح وجود شرط بازکردن اجباری برگه هنگام submit را الزام می‌کند و باید به تست رفتار صحیح تغییر کند.
- `index.html`: cache-busting فایل‌های `events.css` و `events.js` باید پس از تغییر Frontend افزایش یابد.

#### یافته‌های واقعی Backend و قرارداد داده
- `Router.js`: `POST /events` با مجوز `EVENT_CREATE` به `EventService.create(body, params)` می‌رسد.
- `EventService.js`: پیش از ذخیره، `FormService.prepareEventResponses(eventType.ID, event.FormResponses || [], tenantId, projectId)` پاسخ‌ها را اعتبارسنجی می‌کند؛ سپس پس از ایجاد رویداد `FormService.saveEventResponses(...)` پاسخ را ذخیره می‌کند.
- `FormService.js:prepareEventResponses`: mappingهای فعال، اجباری‌بودن فرم، نسخه فرم، فیلدها، visibility و required را اعتبارسنجی می‌کند.
- داده پاسخ در ساختار موجود `35_EventFormData` ذخیره می‌شود؛ endpoint یا Sheet موازی لازم نیست.
- بررسی اولیه نشان می‌دهد باگ گزارش‌شده در submit guard سمت Frontend است؛ در صورت عدم کشف ناسازگاری جدید، Backend runtime/API/schema تغییر نخواهد کرد.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی دو مخزن عملیاتی، شاخه‌ها، commitهای مبنا، TODO5/ARCHITECTURE و مسیر فعلی Print Template، Storage و PDF انجام شد. فاز قبلی بسته و مستندات آن ادغام شده‌اند.
  - *Log:* Backend: `Router.js` مسیرهای قالب و مجوزهای `SYSTEM_SETTINGS/PROJECT_VIEW`؛ `PrintTemplateService.js` مالکیت Tenant و CRUD/PDF؛ `PrintTemplateRepository.js` و شیت `36_PrintTemplates`؛ `GoogleDriveStorage.js` ذخیره tenant-scoped و read/delete؛ `StorageRepository.js` facade. Frontend: `pages/print-designer.html`، `js/modules/print-designer.js`، `css/print-template-library.css`، `tests/print-template-library.test.js` و `index.html`. placeholder فعلی `add-image` از `createElement('image')` استفاده می‌کند؛ مسیر `imageFileToPdf` برای import پس‌زمینه است و نباید برای عنصر تصویر استفاده شود. خروجی PDF فعلی در `generateSourcePdfOutput` با pdf-lib ساخته می‌شود و باید مسیر embed تصویر را حفظ کند.
- [x] **Task 2 — چرخه امن Asset تصویر قالب در Backend:** API بارگذاری و دریافت تصویر متصل به قالب پیاده‌سازی و در PR #42 ادغام شد.
  - *Log:* `PrintTemplateRepository.js`: ستون افزایشی `ImageAssetsJSON` در `36_PrintTemplates`؛ `PrintTemplateValidator.js`: اعتبارسنجی assetId و جلوگیری از ذخیره base64 در Definition؛ `PrintTemplateService.js`: `uploadImage/downloadImage`، ذخیره tenant-scoped در Google Drive، کنترل مالکیت، MIME/signature، سقف 10MB و پاک‌سازی شکست؛ `Router.js`: مسیرهای `POST/GET /print-templates/:id/images`؛ `tests/print-templates.test.js`: تست upload/download و tenant isolation. PR #42 با commit `fbd8cb8351201e258b25be2c90ef3ed91624405e` ادغام و سپس Apps Script production sync/deploy در workflow run `42603283136` موفق شد.
- [x] **Task 3 — تجربه افزودن و ویرایش تصویر در Frontend:** انتخاب تصویر از دستگاه در همان Print Designer، ایجاد عنصر واقعی، نمایش، drag/resize، ذخیره و بازیابی و چندصفحه‌ای؛ تست عملیاتی Product Owner موفق بود.
  - *Log:* Frontend `pages/print-designer.html`, `js/modules/print-designer.js`, `css/print-template-library.css`, `index.html`, `tests/print-template-library.test.js`; PR #70 با commit `00937880ad161c272e2eb2b11ad419a989666940` ادغام شد. کاربر ذخیره قالب، بازگشایی و ماندگاری تصویر را در نسخه عملیاتی تأیید کرد.
- [ ] **Task 4 — حفظ کیفیت اصلی تصویر در خروجی PDF (PAUSED):** تصویرهای ثابت قالب به‌صورت image object/XObject با بایت‌های اصلی JPG/PNG مستقیماً در PDF درج شوند؛ WebP فقط به PNG lossless در ابعاد اصلی تبدیل شود؛ متن و سایر المان‌ها و PDF اصلی حفظ شوند؛ regression روی صفحه‌های چندگانه، rotation/CropBox و templateهای قدیمی اجرا شود. انتشار فقط از workflow موجود و پس از تست.


### فاز فوری — اصلاح ثبت فرم‌های متصل به رویداد
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5/ARCHITECTURE دو مخزن، branch و آخرین commitها، مسیر A4، submit، جمع‌آوری پاسخ، اعتبارسنجی Backend و تست‌های فعلی انجام شد.
  - *Log:* Frontend: `pages/events.html`، `js/modules/events.js` توابع `renderConfiguredForms`, `prepareConfiguredFormsA4`, `openConfiguredFormsA4`, `closeConfiguredFormsA4`, `collectConfiguredFormResponses`, `submitForm`؛ `css/events.css`؛ `tests/event-form-a4-modal.test.js`؛ `index.html`. شرط submit در خط تقریبی 2071 صرفاً بر اساس hidden بودن A4 ثبت را متوقف می‌کند. Backend: `Router.js`، `EventService.js`، `FormService.js` و شیت موجود `35_EventFormData` بررسی شدند؛ قرارداد فعلی پاسخ فرم معتبر و قابل استفاده مجدد است. شاخه‌های feature در هر دو مخزن از commitهای ثبت‌شده main ساخته شدند.
- [x] **Task 2 — اصلاح اعتبارسنجی و ارسال فرم A4:** حذف شرط بازگشایی اجباری A4 صرفاً به دلیل بسته بودن؛ اعتبارسنجی کنترل‌های اصلی و کنترل‌های فرم متصل بدون خطای focus در حالت پنهان؛ بازکردن A4 فقط هنگام وجود فیلد نامعتبر و هدایت کاربر به همان فیلد؛ حفظ پاسخ‌ها، فایل‌ها، جدول‌های چندردیفی و idempotency.
  - *Log:* Frontend `js/modules/events.js`: listener فرم `#event-create-form` دیگر صرفاً به‌دلیل بسته‌بودن A4، submit را متوقف نمی‌کند؛ `validateEventFormControls(form)` کنترل‌های فرم اصلی و فیلدهای فرم متصل را با نادیده‌گرفتن فیلدهای شرطی مخفی اعتبارسنجی می‌کند و در صورت خطای واقعی A4 را باز می‌کند. `submitForm()` از این اعتبارسنجی استفاده می‌کند و `collectConfiguredFormResponses(projectId)` پاسخ‌ها را جمع می‌کند؛ API موجود `PMS.Api.post('/events', payload)`، `FormResponses`، فایل‌ها، چندردیفی‌ها و `IdempotencyKey` حفظ شده‌اند. `index.html` cache-busting نسخه `20261109-event-form-submit-validation-1` شد. Backend runtime/API/schema تغییر نکرد؛ مسیرهای موجود `POST /events` → `EventService.create` → `FormService.prepareEventResponses/saveEventResponses` و Sheet `35_EventFormData` حفظ شدند. Frontend PR #72 با merge commit `efa1b93a796a253b5153610a4d55028f8a79daca` و Backend PR #44 (مستندات فقط) با merge commit `c4d6d22ac1ea9218300a3056a2b45b03cfd61c1f` در main ادغام شدند. کاربر تست عملیاتی ثبت فرم تکمیل‌شده پس از بستن A4 را در 2026-11-09 موفق اعلام و تأیید کرد.
- [x] **Task 3 — آزمون رگرسیون، ادغام و انتشار:** اصلاح تست A4 قبلی، افزودن سناریوهای فرم تکمیل‌شده در حالت بسته، فرم ناقص در حالت بسته، چندردیفی و فایل؛ اجرای تست‌های Frontend و Cross-repository QA؛ ادغام PR و تأیید عملیاتی.
  - *Log:* `tests/event-form-a4-modal.test.js` سناریوهای A4 بسته، اعتبارسنجی فیلد نامعتبر و conditional hidden را پوشش می‌دهد؛ تست‌های مرتبط event submit و Cross-repository QA موفق شدند. Frontend PR #72 ادغام شد و کاربر رفتار ثبت رویداد در نسخه عملیاتی را موفق تأیید کرد. Backend فقط تغییر مستندات داشت و انتشار مجدد Apps Script لازم نبود.


### فاز فوری — دکمه تأیید و بستن برگه A4 فرم رویداد (2026-11-09)
#### تصمیم رفتاری
- دکمه «تأیید» در پایین محتوای برگه A4 و پس از خود برگه قرار گیرد.
- دکمه فقط `closeConfiguredFormsA4()` را اجرا کند؛ تمام مقادیر، انتخاب‌ها، فایل‌ها و ردیف‌های فرم در همان DOM فعلی باقی بمانند.
- دکمه از نوع `button` باشد (نه submit) و هیچ مسیر API ثبت رویداد را فراخوانی نکند؛ ثبت رویداد همچنان فقط با دکمه اصلی «ثبت رویداد» انجام شود.
- دکمه × فعلی و امکان بازگشایی فرم از launcher حفظ شوند. Backend/API/Sheet تغییری لازم نیست.

#### معماری و مسیرهای کشف‌شده
- Frontend: `js/modules/events.js`، تابع `prepareConfiguredFormsA4(section, container)` همان dialog/toolbar/viewport/paper را می‌سازد؛ `closeConfiguredFormsA4()` برگه را مخفی می‌کند و launcher را نمایش می‌دهد؛ `openConfiguredFormsA4()` همان DOM را دوباره باز می‌کند.
- Frontend: `css/events.css` استایل‌های `.event-forms-a4-dialog`, `.event-forms-a4-viewport`, `.event-forms-a4-paper`, `.event-forms-a4-toolbar` و media query موبایل را دارد.
- Regression: `tests/event-form-a4-modal.test.js` و cache-busting در `index.html`.
- Backend: بدون تغییر runtime، API، مجوز، شیت یا داده.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی وضعیت پذیرش تسک ثبت فرم، آخرین commitهای main، فایل‌های TODO5/ARCHITECTURE و DOM/توابع فعلی برگه A4 انجام شد.
  - *Log:* Backend main=`c4d6d22ac1ea9218300a3056a2b45b03cfd61c1f` و Frontend main=`17a7a83b715cdf5f0ec747aee485c1087bb72c43`؛ branch مستقل `feat/event-form-a4-confirm-close-20261109` در هر دو مخزن ساخته شد. مسیر ساخت برگه در `js/modules/events.js:prepareConfiguredFormsA4` و بستن/بازکردن در `closeConfiguredFormsA4/openConfiguredFormsA4` بررسی شد؛ دکمه باید به همان close handler متصل شود و از submit فرم اصلی مستقل بماند.
- [x] **Task 2 — افزودن دکمه تأیید:** دکمه «تأیید» در پایین برگه A4 با `type="button"` اضافه شد؛ فقط برگه را می‌بندد و تمام مقادیر فرم را حفظ می‌کند؛ هیچ submit یا API ثبت رویدادی اجرا نمی‌شود.
  - *Log:* Frontend `js/modules/events.js`: در `prepareConfiguredFormsA4(section, container)` عنصر `button#event-forms-a4-confirm` با متن «تأیید» ساخته و فقط به `closeConfiguredFormsA4()` متصل شد؛ دکمه پس از `paper` در viewport قرار گرفت. `css/events.css`: استایل `.event-forms-a4-actions` و `.event-forms-a4-confirm` و مخفی‌سازی در `@media print`. `tests/event-form-a4-modal.test.js`: تست نوع button، متن، listener بستن، ترتیب قرارگیری و حفظ DOM/مقادیر. `index.html`: cache-busting با نسخه `20261109-event-form-a4-confirm-1`. Frontend PR #73 با merge commit `0bcc7f43d17ae1f9388218e798b421fef5a07aad` ادغام شد. Backend PR #45 فقط مستندات TODO5 را sync کرد؛ هیچ تغییر runtime/API/schema/Sheet نداشت و با commit `ec5c890ae296c6421a6512aedb2cdfba3d343fb3` ادغام شد.
- [x] **Task 3 — آزمون رگرسیون، ادغام و انتشار:** تست‌ها و کنترل‌های CI موفق شدند؛ هر دو PR ادغام و انتشار Frontend به GitHub Pages با موفقیت تکمیل شد؛ Product Owner تست عملیاتی را تأیید کرد.
  - *Log:* Frontend PR #73 ادغام شد؛ workflowهای `Frontend checks` run `42633388334`، `PMS cross-repository QA` run `42633388482` و `PMS frontend agent suite` run `42633388613` موفق شدند. انتشار `Publish frontend to GitHub Pages (MAIN)` run `42633389071` و `pages build and deployment` run `42633385825` هر دو با conclusion=success تکمیل شدند. کاربر در 2026-11-09 تست عملیاتی را تأیید کرد: دکمه A4 را بدون ثبت رویداد می‌بندد و اطلاعات فرم پس از بازگشایی حفظ می‌شوند. Backend PR #45 فقط مستندات بود؛ انتشار مجدد Apps Script لازم نبود. ادغام‌ها: Frontend `0bcc7f43d17ae1f9388218e798b421fef5a07aad`، Backend `ec5c890ae296c6421a6512aedb2cdfba3d343fb3`.


## 2026-11-09 — پیش‌نمایش زنده در محیط قالب‌ساز

### 🎯 Current Objective
افزودن پیش‌نمایش واقعی و زنده خروجی چاپ در همان محیط طراحی؛ تغییرات ذخیره‌نشده باید بدون رفتن به صفحه چاپ اسناد و بدون ذخیره قالب قابل مشاهده باشند.

### 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
#### مخازن و شاخه‌های عملیاتی
- Backend: Saeidesl/PRSPRO2BACKEND-PRODUCTION، شاخه feat/live-print-preview-20261109، مبنا main با commit 33c36066d559f0e051fc6525b50c6d0c61c797f9.
- Frontend: Saeidesl/PRSPRO2-PRODUCTION، شاخه feat/live-print-preview-20261109، مبنا main با commit 51a545c8cc6648e60dea6ac06b60fda8edf981e5.
- هر دو شاخه مستقل از main ساخته شده‌اند؛ مخازن توسعه و شاخه‌های قدیمی feature مبنای این کار نیستند.

#### معماری کشف‌شده Backend
- Router.js: GET /print-templates، GET /print-templates/sources و POST /print-templates/:id/resolve مسیرهای موجودند. مسیر resolve فعلی به PROJECT_VIEW نیاز دارد.
- PrintTemplateService.js: تابع resolve(id, body, params) قالب ذخیره‌شده را با _template و Tenant کنترل می‌کند، پروژه را با ProjectRepository.findById و ProjectService._isProjectAvailableToUser_ اعتبارسنجی می‌کند و bindingهای PROJECT_FIELD، PROJECT_INFORMATION، EVENT_FORM_FIELD و EVENT_FORM_RESPONSE را از منابع مرکزی، رویدادها و پاسخ‌های فرم resolve می‌کند.
- PrintTemplateValidator.js: تابع parseDefinition قرارداد Definition، صفحه‌ها، المان‌ها و bindingها را اعتبارسنجی و سقف حجم Definition را کنترل می‌کند.
- منابع داده موجود: ProjectRepository، InformationTypeRepository، ProjectInformationRepository، EventRepository و FormRepository.getEventResponses(). داده پاسخ فرم در ساختار موجود ذخیره می‌شود.
- شیت قالب‌ها 36_PrintTemplates و فایل PDF/تصاویر در Google Drive tenant-scoped باقی می‌مانند. برای پیش‌نمایش هیچ Sheet، ستون، رکورد یا فایل دائمی جدیدی لازم نیست.
- تصمیم Task 2: منطق resolve داده به helper مشترک و قابل استفاده مجدد تبدیل شود؛ endpoint پیش‌نمایش فقط Definition و ProjectID را می‌گیرد، همان اعتبارسنجی و Tenant/Permission scope را اعمال می‌کند و هیچ چیزی ذخیره نمی‌کند. قرارداد هدف: POST /print-templates/preview با payload شامل ProjectID و Definition و پاسخ شامل project و data.

#### معماری کشف‌شده Frontend
- pages/print-designer.html: صفحه فعلی قالب‌ساز، toolbar، پنل تنظیمات، بوم #pt-design-canvas و فرم ذخیره #pt-template-form.
- js/modules/print-designer.js:
  - definition منبع واحد تغییرات جاری و ذخیره‌نشده است.
  - renderEditor() و renderCanvas() بعد از تغییرات، بوم را رندر می‌کنند؛ drag/resize در bindEditor() و ویرایش تنظیمات در applyInspectorChange() انجام می‌شود.
  - editTemplate() قالب و PDF موجود را بارگذاری می‌کند؛ saveTemplate() تنها مسیر ذخیره صریح است.
  - renderOutputDocument(template, project, data) موتور HTML خروجی و generateSourcePdfOutput() موتور PDF اصلی/overlay است.
  - loadTemplateImages()، loadOutputPdfPages() و fetchOutputPdfBytes() منابع تصویری و PDF را از مسیرهای امن موجود بارگذاری می‌کنند.
  - loadOutputOptions() فهرست پروژه‌ها و قالب‌ها را در صفحه چاپ اسناد می‌گیرد؛ resolveOutput() از POST /print-templates/:id/resolve استفاده می‌کند.
- css/print-template-library.css: استایل بوم، صفحه‌های طراحی، خروجی چاپ و breakpoint موبایل؛ پنل preview در همین فایل توسعه می‌یابد.
- tests/print-template-library.test.js: تست‌های قالب‌ساز، رندر خروجی، PDF، تصاویر، چندصفحه‌ای و نسخه asset.
- index.html: cache-busting فایل‌های print-template-library.css و print-designer.js.

#### قیود و معیارهای معماری
- فقط یک Definition و یک مسیر ذخیره قالب حفظ شود؛ preview هرگز saveTemplate()، POST/PUT ذخیره قالب یا آپلود دائمی PDF/تصویر را فراخوانی نکند.
- رندر پیش‌نمایش باید از موتور خروجی موجود استفاده کند تا ظاهر آن با چاپ نهایی همسان بماند؛ PDF منبع، تصویرها، RTL، اندازه واقعی صفحه، چندصفحه‌ای و bindingهای موجود حفظ شوند.
- تغییرات بوم، inspector، انتخاب پروژه، undo/redo و تغییر صفحه باید preview را به‌روز کنند؛ درخواست‌های متوالی با debounce و نادیده‌گرفتن پاسخ‌های قدیمی مدیریت شوند.
- دسکتاپ: طراحی و preview کنار هم؛ موبایل: preview با کنترل نمایش تمام‌صفحه/تعویض نما. خطای resolve یا منبع فقط در پنل preview نشان داده شود و ویرایش را متوقف نکند.
- هیچ تغییری در قالب‌های ذخیره‌شده، داده‌های عملیاتی، API چاپ نهایی یا گردش فعلی چاپ بدون نیاز و سازگاری‌سنجی انجام نشود.

### 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5.md و ARCHITECTURE.md هر دو مخزن، آخرین commitهای main، شاخه‌ها، Print Designer، موتور خروجی، مسیرهای resolve، اعتبارسنجی Definition و منابع داده انجام شد.
  - *Log:* Backend main=33c36066d559f0e051fc6525b50c6d0c61c797f9 و Frontend main=51a545c8cc6648e60dea6ac06b60fda8edf981e5؛ شاخه مستقل feat/live-print-preview-20261109 در هر دو مخزن ایجاد شد. Backend: Router.js، PrintTemplateService.resolve، PrintTemplateValidator.parseDefinition، مخازن Project/Information/Event/Form و endpoint فعلی POST /print-templates/:id/resolve بررسی شدند. Frontend: pages/print-designer.html، js/modules/print-designer.js (توابع bindEditor، renderEditor، renderCanvas، editTemplate، saveTemplate، renderOutputDocument، generateSourcePdfOutput)، css/print-template-library.css، tests/print-template-library.test.js و index.html بررسی شدند. فهرست منابع و داده واقعی پروژه از resolver فعلی قابل reuse است؛ preview ذخیره‌نشده به resolver بدون ذخیره نیاز دارد.
- [x] **Task 2 — Backend: سرویس امن Resolve برای پیش‌نمایش ذخیره‌نشده:** استخراج منطق resolve مشترک، افزودن POST `/print-templates/preview` با دریافت `ProjectID` و `Definition`، اعتبارسنجی با Validator موجود، اعمال `PROJECT_VIEW` و tenant/project access، و اطمینان از عدم ایجاد/ویرایش رکورد یا Sheet.
  - *Log:* Backend: `PrintTemplateService.js` منطق resolve مشترک را در `_resolveProjectData(projectId, definition, user)` متمرکز کرد؛ `preview(body, params)` تعریف ذخیره‌نشده را با `PrintTemplateValidator.parseDefinition` اعتبارسنجی و داده‌های پروژه/اطلاعات مرکزی/پاسخ فرم‌ها را بدون ذخیره resolve می‌کند. `Router.js`: مسیر `POST /print-templates/preview` با مجوز `PROJECT_VIEW`. `tests/print-templates.test.js`: تست resolve bindingها، tenant/project access، تعریف نامعتبر، عدم ایجاد قالب و اتصال Router. CI در Backend runs `42664792706`، `42664792720` و `42664792703` موفق شدند. Backend PR #46 با head فعلی `d2479a2faa8a05e0ff2417cb2d255ef6570b8851` باز است؛ workflowهای Backend source checks run `42665150788`، PMS agent suite run `42665150920` و Procurement diagnostics run `42665151381` همگی موفق‌اند. هنوز merge/deploy نشده.
- [x] **Task 3 — Frontend: پیش‌نمایش زنده در همان قالب‌ساز:** پنل پیش‌نمایش، انتخاب پروژه، رندر Definition ذخیره‌نشده با موتور چاپ فعلی، debounce، محافظت از پاسخ‌های قدیمی، پشتیبانی PDF/تصویر و حالت واکنش‌گرا پیاده شد.
  - *Log:* در مخزن Frontend: `pages/print-designer.html` پنل preview و انتخاب پروژه؛ `js/modules/print-designer.js` توابع `loadLivePreviewProjects`، `bindLivePreview`، `scheduleLivePreview`، `renderLivePreview` و `toggleLivePreviewExpanded`؛ endpoint `POST /print-templates/preview` با Definition جاری؛ reuse `renderOutputDocument` و `generateSourcePdfOutput`؛ فایل‌های محلی PDF/تصویر تا پیش از ذخیره صریح فقط در حافظه مرورگر می‌مانند. `css/print-template-library.css` حالت واکنش‌گرا؛ `tests/print-template-library.test.js` تست‌های API، عدم ذخیره، PDF محلی و assetهای تصویر؛ `index.html` cache-busting نسخه `20261109-live-preview-1`. Frontend checks run `42665949449`، cross-repository QA run `42665949108` و frontend agent suite run `42665949084` موفق شدند. تغییرات Frontend در PR #74 ذخیره شده‌اند.
- [ ] **Task 4 — رگرسیون نهایی، بررسی مرورگر، ادغام و انتشار (IN PROGRESS):** ممیزی نهایی UI/performance، تأیید اجرای regression مرورگر، بررسی قرارداد دو مخزن، سپس آماده‌سازی ادغام و انتشار مطابق workflowهای موجود؛ توقف برای تست Product Owner.
  - *Log:* Backend PR #46 با head `95d048eda9a71317bd7f59c5a74afd41d323d9e4` و Frontend PR #74 با head `300e875fafb3c9e7c85ea6e099e6e59867ff2a17` باز و merge نشده‌اند. Backend source checks run `42665150788`، PMS agent suite run `42665150920` و Procurement diagnostics run `42665151381` موفق‌اند. ممیزی مرورگر Frontend run `42665949298` در attempt دوم است؛ تست‌های مرورگر موجود موفق‌اند و مرحله UI inventory/performance audit هنوز در حال اجراست. هیچ merge، deploy یا تغییر داده عملیاتی انجام نشده است.


## 2026-11-09 — اصلاح شناسه تصویر موقت در پیش‌نمایش زنده قالب‌ساز

### 🎯 Current Objective
رفع خطای «شناسه تصویر یکی از المان‌های قالب معتبر نیست» هنگام پیش‌نمایش زنده تصویری که هنوز در قالب ذخیره نشده است؛ بدون تغییر در تعریف اصلی و بدون آپلود/ذخیره خودکار.

### 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- Backend operational: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه اصلاحی `fix/live-preview-pending-image-asset-20261109`، مبنای main برابر `f33f32bd77fc1674ea7c49d7daf17e79ba0b0f3c`.
- Frontend operational: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه اصلاحی `fix/live-preview-pending-image-asset-20261109`، مبنای main برابر `bf8b04c5e6e27db45ce73f02e59d52709c5ca310`.
- Backend: `PrintTemplateValidator.js:parseDefinition` برای هر image که property به نام `assetId` دارد، شناسه با الگوی `IMG_[A-Za-z0-9_-]{8,100}` اعتبارسنجی می‌کند. `PrintTemplateService.js:uploadImage` شناسه دائمی را با پیشوند `IMG_` و UUID بدون خط تیره می‌سازد؛ `preview(body, params)` نیز Definition دریافتی را از همان Validator عبور می‌دهد. مسیر API موجود `POST /print-templates/preview` و مجوز `PROJECT_VIEW` حفظ می‌شود.
- Frontend: `js/modules/print-designer.js:handleImageSelection` المان تصویر جدید را با `assetId:''` و فایل را در `pendingImageFiles[element.id]` نگه می‌دارد؛ `renderLivePreview` پیش از اصلاح، clone تعریف را بدون پاک‌سازی به `POST /print-templates/preview` می‌فرستاد. رندر محلی تصویر با `imageSources[item.assetId || item.id]` و مسیر PDF با فایل pending کار می‌کند.
- علت قطعی: شناسه خالیِ یک asset موقت نباید به Validator سمت سرور ارسال شود؛ اعتبارسنجی سخت‌گیرانه شناسه assetهای دائمی باید بدون تغییر باقی بماند.
- راه‌حل: فقط clone مخصوص preview پاک‌سازی شود؛ property خالی `assetId` صرفاً برای المان تصویری که فایل متناظر آن در `pendingImageFiles` وجود دارد حذف شود. Definition اصلی، شناسه assetهای ذخیره‌شده و تصاویر خراب/بدون فایل pending تغییر نکنند. هیچ API، Sheet، schema، migration یا مسیر موازی جدید لازم نیست.

### 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5.md و ARCHITECTURE.md هر دو مخزن، آخرین commitهای main، شاخه‌های اصلاحی و مسیر انتخاب تصویر → Definition → preview → Validator انجام شد.
  - *Log:* Backend: `PrintTemplateValidator.js:parseDefinition`، `PrintTemplateService.js:uploadImage/preview` و route موجود در `Router.js` بررسی شدند؛ تولید شناسه دائمی با `IMG_ + UUID بدون خط تیره` معتبر است. Frontend: `js/modules/print-designer.js:handleImageSelection/uploadPendingImages/renderLivePreview` و `tests/print-template-library.test.js` بررسی شدند. اشکال فقط در ارسال `assetId:''` برای تصویر pending است؛ Backend validation، قرارداد API و ذخیره‌سازی دست‌نخورده می‌مانند.
- [ ] **Task 2 — اصلاح preview برای تصویر ذخیره‌نشده (IN PROGRESS):** حذف شناسه خالی فقط از clone درخواست preview، حفظ Definition اصلی و تصاویر دائمی؛ افزودن تست رگرسیون برای pending، saved و image بدون فایل pending.
- [ ] **Task 3 — Regression، ادغام و انتشار:** اجرای تست‌های Frontend و QA بین‌مخزنی، بررسی diff و CI، ادغام Frontend در main و انتشار GitHub Pages؛ سپس تست عملیاتی Product Owner. Backend فقط مستندات را نگه می‌دارد و deployment/runtime change ندارد.


## 2026-11-09 — افزودن چاپ مستقیم به پیش‌نمایش زنده قالب‌ساز

### 🎯 Current Objective
تکمیل پنل پیش‌نمایش زنده با امکان چاپ همان خروجی از داخل محیط قالب‌ساز؛ بدون ذخیره قالب و بدون مسیر موازی.

### 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- Backend operational: `Saeidesl/PRSPRO2BACKEND-PRODUCTION/main`، مبنای فاز `e723055d4fdd9e227a8f387d19a9dc5796c6e65a`؛ Frontend operational: `Saeidesl/PRSPRO2-PRODUCTION/main`، مبنای فاز `c15fdeaef1dc0e683d8a54bfccb1e799b3b9088d`.
- Frontend branch: `feat/live-preview-print-20261109`; Backend branch: `feat/live-preview-print-20261109`.
- Frontend `pages/print-designer.html`: پنل موجود `#pt-live-preview-content` و نوار ابزار `#pt-live-preview-actions`.
- Frontend `js/modules/print-designer.js`: `renderLivePreview()` با API موجود `POST /print-templates/preview` و Definition جاری، از `renderOutputDocument()` برای HTML و `generateSourcePdfOutput()` برای PDF اصلی استفاده می‌کند؛ `renderFinalPdfPreview()` PDF را برای نمایش رندر می‌کند؛ `printOutput()` در صفحه خروجی قبلی، PDF را در نمایشگر مرورگر باز می‌کند یا HTML را با `window.print()` چاپ می‌کند.
- Frontend `css/print-template-library.css`: قواعد چاپ فعلی برای `body.pt-printing` فقط `#pt-output-preview-card` را هدف می‌گیرند؛ قابلیت جدید باید selector مستقل `body.pt-live-preview-printing` داشته باشد و فقط `#pt-live-preview-content` را در چاپ نمایش دهد.
- Backend: endpoint امن موجود `POST /print-templates/preview` با `PROJECT_VIEW` و tenant/project scope حفظ می‌شود؛ هیچ API، permission، Sheet، schema یا runtime change لازم نیست.
- تصمیم رفتاری: دکمه «چاپ» تا آماده‌شدن preview غیرفعال است؛ خروجی HTML از پنل فعلی چاپ می‌شود؛ PDF اصلی به‌صورت PDF اصلی در تب/نمایشگر PDF باز می‌شود و از همان‌جا چاپ می‌گردد. هیچ saveTemplate، CRUD قالب، upload یا ایجاد رویداد اجرا نمی‌شود.

### 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5/ARCHITECTURE، commitهای main، پنل پیش‌نمایش، موتور HTML/PDF، مسیر چاپ موجود و قواعد CSS چاپ انجام شد.
  - *Log:* Frontend: `pages/print-designer.html` پنل `#pt-live-preview-content`؛ `js/modules/print-designer.js` توابع `renderLivePreview`، `renderOutputDocument`، `generateSourcePdfOutput`، `renderFinalPdfPreview` و `printOutput`؛ `css/print-template-library.css` قواعد موجود چاپ سند نهایی؛ `tests/print-template-library.test.js`؛ `index.html`. Backend: route موجود `POST /print-templates/preview` و permission `PROJECT_VIEW` بدون تغییر استفاده می‌شوند. main SHAs قبل از شروع: Backend `e723055d4fdd9e227a8f387d19a9dc5796c6e65a`، Frontend `c15fdeaef1dc0e683d8a54bfccb1e799b3b9088d`.
- [ ] **Task 2 — افزودن چاپ به پنل پیش‌نمایش زنده (PAUSED by Product Owner):** دکمه چاپ، وضعیت آماده‌بودن preview، چاپ HTML با CSS محدود به preview، بازکردن PDF اصلی برای چاپ و مدیریت URL موقت؛ بدون ذخیره‌سازی یا تغییر Backend.
- [ ] **Task 3 — آزمون رگرسیون، ادغام و انتشار:** اجرای Frontend regression و cross-repository QA، browser audit، ادغام PRها و انتشار GitHub Pages؛ تست عملیاتی Product Owner.
