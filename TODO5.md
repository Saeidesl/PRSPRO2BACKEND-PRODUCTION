## 🎯 Current Objective
پشتیبانی معماری و کنترل سازگاری Backend برای یکپارچه‌سازی نمای فهرست رویدادها با کارت‌های پروژه؛ این فاز در محدوده فعلی فقط تغییر رابط Frontend دارد و نباید منطق اجرایی Backend را بی‌دلیل تغییر دهد.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- مخازن عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION` و `Saeidesl/PRSPRO2-PRODUCTION`.
- شاخه کاری فاز: `feature/event-history-project-card-ux-20261106`؛ شاخه مقصد ادغام `main`.
- Backend: `Router.js` مسیر موجود `GET /events` را به `EventService.list(params)` متصل می‌کند؛ مجوز `EVENT_VIEW` و محدودیت‌های tenant باید بدون تغییر باقی بمانند.
- ساختار داده رویداد: شیت `13_Events`؛ فیلدهای نمایشی مصرف‌شده توسط Frontend شامل `ID`, `ProjectID`, `EventTypeID`, `Description`, `OccurredAt`, `CreatedAt`, `CreatedBy`, `PerformedBy`, `DepartmentID`, `Status` هستند.
- فرانت‌اند در `js/modules/events.js` از `Events.render(events)` برای نمایش و از `Events.applyFilters()` برای فیلتر و مرتب‌سازی استفاده می‌کند؛ فرم جزئیات با شناسه رویداد از مسیرهای موجود باز می‌شود.
- این فاز نباید endpoint، payload، permission، Sheet، schema یا مسیر ذخیره‌سازی جدید ایجاد کند. تغییر Backend فقط در صورت کشف الزام واقعی و پس از بررسی سازگاری مجاز است.
- آزمون Backend در صورت تغییر احتمالی با `node --test tests/*.test.js` و workflowهای موجود انجام می‌شود.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5 و ARCHITECTURE، وضعیت main و commitهای عملیاتی و قرارداد داده رویداد.
  - *Log:* Backend main در commit `881663232a51aa457c5717bfaf956aeca3a11af0` و Frontend main در commit `ca6d504512f0c45a339145564e1ffa4dbb200cfd` بررسی شدند. هر دو مخزن دارای default branch برابر `main` هستند. مسیر API موجود `GET /events`، سرویس `EventService.list(params)`، مجوز `EVENT_VIEW` و شیت `13_Events` به‌عنوان قرارداد مرجع شناسایی شدند. تغییر فعلی صرفاً نمایشی است و Backend runtime تغییر نمی‌کند. شاخه کاری `feature/event-history-project-card-ux-20261106` در هر دو مخزن از commitهای main ساخته شد.
- [ ] **Task 2 — حفظ سازگاری قراردادها (IN PROGRESS):** همراهی در بازبینی تغییرات Frontend و اطمینان از عدم تغییر API، payload، permission و داده‌های عملیاتی؛ در صورت نبود نیاز واقعی، هیچ فایل اجرایی Backend تغییر نکند.
- [ ] **Task 3 — تأیید یکپارچگی:** بررسی نتیجه CI مشترک Frontend/Backend و ثبت هرگونه ناسازگاری احتمالی؛ بدون انتشار Backend مگر آنکه کد Backend واقعاً تغییر کرده باشد و تأیید انتشار جداگانه وجود داشته باشد.
