## 🎯 Current Objective

کاهش محسوس زمان نمایش خروجی قالب‌های پروژه، به‌ویژه زمانی که یک پروژه چند قالب فعال دارد؛ حذف درخواست‌های resolve تکراری و خواندن چندباره Google Sheets، همراه با نمایش تدریجی خروجی بدون نمایش داده کهنه. اطلاعات پروژه، رویدادها و پاسخ فرم‌ها باید در هر بار بازکردن خروجی از سرور و به‌روز دریافت شوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه مبنا در شروع فاز: `main`
- شاخه کاری هر دو مخزن: `perf/project-print-output-batch-resolve-20261117`
- Backend main در Discovery: `5178c90110e8a7d4dcba9469947b4ca0095c5137`
- Frontend main در Discovery: `c170cff1c0815d8ecf4559c6f200e27493fc5f2c`
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
- [ ] **Task 3 — Progressive Output & Asset Loading (IN PROGRESS):** نمایش تدریجی هر قالب پس از آماده‌شدن، بارگذاری کنترل‌شده تصاویر/PDF و جلوگیری از قفل‌شدن کل خروجی به‌خاطر یک قالب.
- [ ] **Task 4 — Regression, Performance & Operational Acceptance:** آزمون برابری داده، tenant/permission، عدم تکرار repository reads، چاپ/PDF، موبایل و سنجش زمان واقعی خروجی پروژه؛ پذیرش Product Owner.

### وضعیت اجرا
- Task 1 و Task 2 تکمیل شده‌اند؛ Task 2 در main ادغام و روی Apps Script عملیاتی منتشر شده است.
- Backend main: d1c34d72cc8ff9b2e736dc7c880c5cca36e480af؛ PR #87 ادغام‌شده.
- Apps Script workflow run 44134620890 روی SHA فوق completed/success؛ مرحله Deploy isolated production web app نیز موفق بوده است.
- پذیرش عملیاتی Product Owner در 2026-11-17 ثبت شد.
- هیچ Google Sheets schema، migration یا داده عملیاتی تغییر نکرد.
- Task 3 گام بعدی فاز است و هنوز شروع نشده است.




### Task 2 implementation status (IN PROGRESS)
- شاخه کاری: `perf/project-print-output-batch-resolve-20261117`.
- `PrintTemplateService.resolveMany(body, params)` اضافه شد: دریافت یک‌باره فهرست قالب‌ها از `PrintTemplateRepository.getAll()`، محدودیت 50 قالب، tenant scope و فقط قالب‌های ACTIVE، namespacing شناسه Bindingها و یک اجرای مشترک `_resolveProjectData()` برای union همه Bindingها.
- در صورت وجود Definition ناسازگار، مسیر fallback فقط در همان درخواست فعال می‌شود تا خطای یک قالب، قالب‌های دیگر را از نمایش محروم نکند؛ دسترسی پروژه قبل از fallback مجدداً اعتبارسنجی می‌شود.
- `Router.js`: مسیر `POST /print-templates/resolve` با مجوز `PROJECT_VIEW` به resolver تجمیعی متصل شد. مسیر قدیمی `POST /print-templates/:id/resolve` بدون تغییر حفظ شده است.
- تست قراردادی جدید: `tests/print-template-batch-resolve.test.js`. تست‌های خودکار CI و بازبینی نهایی هنوز در انتظار هستند؛ Task 2 تکمیل‌شده محسوب نمی‌شود.
### Task 2 implementation status (COMPLETED)
- PrintTemplateService.js: تابع resolveMany(body, params)، حداکثر 50 قالب، tenant scope، ACTIVE-only، namespaced Binding IDs و context مشترک برای _resolveProjectData().
- Router.js: endpoint تجمیعی POST /print-templates/resolve با مجوز PROJECT_VIEW؛ endpoint قدیمی POST /print-templates/:id/resolve حفظ شد.
- تست tests/print-template-batch-resolve.test.js و CIهای Backend موفق.
- ادغام PR #87 و انتشار Apps Script برای SHA d1c34d72cc8ff9b2e736dc7c880c5cca36e480af تأیید شد.
- *Log:* Backend روی main ادغام و از workflow رسمی روی Apps Script عملیاتی deploy شد؛ هیچ Sheet، schema، migration یا داده عملیاتی تغییر نکرد.
