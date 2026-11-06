## 🎯 Current Objective
بهبود تجربه انتخاب پروژه در فرم ثبت رویداد؛ نمایش هم‌زمان نام و کد پروژه با رابط کارت‌مانند، جست‌وجوپذیر و سازگار با موبایل و تم روشن/تاریک. منطق فعلی ثبت رویداد، شناسه ProjectID و APIها بدون تغییر می‌مانند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- مخازن عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION` و `Saeidesl/PRSPRO2BACKEND-PRODUCTION`.
- شاخه کاری فاز: `feature/project-selector-ux-20261106` در هر دو مخزن؛ شاخه مقصد ادغام `main`.
- Frontend: `pages/events.html` نقطه ورود صفحه رویداد؛ فرم ثبت رویداد به‌صورت پویا در `js/modules/events.js` و متد `Events.openForm()` ساخته می‌شود.
- فیلد مرجع پروژه: `#event-form-project` با `name="ProjectID"`؛ گزینه‌ها از `Events.projects` ساخته می‌شوند و شناسه پایدار هر گزینه با `Events.idOf(project)` تعیین می‌شود.
- عنوان نمایشی پروژه: `project.Title || project.Name`؛ کد: `project.ProjectCode`. انتخاب پیش‌فرض از `preselectedProjectId` حفظ می‌شود.
- تغییر پروژه باید همان رویداد change فیلد مرجع را اجرا کند تا `loadWorkflowProgress`, `loadAmendmentSourceEvents`, `updateSubmitAvailability`, `renderEventQuantityField` و `loadEventContext` بدون تغییر مسیر فعلی اجرا شوند.
- استایل صفحه: `css/events.css`؛ متغیرهای تم از `css/variables.css`, `css/dark-theme.css` و `css/unified-theme.css`.
- Backend مرجع: `Router.js` و `EventService.js`؛ قرارداد ثبت `POST /events` و مقدار `ProjectID` حفظ می‌شود. این فاز نباید API، مجوز، Sheet یا schema جدید ایجاد کند.
- تست‌های فرانت‌اند با Node test runner در `tests/*.test.js`؛ تست‌های مرورگر موجود در `tests/*.browser.cjs`.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5 و ARCHITECTURE در هر دو مخزن، وضعیت شاخه‌ها و commitها، ساختار فرم و فیلد انتخاب پروژه، قرارداد نام/کد پروژه و مسیر change.
  - *Log:* TODO5.md و ARCHITECTURE.md هر دو مخزن از main خوانده شدند. آخرین commit مبنا در Backend برابر `881663232a51aa457c5717bfaf956aeca3a11af0` و در Frontend برابر `2d9c7b17147a893d9e276a7fe3355f27d8b7f56d` است. شاخه کاری هم‌نام در هر دو مخزن از همین commitهای main ساخته شد. مسیر موجود `Events.openForm()` و فیلد `#event-form-project` شناسایی شد.
- [ ] **Task 2 — اجرای انتخاب‌گر حرفه‌ای پروژه (IN PROGRESS):** تبدیل رابط native انتخاب پروژه به انتخاب‌گر سفارشی با نام و کد پروژه، جست‌وجو، حالت انتخاب‌شده، پشتیبانی RTL/موبایل/تم‌ها و حفظ select مرجع و رویداد change.
- [ ] **Task 3 — آزمون و کنترل سازگاری:** افزودن تست رگرسیون، اجرای تست‌های مرتبط و بررسی عدم تغییر payload، پیش‌انتخاب پروژه، رویداد مستقل، گردش‌کار و زمینه کمکی؛ آماده‌سازی PR برای ادغام عادی پس از تأیید.
