## 🎯 Current Objective
ساخت افزونه Microsoft Word برای اتصال مستقیم و امن به PMS عملیاتی؛ افزونه باید در Word ویندوز و Word Online کار کند. کاربر قالب را آزادانه در Word طراحی می‌کند، محل درج داده را با Content Controls دارای Tag مشخص می‌کند، پروژه را از فهرست PMS انتخاب می‌کند و اطلاعات در همان محل‌ها درج می‌شوند. قالب اصلی نباید تغییر کند؛ تکمیل روی یک نسخه کاری انجام شود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه کاری `feature/word-pms-connector-20261108`؛ شاخه پایه `main` در زمان شروع: `2ea57b4cf8066eaeec49633d0936c60cfa710834`.
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه کاری `feature/word-pms-connector-20261108`؛ شاخه پایه `main` در زمان شروع: `b383b2aca875b04b7f1c0b61fe624d50532aa101`.
- مخازن توسعه `PRSPRO2BACKEND` و `PRSPRO2` خارج از محدوده‌اند و نباید تغییر کنند.
- شاخه‌های `main` فقط مبنای انشعاب بوده‌اند؛ تغییرات این فاز فقط روی شاخه کاری انجام می‌شوند.

### معماری موجود Backend
- Runtime: Google Apps Script V8؛ دیتابیس Google Sheets؛ فایل‌ها در Google Drive؛ تمام درخواست‌ها از `Router.js` و کنترل دسترسی سمت سرور عبور می‌کنند.
- `Router.js`: مسیر `GET /projects` با مجوزهای `PROJECT_VIEW` یا `PROJECT_CREATE` و مسیرهای جزئیات پروژه؛ مسیرهای فعلی قالب چاپ نیز در همین Router ثبت شده‌اند.
- `PrintTemplateService.js`:
  - `list(params)`: فهرست قالب‌های فعال tenant.
  - `sources(params)`: فهرست فیلدهای مجاز پروژه، انواع اطلاعات مرکزی و فرم‌های فعال.
  - `resolve(id, body, params)`: اعتبارسنجی پروژه و tenant، بررسی دسترسی کاربر، resolve فیلدهای پروژه، اطلاعات مرکزی و پاسخ فرم‌های رویداد.
  - bindingهای موجود: `PROJECT_FIELD`, `PROJECT_INFORMATION`, `EVENT_FORM_RESPONSE`.
- `PrintTemplateRepository.js`: شیت موجود `36_PrintTemplates` و metadata/DefinitionJSON قالب‌های چاپ؛ ایجاد schema به‌صورت additive.
- `ProjectService.js` و `ProjectRepository.js`: منبع اصلی فهرست و دسترسی پروژه‌ها.
- `AccessControlService.js`, `PermissionService.js`, `AuthService.js`: مرجع هویت، tenant و مجوزها؛ افزونه Word نباید مجوز یا دسترسی موازی تعریف کند.
- APIهای موجود و مرتبط: `GET /projects`, `GET /projects/:id`, `GET /print-templates`, `GET /print-templates/sources` و resolve قالب چاپ از مسیرهای موجود. قرارداد دقیق HTTP/توکن و CORS برای Office Add-in در Task 2 باید از کد کامل Router و PMS.Api استخراج و آزمایش شود.
- `GoogleDriveStorage.js`: ذخیره فایل‌های tenant-scoped؛ در MVP افزونه، ذخیره قالب Word در Drive فقط در صورت نیاز قطعی و پس از بررسی امنیتی انجام می‌شود.

### معماری موجود Frontend و هم‌پوشانی‌هایی که باید حفظ شوند
- `js/core/api.js`: لایه درخواست استاندارد PMS شامل مدیریت token، خطا، کش و متدهای GET/POST؛ درخواست‌های فعلی فرانت‌اند باید از همین لایه عبور کنند.
- `js/modules/print-designer.js` و `pages/print-designer.html`: Print Designer موجود با کتابخانه قالب، binding و خروجی PDF؛ این قابلیت نباید بی‌دلیل بازنویسی یا موازی‌سازی شود.
- Print Designer از bindingهای موجود و resolver بک‌اند استفاده می‌کند. افزونه Word باید تا حد امکان قرارداد داده و قواعد دسترسی resolver موجود را reuse کند؛ قالب‌های Word نباید به Definitionهای ناسازگار یا مخزن داده موازی تبدیل شوند.
- افزونه Word به‌عنوان کلاینت Office مستقل توسعه می‌یابد؛ UI انتخاب پروژه در Word است، نه فرم/مسیر ثبت پروژه جدید در PMS.

### تصمیم‌ها و محدودیت‌های طراحی
- پشتیبانی هم‌زمان Word Desktop و Word Online؛ تکنولوژی هدف Office JavaScript Add-in / Office.js با manifest مشترک و فقط APIهای سازگار در هر دو محیط.
- جایگذاری با Word Content Controls و Tagهای پایدار؛ ظاهر سند، فونت، جدول، صفحه‌آرایی و متن ثابت تحت مالکیت کاربر باقی می‌ماند.
- پروژه از فهرست مجاز PMS انتخاب می‌شود؛ هیچ شناسه پروژه یا داده‌ای بدون اعتبارسنجی سمت سرور پذیرفته نمی‌شود.
- اصل tenant isolation، مجوزهای فعلی، حداقل‌سازی داده، نگهداری token امن، جلوگیری از ثبت token در فایل Word/log و عدم تغییر قالب اصلی الزامی است.
- داده‌های چندردیفی، تصاویر، جداول و خروجی PDF باید با حفظ سازگاری هر دو نسخه Word آزمایش شوند.
- هیچ deployment عملیاتی انجام نمی‌شود بدون تست و تأیید صریح Product Owner.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی وضعیت مخازن، TODO5 و ARCHITECTURE، شاخه‌ها و commitهای اصلی؛ شناسایی Print Designer، resolver و مسیرهای پروژه موجود؛ تعیین معماری اولیه افزونه مشترک Word.
  - *Log:* Backend `Router.js`, `PrintTemplateService.js`, `PrintTemplateRepository.js`; Frontend `js/core/api.js`, `js/modules/print-designer.js`, `pages/print-designer.html`; شیت `36_PrintTemplates`; APIهای `GET /projects`, `GET /print-templates`, `GET /print-templates/sources` و resolver موجود بررسی شدند. TODO5 در هر دو مخزن در وضعیت Ready for the next feature بود؛ فاز قبلی بسته شده بود. شاخه کاری مشترک از آخرین commitهای main ایجاد شد.
- [ ] **Task 2 — Word Add-in MVP (IN PROGRESS):** تکمیل بررسی فنی Office.js، روش احراز هویت امن به PMS و سازگاری GAS/CORS؛ پیاده‌سازی افزونه مشترک ویندوز/آنلاین با انتخاب و جستجوی پروژه و درج فیلدهای تکی در Content Controls؛ reuse کردن منطق resolve و مجوزهای موجود تا حد ممکن.
- [ ] **Task 3 — داده‌های پیچیده و قالب‌بندی:** پشتیبانی از جدول‌های چندردیفی، تصاویر و انواع داده مرکزی/پاسخ فرم؛ حفظ قالب اصلی و ساخت نسخه کاری؛ بررسی رفتار RTL و فارسی در Word Desktop و Online.
- [ ] **Task 4 — آزمون یکپارچه و تحویل:** تست قرارداد API، امنیت tenant/token، دسترسی پروژه، Word Desktop و Online، فایل‌های قالب نمونه، خطاها و رگرسیون؛ مستندسازی استقرار افزونه و ارائه دستور تست به Product Owner. انتشار/توزیع سازمانی و deployment فقط پس از تأیید جداگانه.
