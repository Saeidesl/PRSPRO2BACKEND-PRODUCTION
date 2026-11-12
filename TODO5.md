## 🎯 Current Objective
پشتیبانی معماری Backend از قابلیت ایجاد پروژه از صفحه رویدادها بدون ایجاد مسیر موازی. در Discovery مشخص شد صفحه رویدادها باید از فرم موجود Frontend و قراردادهای عملیاتی فعلی استفاده کند؛ بنابراین در baseline هیچ تغییر runtime یا دیتابیس Backend لازم نیست. این فایل برای ثبت بررسی سازگاری و کنترل عدم regression نگهداری می‌شود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`؛ شاخه فاز: `feature/events-create-project-flow-20261112`؛ مبنا: `main` با آخرین commit بررسی‌شده `2902eaae4cc7f563799deb58a0b371cf190297c8`.
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`؛ شاخه فاز: `feature/events-create-project-flow-20261112`؛ مبنا: `main` با آخرین commit بررسی‌شده `4f258bf4a1e1957b9ea31702fbda890c4c9e7ce1`.
- هر دو شاخه feature از `main` ساخته شده‌اند؛ هیچ تغییر مستقیمی روی `main` انجام نمی‌شود.
- پشته Backend: Google Apps Script V8 و Google Sheets؛ تمام درخواست‌ها از `Router.js` عبور می‌کنند؛ مجوز و tenant isolation سمت سرور مرجع نهایی‌اند.

### Backend — مسیرها و مسئولیت‌های موجود
- `Router.js`: route `POST /projects` با مجوز `PROJECT_CREATE` و routeهای GET پروژه/انتخاب پروژه.
- `ProjectService.js:create(project, params)`: اعتبارسنجی tenant، کد یکتا، گردش‌کار منتشرشده و مرحله اول، واحدهای مجاز، ذخیره پروژه، Audit و اعلان.
- `ProjectValidator.js:validateCreate()`: کنترل فیلدهای اجباری و قواعد پروژه ACTIVE.
- `ProjectService.js` فهرست `GET /projects?view=event-picker` را برای مصرف انتخاب پروژه در صفحه رویداد فراهم می‌کند.
- شیت `08_Projects`: منبع داده اصلی پروژه‌ها؛ schema و داده‌ها در این فاز نباید تغییر کنند.
- APIهای فعلی و بدون تغییر قرارداد: `POST /projects`, `GET /projects?view=event-picker`, `GET /events`, `GET /event-types`.
- سایر مسیرهای رویداد: ثبت نهایی همچنان از `POST /events` با مجوز `EVENT_CREATE` و اعتبارسنجی `EventService.js` انجام می‌شود؛ این قابلیت نباید مسیر ثبت رویداد را دور بزند.

### Frontend integration reference
- `js/modules/projects.js:Projects.openCreateForm()` و `Projects.createProject()` مسیر ایجاد موجودند.
- `js/modules/events.js:Events.load()` داده picker را از `GET /projects?view=event-picker` و cache مشترک دریافت می‌کند.
- کارت‌های صف پروژه در `Events.renderProjectQueues()` و ثبت رویداد از طریق `Events.openForm()` انجام می‌شود.
- تصمیم Discovery: callback بعد از ایجاد موفق در همان مسیر پروژه، سپس refresh/focus از ماژول Events؛ هیچ endpoint یا مدل داده جدیدی لازم نیست.

### اصول ایمنی و سازگاری
- عدم تغییر Google Sheets، migration یا داده عملیاتی.
- عدم تضعیف permissionهای `PROJECT_CREATE` و `EVENT_CREATE` یا tenant isolation.
- Backend runtime فقط اگر تست یکپارچگی نیاز واقعی و مستند نشان دهد تغییر خواهد کرد.
- هرگونه تغییر Backend باید با Frontend عملیاتی و قراردادهای موجود سازگار و تست شود.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Backend Discovery & Contract Planning:** بررسی TODO5 و ARCHITECTURE، شاخه و commit، routeها، سرویس/validator پروژه، view انتخاب پروژه و مسیر ثبت رویداد.
  - *Log:* `Router.js`، `ProjectService.js`، `ProjectValidator.js` و Sheet `08_Projects` بررسی شدند. `POST /projects` و `GET /projects?view=event-picker` موجودند؛ ایجاد پروژه تحت `PROJECT_CREATE` و ثبت رویداد از `POST /events` تحت `EVENT_CREATE` باقی می‌ماند. هیچ تغییر schema یا Backend runtime در baseline لازم نیست. مبنا: `2902eaae4cc7f563799deb58a0b371cf190297c8`.
- [x] **Task 2 — Contract Compatibility Support:** قراردادهای فعلی برای ایجاد پروژه و انتخاب پروژه بررسی شدند؛ هیچ route یا payload جدیدی لازم نیست.
  - *Log:* `Router.js` همچنان `POST /projects` را با مجوز `PROJECT_CREATE` به `ProjectService.create()` متصل می‌کند؛ `ProjectService.js` شناسه پایدار پروژه و view انتخاب پروژه را از مسیر موجود فراهم می‌کند. Frontend فقط `Projects.openCreateForm()` را فراخوانی می‌کند؛ هیچ درخواست `POST /projects` در `events.js` یا endpoint موازی افزوده نشده است. Backend runtime و Sheet `08_Projects` بدون تغییر ماندند.
- [ ] **Task 3 — Backend Regression & Cross-Repository QA (IN PROGRESS):** اجرای تست‌های Backend و بررسی عدم تغییر permission، tenant isolation، قواعد ایجاد پروژه و قراردادهای موجود؛ در صورت عدم نیاز، ثبت صریح عدم تغییر runtime.
- [ ] **Task 4 — Handoff & Operational Safety:** تأیید سازگاری نهایی Backend/Frontend و ثبت وضعیت deployment؛ هیچ deployment یا تغییر تولید بدون تست و تأیید جداگانه اعلام نمی‌شود.
