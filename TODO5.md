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

### Task 3 — بهینه‌سازی اطلاعات وابسته و تاریخی (IN PROGRESS)

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
