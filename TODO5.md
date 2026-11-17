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
- [ ] **Task 3 — Progressive Output & Asset Loading (IN PROGRESS):** نمایش تدریجی هر قالب پس از آماده‌شدن، بارگذاری کنترل‌شده تصاویر/PDF و جلوگیری از قفل‌شدن کل خروجی به‌خاطر یک قالب.
- [ ] **Task 4 — Regression, Performance & Operational Acceptance:** آزمون برابری داده، tenant/permission، عدم تکرار repository reads، چاپ/PDF، موبایل و سنجش زمان واقعی خروجی پروژه؛ پذیرش Product Owner.

### وضعیت اجرا
- Task 1 Discovery و Task 2 Batch Resolve تکمیل و با تست عملیاتی Product Owner پذیرفته شدند.
- PR #87 در Backend ادغام شده و commit `d1c34d72cc8ff9b2e736dc7c880c5cca36e480af` روی `main` قرار دارد؛ Apps Script با workflow run `44134620890` روی همین SHA با موفقیت منتشر شد.
- Frontend PR #140 نیز در مخزن عملیاتی ادغام شد؛ commit `0a3a67ff657300f0e79ce193c3c461d248e42691` روی `main` قرار دارد و GitHub Pages run `44135173608` برای همین SHA با conclusion=success پایان یافت.
- Product Owner در 2026-11-17 صحت خروجی چندقالبی، داده‌ها، ویرایش متن/فایل/جدول، چاپ/PDF و موبایل را تأیید کرد.
- Task 3 اکنون IN PROGRESS است؛ محدوده آن نمایش تدریجی و زمان‌بندی بارگذاری assetهاست. هیچ تغییر داده عملیاتی یا schema انجام نشده است.

### Task 2 implementation record (ACCEPTED)
- شاخه کاری: `perf/project-print-output-batch-resolve-20261117`.
- `PrintTemplateService.resolveMany(body, params)` اضافه شد: دریافت یک‌باره فهرست قالب‌ها از `PrintTemplateRepository.getAll()`، محدودیت 50 قالب، tenant scope و فقط قالب‌های ACTIVE، namespacing شناسه Bindingها و یک اجرای مشترک `_resolveProjectData()` برای union همه Bindingها.
- در صورت وجود Definition ناسازگار، مسیر fallback فقط در همان درخواست فعال می‌شود تا خطای یک قالب، قالب‌های دیگر را از نمایش محروم نکند؛ دسترسی پروژه قبل از fallback مجدداً اعتبارسنجی می‌شود.
- `Router.js`: مسیر `POST /print-templates/resolve` با مجوز `PROJECT_VIEW` به resolver تجمیعی متصل شد. مسیر قدیمی `POST /print-templates/:id/resolve` بدون تغییر حفظ شده است.
- تست قراردادی جدید: `tests/print-template-batch-resolve.test.js`. تست‌های CI و بازبینی‌های Backend موفق شدند؛ PR #87 ادغام و انتشار Apps Script برای SHA نهایی تأیید شد.


### Task 3 discovery handoff
- ورودی کار: حفظ resolver batch فعلی و ارتقای تجربه نمایش خروجی بدون تغییر قراردادهای داده یا ایجاد cache پویا.
- بررسی و پیاده‌سازی در Frontend اصلی `pages/print-output.html` و `js/modules/print-designer.js` انجام شود؛ مسیرهای فعلی asset تصویر و PDF حفظ شوند.
