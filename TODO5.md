## 🎯 Current Objective

افزودن انتخاب ساعت به فیلد «تاریخ ایجاد پروژه» با استفاده دقیق از تقویم مشترک جلالی/ساعت که در ثبت رویدادها عملیاتی است؛ حفظ زمان انتخابی تا ذخیره در پروژه و نمایش مجدد در فرم ویرایش.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه مبنا
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه فاز جاری در هر دو مخزن: `feature/project-created-at-datetime-20261111`
- شاخه مبنا: `main`؛ Backend baseline: `45965b49af3d1b5c6e61c8ce2b4e978555802c20`؛ Frontend baseline: `bbe5a91cd0078f8b3f5d6d045bc412b313cfe171`.
- شاخه جدید فقط از main عملیاتی ساخته شده است؛ main و مخازن توسعه دست‌نخورده‌اند.

### Frontend — مسیرهای موجود و جریان داده
- `js/components/jalali-calendar.js` — کامپوننت مشترک `window.PMS.JalaliCalendar`:
  - `init()` ورودی‌های `input[type="date"]` و `input[type="datetime-local"]` را با MutationObserver شناسایی می‌کند.
  - `enhance(original)` ورودی اصلی را نگه می‌دارد، نمایشگر تاریخ جلالی می‌سازد و برای `datetime-local` پس از انتخاب روز، مرحله انتخاب ساعت/دقیقه را با `renderTimePicker()` باز می‌کند.
  - انتخاب ساعت در `draftTime` نگهداری می‌شود؛ دکمه `data-cal="confirm"` مقدار نهایی را یکجا از `setValue()` commit می‌کند و رویدادهای input/change را منتشر می‌کند.
  - ساعت ۲۴ساعته با ۲۴ گزینه ساعت و ۶۰ گزینه دقیقه؛ تاریخ جلالی و ارقام فارسی.
  - فایل CSS: `css/jalali-calendar.css`؛ cache key فعلی در `index.html`: `20261106-date-then-time-2` و JS: `20261106-date-then-time-3`.
- `js/modules/events.js`:
  - فرم ثبت رویداد، ورودی `#event-form-date[name="OccurredAt"][type="datetime-local"]` را استفاده می‌کند.
  - `Events.submitEvent()` مقدار محلی ورودی را با `new Date(occurredAt)` اعتبارسنجی و در payload با `date.toISOString()` ارسال می‌کند.
  - این الگو مرجع سازگاری برای فرم پروژه است؛ زمان ثبت‌شده از همان picker مشترک می‌آید.
- `js/modules/projects.js`:
  - `Projects.openCreateForm(editProject, options)` فرم ایجاد/ویرایش موجود را می‌سازد.
  - فیلد موجود `#new-project-created-at[name="CreatedAt"]` در حالت ایجاد از نوع `datetime-local` و در حالت ویرایش همچنان `date` است؛ مرحله ساعت فقط برای ایجاد پروژه فعال می‌شود.
  - `Projects.createProject(modal)` مقدار `CreatedAt` را در payload موجود `POST /projects` یا `PUT /projects/:id` قرار می‌دهد.
  - در حالت ویرایش، مقدار `CreatedAt` با `.slice(0, 10)` به فیلد date برگردانده می‌شود؛ این رفتار حفظ می‌شود چون API ویرایش فعلی زمان ایجاد را تغییر نمی‌دهد.
- `pages/projects.html`: دکمه ورود به همان فرم موجود؛ صفحه/مسیر جدید لازم نیست.
- `tests/jalali-calendar-datetime.test.js` و `tests/jalali-calendar-datetime.browser.cjs`: پوشش مرحله تاریخ→ساعت، انتخاب ساعت/دقیقه، تأیید نهایی، سازگاری date-only و رفتار موبایل.
- آزمون‌های فرم پروژه در `tests/project-modal-accessibility.test.js` و `tests/single-project-entry.test.js`؛ تست اختصاصی قرارداد تاریخ/ساعت پروژه باید افزوده شود.
- `index.html`: بارگذاری کامپوننت مشترک پیش از ماژول‌های صفحه؛ فقط cache-busting لازم در همین مسیر اعمال می‌شود.

### Backend — قرارداد و ذخیره‌سازی موجود
- `Router.js`: مسیرهای اصلی ایجاد و ویرایش پروژه `POST /projects` و `PUT /projects/:id`؛ مسیر جدید لازم نیست.
- `ProjectValidator.js:validateCreate()` و `validateUpdate()`: اعتبارسنجی فیلدهای پروژه؛ `CreatedAt` اکنون اعتبارسنجی اختصاصی ندارد.
- `ProjectService.js:create(project, params)`: مقدار زمان پروژه را در رکورد پروژه از `_normalizeCreatedAt_(project.CreatedAt, now)` می‌سازد؛ این تابع فعلی بخش ساعت ورودی را نادیده می‌گیرد و تاریخ را به ساعت ۱۲:۰۰ UTC تبدیل می‌کند.
- `ProjectService.js:_normalizeCreatedAt_(value, fallback)`: باید timestamp کامل ISO ورودی را اعتبارسنجی و حفظ کند؛ برای ورودی قدیمی date-only، رفتار سازگار فعلی (ظهر UTC) حفظ شود؛ ورودی خالی همچنان fallback زمان فعلی باشد.
- `ProjectRepository.js`: رکورد پروژه را در شیت موجود `08_Projects` ذخیره می‌کند؛ ستون موجود `CreatedAt` همان محل ذخیره timestamp است.
- هیچ Sheet، ستون، migration، endpoint یا مدل داده جدیدی لازم نیست. زمان ورودی باید ISO 8601 با offset/Z باشد و در ذخیره‌سازی استاندارد UTC نگهداری شود؛ زمان خالی باید رفتار فعلی (زمان جاری سرور) را حفظ کند.

### تصمیم‌های محصول و سازگاری
- دقیقاً از `PMS.JalaliCalendar` استفاده شود؛ تقویم دوم یا منطق انتخاب ساعت مستقل ایجاد نشود.
- فقط حالت ایجاد پروژه به datetime-local تبدیل شود؛ حالت ویرایش date-only باقی بماند تا رفتار فعلی و محدودیت قرارداد PUT تغییر نکند.
- ارسال مقدار از Frontend مانند رویدادها به ISO UTC تبدیل شود؛ Backend timestamp کامل را حفظ کند.
- ورودی‌های قدیمی date-only و رکوردهای فعلی بدون migration پشتیبانی شوند.
- زمان ثبت واقعی سیستم و سایر audit fields تغییر نکنند؛ این تغییر فقط مقدار انتخابی `CreatedAt` پروژه را پوشش می‌دهد.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - خواندن `TODO5.md` و `ARCHITECTURE.md` در هر دو مخزن عملیاتی.
  - بررسی main، آخرین commitها، دسترسی مخازن و ساخت شاخه feature مشترک از main.
  - بررسی دقیق کامپوننت تقویم مشترک، نحوه استفاده در فرم رویداد، فرم پروژه، payloadهای API و ذخیره CreatedAt در Backend.
  - تصمیم: استفاده مجدد از کامپوننت و APIهای فعلی؛ بدون مسیر یا ساختار داده موازی.

- [ ] **Task 2 — Reuse shared datetime picker & preserve project timestamp (IN PROGRESS)**
  - Frontend: تبدیل فیلد موجود `#new-project-created-at` فقط در حالت ایجاد به `datetime-local`؛ حفظ UI جلالی و انتخاب ساعت/دقیقه دقیقاً مانند ثبت رویداد. حالت ویرایش date-only باقی بماند.
  - Frontend: ارسال مقدار حالت ایجاد به‌صورت ISO UTC با همان الگوی `Events.submitEvent()`؛ عدم تغییر رفتار فیلد تاریخ در حالت ویرایش.
  - Backend: اصلاح `ProjectService._normalizeCreatedAt_()` برای حفظ timestamp کامل و اعتبارسنجی زمان؛ حفظ رفتار date-only و fallback فعلی.
  - افزودن تست‌های رگرسیون برای حفظ ساعت، تاریخ نامعتبر، ورودی قدیمی date-only و مقادیر خالی؛ بدون تغییر Sheet/API.

  - *Log:* پیاده‌سازی روی شاخه feature انجام شد. Frontend: در `js/modules/projects.js` داخل `Projects.openCreateForm(editProject, options)` فیلد موجود `#new-project-created-at` فقط در حالت ایجاد `datetime-local` می‌شود؛ حالت ویرایش برای سازگاری با قرارداد فعلی `PUT /projects/:id` همچنان `date` باقی می‌ماند. در `Projects.createProject(modal)` مقدار محلی فقط برای فرم ایجاد با `new Date(value).toISOString()` به UTC تبدیل و از همان payload فعلی `POST /projects` ارسال می‌شود. `index.html` cache key ماژول پروژه را به `20261111-project-created-at-datetime-3` تغییر داد. آزمون‌های `tests/project-created-at-datetime.test.js` و `tests/project-draft-information-flow.test.js` توسعه یافتند. Backend: در `ProjectService.js:_normalizeCreatedAt_(value, fallback)` timestamp کامل ISO دارای Z/offset اعتبارسنجی و حفظ می‌شود؛ ورودی date-only با نمایش قدیمی ظهر UTC و ورودی خالی با fallback قبلی سازگار است. regex تاریخ نیز از escape اشتباه اصلاح شد. هر دو مسیر ایجاد عادی و پیش‌نویس در `ProjectService.create()` از همین تابع استفاده می‌کنند. تست جدید `tests/project-created-at-datetime.test.js` timestamp دقیق، offset، date-only، fallback و ورودی نامعتبر را پوشش می‌دهد. APIها و شیت `08_Projects.CreatedAt` بدون تغییر قرارداد/ساختار باقی مانده‌اند. Backend source checks و PMS agent suite موفق شده‌اند؛ Frontend checks، PMS frontend agent suite و Cross-repository QA نیز موفق‌اند. آزمون واقعی مرورگر برای تقویم جلالی/انتخاب ساعت و دقیقه و آزمون مودال پروژه موفق شده‌اند؛ ممیزی کلی UI/Performance هنوز در جریان است.

- [ ] **Task 3 — Integration, regression & delivery**
  - اجرای تست‌های تقویم، فرم پروژه و تست‌های Backend؛ بررسی syntax و قرارداد POST/PUT.
  - بررسی سازگاری تاریخ‌های قبلی، ویرایش پروژه، پیش‌نویس و ایجاد پروژه عادی؛ اطمینان از عدم تغییر داده‌های عملیاتی.
  - بازبینی diff و CI؛ ادغام از طریق PR به main فقط پس از تست و تأیید لازم.
  - اگر تغییر Backend به استقرار GAS نیاز داشته باشد، workflow رسمی sync/deploy و نسخه Web App جداگانه بررسی شود؛ Push به‌تنهایی استقرار محسوب نمی‌شود.
  - تحویل برای تست Product Owner؛ تا تأیید عملی، تسک بسته نمی‌شود.
