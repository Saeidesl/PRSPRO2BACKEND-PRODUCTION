## 🎯 Current Objective

فاز: بهینه‌سازی سرعت بارگذاری و تجربه انتظار در صفحه ثبت و پیگیری رویدادها (نسخه عملیاتی PMS)

هدف:
1. فعال بودن پیش‌فرض تب «پروژه‌های در حال انجام».
2. بازطراحی کارت پروژه‌ها با تصویر در سمت چپ و حدود ۵۰٪ عرض کارت، اطلاعات در سمت راست و نمایش وضعیت با پالت رنگی مناسب.
3. باز شدن تصویر پروژه در نمایشگر بزرگ با امکان زوم، کوچک‌نمایی و بستن.
4. جایگزینی دکمه ثبت رویداد در صف تکمیل‌شده با «درخواست ثبت تغییرات»؛ فعلاً فقط پیام «این امکان فعلاً در دسترس نیست و به‌زودی فعال می‌شود» نمایش داده شود.
5. کاهش زمان نمایش محتوای قابل استفاده و حذف پردازش‌ها/رندرهای تکراری در صفحه.
6. جایگزینی متن‌های ساده بارگذاری با اسکلت متناسب با ساختار واقعی کارت‌ها، پروژه‌ها و جدول سوابق.
7. حفظ معماری فعلی، APIها، مجوزها، دسته‌بندی صف‌ها و مسیر اصلی ثبت رویداد؛ تغییر Backend فقط در صورت اثبات ضرورت با اندازه‌گیری.

مخازن مجاز:
- Backend: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION
- Frontend: https://github.com/Saeidesl/PRSPRO2-PRODUCTION

شاخه اجرای Task 3:
- feature/event-queue-image-preview-20261106
مقصد ادغام: main (PRهای #15 فرانت‌اند و #7 مستندسازی بک‌اند با تأیید مالک محصول ادغام شدند).
شاخه کاری Task 4 در هر دو مخزن:
- feature/event-queue-completed-cta-20261106
شاخه کاری تسک‌های جدید در هر دو مخزن:
- feature/events-page-performance-skeleton-20261106
شاخه مبنا: main
هیچ تغییر اجرایی مستقیمی روی main یا مخازن توسعه مجاز نیست.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### بررسی اولیه فاز جدید — سرعت بارگذاری و Skeleton

#### یافته‌های تأییدشده در Frontend main
- pages/events.html: متن‌های بارگذاری اولیه در #events-recent-projects، سه ظرف صف pending/progress/completed و #events-loading وجود دارند.
- js/modules/events.js → Events.load(): منابع /events، /projects و /event-types با Promise.all موازی دریافت می‌شوند و PMS.Api.getCached() برای هر سه استفاده شده است.
- در مسیر cache، Events.load() ابتدا داده موجود را render می‌کند و سپس refresh پس‌زمینه را ادامه می‌دهد؛ این رفتار باید حفظ شود.
- در Events.load()، callbackهای onRefresh هر منبع جداگانه renderFilters() و applyFilters() را اجرا می‌کنند؛ در پایان Promise.all نیز دوباره applyFilters() اجرا می‌شود. این یک نقطه مشخص برای کاهش رندرهای تکراری است.
- Events.applyFilters() در هر اجرا renderProjectQueues() را فراخوانی می‌کند و سپس mapهای پروژه/نوع رویداد و فیلترهای تاریخچه را آماده می‌کند؛ هزینه این پردازش با حجم داده باید اندازه‌گیری و در صورت نیاز بهینه شود.
- Events.renderProjectQueues() کارت‌ها را می‌سازد و سپس loadQueueProjectImages() را آغاز می‌کند؛ skeleton کارت باید بدون انتظار برای تصاویر به محتوای واقعی تبدیل شود و تصاویر همچنان lazy/background باقی بمانند.
- js/modules/projects.js → getProjectCardAttachments(): متادیتای تصاویر از /project-card-images دریافت می‌شود و کش پنج‌دقیقه‌ای و promise مشترک دارد؛ loadOneProjectCardImage() نیز کش IndexedDB را برای فایل تصویر به‌کار می‌گیرد.
- js/core/api.js → PMS.Api.getCached(): در صورت وجود cache داده فوراً بازگردانده و refresh پس‌زمینه انجام می‌شود؛ رفتار TTL و مدیریت درخواست‌های هم‌زمان باید هنگام بهینه‌سازی حفظ شود.

#### Backend و قرارداد داده
- Router.js مسیر GET /events را به EventService.list(params) متصل می‌کند.
- EventService.js و EventRepository.js منبع داده سوابق هستند. پیش از هر تغییر Backend باید زمان واقعی پاسخ، تعداد ردیف‌های خوانده‌شده و حجم payload اندازه‌گیری شود؛ تغییر schema یا API بدون ضرورت و بررسی سازگاری ممنوع است.

#### اصول اجرای این فاز
- ابتدا baseline زمان بارگذاری سرد/گرم، تعداد درخواست‌ها، حجم پاسخ و تعداد دفعات render ثبت شود.
- داده کش‌شده باید بلافاصله نمایش داده شود و refresh پس‌زمینه موجب پرش صفحه یا پاک‌شدن محتوای قابل مشاهده نشود.
- تصاویر، جدول سوابق و فرم‌های وابسته نباید مانع نمایش اولیه اسکلت/محتوای اصلی شوند.
- اسکلت‌ها باید هم‌اندازه و هم‌چیدمان با محتوای واقعی، RTL، responsive و سازگار با تم روشن/تاریک باشند؛ در حالت کاهش حرکت انیمیشن غیرفعال یا محدود شود.
- اسکلت پس از موفقیت، خطا، پاسخ خالی و retry باید به وضعیت درست تبدیل شود؛ اسکلت نباید بی‌نهایت باقی بماند.
- هیچ متن «در حال بارگذاری» در بخش‌های هدف باقی نماند؛ متن‌های خطا و حالت خالی همچنان معنای مستقل خود را حفظ کنند.

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

- [x] **Task 2 — تب پیش‌فرض و بازطراحی کارت پروژه‌ها**
  - *Log:* Frontend: در `pages/events.html` تب «پروژه‌های در حال انجام» به‌عنوان تب پیش‌فرض فعال شد؛ کارت‌ها در `js/modules/events.js` و `css/events.css` بازطراحی شدند تا تصویر و اطلاعات پروژه، وضعیت واقعی پروژه و رنگ معنایی مناسب نمایش داده شود. خطای runtime در `Events.renderProjectQueues()` با جایگزینی `this.getProjectStatusTone` با `Events.getProjectStatusTone` رفع و آزمون رگرسیون در `tests/event-queue-project-cards.test.js` اضافه شد. سپس نسخه asset در `index.html` از `20261106-event-queue-card-1` به `20261106-event-queue-render-fix-3` تغییر کرد تا کش نسخه قدیمی پاک شود. PR #13 با Merge Commit `28a5649b9d140937e5464e768cc24a987aeb0457` و PR #14 با Merge Commit `297bfc23b80b13edac89fe3a0cc2de798b61fef6` در Frontend `main` ادغام شدند. کاربر نمایش صحیح پروژه‌ها و رویدادها را در نسخه مورد استفاده تأیید کرد. مجموعه تست Frontend در مرحله قبل ۱۳۷ تست موفق داشت؛ برای PR #14 اجرای CI مستقلی از طریق گزارش موجود تأیید نشده و انتشار Pages نیز جداگانه تأیید نشده است. Backend/API/Database تغییری نکرد.

  - فعال‌سازی پیش‌فرض «پروژه‌های در حال انجام» در HTML/JS با ARIA و hidden هماهنگ.
  - بازچینی کارت: تصویر در سمت چپ با حدود ۵۰٪ عرض و اطلاعات در سمت راست؛ حفظ دکمه‌های عملیاتی و سازگاری موبایل.
  - نمایش رنگ وضعیت صف با پالت معنایی موجود و بدون تغییر الگوریتم دسته‌بندی.
  - آزمون رگرسیون برای تب پیش‌فرض، وضعیت ARIA و markup/layout کارت‌ها.

- [x] **Task 3 — پیش‌نمایش تعاملی تصویر پروژه**
  - *Log:* Frontend: در `js/modules/events.js` کلیک تصویر کارت به cache موجود `PMS.Modules.Projects.projectCardImages` متصل شد و با کنترل مجوز `ATTACHMENT_VIEW`/ادمین و وضعیت آماده تصویر، پیش‌نمایش از طریق `PMS.Modal.open()` موجود باز می‌شود. زوم، کوچک‌نمایی، بازگشت به اندازه اصلی، بستن با دکمه/Escape/overlay، پشتیبانی Enter/Space، متن جایگزین، رفتار responsive و fallback خطای بارگذاری پیاده‌سازی شد. پاک‌سازی `src` و `srcset` تصویر هنگام بستن Modal انجام می‌شود. در `css/events.css` استایل‌های نمایشگر و کنترل‌ها تکمیل و در `index.html` نسخه cache-busting به `20261106-event-queue-image-preview-1` تغییر کرد. تست‌های `tests/event-queue-project-cards.test.js` و `tests/workflow-management.test.js` اصلاح/تکمیل شدند. CI روی آخرین commit فرانت‌اند `1fd8c555d2d4f4cf9637b81d8d5db37d971a1160` موفق شد: ۱۳۳ تست Frontend و بررسی‌های Cross-repository QA، UI performance audit و agent suite. PR Frontend #15 با Merge Commit `6c763f2b69c5cb0535116b079c8fb5314937a65a` و PR مستندسازی Backend #7 با Merge Commit `81383b3adc81b2cbe2c0fbc659f4550003c113b3` در `main` ادغام شدند. هیچ API، Sheet، schema یا مسیر ذخیره‌سازی جدیدی ایجاد نشد و کد اجرایی Backend تغییر نکرد. انتشار GitHub Pages پس از ادغام آغاز شد؛ پذیرش دستی کاربر در 2026-11-06 موفق اعلام شد. 
  - نتیجه تست دستی مالک محصول: نمایش پیش‌نمایش و کنترل‌های زوم/بستن در نسخه مورد استفاده موفق بود؛ Task پذیرفته شد.

- [x] **Task 4 — CTA درخواست تغییرات برای پروژه‌های تکمیل‌شده و QA نهایی**
  - *Discovery Log:* پس از تأیید تست Task 3، وضعیت شاخه‌های `main` در هر دو مخزن و آخرین commitها بررسی و شاخه کاری مستقل `feature/event-queue-completed-cta-20261106` از main ایجاد شد. در Frontend، مسیر تولید کارت در `js/modules/events.js → Events.renderProjectQueues()` (حدود خطوط 934–951) در حال حاضر برای همه صف‌ها یکسان دکمه `.event-queue-register-button` را تولید می‌کند؛ delegation کلیک در `Events.bindEvents()` (حدود خطوط 213–218) مستقیماً `Events.openForm()` را اجرا می‌کند. صف تکمیل‌شده با `definition.key === 'completed'` از قبل در داده کارت مشخص است؛ بنابراین راهکار باید در همان renderer و همان event delegation پیاده شود: CTA اختصاصی فقط برای completed و پیام موقت از `PMS.Alert.info`، بدون فراخوانی فرم/API یا ذخیره‌سازی. تست‌های موجود در `tests/event-queue-project-cards.test.js` محل افزودن پوشش رگرسیون برای تفکیک CTA و عدم اجرای مسیر ثبت هستند. Backend/Database/Sheets/API تغییری لازم ندارند.
  - حذف دکمه ثبت رویداد از کارت‌های صف completed و جایگزینی با «درخواست ثبت تغییرات».
  - کلیک فقط پیام اطلاع‌رسانی موقت را با PMS.Alert.info نمایش دهد؛ هیچ API یا ذخیره‌سازی فراخوانی نشود.
  - اجرای تست‌های Frontend مرتبط، بررسی syntax، CI، سازگاری تم/موبایل و رگرسیون ثبت رویداد و تصاویر.
  - تحویل برای تست دستی مالک محصول؛ تا دریافت تأیید، Task تکمیل نشود و فاز/ادغام بسته نشود.
  - *Log:* در Frontend، فایل `js/modules/events.js` در `Events.renderProjectQueues()` برای صف `completed` دکمه `.event-queue-change-request-button` با عنوان «درخواست ثبت تغییرات» تولید می‌کند؛ در `Events.bindEvents()` کلیک این دکمه فقط `PMS.Alert.info('این امکان فعلاً در دسترس نیست و به‌زودی فعال می‌شود')` را اجرا کرده و پیش از مسیر `.event-queue-register-button` بازمی‌گردد. مسیر ثبت رویداد برای صف‌های pending و progress با `Events.openForm()` بدون تغییر حفظ شد. آزمون رگرسیون در `tests/event-queue-project-cards.test.js` اضافه و پس از اصلاح assertion اجرا شد. Commit پیاده‌سازی `8d2854db33f5ad6d2dd9dc96f7061c9e91ecdfaf` و commit اصلاح آزمون `d7486dcf1c31ffa64d1a0efd6129631bd6500c1a` در شاخه عملیاتی فرانت‌اند ثبت شدند. CI نهایی روی commit `d7486dcf...` شامل Frontend checks، PMS frontend agent suite، Cross-repository QA و comprehensive UI performance audit همگی موفق شدند؛ بررسی browser-audit نیز موفق بود. PR فرانت‌اند #16 و PR مستندسازی Backend #8 هر دو باز و قابل ادغام باقی ماندند؛ هیچ ادغامی در این مرحله انجام نشد. در Backend فقط TODO5.md مستندسازی شد (commit `1530295ca3d363dc4842a93fe3a12a8ac097e445`) و هیچ کد اجرایی، API، Sheet یا Database تغییر نکرد. مالک محصول در تاریخ 2026-11-06 تست دستی CTA، عدم بازشدن فرم/ثبت رویداد، حفظ ثبت عادی در صف‌های دیگر و سازگاری نمایشی را تأیید کرد؛ Task 4 پذیرفته شد.


## 📋 Macro-Task Queue & Implementation Log — ادامه فاز

- [x] **Task 5 — Discovery & Planning: تحلیل سرعت و وضعیت‌های بارگذاری صفحه**
  - *Log:* در شاخه main هر دو مخزن عملیاتی، TODO5.md و ARCHITECTURE.md مطالعه و آخرین commitها بررسی شدند. شاخه مستقل feature/events-page-performance-skeleton-20261106 از commitهای Frontend a61de2cfaf8e92509e69e0465c4fe4dded30ea19 و Backend d260772631a1bfa3adef140feb28a4b289dd225d ساخته شد. در Frontend فایل‌های pages/events.html، js/modules/events.js، js/core/api.js، js/modules/projects.js و css/events.css بررسی شدند. سه درخواست اصلی /events، /projects و /event-types هم‌زمان اجرا می‌شوند و از cache استفاده می‌کنند؛ اما callbackهای onRefresh چند بار render را فعال می‌کنند و applyFilters() در هر بار renderProjectQueues() را نیز اجرا می‌کند. بارگذاری متادیتای تصاویر مسیر جداگانه با cache پنج‌دقیقه‌ای و cache تصویر IndexedDB دارد. در HTML متن‌های بارگذاری اولیه برای کارت‌های پروژه و جدول سوابق وجود دارد. Backend مسیر /events را به EventService.list(params) وصل می‌کند. نتیجه: ابتدا بهینه‌سازی Frontend و اندازه‌گیری baseline اولویت دارد؛ هیچ تغییر Backend/Database تا اثبات گلوگاه واقعی برنامه‌ریزی نمی‌شود.

- [ ] **Task 6 — بهینه‌سازی زمان بارگذاری و کاهش رندر/درخواست تکراری (IN PROGRESS)**
  - اندازه‌گیری زمان بارگذاری سرد و گرم، تعداد درخواست‌ها، زمان پاسخ و دفعات render.
  - حذف renderهای تکراری ناشی از refresh جداگانه منابع و اجرای چندباره applyFilters()، بدون از دست‌رفتن نمایش سریع cache.
  - بهینه‌سازی آماده‌سازی mapها، تجمیع صف‌ها و محاسبات تاریخچه؛ جلوگیری از پردازش مجدد داده بدون تغییر فیلتر.
  - اطمینان از اینکه بارگذاری تصویر و داده‌های فرعی مانع نمایش سریع محتوای اصلی نیستند.
  - فقط در صورت وجود شواهد، بررسی و اصلاح پاسخ Backend یا خواندن Google Sheets با حفظ قرارداد API و داده.
  - معیار پذیرش: بهبود قابل اندازه‌گیری زمان نمایش محتوای اولیه و زمان آماده‌شدن تعامل، بدون افزایش خطا یا تغییر رفتار صف‌ها/فیلترها.

- [ ] **Task 7 — جایگزینی متن‌های بارگذاری با Skeleton UI**
  - ساخت اسکلت کارت پروژه با ساختار و ابعاد نزدیک به کارت واقعی در صف‌های سه‌گانه.
  - ساخت اسکلت برای لیست پروژه‌های ورودی و جدول سوابق رویدادها.
  - نمایش فوری اسکلت در بارگذاری اولیه بدون cache؛ در حضور cache محتوای cache‌شده فوری نمایش داده شود و اسکلت جایگزین محتوای موجود نشود.
  - طراحی انیمیشن ملایم و سازگار با RTL، موبایل، تم روشن/تیره و prefers-reduced-motion.
  - تبدیل صحیح skeleton به محتوا، empty، error یا retry و جلوگیری از باقی‌ماندن skeleton در خطاها.
  - آزمون رگرسیون برای cache hit/miss، پاسخ دیرهنگام، خطا و داده خالی.
