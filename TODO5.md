## 🎯 Current Objective

پشتیبانی مستنداتی و تضمین سازگاری Backend برای قابلیت مودال مرحله‌به‌مرحله ثبت رویداد در Frontend. این فاز نباید منطق اجرایی Backend، قرارداد API، مجوزها یا داده عملیاتی را تغییر دهد؛ مراحل UI باید صرفاً رویدادهای واقعی APIهای موجود را منعکس کنند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feat/event-submit-progress-modal-20261107`، مبنا از main با HEAD `776b2e75848d5d74201607191499a2f2c1bd6ad5`.
- Frontend مرتبط: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feat/event-submit-progress-modal-20261107`، مبنا از main با HEAD `e44defc54d365cfeb592192052c3dc3423ae3d10`.
- هر دو مخزن عملیاتی و TODO5/ARCHITECTURE بررسی شدند؛ شاخه‌های اختصاصی از main ساخته شده‌اند.

### Backend runtime و قراردادهای موجود
- `Router.js`: `POST /events` با مجوز `EVENT_CREATE` به `EventService.create(body, params)`؛ `POST /projects/:projectId/attachments` با مجوز `ATTACHMENT_UPLOAD` به سرویس پیوست متصل است.
- `EventService.js:create` و `_createUnlocked_`: ثبت رویداد، idempotency و پردازش موجود.
- `AttachmentService.js`: کنترل tenant/مالکیت و ذخیره پیوست.
- شیت‌های مرتبط موجود: `13_Events`, `15_Attachments`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `34_EventFormData`.
- Frontend مرحله upload را پیش از ثبت رویداد اجرا می‌کند؛ پس از آن `POST /events` و در پایان refresh فهرست اجرا می‌شود. مودال جدید صرفاً وضعیت واقعی همین عملیات را نشان می‌دهد.
- هیچ endpoint، schema، Sheet، permission یا مسیر موازی جدید موردنیاز نیست.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning: تأیید مرز Backend و قراردادهای API [x]
- main، TODO5، ARCHITECTURE و آخرین commit Backend بررسی شدند؛ شاخه اختصاصی فاز ساخته شد.
- نتیجه: تغییر لازم در این فاز فقط در Frontend است؛ Backend باید بدون تغییر runtime باقی بماند.
- *Log:* `Router.js`: مسیرهای موجود `POST /events` و `POST /projects/:projectId/attachments`؛ `EventService.js:create/_createUnlocked_`؛ `AttachmentService.js`؛ شیت‌های `13_Events`, `15_Attachments`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `34_EventFormData`. مبنای Backend `776b2e75848d5d74201607191499a2f2c1bd6ad5`.

### Task 2 — هماهنگی قراردادها و مستندات Backend (IN PROGRESS)
- هیچ کد اجرایی Backend تغییر نکند، مگر آنکه آزمون integration نیاز واقعی و اثبات‌شده‌ای را نشان دهد.
- بازبینی سازگاری درخواست/پاسخ upload و POST/PUT رویداد با وضعیت‌هایی که Frontend نمایش می‌دهد.
- مستندسازی نتیجه نهایی در ARCHITECTURE پس از پذیرش فاز؛ TODO5 تا زمان بسته‌شدن کامل فاز حفظ شود.

### Task 3 — Cross-repository QA و پذیرش انتشار Frontend
- اجرای QA بین‌مخزنی و بررسی اینکه UI فقط وضعیت واقعی APIهای موجود را منعکس می‌کند.
- Backend deployment فقط در صورت تغییر runtime لازم است؛ در غیر این صورت صریحاً عدم نیاز به انتشار Backend ثبت شود.
- تأیید انتشار Frontend و تست نسخه زنده توسط مالک محصول؛ سپس بستن فاز طبق پروتکل.
