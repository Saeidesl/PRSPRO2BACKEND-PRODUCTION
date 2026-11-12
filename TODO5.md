## 🎯 Current Objective

فاز بهینه‌سازی جابه‌جایی بین صفحات پروژه‌ها، رویدادها و فایل‌ها با جلوگیری از درخواست‌های تکراری و حفظ وضعیت صفحه.

محدوده عملیاتی:
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `main`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `main`
- اولویت: حفظ صحت داده و مجوزها، عدم تغییر غیرضروری API/DB، نمایش فوری داده و تازه‌سازی هدفمند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### معماری Backend و قراردادهای موجود
- پشته: Google Apps Script V8، Google Sheets به‌عنوان پایگاه داده، فایل‌ها در Google Drive.
- `Router.js`: نقطه مرکزی مسیریابی API و کنترل مجوز؛ دسترسی tenant-scoped باید در تمام درخواست‌ها حفظ شود.
- APIهای مصرف‌شده در این فاز:
  - `GET /projects` و `GET /projects/:id`: فهرست و جزئیات پروژه.
  - `GET /events`: فهرست رویدادها.
  - `GET /attachments`: فهرست فایل‌ها/پیوست‌ها.
  - `GET /event-types`: انواع رویداد.
  - `GET /project-dashboard/lookups`: اطلاعات کمکی وضعیت پروژه.
  - `GET /workflows/:workflowId/steps`: مراحل گردش‌کار.
  - `GET /projects/:projectId/attachments`: پیوست‌های یک پروژه.
  - `POST /events`: ثبت رویداد؛ پس از موفقیت باید فقط cacheهای وابسته نامعتبر شوند.
  - `POST /projects`, `PUT /projects/:id`: ایجاد/ویرایش پروژه؛ فقط cacheهای پروژه و وابستگی‌های واقعی به‌روزرسانی شوند.
  - `POST /projects/:projectId/attachments`, `DELETE /attachments/:attachmentId`: بارگذاری/حذف فایل.
- Payloadهای GET از queryهای موجود استفاده می‌کنند؛ نمونه مهم: `GET /projects?view=event-picker`. query و کاربر/tenant بخشی از هویت داده کش‌شده‌اند و نباید پاسخ دو query یا دو نشست با هم اشتباه شوند.
- منابع داده موجود و مرتبط:
  - `08_Projects`: رکوردهای پروژه.
  - `15_Attachments`: metadata پیوست‌ها؛ فایل واقعی در Google Drive.
  - `30_ProjectInformation` و `31_ProjectInformationHistory`: اطلاعات جاری پروژه و تاریخچه.
  - ساختار رویداد و snapshot فرم‌ها طبق `EventService.js`, `FormService.js` و تعریف‌های موجود DatabaseSetup؛ در این فاز تغییر ساختار Sheet پیش‌فرض نیست.
- سرویس‌های موجود: `ProjectService.js`, `EventService.js`, `AttachmentService.js`; کنترل دسترسی، tenant isolation، Audit و قواعد فعلی باید بدون تضعیف حفظ شوند.
- تصمیم اولیه: هیچ API موازی، Sheet جدید یا تغییر schema لازم نیست مگر کشف فنی در Task 2 ضرورت مستند و آزموده‌ای را ثابت کند. کش مرورگر جایگزین مجوز و اعتبارسنجی Backend نیست.

### وابستگی‌های Frontend که قرارداد Backend را مصرف می‌کنند
- `js/core/api.js`: `request/get/post/put/delete/getCached/getFresh/invalidate/invalidateMany`.
- `js/core/cache.js`: ذخیره‌سازی localStorage با پیشوند `PMS_CACHE_`، نسخه کش و TTL اختیاری.
- `js/core/router.js`: `loadPage()`، `executePageScripts()` و `initPageModule()`؛ محتوای `#page-content` در هر navigation جایگزین می‌شود.
- `js/modules/projects.js`: `Projects.init()`, `loadProjects()`, `loadProjectStatuses()`, `loadStageLookups()`.
- `js/modules/events.js`: `Events.init()` و بارگذاری `/events`, `/projects?view=event-picker`, `/event-types`; ثبت رویداد از `POST /events` و تازه‌سازی `reloadEvents()`.
- `js/modules/attachments.js`: `Attachments.init()`, `load()`; فهرست از `GET /attachments`.
- `js/modules/project-images.js`: پنل فایل‌های پروژه و invalidation بعد از upload/delete.
- Backend در این فاز تنها در صورت اثبات نیاز به تغییر قرارداد یا افزودن metadata نسخه/زمان تغییر بررسی می‌شود؛ هر تغییری باید backward-compatible باشد.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning [x]
- وضعیت baseline هر دو مخزن و شاخه عملیاتی `main` بررسی شد.
- `TODO5.md` و `ARCHITECTURE.md` هر دو مخزن خوانده شدند؛ TODO5 قبلی در هر دو مخزن `Ready for the next feature` بود.
- آخرین commitهای بررسی‌شده:
  - Backend: `1e43c226f3a7d605a8ea402c9acbb6120fca3b11`
  - Frontend: `ccb96c3851190d8c873920695d728c8e49136f7e`
- شاخه `main` در هر دو مخزن موجود و فعال است؛ شاخه‌های مجاز عملیاتی شناسایی شدند.
- یافته‌های قطعی از پیاده‌سازی فعلی:
  1. Router با هر جابه‌جایی، HTML صفحه را مجدداً fetch می‌کند، محتوای `#page-content` را جایگزین می‌کند و ماژول صفحه را دوباره init می‌کند؛ بنابراین DOM و state محلی صفحه از بین می‌رود.
  2. `Api.getCached()` در صورت وجود cache، داده را فوری برمی‌گرداند اما هم‌زمان در هر فراخوانی یک GET تازه هم آغاز می‌کند؛ پس cache فعلی به‌تنهایی مانع درخواست شبکه هنگام بازگشت به صفحه نیست.
  3. `Projects.loadProjects()` از `getCached('/projects', CACHE_KEY)` استفاده می‌کند، اما با cache hit نیز refresh پس‌زمینه رخ می‌دهد.
  4. `Events` برای `/events` از cache با TTL پانزده ثانیه استفاده می‌کند؛ اما `/projects?view=event-picker` مستقیماً با `Api.get` دریافت می‌شود و در cache مشترک پروژه‌ها reuse نمی‌شود.
  5. `Attachments.load()` ابتدا cache را render می‌کند اما سپس در هر init، `Api.get('/attachments')` را اجرا می‌کند.
  6. `Cache` داده را در localStorage نگه می‌دارد؛ برخی cacheها TTL دارند و برخی بدون انقضا هستند. کلیدهای عمومی باید از نظر جداسازی نشست/کاربر و مجوز بررسی شوند.
  7. `Api.get()` درخواست‌های GET هم‌زمان یکسان را deduplicate می‌کند، اما این قابلیت از درخواست‌های مجدد پس از پایان درخواست جلوگیری نمی‌کند.
- ریسک‌ها و قیود:
  - کش نباید داده نشست قبلی/کاربر دیگر را نمایش دهد؛ logout، auth-expired و تغییر token باید مرز پاک‌سازی/جداسازی داشته باشند.
  - cache key باید method/path/query و هویت نشست/tenant مؤثر را منعکس کند.
  - ثبت موفق باید invalidation هدفمند و وابستگی‌محور انجام دهد؛ از پاک‌کردن بی‌رویه تمام cacheها اجتناب شود.
  - جابه‌جایی صفحه نباید listener، observer، timer یا درخواست‌های قدیمی را تکثیر کند.
  - اطلاعات فایل و URL دانلود نباید به‌صورت ناامن یا بدون کنترل مجوز cache شوند.
- نتیجه Task 1: مسیر اصلی مسئله در چرخه عمر Router و رفتار refresh در `getCached`، به‌علاوه مصرف مستقیم GET در ماژول رویدادها و فایل‌هاست؛ در حال حاضر شواهدی از نیاز به تغییر Backend یا Database وجود ندارد.

### Task 2 — Shared Cache، سیاست freshness و حفظ وضعیت صفحه [x]
- پیاده‌سازی مشترک با تکیه بر `PMS.Api` و `PMS.Cache` موجود؛ بدون ساخت مسیر موازی.
- پیشرفت پیاده‌سازی در Frontend: گزینه `refreshCached: false` به `Api.getCached` افزوده شد تا cache معتبر بدون GET پس‌زمینه برگردد؛ cache منقضی/ناموجود همچنان از API خوانده می‌شود.
- بررسی نهایی تأیید کرد تغییر Backend، API، مجوزها یا schema شیت برای Task 2 لازم نبود؛ هیچ فایل runtime بک‌اند تغییر نکرده است. Task 2 پس از تأیید تست Product Owner بسته شده است.
- تعریف سیاست روشن برای cache hit تازه، cache منقضی، force refresh و خطای شبکه.
- جداسازی cache بر اساس نشست/کاربر و query؛ پاک‌سازی امن در خروج و تغییر نشست.
- حذف GET تکراری در navigation عادی؛ refresh فقط طبق TTL/رویداد invalidation یا درخواست دستی.
- بررسی و اصلاح lifecycle در Router برای حفظ state لازم صفحات یا بازیابی آن، بدون باقی‌ماندن DOM/listener ناسالم.
- حفظ فیلتر، جستجو، مرتب‌سازی، تب انتخابی، اسکرول و وضعیت باز/بسته بخش‌ها تا حدی که با امنیت و داده تازه سازگار باشد.
- Frontend عملیاتی روی شاخه `feat/shared-page-data-cache` تا commit `feb1b3a4aa12a088e0338b6ee856733d8ec61133` پیش رفته است: cache-first برای داده‌های هدف و بازیابی فیلتر/جستجو/مرتب‌سازی/تب/scroll در حافظه پیاده‌سازی شده؛ state با reset نشست پاک می‌شود و فرم‌های ثبت‌نشده ذخیره نمی‌شوند.
- Backend runtime، API contract، permissions و Google Sheets تغییری نکرده‌اند؛ این تصمیم بر اساس بازبینی مسیرهای موجود است.
- Frontend Regression Tests، syntax، asset QA و cross-repository QA موفق شده‌اند؛ ممیزی نهایی UI/performance هنوز در حال اجراست. هیچ merge یا deployment انجام نشده است.
- Backend/API/DB فقط در صورت نیاز اثبات‌شده؛ هیچ تغییر عملیاتی داده یا migration بدون مجوز.

- *Log:* پس از تأیید تست زنده Product Owner، Task 2 تکمیل شد. در Frontend فایل‌های `js/core/api.js` (گزینه `refreshCached:false` در `Api.getCached` برای cache hit بدون GET پس‌زمینه)، `js/modules/projects.js` (cache-first فهرست پروژه و lookup وضعیت‌ها)، `js/modules/events.js` (cache-first رویدادها، انواع رویداد و `/projects?view=event-picker`)، `js/modules/attachments.js` (cache-first فهرست پیوست‌ها)، `js/core/router.js` (ذخیره و بازیابی جستجو، فیلتر، مرتب‌سازی، تب، وضعیت پنل و موقعیت اسکرول؛ پاک‌سازی snapshot در reset نشست) و `index.html` (cache-busting assetها) تغییر کردند. تست‌های `tests/shared-page-cache.test.js` و `tests/event-project-picker-performance.test.js` و تست‌های رگرسیون وابسته به asset/API به‌روزرسانی شدند. Frontend PR #104 با روش squash در `main` ادغام شد؛ merge commit: `833e3a1ebb1e7e9965fa784d390dbb01763c67dc`. Frontend GitHub Pages deployment run `43183779308` با نتیجه success منتشر شد؛ URL: `https://saeidesl.github.io/PRSPRO2-PRODUCTION/`. تست‌های خودکار Frontend، Cross-Repository QA، Browser Regression و UI/Performance Audit موفق شدند. Product Owner جابه‌جایی بین صفحات پروژه‌ها/رویدادها/فایل‌ها و حفظ state را در نسخه زنده تست و موفق تأیید کرد. Backend runtime، API contract، permissions، Google Sheets schema و داده‌های عملیاتی تغییر نکردند.

### Task 3 — اتصال invalidation، آزمون یکپارچگی و تحویل [x]
- نتیجه بررسی و اجرا: هیچ تغییر runtime در Backend لازم یا اعمال نشد؛ منطق invalidation به‌طور کامل در Frontend و با API/Cache موجود اجرا شد. قراردادهای Backend، مجوزها، tenant isolation، Google Sheets schema و داده‌های عملیاتی بدون تغییر باقی ماندند.
- *Log:* در مخزن Frontend، تغییرات `js/modules/projects.js`، `js/modules/attachments.js`، `js/modules/project-detail.js` و `index.html` برای invalidation هدفمند cache پروژه، رویداد و پیوست تکمیل شد؛ تست‌های `tests/shared-page-cache.test.js` و assertionهای asset در تست‌های رگرسیون وابسته به‌روزرسانی شدند. PR #105 با Squash در Frontend `main` ادغام شد؛ merge commit: `c441965b92364733ac98d1c64aca3eebbbc5a41e`. تست‌های Frontend، cross-repository QA، print designer regression و frontend agent suite پس از ادغام موفق شدند؛ GitHub Pages publish run `43188981314` و Pages build/deployment run `43188980054` نیز success شدند. Product Owner تست زنده upload فایل پروژه، اتصال فایل به رویداد، ویرایش پروژه و حذف پیوست را موفق تأیید کرد. در Backend هیچ فایل runtime/API/DB تغییر نکرد؛ این TODO5 صرفاً ثبت نتیجه سازگاری و عدم نیاز به تغییر Backend است.


