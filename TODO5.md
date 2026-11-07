## 🎯 Current Objective

افزودن پشتیبانی سازگار از انتخاب و ثبت هم‌زمان چند تصویر در تمام فیلدهای تصویری اطلاعات مرکزی، شامل فیلدهای مستقل و ستون‌های تصویری جداول که از طریق فرم متصل به رویداد تکمیل می‌شوند؛ بدون ایجاد API، فرم یا مسیر ذخیره‌سازی موازی.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه کاری `feat/multi-image-central-information`؛ شاخه مبنا `main`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه کاری `feat/multi-image-central-information`؛ شاخه مبنا `main`.
- هر دو مخزن عملیاتی تأیید و شاخه کاری از آخرین `main` ایجاد شد. هیچ تغییری روی `main` یا مخازن توسعه انجام نشده است.
- Backend: Google Apps Script V8 + Google Sheets؛ فایل‌ها در Google Drive. Frontend: HTML/CSS/JavaScript.

### جریان فعلی و قراردادهای قطعی کشف‌شده
- صفحه ثبت رویداد: `pages/events.html`؛ ماژول اصلی: `js/modules/events.js`.
- `Events.renderConfiguredForms()` فرم‌های متصل را از تعریف موجود رندر می‌کند.
- `Events.createFieldInput()` ورودی نوع `image` را به file input تبدیل می‌کند؛ در وضع فعلی انتخاب یک فایل است.
- `Events.collectConfiguredFormResponses(projectId)` پاسخ فرم‌ها را جمع‌آوری می‌کند.
- `Events.uploadConfiguredFormFile(file, dataType, projectId, input)` فایل را با `POST /projects/:projectId/attachments` و payload شامل `FileName`, `MimeType`, `Base64`, `AttachmentType` بارگذاری می‌کند و reference امن را برمی‌گرداند.
- `AttachmentType=INFORMATION` برای تصاویر اطلاعات مرکزی استفاده می‌شود؛ گزینه موجود `PROFILE` فقط برای تصویر نمایه پروژه است.
- پاسخ فرم در مسیر اصلی `POST /events` ثبت می‌شود؛ API ثبت رویداد و ساختار فرم تغییر موازی نخواهد داشت.
- Backend: `Router.js` مسیرهای پیوست و رویداد را مدیریت می‌کند؛ `AttachmentService.js` مالکیت و دسترسی را کنترل و metadata را در `15_Attachments` ثبت می‌کند.
- `FormService.prepareEventResponses(eventTypeId, responses, tenantId, projectId)` پاسخ‌ها را اعتبارسنجی می‌کند؛ `FormService.saveEventResponses(event, responses, user, params)` snapshot فرم را در `34_EventFormData` ثبت و مقدارهای غیرخالی را به اطلاعات جاری پروژه منتقل می‌کند.
- `ProjectInformationService._scalar(value, dataType, rules, options, label, context)` در نسخه جدید برای `image` یک object قدیمی یا آرایه‌ای تا ۲۰ reference تصویر می‌پذیرد؛ برای `file` همچنان فقط object مجاز است؛ `_validate(type, columns, value, context)` مقدار اطلاعات مرکزی را اعتبارسنجی می‌کند.
- مقدار جاری در `30_ProjectInformation.ValueJSON` و تاریخچه در `31_ProjectInformationHistory` نگهداری می‌شود. برای اطلاعات تصویری، backend metadata معتبر را از `15_Attachments` بازیابی می‌کند و metadata ارسالی کلاینت مرجع نیست.
- `ProjectInformationService.save` سقف طول JSON برابر ۴۵۰۰۰ کاراکتر و idempotency مبتنی بر `SourceEventID` را اعمال می‌کند.
- تعریف تعدادپذیری `Cardinality=MULTIPLE` فعلی برای ردیف‌های جدولی است و در اطلاعات بدون ستون مجاز نیست؛ نباید برای چندتصویری به‌اشتباه از آن استفاده شود.
- نمایش پاسخ ثبت‌شده رویداد در `Events.openDetails()` و `Events.displayValue()` است. اطلاعات مرکزی پروژه در `js/modules/project-detail.js` و پنل زمینه رویداد در `Events.loadEventContext()` نمایش داده می‌شود.
- لایه درخواست Frontend فقط از `PMS.Api` استفاده می‌کند؛ cache-busting دارایی‌ها در `index.html` انجام می‌شود.
- آزمون‌های پایه: Backend و Frontend هر دو `tests/information-file-types.test.js` دارند؛ Backend با `node --test tests/*.test.js` و CI موجود بررسی می‌شود.

### تصمیم سازگاری داده
- قرارداد جدید برای هر فیلد/ستون `DataType=image`: مقدار جدید به‌صورت آرایه‌ای از referenceهای امن پیوست ذخیره می‌شود؛ مقدار قدیمی تک‌تصویر (object) همچنان خوانده و نمایش داده می‌شود.
- این قرارداد برای فیلد مستقل تصویر و ستون تصویر در جداول تک‌ردیفی و چندردیفی اعمال می‌شود؛ نوع `file` همچنان تک‌فایل می‌ماند.
- تعداد تصاویر هر فیلد حداکثر ۲۰ و حجم هر تصویر مطابق محدودیت موجود سرور (۱۰ مگابایت) خواهد بود؛ بارگذاری با کنترل خطا و بدون درخواست موازی سنگین انجام می‌شود.
- فقط پروژه‌محور؛ محدودیت فعلی ثبت فایل در رویداد مستقل حفظ می‌شود.
- هیچ Sheet یا ستون جدیدی لازم نیست؛ referenceها در همان `ValueJSON` و snapshot پاسخ فرم ذخیره می‌شوند.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning [x]
- بررسی دسترسی، شاخه‌ها، آخرین commitها، `TODO5.md` و `ARCHITECTURE.md` در هر دو مخزن انجام شد.
- جریان فرم رویداد، upload پیوست، اعتبارسنجی اطلاعات مرکزی، ذخیره snapshot و نمایش مقادیر بررسی شد.
- شاخه کاری هم‌نام در هر دو مخزن از `main` ایجاد شد؛ تغییر runtime یا داده عملیاتی انجام نشد.
- *Log:* Backend: `ProjectInformationService.js` توابع `_scalar`, `_validate`, `save`؛ `FormService.js` توابع `prepareEventResponses`, `saveEventResponses`؛ `AttachmentService.js` و مسیرهای موجود Router؛ شیت‌های `15_Attachments`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `34_EventFormData`. Frontend: `js/modules/events.js` توابع `renderConfiguredForms`, `createFieldInput`, `collectConfiguredFormResponses`, `uploadConfiguredFormFile`, `openDetails`, `displayValue`, `loadEventContext`; `js/modules/project-detail.js`؛ `index.html`. آزمون‌های پایه `tests/information-file-types.test.js` در هر دو مخزن. هر دو شاخه کاری از main ایجاد شدند.

### Task 2 — Backend: اعتبارسنجی و ذخیره چندتصویری [x]
- توسعه اعتبارسنجی آرایه تصویر در `ProjectInformationService._validate` با استفاده مجدد از `_scalar` برای اعتبارسنجی مستقل هر AttachmentID، tenant، پروژه، نوع پیوست، وضعیت و MIME.
- حفظ کامل پشتیبانی از object تک‌تصویر قدیمی و جلوگیری از پذیرش آرایه برای نوع `file` یا ساختارهای جدولی خارج از محدوده.
- اعمال سقف ۲۰ تصویر و حفظ سقف فعلی JSON، idempotency، تاریخچه و tenant isolation.
- افزودن تست‌های واحد برای آرایه معتبر، آرایه خالی، تعداد بیش از حد، پیوست نامعتبر/متعلق به پروژه یا tenant دیگر، MIME غیرتصویری و سازگاری مقدار قدیمی.
- هیچ تغییر DB/API route جدیدی انجام نشد.
- *Log:* `ProjectInformationService.js` تابع `_scalar` اکنون آرایه حداکثر ۲۰ reference تصویر را با کنترل AttachmentID، TenantID، EntityType، EntityID، AttachmentType، Status و MIME به metadata معتبر تبدیل می‌کند؛ مقدار قدیمی object حفظ شده و آرایه برای `file` رد می‌شود. `tests/information-file-types.test.js` آزمون‌های سازگاری legacy، سقف تعداد، MIME و مالکیت و اعتبارسنجی فیلد مستقل و ستون تصویری جدول را پوشش می‌دهد. GitHub Actions در اجرای ۵۵ در حال اجرای تست‌ها و کنترل syntax است.

### Task 3 — Frontend: انتخاب چندتصویر، پیش‌نمایش و نمایش مقادیر (IN PROGRESS) [ ]
- در `js/modules/events.js` تمام ورودی‌های `image`، چه مستقل و چه ستون جدول، به انتخاب چند فایل مجهز شده‌اند؛ پیش‌نمایش و حذف هر تصویر پیش از ثبت و کنترل تعداد/حجم/MIME اعمال شده است.
- `collectConfiguredFormResponses` آرایه referenceها را از همان API موجود بارگذاری می‌کند؛ بارگذاری ترتیبی و cache هر File برای جلوگیری از بارگذاری تکراری حفظ شده است.
- `hydrateAmendmentForm` با آرایه تصویر و داده تک‌تصویر قدیمی سازگار شده است.
- جزئیات رویداد، پنل اطلاعات مرکزی، پاسخ فرم‌های پروژه و صفحه اطلاعات پروژه تصاویر را با پیش‌نمایش امن نمایش می‌دهند؛ ستون‌های تصویری جدول نیز پوشش داده شده‌اند.
- نسخه cache-busting فایل‌های تغییرکرده در `index.html` به‌روز شده است.
- *Log:* `js/modules/events.js`: توابع `createFieldInput`, `renderConfiguredForms`, `addConfiguredFormRow`, `hydrateAmendmentForm`, `collectConfiguredFormResponses`, `hasStoredFormAttachment`, `uploadConfiguredFormImages`, `uploadConfiguredFormFile`, `renderEventInformationValue`, `renderEventFormValue`, `openEventImageAttachment`, `openDetails`, `loadEventContext`. انتخاب تصویر تا ۲۰ فایل، پیش‌نمایش و حذف قبل از ثبت، بارگذاری ترتیبی از `POST /projects/:projectId/attachments` و استفاده از `AttachmentType=INFORMATION` (تصویر پروفایل فقط برای اولین فایل انتخاب‌شده) انجام می‌شود. `js/modules/project-detail.js`: `prepareProjectFormImages`, `renderProjectFormValue`, `renderInformationValue` برای نمایش آرایه تصویر و سلول‌های جدولی گسترش یافت. `index.html` نسخه assetها را به‌روز کرد. `tests/information-file-types.test.js` آزمون‌های قراردادی Frontend را گسترش داد.

### Task 4 — Integration QA, Regression & Release Readiness [ ]
- تست‌های Backend/Frontend برای قرارداد آرایه و سازگاری legacy افزوده/به‌روزرسانی شوند.
- تست‌های خودکار، syntax، CI، کنترل API request/response، دسترسی ATTACHMENT_UPLOAD/VIEW، ذخیره و بازیابی تصاویر و عدم ایجاد تغییر DB اجرا شوند.
- تغییرات دو مخزن از نظر قرارداد reference و نسخه asset هماهنگ شوند؛ PR/ادغام و انتشار فقط پس از عبور بررسی‌ها و طبق گردش‌کار عملیاتی انجام شود.
- وضعیت GitHub، Backend deployment، Frontend deployment و live verification جداگانه گزارش شود؛ هیچ انتشار تأییدنشده‌ای عملیاتی اعلام نشود.
