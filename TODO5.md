## 🎯 Current Objective

فاز: ارتقای کارت پروژه‌ها در مرکز عملیات و توسعه فیلتر و مرتب‌سازی سوابق رویدادها

وضعیت Backend: در Taskهای 2 و 3 هیچ تغییر اجرایی Backend لازم یا اعمال نشده است. این فایل برای هم‌راستایی پیگیری فاز با Frontend نگهداری می‌شود. مخزن عملیاتی: Saeidesl/PRSPRO2BACKEND-PRODUCTION، شاخه مبنا: main.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

- پشته Backend: Google Apps Script V8 و Google Sheets.
- Router.js: مسیر GET /events با مجوز EVENT_VIEW به EventService.list(params) متصل است.
- EventService.js: محدودسازی tenant و پروژه‌های قابل مشاهده و enrichment اطلاعات رویداد.
- EventRepository.js: شیت 13_Events؛ فیلدهای مهم ID، TenantID، ProjectID، EventTypeID، CreatedBy، PerformedBy، DepartmentID، OccurredAt، CreatedAt و Status.
- AttachmentService.js و AttachmentRepository.js: شیت 15_Attachments و metadata فایل‌ها؛ تصویر PROFILE پروژه از مسیرهای موجود دریافت می‌شود.
- APIهای موجود مرتبط: GET /events، GET /project-card-images و GET /attachments/:attachmentId/download.
- تصمیمات سازگاری: CreatedBy معیار ثبت‌کننده است و PerformedBy انجام‌دهنده؛ تاریخ ثبت CreatedAt از تاریخ وقوع OccurredAt مستقل است؛ فیلتر Frontend جایگزین مجوز و tenant isolation در Backend نیست.
- در این فاز API، Sheet، schema، permission یا کد اجرایی Backend تغییر نمی‌کند، مگر Discovery تسک بعدی ضرورت مشخصی را ثابت کند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - *Log:* مسیرهای موجود Router.js، EventService.js، EventRepository.js، AttachmentService.js و AttachmentRepository.js و شیت‌های 13_Events و 15_Attachments بررسی و برای یکپارچگی با Frontend مستند شدند. قرارداد GET /events و مجوز EVENT_VIEW و محدودیت tenant حفظ می‌شوند.

- [x] **Task 2 — ارتقای کارت پروژه‌ها**
  - *Log:* تغییر اجرایی Backend، API، Sheet یا ساختار داده لازم نبود؛ Frontend از APIها و زیرساخت موجود استفاده کرد. تست پذیرش کاربر موفق بود.

- [x] **Task 3 — فیلتر پیشرفته و پیش‌فرض رویدادهای کاربر جاری**
  - *Log:* تست دستی مالک محصول موفق اعلام شد. قابلیت‌های فیلتر در Frontend با CreatedBy برای حالت پیش‌فرض mine و حالت all محدود به داده‌های مجاز کار می‌کنند. اصلاح Router مربوط به مسیر GitHub Pages در مخزن Frontend و PR #7 ادغام شد؛ انتشار GitHub Pages با Run ID 42107639255 موفق بود. در Backend هیچ endpoint، Sheet، schema یا منطق اجرایی تغییر نکرد و deployment Backend لازم نبود.

- [x] **Task 4 — مرتب‌سازی، بهینه‌سازی و آزمون پذیرش**
  - *Log:* تست دستی مالک محصول با موفقیت تأیید شد. بررسی پذیرش نشان داد مرتب‌سازی سوابق در Frontend با کنترل `#event-history-sort` و دو حالت `desc` (جدید به قدیم) و `asc` (قدیم به جدید) بر اساس `CreatedAt` درست عمل می‌کند؛ ترتیب در تاریخ‌های ثبت مساوی پایدار است و با تغییر/پاک‌کردن فیلترها حفظ می‌شود. تغییرات اجرایی این تسک فقط در مخزن Frontend و فایل‌های `pages/events.html`، `js/modules/events.js`، `css/events.css`، `tests/event-history-filters.test.js`، `tests/workflow-management.test.js` و `index.html` انجام شد. PR #9 با squash در Frontend `main` ادغام شد؛ commit نهایی `57f2605d6f25b021a099528dcbc287131555cb3a`. آزمون‌های Frontend شامل ۱۳۵ تست بدون شکست، PMS cross-repository QA، agent suite و comprehensive UI performance audit موفق بودند. Backend، API، Sheet و schema تغییر اجرایی نداشتند و deployment بک‌اند لازم نبود. مالک محصول تست زنده مرتب‌سازی را موفق اعلام کرد.
  - مرتب‌سازی سوابق بر اساس CreatedAt از جدید به قدیم و برعکس در Frontend.
  - حفظ انتخاب sort هنگام تغییر فیلترها.
  - بررسی قرارداد GET /events، مجوزها و رگرسیون Backend بدون تغییر غیرضروری.
  - ثبت نتایج تست‌ها و تحویل برای پذیرش دستی مالک محصول.
