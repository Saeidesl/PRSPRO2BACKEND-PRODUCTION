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

### Task 2 — Baseline & بهینه‌سازی دریافت اطلاعات اصلی (IN PROGRESS)

- ایجاد/تکمیل اندازه‌گیری امن و قابل تکرار برای زمان بازشدن فرم، آماده‌شدن منابع اصلی، تعداد درخواست‌ها، cache hit/miss، زمان سرویس‌ها و عملیات خواندن Google Sheets.
- تهیه baseline از محیط تست/Staging احراز هویت‌شده؛ عدم استفاده از دیتابیس یا API تولید برای تست مخرب.
- بررسی و سبک‌سازی دریافت فهرست پروژه برای picker با reuse مسیر موجود و حفظ فیلدهای لازم برای Draft/Independent و workflow.
- بهینه‌سازی دریافت انواع رویداد و تعریف فرم‌های متصل؛ کاهش خواندن تکراری فرم/فیلد/نوع اطلاعات/ستون‌ها با batch/index در همان درخواست.
- طراحی و پیاده‌سازی سیاست TTL و stale-while-revalidate برای داده‌های مرجع، با scope امن و invalidation دقیق.
- خروجی قابل آزمون: گزارش baseline و مقایسه تعداد درخواست/زمان آماده‌شدن منابع اصلی، بدون تغییر رفتار مجازبودن رویداد یا قرارداد ثبت.

### Task 3 — بهینه‌سازی اطلاعات وابسته و تاریخی

- بهینه‌سازی و cache کنترل‌شده اطلاعات مرکزی پروژه و پاسخ فرم‌های قبلی.
- کاهش درخواست‌های تکراری پنل اطلاعات مرتبط هنگام تغییر نوع رویداد.
- بهینه‌سازی دریافت workflow progress با جلوگیری از درخواست تکراری و invalidation پس از ثبت رویداد/تکمیل مرحله.
- بازطراحی جست‌وجوی پاسخ مبنا در حالت اصلاح برای حذف درخواست‌های ترتیبی غیرضروری، با حفظ FormVersion و ExpectedUpdatedAt.
- حفظ lazy loading برای تاریخچه‌هایی که کاربر صریحاً باز می‌کند.
- خروجی قابل آزمون: انتخاب پروژه/نوع رویداد و حالت اصلاح با تعداد درخواست کمتر و بدون پاسخ قدیمی یا اشتباه.

### Task 4 — بهینه‌سازی نمایش، یکپارچه‌سازی کش و Regression

- کاهش رندرهای تکراری فرم، picker و پنل اطلاعات؛ حفظ نمایش فوری cache و refresh پس‌زمینه.
- مدیریت loading/error/empty state و جلوگیری از پرش UI در دسکتاپ و موبایل.
- تکمیل ماتریس invalidation برای تغییر پروژه، event type، form mapping، form definition، project information، workflow و ثبت رویداد.
- آزمون قرارداد API، مجوزها، tenant isolation، Draft/Independent، ثبت سریع/کامل، فرم چندردیفی، فایل، اصلاح فرم، Snapshot، تاریخچه و Idempotency.
- مقایسه نهایی با baseline و ثبت زمان‌ها/تعداد درخواست‌ها و نتایج آزمون؛ هیچ ادعای سرعت بدون اندازه‌گیری ثبت نشود.
- خروجی قابل آزمون: فرم ثبت رویداد سریع‌تر و پایدارتر، بدون رگرسیون در ثبت و صحت داده.

### Implementation Log

- شروع فاز: 2026-11-06.
- Task 1 تکمیل و Task 2 در وضعیت IN PROGRESS قرار گرفت.
- تا این نقطه فقط مستندات TODO5 به‌روزرسانی می‌شود؛ هیچ تغییر اجرایی، انتشار یا مهاجرت داده انجام نشده است.
