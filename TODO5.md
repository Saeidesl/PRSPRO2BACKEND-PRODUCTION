## 🎯 Current Objective

بازطراحی صفحه «فایل‌ها» در نسخه عملیاتی PMS: نمایش کارت مستقل برای هر پروژه و نمایش فایل‌های همان پروژه در نمای اختصاصی، با پیش‌نمایش درون‌صفحه‌ای به‌جای نمایش لینک خام.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های تأییدشده
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `fix/inline-attachment-display-20261112` (مبنای main: `955b3ffe1abc843b911b9a8f1784a0fd04f93173`).
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `fix/inline-attachment-display-20261112`؛ commit پیاده‌سازی مستقیم: `3bbd9a17910aced895f898b9d145b79764f94a88`.
- هر دو فایل TODO5 در شروع فاز مقدار `Ready for the next feature` داشتند.
- ARCHITECTURE.md هر دو مخزن در ابتدای فاز خوانده شد؛ سند Backend حاوی نقشه Attachment و APIهای جاری و سند Frontend حاوی Log فاز کش مشترک مورخ 2026-11-12 است.

### Frontend — معماری فعلی
- `pages/attachments.html`: میزبان صفحه فایل‌ها؛ فیلتر نوع ارتباط، جستجو، وضعیت بارگذاری/خطا و `#attachments-table-container` دارد.
- `js/modules/attachments.js`: ماژول `PMS.Modules.Attachments`؛ `MODULE.load()` از `Api.getCached('/attachments', cacheKey, {cacheTtl:60000, refreshCached:false})` استفاده می‌کند؛ `normalize()`، `getFilteredAttachments()`، `buildTable()` و `download(attachmentId)` مسئول نرمال‌سازی، فیلتر و ساخت جدول/دریافت فایل‌اند.
- `download()` از API موجود `GET /attachments/:attachmentId/download`، Base64 را به Blob تبدیل می‌کند و اکنون فقط دانلود انجام می‌دهد؛ نقطه توسعه برای preview modal همین مسیر است.
- بارگذاری فایل در `showUploadMessage()` از `POST /attachments` استفاده می‌کند؛ اتصال به PROJECT یا EVENT موجود است و invalidation کش پس از موفقیت انجام می‌شود.
- `js/modules/projects.js`: داده پروژه‌ها از `GET /projects` و cache مشترک پروژه‌ها بارگذاری می‌شود؛ پروژه‌ها در ساختار `Projects.projects` نگهداری می‌شوند.
- `js/core/api.js` و `js/core/cache.js`: لایه استاندارد API و کش؛ مسیر موازی ایجاد نشود.
- `index.html`: بارگذاری صفحه‌ای `attachments.js` با cache-busting فعلی `20261112-attachment-cache-invalidation-2`؛ کتابخانه PDF.js نسخه 3.11.174 از قبل بارگذاری می‌شود.
- فایل CSS مستقل attachments در مسیر `css/attachments.css` وجود ندارد؛ استایل جدید باید در ساختار CSS موجود یا استایل scoped ماژول، مطابق الگوی پروژه قرار گیرد.

### Backend — معماری و قراردادهای موجود
- `Router.js`: `GET /attachments` با `ATTACHMENT_VIEW` به `AttachmentService.list(params)` متصل است؛ `GET /projects/:projectId/attachments` به `AttachmentService.listByEntity('PROJECT', projectId, params)`؛ `GET /events/:eventId/attachments` به `listByEntity('EVENT', eventId, params)`؛ `GET /attachments/:id/download` به `AttachmentService.download(id, params)`.
- `AttachmentService.js`: `list()` فهرست tenant-scoped را برمی‌گرداند؛ `listByEntity()` مالکیت Tenant و دسترسی پروژه را کنترل می‌کند؛ پیوست رویدادِ دارای ProjectID نیز به دسترسی پروژه والد مقید است؛ `download()` مسیر دریافت محتوای فایل است.
- `AttachmentRepository.js`: شیت `15_Attachments`؛ `getAll()`, `findById()`, `findByEntity()`, `insert()`, `update()`.
- فایل‌های باینری در Google Drive ذخیره می‌شوند؛ Google Sheets فقط metadata و StorageKey را نگه می‌دارد.
- پیوست پروژه با `EntityType=PROJECT` و `EntityID=ProjectID` ثبت می‌شود؛ پیوست رویداد با `EntityType=EVENT` و `EntityID=EventID` ثبت می‌شود. برای قرار دادن فایل‌های رویداد زیر کارت پروژه باید ارتباط رویداد با پروژه از داده رویداد معتبر استخراج شود؛ نباید شناسه رویداد با شناسه پروژه اشتباه گرفته شود.
- Backend در مرحله Discovery نیازمند endpoint، شیت، migration یا تغییر مجوز جدید تشخیص داده نشد؛ ابتدا راهکار Frontend با APIهای موجود بررسی/پیاده‌سازی می‌شود.

### الزامات داده، امنیت و UX
- فقط پروژه‌هایی نمایش داده شوند که از `GET /projects` برای کاربر مجاز قابل مشاهده‌اند؛ اطلاعات Tenant یا مجوزها از کلاینت ساخته/حدس زده نشود.
- فایل‌های PROJECT مستقیماً با EntityID پروژه گروه‌بندی شوند. فایل‌های EVENT فقط در صورت اثبات ProjectID رویداد، ذیل همان پروژه گروه‌بندی شوند؛ رویداد مستقل نباید به پروژه‌ای الصاق شود.
- نمایش فایل با دریافت محتوای مجاز از endpoint فعلی انجام شود؛ URL یا StorageKey داخلی در UI افشا نشود.
- تصویر و PDF قابلیت پیش‌نمایش درون‌صفحه‌ای دارند؛ برای DOCX/XLSX باید قابلیت مرورگر/کتابخانه موجود بررسی شود و در صورت عدم پشتیبانی، تجربه جایگزین صریح و امن ارائه شود، نه لینک خام.
- عملیات دانلود اصلی، مجوز ATTACHMENT_VIEW، جداسازی Tenant، cache مشترک و invalidation بعد از upload/delete حفظ شود.
- هیچ تغییری در داده‌های عملیاتی، ساختار Sheets یا رفتار upload/delete بدون ضرورت و آزمون انجام نشود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - بررسی TODO5.md و ARCHITECTURE.md هر دو مخزن، شاخه main و commitهای اخیر انجام شد.
  - صفحه و ماژول فایل‌ها، APIهای Attachment، سرویس/Repository بک‌اند و قرارداد دریافت محتوا بررسی شدند.
  - نتیجه: قابلیت باید بر پایه APIها و کش موجود توسعه یابد؛ هیچ مسیر ذخیره‌سازی موازی ایجاد نمی‌شود.
  - *Log:* Frontend: `pages/attachments.html`, `js/modules/attachments.js`, `js/modules/projects.js`, `index.html`. Backend: `Router.js`, `AttachmentService.js`, `AttachmentRepository.js`. APIهای موجود: `GET /projects`, `GET /events`, `GET /attachments`, `GET /projects/:projectId/attachments`, `GET /events/:eventId/attachments`, `GET /attachments/:id/download`, `POST /attachments`. پایگاه داده: شیت `15_Attachments` و فایل‌های Google Drive. هر دو مخزن روی `main` و آخرین TODO5 قبل از شروع پاک/آماده بود.

- [ ] **Task 2 — Project Cards, Project Workspace & Direct Inline File Display (IN PROGRESS; production test identified preview-only-on-click behavior)**
  - Frontend: نمای اصلی صفحه فایل‌ها در `pages/attachments.html` به جستجوی پروژه و کانتینر کارت‌ها تبدیل شد؛ `js/modules/attachments.js` اکنون کارت پروژه، شمارش فایل‌ها، ورود به فضای اختصاصی و بازگشت را رندر می‌کند.
  - `MODULE.projectFiles()` فایل‌های PROJECT را با ProjectID و فایل‌های EVENT را فقط با ProjectID معتبر رویداد به پروژه متصل می‌کند؛ داده پروژه از `GET /projects` و داده رویداد از `GET /events` با cache مشترک خوانده می‌شود.
  - جستجو، وضعیت خالی، کنترل upload و cache/invalidation حفظ شده‌اند؛ رویداد مستقل به پروژه الصاق نمی‌شود. پیش‌نمایش مودالی اولیه برای تصویر/PDF و خواندن DOCX/XLSX ایجاد شده بود؛ تست عملی نشان داد نمایش فقط پس از کلیک انجام می‌شود و نیاز محصول، مشاهده مستقیم داخل فضای پروژه است.

  - *Log تکمیلی — ایراد تست عملی و اصلاح:* در 2026-11-12 تصویر کاربر نشان داد کارت فایل فقط آیکون و دکمه «مشاهده فایل» دارد؛ علت، استفاده صرف از MODULE.preview() مودالی در js/modules/attachments.js بود. در شاخه fix/inline-attachment-display-20261112 پیش‌نمایش خودکار داخل کارت فایل اضافه شد: تصاویر به‌صورت img، PDF در iframe و DOCX/XLSX با Mammoth/SheetJS درون کارت رندر می‌شوند؛ بارگذاری با IntersectionObserver تنبل است؛ دکمه‌های نمایش بزرگ‌تر و دانلود حفظ شده‌اند؛ URLهای موقت Blob هنگام رندر مجدد آزاد می‌شوند. index.html برای cache-busting به 20261112-inline-attachment-preview-1 تغییر کرد. Backend runtime/API/Sheets/Drive بدون تغییر است. این اصلاح هنوز نیازمند CI و تست عملی مجدد کاربر است.
  - *Log تکمیلی — بررسی دوم تست زنده:* تصاویر مورخ 2026-11-12 نشان دادند هم فضای پیش‌نمایش کارت خالی می‌ماند و هم مودال پس از بازشدن spinner را نگه می‌دارد. بررسی کد مشخص کرد شاخه موفق `MODULE.preview()` محتوای spinner را قبل از افزودن iframe/image پاک نمی‌کرد؛ مسیر inline نیز برای خطای رمزگشایی image و حالت خالی Blob، بازخورد قابل مشاهده نداشت. در شاخه `fix/attachment-preview-render-state-20261112` این موارد اصلاح شدند: پاک‌کردن محتوای loading قبل از mount، اعتبارسنجی Blob غیرخالی، مدیریت `onload/onerror` تصویر و iframe، پیام خطای قابل مشاهده، و ثبت state نهایی برای DOCX/XLSX/نوع پشتیبانی‌نشده. `index.html` با نسخه `20261112-preview-render-state-1` cache-bust شد. تغییرات فقط در Frontend است؛ Backend runtime، Apps Script، API، Google Sheets و Drive بدون تغییر هستند. CI و تست عملی این اصلاح هنوز انجام نشده است.
- [ ] **Task 3 — Regression Validation**
  - Frontend: `MODULE.fetchAttachmentBlob()`, `MODULE.preview()`, `MODULE.download()` و `MODULE.sanitizePreviewHtml()` برای دریافت مجاز محتوا، پیش‌نمایش و دانلود اصلی اضافه/تکمیل شدند.
  - DOCX با Mammoth و XLSX با SheetJS به‌صورت lazy-load نمایش داده می‌شوند؛ PDF در iframe داخلی و تصاویر در مودال نمایش داده می‌شوند. در صورت عدم پشتیبانی، پیام واضح و امکان دانلود ارائه می‌شود.
  - بررسی CI اولیه یک خطای Syntax در escapeJs را شناسایی کرد؛ regex اصلاح شد. CI commit اصلاحی و تست زنده هنوز در انتظار است؛ هیچ ادعای موفقیت نهایی/انتشار وجود ندارد.
