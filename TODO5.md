## 🎯 Current Objective

کاهش محسوس زمان نمایش خروجی قالب‌های پروژه، به‌ویژه زمانی که یک پروژه چند قالب فعال دارد؛ حذف درخواست‌های resolve تکراری و خواندن چندباره Google Sheets، همراه با نمایش تدریجی خروجی بدون نمایش داده کهنه. اطلاعات پروژه، رویدادها و پاسخ فرم‌ها باید در هر بار بازکردن خروجی از سرور و به‌روز دریافت شوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه مبنا در شروع فاز: `main`
- شاخه پیاده‌سازی ادغام‌شده: `perf/project-print-output-batch-resolve-20261117`.
- Backend main پس از ادغام: `d1c34d72cc8ff9b2e736dc7c880c5cca36e480af`.
- Frontend main پس از ادغام: `0a3a67ff657300f0e79ce193c3c461d248e42691`.
- شاخه ثبت پذیرش و انتقال تسک: `docs/batch-resolve-acceptance-log-20261117`.
- فاز قبلی بهینه‌سازی resolver در 2026-11-16 در ARCHITECTURE.md بسته و آرشیو شده است؛ این TODO5 برای فاز مستقل جدید بازسازی شد.
- مخازن Development خارج از محدوده‌اند.

### جریان فعلی Backend و علت تکرار
- `Router.js`:
  - `GET /print-templates` با `SYSTEM_SETTINGS` یا `PROJECT_VIEW` به `PrintTemplateService.list(params)` متصل است.
  - `POST /print-templates/:id/resolve` با `PROJECT_VIEW` به `PrintTemplateService.resolve(id, body, params)` متصل است.
  - `GET /print-templates/:id/images/:assetId` و `GET /print-templates/:id/pdf` فایل‌های ثابت قالب را جداگانه ارائه می‌کنند.
- `PrintTemplateService.js`:
  - `resolve(id, body, params)` قالب را tenant-scoped دریافت می‌کند، Definition را با `_definition(template)` می‌خواند و سپس `_resolveProjectData(ProjectID, definition, user)` را اجرا می‌کند.
  - `_resolveProjectData` برای هر درخواست پروژه را با `ProjectRepository.findById` می‌خواند و بسته به Bindingها از `InformationTypeRepository.findByTenant`، `ProjectInformationRepository.findByProject`، `EventRepository.findByProjectId`، `FormRepository.getEventResponses`، `EventTypeRepository.getAll` و repositoryهای وابسته استفاده می‌کند.
  - بهینه‌سازی قبلی فقط خواندن تکراری درون یک resolve را حذف کرده است؛ چون Frontend برای هر قالب یک resolve مستقل می‌فرستد، همین منابع در سطح هر قالب دوباره خوانده می‌شوند.
- Repositoryها و منابع داده فعلی حفظ می‌شوند؛ در Discovery هیچ تغییر Sheet، ستون، schema یا migration لازم تشخیص داده نشد.

### جریان فعلی Frontend و گلوگاه‌های مشاهده‌شده
- صفحه: `pages/print-output.html`.
- منطق: `js/modules/print-designer.js`.
- `PrintDesigner.initProjectOutput(projectId)`:
  - `getTemplateListCached()` و `GET /projects/:id` را موازی اجرا می‌کند.
  - سپس حلقه قالب‌ها را به‌صورت ترتیبی اجرا می‌کند؛ برای هر قالب `POST /print-templates/:id/resolve` جداگانه می‌فرستد و تا پایان resolve و render قالب بعدی شروع نمی‌شود.
  - هر قالب در `renderOutputDocument()` فایل‌های تصویری و در صورت وجود PDF پس‌زمینه را دریافت/پردازش می‌کند.
- `loadTemplateImages()` تصاویر یک قالب را در همان قالب با `Promise.all` بارگذاری می‌کند؛ `loadOutputPdfPages()` برای PDF یک درخواست جداگانه دارد.
- نتیجه: تأخیر قالب‌ها جمع می‌شود و برای چند قالب، خواندن داده‌های پروژه/رویداد/فرم در Backend نیز تکرار می‌شود.
- `test-results/latest-performance-report.json` در 2026-11-17، زمان route-ready صفحه عمومی print-output را 4416ms و navigation را 7073ms ثبت کرده؛ این گزارش اجرای واقعی خروجی پروژه و تعداد resolveها را اندازه‌گیری نکرده و معیار خط پایه قطعی برای این قابلیت نیست.

### طرح فنی پیشنهادی برای اجرا
- افزودن مسیر تجمیعی واحد `POST /print-templates/resolve` با payload شامل `ProjectID` و فهرست `TemplateIDs`؛ مسیر قدیمی `POST /print-templates/:id/resolve` و قرارداد پاسخ آن بدون تغییر باقی می‌ماند.
- افزودن `PrintTemplateService.resolveMany(...)` و context مشترک فقط در محدوده همان درخواست:
  - قالب‌ها ابتدا با TenantID و Status فعال اعتبارسنجی شوند.
  - union از Bindingهای همه قالب‌ها ساخته شود.
  - پروژه، اطلاعات مرکزی، رویدادها، پاسخ‌های فرم، انواع رویداد و فرم‌ها فقط یک‌بار و فقط در صورت نیاز خوانده شوند.
  - داده resolve شده برای هر قالب با همان منطق selection/binding فعلی projection شود.
  - خروجی هر قالب مستقل باشد تا خطای یک قالب مانع نمایش قالب‌های دیگر نشود.
- مجوز `PROJECT_VIEW`، tenant isolation، کنترل دسترسی پروژه و محدودیت قالب فعال برای تمام TemplateIDs اعمال شود؛ هیچ شناسه قالبی خارج از Tenant نباید داده‌ای افشا کند.
- هیچ cache بین درخواست‌ها برای داده‌های پویا ایجاد نشود؛ resolve همیشه تازه بماند.
- تست contract برای batch و legacy، tenant isolation، پروژه غیرمجاز، قالب غیرفعال/ناموجود، قالب با Bindingهای مختلف و عدم تکرار repository reads اضافه شود.

### معیارهای پذیرش
- برای هر بازکردن خروجی پروژه، تعداد درخواست‌های resolve از N درخواست به یک درخواست batch کاهش یابد.
- خواندن مشترک repositoryها برای همه قالب‌ها حداکثر یک‌بار در هر درخواست batch انجام شود.
- خروجی داده‌ها با رفتار فعلی resolve تک‌قالبی یکسان باشد؛ داده قدیمی یا cross-tenant نمایش داده نشود.
- خطای یک قالب به قالب‌های دیگر سرایت نکند.
- مسیر قدیمی و preview/editor فعلی backward-compatible بمانند.
- هیچ تغییر مخرب در Google Sheets یا داده عملیاتی انجام نشود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی کامل مسیر نمایش خروجی، درخواست‌های resolve، repository reads، asset loading و آزمون‌های موجود.
  - *Log:* در شاخه main، `Router.js`، `PrintTemplateService.js` و `js/modules/print-designer.js` بررسی شدند. مشخص شد `initProjectOutput()` در `js/modules/print-designer.js` برای هر قالب به‌صورت ترتیبی `POST /print-templates/:id/resolve` ارسال می‌کند؛ هر درخواست در `PrintTemplateService.resolve()`، `_resolveProjectData()` را مستقل اجرا کرده و repositoryهای پروژه/رویداد/فرم را مجدداً می‌خواند. قراردادهای فعلی و مجوزهای `PROJECT_VIEW` ثبت شدند. گزارش UI audit فعلی، زمان route را دارد اما اجرای خروجی واقعی پروژه را اندازه نمی‌گیرد. هیچ کد runtime یا داده عملیاتی در Discovery تغییر نکرد.
- [x] **Task 2 — Shared Batch Resolve:** پیاده‌سازی resolve تجمیعی برای همه قالب‌های فعال پروژه با context مشترک و خواندن یک‌باره منابع مشترک، با حفظ مسیر قدیمی.
  - *Log:* `PrintTemplateService.js` تابع `resolveMany(body, params)` را اضافه کرد؛ فهرست قالب‌ها با tenant scope، وضعیت ACTIVE و سقف 50 قالب اعتبارسنجی می‌شود، Bindingهای قالب‌ها namespaced شده و `_resolveProjectData()` برای داده‌های مشترک یک‌بار اجرا می‌شود. در صورت Definition ناسازگار، خطای هر قالب isolate می‌شود. در `Router.js` مسیر `POST /print-templates/resolve` با مجوز `PROJECT_VIEW` اضافه شد و `POST /print-templates/:id/resolve` بدون تغییر باقی ماند. تست `tests/print-template-batch-resolve.test.js` اضافه شد. PR #87 با squash ادغام شد؛ commit عملیاتی Backend: `d1c34d72cc8ff9b2e736dc7c880c5cca36e480af`. workflow رسمی `sync-apps-script.yml` با run `44134620890` روی همین SHA با موفقیت push و deploy کرد؛ step «Deploy isolated production web app» نیز success بود. Product Owner تست یکپارچه خروجی پروژه را در 2026-11-17 تأیید کرد. هیچ Sheet، schema، migration یا داده عملیاتی تغییر نکرد.
- [x] **Task 3 — Progressive Output & Asset Loading:** نمایش تدریجی هر قالب پس از آماده‌شدن، بارگذاری کنترل‌شده تصاویر/PDF و جلوگیری از قفل‌شدن کل خروجی به‌خاطر یک قالب.
  - *Log:* در مخزن Frontend عملیاتی، `js/modules/print-designer.js` در `PrintDesigner.initProjectOutput(projectId)` ابتدا placeholder همه قالب‌ها را با ترتیب اصلی در DOM قرار می‌دهد و سپس حداکثر دو قالب را هم‌زمان render می‌کند؛ هر قالب مستقل پس از آماده‌شدن جایگزین placeholder می‌شود و خطای آن سایر قالب‌ها را متوقف نمی‌کند. `mapWithConcurrency(items, concurrency, worker)` برای محدودسازی هم‌زمانی اضافه شد؛ تصاویر حداکثر با concurrency=3 و عناصر هر صفحه با concurrency=2 پردازش می‌شوند. مدیریت `outputPdfObjectUrls` و `releaseOutputPdfObjectUrls(urls)` برای آزادسازی مستقل منابع PDF اصلاح شد و از تداخل page-size در render موازی جلوگیری شد. `index.html` cache-bust به `print-designer.js?v=20261118-project-print-progressive-1` تغییر کرد. تست‌های `tests/project-print-output-batch.test.js`, `tests/project-print-designer.test.js` و `tests/print-template-library.test.js` پوشش رگرسیون را به‌روزرسانی کردند. Frontend PR #145 با squash در main ادغام شد؛ merge commit `07baba1fb07bce07f57e697e12f85934190e71d9`. CI و QA روی head PR با runهای `44141840753`, `44141840761`, `44141840890`, `44141840908` و `44141840868` موفق بودند. Product Owner تست عملیاتی نسخه منتشرشده را در 2026-11-17 تأیید کرد. Backend runtime، API، Google Sheets schema و داده عملیاتی در این تسک تغییر نکردند.
- [ ] **Task 4 — Regression, Performance & Operational Acceptance (IN PROGRESS):** آزمون یکپارچه خروجی چندقالبی، برابری داده، tenant/permission، عدم تکرار repository reads، چاپ/PDF، موبایل و سنجش زمان واقعی؛ پذیرش نهایی Product Owner.

### وضعیت اجرا
- Task 1، Task 2 و Task 3 تکمیل و با تست عملیاتی Product Owner پذیرفته شدند.
- Backend برای Task 3 تغییر runtime نداشت؛ API تجمیعی Task 2 همچنان روی Apps Script عملیاتی منتشرشده است.
- Frontend PR #145 در `main` ادغام شد؛ merge commit `07baba1fb07bce07f57e697e12f85934190e71d9`. CI و QAهای PR موفق بودند و Product Owner تست نسخه عملیاتی را در 2026-11-17 تأیید کرد.
- Task 4 اکنون IN PROGRESS است و شامل رگرسیون جامع، سنجش عملکرد خروجی واقعی و کنترل دسترسی/یکپارچگی داده‌هاست.
### Task 2 implementation record (ACCEPTED)
- شاخه کاری: `perf/project-print-output-batch-resolve-20261117`.
- `PrintTemplateService.resolveMany(body, params)` اضافه شد: دریافت یک‌باره فهرست قالب‌ها از `PrintTemplateRepository.getAll()`، محدودیت 50 قالب، tenant scope و فقط قالب‌های ACTIVE، namespacing شناسه Bindingها و یک اجرای مشترک `_resolveProjectData()` برای union همه Bindingها.
- در صورت وجود Definition ناسازگار، مسیر fallback فقط در همان درخواست فعال می‌شود تا خطای یک قالب، قالب‌های دیگر را از نمایش محروم نکند؛ دسترسی پروژه قبل از fallback مجدداً اعتبارسنجی می‌شود.
- `Router.js`: مسیر `POST /print-templates/resolve` با مجوز `PROJECT_VIEW` به resolver تجمیعی متصل شد. مسیر قدیمی `POST /print-templates/:id/resolve` بدون تغییر حفظ شده است.
- تست قراردادی جدید: `tests/print-template-batch-resolve.test.js`. تست‌های CI و بازبینی‌های Backend موفق شدند؛ PR #87 ادغام و انتشار Apps Script برای SHA نهایی تأیید شد.


### Task 3 discovery handoff
- ورودی کار: حفظ resolver batch فعلی و ارتقای تجربه نمایش خروجی بدون تغییر قراردادهای داده یا ایجاد cache پویا.
- بررسی و پیاده‌سازی در Frontend اصلی `pages/print-output.html` و `js/modules/print-designer.js` انجام شود؛ مسیرهای فعلی asset تصویر و PDF حفظ شوند.


### Task 3 implementation record (ACCEPTED — Frontend-only)
- این Macro-Task فقط در Frontend پیاده‌سازی شد؛ Backend runtime، endpointها، مجوزها، Google Sheets schema و داده عملیاتی تغییری نکردند.
- جزئیات فنی و پذیرش در Log تسک ثبت شده است؛ Task 4 برای Regression, Performance & Operational Acceptance فعال است.


### Task 4 — Discovery findings & validation plan (2026-11-17)

#### Repository baseline
- مخزن عملیاتی Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه مبنا `main`؛ آخرین commit مشاهده‌شده پیش از شاخه مستندات: `dcbf9655ee0df80133b1652095dc07a509f2b25d`.
- مخزن عملیاتی Frontend مرتبط: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه مبنا `main`؛ آخرین commit مشاهده‌شده: `48a6c631a15c5c7f52100176e4053eb58b42ddb5`.
- هر دو مخزن فعال، غیر archived، دارای default branch برابر `main` و دسترسی مدیریتی مخزن تأیید شدند. فقط مخازن عملیاتی بررسی شدند.

#### Backend implementation map
- `Router.js` در `doPost(path, body, params)`: مسیر `POST /print-templates/resolve` با `AccessControlService.require(params, 'PROJECT_VIEW')` به `PrintTemplateService.resolveMany(body, params)` متصل است؛ مسیر قدیمی `POST /print-templates/:id/resolve` همچنان به `resolve(id, body, params)` متصل است.
- `PrintTemplateService.js`:
  - `resolveMany(body, params)`: اعتبارسنجی ProjectID و 1 تا 50 شناسه قالب، حذف ID تکراری، دریافت یک‌باره `PrintTemplateRepository.getAll()`، محدودسازی به Tenant جاری و قالب ACTIVE، namespacing شناسه Bindingها، اجرای مشترک `_resolveProjectData()` و بازسازی نتیجه مستقل هر قالب.
  - `_resolveProjectData(projectId, definition, user)`: اعتبارسنجی وجود پروژه، Tenant و دسترسی کاربر با `ProjectService._isProjectAvailableToUser_()`; خواندن منابع اطلاعات/رویداد/فرم به‌صورت شرطی بر اساس Bindingها.
  - در صورت شکست resolve مشترک، مسیر fallback برای حفظ جداسازی خطا، resolve تکی قالب‌ها را اجرا می‌کند؛ این مسیر باید در آزمون‌ها به‌طور مستقل بررسی شود.
- تست موجود `tests/print-template-batch-resolve.test.js` عمدتاً assertionهای ساختاری روی متن کد است؛ مسیر، مجوز، سقف تعداد، tenant/ACTIVE filter، namespacing، یک فراخوانی مشترک و حفظ resolver قدیمی را بررسی می‌کند، اما اجرای واقعی سرویس با repository spy و شمارش فراخوانی‌ها یا آزمون منفی دسترسی را اثبات نمی‌کند.
- هیچ نشانه‌ای از نیاز به تغییر Sheet، schema، migration یا داده عملیاتی در محدوده فعلی وجود ندارد.

#### Backend validation work required
- آزمون اجرایی با mock/stub برای شمارش دقیق فراخوانی Repositoryها در resolve batch سالم؛ تفکیک منابع موردنیاز و منابعی که به Binding وابسته نیستند.
- آزمون عدم دسترسی به پروژه خارج از Tenant یا خارج از محدوده دسترسی کاربر، رد قالب غیرفعال/متعلق به Tenant دیگر، رد بیش از 50 قالب و حفظ رفتار endpoint قدیمی.
- آزمون fallback و خطای مستقل قالب بدون افشای داده بین قالب‌ها؛ تأیید شود fallback فقط در شرایط تعریف ناسازگار فعال می‌شود و به‌عنوان مسیر عادی عملکرد استفاده نمی‌شود.

#### Integration & operational acceptance criteria
- برای پروژه دارای N قالب فعال، یک درخواست `POST /print-templates/resolve` و صفر درخواست resolve تکی در مسیر خروجی پروژه ثبت شود.
- خروجی داده هر قالب با resolver تکی برای همان ورودی برابر باشد؛ اطلاعات پروژه/رویداد/پاسخ فرم در هر بازکردن خروجی تازه باشد.
- شمارش Repository reads و زمان پاسخ batch در سناریوی چندقالبی ثبت شود؛ زمان assetهای تصویر/PDF جدا از زمان resolve گزارش شود.
- چاپ/ذخیره PDF، شکست یک قالب، قالب دارای PDF و تصاویر، و عدم تغییر داده عملیاتی در سناریوهای تست کنترل شوند.
- آزمون‌ها فقط با fixture/mock یا محیط staging مجاز اجرا شوند؛ هیچ ثبت/ویرایش/حذف آزمایشی در دیتابیس عملیاتی انجام نشود.
