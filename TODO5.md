## 🎯 Current Objective

فاز: بهبود تجربه کاربری صف پروژه‌ها در صفحه ثبت رویدادها (نسخه عملیاتی PMS)

هدف:
1. فعال بودن پیش‌فرض تب «پروژه‌های در حال انجام».
2. بازطراحی کارت پروژه‌ها با تصویر در سمت چپ و حدود ۵۰٪ عرض کارت، اطلاعات در سمت راست و نمایش وضعیت با پالت رنگی مناسب.
3. باز شدن تصویر پروژه در نمایشگر بزرگ با امکان زوم، کوچک‌نمایی و بستن.
4. جایگزینی دکمه ثبت رویداد در صف تکمیل‌شده با «درخواست ثبت تغییرات»؛ فعلاً فقط پیام «این امکان فعلاً در دسترس نیست و به‌زودی فعال می‌شود» نمایش داده شود.
5. حفظ معماری فعلی، APIها، مجوزها، دسته‌بندی صف‌ها و مسیر اصلی ثبت رویداد؛ بدون تغییر Backend یا Database مگر آنکه کشف فنی ضرورت قطعی نشان دهد.

مخازن مجاز:
- Backend: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION
- Frontend: https://github.com/Saeidesl/PRSPRO2-PRODUCTION

شاخه کاری این فاز در هر دو مخزن:
- feature/event-queue-card-ux-20261106
شاخه مبنا: main
هیچ تغییری روی main یا مخازن توسعه مجاز نیست.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### وضعیت مخازن و سابقه
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`
- هر دو شاخه کاری از `main` ساخته شده‌اند: `feature/event-queue-card-ux-20261106`.
- TODO5.md در هر دو مخزن پیش از شروع برابر «Ready for the next feature» بود؛ ARCHITECTURE.md و Log فاز قبلی مطالعه شد.
- آخرین commitهای مشاهده‌شده پیش از ایجاد شاخه: Backend `761339c6906a07077cec3086830da1a3e1e64a24`، Frontend `85d9f871a56109383df1cc43e5b1113ad60eaefb`.
- فاز قبلی مرکز عملیات/سوابق رویدادها تکمیل و پذیرش دستی شده است. محدودیت تاریخی: انتشار Pages بعد از PR #9 مستقلاً تأیید نشده بود.

### Frontend — مسیرهای فعلی و جریان داده
- `pages/events.html`
  - میزبان صف‌های پروژه با `#event-project-queues`.
  - تب‌ها: `.event-queue-tab[data-queue="pending|progress|completed"]`.
  - پنل‌ها: `#event-panel-pending`, `#event-panel-progress`, `#event-panel-completed`.
  - ظرف کارت‌ها: `#event-queue-pending`, `#event-queue-progress`, `#event-queue-completed`.
  - در نسخه فعلی pending در HTML به‌صورت پیش‌فرض active و progress hidden است؛ باید پیش‌فرض به progress منتقل شود و ARIA/tabIndex/hidden هماهنگ بمانند.
- `js/modules/events.js`
  - `Events.init()`: بارگذاری اولیه و تنظیم مجوزهای موجود.
  - `Events.bindEvents()`: delegation کلیک برای تب‌ها و دکمه `.event-queue-register-button`؛ کلیدهای جهت‌دار/Home/End برای تب‌ها.
  - `Events.activateQueue(key)`: هماهنگ‌سازی کلاس active، aria-selected، tabIndex و hidden پنل.
  - `Events.getLatestEventByProject(events)`: انتخاب آخرین رویداد غیر VOID بر اساس CreatedAt و fallback به OccurredAt.
  - `Events.renderProjectQueues()`: تجمیع فعالیت‌ها و تولید کارت؛ صف‌ها از روی رویدادهای مرتبط کاربر/واحد ساخته می‌شوند. تکمیل صف فعلی با IsWorkCompletion رویداد یا نوع رویداد تعیین می‌شود؛ این منطق تغییر نکند.
  - `Events.loadQueueProjectImages(projects)` و `Events.applyQueueProjectImages()`: بارگذاری lazy تصویر PROFILE، استفاده از cache و مجوز ATTACHMENT_VIEW؛ این مسیر حفظ و برای بازکردن تصویر reuse شود.
  - کارت فعلی `.event-queue-project`، بخش `.event-queue-project-main`، تصویر `.event-queue-project-media` و دکمه `.event-queue-register-button` دارد.
  - ثبت رویداد با `Events.openForm()` و `preselectedProjectId` از مسیر موجود انجام می‌شود؛ مسیر موازی ایجاد نشود.
- `css/events.css`
  - استایل‌های صف در بخش `.event-project-queues`, `.event-queue-list`, `.event-queue-project`, `.event-queue-project-media`, `.event-queue-project-copy` و media queryهای 900/640/560px قرار دارند.
  - تم از CSS variables موجود نظیر `--color-success-bg`, `--color-warning-bg`, `--color-danger-bg`, `--color-border`, `--color-surface` استفاده می‌کند.
- `js/components/modal.js`
  - `PMS.Modal.open(options)` و `PMS.Modal.close(id)` زیرساخت عمومی Modal با دکمه بستن، Escape، بستن با overlay و بازگرداندن focus است.
  - برای پیش‌نمایش تصویر از همین زیرساخت استفاده شود؛ Modal جدید موازی ساخته نشود.
- `js/components/alert.js`
  - `PMS.Alert.info(message, duration)` پیام اطلاع‌رسانی موجود را نشان می‌دهد.
- `index.html`
  - ترتیب بارگذاری ماژول‌ها و CSS در این فایل است؛ پس از تغییر دارایی‌های Frontend مقدار version/query string مربوط به فایل‌های تغییرکرده برای cache busting به‌روزرسانی شود.
- `js/modules/projects.js`
  - منبع reuse منطق بارگذاری تصویر کارت پروژه؛ از cache و loader موجود استفاده شود و درخواست تکراری یا مسیر تصویر موازی ایجاد نشود.

### Backend و Database — قراردادهای موجود که باید حفظ شوند
- `Router.js` مسیر موجود `GET /events` را با مجوز `EVENT_VIEW` به `EventService.list(params)` متصل می‌کند.
- `EventService.js` داده رویدادها را با tenant/project access محدود می‌کند.
- شیت رویدادها `13_Events` با فیلدهای ProjectID, EventTypeID, PerformedBy, CreatedBy, DepartmentID, OccurredAt, CreatedAt, Status.
- شیت پیوست‌ها `15_Attachments`؛ تصویر پروفایل با EntityType=PROJECT و AttachmentType=PROFILE.
- APIهای موجود مرتبط: `GET /events`, `GET /project-card-images`, `GET /attachments/:attachmentId/download`.
- Backend فعلاً برای این نیاز تغییر لازم ندارد. API، payload، permission، Sheet یا schema جدید نساز.
- هیچ deploymentی در این فاز بدون تأیید جداگانه انجام نشود.

### قواعد تجربه کاربری و پذیرش
- RTL، موبایل‌فرست، تم روشن/تیره، دسترس‌پذیری صفحه‌کلید و رفتار focus حفظ شود.
- تصویر در سمت چپ کارت و حدود نصف عرض کارت باشد؛ در موبایل اندازه و ارتفاع کنترل‌شده داشته باشد و اطلاعات قابل خواندن بماند.
- تصویر فقط در صورت داشتن URL/cache مجاز قابل کلیک باشد؛ placeholder یا نبود مجوز نباید باعث بازشدن پیش‌نمایش خالی شود.
- زوم با کنترل‌های واضح و قابل استفاده در موبایل و دسکتاپ؛ بستن با دکمه، Escape و overlay.
- وضعیت‌ها از پالت معنایی ملایم موجود استفاده کنند: pending=danger، progress=warning، completed=success؛ متن و کنتراست خوانا باقی بماند.
- در صف completed فقط CTA درخواست تغییرات نشان داده شود و هیچ فرم/API/ذخیره‌سازی/رویدادی فراخوانی نشود؛ کلیک فقط PMS.Alert.info را نمایش دهد.
- صف‌ها و منطق تشخیص وضعیت پروژه، تاریخچه رویدادها، فیلترها، ثبت سریع/کامل و idempotency بدون تغییر بمانند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - *Log:* در هر دو مخزن عملیاتی، شاخه‌ها، آخرین commitها، TODO5.md و ARCHITECTURE.md بررسی شدند. مسیرهای واقعی صفحه و کارت‌ها در `pages/events.html`، `js/modules/events.js` و `css/events.css`، زیرساخت تصویر در `Events.loadQueueProjectImages` و `Events.applyQueueProjectImages`، Modal عمومی در `js/components/modal.js` و پیام اطلاع‌رسانی در `js/components/alert.js` ردیابی شد. منطق دسته‌بندی صف‌ها در `Events.renderProjectQueues` بر اساس فعالیت مرتبط و IsWorkCompletion است و باید حفظ شود. قرارداد Backend شامل `GET /events`، `GET /project-card-images` و `GET /attachments/:attachmentId/download` و شیت‌های `13_Events` و `15_Attachments` بررسی شد. نتیجه: نیاز اجرایی فعلاً Frontend-only است و هیچ تغییر Backend/Database لازم نیست. شاخه کاری `feature/event-queue-card-ux-20261106` در هر دو مخزن از main ایجاد شد.
  - محدوده فاز به سه Macro-Task اجرایی تقسیم شد.

- [ ] **Task 2 — تب پیش‌فرض و بازطراحی کارت پروژه‌ها (IN PROGRESS)**
  - فعال‌سازی پیش‌فرض «پروژه‌های در حال انجام» در HTML/JS با ARIA و hidden هماهنگ.
  - بازچینی کارت: تصویر در سمت چپ با حدود ۵۰٪ عرض و اطلاعات در سمت راست؛ حفظ دکمه‌های عملیاتی و سازگاری موبایل.
  - نمایش رنگ وضعیت صف با پالت معنایی موجود و بدون تغییر الگوریتم دسته‌بندی.
  - آزمون رگرسیون برای تب پیش‌فرض، وضعیت ARIA و markup/layout کارت‌ها.

- [ ] **Task 3 — پیش‌نمایش تعاملی تصویر پروژه**
  - اتصال کلیک thumbnail مجاز به PMS.Modal موجود؛ نمایش تصویر بزرگ، زوم/کوچک‌نمایی و کنترل اندازه برای صفحه موبایل.
  - دکمه بستن، Escape، overlay، focus و پاک‌سازی منبع/منابع احتمالی حفظ شود.
  - جلوگیری از بازشدن تصویر placeholder، تصویر ناموجود یا کاربر فاقد مجوز.
  - آزمون رگرسیون و بررسی دسترس‌پذیری.

- [ ] **Task 4 — CTA درخواست تغییرات برای پروژه‌های تکمیل‌شده و QA نهایی**
  - حذف دکمه ثبت رویداد از کارت‌های صف completed و جایگزینی با «درخواست ثبت تغییرات».
  - کلیک فقط پیام اطلاع‌رسانی موقت را با PMS.Alert.info نمایش دهد؛ هیچ API یا ذخیره‌سازی فراخوانی نشود.
  - اجرای تست‌های Frontend مرتبط، بررسی syntax، CI، سازگاری تم/موبایل و رگرسیون ثبت رویداد و تصاویر.
  - تحویل برای تست دستی مالک محصول؛ تا دریافت تأیید، Task تکمیل نشود و فاز/ادغام بسته نشود.
