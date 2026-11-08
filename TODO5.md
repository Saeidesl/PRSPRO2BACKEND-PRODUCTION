## 🎯 Current Objective
پیاده‌سازی اتصال Google Sheets به PMS عملیاتی برای استفاده از قالب‌های کاملاً قابل طراحی توسط کاربر. کاربر در Google Sheets صفحه‌آرایی، سلول‌ها، ادغام، جدول‌ها، تصاویر و تنظیمات چاپ را آزادانه انجام می‌دهد؛ سپس پروژه را از فهرست مجاز PMS انتخاب می‌کند و داده‌ها در محل‌های تعریف‌شده قالب درج می‌شوند. قالب اصلی باید بدون تغییر بماند و برای هر پروژه یک نسخه تکمیل‌شده مستقل ساخته شود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feature/google-sheets-project-templates-20261108`، منشأ شاخه: `main`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feature/google-sheets-project-templates-20261108`، منشأ شاخه: `main`.
- مخازن توسعه `PRSPRO2BACKEND` و `PRSPRO2` خارج از محدوده‌اند.
- کار قبلی Word در PRهای Draft #39 و #67 ادغام نشده بود؛ هر دو PR بسته شدند. شاخه قبلی `feature/word-pms-connector-20261108` دست‌نخورده به‌عنوان سابقه باقی ماند. شاخه جدید از `main` ساخته شد و هیچ فایل Word Add-in را به ارث نمی‌برد.

### معماری Backend کشف‌شده
- Runtime: Google Apps Script V8؛ Google Sheets پایگاه داده PMS؛ Google Drive محل فایل‌ها؛ `Router.js` مرجع API و مجوزها.
- `Router.js`: مسیرهای `GET /projects` و `GET /projects/:id` برای فهرست/جزئیات پروژه موجودند و کنترل دسترسی در سمت سرور انجام می‌شود.
- `PrintTemplateService.js`: کتابخانه قالب چاپ مرکزی tenant-scoped؛ متدهای `list`, `get`, `sources`, `create`, `update` و resolver داده پروژه/اطلاعات مرکزی/فرم‌ها را دارد.
- `PrintTemplateRepository.js`: شیت `36_PrintTemplates` برای metadata و `DefinitionJSON` قالب‌های Print Designer؛ این ساختار قالب تصویری/Canvas است و نباید بدون بررسی به‌عنوان مخزن فایل Google Sheets استفاده شود.
- `GoogleDriveStorage.js`: ذخیره‌سازی Drive موجود؛ باید بررسی شود آیا برای کپی/نگهداری Spreadsheet مناسب است یا عملیات فایل Sheets باید با API/DriveApp اختصاصی انجام شود.
- `AccessControlService.js`, `PermissionService.js`, `AuthService.js`: مرجع احراز هویت، tenant و مجوز؛ اتصال جدید نباید مسیر دسترسی موازی یا دور زدن کنترل مجوز ایجاد کند.
- منبع داده موجود برای بازاستفاده: فهرست و جزئیات پروژه، اطلاعات مرکزی و پاسخ فرم‌ها از سرویس‌های فعلی؛ `PrintTemplateService.sources` برای فهرست منابع و فیلدها.
- هنوز API یا ساختار ذخیره‌سازی اختصاصی Google Sheets Template تعریف نشده است.

### معماری Frontend کشف‌شده
- `js/core/api.js`: کلاینت استاندارد API با token، مدیریت خطا و کش؛ هر درخواست از رابط PMS باید از همین لایه عبور کند.
- `js/modules/print-designer.js` و `pages/print-designer.html`: Print Designer موجود با قالب‌های ذخیره‌شده، منابع داده، binding، پیش‌نمایش و خروجی؛ قابلیت موجود حفظ می‌شود و قالب واقعی Google Sheets نباید با فرم‌ساز موازی در PMS بازسازی شود.
- کاربر انتخاب کرده است که خود Google Sheets محیط طراحی و صفحه‌آرایی باشد؛ PMS فقط باید فهرست قالب‌های مجاز، انتخاب پروژه، نگاشت/جایگذاری و تولید نسخه خروجی را پشتیبانی کند.

### تصمیم‌های قطعی محصول
- ابزار طراحی قالب: خود Google Sheets؛ کاربر کنترل کامل سلول‌ها، ادغام، فرمت، تصاویر، جدول‌ها و صفحه چاپ را دارد.
- داده‌ها از PMS و با رعایت مجوزهای فعلی پروژه دریافت می‌شوند.
- قالب اصلی هرگز overwrite نمی‌شود؛ برای هر عملیات خروجی، یک کپی کاری مستقل ساخته می‌شود.
- خروجی تکمیل‌شده در Google Drive نگهداری می‌شود و قابلیت چاپ/Export PDF از Google Sheets بررسی می‌شود.
- هیچ تغییر مخرب در شیت‌های عملیاتی PMS، اطلاعات پروژه یا قالب‌های Print Designer موجود مجاز نیست.
- روش تعیین محل داده در قالب (نام‌گذاری سلول‌ها، markerها یا mapping sheet) و نحوه انتخاب پروژه در Task 2 نهایی می‌شود.
- Word Add-in کنار گذاشته شد؛ PRهای #39 و #67 بسته و ادغام‌نشده‌اند. هیچ deployment انجام نشده است.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی وضعیت مخازن عملیاتی، TODO5 و ARCHITECTURE در main، شاخه‌ها و سابقه Word؛ کشف Print Designer، resolver داده، API پروژه و ذخیره‌سازی Drive؛ تعریف محدوده Google Sheets.
  - *Log:* در هر دو مخزن عملیاتی، `TODO5.md` در main برابر `Ready for the next feature` بود و `ARCHITECTURE.md` بررسی شد. شاخه کاری جدید `feature/google-sheets-project-templates-20261108` از main ساخته شد. Backend: `Router.js`, `PrintTemplateService.js`, `PrintTemplateRepository.js`, `GoogleDriveStorage.js` بررسی شدند. Frontend: `js/core/api.js`, `js/modules/print-designer.js`, `pages/print-designer.html` بررسی شدند. PR #39 و PR #67 مربوط به Word با وضعیت closed و merged=false بسته شدند؛ شاخه Word حفظ شد و هیچ تغییر آن به شاخه جدید منتقل نشد.
- [ ] **Task 2 — Google Sheets Template MVP (IN PROGRESS):** تعیین و پیاده‌سازی روش ثبت/انتخاب قالب Google Sheets، تعریف قرارداد marker یا cell mapping، انتخاب پروژه مجاز، دریافت داده از API موجود، ساخت نسخه مستقل از قالب و درج داده در سلول‌ها؛ حفظ قالب اصلی.
- [ ] **Task 3 — داده‌های پیشرفته و خروجی:** پشتیبانی از اطلاعات مرکزی چندمقداری، جدول‌ها/ردیف‌های تکرارشونده، تصاویر و فایل‌های مرتبط؛ تنظیم خروجی چاپ A4/PDF و نگهداری نسخه‌های تکمیل‌شده در Drive.
- [ ] **Task 4 — آزمون یکپارچه و تحویل:** تست مجوز و tenant، صحت داده و mapping، عدم تغییر قالب اصلی، کپی و خروجی PDF، عملکرد در Google Sheets و عدم رگرسیون Print Designer؛ مستندسازی و دستور تست Product Owner.
