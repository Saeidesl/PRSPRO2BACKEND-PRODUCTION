## 🎯 Current Objective

حذف دوگانه‌سازی «ثبت سریع» و «ثبت کامل» از فرم ثبت رویداد و ارائه فقط یک تجربه واحد با نمایش همیشگی تمام فیلدهای مجاز فرم؛ حفظ مسیرهای فعلی ثبت، قواعد اعتبارسنجی، فرم‌های متصل، اطلاعات چندردیفی، فایل‌ها/تصاویر، اصلاح فرم و کنترل‌های دسترسی.

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

### Task 1 — Discovery & Planning [x]
- بررسی TODO5 و ARCHITECTURE هر دو مخزن، وضعیت main و commitهای HEAD.
- ردیابی پیاده‌سازی quick/full در `js/modules/events.js` و `css/events.css` و شناسایی مسیرهای ثبت/فرم موجود.
- تعیین محدوده تغییر به Frontend؛ Backend/API/DB بدون تغییر مگر کشف وابستگی واقعی.
- تعریف Taskهای اجرایی و آزمون.
- *Log:* Frontend main HEAD=`33383e8472ab60e524896bd22ba7eed069ed7809` و Backend main HEAD=`ccf8dae0a816212b2e612a9f05254481f8b4569e` بررسی شد؛ هر دو TODO5 روی Ready for the next feature بودند. شاخه کاری هم‌نام در هر دو مخزن از همین HEADها ایجاد شد. نقاط اجرایی: `js/modules/events.js: Events.openForm, renderConfiguredForms, updateFormMode, applyConfiguredFormVisibility`؛ `css/events.css: .event-form-mode*`؛ `index.html` برای cache-busting. مسیر ثبت `POST /events` و سرویس‌های Backend خارج از محدوده تغییر هستند.

### Task 2 — حذف حالت سریع و تثبیت ثبت کامل (IN PROGRESS)
- حذف انتخاب‌گر quick/full و متن راهنما از HTML مودال ساخته‌شده در `Events.openForm`.
- حذف state، listener و منطق مخفی‌سازی اختصاصی quick/full؛ نمایش پیش‌فرض همه فیلدها.
- حفظ VisibilityRule و requiredness واقعی هر فیلد.
- حذف CSS بلااستفاده انتخاب‌گر mode؛ حفظ استایل فرم و ردیف‌های چندگانه.
- به‌روزرسانی نسخه asset و اجرای تست‌های مرتبط.
- خروجی قابل آزمون: فرم ثبت رویداد تنها یک حالت داشته باشد و همه فیلدهای مجاز فرم کامل را نمایش دهد.

### Task 3 — Regression، سازگاری و آماده‌سازی ادغام
- افزودن/به‌روزرسانی تست‌های رگرسیون برای نبود quick/full و نمایش همیشگی فیلدهای اختیاری.
- اجرای تست‌های کامل Frontend، بررسی syntax و تست‌های مرتبط با ثبت رویداد.
- بررسی عدم تغییر قرارداد `POST /events`، payload، Backend، مجوزها و ساختار داده.
- اجرای کنترل‌های CI و QA بین‌مخزنی؛ بررسی diff و انتشار فقط طبق گردش‌کار عملیاتی.
- خروجی قابل آزمون: تنها یک حالت «ثبت کامل»، بدون رگرسیون در جریان‌های موجود.
