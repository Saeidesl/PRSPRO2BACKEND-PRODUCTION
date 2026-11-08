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
- `Router.js`: مسیر `GET /projects` با مجوزهای `PROJECT_VIEW` یا `PROJECT_CREATE`؛ مسیر جزئیات پروژه؛ مسیرهای ورود و خروج.
- `AuthService.js`: `login(body,params)` ورودی `username/password` را اعتبارسنجی می‌کند؛ پاسخ موفق `Response.success({token,expiresAt,user})` است؛ token از `params.token`, `sessionToken` یا `Authorization` خوانده می‌شود.
- `Response.js`: ساختار موفق `{success:true,data,error:null,meta}` و خطا `{success:false,data:null,error:{code,message,details},meta}`.
- `ProjectService.js` و `ProjectRepository.js`: منبع اصلی فهرست و دسترسی پروژه‌ها؛ کنترل Tenant و permission در Backend باقی می‌ماند.
- `AccessControlService.js`, `PermissionService.js`, `SessionManager.js`: مرجع هویت، نشست، tenant و مجوزها؛ افزونه Word مجوز یا دسترسی موازی تعریف نمی‌کند.
- APIهای استفاده‌شده در MVP: `POST /auth/login`, `GET /projects`, `GET /projects/:id`, `POST /auth/logout`.
- `PrintTemplateService.js` و `PrintTemplateRepository.js`: resolver و کتابخانه قالب چاپ موجود PMS؛ افزونه MVP هنوز آن‌ها را برای فیلدهای ساده فراخوانی نمی‌کند. توسعه داده‌های پیچیده باید در Task 3 قراردادهای موجود را reuse کند.
- `GoogleDriveStorage.js`: ذخیره فایل‌های tenant-scoped؛ در MVP افزونه، ذخیره قالب Word در Drive انجام نمی‌شود.

### معماری موجود Frontend و هم‌پوشانی‌هایی که باید حفظ شوند
- `js/core/api.js`: لایه درخواست استاندارد PMS؛ API_BASE_URL از تنظیمات نسخه عملیاتی خوانده می‌شود.
- `js/modules/print-designer.js` و `pages/print-designer.html`: Print Designer موجود با کتابخانه قالب، binding و خروجی؛ این قابلیت نباید بازنویسی یا موازی‌سازی شود.
- افزونه Word کلاینت Office مستقل است؛ مسیر انتخاب پروژه/ثبت پروژه جدید در PMS تغییر نمی‌کند.

### تصمیم‌ها و محدودیت‌های طراحی
- Office.js Add-in با manifest مشترک و WordApi 1.1؛ پشتیبانی Word Desktop و Word Online باید عملی آزمایش شود.
- Content Controls با Tag پایدار محل درج را تعیین می‌کنند؛ قالب و صفحه‌آرایی Word متعلق به Product Owner است.
- tenant isolation و permissionهای موجود Backend مرجع نهایی‌اند.
- در نسخه MVP هیچ endpoint، Sheet، ستون، schema، migration یا تغییر runtime در Backend اضافه نشده است.
- token فعلاً طبق قرارداد فعلی در query parameter درخواست‌ها ارسال می‌شود؛ این موضوع ریسک باقی‌مانده URL/log است و برای تأیید امنیت نهایی باید بررسی شود. هیچ token در سند یا log برنامه ذخیره نمی‌شود.
- هیچ deployment عملیاتی بدون تست و تأیید صریح Product Owner انجام نمی‌شود.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی وضعیت مخازن، TODO5 و ARCHITECTURE، شاخه‌ها و commitهای اصلی؛ شناسایی Print Designer، resolver و مسیرهای پروژه موجود؛ تعیین معماری اولیه افزونه مشترک Word.
  - *Log:* Backend `Router.js`, `AuthService.js`, `Response.js`, `ProjectService.js`, `ProjectRepository.js`; Frontend `js/core/api.js`, `js/modules/print-designer.js`, `pages/print-designer.html`; شیت موجود `36_PrintTemplates`; مسیرهای موجود پروژه و resolver قالب بررسی شدند. شاخه کاری مشترک از آخرین commitهای main ایجاد شد.
- [ ] **Task 2 — Word Add-in MVP (IN PROGRESS):** تکمیل روش احراز هویت و ارتباط امن با Backend؛ نمایش/جستجوی پروژه‌های مجاز؛ درج فیلدهای ساده در Content Controls؛ تأیید میزبانی HTTPS و تست واقعی Word Desktop/Online.
  - *Log:* هیچ فایل runtime یا دیتابیس Backend تغییر نکرد. مسیرهای موجود `POST /auth/login`, `GET /projects`, `GET /projects/:id`, `POST /auth/logout` استفاده می‌شوند. قرارداد `AuthService.login` ورودی `username/password` و خروجی `data.token` را تأیید می‌کند؛ `Router.js` مسیرها و کنترل مجوز پروژه را تأیید می‌کند؛ `Response.js` خطا را در `error.message` برمی‌گرداند. Frontend کلاینت Office.js و Content Controlها را پیاده کرده است. PR Draft #39 فقط این مستندات را ثبت می‌کند؛ هیچ API، Sheet، permission یا deployment جدید Backend وجود ندارد. Frontend PR #67 دارای Workflow کنترل ایستا است؛ Run `42511538519` برای Word Add-in Checks موفق شد. Frontend checks Run `42511538513` و Cross-repository QA Run `42511538408` نیز موفق شدند. CORS/redirect واقعی GAS، دسترسی Pages، تست Word Desktop/Online و بررسی امنیت token در URL هنوز تأیید نشده‌اند؛ Task 2 باز است.
- [ ] **Task 3 — داده‌های پیچیده و قالب‌بندی:** پشتیبانی از جدول‌های چندردیفی، تصاویر و انواع داده مرکزی/پاسخ فرم؛ حفظ قالب اصلی و ساخت نسخه کاری؛ بررسی رفتار RTL و فارسی در Word Desktop و Online.
- [ ] **Task 4 — آزمون یکپارچه و تحویل:** تست قرارداد API، امنیت tenant/token، دسترسی پروژه، Word Desktop و Online، فایل‌های قالب نمونه، خطاها و رگرسیون؛ مستندسازی استقرار افزونه و ارائه دستور تست به Product Owner. انتشار/توزیع سازمانی و deployment فقط پس از تأیید جداگانه.
