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
- [ ] **Task 2 — Backend: سرویس امن Resolve برای پیش‌نمایش ذخیره‌نشده (IN PROGRESS):** استخراج منطق resolve مشترک، افزودن POST /print-templates/preview با دریافت ProjectID و Definition، اعتبارسنجی با Validator موجود، اعمال PROJECT_VIEW و tenant/project access، و اطمینان از عدم ایجاد/ویرایش رکورد یا Sheet.
- [ ] **Task 3 — Frontend: پیش‌نمایش زنده در همان قالب‌ساز:** افزودن پنل پیش‌نمایش و انتخاب پروژه؛ استفاده از resolver preview و موتور خروجی موجود برای نمایش تغییرات جاری و ذخیره‌نشده؛ به‌روزرسانی خودکار پس از تغییرات، انتخاب پروژه و undo/redo؛ حفظ PDF/تصویرهای موجود و پشتیبانی واکنش‌گرا.
- [ ] **Task 4 — رگرسیون، سازگاری، ادغام و انتشار:** تست Backend و Frontend، عدم ذخیره ناخواسته، قرارداد API، PDF اصلی و چندصفحه‌ای، تصاویر، RTL، سرعت/debounce، موبایل و چاپ؛ سپس PR/CI و انتشار فقط از workflowهای موجود و توقف برای تست Product Owner.
