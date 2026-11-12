## 🎯 Current Objective
ثبت سازگاری Backend برای فاز حذف دو المان نمایشی از سربرگ صفحه رویدادها؛ هیچ تغییر runtime در Backend موردنیاز نیست.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- مخزن عملیاتی Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`؛ شاخه کاری: `feat/events-page-remove-intro-20261112`؛ مبنا: `main`.
- پشته: Google Apps Script V8 و Google Sheets؛ درخواست‌ها از `Router.js` و سرویس‌های موجود عبور می‌کنند.
- قابلیت‌های رویداد در معماری موجود: `EventService.js`، `EventTypeService.js`، `FormService.js` و routeهای ثبت/خواندن فعلی.
- محدوده فاز صرفاً Frontend است: حذف `.events-page-intro` و `.event-center-status` از `pages/events.html` در مخزن عملیاتی Frontend.
- هیچ API، payload، permission، tenant isolation، سرویس Backend، Google Sheets schema، migration، Drive object یا داده عملیاتی نباید تغییر کند.
- سازگاری مورد انتظار: همه endpointها و عملیات موجود رویدادها بدون تغییر باقی بمانند.

## 📋 Macro-Task Queue & Implementation Log
- [x] Task 1 — Discovery & Planning
  - TODO5.md و ARCHITECTURE.md مخزن عملیاتی بررسی شدند؛ TODO5 در شروع فاز آماده بود.
  - تغییر در لایه Backend یا Database لازم نیست؛ Backend فقط از نظر عدم تغییر قراردادها تحت کنترل سازگاری قرار دارد.
- [ ] Task 2 — Backend Compatibility Validation (IN PROGRESS)
  - تأیید شود هیچ فایل runtime، API، permission یا ساختار داده Backend در این فاز تغییر نمی‌کند.
- [ ] Task 3 — تحویل و پذیرش عملیاتی
  - نتیجه بررسی سازگاری همراه با PR و تست Frontend ثبت شود؛ انتشار Backend لازم نیست.
