## 🎯 Current Objective

فاز: ارتقای کارت پروژه‌ها در مرکز عملیات و توسعه فیلتر و مرتب‌سازی سوابق رویدادها

هدف:
1. نمایش تصویر پروفایل و آخرین رویداد ثبت‌شده هر پروژه روی کارت‌های بخش «کارهای من».
2. نمایش پیش‌فرض رویدادهای ثبت‌شده توسط کاربر جاری در سوابق.
3. ارائه فیلترهای ترکیبی و جمع‌شونده برای پروژه، ثبت‌کننده، واحد، نوع رویداد، وضعیت و بازه‌های تاریخی.
4. امکان مرتب‌سازی سوابق از جدید به قدیم و از قدیم به جدید.

محدوده و اصول:
- فقط مخازن عملیاتی PRSPRO2BACKEND-PRODUCTION و PRSPRO2-PRODUCTION.
- توسعه روی شاخه feature/project-cards-event-filters در هر دو مخزن؛ شاخه main فقط مبنای شاخه کاری است و مستقیم تغییر نمی‌کند.
- حفظ APIها، فرم ثبت، Workflow، مجوزها، tenant isolation و ساختار داده موجود.
- عدم ایجاد شیت، endpoint، مسیر ثبت یا سیستم موازی.
- مبنای «رویداد ثبت‌شده توسط کاربر» فیلد CreatedBy است؛ PerformedBy به‌تنهایی معیار ثبت‌کننده نیست.
- مبنای «آخرین رویداد ثبت‌شده» تاریخ CreatedAt است و در نبود آن OccurredAt fallback می‌شود. مرتب‌سازی سوابق نیز بر اساس تاریخ ثبت است؛ تاریخ وقوع همچنان فیلتر مستقل خود را دارد.
- در حالت پیش‌فرض، فقط رویدادهای متعلق به کاربر جاری در بخش سوابق نمایش داده می‌شود؛ سایر حالت‌ها فقط در محدوده مجوزهای سرور قابل مشاهده‌اند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن، شاخه و پشته
- Backend: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION
- Frontend: https://github.com/Saeidesl/PRSPRO2-PRODUCTION
- شاخه کاری هر دو: feature/project-cards-event-filters
- مبنای ایجاد شاخه: main در هر مخزن.
- Backend: Google Apps Script V8؛ Google Sheets پایگاه داده.
- Frontend: HTML/CSS/JavaScript، رابط فارسی RTL و responsive.
- API از PMS.Api مصرف می‌شود؛ درخواست موازی مستقیم یا لایه ارتباطی جدید نسازید.

### Frontend — نقاط اتصال کشف‌شده
- pages/events.html:
  - میزبان مرکز عملیات، صف‌های پروژه و بخش «رویدادهای ثبت‌شده».
  - فیلتر جمع‌شونده فعلی: #events-filter-toggle و #events-filter-content.
  - کنترل‌های فعلی HTML فقط شامل event-project-filter، event-type-filter و event-status-filter به‌علاوه event-search هستند.
  - کنترل‌های creator، department و تاریخ که در منطق applyFilters ارجاع شده‌اند در HTML فعلی وجود ندارند؛ این ناهماهنگی باید در Task 3 تکمیل شود.
- js/modules/events.js:
  - Events.init و Events.bindEvents: راه‌اندازی صفحه و event handlers.
  - Events.events، Events.projects و Events.eventTypes: داده‌های بارگذاری‌شده فعلی.
  - Events.getLatestEventByProject(events): انتخاب آخرین رویداد غیر VOID هر پروژه با اولویت CreatedAt و fallback به OccurredAt.
  - Events.renderProjectQueues: تجمیع رویدادها بر اساس ProjectID و ساخت کارت‌های صف؛ نمایش آخرین رویداد، ثبت‌کننده و تاریخ ثبت روی کارت.
  - Events.loadQueueProjectImages و Events.applyQueueProjectImages: اتصال کارت‌های صف به metadata و دانلود تصویر PROFILE از ماژول موجود Projects با مجوز ATTACHMENT_VIEW، cache و IntersectionObserver.
  - Events.applyFilters: منطق فیلتر محلی موجود؛ فیلترهای project/type/status/creator/department/search و occurred/created date range را می‌خواند.
  - Events.render: نمایش دسکتاپ و موبایل سوابق.
  - Events.creatorValue: نام نمایشی ثبت‌کننده از CreatorName/CreatedByName/CreatedBy.
  - Events.departmentValue: نام واحد از DepartmentName/DepartmentTitle/DepartmentID.
  - Events.formatDate و Events.statusText: نمایش تاریخ و وضعیت.
  - برای فیلتر هویت، از شناسه CreatedBy و شناسه کاربر جاری در PMS.Router.getUser() استفاده شود؛ مقایسه نام نمایشی برای کنترل دسترسی/فیلتر هویتی قابل اتکا نیست.
- js/modules/projects.js:
  - الگوی موجود تصویر کارت پروژه: getProjectCardAttachments، loadProjectCardImages، loadOneProjectCardImage و applyProjectCardImagesToCards.
  - تصاویر از metadata پیوست‌ها انتخاب می‌شوند؛ EntityType=PROJECT، AttachmentType=PROFILE، MIME تصویری و وضعیت غیرحذف‌شده.
  - بارگذاری تصویر lazy و cache شده است؛ الگوی موجود باید تا حد امکان reuse شود، بدون ایجاد درخواست تکراری برای هر کارت.
- js/modules/project-images.js:
  - مدیریت فایل‌های پروژه و نوع PROFILE با عنوان «عکس پروفایل پروژه».
- css/events.css:
  - استایل‌های مرکز عملیات و سوابق؛ استایل‌های جدید در همین معماری/فایل موجود توسعه داده شوند.
- index.html:
  - محل بارگذاری اسکریپت‌ها و cache-busting نسخه assetها؛ پس از تغییر فایل‌های فرانت‌اند نسخه‌های مرتبط به‌روزرسانی شوند.

### Backend — مسیرها و داده‌های موجود
- Router.js:
  - GET /events با مجوز EVENT_VIEW به EventService.list(params) متصل است.
  - مسیرهای /events/:id و جزئیات/فرم/داده رویداد موجودند؛ برای این فاز مسیر موازی ایجاد نشود.
  - GET /project-card-images مسیر موجود دریافت metadata تصاویر کارت پروژه است.
  - GET /attachments/:attachmentId/download مسیر موجود دریافت فایل با کنترل مجوز.
- EventService.js:
  - EventService.list(params) رویدادهای tenant جاری را محدود به پروژه‌های قابل مشاهده کاربر می‌کند و داده‌های تکمیلی را با _enrichEventsBatch_ غنی می‌سازد.
  - اطلاعات ProjectCode، ProjectTitle، EventTypeName، نام ثبت‌کننده و واحد در enrichment گروهی تکمیل می‌شود.
  - فیلتر پیش‌فرض CreatedBy باید در سطح نمایش Frontend اعمال شود، مگر آنکه در Discovery اجرایی مشخص شود قرارداد API/مجوز نیازمند فیلتر سروری باشد؛ هیچ‌گاه با حذف کنترل tenant یا مجوز، داده بیشتری آشکار نشود.
- EventRepository.js:
  - شیت 13_Events.
  - فیلدهای اصلی: ID، TenantID، ProjectID، EventTypeID، CreatedBy، PerformedBy، DepartmentID، OccurredAt، CreatedAt، Status.
  - متدهای موجود getAll، findByProjectId، findByEventTypeId، findByPerformedBy.
- AttachmentService.js و AttachmentRepository.js:
  - metadata فایل‌ها در شیت 15_Attachments.
  - فایل‌های تصویر پروفایل با EntityType=PROJECT و AttachmentType=PROFILE نگهداری می‌شوند.
  - دانلود از مسیر موجود و با مجوز ATTACHMENT_VIEW انجام می‌شود.
- شیت/ساختار جدید برای این قابلیت موردنیاز نیست.

### جریان داده هدف
1. GET /events داده‌های مجاز tenant و پروژه‌ها را برمی‌گرداند؛ Frontend فهرست را با CreatedBy کاربر جاری فیلتر می‌کند.
2. فیلترهای ترکیبی روی مجموعه مجاز اعمال می‌شوند؛ تغییر فیلتر و sort نباید درخواست مستقل برای هر ردیف/کارت بسازد.
3. صف پروژه‌ها یک بار بر اساس ProjectID تجمیع می‌شود؛ آخرین رویداد هر پروژه با CreatedAt و fallback به OccurredAt انتخاب می‌شود.
4. تصاویر PROFILE از مسیر metadata/cache فعلی خوانده و با بارگذاری lazy نمایش داده می‌شوند.
5. خطا/نبود تصویر نباید نمایش کارت یا صف پروژه را متوقف کند.

### ملاحظات امنیت و سازگاری
- مجوز EVENT_VIEW، ATTACHMENT_VIEW و محدودیت‌های دسترسی پروژه/tenant حفظ شود.
- فیلتر Frontend جایگزین کنترل دسترسی Backend نیست.
- رویدادهای مستقل فاقد ProjectID در سوابق باقی می‌مانند و نباید به کارت پروژه متصل شوند.
- رویداد VOID نباید به‌عنوان آخرین رویداد معتبر کارت انتخاب شود؛ وضعیت‌های دیگر مطابق رفتار فعلی و قواعد نمایش حفظ شوند.
- CreatedBy معیار ثبت‌کننده است؛ PerformedBy نشان‌دهنده انجام‌دهنده است و با ثبت‌کننده اشتباه نشود.
- تاریخ ثبت و تاریخ وقوع دو مفهوم مستقل‌اند؛ sort پیش‌فرض/انتخابی بر اساس CreatedAt و فیلتر تاریخ وقوع بر اساس OccurredAt است.
- حالت‌های loading، empty، error، موبایل، RTL، تم روشن/تیره و دسترس‌پذیری کنترل‌ها بررسی شوند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - *Log:* مخازن عملیاتی و فایل‌های TODO5.md و ARCHITECTURE.md هر دو مخزن بررسی شدند. شاخه‌های موجود، آخرین commitهای قابل مشاهده و مسیرهای اجرایی مرتبط بررسی شدند. شاخه کاری امن feature/project-cards-event-filters از main در هر دو مخزن ایجاد شد. در Frontend مسیرهای pages/events.html، js/modules/events.js، js/modules/projects.js، js/modules/project-images.js، css/events.css و index.html شناسایی شدند. توابع Events.renderProjectQueues، Events.applyFilters، Events.render، Events.creatorValue و Events.departmentValue و زیرساخت تصویر شامل getProjectCardAttachments، loadProjectCardImages و applyProjectCardImagesToCards ثبت شدند. در Backend مسیر GET /events در Router.js به EventService.list متصل است؛ داده رویدادها از EventRepository.js و شیت 13_Events با فیلدهای CreatedBy، PerformedBy، DepartmentID، EventTypeID، ProjectID، OccurredAt و CreatedAt خوانده می‌شود. تصاویر پروفایل از metadata شیت 15_Attachments با EntityType=PROJECT و AttachmentType=PROFILE و APIهای موجود /project-card-images و /attachments/:id/download دریافت می‌شوند. ناهماهنگی HTML و منطق فعلی فیلتر (کنترل‌های ثبت‌کننده/واحد/تاریخ در HTML موجود نیستند) شناسایی شد. تصمیم محصول ثبت شد: CreatedBy معیار «ثبت‌کننده جاری»، CreatedAt معیار آخرین رویداد و ترتیب سوابق با fallback کنترل‌شده به OccurredAt است. هیچ API، شیت یا فایل اجرایی تغییر نکرد.
- [ ] **Task 2 — ارتقای کارت پروژه‌ها (IN PROGRESS)**
  - نمایش تصویر PROFILE پروژه روی کارت‌های صف مرکز عملیات با reuse زیرساخت موجود و کنترل مجوز.
  - نمایش آخرین رویداد معتبر پروژه شامل نوع رویداد، تاریخ ثبت و نام ثبت‌کننده؛ بدون درخواست جداگانه برای هر کارت.
  - تجمیع یک‌مرحله‌ای رویدادها با ProjectID و انتخاب آخرین مورد بر اساس CreatedAt.
  - مدیریت نبود تصویر/رویداد، بارگذاری و خطا؛ حفظ سرعت، RTL و نمایش responsive.
  - آزمون منطق انتخاب آخرین رویداد، مجوزها، cache و رگرسیون صف‌ها.

- [ ] **Task 3 — فیلتر پیشرفته و پیش‌فرض رویدادهای کاربر جاری**
  - پیش‌فرض سوابق فقط CreatedBy کاربر جاری باشد.
  - افزودن گزینه دامنه نمایش: رویدادهای من / همه رویدادهای مجاز.
  - تکمیل فیلتر ثبت‌کننده، واحد، نوع رویداد، پروژه، وضعیت، جستجو و بازه تاریخ ثبت/وقوع.
  - افزودن کنترل‌های HTML مفقود و حفظ بخش جمع‌شونده.
  - امکان ترکیب فیلترها، پاک‌کردن فیلترها و نمایش تعداد/وضعیت فیلترهای فعال.
  - استفاده از شناسه‌های پایدار و حفظ tenant/permission scope.

- [ ] **Task 4 — مرتب‌سازی، بهینه‌سازی و آزمون پذیرش**
  - انتخاب ترتیب جدید به قدیم یا قدیم به جدید بر اساس CreatedAt.
  - حفظ انتخاب sort هنگام تغییر فیلتر و برعکس.
  - آزمون موبایل/دسکتاپ، RTL، تم‌ها، loading/empty/error، مجوزها و رگرسیون ثبت رویداد.
  - اجرای تست‌های مرتبط Frontend و Backend و بررسی قرارداد API؛ ثبت محدودیت‌های محیطی بدون ادعای آزمون زنده یا deployment تأییدنشده.
  - تحویل برای تست دستی مالک محصول؛ تا تأیید کاربر تسک جاری تکمیل نشود.

