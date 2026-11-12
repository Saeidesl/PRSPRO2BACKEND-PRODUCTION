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

- [ ] Task 3 — ارائه نام وضعیت کلی و نام مرحله در قرارداد پروژه (IN PROGRESS)
  - افزودن `OverallStatusName` و تکمیل `CurrentStepName` به خروجی `GET /projects?view=event-picker` و پاسخ عادی پروژه‌ها.
  - کنترل tenant isolation و عدم افزایش درخواست به ازای هر کارت.
