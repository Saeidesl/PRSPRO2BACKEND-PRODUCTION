## 🎯 Current Objective
ثبت سازگاری Backend برای فاز بازطراحی کارت‌های پروژه در صفحه رویدادها. در بررسی اولیه هیچ تغییر Backend/API/DB لازم نیست؛ منبع داده، مجوزها و قراردادهای موجود بدون تغییر باقی می‌مانند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- مخزن عملیاتی Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه کاری `feat/events-unified-project-cards-20261113`، مبنا `main`.
- آخرین commit مبنا: `913148044a31b0a76ee0a010e36602e5748bb8b5`.
- پشته: Google Apps Script V8 و Google Sheets؛ `Router.js` مرجع route و permission، `ProjectService.js` منطق پروژه، `EventService.js` منطق ثبت رویداد.
- Frontend داده‌ها را از APIهای موجود `GET /projects?view=event-picker`, `GET /events`, `GET /event-types` دریافت می‌کند.
- پیوست تصویر پروفایل از مسیر موجود پروژه و مجوز `ATTACHMENT_VIEW` استفاده می‌کند؛ metadata در `15_Attachments` و فایل در Google Drive نگهداری می‌شود.
- دسته‌بندی نمایشی پروژه‌ها بر اساس رویدادهای معتبر، کاربر/واحد و flag تکمیل کار در Frontend انجام می‌شود؛ منبع وضعیت و داده تغییری نمی‌کند.
- هیچ route، payload، permission، sheet/schema، migration یا داده عملیاتی برای این فاز تغییر نمی‌کند مگر بررسی بعدی ضرورت قطعی را ثابت کند.

## 📋 Macro-Task Queue & Implementation Log
- [x] Task 1 — Discovery & Planning
  - TODO5 و ARCHITECTURE عملیاتی بررسی شد؛ دسترسی مخزن، شاخه main و آخرین commit تأیید شد.
  - نتیجه بررسی Frontend: نیازمندی فعلی صرفاً تغییر نمایش است و Backend runtime نیاز به تغییر ندارد.
  - *Log:* قراردادهای `GET /projects?view=event-picker`, `GET /events`, `GET /event-types` و مسیر موجود پیوست پروژه/مجوز `ATTACHMENT_VIEW` حفظ می‌شوند؛ `Router.js`, `ProjectService.js`, `EventService.js`, شیت‌های پروژه/رویداد/پیوست بدون تغییر می‌مانند.
- [x] Task 2 — پشتیبانی و بازبینی سازگاری Backend
  - تغییر Frontend از همان APIها، payloadها، permissionها و مسیر پیوست موجود استفاده می‌کند؛ هیچ تغییر Backend runtime یا DB لازم نیست.
  - *Log:* هیچ فایل اجرایی Backend، route، payload، permission، tenant isolation، schema، migration یا داده عملیاتی تغییر نکرد؛ تصمیم عدم نیاز به تغییر Backend بر اساس ردیابی قراردادهای موجود ثبت شد.
- [ ] Task 3 — تأیید سازگاری بین‌مخزنی (IN PROGRESS)
  - اصلاح برچسب وضعیت صرفاً در Frontend است؛ قراردادهای API و داده‌های Backend تغییری نمی‌کنند.
  - QA بین‌مخزنی پس از آماده‌شدن PR فرانت‌اند اجرا و نتیجه ثبت شود.
  - هیچ استقرار Backend انجام نشود؛ تغییر runtime لازم نیست.

- [x] Task 3 — ارائه نام وضعیت کلی و نام مرحله در قرارداد پروژه
  - افزودن `OverallStatusName` و تکمیل `CurrentStepName` به خروجی `GET /projects?view=event-picker` و پاسخ عادی پروژه‌ها.
  - کنترل tenant isolation و عدم افزایش درخواست به ازای هر کارت.
  - *Log:* `ProjectService.js` پاسخ پروژه‌ها را با `OverallStatusName` و `CurrentStepName` غنی کرد؛ وضعیت مرحله `CurrentStepStatus` مستقل باقی ماند. lookup وضعیت‌ها و مراحل به‌صورت گروهی و tenant-scoped انجام شد. قرارداد `GET /projects?view=event-picker` حفظ شد و هیچ Sheet/schema، migration یا عملیات نوشتن داده ایجاد نشد. آزمون `tests/event-project-picker-projection.test.js` و Backend source checks/PMS agent suite موفق شدند. Backend PR #78 با merge commit `9f88ea63e50b03929ffbf8ab4e821bf3c7999a50` ادغام و Workflow رسمی `43402963994` با موفقیت Web App نسخه 26 را منتشر کرد؛ Product Owner تست عملیاتی سه وضعیت مستقل را در 2026-11-13 موفق تأیید کرد.
