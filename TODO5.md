## 🎯 Current Objective
بهبود انتظار هنگام دریافت اطلاعات گردش‌کار برای فرم ثبت رویداد؛ تا آماده‌شدن اطلاعات، فهرست نوع رویداد با انیمیشن انتظار مشترک برنامه جایگزین شود و پس از موفقیت، گزینه‌های واقعی نمایش داده شوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- مخازن عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION` و `Saeidesl/PRSPRO2BACKEND-PRODUCTION`.
- شاخه کاری فاز: `feature/event-type-loading-state-20261106` در هر دو مخزن؛ مقصد ادغام Frontend برابر `main`.
- Frontend: `js/modules/events.js`؛ `Events.openForm()` سازنده modal، `Events.refreshEventTypeOptions()` سازنده گزینه‌ها، `Events.loadWorkflowProgress(projectId)` دریافت‌کننده اطلاعات گردش‌کار.
- API فعلی: `GET /projects/:projectId/workflow-progress`؛ قرارداد و payload بدون تغییر می‌مانند.
- انیمیشن مشترک: `js/components/loading.js`، `PMS.Loading.show/hide`، CSS در `css/main.css` و `css/components.css`.
- CSS فرم: `css/events.css`؛ نسخه assetها در `index.html`.
- تست‌ها: `tests/event-type-loading-state.test.js` و `tests/event-context-filtering.test.js`.
- Backend: فقط قراردادهای موجود؛ تغییر اجرایی Backend، API، permission، Sheet یا schema در محدوده نیست.

## 📋 Macro-Task Queue & Implementation Log
### فاز انتظار تا آماده‌شدن اطلاعات نوع رویداد (2026-11-06)
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5 و ARCHITECTURE، شاخه‌ها و commitها، ردیابی جریان داده و شناسایی انیمیشن موجود.
  - *Log:* Frontend main در `402bc4f58ec747051715451ba7aa26882487a5cb` و Backend main در `881663232a51aa457c5717bfaf956aeca3a11af0` بررسی شد. شاخه کاری هم‌نام ساخته شد. علت نمایش گزینه‌های «در حال بررسی گردش‌کار» در native select موبایل، رندر optionهای غیرفعال هنگام pending بودن `GET /projects/:id/workflow-progress` است. انیمیشن مشترک `PMS.Loading.show/hide` در `js/components/loading.js` و CSS موجود شناسایی شد.
- [ ] **Task 2 — نمایش وضعیت انتظار مناسب (IN PROGRESS):** نمایش spinner مشترک تا دریافت اطلاعات گردش‌کار و جلوگیری از بازشدن فهرست ناقص نوع رویداد.
- [ ] **Task 3 — آزمون و کنترل سازگاری:** اجرای تست‌ها و CI؛ تأیید حفظ رفتار workflow، پروژه مستقل/پیش‌نویس و APIهای موجود.
