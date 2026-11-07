## 🎯 Current Objective

افزایش سرعت بارگذاری فهرست نوع رویدادها در فرم ثبت رویداد، بدون تغییر در رفتار، ظاهر، ترتیب نمایش، قواعد گردش‌کار، مجوزها یا مسیرهای ثبت. تمرکز بر کاهش خواندن تکراری Google Sheets با کش کوتاه‌مدت و معتبرسازی کش هنگام تغییر نوع رویداد.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `main`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `main`.
- فاز از روی مخازن عملیاتی و فایل‌های TODO5.md و ARCHITECTURE.md آغاز شد.
- تغییر قبلی در منطق انتخاب‌گر به نسخه اصلی بازگردانده شد؛ رفتار فعلی `refreshEventTypeOptions` و انتظار آن برای `workflow-progress` عمداً حفظ می‌شود.

### Backend
- `Router.js`: مسیرهای موجود `GET /event-types` و `GET /projects/:projectId/workflow-progress`.
- `EventTypeService.js:list`: دریافت انواع رویداد و فیلتر tenant/permission/status.
- `EventService.js:workflowProgress`: دریافت پیشرفت گردش‌کار پروژه؛ در این مسیر نام انواع رویداد برای قواعد به پاسخ اضافه می‌شود.
- `EventTypeRepository.js`: منبع داده شیت `11_EventTypes`.
- `GoogleSheetsRepository.js:getAll`: کش فقط در محدوده یک درخواست دارد و با درخواست بعدی دوباره از Sheets خوانده می‌شود.
- بهینه‌سازی افزوده‌شده: `EventTypeRepository.getAllCached()` با ScriptCache شصت‌ثانیه‌ای، کلید نسخه‌دار، محدودیت اندازه محافظه‌کارانه و fallback به خواندن عادی. فیلترهای tenant و مجوز بعد از بازیابی کش همچنان در Service انجام می‌شوند.
- `EventTypeRepository.insert/update/delete` کش مشترک را پس از تغییر داده بی‌اعتبار می‌کنند.
- هر دو مسیر `EventTypeService.list` و `EventService.workflowProgress` از خواندن کش‌شده استفاده می‌کنند؛ قرارداد API و شکل پاسخ حفظ شده است.

### Frontend
- `js/modules/events.js`: رفتار اصلی انتخاب‌گر و `loadWorkflowProgress` بدون تغییر عملکردی حفظ شده است.
- `PMS.Api.getCached('/event-types', ...)`: کش فعلی مرورگر با TTL شصت‌ثانیه‌ای و refresh پس‌زمینه.
- `getEventDependentData`: کش حافظه‌ای داده‌های وابسته پروژه؛ TTL پیشرفت گردش‌کار فعلاً ۱۵ ثانیه و بدون تغییر باقی مانده است.
- `js/core/api.js`: درخواست‌های GET همسان را با in-flight deduplication یکی می‌کند.
- هیچ API، Sheet، ستون یا مسیر ثبت جدیدی ایجاد نشده است.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی مخازن عملیاتی، شاخه‌ها، TODO5 و ARCHITECTURE؛ ردیابی زنجیره نمایش فهرست رویدادها و تشخیص خواندن مجدد شیت انواع رویداد در دو مسیر پرتکرار.
- [ ] **Task 2 — بهینه‌سازی کش خواندن انواع رویداد (IN PROGRESS):** کش مشترک کوتاه‌مدت ScriptCache برای داده خام انواع رویداد؛ استفاده مجدد در مسیرهای فهرست و پیشرفت گردش‌کار؛ بی‌اعتبارسازی پس از create/update/delete؛ حفظ کامل فیلتر tenant/permission و قراردادهای فعلی.
- [ ] **Task 3 — آزمون و سنجش عملیاتی:** بررسی سازگاری پاسخ‌ها، invalidation، جداسازی tenant، رفتار فرم و قواعد گردش‌کار؛ اجرای تست‌های در دسترس؛ مقایسه زمان مسیرهای `/event-types` و `/projects/:id/workflow-progress`؛ انتشار فقط پس از تأیید صحت.

### معیارهای پذیرش
- هیچ تغییر در ظاهر یا رفتار فرم ثبت رویداد ایجاد نشود.
- داده کش‌شده هرگز جایگزین فیلتر tenant/permission نشود.
- پس از تغییر نوع رویداد، کش قدیمی استفاده نشود.
- در صورت عدم دسترسی/ظرفیت CacheService، مسیر اصلی Sheets بدون شکست ادامه یابد.
- APIها، schema و داده‌های عملیاتی تغییر نکنند.
