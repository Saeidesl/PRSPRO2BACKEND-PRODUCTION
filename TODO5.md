## 🎯 Current Objective

اتصال دکمه «مشاهده» در کارت پروژه‌های صفحه رویدادها به خروجی قالب‌های چاپ موجود؛ بازکردن صفحه اختصاصی پروژه و نمایش قالب‌های ذخیره‌شده با اطلاعات واقعی همان پروژه، بدون ایجاد مسیر موازی یا تغییر داده‌های عملیاتی.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌ها
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feature/event-project-template-view-20261113`؛ مبنا: `main` در commit `a313b06aa96ed3bebc844a219df30d0df75a0213`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feature/event-project-template-view-20261113`؛ مبنا: `main` در commit `09811c8e88c6beed7216861b66eb0b91a61ac59d`.
- هر دو مخزن مجوز push دارند؛ هیچ تغییر مستقیمی روی `main` انجام نمی‌شود.

### معماری کشف‌شده
- Frontend صفحه رویدادها: `pages/events.html`؛ کارت‌ها و رفتارها در `js/modules/events.js` و استایل در `css/events.css`.
- تابع `Events.renderProjectQueues()` دکمه فعلی `.event-queue-view-button` را با حالت disabled تولید می‌کند؛ handler کلیک سراسری در `Events.bindEvents()` قرار دارد.
- صفحه خروجی موجود: مسیر `print-output` با فایل `pages/print-output.html` و ماژول مشترک `js/modules/print-designer.js`.
- `PrintDesigner.loadOutputOptions()` قالب‌های فعال را از `GET /print-templates` و پروژه‌ها را از `GET /projects` می‌گیرد.
- `PrintDesigner.resolveOutput()` از `POST /print-templates/:templateId/resolve` با payload شامل `ProjectID` استفاده می‌کند؛ خروجی از `PrintDesigner.renderOutputDocument(template, project, data)` رندر می‌شود. قالب‌های PDF اصلی نیز با مسیر موجود `GET /print-templates/:id/pdf` و تصاویر قالب با مسیرهای موجود بارگذاری می‌شوند.
- Router سمت Frontend مسیر `print-output` را به `pages/print-output.html` متصل می‌کند و route segmentها را به ماژول صفحه می‌دهد.
- Backend: `Router.js` مسیرهای GET `/print-templates`، GET `/print-templates/:id`، GET `/print-templates/:id/pdf` و POST `/print-templates/:id/resolve` را به `PrintTemplateService` متصل می‌کند.
- `PrintTemplateService.list()` فقط قالب‌های فعال همان Tenant را برمی‌گرداند؛ `resolve()`، `_resolveProjectData()` و `PrintTemplateValidator.parseDefinition()` اطلاعات پروژه، اطلاعات مرکزی، پاسخ فرم‌ها و رویدادهای مرتبط را بر اساس bindingهای ذخیره‌شده حل می‌کنند.
- داده قالب در تعریف `DefinitionJSON` و اطلاعات قالب در مخزن `PrintTemplateRepository` نگهداری می‌شود؛ مقادیر پروژه از مخازن پروژه/اطلاعات مرکزی/رویداد/فرم خوانده می‌شوند. در این قابلیت نباید schema یا داده عملیاتی تغییر کند.
- دسترسی خروجی در Backend با `PROJECT_VIEW` و tenant/project access موجود کنترل می‌شود؛ مجوز صفحه `print-output` در Frontend نیز `PROJECT_VIEW` است.
- فایل‌های آزمون موجود: Backend `tests/print-templates.test.js`؛ Frontend `tests/print-template-library.test.js` و `tests/project-print-designer.test.js` و `tests/event-queue-project-cards.test.js`.

### تصمیم‌های حفاظتی
- استفاده مجدد از کتابخانه قالب، resolver، رندرر، APIها و کنترل‌های دسترسی موجود؛ عدم ایجاد API، جدول، فرم یا مسیر داده موازی.
- حفظ رفتار ثبت رویداد، تاریخچه، وضعیت کارت‌ها و خروجی چاپ فعلی.
- عدم تغییر Google Sheets، Google Drive، permissionها یا داده‌های عملیاتی مگر آنکه بررسی فنی بعدی ضرورت مستند و تأییدشده‌ای نشان دهد.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی هر دو مخزن عملیاتی، شاخه‌ها و commitهای مبنا، TODO5/ARCHITECTURE، دکمه غیرفعال کارت، Router، صفحه خروجی، resolver و منابع داده قالب انجام شد. نتیجه اولیه: قابلیت با توسعه Frontend روی مسیر خروجی موجود قابل پیاده‌سازی است و فعلاً تغییر Backend/DB پیش‌بینی نمی‌شود.
  - *Log:* Backend: `Router.js`, `PrintTemplateService.js`, `PrintTemplateValidator.js`, `PrintTemplateRepository.js`, `tests/print-templates.test.js` بررسی شدند؛ مسیر resolve موجود `POST /print-templates/:id/resolve` و منابع `PROJECT_FIELD`, `PROJECT_INFORMATION`, `EVENT_FORM_FIELD`, `EVENT_FORM_RESPONSE`, `EVENT_FIELD` تأیید شد. Frontend: `pages/events.html`, `js/modules/events.js`, `pages/print-output.html`, `js/modules/print-designer.js`, `js/core/router.js`, `index.html` و تست‌های قالب/کارت بررسی شدند. هر دو مخزن روی `main` بررسی و شاخه ویژگی از commit مبنای تأییدشده ایجاد شد. TODO5 قبلی در هر دو مخزن «Ready for the next feature» بود؛ کار ناتمامی برای ادامه وجود نداشت.

- [ ] **Task 2 — Project-specific Template Output (IN PROGRESS):** اتصال دکمه «مشاهده» کارت پروژه به صفحه خروجی با شناسه پروژه؛ بارگذاری قالب‌های فعال و resolve/render اطلاعات پروژه در همان صفحه با حفظ تجربه و رندرر موجود.
- [ ] **Task 3 — Regression, Integration & Delivery:** آزمون کارت/ناوبری، انتخاب و نمایش قالب، resolve اطلاعات پروژه و پاسخ فرم/رویداد، تصاویر و PDF؛ بررسی سازگاری بین دو مخزن، CI و انتشار فقط از workflow عملیاتی مجاز پس از تکمیل و تأیید.

