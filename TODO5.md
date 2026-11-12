## 🎯 Current Objective
پاک‌سازی تعریف شیت پروژه‌ها در Database Setup؛ جلوگیری از تولید ستون‌های بلااستفاده `RunNumber` و `ReferenceSourceRevision` و برنامه‌ریزی امن برای حذف فیزیکی آن‌ها از دیتابیس عملیاتی پس از کنترل وابستگی‌ها و تهیه پشتیبان.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`؛ شاخه فاز: `feature/simplify-project-create-form-20261112`؛ مبنا: `main` با آخرین commit بررسی‌شده `632799ed71792b4db7bcf2a56676a19ed974091b`.
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`؛ شاخه فاز جاری حذف فیزیکی ستون‌ها: `feature/remove-project-unused-db-columns-20261112`؛ مبنا: `main` با آخرین commit بررسی‌شده `8ebf8cedebb04c81bff51c11f7e193689de3af04`.
- هر دو مخزن مجاز و قابل دسترسی‌اند؛ شاخه پیش‌فرض هر دو `main` است. پیاده‌سازی این فاز روی شاخه feature انجام می‌شود و تا تأیید Product Owner به main ادغام نمی‌شود.
- Backend: Google Apps Script V8 + Google Sheets؛ Frontend: HTML/CSS/JavaScript؛ API از `PMS.Api` و `Router.js`.

### Frontend — مسیرهای واقعی کشف‌شده
- `pages/projects.html`: دکمه `#project-create-button` نقطه ورود ایجاد پروژه است.
- `js/modules/projects.js`:
  - `Projects.init()`: نمایش دکمه بر اساس `PROJECT_CREATE` و بارگذاری فهرست.
  - `Projects.bindEvents()`: اتصال دکمه به `openCreateForm()`.
  - `Projects.openCreateForm(editProject, options)`: ساخت DOM فرم مشترک ایجاد/ویرایش؛ شاخه ایجاد با `isEditMode=false` و شاخه ویرایش/تکمیل پیش‌نویس با `isEditMode=true`.
  - فیلدهای فعلی: `#new-project-code`, `#new-project-title`, `#new-project-created-at`, `#new-project-quantity`, `#new-project-workflow`, `#new-project-reference`, `#new-project-description`, `#new-project-departments`, `#new-project-users`, `#new-project-status`, `#new-project-file`, `#new-project-attachment-type`, `#new-project-notify`.
  - `renderProjectLookups()`: دریافت و نمایش workflow، department، user، status و reference project؛ انتخاب پیش‌فرض اولین workflow یا `pms_default_project_workflow_v1`؛ تعیین پیش‌فرض برخی واحدها.
  - `createProject(modal)`: ساخت payload و POST به `/projects`؛ مدیریت تاریخ محلی به ISO؛ ادامه کپی اطلاعات برای WorkflowType=REPEAT؛ بارگذاری فایل؛ invalidation cache.
  - `projectSettingsStorageKey()`, `saveProjectSettings()`, `applySavedProjectSettings()` و `openSettings()`: تنظیمات پیش‌فرض ایجاد و تنظیمات ویرایش؛ تفکیک مسیر ایجاد از ویرایش الزامی است.
  - `openProjectEditForm()`, `loadProjectEditAttachments()`, `deleteProjectEditAttachment()`: مسیر ویرایش و پیوست‌های پروژه؛ خارج از محدوده حذف مگر وابستگی مستقیم اثبات شود.
- `css/project-form.css`: چیدمان فرم ایجاد/ویرایش و modal؛ selectorهای مشترک نباید با حذف فیلدهای ایجاد، فرم ویرایش را خراب کنند.
- `index.html`: بارگذاری `css/project-form.css` و `js/modules/projects.js`؛ cache-busting پس از تغییر باید به‌روزرسانی شود.
- تقویم/ساعت: ورودی فعلی ایجاد از نوع `datetime-local` و تبدیل در `createProject()` به ISO؛ پیاده‌سازی تقویم/ساعت مورد استفاده در فرم رویداد باید در صورت تغییر کنترل، مجدداً بررسی و همان رفتار موجود استفاده شود.

### Backend — مسیرها و قراردادهای واقعی کشف‌شده
- `Router.js`:
  - `GET /project-form/lookups` با مجوز `PROJECT_CREATE` و اتصال به `ProjectService.projectFormLookups(params)`.
  - `POST /projects` با مجوز `PROJECT_CREATE` و اتصال به `ProjectService.create(body, params)`.
  - `GET /workflows` برای انتخاب گردش‌کار با مجوزهای `WORKFLOW_MANAGE` یا `PROJECT_CREATE` یا `SYSTEM_SETTINGS`.
- `ProjectService.js`:
  - `projectFormLookups(params)` اکنون workflows، departments، users، informationTypes، referenceProjects و projectStatuses را برمی‌گرداند.
  - `create(project, params)` قواعد Tenant، گردش‌کار فعال/منتشرشده، نسخه گردش‌کار، مرحله اول، کد یکتا با قفل، وضعیت، دسترسی واحدها/کاربران، پروژه مرجع برای REPEAT، Audit و اعلان را اعمال می‌کند.
  - `_normalizeCreatedAt_(value, fallback)` تاریخ/ساعت ورودی را اعتبارسنجی و ISO ذخیره می‌کند؛ تاریخ بدون ساعت برای سازگاری legacy پشتیبانی می‌شود.
  - مسیر `RecordState=DRAFT` همچنان برای پیش‌نویس‌های قدیمی/سازگاری باقی می‌ماند؛ فرم جدید فعلی پروژه را مستقیماً ACTIVE می‌سازد.
- `ProjectValidator.js`:
  - `validateCreate()` کد، عنوان، WorkflowID و برای پروژه ACTIVE حداقل یک `AvailableDepartmentIDs` را الزامی می‌کند؛ Quantity/Description اختیاری‌اند.
  - `validateUpdate()` قواعد تکمیل پیش‌نویس و ویرایش را کنترل می‌کند؛ نباید با ساده‌سازی فرم ایجاد تضعیف شود.
- شیت عملیاتی `08_Projects`: فیلدهای اصلی شامل `ProjectCode`, `Title`, `WorkflowID`, `WorkflowVersion`, `CurrentStepID`, `Status`, `AvailableDepartmentIDs`, `AllowedUserIDs`, `NotifyEnabled`, `CreatedAt`, `RecordState` و شناسه‌های Tenant/Creator است؛ حذف ستون یا داده مطرح نیست.
- API ایجاد فعلی: `POST /projects` با payload شامل فیلدهای فرم و تنظیمات داخلی؛ قرارداد باید فقط به اندازه لازم تغییر کند و خواندن/ویرایش رکوردهای قبلی سازگار بماند.
- قوانین مهم کشف‌شده: کد در سطح Tenant یکتا و case-insensitive است؛ workflow باید متعلق به همان Tenant، فعال و منتشرشده و دارای مرحله اول باشد؛ پروژه REPEAT در حال حاضر به `SourceProjectID` نیاز دارد؛ پروژه ACTIVE حداقل یک واحد مجاز نیاز دارد؛ وضعیت در صورت عدم ارسال از پیش‌فرض سرور تعیین می‌شود؛ تاریخ در Backend نرمال می‌شود.
- تصمیم تأییدشده Product Owner: برای گردش‌کارهای عادی فرم فقط چهار فیلد اصلی دارد؛ فقط هنگام انتخاب گردش‌کار از نوع `REPEAT`، فیلد «پروژه مرجع» به‌صورت شرطی نمایش داده و طبق قانون فعلی اجباری می‌شود.

### اصول اجرا و اعتبارسنجی
- فقط مخازن عملیاتی فوق و شاخه feature همین فاز؛ عدم تغییر مخازن توسعه و عدم push/merge مستقیم به `main`.
- هیچ حذف یا migration در داده‌های `08_Projects` انجام نشود.
- فرم ایجاد و فرم ویرایش دو مسیر مجزا در یک ماژول‌اند؛ ساده‌سازی create نباید تنظیمات، پیوست‌ها، تکمیل DRAFT یا ویرایش پروژه‌های قدیمی را حذف کند.
- حفظ مجوز `PROJECT_CREATE`، tenant isolation، کنترل یکتایی کد، گردش‌کار منتشرشده/مرحله اول، تاریخ/ساعت، Audit، Telegram notification و مسیر reference-copy در صورت حفظ REPEAT.
- تست‌های موجود و تست‌های رگرسیون Frontend/Backend باید قبل از درخواست تست زنده اجرا شوند.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی شاخه‌ها/آخرین commitها، TODO5 و ARCHITECTURE هر دو مخزن؛ ردیابی فرم، lookup، payload، API، اعتبارسنجی و ذخیره‌سازی؛ ثبت محدوده و ریسک‌های سازگاری.
  - *Log:* Frontend: `pages/projects.html`, `js/modules/projects.js` (`init`, `bindEvents`, `openCreateForm`, `renderProjectLookups`, `createProject`, `openProjectEditForm`), `css/project-form.css`, `index.html`. Backend: `Router.js` (`GET /project-form/lookups`, `POST /projects`), `ProjectService.js` (`projectFormLookups`, `create`, `_normalizeCreatedAt_`), `ProjectValidator.js` (`validateCreate`, `validateUpdate`), Sheet `08_Projects`. آخرین commitها: FE `632799ed71792b4db7bcf2a56676a19ed974091b`؛ BE `6c7b8b35eb47be2c0095a0409b6179840597d1e0`. TODO5 و ARCHITECTURE هر دو مخزن خوانده شد.
- [x] **Task 2 — Simplify Create UI & Frontend Flow:** مسیر ایجاد از امکانات ویرایش جدا شد؛ فقط چهار ورودی اصلی و فیلد مرجع شرطی REPEAT در UI ایجاد باقی ماند؛ ورودی تعداد، توضیحات، واحدها/کاربران/وضعیت، فایل و اعلان از markup ایجاد حذف شد. مسیر ویرایش و پیوست‌های موجود حفظ شد.
  - *Log:* Frontend: `js/modules/projects.js` — `openCreateForm()` markup فرم را برای ایجاد به چهار فیلد محدود کرد؛ `renderProjectLookups()` workflow پیش‌فرض و مرجع شرطی REPEAT را حفظ کرد؛ `createProject()` مقدارهای داخلی واحد مجاز، وضعیت پیش‌فرض و اعلان را بدون نمایش فیلدها تأمین کرد و مسیر بارگذاری پیوست را از ایجاد حذف کرد؛ فرم ویرایش/تکمیل پیش‌نویس و بارگذاری فایل آن بدون تغییر رفتار حفظ شد. `index.html` نسخه asset ماژول را برای جلوگیری از cache قدیمی به‌روزرسانی کرد. بررسی syntax هر دو فایل JavaScript مرتبط موفق بود.
- [x] **Task 3 — Backend Contract & Business-Rule Compatibility:** قرارداد ایجاد `POST /projects` و اعتبارسنجی‌های موجود حفظ شد؛ فقط داده‌های lookup غیرلازم حذف و بارگذاری پروژه‌های مرجع به وجود گردش‌کار `REPEAT` محدود شد. هیچ تغییری در schema یا داده‌های شیت ایجاد نشد.
  - *Log:* Backend: `ProjectService.js` — `projectFormLookups(params)` دیگر فهرست کاربران و انواع اطلاعات را نمی‌خواند/برنمی‌گرداند؛ `referenceProjects` فقط وقتی محاسبه می‌شود که حداقل یک گردش‌کار منتشرشده از نوع `REPEAT` وجود داشته باشد؛ فیلتر Tenant و دسترسی کاربر برای پروژه‌های مرجع حفظ شد. `Router.js`، `ProjectValidator.js`، `ProjectService.create()` و قرارداد `POST /projects` دست‌نخورده ماندند؛ بنابراین مجوز `PROJECT_CREATE`، اعتبارسنجی کد و یکتایی اتمیک، workflow فعال/منتشرشده و مرحله اول، اعتبارسنجی واحدهای مجاز، تاریخ، Audit و اعلان حفظ شدند. بررسی syntax فایل‌های JavaScript موفق بود.
- [x] **Task 4 — Regression, Integration & Handoff:** بررسی syntax و کنترل‌های ایستا موفق بود؛ Product Owner تست زنده فرم ایجاد پروژه را تأیید کرد.
  - *Log:* Frontend `js/modules/projects.js` و Backend `ProjectService.js` پس از ادغام در main استفاده شدند؛ تست زنده سناریوی ایجاد پروژه توسط Product Owner موفق اعلام شد. کد پروژه، نام، تاریخ/ساعت، گردش‌کار و شرط پروژه مرجع REPEAT تأیید شدند. این تأیید جایگزین گزارش CI مستقل نیست.

### فاز بعدی — پاک‌سازی ستون‌های دیتابیس پروژه
- [x] **Task 5 — Discovery & Planning:** بررسی تعریف `08_Projects`، مصرف ستون‌ها در Backend و Frontend و سازوکار ارتقای schema.
  - *Log:* `DatabaseSetup.js`، `ProjectService.js`، `ProjectRepository.js` و جست‌وجوی مصرف در مخزن Frontend بررسی شدند. `RunNumber` و `ReferenceSourceRevision` در مسیرهای فعلی مصرف نمی‌شوند؛ `ReferenceSourceRevision` فقط هنگام ساخت پروژه نوشته می‌شد. `ensureHeaders_()` افزایشی است و ستون‌های موجود را حذف نمی‌کند.
- [x] **Task 6 — Schema Definition Cleanup:** حذف دو ستون بلااستفاده از تعریف دیتابیس و توقف تولید مقدار `ReferenceSourceRevision`.
  - *Log:* Backend `DatabaseSetup.js` — تعریف `APP_CONFIG.SHEETS.PROJECTS.headers` از `RunNumber` و `ReferenceSourceRevision` پاک شد. Backend `ProjectService.js` — مقداردهی `ReferenceSourceRevision` در `ProjectService.create()` حذف شد. PR #73 در `main` ادغام شد؛ commit `3cc3ce6481e8836862ea9fcdb4e273acb3659741`. Syntax check هر دو فایل موفق؛ بررسی main تأیید کرد هیچ‌یک از دو ستون در تعریف/تولید schema باقی نمانده‌اند. داده‌های شیت عملیاتی هنوز تغییر نکرده‌اند.
- [ ] **Task 7 — Production Sync, Deployment & Safe Column Removal (IN PROGRESS):** انتشار کد Backend از workflow رسمی؛ تهیه پشتیبان و بررسی آخرین وابستگی‌ها/مقادیر دو ستون در شیت عملیاتی؛ سپس حذف فیزیکی فقط همین دو ستون و راستی‌آزمایی سلامت داده و برنامه.
  - *Log:* workflow رسمی `.github/workflows/sync-apps-script.yml` فقط با اجرای دستی `workflow_dispatch` اجرا می‌شود؛ ابزار متصل امکان dispatch ندارد. هیچ deployment یا حذف فیزیکی هنوز انجام نشده است.
  - *Log:* Backend `DatabaseSetup.js` — تابع `removeUnusedProjectColumns_(ss)` اضافه شد و در `setupDatabase()` پیش از `createAllSheets_(ss)` اجرا می‌شود. تابع فقط `RunNumber` و `ReferenceSourceRevision` را در شیت `08_Projects` شناسایی می‌کند؛ در صورت وجود داده یا فرمول در هرکدام، بدون حذف هیچ ستونی خطا می‌دهد؛ در حالت خالی ابتدا یک کپی کامل از شیت با نام یکتای `08_Projects_Backup_UnusedColumns_...` می‌سازد و سپس ستون‌ها را از راست به چپ حذف می‌کند. چون این دو نام در `APP_CONFIG.SHEETS.PROJECTS.headers` وجود ندارند، اجرای بعدی setup آن‌ها را دوباره ایجاد نمی‌کند.
  - *Log:* در `DatabaseSetup.js` تابع مستقل `removeUnusedProjectColumnsFromProduction()` و گزینه منوی «حذف ستون‌های بلااستفاده پروژه» اضافه شد تا پس از انتشار، فقط migration موردنظر روی Spreadsheet ID عملیاتی پیکربندی‌شده اجرا شود و نیازی به اجرای تمام مراحل `setupDatabase()` نباشد. در صورت وجود داده/فرمول، عملیات متوقف و پیام خطا نمایش داده می‌شود؛ در حالت موفق، نسخه پشتیبان کامل پیش از حذف ایجاد می‌شود. این migration هنوز در Google Sheets عملیاتی اجرا نشده است.
