## 🎯 Current Objective
ساده‌سازی فرم «ایجاد پروژه جدید» در نسخه عملیاتی؛ فرم ایجاد فقط چهار ورودی قابل مشاهده داشته باشد: کد موقت پروژه، نام پروژه، تاریخ و ساعت ایجاد پروژه، گردش کار پروژه. قوانین ایجاد، مجوزها، یکپارچگی گردش‌کار، ثبت تاریخ، یکتایی کد و سازگاری رکوردهای موجود باید حفظ شوند. مسیرهای فرم ویرایش و تنظیمات پروژه‌های موجود بدون نیازسنجی حذف نشوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`؛ شاخه فاز: `feature/simplify-project-create-form-20261112`؛ مبنا: `main` با آخرین commit بررسی‌شده `632799ed71792b4db7bcf2a56676a19ed974091b`.
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`؛ شاخه فاز: `feature/simplify-project-create-form-20261112`؛ مبنا: `main` با آخرین commit بررسی‌شده `6c7b8b35eb47be2c0095a0409b6179840597d1e0`.
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
- نکته حل‌نشده کسب‌وکاری: فرم فعلی برای WorkflowType=REPEAT فیلد «پروژه مرجع» را الزام می‌کند. حذف کامل این فیلد با حفظ قاعده فعلی REPEAT تعارض دارد؛ پیش از تغییر این رفتار باید تصمیم Product Owner اخذ شود.

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
  - *Log:* Frontend: \`js/modules/projects.js\` — \`openCreateForm()\` markup فرم را برای ایجاد به چهار فیلد محدود کرد؛ \`renderProjectLookups()\` workflow پیش‌فرض و مرجع شرطی REPEAT را حفظ کرد؛ \`createProject()\` مقدارهای داخلی واحد مجاز، وضعیت پیش‌فرض و اعلان را بدون نمایش فیلدها تأمین کرد و مسیر بارگذاری پیوست را از ایجاد حذف کرد؛ فرم ویرایش/تکمیل پیش‌نویس و بارگذاری فایل آن بدون تغییر رفتار حفظ شد. \`index.html\` نسخه asset ماژول را برای جلوگیری از cache قدیمی به‌روزرسانی کرد. بررسی syntax هر دو فایل JavaScript مرتبط موفق بود.
- [ ] **Task 3 — Backend Contract & Business-Rule Compatibility (IN PROGRESS):** کاهش داده‌های غیرضروری lookup و حفظ قرارداد لازم برای چهار ورودی و REPEAT؛ اعتبارسنجی نهایی defaultهای داخلی، امنیت، یکتایی، workflow، وضعیت و سازگاری API.
- [ ] **Task 4 — Regression, Integration & Handoff:** اجرای تست‌های خودکار، syntax، قرارداد API، سناریوهای create/edit/draft/repeat، مجوزها، تاریخ و ساعت، و responsive؛ ثبت نتیجه CI و تحویل برای تست زنده Product Owner.