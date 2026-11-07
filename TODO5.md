## 🎯 Current Objective

افزایش سرعت نمایش فهرست نوع رویدادها در مودال «ثبت رویداد جدید»، با نمایش فوری گزینه‌های مجاز از داده‌های cache/دریافت‌شده و بدون انتظار غیرضروری برای تکمیل دریافت اطلاعات گردش‌کار پروژه. محدودیت‌های گردش‌کار، ترتیب ثبت، پیش‌نویس‌ها، نوع رویداد مستقل، tenant isolation و مجوزهای سرور باید بدون تغییر باقی بمانند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه عملیاتی `main`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه عملیاتی `main`.
- آخرین commit بررسی‌شده Backend: `851f0484b5904a8620deac118d9a4ba355a082be`.
- آخرین commit بررسی‌شده Frontend: `faf5c51c06ddb7144a83e87628a9daa0e37e7378`.
- `TODO5.md` در هر دو مخزن پیش از شروع این فاز «Ready for the next feature» بود.
- فایل‌های معماری هر دو مخزن بررسی شدند؛ مرجع Backend همچنان Apps Script V8 و Google Sheets و مرجع Frontend ماژول‌های HTML/CSS/JS موجود است.

### Backend — مسیرهای مرتبط و قرارداد موجود
- `Router.js`: مسیر GET موجود `/event-types` و کنترل دسترسی رویدادها؛ مسیر ثبت همچنان `POST /events` است.
- `EventTypeService.js`: نرمال‌سازی و فیلتر tenant/status/قواعد نوع رویداد.
- `EventTypeRepository.js:getAll()`: خواندن رکوردها از شیت `11_EventTypes` از طریق `GoogleSheetsRepository.getAll`.
- شیت `11_EventTypes` منبع داده نوع رویدادهاست.
- هیچ endpoint، ستون، Sheet، permission یا تغییر schema برای این فاز از پیش تأیید نشده است. هرگونه تغییر Backend فقط در صورت اثبات گلوگاه و با حفظ قرارداد فعلی مجاز است.

### Frontend — مسیرها و جریان موجود
- `pages/events.html`: میزبان صفحه و مودال فعلی ثبت رویداد.
- `js/modules/events.js`:
  - `Events.init` و `Events.load`: دریافت اولیه رویدادها، پروژه‌ها و انواع رویداد.
  - cache انواع رویداد با `PMS.Cache.get(EVENT_TYPES_CACHE_KEY)` و `PMS.Api.getCached('/event-types', EVENT_TYPES_CACHE_KEY, { cacheTtl: 60000 })`.
  - `Events.openForm`: ساخت مودال و آماده‌سازی فرم موجود.
  - `Events.refreshEventTypeOptions`: فیلتر و نمایش گزینه‌ها بر اساس پروژه، نوع اتصال، پیش‌نویس و قواعد گردش‌کار.
  - `Events.setEventTypeLoadingState`: کنترل نمایش وضعیت بارگذاری انتخاب‌گر.
  - `Events.loadWorkflowProgress`: دریافت `GET /projects/:projectId/workflow-progress` و سپس بازآرایی گزینه‌های رویداد.
  - کش داده وابسته پروژه با `getEventDependentData`، `eventDependentDataCache` و TTL فعلی گردش‌کار ۱۵ ثانیه.
- `js/core/api.js`: transport واحد، `getCached`، cache و deduplication درخواست‌های GET.
- `index.html`: نسخه‌دهی cache-busting فایل‌های JS/CSS.
- `tests/event-type-loading-state.test.js`: تست‌های فعلی وضعیت بارگذاری انتخاب‌گر و وابستگی آن به گردش‌کار.
- یافته اصلی: در `refreshEventTypeOptions`، تا زمانی که `workflowProgress` برای پروژه دریافت نشده، انتخاب‌گر مخفی و با spinner جایگزین می‌شود؛ بنابراین نمایش نام نوع رویداد منتظر پاسخ شبکه گردش‌کار می‌ماند، با وجود اینکه داده انواع رویداد جداگانه cache و دریافت می‌شود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی مخازن عملیاتی، شاخه‌ها، commitها، TODO5 و ARCHITECTURE؛ ردیابی مسیر دریافت `/event-types`، cache فرانت‌اند و وابستگی نمایش انتخاب‌گر به `workflow-progress`. گلوگاه اولیه شناسایی شد: مسدودشدن نمایش فهرست نوع رویدادها تا پایان دریافت قواعد گردش‌کار.
- [ ] **Task 2 — نمایش فوری فهرست نوع رویدادها (IN PROGRESS):** اصلاح فقط در مسیر موجود انتخاب‌گر به‌گونه‌ای که گزینه‌ها از داده‌های آماده فوراً نمایش داده شوند؛ وضعیت قواعد گردش‌کار مستقل و تدریجی به‌روزرسانی شود؛ انتخاب رویدادهای پروژه تا زمان آماده‌شدن قواعد ایمن بماند. نوع‌های مستقل و پروژه‌ای، پروژه پیش‌نویس، حفظ انتخاب کاربر، وضعیت خطا و retry باید سازگار بمانند.
- [ ] **Task 3 — آزمون رگرسیون و انتشار:** افزودن/اصلاح تست‌های واحد و قراردادی؛ اجرای کامل تست‌های Frontend و Backend؛ بررسی diff و سازگاری API؛ ادغام روی شاخه عملیاتی مجاز؛ بررسی وضعیت انتشار GitHub Pages و در صورت نیاز Apps Script و سپس تست عملیاتی توسط مالک محصول.

### محدودیت و معیار پذیرش
- نام نوع رویداد باید بدون انتظار برای پاسخ `workflow-progress` در انتخاب‌گر دیده شود.
- تا پیش از آماده‌شدن قواعد گردش‌کار، هیچ رویداد پروژه‌ای نباید برخلاف قواعد مجاز قابل ثبت باشد.
- رویداد مستقل، پیش‌نویس‌های مجاز، ترتیب سخت‌گیرانه/گروهی، رویدادهای تکرارپذیر، فرم متصل و کنترل مجوزها نباید regression داشته باشند.
- از ایجاد API، مسیر ثبت، cache یا فرم موازی خودداری شود.
