# معماری بک‌اند PMS

> مرجع پایدار معماری مخزن `Saeidesl/PRSPRO2BACKEND` در شاخه `main`. جزئیات تاریخی و تصمیم‌های قبلی در `ARCHITECTURE2.md` نگهداری شده‌اند؛ این سند مسیرهای عملیاتی جاری و قابلیت‌های جدید را خلاصه می‌کند.

## پشته و اصول

- Google Apps Script با Runtime V8 و Google Sheets به‌عنوان پایگاه داده عملیاتی.
- مسیریابی همه درخواست‌ها از `Router.js`؛ اعتبارسنجی و مجوزها در سمت سرور مرجع نهایی‌اند.
- دسترسی داده‌ها tenant-scoped است و شناسه‌های داخلی پایدار مبنای ارتباط رکوردها هستند.
- فایل‌های حجیم در Google Drive ذخیره می‌شوند؛ Google Sheets فقط metadata و شناسه ذخیره‌سازی را نگه می‌دارد.

## اطلاعات پویا و فرم‌ها

- `InformationTypeValidator.js`: allow-list نوع داده مرکزی شامل `text`, `textarea`, `number`, `date`, `datetime`, `boolean`, `select`, `image`, `file`؛ تعدادپذیری `SINGLE` یا `MULTIPLE` مستقل از نوع داده و ستون‌هاست.
- `InformationTypeService.js` و `InformationTypeRepository.js`: مدیریت تعریف مرکزی اطلاعات و ستون‌ها.
- `ProjectInformationService.js`: اعتبارسنجی و ذخیره مقادیر پروژه در `30_ProjectInformation.ValueJSON` و تاریخچه در `31_ProjectInformationHistory`.
- `FormService.js`: فرم‌های قابل استفاده مجدد، snapshot نسخه فرم و اعتبارسنجی پاسخ رویداد؛ `prepareEventResponses(eventTypeId, responses, tenantId, projectId)` زمینه پروژه را برای اعتبارسنجی پیوست‌های فرم دریافت می‌کند.
- `EventService.js`: ثبت رویداد در مسیر اصلی `POST /events`؛ پاسخ فرم قبل از ذخیره رویداد اعتبارسنجی می‌شود.

## پیوست‌ها و فایل‌های اطلاعاتی

- `AttachmentValidator.js`: allow-list MIME/پسوند برای JPEG/PNG/WebP/GIF، PDF، Word و Excel و بررسی حجم واقعی پس از decode؛ سقف سرور از `AppConfig.gs.js → FILES.MAX_SIZE_MB` (۱۰ مگابایت) خوانده می‌شود.
- `AttachmentService.js`: مجوز و مالکیت tenant/entity را بررسی می‌کند، فایل را از طریق `StorageRepository.js` به `GoogleDriveStorage.js` می‌فرستد و metadata را در شیت `15_Attachments` ثبت می‌کند.
- برای مقادیر اطلاعات پویا، `AttachmentType=INFORMATION` استفاده می‌شود. مقدار ذخیره‌شده فقط reference امن شامل `AttachmentID`, `FileName`, `MimeType`, `FileSize` است؛ backend metadata را از رکورد پیوست بازیابی می‌کند و ورودی کلاینت را مرجع نمی‌داند.
- `_scalar` و `_validate` در `ProjectInformationService.js` پیوست را با `TenantID`, `EntityType=PROJECT`, `EntityID`, `AttachmentType=INFORMATION`, وضعیت فعال و MIME مجاز تطبیق می‌دهند. برای نوع `image` فقط MIME تصویری پذیرفته می‌شود.
- APIهای موجود: `POST /projects/:projectId/attachments`, `GET /projects/:projectId/attachments`, `GET /attachments/:attachmentId/download`, `DELETE /attachments/:attachmentId`. مجوزهای `ATTACHMENT_UPLOAD` و `ATTACHMENT_VIEW` و دسترسی پروژه اعمال می‌شوند.
- فرم رویداد پروژه فایل را پیش از ایجاد رویداد به همان پروژه پیوست می‌کند؛ پاسخ فرم reference پیوست را ذخیره می‌کند. رویداد مستقل نمی‌تواند مقدار فایل/تصویر پروژه را ثبت کند.

## آزمون و استقرار

- آزمون‌های Node در `tests/*.test.js` با `node --test tests/*.test.js` اجرا می‌شوند.
- `backend-check.yml` آزمون‌ها و syntax همه فایل‌های JS را بررسی می‌کند.
- `sync-apps-script.yml` تغییرات بک‌اند را به Apps Script همگام و Web App را منتشر می‌کند؛ وضعیت workflow باید قبل از اعلام آماده‌بودن بررسی شود.

## مسیرهای کلیدی

- `Router.js`: API و کنترل مجوز.
- `ProjectInformationService.js`, `InformationTypeValidator.js`: اطلاعات پویا و اعتبارسنجی.
- `FormService.js`, `EventService.js`: پاسخ فرم و ثبت رویداد.
- `AttachmentService.js`, `AttachmentValidator.js`, `StorageRepository.js`, `GoogleDriveStorage.js`: ذخیره امن فایل.
- `DatabaseSetup.js`: شیت‌ها و سرستون‌ها.

## 2026-10-31 — چرخه عمر پیش‌نویس پروژه و همگام‌سازی پاسخ فرم

- `08_Projects.RecordState`: وضعیت چرخه عمر را مستقل از `Status` تجاری/قابل تنظیم کارخانه نگه می‌دارد؛ `DRAFT` برای ایجاد اولیه و `ACTIVE` برای پروژه تکمیل‌شده است. رکوردهای قدیمی بدون مقدار این ستون فعال تلقی می‌شوند.
- `POST /projects` همان مسیر ایجاد است و با `RecordState=DRAFT` فقط عنوان را می‌پذیرد؛ کد، گردش‌کار، مرحله، واحدها و کاربران تا زمان تکمیل خالی می‌مانند. payload کامل قبلی بدون تغییر رفتار، پروژه فعال می‌سازد.
- `PUT /projects/:id` همان مسیر تکمیل است؛ فقط پیش‌نویس می‌تواند یک‌بار به فعال تبدیل شود. هنگام تکمیل، یکتایی کد، گردش‌کار فعال و مرحله اول، واحدهای مجاز و سایر قواعد فعلی اعتبارسنجی می‌شوند؛ کد و گردش‌کار بعد از فعال‌شدن ثابت‌اند.
- `Router.js` برای کاربر دارای `PROJECT_CREATE`، فهرست را فقط به پیش‌نویس‌های ساخته‌شده توسط خودش محدود می‌کند و دریافت/تکمیل همان پیش‌نویس را مجاز می‌سازد. ثبت رویداد برای پیش‌نویس در `EventService.js` رد می‌شود.
- `FormService.saveEventResponses(event, responses, user, params)` snapshot پاسخ را در `34_EventFormData` حفظ می‌کند و مقدارهای غیرخالی فرم را با `SourceEventID` به `ProjectInformationService.save` می‌فرستد؛ مقدارهای خالی ناخواسته مقدار قبلی را پاک نمی‌کنند.
- `ProjectInformationService.save` ثبت دوباره همان مقدار با همان `SourceEventID` را idempotent می‌کند تا در retry، revision تکراری ایجاد نشود. مقدار جاری در `30_ProjectInformation` و تاریخچه تغییر در `31_ProjectInformationHistory` باقی می‌ماند.
- تست‌های رگرسیون در `tests/project-draft-information-flow.test.js` و به‌روزرسانی قرارداد `tests/forms-api-contract.test.js` اضافه شده‌اند. تغییرات در PR #78 نگهداری می‌شوند؛ تا زمان تأیید و انتشار staging، روی Apps Script تولید deploy نمی‌شوند.



## 2026-10-31 — تصمیم محصول: رویدادهای پیش از تکمیل پروژه

- EventService._createUnlocked_ در حال حاضر ثبت رویداد روی RecordState=DRAFT را رد می‌کند. این رفتار باید با گزینه tenant-scoped نوع رویداد AllowOnDraft (پیش‌فرض false) جایگزین شود؛ صرفاً رویدادهای PROJECT مجاز و دارای کنترل دسترسی کامل می‌توانند روی پیش‌نویس ثبت شوند.
- EventTypeService و EventTypeValidator مسئول اعتبارسنجی و ذخیره گزینه جدید روی 11_EventTypes خواهند بود؛ DatabaseSetup.js تغییر ستون را افزایشی انجام می‌دهد.
- FormService.saveEventResponses نقطه اتصال پاسخ فرم به اطلاعات جاری/تاریخچه است. برای فیلدهای اصلی پروژه باید نگاشت معنایی کنترل‌شده (مانند ProjectCode) افزوده شود؛ کد باید از اعتبارسنجی و یکتایی Tenant در سرویس پروژه عبور کند.
- تصویر نمایه باید به AttachmentID موجود در 15_Attachments و متعلق به همان پروژه اشاره کند؛ از کپی فایل یا اعتماد به metadata ارسالی کلاینت اجتناب شود. AttachmentService.listProjectImages باید با انتخاب صریح تصویر مورد استفاده در کارت یکپارچه شود.
- کارت پروژه باید فیلدهای نمایشی قابل تنظیم را از مقادیر جاری پرونده بخواند؛ snapshot رویداد، SourceEventID، تاریخچه، idempotency و tenant isolation حفظ شوند.
- ثبت رویداد نباید RecordState یا گردش‌کار را خودکار فعال/تغییر دهد. اجرای تغییرات و آزمون فقط در staging انجام می‌شود؛ انتشار تولید نیازمند تأیید جداگانه کاربر است.

 
## 2026-11-04 — انتقال امن تصاویر اطلاعات مرکزی در کپی پروژه

### محدوده و نتیجه
- مخزن: `Saeidesl/PRSPRO2BACKEND`، شاخه `main`؛ Frontend مرتبط: `Saeidesl/PRSPRO2`، شاخه `main`.
- وضعیت: قابلیت در محیط واقعی توسط کاربر آزمایش و موفقیت انتقال کامل تأیید شد.
- کپی تصویرها در همان جریان مرجع پروژه انجام می‌شود؛ فایل مقصد مستقل و دارای AttachmentID جدید است.

### نقشه Backend
- `ProjectService.js:create`: ساخت برنامه کپی `ReferenceCopyStatusJSON` برای انواع اطلاعات مرکزی و افزودن آیتم `__PROJECT_PROFILE_IMAGE__` در صورت وجود تصویر نمایه.
- `ProjectService.js:copyReferenceInformationType(projectId, typeId, params)`: پردازش مرحله‌ای آیتم‌های برنامه از مسیر API موجود؛ ثبت وضعیت، تاریخچه و SyncLog.
- `ProjectService.js:_copyReferenceImageValue_`: اعتبارسنجی AttachmentID مبدأ و جایگزینی آن با metadata پیوست مقصد.
- `ProjectService.js:_copyReferenceInformationImages_`: کپی فیلدهای تصویر در مقادیر تک‌مقداری/چندردیفی و حفظ سایر فیلدها.
- `AttachmentService.js:copyProjectImage(sourceAttachmentId, targetProjectId, user)`: بررسی tenant، دسترسی به هر دو پروژه، MIME تصویری و نوع پیوست؛ ایجاد رکورد پیوست مستقل مقصد و ثبت Audit.
- `GoogleDriveStorage.js:copyFile(storageKey, fileName)`: کپی native فایل Drive با `File.makeCopy`.
- `StorageRepository.js:copyFile`: facade برای کپی storage.
- `AttachmentRepository.js` و شیت `15_Attachments`: نگهداری metadata؛ ستون `SourceAttachmentID` برای idempotency و بازیابی پیوست مقصد در retry.
- `DatabaseSetup.js`: تعریف افزایشی ستون `SourceAttachmentID` در ساختار ATTACHMENTS.
- `Router.js`: مسیر موجود `POST /projects/:projectId/reference-copy/:typeId` و کنترل دسترسی حفظ شده است.

### Implementation Logs
- علت اولیه: انواع دارای image/file در مسیر کپی قدیمی به `SKIPPED_FILE` می‌رفتند.
- برنامه کپی اصلاح شد تا انواع دارای ستون تصویر حتی اگر ستون فایل غیرتصویری دیگری نیز داشته باشند قابل انتقال باشند؛ نوع‌های صرفاً فایل خارج از محدوده باقی می‌مانند.
- فایل‌های تصویر با کپی native در Drive مستقل می‌شوند و metadata مقصد به `EntityType=PROJECT` و `EntityID` پروژه کپی‌شده متصل می‌شود.
- شناسه‌های تصویر در `30_ProjectInformation.ValueJSON` با AttachmentID جدید مقصد جایگزین و تاریخچه در `31_ProjectInformationHistory` حفظ می‌شود.
- ستون `SourceAttachmentID` در `15_Attachments` برای جلوگیری از کپی تکراری هنگام retry به‌کار می‌رود.
- خطای runtime ناشی از ارجاع به متغیر تعریف‌نشده `hasFileFields` رفع شد؛ بررسی نحوی `ProjectService.js` موفق بود.
- Frontend امکان ارسال مجدد وضعیت قدیمی `SKIPPED_FILE` را اضافه کرد تا پروژه‌های قبلی قابل بازیابی باشند.
- پذیرش نهایی: کاربر در 2026-11-04 تأیید کرد کپی اطلاعات کامل و موفق انجام شده است.

### محدودیت اعتبارسنجی
- بررسی نحوی فایل Backend پس از اصلاح خطای runtime موفق بود.
- اجرای مستقل تمام تست‌های خودکار و E2E در این محیط انجام نشد؛ تست واقعی کاربر مبنای پذیرش نهایی است.

## 2026-11-05 — آرشیو فاز بازطراحی مرکز عملیات و ثبت رویدادها

### دامنه و تصمیم‌های نهایی
- بازطراحی تجربه ثبت رویدادها به‌عنوان مرکز عملیات واحد با سه مسیر «از پروژه»، «کارهای من» و «ثبت مستقل»؛ بدون ساخت موتور، API یا ذخیره‌سازی موازی.
- فرم پویا بر پایه Form Builder موجود؛ انتخاب دستی ثبت سریع/کامل بدون حذف داده؛ پنل اطلاعات مرتبط و تاریخچه؛ نمایش تفکیک‌شده نتیجه ثبت و عملیات وابسته؛ حفظ idempotency، مجوزها، Workflow و مسیر retry.
- رابط فارسی RTL، واکنش‌گرا و Mobile First؛ اطلاعات جانبی در دسکتاپ کنار فرم و در موبایل کشویی.

### نقشه فنی ثبت‌شده در زمان اجرا
### مخازن و شاخه
- Frontend: `Saeidesl/PRSPRO2`، شاخه `main`.
- Backend: `Saeidesl/PRSPRO2BACKEND`، شاخه `main`.
- Backend روی Google Apps Script V8 و Google Sheets است؛ Frontend با HTML/CSS/JavaScript.
- `TODO4.md` در هر دو مخزن workspace جاری این فاز است. `ARCHITECTURE.md` مرجع دائمی است و در این فاز فقط هنگام بستن فاز به‌روزرسانی می‌شود.

### Frontend — فایل‌ها و مسئولیت‌ها
- `pages/events.html`: صفحه فعلی ثبت رویداد و میزبان ساختار/نقاط ورود فعلی.
- `js/modules/events.js`: ماژول فعلی ثبت رویداد؛ بارگذاری زمینه، انواع رویداد، فرم پویا، ورودی‌های فیلد، ردیف‌های چندگانه، جمع‌آوری پاسخ‌ها، بارگذاری فایل فرم و ارسال ثبت.
- `css/event-context.css`: استایل پنل اطلاعات جانبی رویداد در دسکتاپ و موبایل؛ از `index.html` فرانت‌اند بارگذاری می‌شود. توابع `loadEventContext` و `toggleEventContextHistory` در `js/modules/events.js` داده‌ها را از APIهای موجود دریافت می‌کنند.
- `pages/project-detail.html`: صفحه جزئیات پروژه؛ دکمه موجود `project-add-event-button` نقطه ورود پروژه‌محور است. بخش‌های اطلاعات مرکزی، فرم‌های ثبت‌شده، آخرین رویدادها، تاریخچه مدیریتی و شناسنامه‌ها در همین صفحه وجود دارند.
- `js/modules/project-detail.js`: مدیریت صفحه جزئیات پروژه، بارگذاری bundle داده‌های پروژه شامل `events`, `eventData`, `eventFields`، تابع/جریان `loadProjectForms` و اتصال دکمه ثبت رویداد.
- `js/core/api.js`: لایه استاندارد درخواست‌ها؛ استفاده از `request/get/post/put/delete/getCached/getFresh/extractData/invalidate/invalidateMany` و حفظ مدیریت خطا/کش. درخواست مستقیم موازی ایجاد نشود.
- `js/core/router.js`: مسیریابی، بارگذاری ماژول و کنترل دسترسی سمت فرانت‌اند؛ کنترل آن جایگزین مجوز سرور نیست.
- `index.html`: محل بارگذاری اسکریپت‌ها و cache-busting نسخه ماژول‌ها.
- فایل‌های CSS مشترک و صفحه‌ای باید پیش از پیاده‌سازی از ساختار واقعی مخزن شناسایی شوند؛ فایل CSS موازی بدون نیاز معماری ساخته نشود.

### Backend — فایل‌ها و مسئولیت‌ها
- `Router.js`: نقطه مرکزی routeها، استخراج پارامترها و کنترل مجوز.
- `EventService.js`: سرویس اصلی ایجاد رویداد؛ کنترل زمینه پروژه/رویداد مستقل، مجوز و قواعد نوع رویداد، اعتبارسنجی پاسخ فرم، ثبت رویداد، snapshot، تغییر Workflow/وضعیت در صورت مجاز بودن، idempotency، Audit و اعلان‌ها.
- `EventTypeService.js`: مدیریت و نرمال‌سازی انواع رویداد و قواعد اتصال/حرکت پروژه.
- `FormService.js`: آماده‌سازی و اعتبارسنجی پاسخ فرم و نگهداری snapshot پاسخ‌های فرم متصل به رویداد؛ اتصال کنترل‌شده پاسخ‌های فرم به اطلاعات مرکزی پروژه.
- `EventDataService.js`: داده‌های تکمیلی/نمایشی رویداد؛ جزئیات دقیق متدهای قابل استفاده باید پیش از مصرف از کد جاری بازبینی شود.
- `ProcurementEventIntegrationService.js`: عملیات وابسته تأمین که از برخی رویدادها آغاز می‌شود.
- `ProjectInformationService.js`: اطلاعات جاری پروژه و تاریخچه آن؛ مقدار جاری و سابقه رویداد/فرم باید از هم تفکیک شوند.
- `DatabaseSetup.js`: تعریف شیت‌ها/ستون‌ها؛ در این فاز تغییر ساختار DB پیش‌فرض نیست و فقط در صورت اثبات نیاز و پس از بررسی سازگاری قابل طرح است.

### مسیرهای API و قراردادهای شناخته‌شده
- `POST /events` — ثبت رویداد اصلی؛ مجوز `EVENT_CREATE`؛ در Router به `EventService.create(body, params)` متصل است.
- Payload اصلی باید از قرارداد فعلی فرانت‌اند و `EventService` استخراج و حفظ شود؛ شامل شناسه نوع رویداد، زمینه پروژه در صورت PROJECT، داده‌های فرم/پاسخ‌ها و کلید idempotency طبق قرارداد فعلی. نام فیلدها یا قرارداد جدید حدس زده نشود.
- رویداد مستقل باید مطابق نوع رویداد `ConnectionType=INDEPENDENT` باشد و بدون ProjectID ثبت شود.
- `POST /event-types` — مدیریت نوع رویداد؛ مجوز `EVENT_TYPE_MANAGE`.
- `POST /forms` — ایجاد فرم؛ مجوز `SYSTEM_SETTINGS`.
- `POST /event-types/{id}/forms` — اتصال فرم به نوع رویداد؛ مجوز `EVENT_TYPE_MANAGE` یا `SYSTEM_SETTINGS`.
- `GET /event-types/{id}/forms` و مسیرهای مرتبط فهرست/دریافت اتصال فرم باید مطابق Router جاری مصرف شوند.
- `POST /events/{id}/procurement-retry` — تلاش مجدد عملیات تأمین؛ مجوز `EVENT_EDIT`.
- APIهای پروژه، Workflow، اطلاعات مرکزی و داشبورد در Router موجودند؛ پیش از استفاده از هر endpoint، route و payload دقیق از کد جاری تأیید شود.
- برای تمام endpointها مجوز سمت سرور، tenant scope و اعتبارسنجی فعلی حفظ شود.

### مدل دامنه و قیود
- نوع رویداد دارای تنظیماتی از جمله `ConnectionType`، `MovesProjectToStep`، `AllowAttachments`، `AllowVoid`، `TrackVariantQuantity`، `IsWorkCompletion`، `AllowOnDraft`، `IsFormAmendment`، `AmendableFormIDs`، `AllowedDepartmentIDs`، `AllowedUserIDs`، `AvailableDepartmentIDs`، `DepartmentID`، `WorkflowStepID`، `TargetDepartmentID`، `TargetProjectStatus` و `TargetStepStatus` است. انتخاب نوع رویداد باید این قواعد و مجوزهای واقعی را رعایت کند.
- `ConnectionType` مقادیر PROJECT و INDEPENDENT دارد؛ رویدادهای مستقل نباید به پروژه فرضی متصل شوند.
- فرم‌های قابل استفاده مجدد به نوع رویداد متصل می‌شوند؛ نسخه/snapshot فرم و پاسخ‌های قبلی باید حفظ شوند.
- اطلاعات جاری پروژه در `30_ProjectInformation` و تاریخچه در `31_ProjectInformationHistory` است.
- پاسخ فرم رویداد در شیت `34_EventFormData` نگهداری می‌شود؛ رویدادها در `13_Events` هستند.
- پیوست‌ها در Drive ذخیره و metadata در `15_Attachments` نگهداری می‌شود؛ مسیر فایل فعلی و محدودیت حجم/MIME باید حفظ شود.
- Idempotency، Audit، tenant isolation، کنترل دسترسی، قواعد Workflow و رفتار retry نباید تضعیف شوند.
- اطلاعات پنل جانبی باید از APIها و داده‌های موجود تأمین شود؛ منبع داده موازی یا ذخیره تکراری ایجاد نشود.

### جریان داده هدف
1. کاربر از یکی از سه نقطه ورود وارد می‌شود: پروژه، کارهای من یا ثبت مستقل.
2. Frontend زمینه و دسترسی را با APIهای موجود بارگذاری می‌کند.
3. فهرست نوع رویداد بر اساس زمینه، ConnectionType، Workflow، واحد و مجوز فیلتر می‌شود.
4. پس از انتخاب نوع رویداد، فرم متصل و تنظیمات لازم دریافت می‌شود.
5. فرم پویا و پنل جانبی فقط داده مرتبط را بارگذاری می‌کنند.
6. فایل‌ها طبق مسیر امن فعلی به پیوست موجود متصل می‌شوند؛ سپس پاسخ فرم و payload رویداد طبق قرارداد جاری به `POST /events` ارسال می‌شود.
7. Backend تمام اعتبارسنجی‌ها را انجام می‌دهد و EventService جریان اصلی ثبت را اجرا می‌کند.
8. نتیجه ذخیره رویداد و عملیات وابسته جداگانه به کاربر نشان داده می‌شود؛ retry فقط از endpoint/سرویس موجود انجام می‌شود.

### اصول پیاده‌سازی
- تجربه جدید باید روی سرویس‌ها و قراردادهای موجود سوار شود؛ `EventWorkspace` در صورت نیاز فقط ماژول orchestration/UI فرانت‌اند است، نه موتور ثبت یا API جدید.
- نام فایل/تابع/API جدید تا زمان بررسی کد واقعی قطعی نیست؛ قبل از هر تسک، فایل‌های مرتبط و این نقشه دوباره خوانده شوند.
- تغییرات Frontend و Backend هر تسک کلان باید یکپارچه تحویل شوند، مگر اینکه بررسی فنی ثابت کند یکی از دو سمت نیازی به تغییر ندارد.
- تست‌های موجود در هر دو مخزن اجرا و در کنار آن مسیر واقعی کاربر برای پذیرش اعلام شود.
- تا زمانی که کاربر نتیجه را در برنامه آزمایش و تأیید نکرده، تسک به‌عنوان تکمیل‌شده علامت نخورد.

### سوابق اجرای ماکروتسک‌ها
- [x] **Task 1 — کشف معماری، بررسی مسیر موجود و تثبیت طراحی محصول**
  - *Log:* هر دو مخزن در شاخه `main` بررسی شدند. `TODO4.md` در هر دو مخزن پیش از این فقط عبارت Ready for the next feature داشت. `ARCHITECTURE.md` فرانت‌اند و بک‌اند مطالعه شد. فایل‌های اصلی صفحه و ماژول رویداد، جزئیات پروژه، EventService، EventTypeService، FormService، Router و سرویس‌های وابسته بررسی شدند. سه معماری مقایسه و گزینه ترکیبی انتخاب شد. تصمیم‌های نهایی کاربر برای صفحه ترکیبی، پنل راست/کشویی، انتخاب دستی سریع/کامل و تاریخچه خلاصه با جزئیات درون‌صفحه تثبیت شد. هیچ فایل اجرایی تغییر نکرد.
- [x] **Task 2 — ساخت پوسته مرکز عملیات و سه مسیر ورود**
  - *Log:* پس از تأیید کاربر، Task 2 تکمیل شد. در Frontend فایل‌های `pages/events.html`، `js/modules/events.js` و `css/events.css` برای ساخت پوسته مرکز عملیات، سه مسیر ورود (از پروژه، کارهای من و ثبت مستقل)، انتخاب/جستجوی پروژه و فیلتر رویدادهای مستقل تغییر کردند؛ `index.html` نیز برای بارگذاری نسخه جدید دارایی‌ها و cache-busting به‌روزرسانی شد. مسیر ثبت موجود و API `POST /events` حفظ شد و هیچ موتور، API یا ذخیره‌سازی موازی ساخته نشد. در Backend تغییری لازم نبود و فایل اجرایی بک‌اند تغییر نکرد. انتشار GitHub Pages برای commit `424ed19809722b366732fbca6a30431d5130d66e` با موفقیت انجام شد و کاربر مشاهده تغییرات در برنامه را تأیید کرد.
  - ایجاد صفحه/ماژول یکپارچه مرکز عملیات با سه نقطه ورود پروژه، کارهای من و ثبت مستقل.
  - طراحی صفحه آغازین ترکیبی با پروژه‌های اخیر، جستجو و خلاصه وضعیت کارهای من.
  - اتصال ورودی پروژه از دکمه موجود صفحه جزئیات به محیط ثبت واحد؛ حفظ مسیر و API ثبت فعلی.
  - نمایش صف کارها فقط بر اساس داده و قواعد واقعی Workflow و دسترسی؛ جلوگیری از وظایف ساختگی.
  - نمایش ثبت مستقل فقط برای نوع‌های INDEPENDENT مجاز و بدون ProjectID.
- [x] **Task 3 — زمینه هوشمند و انتخاب نوع رویداد**
  - *Log:* پس از تست واقعی و تأیید کاربر، Task 3 تکمیل شد. در Frontend فایل‌های `js/modules/events.js` و `index.html` تغییر کردند: زمینه پروژه و Workflow با API موجود `GET /projects/{id}/workflow-progress` دریافت می‌شود؛ انواع رویداد بر اساس `ConnectionType`، مرحله و قواعد Workflow، مجوزهای کاربر، وضعیت پروژه و `AllowOnDraft` فیلتر و مرتب می‌شوند؛ گزینه‌های نامجاز همراه علت غیرفعال نمایش داده می‌شوند؛ وضعیت بارگذاری/خطا و تلاش مجدد مدیریت می‌شود؛ پاسخ‌های دیررس و زمینه قدیمی کنترل می‌شوند؛ و مسیر پروژه‌های پیش‌نویس و ثبت مستقل حفظ شده است. مجوز ثبت و دسترسی پروژه در رابط رعایت می‌شود. تست‌های مرتبط فرانت‌اند اجرا شدند و کاربر عملکرد نسخه منتشرشده را در برنامه تأیید کرد. در Backend تغییری لازم نبود و هیچ API، سرویس یا ساختار داده موازی ایجاد نشد. انتشار GitHub Pages برای commit `b90634eb047316c7a0416d737b645c03848a3032` موفق بود؛ مسیر انتشار تکراری نیز با commit `360bedbe3f863168c24f404bc6ac2ab9321f8975` حذف شد.
  - بارگذاری زمینه پروژه/مرحله/وضعیت/واحد و مجوزها با APIهای موجود.
  - فیلتر و اولویت‌بندی انواع رویداد بر اساس ConnectionType، Workflow، واحد، نقش و قواعد EventType.
  - مدیریت حالت‌های خالی، عدم دسترسی، پروژه پیش‌نویس و تغییر زمینه بدون باقی‌ماندن داده کهنه.
- [x] **Task 4 — بازطراحی فرم پویا و تجربه ثبت سریع/کامل**
  - *Log:* پس از تست واقعی و تأیید کاربر، Task 4 تکمیل شد. در Frontend فایل‌های `js/modules/events.js`، `css/events.css` و `index.html` تغییر کردند: انتخاب دستی حالت ثبت سریع/کامل اضافه شد؛ در حالت سریع فقط فیلدهایی که خود فیلد با `IsRequired` مشخص شده نمایش داده می‌شوند و اختیاری‌ها جمع می‌شوند؛ حالت کامل همه فیلدها را نشان می‌دهد؛ تغییر حالت مقدارهای واردشده را حفظ می‌کند؛ منطق نمایش شرطی با حالت ثبت ترکیب شده و پاسخ فیلدهای مخفی‌شده ناخواسته ارسال نمی‌شود؛ جدول‌های چندردیفی در موبایل به نمایش کارت‌محور نزدیک شدند. تست‌های `tests/reusable-forms.test.js` و `tests/workflow-management.test.js` برای منطق جدید و نسخه cache-busting به‌روزرسانی شدند. اصلاح خطای نمایش فیلدهای اختیاری و اصلاح expectation نسخه فایل‌ها نیز اعمال شد. نسخه Frontend روی GitHub Pages منتشر شد و کاربر نمایش صحیح فیلدهای سریع/کامل و حفظ اطلاعات هنگام جابه‌جایی را تأیید کرد. در Backend تغییری لازم نبود؛ موتور فرم، snapshot، اعتبارسنجی و API اصلی `POST /events` بدون تغییر باقی ماند.
  - اتصال فرم پویا به FormService و اتصال‌های فرم موجود؛ حفظ snapshot و validation.
  - ارائه ورودی حرفه‌ای برای فیلدهای تک‌مقداری، چندردیفی، شرطی، الزامی، تاریخ، توضیحات و فایل/تصویر.
  - افزودن انتخاب دستی سریع/کامل بدون حذف داده‌های واردشده و بدون دور زدن اعتبارسنجی.
  - ساده‌سازی افزودن/حذف ردیف‌ها و تجربه موبایل برای فرم‌های چندردیفی.
- [x] **Task 5 — پنل اطلاعات جانبی و تاریخچه مرتبط**
  - *Log:* پس از تست واقعی و تأیید کاربر، Task 5 تکمیل شد. در Frontend فایل‌های `js/modules/events.js`، `css/event-context.css` و `index.html` تغییر کردند: پنل اطلاعات جانبی در دسکتاپ کنار فرم و در موبایل به‌صورت کشویی نمایش داده می‌شود؛ تابع `loadEventContext(projectId, eventTypeId)` اطلاعات مرکزی مرتبط را از `GET /projects/{id}/information` می‌خواند و بر اساس InformationTypeهای متصل به فرم انتخاب‌شده محدود می‌کند؛ خلاصه پاسخ فرم‌های قبلی از `GET /events/{id}/forms` و رویدادهای اخیر از داده‌های رویداد موجود نمایش داده می‌شوند؛ تابع `toggleEventContextHistory(typeId, button)` تاریخچه را به‌صورت تدریجی از `GET /projects/{id}/information/{informationTypeId}/history` بارگذاری می‌کند و نسخه، نوع تغییر، زمان، شناسه کاربر ثبت‌کننده در صورت موجود بودن، دلیل و مقادیر قبلی/جدید را نشان می‌دهد. کنترل پاسخ‌های دیررس، حالت خالی/خطا و retry دریافت تاریخچه اضافه شد. ثبت مستقل پنل پروژه را نشان نمی‌دهد. فایل `tests/reusable-forms.test.js` آزمون رگرسیون پنل و APIهای مصرفی را اضافه کرد و نسخه دارایی‌ها در `index.html` به `20261105-event-context-panel-1` تغییر کرد. انتشار GitHub Pages برای commit `9606a7c6f5d5932f5b75b0a21c0f7d79a3604865` با موفقیت انجام شد و کاربر عملکرد پنل را تأیید کرد. در Backend هیچ فایل اجرایی، API، شیت یا ساختار داده‌ای تغییر نکرد؛ همه داده‌ها از routeها و سرویس‌های موجود خوانده می‌شوند. تست اختصاصی پنل و Frontend Agent Suite موفق بودند؛ CI کلی همچنان چند failure قبلی و نامرتبط در تست‌های پروژه/اطلاعات مرکزی و تست‌های بک‌اند دارد که به این تسک نسبت داده نشده‌اند.
  - پنل راست در دسکتاپ و کشویی در موبایل با اطلاعات مرتبط با نوع رویداد.
  - نمایش اطلاعات مرکزی جاری، پاسخ‌های فرم مرتبط و رویدادهای قبلی بدون مخلوط کردن مقدار جاری و snapshot تاریخی.
  - نمایش منبع مقدار، ثبت‌کننده، تاریخ و جزئیات سابقه با تعامل باز/بسته‌شونده.
  - بارگذاری تدریجی و جلوگیری از دریافت غیرضروری تمام اطلاعات پروژه.
- [x] **Task 6 — تکمیل جریان ثبت، نتیجه عملیات و بازیابی خطا**
  - *Log:* کاربر اجرای واقعی ثبت رویداد دارای فرم و نمایش پنل نتیجه پنج‌گانه را تأیید کرد. Backend: `EventService.js`, `FormService.js`, `Router.js` و `tests/forms-api-contract.test.js` برای بازگرداندن نتیجه ذخیره فرم/اطلاعات مرکزی، idempotency replay و مجوز retry موجود اصلاح شدند. Frontend مخزن مرتبط: `js/modules/events.js`, `css/events.css`, `index.html` و تست‌های `tests/reusable-forms.test.js`, `tests/workflow-management.test.js` برای نمایش نتیجه، خطا و retry از API موجود تغییر کردند. بررسی syntax انجام شد؛ CI کامل و تست زنده شکست تأمین تأیید نشده است. API و ذخیره‌سازی موازی ایجاد نشد.
  - ارسال payload سازگار با قرارداد `POST /events` و حفظ Idempotency و کنترل‌های سرور.
  - نمایش تفکیک‌شده نتیجه ثبت رویداد، پاسخ فرم، اطلاعات مرکزی، Workflow و عملیات تأمین.
  - مدیریت خطاهای جزئی بدون اعلام موفقیت کامل؛ اتصال retry تأمین به مسیر موجود.
  - جلوگیری از ارسال تکراری، کلیک چندباره و از دست رفتن اطلاعات فرم هنگام خطا.
- [x] **Task 7 — بهینه‌سازی عملکرد، واکنش‌گرایی و آزمون پذیرش**
  - *Log:* کاربر تست نهایی یکپارچه را تأیید کرد. در Backend، منطق سرویس‌های رویداد و API جدیدی برای این Task لازم نبود؛ قراردادهای موجود حفظ شدند. تست‌های `tests/event-idempotency.test.js` برای stub کردن FormRepository در harness، `tests/information-type-foundation.test.js` برای تطبیق assertion وضعیت فعال، و `tests/project-repeat-reference-copy.test.js` برای تطبیق assertions با منطق واقعی کپی مرجع اصلاح شدند. Backend Source Checks و PMS Agent Suite در اجرای نهایی commit `51b0654fe993362b6c48c13b58101bd6c5c526b0` موفق شدند. هیچ Sheet یا مسیر ذخیره‌سازی موازی ایجاد نشد.
  - بهینه‌سازی بارگذاری، کش داده مشترک، درخواست‌های تکراری و پاسخ‌های دیررس.
  - تکمیل UI موبایل، RTL، تم روشن/تیره، دسترس‌پذیری و حالت‌های loading/empty/error.
  - اجرای تست‌های فرانت‌اند و بک‌اند، بررسی قرارداد API و رگرسیون مسیرهای موجود.
  - حفظ مسیر قبلی تا تأیید نهایی؛ تحویل برای تست واقعی کاربر و ثبت نتیجه پذیرش.

### وضعیت پذیرش و بستن فاز
- هر ۷ ماکروتسک پس از تست و تأیید کاربر تکمیل شد.
- در Frontend: بهینه‌سازی تجمیع صف پروژه‌ها و lookup تاریخچه، دسترس‌پذیری صفحه‌کلید تب‌ها، پنل نتیجه و retry، تست‌های رگرسیون و cache-busting انجام شد.
- در Backend: قرارداد نتیجه ثبت فرم/اطلاعات مرکزی و idempotency replay، مجوز retry و اصلاح harness/assertion تست‌ها ثبت شد؛ برای Task 7 API یا منطق اجرایی جدیدی لازم نبود.
- هیچ Sheet، مسیر ثبت، API یا موتور ذخیره‌سازی موازی ایجاد نشد.
- تست‌های واقعی کاربر برای Taskهای تحویلی تأیید شد. محدودیت‌های تستی که در Logهای هر Task ذکر شده‌اند، به‌عنوان محدودیت تاریخی حفظ شده‌اند.


## 2026-11-05 — انتقال فایل‌ها و تصاویر پروژه به پوشه اختصاصی Google Drive

### محدوده و نتیجه پذیرش
- مخزن عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `main`.
- پوشه مقصد فایل‌های جدید و کپی‌شده: `1E-nYv5GF8wPn9diOZlfiGXnWQH-2WSmB`.
- نتیجه تست واقعی کاربر: موفق؛ ذخیره تصویر پروژه، فایل ضمیمه پروژه و فایل پیوست‌شده از مسیر ثبت رویداد در پوشه مقصد تأیید شد. نمایش و دانلود فایل‌ها در PMS و باقی‌ماندن فایل‌های قدیمی در محل قبلی نیز تأیید شد.
- فایل‌های قدیمی جابه‌جا یا حذف نشدند؛ هیچ عملیات مهاجرت داده انجام نشد.

### پیاده‌سازی و جریان داده
- `AppConfig.gs.js`: مقدار `AppConfig.FILES.GOOGLE_DRIVE_FOLDER_ID` برابر شناسه پوشه مقصد تنظیم شد.
- `GoogleDriveStorage.js:getRootFolder_()`: از تنظیم موجود برای انتخاب پوشه استفاده می‌کند؛ منطق ذخیره‌سازی موجود بدون ایجاد مسیر موازی حفظ شد.
- `GoogleDriveStorage.js:uploadBase64()`: فایل جدید را با `folder.createFile(blob)` در پوشه مقصد می‌سازد.
- `GoogleDriveStorage.js:copyFile()`: فایل مرجع را با `source.makeCopy(name, folder)` در همان پوشه کپی می‌کند.
- `StorageRepository.js`، `AttachmentService.js`، `AttachmentRepository.js` و `Router.js` از نظر قرارداد و منطق اجرایی تغییر نکردند.
- metadata همچنان در شیت `15_Attachments` ذخیره می‌شود و `StorageKey` همچنان Drive file ID است.
- APIهای موجود حفظ شدند: `POST /projects/:projectId/attachments`، `GET /projects/:projectId/attachments`، `GET /attachments/:attachmentId/download` و `DELETE /attachments/:attachmentId`.
- مسیرهای فرم پویا و رویداد نیز از همان AttachmentService و APIهای موجود استفاده می‌کنند.

### آزمون و انتشار
- پنج تست اختصاصی `tests/google-drive-storage-folder.test.js` موفق شدند: انتخاب پوشه تنظیم‌شده، آپلود در مقصد، کپی در مقصد، عدم fallback هنگام خطای دسترسی و تطبیق شناسه پیکربندی.
- CI عمومی Backend در مجموع ۱۶۴ از ۱۶۸ تست را گذراند؛ چهار شکست baseline از قبل موجود و مستقل از این تغییر بودند: سه تست invalidation کش GoogleSheetsRepository و assertion مربوط به استقرار خودکار Apps Script. این موارد در سوابق CI حفظ شده‌اند.
- تغییرات Backend با merge commit `1e1504ed5799118568931d58bfab1e96dd5b4648` وارد `main` شد.
- GitHub Actions Run #14 با شناسه `42079115129` روی همین commit با موفقیت کامل Push و Deploy به Google Apps Script را انجام داد.
- تست زنده و پذیرش نهایی کاربر پس از انتشار موفق بود. انتشار GitHub و Deploy به‌عنوان دو مرحله مجزا ثبت شده‌اند.


## 2026-11-05 — فاز Integration QA & Regression (آرشیو نهایی)

### هدف و دامنه
- اجرای آزمون یکپارچگی و رگرسیون روی مخازن عملیاتی پس از قابلیت رویدادهای تکرارپذیر؛ اصلاح شکست‌های CI و قراردادهای تست بدون تغییر غیرضروری در منطق عملیاتی.
- هیچ محیط Staging ایجاد یا پیکربندی نشد؛ آزمون متصل به API Staging با وضعیت `blocked-no-staging-api` محدودیت محیطی محسوب شد و به‌عنوان آزمون موفق API گزارش نمی‌شود. این محدودیت با تأیید مالک محصول پذیرفته شد.
- هیچ داده عملیاتی، Sheet یا Workflow عملیاتی برای این فاز حذف یا مهاجرت داده نشد.

### Backend — اصلاحات و اعتبارسنجی
- مخزن: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه کاری `qa/integration-regression-20261105`، مقصد ادغام `main`.
- فایل `tests/google-sheets-cache-invalidation.test.js`: resolver آزمایشی دیتابیس به mock تست اضافه شد تا وابستگی global در harness فراهم باشد.
- فایل `tests/schema-contract.test.js`: assertion قرارداد انتشار با سیاست انتشار دستی Apps Script از طریق `workflow_dispatch` و تأیید صریح هماهنگ شد.
- اعتبارسنجی ثبت‌شده: 172/172 تست Backend، 14/14 تست Procurement diagnostics و PMS agent suite موفق؛ Backend source checks و Domain Contract و QA/Release Safety نیز موفق.
- آخرین اجرای ثبت‌شده: Backend source checks run `42094313650`؛ Procurement diagnostics run `42094313813`؛ PMS agent suite run `42094313608`.
- PR شماره #3 با عنوان `[QA] Fix backend integration test harness and deployment contract` در `main` ادغام شد؛ Merge Commit: `bd41b665e822714c7c95d6294e77cce23ad5ff2c`.

### Frontend — اصلاحات و اعتبارسنجی
- مخزن: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه کاری `qa/integration-regression-20261105`، مقصد ادغام `main`.
- فایل `.github/workflows/pms-ui-performance-audit.yml`: نسخه Playwright به نسخه منتشرشده و پایدار `1.64.1` pin شد تا نصب وابستگی به نسخه شناور/منتشرنشده وابسته نباشد.
- Frontend Checks، Cross-repository QA، Browser Audit و accessibility/keyboard tests موفق شدند.
- خروجی UI inventory: `failedRoutes=0`، `procurementApiFailedRequests=0`، `failedNetworkRequests=0`، `consoleErrors=0`، `pageErrors=0`، `failedSafeButtonChecks=0`.
- Browser Audit run `42094111595` و artifact `13445104867` وضعیت `blocked-no-staging-api` داشت؛ این وضعیت به‌عنوان محدودیت محیطی ثبت شده است، نه قبولی آزمون متصل به API.
- PR شماره #2 با عنوان `[QA] Pin published Playwright version for browser audit` در `main` ادغام شد؛ Merge Commit: `da2d8d89859f0c6fbf11529e23f120849c185abe`.

### سازگاری، ادغام و انتشار
- هر دو PR پس از کنترل شاخه مقصد `main`، قابل ادغام بودن و SHA شاخه مبدأ، با روش merge عادی و بدون force-push ادغام شدند.
- Backend PR #3: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION/pull/3
- Frontend PR #2: https://github.com/Saeidesl/PRSPRO2-PRODUCTION/pull/2
- مقایسه پس از ادغام نشان داد تغییر محتوایی QA از شاخه مبدأ نسبت به `main` باقی نمانده است؛ اختلاف یک commit ناشی از ثبت merge commit است.
- این فاز صرفاً تغییرات و تست‌های QA را ادغام کرد. هیچ Backend deploy یا Frontend deploy جدیدی در نتیجه این ادغام انجام نشد و Live verification جدیدی ادعا نمی‌شود.
- سیاست انتشار همچنان دستی و منوط به تأیید صریح است.

### نتیجه پذیرش و بستن فاز
- Task 1 — Discovery & Planning: تکمیل شد.
- Task 2 — اصلاح CI و تست‌های Backend: تکمیل شد.
- Task 3 — اصلاح وابستگی Browser Audit و آزمون‌های Frontend/Regression: تکمیل شد.
- مالک محصول دامنه QA و محدودیت نبود Staging را پذیرفت و سپس ادغام هر دو PR را صریحاً درخواست کرد.
- فاز در تاریخ 2026-11-05 بسته شد. برای فاز بعدی، `TODO5.md` در هر دو مخزن به عبارت `Ready for the next feature` بازنشانی شد.

### اجزای Backend و داده
- تغییرات اجرایی Backend انجام نشد؛ فقط harness و قرارداد تست در دو فایل تست ذکرشده اصلاح شدند. APIها، Router، EventService، شیت‌ها و داده عملیاتی تغییر نکردند.


## 2026-11-05 — فاز Integration QA & Regression (آرشیو نهایی)

### هدف و دامنه
- اجرای آزمون یکپارچگی و رگرسیون روی مخازن عملیاتی پس از قابلیت رویدادهای تکرارپذیر؛ اصلاح شکست‌های CI و قراردادهای تست بدون تغییر غیرضروری در منطق عملیاتی.
- هیچ محیط Staging ایجاد یا پیکربندی نشد؛ آزمون متصل به API Staging با وضعیت `blocked-no-staging-api` محدودیت محیطی محسوب شد و به‌عنوان آزمون موفق API گزارش نمی‌شود. این محدودیت با تأیید مالک محصول پذیرفته شد.
- هیچ داده عملیاتی، Sheet یا Workflow عملیاتی برای این فاز حذف یا مهاجرت داده نشد.

### Backend — اصلاحات و اعتبارسنجی
- مخزن: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه کاری `qa/integration-regression-20261105`، مقصد ادغام `main`.
- فایل `tests/google-sheets-cache-invalidation.test.js`: resolver آزمایشی دیتابیس به mock تست اضافه شد تا وابستگی global در harness فراهم باشد.
- فایل `tests/schema-contract.test.js`: assertion قرارداد انتشار با سیاست انتشار دستی Apps Script از طریق `workflow_dispatch` و تأیید صریح هماهنگ شد.
- اعتبارسنجی ثبت‌شده: 172/172 تست Backend، 14/14 تست Procurement diagnostics و PMS agent suite موفق؛ Backend source checks و Domain Contract و QA/Release Safety نیز موفق.
- آخرین اجرای ثبت‌شده: Backend source checks run `42094313650`؛ Procurement diagnostics run `42094313813`؛ PMS agent suite run `42094313608`.
- PR شماره #3 با عنوان `[QA] Fix backend integration test harness and deployment contract` در `main` ادغام شد؛ Merge Commit: `bd41b665e822714c7c95d6294e77cce23ad5ff2c`.

### Frontend — اصلاحات و اعتبارسنجی
- مخزن: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه کاری `qa/integration-regression-20261105`، مقصد ادغام `main`.
- فایل `.github/workflows/pms-ui-performance-audit.yml`: نسخه Playwright به نسخه منتشرشده و پایدار `1.64.1` pin شد تا نصب وابستگی به نسخه شناور/منتشرنشده وابسته نباشد.
- Frontend Checks، Cross-repository QA، Browser Audit و accessibility/keyboard tests موفق شدند.
- خروجی UI inventory: `failedRoutes=0`، `procurementApiFailedRequests=0`، `failedNetworkRequests=0`، `consoleErrors=0`، `pageErrors=0`، `failedSafeButtonChecks=0`.
- Browser Audit run `42094111595` و artifact `13445104867` وضعیت `blocked-no-staging-api` داشت؛ این وضعیت به‌عنوان محدودیت محیطی ثبت شده است، نه قبولی آزمون متصل به API.
- PR شماره #2 با عنوان `[QA] Pin published Playwright version for browser audit` در `main` ادغام شد؛ Merge Commit: `da2d8d89859f0c6fbf11529e23f120849c185abe`.

### سازگاری، ادغام و انتشار
- هر دو PR پس از کنترل شاخه مقصد `main`، قابل ادغام بودن و SHA شاخه مبدأ، با روش merge عادی و بدون force-push ادغام شدند.
- Backend PR #3: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION/pull/3
- Frontend PR #2: https://github.com/Saeidesl/PRSPRO2-PRODUCTION/pull/2
- پس از ادغام، مقایسه شاخه کاری و `main` نشان داد تغییر محتوایی QA باقی نمانده است؛ اختلاف یک commit ناشی از ثبت merge commit است.
- این فاز صرفاً تغییرات و تست‌های QA را ادغام کرد. هیچ Backend deploy یا Frontend deploy جدیدی در نتیجه این ادغام انجام نشد و Live verification جدیدی ادعا نمی‌شود.
- سیاست انتشار همچنان دستی و منوط به تأیید صریح است.

### نتیجه پذیرش و بستن فاز
- Task 1 — Discovery & Planning: تکمیل شد.
- Task 2 — اصلاح CI و تست‌های Backend: تکمیل شد.
- Task 3 — اصلاح وابستگی Browser Audit و آزمون‌های Frontend/Regression: تکمیل شد.
- مالک محصول دامنه QA و محدودیت نبود Staging را پذیرفت و سپس ادغام هر دو PR را صریحاً درخواست کرد.
- فاز در تاریخ 2026-11-05 بسته شد. برای فاز بعدی، `TODO5.md` در هر دو مخزن به عبارت `Ready for the next feature` بازنشانی شد.

### اجزای Backend و داده
- تغییرات اجرایی Backend انجام نشد؛ فقط harness و قرارداد تست در `tests/google-sheets-cache-invalidation.test.js` و `tests/schema-contract.test.js` اصلاح شدند. APIها، Router، EventService، شیت‌ها و داده عملیاتی تغییر نکردند.


## 2026-11-06 — فاز ارتقای کارت پروژه‌ها و سوابق رویدادها (نسخه عملیاتی)

### محدوده و نتیجه
- مخازن: `Saeidesl/PRSPRO2BACKEND-PRODUCTION` و `Saeidesl/PRSPRO2-PRODUCTION`، شاخه عملیاتی `main`.
- وضعیت: هر چهار Macro-Task فاز تکمیل و تست دستی مالک محصول تأیید شد.
- تغییر اجرایی Backend در این فاز لازم نبود؛ هیچ endpoint، Sheet، schema، permission یا سرویس Backend تغییر نکرد.

### معماری و قراردادهای تأییدشده
- `Router.js`: مسیر `GET /events` با مجوز `EVENT_VIEW` به `EventService.list(params)` متصل است.
- `EventService.js`: محدودسازی tenant و پروژه‌های قابل مشاهده و enrichment رویدادها حفظ می‌شود.
- `EventRepository.js`: منبع رویدادها شیت `13_Events` با فیلدهای `CreatedBy`, `PerformedBy`, `DepartmentID`, `EventTypeID`, `ProjectID`, `OccurredAt`, `CreatedAt`, `Status` است.
- `AttachmentService.js` و `AttachmentRepository.js`: metadata پیوست‌ها در `15_Attachments`؛ تصاویر پروفایل پروژه با `EntityType=PROJECT` و `AttachmentType=PROFILE` از مسیرهای موجود خوانده می‌شوند.
- APIهای موجود و مورد استفاده: `GET /events`، `GET /project-card-images` و `GET /attachments/:attachmentId/download`.
- `CreatedBy` معیار ثبت‌کننده و `PerformedBy` انجام‌دهنده است. تاریخ ثبت `CreatedAt` از تاریخ وقوع `OccurredAt` مستقل است. فیلتر Frontend هرگز جایگزین مجوز و tenant isolation سمت Backend نیست.

### تصمیم معماری
- قابلیت‌های کارت پروژه، فیلتر و مرتب‌سازی با reuse مسیرها، APIها و ساختار داده موجود در Frontend اجرا شدند.
- هیچ مسیر ثبت رویداد، endpoint یا Sheet موازی ساخته نشد.
- چون تغییری در کد اجرایی Backend ایجاد نشد، deployment بک‌اند برای این فاز لازم نبود.

### سوابق پذیرش
- Task 1: Discovery مسیرهای رویداد و پیوست و قراردادهای دسترسی تکمیل شد.
- Task 2: نمایش تصویر PROFILE و آخرین رویداد معتبر هر پروژه روی کارت‌های صف مرکز عملیات؛ انتخاب آخرین رویداد غیر VOID با اولویت `CreatedAt` و fallback به `OccurredAt`. تست دستی کاربر موفق.
- Task 3: پیش‌فرض سوابق بر اساس `CreatedBy` کاربر جاری، دامنه «رویدادهای من/همه رویدادهای مجاز» و فیلترهای ترکیبی؛ اصلاح مسیر پایه Router در Frontend برای بارگذاری صفحه عملیاتی. تست دستی کاربر موفق.
- Task 4: مرتب‌سازی سوابق با `CreatedAt` از جدید به قدیم و برعکس؛ حفظ ترتیب هنگام تغییر و پاک‌سازی فیلترها. ۱۳۵ تست Frontend و workflowهای QA/agent/UI audit موفق؛ تست دستی کاربر موفق.
- PRهای مهم Frontend: #4، #7 و #9 ادغام شدند. commit نهایی Task 4: `57f2605d6f25b021a099528dcbc287131555cb3a`.
- انتشار GitHub Pages پس از ادغام PR #9 در سوابق موجود مستقلاً تأیید نشده است؛ با این حال مالک محصول عملکرد مرتب‌سازی را در نسخه مورد استفاده با موفقیت تست کرده است.


## 2026-11-06 — فاز بهینه‌سازی سرعت و تجربه بارگذاری صفحه ثبت و پیگیری رویدادها (آرشیو نهایی)

### هدف و دامنه
- بهبود سرعت ادراک‌شده و کاهش رندرهای تکراری در صفحه رویدادها، نمایش Skeleton متناسب با محتوای واقعی و یکپارچه‌سازی تجربه پیش‌نمایش تصاویر کارت پروژه‌ها.
- مخازن عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION` و `Saeidesl/PRSPRO2BACKEND-PRODUCTION`.
- شاخه‌های کاری نهایی Task 8: `feature/events-project-image-experience-20261106` در هر دو مخزن؛ مقصد ادغام Frontend: `main`.
- هر هشت Macro-Task این فاز پس از پذیرش دستی مالک محصول تکمیل شدند. فاز در 2026-11-06 به درخواست مالک محصول بسته شد.

### Frontend — پیاده‌سازی و جریان داده
- `js/modules/events.js`: callbackهای refresh سه منبع `/events`، `/projects` و `/event-types` با `Events.scheduleRefreshRender()` و debounce چهل میلی‌ثانیه‌ای تجمیع شدند. رندر نهایی Promise.all فقط در صورت دریافت نتیجه تازه اجرا می‌شود؛ نمایش فوری cache و حفظ فیلترها برقرار ماند.
- `pages/events.html` و `css/events.css`: Skeleton صف‌های سه‌گانه، پروژه‌های اخیر و جدول تاریخچه با RTL، responsive، تم‌ها و reduced-motion تکمیل شد؛ وضعیت cache، خطا و محتوای واقعی مدیریت می‌شود.
- `js/modules/events.js`: کلیک و دسترسی صفحه‌کلید تصاویر کارت رویداد به `PMS.Modules.Projects.openProjectImage()` متصل شد و مسیر موازی `openQueueProjectImage` و کنترل زوم مستقل حذف شدند.
- `css/events.css`: placeholder، حالت loading، نمایش تصویر، hover/focus و `prefers-reduced-motion` هماهنگ شد.
- `index.html`: نسخه asset به `20261106-events-project-image-1` تغییر یافت.
- تست‌های مرتبط: `tests/event-queue-project-cards.test.js` و `tests/workflow-management.test.js`.
- رفتار lazy loading، cache تصاویر PROFILE، مجوز `ATTACHMENT_VIEW`، صف‌ها، ثبت رویداد و fallbackهای تصویر حفظ شدند.

### Backend و Database — قراردادهای حفظ‌شده
- هیچ کد اجرایی Backend، API، permission، Sheet، schema یا داده عملیاتی در Taskهای 6 تا 8 تغییر نکرد.
- قراردادهای موجود `GET /events`، `GET /project-card-images` و `GET /attachments/:attachmentId/download` و شیت‌های `13_Events` و `15_Attachments` بدون تغییر باقی ماندند.
- هیچ مسیر موازی ثبت رویداد یا ذخیره‌سازی تصویر ایجاد نشد.

### اعتبارسنجی و پذیرش
- Task 6: کاربر نمایش فوری cache، refresh پس‌زمینه، حفظ فیلترها و نبود پرش محسوس را تأیید کرد. baseline عددی runtime در دسترس نبود؛ بنابراین بهبود عددی ادعا نمی‌شود.
- Task 7: CIهای مربوط به Frontend و Cross-repository QA موفق و تست دستی Skeleton توسط کاربر تأیید شد.
- Task 8: Frontend checks run #113، Frontend agent suite #75 و Cross-repository QA #95 موفق شدند. مراحل مرورگر واقعی و keyboard، UI inventory و بارگذاری گزارش audit موفق بودند؛ اما workflow جامع UI performance audit #95 در پایان cancelled شد و موفقیت کامل آن ادعا نمی‌شود. تست دستی نمایش تصویر، بستن با Escape/دکمه و موبایل توسط کاربر تأیید شد.
- Frontend PR #17 پیش‌تر ادغام شد. Frontend PR #18 با merge عادی در `main` ادغام شد؛ Merge Commit: `6609ab75b725a8038913f4f8ce44467c39f6dac6`.
- Backend در این فاز PR اجرایی یا تغییر کد نداشت؛ صرفاً مستندات فاز در ARCHITECTURE ثبت شد.
- ادغام GitHub به‌معنای انتشار نیست. در زمان بستن فاز، Backend deployment جدید و تأیید مستقل انتشار GitHub Pages/live verification برای این فاز ثبت نشده است.

### نتیجه
- Taskهای 1 تا 8 پذیرفته و تکمیل شدند.
- TODO5.md در هر دو مخزن برای فاز بعدی به `Ready for the next feature` بازنشانی شد.
- هیچ کار ناتمام این فاز به‌عنوان تکمیل‌شده یا منتشرشده گزارش نشده است.


## فاز تکمیل‌شده: پنل اطلاعات کمکی و تقویم شمسی با انتخاب ساعت (2026-11-06)

### محدوده و تصمیم معماری
- اسکرول مستقل پنل اطلاعات کمکی، هماهنگی تقویم شمسی با تم روشن/تاریک و انتخاب ساعت/دقیقه در ورودی‌های datetime-local در Frontend تکمیل و توسط مالک محصول پذیرفته شد.
- قراردادهای Backend شامل `POST /events`، `EventService.js` و ستون `13_Events.OccurredAt` بدون تغییر باقی ماندند؛ هیچ تغییر runtime، API، permission، Sheet یا schema لازم نبود.
- مقدار محلی datetime با قالب `YYYY-MM-DDTHH:mm` و رفتار date-only حفظ شد.

### نتیجه و اعتبارسنجی
- Frontend PR #19 و PRهای #20 تا #24 و #26 در main ادغام شدند؛ SHA ادغام نهایی #26 برابر `7e09cd3c16b75b01d04132dcf836a6fbfea770b9` است.
- تست‌های مرورگر Chromium، Frontend checks، agent suite، cross-repository QA و comprehensive UI performance audit موفق شدند.
- انتشار اختصاصی GitHub Pages در Run `42134933236` موفق بود و مالک محصول تست نهایی را در 2026-11-06 تأیید کرد.
- Backend runtime و داده‌های عملیاتی تغییر نکردند. فاز با پذیرش تمام Macro-Taskها بسته شد.


## ثبت فاز تکمیل‌شده Frontend: بازگشت انتخاب‌گر نوع رویداد (2026-11-06)

- تصمیم مالک محصول این بود که انتخاب‌گر سفارشی معرفی‌شده در Frontend PR #33 پذیرفته نشود و رابط انتخاب نوع رویداد به select/native picker قبلی بازگردد.
- بازگشت در Frontend PR #34 با merge commit `e7bab337c8e68b88f7286859e9309146bac44e0a` انجام شد؛ کنترل‌های Frontend و cross-repository QA موفق شدند.
- قابلیت انتظار گردش‌کار و انیمیشن مشترک حفظ شد. قرارداد `POST /events` و `EventTypeID` تغییری نکردند.
- هیچ فایل اجرایی Backend، endpoint، permission، Google Sheet، schema یا داده عملیاتی در این فاز تغییر نکرد؛ نیازی به انتشار Backend نبود.
- انتشار GitHub Pages در workflow run `42262303293` با نتیجه success تکمیل و تست نسخه منتشرشده توسط مالک محصول در 2026-11-06 تأیید شد.
- فاز از منظر Backend صرفاً ثبت معماری و سازگاری بود و بسته شد.


## ثبت فاز تکمیل‌شده Frontend: بازگردانی رابط انتخاب نوع رویداد (2026-11-06)
- انتخاب‌گر سفارشی Frontend به درخواست مالک محصول پذیرفته نشد و رابط قبلی در Frontend PR #34 بازیابی شد؛ Merge Commit: `e7bab337c8e68b88f7286859e9309146bac44e0a`.
- قرارداد `POST /events` و `EventTypeID` بدون تغییر ماندند. هیچ فایل اجرایی Backend، endpoint، permission، Google Sheet، schema یا داده عملیاتی تغییر نکرد.
- تست‌های CI و QA مربوط به PR #34 موفق شدند. انتشار GitHub Pages در run `42262303293` موفق و نسخه منتشرشده توسط مالک محصول تأیید شد.
- از سمت Backend هیچ انتشار یا مهاجرتی لازم نبود؛ این فاز بسته شد.


## فاز تکمیل‌شده: بهینه‌سازی سرعت فرم ثبت رویدادها (2026-11-07)

مستندات این فاز از TODO5.md عملیاتی به این سند منتقل شده است. متن زیر شامل هدف، نقشه معماری کشف‌شده، اصول سازگاری، برنامه تسک‌ها و گزارش کامل اجرای هر چهار تسک است؛ سوابق قبلی ARCHITECTURE بدون حذف حفظ شده‌اند.

## 🎯 Current Objective

افزایش سرعت بارگذاری و نمایش اطلاعات در فرم اصلی ثبت رویدادها، با حفظ مسیرهای موجود، سازگاری Frontend/Backend، صحت داده‌ها، کنترل دسترسی و رفتار فعلی ثبت رویداد.

هدف فاز: کاهش زمان آماده‌شدن فرم از لحظه بازشدن تا آماده‌شدن انتخاب پروژه، انواع رویداد، فرم‌های متصل و اطلاعات وابسته؛ حذف درخواست‌ها و پردازش‌های تکراری؛ و اندازه‌گیری عددی قبل و بعد از بهینه‌سازی.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی

- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `main`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `main`.
- آخرین وضعیت مبنای آغاز فاز در 2026-11-06:
  - Backend HEAD: `e91fde875b330d47ec4dfc3d663472051002c37f`
  - Frontend HEAD: `083d858401ebd7e7068e3ec4871041b6aecc34e9`
- هر دو مخزن قابل دسترسی و دارای مجوز push هستند؛ شاخه پیش‌فرض هر دو `main` و در زمان بررسی protected=false بود.
- این فاز فقط در همین دو مخزن عملیاتی انجام می‌شود. شاخه محافظت‌شده، مخزن توسعه یا محیط عملیاتی داده‌ها نباید بدون مجوز صریح تغییر کند.

### Frontend — صفحه و جریان فرم ثبت رویداد

- `pages/events.html`: میزبان صفحه رویدادها و نقطه ورود به فرم ثبت رویداد.
- `js/modules/events.js`: ماژول اصلی صفحه و فرم.
  - `Events.load`: دریافت و نمایش اولیه رویدادها، پروژه‌ها و انواع رویداد.
  - `Events.openForm`: ساخت Modal فرم؛ پرکردن گزینه‌های پروژه از `this.projects`؛ اتصال رویدادهای انتخاب پروژه/نوع رویداد.
  - `Events.refreshEventTypeOptions`: اعمال محدودیت‌های نوع رویداد با توجه به مجوز، پروژه Draft و پیشرفت گردش‌کار.
  - `Events.loadEventForms` و `Events.loadConfiguredForms`: دریافت و آماده‌سازی فرم‌های متصل به نوع رویداد از `GET /event-types/{eventTypeId}/forms`؛ تعریف فیلدها در `formDefinitions` و رندر با `renderConfiguredForms`.
  - `Events.loadWorkflowProgress`: دریافت `GET /projects/{projectId}/workflow-progress`؛ وضعیت بارگذاری/خطا روی مجازبودن انتخاب نوع رویداد اثر دارد.
  - `Events.loadEventContext`: دریافت `GET /projects/{projectId}/information`، فیلتر اطلاعات مرکزی مرتبط با فیلدهای فرم، سپس دریافت پاسخ فرم‌های حداکثر سه رویداد قبلی از `GET /events/{eventId}/forms`.
  - `Events.loadAmendmentSourceEvents`: دریافت `GET /projects/{projectId}/events` و جست‌وجوی پاسخ فرم رویدادها از طریق `GET /events/{eventId}/forms` به‌صورت ترتیبی تا یافتن پاسخ مبنا.
  - `Events.scheduleRefreshRender`: تجمیع رندرهای refresh منابع اولیه؛ debounce فعلی 40ms.
  - پس از ثبت رویداد، کلیدهای کش رویدادها، پروژه‌ها، انواع رویداد، داشبورد و جزئیات پروژه invalidation می‌شوند؛ کلیدهای جدید این فاز نیز باید به سیاست invalidation موجود متصل شوند.
- `js/core/api.js`:
  - `Api.get`: ادغام درخواست‌های GET هم‌زمان بر اساس token، path، query و گزینه‌های tracking/retry از طریق `inFlightGetRequests`.
  - `Api.getCached`: نمایش cache موجود و refresh پس‌زمینه؛ در نبود cache منتظر پاسخ شبکه می‌ماند.
  - `Api.getFresh`: دریافت تازه و ذخیره نتیجه.
  - `Api.invalidate` و `Api.invalidateMany`: حذف cache.
  - نکته مهم کشف‌شده: `getCached` در حال حاضر هنگام `Cache.set` مقدار TTL اختصاصی ارسال نمی‌کند؛ همچنین درخواست تازه را حتی هنگام وجود cache آغاز می‌کند. این رفتار stale-while-revalidate است و باید با سناریوهای واقعی و نیاز تازگی داده سنجیده شود، نه اینکه کورکورانه حذف شود.
- `js/core/cache.js`:
  - ذخیره در `localStorage` با prefix برابر `PMS_CACHE_` و نسخه `1.0.0`.
  - `Cache.set(key,data,{ttl})` از TTL پشتیبانی می‌کند؛ بدون TTL مقدار `expiresAt=null` و cache بدون انقضای زمانی می‌ماند.
  - `Cache.get`, `getMeta`, `remove`, `clearExpired` و کلیدهای استاندارد از جمله `PROJECTS`, `EVENTS`, `EVENT_TYPES` موجودند.
- `index.html`: ترتیب بارگذاری و cache-busting فایل‌های CSS/JS؛ هر تغییر Frontend باید نسخه assetها را طبق الگوی موجود به‌روز کند.
- `tests/`: تست‌های قرارداد API، کش، صفحه رویداد، گردش‌کار و رگرسیون موجود؛ پیش از افزودن تست جدید، تست‌های نزدیک موجود بررسی و توسعه داده شوند.

### Backend — Router، سرویس‌ها و APIهای موجود

- `Router.js`: نقطه مسیریابی و مجوزهای نهایی.
  - `GET /events` → `EventService.list(params)` با `EVENT_VIEW`.
  - `GET /projects` → `ProjectService.list(params)` با کنترل دسترسی پروژه.
  - `GET /event-types` → `EventTypeService.list(params)` با مجوزهای `EVENT_TYPE_MANAGE` / `EVENT_CREATE` / `SYSTEM_SETTINGS`.
  - `GET /event-types/{eventTypeId}/forms` → `FormService.listEventTypeForms(eventTypeId, params)`.
  - `GET /projects/{projectId}/information` → `ProjectInformationService.list(projectId, params)`.
  - `GET /projects/{projectId}/workflow-progress` → `EventService.workflowProgress(projectId, params)`.
  - `GET /projects/{projectId}/events` → `EventService.listByProject(projectId, params)`.
  - `GET /events/{eventId}/forms` → `FormService.getEventResponses(eventId, params)`.
  - ثبت اصلی همچنان `POST /events` است؛ ایجاد مسیر ثبت موازی ممنوع است.
- `ProjectService.js:list`:
  - ابتدا `ProjectRepository.getAll()` و فیلتر tenant، دسترسی و وضعیت Draft را اجرا می‌کند.
  - سپس برای ساخت `CardInformation`، انواع اطلاعات دارای `ShowOnCard`، ستون‌ها و تمام `ProjectInformationRepository.getAll()` را می‌خواند و روی پروژه‌ها تجمیع می‌کند.
  - فرم انتخاب پروژه عمدتاً به شناسه، کد، عنوان، وضعیت و چند فیلد لازم برای کنترل workflow نیاز دارد؛ این اختلاف بین payload کامل کارت پروژه و نیاز picker یک گلوگاه محتمل و اولویت بررسی Task 2 است. هر projection سبک باید در همان قرارداد/مسیر موجود و با حفظ مجوز و tenant isolation طراحی شود.
- `EventTypeService.js:list`: همه انواع رویداد را از `EventTypeRepository.getAll()` می‌خواند، tenant و مجوز/واحد/کاربر را فیلتر و نرمال‌سازی می‌کند.
- `FormService.js:listEventTypeForms`:
  - mappingهای `FormRepository.findMappingsByEventType` را فیلتر و مرتب می‌کند.
  - برای هر mapping فرم را با `findForm` می‌خواند و `_definition` را اجرا می‌کند.
  - `_definition` فیلدها را با `findFieldsByForm` می‌گیرد؛ برای هر فیلد `InformationTypeRepository.findById` و `findColumns` را فراخوانی می‌کند و snapshot تعریف را می‌سازد.
  - این ساختار، با وجود cache درون‌درخواستی Repository، کاندیدای اصلی تجمیع خواندن‌ها و ساخت indexهای گروهی است.
- `FormService.js:getEventResponses`: پاسخ‌های snapshot شده رویداد را از `35_EventFormData` بازیابی می‌کند؛ نسخه و Values پاسخ باید بدون تغییر باقی بماند.
- `ProjectInformationService.js:list`: اطلاعات مرکزی پروژه، نوع اطلاعات، ستون‌ها، revision/approval و وضعیت همگام‌سازی مرجع را آماده می‌کند؛ پاسخ این endpoint می‌تواند حجیم‌تر از نیاز اولیه فرم باشد.
- `EventService.js:workflowProgress`: پروژه و پیشرفت قواعد workflow را اعتبارسنجی می‌کند، انواع رویداد و نام مرحله را اضافه می‌کند و امکان تکمیل مرحله را تعیین می‌کند؛ نتیجه در فرانت‌اند روی گزینه‌های مجاز اثر مستقیم دارد.
- `EventService.js:list` و `_enrichEventsBatch_`: رویدادها را tenant-scoped کرده و پروژه‌ها، انواع رویداد، کاربران و واحدها را به‌صورت batch enrich می‌کند.
- `GoogleSheetsRepository.js`:
  - cache درون‌درخواستی برای list/record/find/column index دارد: `_requestListCache`, `_requestRecordCache`, `_requestFindCache`, `_requestColumnIndexCache`.
  - `getAll` یک محدوده شیت را یک‌جا می‌خواند و نتیجه را در cache درخواست نگه می‌دارد؛ `findById` و جست‌وجوی ستون نیز از indexهای درخواست استفاده می‌کنند.
  - `resetRequestCache` و `_invalidateSheetRecordCache` برای کنترل عمر و invalidation وجود دارند.
  - `_logTiming` زمان عملیات و cacheHit را به `PerformanceDiagnostics.record` منتقل می‌کند؛ در صورت فعال‌بودن تنظیم، log کنسول نیز دارد.
  - cache این Repository بین درخواست‌های مستقل تضمین‌شده نیست؛ بهینه‌سازی اصلی باید تعداد range readها و پردازش تکراری در هر درخواست را کاهش دهد.
- Repositoryهای داده:
  - `ProjectRepository.js` → شیت `08_Projects`.
  - `EventTypeRepository.js` → شیت `11_EventTypes`.
  - `EventRepository.js` → شیت `13_Events`.
  - `InformationTypeRepository.js` → شیت‌های `28_InformationTypes` و `29_InformationTypeColumns`.
  - `ProjectInformationRepository.js` → شیت‌های `30_ProjectInformation` و `31_ProjectInformationHistory`.
  - `FormRepository.js` → `32_Forms`, `33_FormFields`, `34_EventTypeForms`, `35_EventFormData`.
- ساختار داده، Snapshot فرم، tenant isolation، مجوزهای Backend، اعتبارسنجی سمت سرور، idempotency و مسیر اصلی ثبت رویداد باید حفظ شوند.

### جریان داده فعلی فرم ثبت رویداد

1. `Events.load` سه منبع اصلی `/events`, `/projects`, `/event-types` را با `Api.getCached` می‌گیرد و cache را فوراً نمایش می‌دهد؛ پاسخ تازه در پس‌زمینه state و رندر را به‌روز می‌کند.
2. `Events.openForm` گزینه‌های پروژه را از آرایه پروژه‌های بارگذاری‌شده می‌سازد.
3. با انتخاب پروژه، درخواست workflow progress و اطلاعات مرکزی پروژه شروع می‌شود؛ در حالت اصلاح، جست‌وجوی رویداد/فرم مبنا نیز شروع می‌شود.
4. با انتخاب نوع رویداد، فرم‌های متصل از endpoint مربوط دریافت و تعریف فرم‌ها رندر می‌شوند؛ سپس پنل اطلاعات مرتبط نیز با تعریف فیلدهای فرم پالایش می‌شود.
5. پنل اطلاعات مرتبط برای حداکثر سه رویداد اخیر، پاسخ فرم‌ها را جداگانه می‌گیرد.
6. ثبت نهایی از `POST /events` و جریان فعلی اعتبارسنجی/snapshot/ذخیره استفاده می‌کند.

### یافته‌های Discovery و گلوگاه‌های اولیه

- فقط سه منبع اصلی رویدادها، پروژه‌ها و انواع رویداد از cache فرانت‌اند استفاده می‌کنند؛ فرم‌های متصل، اطلاعات مرکزی پروژه، workflow progress و پاسخ فرم‌های قبلی مستقیماً درخواست می‌شوند.
- cache موجود TTL پیش‌فرض ندارد؛ در نتیجه کلیدهای ذخیره‌شده بدون TTL می‌توانند قدیمی بمانند. از طرف دیگر `getCached` در حضور cache نیز refresh شبکه را آغاز می‌کند.
- endpoint فهرست پروژه، اطلاعات CardInformation را برای همه پروژه‌های قابل مشاهده می‌سازد؛ این اطلاعات برای picker احتمالاً بیش از نیاز است.
- دریافت تعریف فرم‌های متصل شامل mapping → form → fields → information type → columns است و متد فعلی این زنجیره را در حلقه فرم/فیلد اجرا می‌کند.
- `loadEventContext` اطلاعات مرکزی را می‌گیرد و سپس پاسخ فرم‌های حداکثر سه رویداد را با `Promise.all` دریافت می‌کند؛ این درخواست‌ها به تغییر نوع رویداد نیز وابسته‌اند، در حالی که بخشی از اطلاعات پروژه با تغییر نوع ثابت می‌ماند.
- حالت اصلاح در `loadAmendmentSourceEvents` پاسخ فرم‌ها را در حلقه ترتیبی روی رویدادها جست‌وجو می‌کند؛ باید از نظر تعداد درخواست و مسیر داده بهینه شود.
- `workflowProgress` برای پروژه‌های دارای گردش‌کار ضروری است؛ پروژه Draft یا بدون Workflow/CurrentStep در Frontend از درخواست آن عبور می‌کند.
- Backend در `GoogleSheetsRepository` instrumentation و cache درون‌درخواستی دارد، اما گزارش عملکرد واقعی فرم احراز هویت‌شده در محیط staging در دسترس نیست. گزارش `test-results/latest-performance-report.md` در آخرین audit فقط login را پوشش داده و وضعیت `blocked-no-staging-api` داشته است؛ بنابراین baseline واقعی API باید در Task 2 با محیط تست امن و بدون استفاده از داده عملیاتی تهیه شود.
- زمان‌های هدف قبلی صرفاً معیار پیشنهادی بودند و هنوز baseline یا نتیجه اندازه‌گیری‌شده محسوب نمی‌شوند.

### اصول غیرقابل نقض

- endpoint یا مسیر موازی برای ثبت رویداد ایجاد نشود؛ مسیر اصلی `POST /events` حفظ شود.
- APIهای موجود تا حد امکان حفظ شوند؛ هر تغییر قرارداد باید با Frontend/Backend و تست قرارداد هماهنگ باشد.
- کش فقط برای سرعت نمایش است و هرگز جایگزین مجوز، tenant isolation، اعتبارسنجی، workflow rules یا کنترل نسخه سمت Backend نیست.
- داده cache شده باید با شناسه کاربر/tenant و نشست مناسب scope شود؛ داده کاربران/مجموعه‌ها نباید نشت کند.
- پس از تغییر پروژه، نوع رویداد، اتصال فرم، تعریف فرم، اطلاعات مرکزی، workflow یا ثبت رویداد، invalidation دقیق و قابل اتکا الزامی است.
- حفظ رفتار پروژه‌های Draft و Independent، ثبت سریع/کامل، پاسخ‌های چندردیفی، فایل‌ها، فرم‌های اصلاحی، Snapshot، تاریخچه و Idempotency الزامی است.
- هیچ Sheet، schema، permission یا داده عملیاتی بدون ضرورت و بررسی سازگاری تغییر نکند.
- ادغام GitHub، Backend deployment، Frontend deployment و live verification چهار وضعیت جداگانه‌اند.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning: بررسی معماری و طراحی برنامه بهینه‌سازی [x]

- مخازن عملیاتی، شاخه‌ها، HEAD، TODO5 و ARCHITECTURE هر دو مخزن بررسی شد.
- مسیرهای فرم ثبت رویداد، APIها، سرویس‌ها، Repositoryها، cache فرانت‌اند و cache درون‌درخواستی Google Sheets ردیابی شد.
- گلوگاه‌های اولیه شامل payload سنگین فهرست پروژه، نبود cache برای فرم‌های متصل/اطلاعات وابسته، ساخت تکراری definition فرم‌ها، دریافت اطلاعات تاریخی و زنجیره ترتیبی حالت اصلاح شناسایی شد.
- چهار Macro-Task فاز مطابق تأیید مالک محصول تعریف شد.
- *Log:* Frontend: `pages/events.html`, `js/modules/events.js` (از جمله `Events.load`, `openForm`, `loadEventForms`, `loadConfiguredForms`, `loadEventContext`, `loadWorkflowProgress`, `loadAmendmentSourceEvents`, `refreshEventTypeOptions`, `scheduleRefreshRender`), `js/core/api.js` (`get`, `getCached`, `getFresh`, in-flight GET deduplication, invalidation), `js/core/cache.js` (localStorage, TTL, metadata). Backend: `Router.js`; `ProjectService.js:list`; `EventTypeService.js:list`; `FormService.js:listEventTypeForms`, `_definition`, `getEventResponses`; `ProjectInformationService.js:list`; `EventService.js:workflowProgress`, `list`, `_enrichEventsBatch_`; `GoogleSheetsRepository.js:getAll`, `findById`, `resetRequestCache`, `_invalidateSheetRecordCache`, `_logTiming`. APIهای ردیابی‌شده: `GET /events`, `GET /projects`, `GET /event-types`, `GET /event-types/{id}/forms`, `GET /projects/{id}/information`, `GET /projects/{id}/workflow-progress`, `GET /projects/{id}/events`, `GET /events/{id}/forms`, و مسیر ثبت موجود `POST /events`. شیت‌های مرتبط: `08_Projects`, `11_EventTypes`, `13_Events`, `28_InformationTypes`, `29_InformationTypeColumns`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `32_Forms`, `33_FormFields`, `34_EventTypeForms`, `35_EventFormData`. هیچ کد runtime یا داده عملیاتی تغییر نکرد.

### Task 2 — Baseline & بهینه‌سازی دریافت اطلاعات اصلی [x]

- *Log:* Backend: `EventTypeService.js:list(params)` با پشتیبانی اختیاری `includeFormDefinitions=true` روی همان `GET /event-types`؛ استفاده مجدد از `FormService.listEventTypeForms`، حفظ tenant/filter/permission و رفتار پیش‌فرض قبلی، ایزوله‌سازی خطای هر نوع رویداد و fallback به `GET /event-types/{id}/forms`؛ تست `tests/event-type-form-prefetch.test.js`. `ProjectService.js:list(params)` و projection موجود `view=event-picker` برای کاهش payload انتخاب پروژه؛ batch/index تعریف فرم‌ها و cache tenant-scoped با TTL شصت‌ثانیه و invalidation در تغییرات فرم. Frontend: `js/modules/events.js` prefetch غیرمسدودکننده هنگام بازشدن Modal ثبت رویداد و ورود به پنل پروژه، cache موقت scoped به نشست/token و invalidation؛ در صورت آماده‌نبودن prefetch، endpoint قبلی per-event-type بدون انتظار اجرا می‌شود. تست‌ها: `tests/event-form-cache-policy.test.js`, `tests/event-form-performance-audit.test.js` و تست‌های Backend `event-form-definition-batch`, `event-project-picker-projection`, `event-form-definition-cache`, `event-type-form-prefetch`. API ثبت `POST /events` و ساختار Sheet/DB تغییر نکرد. Backend PR #18 با commit `ca703356253fcc288798512aab311676e7251ca0` ادغام شد و انتشار Apps Script توسط مالک محصول اعلام شد؛ Frontend PR #38 با commit `59a1b597033daf45e992ff7c0f573b3edf824aa7` ادغام و GitHub Pages workflow موفق شد. تست عملی مالک محصول: فرم بلافاصله نمایش داده می‌شود. Browser audit run `42284750517` روی commit Frontend فوق با conclusion=success تکمیل شد؛ audit پیشین PR snapshot قبل از انتشار Backend بود و به‌عنوان سنجش نهایی زمان تولید تفسیر نمی‌شود.

- ایجاد/تکمیل اندازه‌گیری امن و قابل تکرار برای زمان بازشدن فرم، آماده‌شدن منابع اصلی، تعداد درخواست‌ها، cache hit/miss، زمان سرویس‌ها و عملیات خواندن Google Sheets.
- تهیه baseline از محیط تست/Staging احراز هویت‌شده؛ عدم استفاده از دیتابیس یا API تولید برای تست مخرب.
- بررسی و سبک‌سازی دریافت فهرست پروژه برای picker با reuse مسیر موجود و حفظ فیلدهای لازم برای Draft/Independent و workflow.
- بهینه‌سازی دریافت انواع رویداد و تعریف فرم‌های متصل؛ کاهش خواندن تکراری فرم/فیلد/نوع اطلاعات/ستون‌ها با batch/index در همان درخواست.
- طراحی و پیاده‌سازی سیاست TTL و stale-while-revalidate برای داده‌های مرجع، با scope امن و invalidation دقیق.
- خروجی قابل آزمون: گزارش baseline و مقایسه تعداد درخواست/زمان آماده‌شدن منابع اصلی، بدون تغییر رفتار مجازبودن رویداد یا قرارداد ثبت.

### Task 3 — بهینه‌سازی اطلاعات وابسته و تاریخی [x]

#### Task 3 — Discovery تکمیلی و نقشه جریان داده

- Frontend در `js/modules/events.js`:
  - `Events.loadEventContext(projectId, eventTypeId)` در هر بار اجرا `GET /projects/{id}/information` را دریافت می‌کند؛ سپس رویدادهای مرتبط را از آرایه `this.events` فیلتر می‌کند و برای حداکثر سه رویداد، `GET /events/{eventId}/forms` را به‌صورت موازی می‌فرستد. تغییر نوع رویداد باعث اجرای مجدد مسیر و دریافت دوباره اطلاعات مرکزی پروژه می‌شود، با اینکه منبع اطلاعات مرکزی فقط به ProjectID وابسته است.
  - پاسخ‌های فرم تاریخی در متغیر موقت `eventContextHistoryRequests` ثبت/مدیریت می‌شوند، اما cache قابل استفاده مجدد بین تغییر نوع رویداد/بازشدن مجدد فرم هنوز وجود ندارد. باید کلید cache شامل token/session، ProjectID و EventID باشد و TTL و invalidation دقیق داشته باشد.
  - `Events.loadWorkflowProgress(projectId)` برای پروژه‌های Draft یا فاقد WorkflowID/CurrentStepID درخواست نمی‌فرستد؛ برای پروژه‌های فعال هر بار `GET /projects/{id}/workflow-progress` را اجرا می‌کند. requestId از اعمال پاسخ قدیمی جلوگیری می‌کند اما درخواست‌های هم‌زمان/تکراری را deduplicate نمی‌کند و cache پروژه‌محور ندارد.
  - `Events.loadAmendmentSourceEvents(projectId)` ابتدا `GET /projects/{id}/events` را می‌گیرد، رویدادها را مرتب می‌کند و سپس به‌صورت ترتیبی برای هر رویداد `GET /events/{id}/forms` می‌فرستد تا اولین فرم مجاز را بیابد؛ این مسیر در پروژه‌های پررویداد می‌تواند تعداد round-trip زیادی ایجاد کند. منطق allow-list فرم، انتخاب جدیدترین پاسخ و انتقال `FormVersion` و `UpdatedAt` به کنترل‌های اصلاح باید حفظ شود.
- Backend در `EventService.js`:
  - `listByProject(projectId, params)` رویدادهای پروژه را با tenant و دسترسی پروژه کنترل و سپس با `_enrichEventsBatch_` تکمیل می‌کند؛ endpoint فعلی داده timeline را برمی‌گرداند و می‌تواند منبع فهرست candidateها باقی بماند.
  - `workflowProgress(projectId, params)` پروژه و دسترسی را مجدداً کنترل می‌کند، `_getWorkflowRuleProgress_`، فهرست انواع رویداد و نام مرحله را می‌خواند؛ cache باید در سطح درخواست/کاربر و tenant امن باشد و پس از ثبت رویداد، تغییر workflow یا تکمیل مرحله invalid شود. Cache سمت Frontend فقط برای نمایش است و اعتبارسنجی نهایی Backend را جایگزین نمی‌کند.
- محدوده اجرای Task 3: ابتدا cache/in-flight deduplication امن برای اطلاعات مرکزی پروژه، پاسخ فرم‌های تاریخی و workflow progress؛ سپس کاهش درخواست ترتیبی حالت اصلاح با یک روش batch سازگار با APIهای موجود. ایجاد مسیر ثبت جدید یا تغییر schema/Sheet در این مرحله مجاز نیست.
- معیارهای پذیرش: تغییر نوع رویداد نباید دوباره اطلاعات مرکزی ثابت پروژه را fetch کند؛ پاسخ‌های تاریخی و workflow برای همان نشست/پروژه از cache معتبر یا درخواست مشترک استفاده کنند؛ تغییر داده/ثبت رویداد cache را invalid کند؛ حالت اصلاح جدیدترین پاسخ مجاز را با نسخه و زمان به‌درستی بارگذاری کند؛ tenant isolation، پروژه Draft/Independent و مجوزها بدون تغییر بمانند.
- در این مرحله فقط Discovery انجام شد؛ هنوز هیچ فایل runtime، API، Sheet یا داده عملیاتی تغییر نکرده است.

- بهینه‌سازی و cache کنترل‌شده اطلاعات مرکزی پروژه و پاسخ فرم‌های قبلی.
- کاهش درخواست‌های تکراری پنل اطلاعات مرتبط هنگام تغییر نوع رویداد.
- بهینه‌سازی دریافت workflow progress با جلوگیری از درخواست تکراری و invalidation پس از ثبت رویداد/تکمیل مرحله.
- بازطراحی جست‌وجوی پاسخ مبنا در حالت اصلاح برای حذف درخواست‌های ترتیبی غیرضروری، با حفظ FormVersion و ExpectedUpdatedAt.
- حفظ lazy loading برای تاریخچه‌هایی که کاربر صریحاً باز می‌کند.
- خروجی قابل آزمون: انتخاب پروژه/نوع رویداد و حالت اصلاح با تعداد درخواست کمتر و بدون پاسخ قدیمی یا اشتباه.

#### Task 3 — تکمیل، انتشار و پذیرش عملیاتی (2026-11-07)

- پیاده‌سازی نهایی در Frontend:
  - `js/modules/events.js`: cache حافظه‌ای محدود به token/session برای اطلاعات مرکزی پروژه و پاسخ فرم‌های تاریخی با TTL برابر 60 ثانیه؛ cache پیشرفت Workflow با TTL برابر 15 ثانیه؛ ادغام درخواست‌های هم‌زمان یکسان (in-flight deduplication).
  - invalidation در پایان/تغییر نشست، تغییر مسیرهای مرتبط با فرم‌ها، انواع رویداد، اطلاعات و پروژه، ثبت رویداد، اصلاح پاسخ فرم و تکمیل مرحله؛ generation guard از ورود پاسخ قدیمی به cache پس از invalidation جلوگیری می‌کند.
  - جست‌وجوی پاسخ مبنا در حالت اصلاح به batchهای موازی چهارتایی تغییر کرد؛ ترتیب جدیدترین رویداد، allow-list فرم، کنترل درخواست‌های stale و مقادیر `FormVersion` و `ExpectedUpdatedAt` حفظ شدند.
  - `index.html`: به‌روزرسانی cache-busting فایل `js/modules/events.js`.
- تست‌های مرتبط در `tests/event-context-filtering.test.js` و تست‌های رگرسیون وابسته به cache/asset به‌روزرسانی شدند.
- Backend در این تسک تغییر اجرایی نداشت؛ APIها، Router، سرویس‌ها، Sheetها و schema بدون تغییر باقی ماندند و مسیر ثبت اصلی `POST /events` حفظ شد.
- اعتبارسنجی پیش از ادغام: 179 تست Frontend موفق؛ بررسی syntax و asset/CSS موفق؛ Frontend contract/diff review و asset/stylesheet QA موفق؛ Browser audit واقعی و آزمون تقویم جلالی موفق؛ Cross-repository QA موفق. Runهای تکمیلی: Browser audit `42288065402` و Cross-repository QA `42288065463` هر دو با نتیجه success.
- ادغام: Frontend PR #39 با روش squash در commit `7951a694b807931daa027642a9dc392d78e58923` به `main` ادغام شد.
- انتشار: GitHub Pages build و deploy در Run `42289806166` با نتیجه success تکمیل شد؛ HEAD شاخه `main` با commit انتشار برابر است.
- پذیرش مالک محصول: در 2026-11-07 کاربر تست عملیاتی را تأیید کرد؛ شامل انتخاب پروژه، تغییر چندباره نوع رویداد، بارگذاری پاسخ معتبر در حالت اصلاح، تازه‌سازی پیشرفت Workflow و ثبت رویداد.
- وضعیت: Task 3 تکمیل و پذیرفته شد. هیچ تغییر Backend deployment یا مهاجرت داده‌ای لازم نبود.

### Task 4 — بهینه‌سازی نمایش، یکپارچه‌سازی کش و Regression [x]

- کاهش رندرهای تکراری فرم، picker و پنل اطلاعات؛ حفظ نمایش فوری cache و refresh پس‌زمینه.
- مدیریت loading/error/empty state و جلوگیری از پرش UI در دسکتاپ و موبایل.
- تکمیل ماتریس invalidation برای تغییر پروژه، event type، form mapping، form definition، project information، workflow و ثبت رویداد.
- آزمون قرارداد API، مجوزها، tenant isolation، Draft/Independent، ثبت سریع/کامل، فرم چندردیفی، فایل، اصلاح فرم، Snapshot، تاریخچه و Idempotency.
- مقایسه نهایی با baseline و ثبت زمان‌ها/تعداد درخواست‌ها و نتایج آزمون؛ هیچ ادعای سرعت بدون اندازه‌گیری ثبت نشود.
- خروجی قابل آزمون: فرم ثبت رویداد سریع‌تر و پایدارتر، بدون رگرسیون در ثبت و صحت داده.


#### Task 4 — تکمیل، ادغام، انتشار و پذیرش عملیاتی (2026-11-07)

- Frontend: در `js/modules/events.js`، تابع `fillSelect` امضای داده گزینه‌ها را بررسی می‌کند و در صورت یکسان‌بودن فهرست، از بازسازی غیرضروری DOM جلوگیری می‌کند؛ در نتیجه انتخاب و تمرکز کنترل‌ها پایدار می‌ماند. رندر فهرست پروژه‌های اخیر نیز در صورت یکسان‌بودن markup یا وضعیت خالی، `container.innerHTML` را دوباره جایگزین نمی‌کند.
- تست‌های رگرسیون در `tests/event-form-cache-policy.test.js` برای جلوگیری از بازسازی فهرست گزینه‌های بدون تغییر و حفظ DOM انتخابگر پروژه اخیر افزوده شدند. بررسی‌های وابسته به نسخه asset در `tests/event-history-project-cards.test.js`, `tests/event-queue-project-cards.test.js`, `tests/event-type-loading-state.test.js`, `tests/project-picker.test.js` و `tests/workflow-management.test.js` با نسخه جدید هماهنگ شدند.
- `index.html`: نسخه asset ماژول رویداد به `js/modules/events.js?v=20261107-event-render-stability-1` به‌روزرسانی شد.
- Backend در Task 4 تغییر اجرایی نداشت؛ API، Router، مجوزها، Sheetها و schema دست‌نخورده ماندند. تغییرات صرفاً در Frontend عملیاتی اعمال شد و هیچ مهاجرت یا عملیات داده‌ای انجام نشد.
- اعتبارسنجی روی PR #40 و commit نهایی آن `dca5c910cb1e871f33b1b2afb1b66d88dcd200f1`: Frontend checks در Run `42291350765`، Frontend Agent Suite در Run `42291355688`، Cross-repository QA در Run `42291355696` و Browser UI Performance Audit در Run `42291355683` موفق شدند. تست‌های رگرسیون، بررسی syntax و کنترل asset/CSS نیز موفق بودند.
- ادغام: Frontend PR #40 با روش squash در commit `f944b3e694c5c8704bd933f11953d0e57e10625a` به شاخه `main` ادغام شد.
- انتشار: GitHub Pages build/deployment در Run `42292239790` و انتشار Frontend در Run `42292240360` موفق شدند. بررسی‌های پس از ادغام Frontend checks در Run `42292240480`، Cross-repository QA در Run `42292240397`، Frontend Agent Suite در Run `42292240352` و Comprehensive UI Performance Audit در Run `42292240374` همگی با نتیجه success پایان یافتند.
- پذیرش مالک محصول: در 2026-11-07 کاربر تست عملیاتی تسک را موفق اعلام کرد؛ بنابراین پایداری انتخابگرها و رفتار فرم پس از تغییرات تأیید شد.
- *Log:* Frontend: `js/modules/events.js` — `fillSelect` و رندر انتخابگر پروژه‌های اخیر؛ `tests/event-form-cache-policy.test.js` و پنج فایل تست asset ذکرشده؛ `index.html` برای cache-busting. APIهای موجود و مسیر ثبت `POST /events` بدون تغییر باقی ماندند. Backend: هیچ فایل runtime، تابع، API، Sheet یا schema تغییر نکرد. ادغام PR #40 در commit `f944b3e694c5c8704bd933f11953d0e57e10625a` و انتشار موفق GitHub Pages در Runهای فوق ثبت شد. تست عملیاتی مالک محصول موفق بود.

### Implementation Log

- شروع فاز: 2026-11-06.
- Task 1 تکمیل و Task 2 در وضعیت IN PROGRESS قرار گرفت.
- تا این نقطه فقط مستندات TODO5 به‌روزرسانی می‌شود؛ هیچ تغییر اجرایی، انتشار یا مهاجرت داده انجام نشده است.

#### Task 2 — Implementation progress (در انتظار تکمیل ارزیابی و پذیرش؛ baseline احراز هویت‌شده تهیه شد)

- `FormService.js`:
  - متد جدید `_definitionsForForms_(forms, tenantId)` تعریف فرم‌های چندگانه را با یک بار خواندن `FormRepository.getFields()`، `InformationTypeRepository.findByTenant()` و `InformationTypeRepository.getAllColumns()` می‌سازد.
  - `listEventTypeForms(eventTypeId, params)` اکنون فرم‌ها را با یک بار `FormRepository.getForms()` و mappingها را با یک بار `findMappingsByEventType()` index می‌کند؛ lookup جداگانه هر فرم/فیلد/نوع اطلاعات/ستون حذف شد.
  - ترتیب mapping، فیلدها و ستون‌ها، فیلتر TenantID/Status، خطاهای نوع اطلاعات غیرفعال/ناموجود، VisibilityRule و حذف ValidationRuleJSON از پاسخ حفظ شد. قرارداد API و snapshot پاسخ تغییر نکرد.
- `ProjectService.js:list(params)`:
  - حالت خواندنی `params.view === 'event-picker'` افزوده شد؛ projection سبک شامل `ID, ProjectCode, Title, Name, ProjectName, RecordState, WorkflowID, CurrentStepID, CurrentStepName, WorkflowStepName, CurrentStepStatus, Status` برمی‌گرداند.
  - این حالت قبل از ساخت CardInformation برمی‌گردد و خواندن انواع اطلاعات/ستون‌ها/اطلاعات پروژه برای picker را حذف می‌کند. فیلترهای tenant، دسترسی و Draft بدون تغییر باقی ماندند.
- APIهای موجود حفظ شدند: `GET /event-types/{id}/forms` و `GET /projects?view=event-picker` (پارامتر view در query string؛ همان `GET /projects` و همان مجوزها). هیچ مسیر ثبت جدید یا شیت/مهاجرتی اضافه نشده است.
- تست‌های جدید: `tests/event-form-definition-batch.test.js` و `tests/event-project-picker-projection.test.js`.
- CI Backend: تست‌ها و بررسی syntax در commit `8409a0d338093a9deb98c77a60b0aa024fa66af7` موفق شدند.

- محدودیت baseline: اجرای browser audit روی PR به‌صورت امن انجام شد، اما Repository variable/secret مربوط به `PMS_STAGING_API_BASE_URL` تنظیم نشده بود. گزارش `pms-ui-performance-audit-167` وضعیت `blocked-no-staging-api` داشت؛ فقط صفحه ورود عمومی با زمان آماده‌شدن 199ms بررسی شد، 0 خطای Console و 0 خطای Page ثبت شد و هیچ داده‌ای از فرم ثبت رویداد یا API عملیاتی خوانده نشد. بنابراین baseline واقعی فرم هنوز ثبت نشده و Task 2 باز می‌ماند.


#### Task 2 — گزارش سنجش احراز هویت‌شده و کنترل‌های تکمیلی (2026-11-06)

- اجرای مرورگر واقعی روی Staging احراز هویت‌شده با Run شماره `42277205597` و Artifact شماره `13532194544` تکمیل شد؛ حالت اجرا `authenticated-read-only` و وضعیت `authenticated-audit-complete` بود.
- نتایج فرم ثبت رویداد: آماده‌شدن Modal برابر `1409ms`؛ آماده‌شدن پروژه و Workflow برابر `3723ms`؛ آماده‌شدن تعریف فرم‌های متصل برابر `9207ms`؛ تعداد گزینه پروژه `2`؛ انواع رویداد مجاز `10`؛ کنترل‌های فرم متصل `2`.
- سلامت مرورگر: `47` درخواست شبکه؛ `0` درخواست ناموفق؛ `0` خطای Console؛ `0` خطای Page؛ بدون سرریز افقی در viewport موبایل `390px`. هیچ مقداری وارد و هیچ رویدادی ثبت نشد.
- گزارش، زمان مرورگر برای endpointهای نمونه را نیز ثبت کرده است: `GET /event-types/:id/forms = 5332ms`، `GET /projects/:id/information = 4443ms` و `GET /projects/:id/workflow-progress = 3594ms`. این اعداد زمان مشاهده‌شده در مرورگرند و به‌دلیل نبود جدول diagnostics مدیریتی، زمان خالص Backend/Google Sheets محسوب نمی‌شوند.
- baseline قبل از تغییرات در دسترس نیست؛ بنابراین درصد بهبود یا کاهش قطعی زمان ادعا نمی‌شود. زمان `9207ms` برای تعریف فرم‌ها هنوز زیاد است و نقطه تمرکز ادامه Task 2 خواهد بود.
- کنترل Backend روی HEAD شاخه PR #17: Backend source checks و PMS agent suite هر دو موفق؛ `179/179` تست Backend پاس، `85` فایل منبع JavaScript و manifest بررسی شدند؛ Domain Contract و QA/Release Safety بدون finding بحرانی موفق شدند. Runها: `42277904168` و `42277903928`.
- کنترل Frontend روی HEAD شاخه PR #37: Frontend checks، frontend agent suite و Cross-repository QA موفق؛ Browser Audit احراز هویت‌شده نیز بدون خطای مرورگر تکمیل شد.
- PRها همچنان باز و ادغام‌نشده‌اند؛ هیچ Backend deployment، Frontend deployment یا live verification بعد از ادغام انجام نشده است.
- وضعیت Task 2: `IN PROGRESS`؛ بهینه‌سازی‌های اولیه پیاده‌سازی و تست خودکار شده‌اند، اما کاهش زمان آماده‌شدن تعریف فرم‌ها باید با سنجش تکراری/تشخیصی و سپس پذیرش عملیاتی تأیید شود.


#### Task 2 — کش تعریف فرم‌های متصل در Backend (پیاده‌سازی و تست خودکار)

- `FormService.js`:
  - پاسخ `listEventTypeForms(eventTypeId, params)` پس از اعتبارسنجی Tenant و وجود نوع رویداد، با `CacheService.getScriptCache()` و TTL برابر `60` ثانیه cache می‌شود.
  - کلید کش به‌صورت tenant + eventType + version ساخته می‌شود؛ داده یک Tenant برای Tenant دیگر قابل استفاده نیست.
  - در صورت نبود CacheService، خطای خواندن/نوشتن کش یا عبور اندازه داده از محدودیت CacheService، مسیر اصلی محاسبه batch بدون تغییر اجرا می‌شود؛ کش صرفاً بهینه‌سازی است.
  - `_invalidateEventTypeFormDefinitions_` با تغییر version، تمام تعریف‌های قبلی همان Tenant را بدون حذف داده عملیاتی از چرخه اعتبار خارج می‌کند.
- ابطال کش پس از تغییرات مرتبط:
  - `FormService.update`, `addField`, `updateField`, `removeField`, `assignEventType`, `unassignEventType`.
  - `InformationTypeService.update`, `deactivate`, `createColumn`, `updateColumn`, `deactivateColumn` از طریق helper محافظت‌شده `_invalidateFormDefinitions_`.
- تست جدید `tests/event-form-definition-cache.test.js` سه مورد را پوشش می‌دهد: cache hit در درخواست تکراری، جداسازی Tenantها و اجبار به خواندن تازه پس از تغییر version.
- اعتبارسنجی روی commit `6024eb418007a86b820877e801b9ad3b190fc879`: Backend source checks و PMS agent suite موفق؛ تست‌های Backend `179/179` پاس شدند. اجرای Cross-repository QA روی Frontend نیز commit Backend شاخه عملیاتی را با موفقیت بررسی کرد.
- این کش هنوز روی Staging deploy نشده است؛ بنابراین اثر آن بر زمان واقعی endpoint هنوز اندازه‌گیری نشده و هیچ ادعای بهبود عملیاتی ثبت نمی‌شود.


#### Task 2 — نتیجه warm endpoint و محدودیت سنجش Staging (2026-11-06)

- Browser Audit روی Frontend commit `9d517bddf8edc62b4e41cef87a615618ef0c26ab` یک درخواست تکراری مستقیم به `GET /event-types/{id}/forms` اجرا کرد؛ زمان مشاهده‌شده `7634ms` بود و درخواست اول در همان اجرا `5970ms` ثبت شد.
- این دو زمان مربوط به Backend فعلی مستقر روی Staging هستند؛ commit دارای کش `FormService` هنوز deploy نشده بود. بنابراین نتیجه، اثر کش جدید را نشان نمی‌دهد و baseline warm برای نسخه جدید محسوب نمی‌شود.
- Browser audit در حالت read-only تکمیل شد؛ هیچ ثبت رویداد یا تغییر داده انجام نشد. diagnostics مدیریتی در پاسخ‌های حساب تست در دسترس نبود و تفکیک `accessMs`, `routerMs` و عملیات Sheet هنوز قابل تأیید نیست.
- آخرین کنترل Backend پس از مستندسازی کش: Backend source checks و PMS agent suite روی commit `d065bc878829b072d8ec2c3c0f85e2f08c6d0f9d` موفق؛ هیچ تغییر runtime پس از commit تست‌شده `6024eb418007a86b820877e801b9ad3b190fc879` اعمال نشده است.
- برای تأیید اثر کش: انتشار Backend شاخه `feat/event-form-performance` روی deployment آزمایشی موجود، سپس اجرای مجدد audit و مقایسه cold/warm request الزامی است. هیچ deployment یا ادغام انجام نشده است.


#### Task 2 — تکرار سنجش مرورگر و نتیجه warm probe محدودشده (2026-11-06)

- Browser Audit Run `42278648501` / Artifact `13534980965` روی commit Frontend `85d9dd54dd1aa52107e713f4a3024c1197bd3aea` با وضعیت `authenticated-audit-complete` موفق شد.
- نتایج: Modal `2919ms`؛ پروژه/Workflow `6892ms`؛ تعریف فرم‌های متصل `11326ms`؛ درخواست مستقیم warm به همان endpoint `5501ms`؛ timeout رخ نداد.
- سلامت آزمون: `49` درخواست شبکه، `0` خطای شبکه، `0` خطای Console/Page، بدون overflow موبایل؛ `2` پروژه، `10` نوع رویداد مجاز و `2` کنترل فرم متصل. هیچ فرم submit نشد.
- مقایسه با اجرای قبلی Run `42278302128` نشان می‌دهد زمان‌ها نوسان دارند؛ در هر دو اجرا diagnostics مدیریتی Backend خالی بود. این اختلاف به‌عنوان بهبود یا پسرفت قطعی تفسیر نمی‌شود.
- API مقصد، Staging احراز هویت‌شده است؛ اما deployment شاخه Backend PR #17 روی آن مستقلاً تأیید نشده. workflow موجود `.github/workflows/sync-apps-script.yml` فقط `main` و Secrets محیط Production را هدف می‌گیرد؛ از آن برای انتشار Staging یا feature branch استفاده نخواهد شد.
- وضعیت Task 2 همچنان `IN PROGRESS` است. برای اثبات اثر بهینه‌سازی Backend، باید مسیر مجزای امن Staging مشخص/تأیید شود، Backend branch روی همان محیط منتشر شود و audit مجدداً اجرا گردد. هیچ merge یا Production deployment انجام نشده است.


#### Task 2 — تکرار warm endpoint روی Staging (2026-11-06)

- اجرای Browser Audit روی Frontend HEAD `85d9dd54dd1aa52107e713f4a3024c1197bd3aea` در Run `42278648501` و Artifact `13534980965` موفق شد؛ `GET /event-types/{id}/forms` در درخواست اول به آماده‌شدن فرم `11326ms` و در درخواست تکراری `5501ms` رسید.
- این اجرا هنوز به Backend کَش‌دار commit `6024eb418007a86b820877e801b9ad3b190fc879` متصل نبود؛ بنابراین `5501ms` به نسخه جدید Backend نسبت داده نمی‌شود. تفاوت با warm قبلی `7634ms` نوسان Staging را نشان می‌دهد.
- برای نتیجه معتبر، باید همین کد Backend روی یک deployment مستقل Staging اجرا شود و سپس درخواست اول/تکراری با همان نوع رویداد اندازه‌گیری شود. deployment موجود GitHub فقط production و `main` را هدف می‌گیرد؛ عمداً اجرا نشده است.


### نتیجه بستن فاز
- هر چهار Macro-Task با پذیرش مالک محصول تکمیل شدند.
- Frontend PR #39 و PR #40 در شاخه main ادغام و GitHub Pages با موفقیت منتشر شد.
- Backend در این فاز تغییر اجرایی نداشت؛ هیچ API، Router، permission، Sheet، schema یا داده عملیاتی تغییر نکرد.
- آزمون‌های CI، QA بین‌مخزنی و auditهای مرورگر نهایی موفق شدند؛ تست عملیاتی مالک محصول نیز موفق اعلام شد.
- Task 4 در هر دو مخزن به‌صورت [x] ثبت شده بود؛ TODO5 پس از آرشیو به عبارت Ready for the next feature بازنشانی شد.


## 2026-11-07 — ترتیب نمایشی مستقل رویدادهای Workflow در حالت FREE

### هدف و تصمیم معماری
- برای هر مرحله Workflow در حالت Sequence Mode برابر `FREE` امکان تعیین ترتیب نمایشی رویدادها فراهم شد.
- ترتیب نمایشی از ترتیب اجرایی مستقل است: `DisplayOrder` فقط ترتیب فهرست و نمایش را تعیین می‌کند؛ `EventOrder` در حالت FREE همچنان صفر می‌ماند و هیچ اجبار ترتیبی برای ثبت رویداد ایجاد نمی‌کند.
- ساختار داده موجود توسعه داده شد؛ Sheet یا API موازی ساخته نشد. رفتار حالت‌های `STRICT` و `GROUPED` حفظ شد.
- برای رکوردهای قدیمی فاقد `DisplayOrder`، fallback بر اساس ترتیب قبلی رکوردها در نظر گرفته شد.

### نقشه فنی و تغییرات
- `DatabaseSetup.js` — در `APP_CONFIG.SHEETS.WORKFLOW_STEP_EVENT_RULES.headers` ستون افزایشی `DisplayOrder` به شیت `37_WorkflowStepEventRules` اضافه شد؛ ستون‌ها و داده‌های قبلی حذف یا بازنویسی نشدند.
- `WorkflowStepEventRuleRepository.js` — ستون به `REQUIRED_COLUMNS` اضافه شد و `cloneWorkflowVersion` مقدار آن را هنگام نسخه‌برداری Workflow حفظ می‌کند.
- `WorkflowStepEventRuleValidator.js` — در FREE مقدار `DisplayOrder` باید عدد صحیح مثبت و در همان مرحله یکتا باشد؛ مقدارهای legacy فاقد آن با ترتیب ورودی سازگار می‌شوند. شرط `EventOrder=0` و نبود گروه حفظ شد.
- `WorkflowService.js` — APIهای موجود `GET/PUT /workflows/:id/steps/:stepId/event-rules` حفظ شدند؛ خروجی و ذخیره قواعد FREE بر اساس `DisplayOrder` مرتب می‌شود و سایر حالت‌ها ترتیب قبلی خود را حفظ می‌کنند.
- `EventService.js` — تابع `_getWorkflowRuleProgress_` قواعد را در FREE بر اساس `DisplayOrder`، در STRICT بر اساس `EventOrder` و در GROUPED بر اساس `GroupOrder` مرتب می‌کند؛ فیلد `displayOrder` به workflow progress اضافه شد.
- `tests/workflow-event-rules.test.js` — پوشش schema افزایشی، اعتبارسنجی ترتیب مثبت/یکتا، و استقلال DisplayOrder از EventOrder اضافه شد.

### ادغام، آزمون و انتشار
- Backend PR #20 با squash merge در commit `a20612a2389b5e55a66f37a8238a8eb3f941d5fe` ادغام شد؛ اصلاح سازگاری حفظ ترتیب STRICT/GROUPED در commit `d7b6d50d2abf50cdceeee40ff3bcee4540984a53` روی main قرار گرفت.
- Backend CI و Agent Suite موفق شدند؛ آزمون‌های سرویس و قرارداد اجرا شدند.
- Backend deployment workflow Run `42364626304` (Run #18) موفق شد؛ push سورس به Apps Script و انتشار Web App هر دو با موفقیت پایان یافتند.
- مالک محصول تست عملیاتی ذخیره/بازگشایی ترتیب و نمایش مرتب‌شده در فهرست رویدادها را موفق اعلام کرد.

### نتیجه پذیرش
- ترتیب نمایش در FREE قابل تنظیم و ماندگار است.
- ترتیب ثبت رویدادها آزاد باقی می‌ماند.
- STRICT و GROUPED و مسیرهای موجود API حفظ شدند.
- هیچ Sheet یا API موازی ایجاد نشد و مهاجرت مخرب یا حذف داده انجام نشد.
- فاز در تاریخ 2026-11-07 با تأیید مالک محصول بسته شد.


## 2026-11-07 — پشتیبانی چندتصویری در اطلاعات مرکزی فرم رویداد

### هدف و دامنه
- امکان انتخاب، پیش‌نمایش، حذف پیش از ثبت و ذخیره هم‌زمان چند تصویر در همه فیلدهای تصویری اطلاعات مرکزی، شامل فیلدهای مستقل و ستون‌های تصویری جداول.
- دامنه از طریق فرم‌های متصل به رویداد پروژه و با حفظ مسیرهای عملیاتی موجود پیاده‌سازی شد.
- حداکثر ۲۰ تصویر برای هر فیلد؛ سقف حجم هر تصویر مطابق تنظیم موجود سرور ۱۰ مگابایت است؛ upload به‌صورت ترتیبی انجام می‌شود.
- هیچ API route، فرم، Sheet یا مسیر ذخیره‌سازی موازی ایجاد نشد. اطلاعات همچنان در ساختارهای موجود و فایل‌ها در Google Drive نگهداری می‌شوند.

### قرارداد داده و سازگاری
- مقدار جدید هر فیلد یا ستون `DataType=image` به‌صورت آرایه‌ای از referenceهای امن Attachment ذخیره می‌شود.
- object تک‌تصویر قدیمی همچنان معتبر و قابل نمایش باقی می‌ماند.
- نوع `file` همچنان تک‌فایل است و آرایه برای آن پذیرفته نمی‌شود.
- Backend برای هر reference شناسه پیوست، tenant، پروژه، entity، نوع پیوست، وضعیت فعال و MIME تصویری را بررسی می‌کند؛ metadata معتبر از رکورد سرور خوانده می‌شود و payload کلاینت مرجع اعتماد نیست.
- `AttachmentType=INFORMATION` برای تصاویر اطلاعات مرکزی استفاده می‌شود؛ مسیر موجود `PROFILE` فقط برای تصویر نمایه پروژه و مطابق رفتار فعلی حفظ شده است.
- داده در `30_ProjectInformation.ValueJSON`، تاریخچه در `31_ProjectInformationHistory` و snapshot پاسخ فرم رویداد در `34_EventFormData` ثبت می‌شود؛ metadata پیوست در `15_Attachments` باقی می‌ماند.

### نقشه Backend
- `ProjectInformationService.js` — تابع `_scalar` پذیرش object قدیمی یا آرایه حداکثر ۲۰ reference تصویر را با کنترل AttachmentID، TenantID، EntityType، EntityID، AttachmentType، Status و MIME انجام می‌دهد؛ آرایه برای `file` رد می‌شود. اعتبارسنجی اطلاعات مرکزی از مسیر `_validate` و ذخیره از مسیر `save` باقی مانده است.
- `FormService.js` — `prepareEventResponses(eventTypeId, responses, tenantId, projectId)` پاسخ‌های فرم را اعتبارسنجی می‌کند؛ `saveEventResponses(event, responses, user, params)` snapshot پاسخ را ذخیره و اطلاعات غیرخالی را از مسیر موجود به اطلاعات پروژه منتقل می‌کند.
- `AttachmentService.js` و `AttachmentValidator.js` — کنترل دسترسی، مالکیت، MIME و حجم فایل و ذخیره فایل در Google Drive؛ metadata در شیت موجود `15_Attachments`.
- `Router.js` — مسیرهای موجود حفظ شده‌اند: `POST /projects/:projectId/attachments` برای upload، `POST /events` برای ثبت رویداد و `GET /attachments/:attachmentId/download` برای دریافت تصویر با مجوز موجود.
- شیت، ستون یا API جدیدی اضافه نشد؛ سقف JSON، idempotency مبتنی بر `SourceEventID`، تاریخچه و tenant isolation حفظ شدند.

### نقشه Frontend
- `pages/events.html` — صفحه موجود ثبت رویداد.
- `js/modules/events.js`:
  - `createFieldInput` و `renderConfiguredForms` ورودی‌های تصویری مستقل و ستون‌های تصویری جدول را به انتخاب چندفایل مجهز می‌کنند.
  - `addConfiguredFormRow` برای ردیف‌های تصویری جدول و `hydrateAmendmentForm` برای سازگاری با مقادیر آرایه‌ای و object قدیمی استفاده می‌شوند.
  - `collectConfiguredFormResponses` پاسخ‌ها را از همان جریان ثبت رویداد جمع‌آوری می‌کند.
  - `uploadConfiguredFormImages` و `uploadConfiguredFormFile` فایل‌ها را ترتیبی از مسیر موجود upload می‌کنند؛ cache فایل‌های uploadشده از بارگذاری تکراری در retry جلوگیری می‌کند.
  - `hasStoredFormAttachment`, `renderEventInformationValue`, `renderEventFormValue`, `openEventImageAttachment`, `openDetails`, `loadEventContext` اعتبارسنجی، preview و نمایش تصاویر را مدیریت می‌کنند.
- `js/modules/project-detail.js` — `prepareProjectFormImages`, `renderProjectFormValue`, `renderInformationValue` آرایه تصاویر و سلول‌های تصویری جداول را در صفحه پروژه نمایش می‌دهند.
- `index.html` — نسخه cache-busting فایل‌های تغییرکرده به `20261107-multi-image-information-1` به‌روزرسانی شد.
- تمام درخواست‌های Frontend از لایه موجود `PMS.Api` استفاده می‌کنند.

### آزمون، ادغام و انتشار
- Backend: تست‌های `tests/information-file-types.test.js` شامل legacy single image، آرایه معتبر، سقف ۲۰، رد آرایه برای file، tenant/project mismatch، MIME نامعتبر، فیلد مستقل و ستون تصویری جدول؛ ۱۸۷ تست Backend موفق و بررسی syntax/manifest موفق.
- Frontend: تست‌های `tests/information-file-types.test.js` برای انتخاب چندتصویر، upload، حذف قبل از ثبت، فیلد مستقل، سلول جدول، نمایش رویداد و صفحه پروژه؛ syntax، رگرسیون، asset/CSS و Browser Audit موفق.
- Backend PR #21 با squash در commit `97edde109f50afd6c7427372b98001468cdfedd4` روی `main` ادغام شد. انتشار Production از `.github/workflows/sync-apps-script.yml` با `phase=push_and_deploy` در Run `42395069816` و Job `128470562296` موفق شد؛ push به Apps Script و deploy وب‌اپ هر دو موفق بودند.
- Frontend PR #43 با squash در commit `23a50b3441360d8147bf7c599829a13909a80326` روی `main` ادغام شد؛ GitHub Pages deploy در Run `42393860547` موفق بود. آخرین commit گزارش Performance Audit در زمان پذیرش `9b83ccd1bba9f4a511e29f2537dc8a82ffa0a8f2` بود.
- مالک محصول آزمون عملی نسخه منتشرشده را انجام داد و موفقیت قابلیت را تأیید کرد.
- در این فاز هیچ مهاجرت داده، حذف داده، تغییر destructive یا تغییر در مخازن توسعه انجام نشد.
- فاز در تاریخ 2026-11-07 با تأیید مالک محصول بسته شد.


## 2026-11-07 — کاهش تأخیر پیش از شروع ثبت رویداد (ثبت سازگاری Backend)

### هدف و محدوده
- این فاز برای بهبود بازخورد فوری Submit و آماده‌سازی کارآمدتر پیوست‌ها در Frontend انجام شد.
- Backend runtime عمداً بدون تغییر باقی ماند تا قراردادهای موجود، idempotency، کنترل دسترسی و ساختار داده عملیاتی حفظ شوند.
- کاربر تست عملیاتی نسخه منتشرشده را موفق اعلام کرد و فاز پذیرفته شد.

### مسیرهای Backend موجود و قرارداد حفظ‌شده
- `Router.js`: `POST /events` با مجوز `EVENT_CREATE` به `EventService.create(body, params)` متصل است.
- `Router.js`: `POST /projects/:projectId/attachments` با مجوز `ATTACHMENT_UPLOAD` مسیر upload موجود است.
- `EventService.js:create` و `_createUnlocked_`: منطق ثبت و idempotency بدون تغییر باقی ماند.
- `AttachmentService.js`: اعتبارسنجی دسترسی/مالکیت و ذخیره پیوست در مسیر موجود حفظ شد.
- شیت‌های عملیاتی مرتبط از جمله `13_Events`, `15_Attachments`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `34_EventFormData` تغییر نکردند.
- هیچ API، Sheet، ستون، schema، permission یا migration جدیدی ایجاد نشد.

### آزمون و ادغام
- Backend PR #22 صرفاً مستندات فاز را تغییر داد و با squash در commit `b3c0e2f75af57388a72ebdf5307fabd488c20fae` روی `main` ادغام شد.
- انتشار Backend لازم نبود، چون فایل اجرایی یا قرارداد API تغییر نکرد.
- Frontend مربوط به همین قابلیت در PR #44 و commit `d9bf675612e3deffadcdf723080cb4606143c452` ادغام شد و GitHub Pages deploy در Run `42397792898` موفق بود.
- کاربر تست عملیاتی نسخه منتشرشده را موفق اعلام کرد.
- زمان‌بندی دقیق هر درخواست در محیط زنده اندازه‌گیری نشده است؛ این سند ادعای حذف قطعی تمام تأخیر عددی را ثبت نمی‌کند.


## 2026-11-07 — مودال مرحله‌به‌مرحله پیشرفت ثبت رویداد (ثبت سازگاری Backend)

### هدف و محدوده
- مودال پیشرفت ثبت رویداد در Frontend به مسیرهای عملیاتی موجود متصل شد تا وضعیت آپلود پیوست، ثبت رویداد و تازه‌سازی فهرست را نمایش دهد.
- بررسی قراردادها نشان داد تغییر اجرایی Backend لازم نیست؛ Backend runtime و داده‌های عملیاتی بدون تغییر باقی ماندند.
- مالک محصول نسخه عملیاتی Frontend را تست و موفقیت را تأیید کرد؛ فاز در تاریخ 2026-11-07 بسته شد.

### قراردادهای Backend حفظ‌شده
- `Router.js`: `POST /projects/:projectId/attachments` با مجوز `ATTACHMENT_UPLOAD` و `POST /events` با مجوز `EVENT_CREATE`.
- `EventService.js:create/_createUnlocked_`: ثبت رویداد و idempotency موجود حفظ شدند.
- `AttachmentService.js`: کنترل tenant/مالکیت و ذخیره پیوست در مسیر موجود حفظ شدند.
- مسیر اصلاح پاسخ فرم `PUT /events/:eventId/forms/:formId` و refresh سمت Frontend از مسیرهای موجود استفاده می‌کنند.
- شیت‌های `13_Events`, `15_Attachments`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `34_EventFormData` بدون تغییر باقی ماندند.
- هیچ endpoint، Sheet، ستون، schema، permission، migration یا داده عملیاتی تغییر نکرد.

### آزمون، ادغام و انتشار
- Backend PR #23 صرفاً مستندات را به‌روزرسانی کرد و با squash در commit `12e463dc6123e6d005a6efbd7fa5ca58637324af` روی `main` ادغام شد.
- Frontend PR #45 در commit `4a34154b857b06345c923d8b1ec69937a8db1209` ادغام و GitHub Pages در Run `42400576366` با موفقیت منتشر شد.
- Frontend checks، cross-repository QA و agent suite موفق شدند؛ ۲۰۱ تست Frontend از ۲۰۱ تست موفق شدند.
- چون Backend runtime تغییر نکرد، انتشار Apps Script/Backend لازم نبود.
- مالک محصول تست نسخه زنده را موفق اعلام کرد.


## 2026-11-07 — سازگاری Backend برای میانبر تاریخچه رویدادهای پروژه

### تصمیم معماری و قرارداد
- قابلیت میانبر «رویدادهای ثبت‌شده برای این پروژه» در Frontend و روی کارت پروژه در صفحه «رویدادها» پیاده‌سازی شد؛ Backend runtime تغییر نکرد.
- Frontend از مسیر موجود `GET /events` استفاده می‌کند؛ فیلتر پروژه با فیلد موجود `ProjectID` در همان رابط تاریخچه اعمال می‌شود.
- `Router.js`: مسیر `GET /events` با `AccessControlService.require(params, 'EVENT_VIEW')` به `EventService.list(params)` متصل است.
- tenant scoping و کنترل مجوز سرور دست‌نخورده باقی می‌مانند؛ Frontend فقط داده‌ای را فیلتر می‌کند که API مجاز برگردانده است.
- شیت موجود `13_Events` و ساختار داده آن بدون تغییر باقی ماند؛ هیچ API، permission، Sheet، ستون، schema، migration یا داده‌ای اضافه/حذف/تغییر نکرد.
- انتشار جدید Apps Script لازم نبود.

### آزمون، ادغام و پذیرش
- Backend PR #26 صرفاً مستندات سازگاری را ثبت کرد؛ Frontend PR #49 با squash در commit `9c0bed3be00e265d361b446129614a1f21945b45` ادغام شد.
- ۲۰۸ تست Frontend، Agent Suite، Cross-repository QA و Browser/Performance audit پیش از ادغام موفق شدند.
- GitHub Pages انتشار Frontend موفق شد؛ مالک محصول در 2026-11-07 تست نسخه زنده را تأیید کرد.
- تأیید شد که دکمه در صفحه رویدادها کنار CTA ثبت رویداد است، تاریخچه همان پروژه را در همان صفحه فیلتر می‌کند و مجوزهای مشاهده/tenant سرور حفظ می‌شوند.


## 2026-11-07 — بهینه‌سازی بارگذاری فهرست انواع رویداد

### هدف و نتیجه پذیرش
- هدف: کاهش تأخیر دریافت انواع رویداد بدون تغییر ظاهر، ترتیب، رفتار انتخاب‌گر، قواعد گردش‌کار، مجوزها یا مسیرهای ثبت.
- مالک محصول آزمون نسخه عملیاتی را موفق اعلام کرد؛ فاز با تأیید صریح ایشان بسته شد.

### پیاده‌سازی Backend
- شیت منبع همچنان `11_EventTypes` و repository مرجع `EventTypeRepository.js` است.
- `EventTypeRepository.getAllCached()` داده خام را با ScriptCache و کلید `PMS_EVENT_TYPES_READ_V1` به مدت ۶۰ ثانیه نگه می‌دارد؛ محدودیت اندازه رعایت می‌شود و در خطا/داده نامعتبر به خواندن اصلی Sheets بازمی‌گردد.
- `EventTypeRepository.invalidateReadCache()` پس از موفقیت عملیات `insert`، `update` و `delete` کش را باطل می‌کند.
- `EventTypeService.js:list` و `EventService.js:workflowProgress` از خواندن کش‌شده استفاده می‌کنند. فیلترهای tenant/permission همچنان در لایه Service اعمال می‌شوند.
- قرارداد API، ساختار Sheet و schema تغییر نکردند.

### Frontend و سازگاری
- رفتار اصلی `js/modules/events.js` و `index.html` به baseline قبلی بازگردانده شد؛ منطق انتخاب‌گر، `refreshEventTypeOptions` و انتظار پاسخ `workflow-progress` تغییر نکرد.
- کش مرورگر موجود در `PMS.Api.getCached('/event-types', ...)` و in-flight deduplication در `js/core/api.js` حفظ شدند؛ مسیر موازی یا API جدیدی ایجاد نشد.

### آزمون و انتشار
- کاربر تأیید کرد انتقال کد Backend به Apps Script از workflow موجود انجام شده است؛ این انتقال به‌تنهایی به‌معنای deploy وب‌اپ نیست.
- کاربر پس از بررسی نسخه عملیاتی، موفقیت تست افزایش سرعت را تأیید کرد.
- نتیجه پذیرش: حفظ رفتار قبلی و عملکرد موفق کش کوتاه‌مدت در استفاده عملیاتی.
