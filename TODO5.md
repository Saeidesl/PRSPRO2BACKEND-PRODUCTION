## 🎯 Current Objective

افزودن امکان تعیین ترتیب نمایشی مستقل برای رویدادهای هر مرحله در حالت «ترتیب آزاد» Workflow؛ ترتیب انتخاب‌شده فقط نحوه نمایش فهرست رویدادها را کنترل کند و هیچ محدودیتی بر ترتیب ثبت/اجرای رویدادها ایجاد نکند. حفظ رفتار فعلی حالت‌های STRICT و GROUPED، نسخه‌بندی Workflow، tenant isolation و APIهای موجود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه کاری `feat/event-form-single-full-mode-20261107`، مبنا `main` با HEAD زمان شروع `33383e8472ab60e524896bd22ba7eed069ed7809`.
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه کاری `feat/event-form-single-full-mode-20261107`، مبنا `main` با HEAD زمان شروع `ccf8dae0a816212b2e612a9f05254481f8b4569e`.
- هر دو شاخه از HEAD تأییدشده main ساخته شدند؛ هیچ تغییری روی main یا مخازن توسعه انجام نمی‌شود.
- TODO5 و ARCHITECTURE در هر دو مخزن پیش از شروع بررسی شدند؛ TODO5 هر دو مخزن در وضعیت Ready for the next feature بود.

### Frontend — مسیرها و رفتار فعلی
- `pages/events.html`: صفحه مرکز عملیات رویداد؛ ورودی‌های «از پروژه»، «کارهای من» و «ثبت مستقل» و تاریخچه را میزبانی می‌کند. این ورودی‌ها مسیرهای کسب‌وکاری هستند و نباید حذف یا با هم ادغام شوند.
- `js/modules/events.js`:
  - `Events.openForm()` مودال واحد `#event-create-modal` را می‌سازد و فرم `#event-create-form` را آماده می‌کند.
  - وضعیت فعلی `formMode: 'quick'` است و در زمان بازشدن فرم نیز `this.formMode = 'quick'` تنظیم می‌شود.
  - در HTML تولیدشده توسط `openForm`، بخش `#event-configured-forms-section` دو دکمه `[data-form-mode="quick"]` و `[data-form-mode="full"]` و راهنمای `#event-form-mode-help` دارد.
  - listener مودال کلیک روی `[data-form-mode]` را به `updateFormMode` می‌فرستد.
  - `renderConfiguredForms()` برای هر فیلد پویا `data-form-required` و وضعیت اولیه visibility را تنظیم می‌کند و در پایان `updateFormMode` را فراخوانی می‌کند.
  - `updateFormMode(mode)` فیلدهای اختیاری را در حالت quick با `data-quick-hidden` مخفی می‌کند؛ `applyConfiguredFormVisibility(container)` علاوه بر VisibilityRule، همین وضعیت quick را در نمایش/مخفی‌سازی اعمال می‌کند.
  - مسیر جمع‌آوری و ارسال پاسخ‌ها در `collectFormResponses` و submit handler موجود می‌ماند؛ ارسال رویداد از `POST /events` انجام می‌شود.
  - cacheهای تعریف فرم، داده وابسته، انتخاب پروژه، workflow، اصلاح فرم، پیوست‌ها و idempotency خارج از دامنه حذف هستند و باید حفظ شوند.
- `css/events.css`: قواعد `#event-create-modal .event-form-mode*` در حدود خطوط 947 تا 1024 فقط ظاهر انتخاب‌گر quick/full را می‌سازند؛ پس از حذف انتخاب‌گر، قواعد بلااستفاده مربوط به mode باید پاک شوند، اما استایل ردیف‌های چندگانه و focus-visible حفظ شود.
- `index.html`: نسخه asset برای `js/modules/events.js` باید طبق الگوی cache-busting به‌روز شود.
- تست مرتبط موجود: `tests/event-form-cache-policy.test.js`. تست‌های جدید باید رفتار تک‌حالته را پوشش دهند و با الگوی تست‌های Node موجود هماهنگ باشند.

### Backend — قراردادهای موجود و محدوده
- Backend روی Google Apps Script V8 و Google Sheets است.
- `Router.js` مسیر ثبت اصلی `POST /events` را به `EventService.create` متصل می‌کند؛ مسیر موازی ایجاد رویداد مجاز نیست.
- `EventService.js` اعتبارسنجی پاسخ فرم، مجوز، tenant isolation، idempotency، snapshot و عملیات وابسته را مدیریت می‌کند.
- `FormService.js` تعریف و پاسخ فرم‌های متصل را آماده/اعتبارسنجی و snapshot می‌کند.
- حذف حالت نمایشی quick/full در Frontend نباید قرارداد payload، API، مجوزها، سرویس‌ها، Sheetها یا schema را تغییر دهد؛ در صورت عدم نیاز اثبات‌شده، Backend بدون تغییر اجرایی باقی می‌ماند.

### قواعد پذیرش
- در فرم ثبت رویداد هیچ دکمه/متن/منطق انتخاب «ثبت سریع» باقی نماند.
- تمام فیلدهای مجاز فرم متصل، از جمله فیلدهای اختیاری، در حالت عادی نمایش داده شوند؛ VisibilityRuleهای تعریف‌شده همچنان رعایت شوند.
- الزامی‌بودن فیلدها و اعتبارسنجی سمت کاربر/سرور بدون تغییر باقی بماند.
- ثبت پروژه‌ای، مستقل و ورود از جزئیات پروژه؛ فرم‌های تک/چندردیفی، فایل/تصویر، فرم اصلاحی، workflow، پنل اطلاعات مرتبط، idempotency و submit به `POST /events` رگرسیون نداشته باشند.
- هیچ API، شیت، داده عملیاتی یا مسیر ایجاد موازی اضافه/حذف نشود.

## 📋 Macro-Task Queue & Implementation Log

### نقشه فنی تکمیلی — ترتیب نمایشی رویدادهای FREE
- WorkflowStepEventRuleValidator.js → WorkflowStepEventRuleValidator.validate اکنون برای FREE مقدار EventOrder=0 و بدون گروه را الزام می‌کند؛ فیلد مستقل DisplayOrder باید افزوده شود تا معنای ترتیب اجرایی از ترتیب نمایشی جدا بماند.
- WorkflowStepEventRuleRepository.js در REQUIRED_COLUMNS ستون‌های شیت 37_WorkflowStepEventRules را تضمین می‌کند؛ cloneWorkflowVersion نیز باید DisplayOrder را در نسخه پیش‌نویس حفظ کند.
- DatabaseSetup.js → APP_CONFIG.SHEETS.WORKFLOW_STEP_EVENT_RULES.headers ساختار شیت ۳۷ را تعریف می‌کند؛ افزودن ستون فقط افزایشی است و داده‌های قبلی نباید حذف یا بازنویسی شوند.
- WorkflowService.getStepEventRules/saveStepEventRules از APIهای فعلی GET/PUT /workflows/:id/steps/:stepId/event-rules استفاده می‌کنند؛ مسیر جدیدی لازم نیست.
- EventService._getWorkflowRuleProgress_ قواعد را مرتب و به progress تبدیل می‌کند؛ در FREE باید مرتب‌سازی با DisplayOrder انجام شود، درحالی‌که کنترل ثبت همچنان بدون ترتیب اجباری باقی بماند. workflowProgress باید displayOrder را در خروجی حفظ کند.


### Task 4 — تنظیم ترتیب نمایش رویدادها در حالت ترتیب آزاد Workflow (IN PROGRESS)
- کشف انجام شد: در UI فعلی EventOrder فقط برای STRICT نمایش داده می‌شود؛ در FREE مخفی و با مقدار صفر ارسال می‌شود. Backend نیز FREE را با EventOrder=0 اعتبارسنجی می‌کند و آن را به‌عنوان ترتیب اجرایی نمی‌پذیرد. در نتیجه ترتیب فعلی FREE از ترتیب ذخیره/دریافت داده تبعیت می‌کند و کنترل دستی ندارد.
- تصمیم فنی: افزودن DisplayOrder مستقل به همان شیت 37_WorkflowStepEventRules؛ در حالت FREE ترتیب نمایشی با این فیلد تعیین شود و EventOrder همچنان صفر بماند. هیچ Sheet یا API موازی ایجاد نمی‌شود.
- محدوده اجرا: UI تنظیم رویداد مرحله، اعتبارسنجی و ذخیره Backend، clone نسخه Workflow، خروجی progress و مرتب‌سازی فهرست انتخاب رویداد.
- حفظ سازگاری: برای داده‌های قدیمی فاقد DisplayOrder، ترتیب فعلی رکوردها به‌عنوان fallback استفاده شود؛ STRICT و GROUPED و قواعد ثبت/تکمیل مرحله تغییر نکنند.
- خروجی قابل آزمون: مدیر بتواند برای رویدادهای مرحله در حالت FREE عدد ترتیب نمایش مستقل تعیین کند؛ پس از ذخیره و بازگشایی، ترتیب حفظ شود و همان ترتیب در فهرست انتخاب رویداد نمایش داده شود، بدون اجبار به ثبت رویدادها به همان ترتیب.


### Task 1 — Discovery & Planning [x]
- بررسی TODO5 و ARCHITECTURE هر دو مخزن، وضعیت main و commitهای HEAD.
- ردیابی پیاده‌سازی quick/full در `js/modules/events.js` و `css/events.css` و شناسایی مسیرهای ثبت/فرم موجود.
- تعیین محدوده تغییر به Frontend؛ Backend/API/DB بدون تغییر مگر کشف وابستگی واقعی.
- تعریف Taskهای اجرایی و آزمون.
- *Log:* Frontend main HEAD=`33383e8472ab60e524896bd22ba7eed069ed7809` و Backend main HEAD=`ccf8dae0a816212b2e612a9f05254481f8b4569e` بررسی شد؛ هر دو TODO5 روی Ready for the next feature بودند. شاخه کاری هم‌نام در هر دو مخزن از همین HEADها ایجاد شد. نقاط اجرایی: `js/modules/events.js: Events.openForm, renderConfiguredForms, updateFormMode, applyConfiguredFormVisibility`؛ `css/events.css: .event-form-mode*`؛ `index.html` برای cache-busting. مسیر ثبت `POST /events` و سرویس‌های Backend خارج از محدوده تغییر هستند.

### Task 2 — حذف حالت سریع و تثبیت ثبت کامل [x]
- *Log:* تغییر صرفاً نمایشی/فرانت‌اندی بود؛ در Backend هیچ فایل اجرایی، تابع، API، Router، permission، Sheet یا schema تغییر نکرد. قرارداد فعلی `POST /events` و `EventService.create` حفظ شد. Cross-repository QA Run `42362016270` با بررسی Frontend و Backend موفق شد.
- حذف انتخاب‌گر quick/full و متن راهنما از HTML مودال ساخته‌شده در `Events.openForm`.
- حذف state، listener و منطق مخفی‌سازی اختصاصی quick/full؛ نمایش پیش‌فرض همه فیلدها.
- حفظ VisibilityRule و requiredness واقعی هر فیلد.
- حذف CSS بلااستفاده انتخاب‌گر mode؛ حفظ استایل فرم و ردیف‌های چندگانه.
- به‌روزرسانی نسخه asset و اجرای تست‌های مرتبط.
- خروجی قابل آزمون: فرم ثبت رویداد تنها یک حالت داشته باشد و همه فیلدهای مجاز فرم کامل را نمایش دهد.

### Task 3 — Regression، سازگاری و آماده‌سازی ادغام [x]
- *Log:* بررسی Cross-repository QA Run `42362016270` موفق شد؛ manifest و سورس Apps Script و تست‌های Backend بدون تغییر و بدون regression باقی ماندند. هیچ Backend deployment یا تغییر داده عملیاتی انجام نشد. PR #19 (مستندات TODO5) در شاخه `main` با commit ادغام `a3df9684adbb679462e9ed9aad5a178c879cc41d` ادغام شد؛ هیچ تغییر runtime/API/DB در Backend لازم نبود.
- *Log:* پذیرش نهایی مالک محصول در 2026-11-07 تأیید شد. فرم ثبت رویداد در نسخه عملیاتی با یک حالت ثبت کامل تست و تأیید شد. Backend بدون تغییر اجرایی باقی ماند؛ بنابراین Backend deployment یا مهاجرت داده‌ای انجام نشد.

- افزودن/به‌روزرسانی تست‌های رگرسیون برای نبود quick/full و نمایش همیشگی فیلدهای اختیاری.
- اجرای تست‌های کامل Frontend، بررسی syntax و تست‌های مرتبط با ثبت رویداد.
- بررسی عدم تغییر قرارداد `POST /events`، payload، Backend، مجوزها و ساختار داده.
- اجرای کنترل‌های CI و QA بین‌مخزنی؛ بررسی diff و انتشار فقط طبق گردش‌کار عملیاتی.
- خروجی قابل آزمون: تنها یک حالت «ثبت کامل»، بدون رگرسیون در جریان‌های موجود.


#### Task 2 — محدوده Backend و کنترل سازگاری

- بررسی مسیر ثبت تأیید کرد ثبت رویداد از همان `POST /events` و `EventService.create` انجام می‌شود؛ حذف حالت نمایشی quick/full در کلاینت به تغییر قرارداد API یا داده نیاز ندارد.
- در Backend هیچ فایل اجرایی، API، Router، permission، Sheet یا schema تغییر داده نشده است. TODO5 صرفاً وضعیت فاز و تصمیم حفظ قرارداد موجود را ثبت می‌کند.
