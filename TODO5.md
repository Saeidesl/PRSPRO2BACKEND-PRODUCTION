## 🎯 Current Objective

فاز: اصلاح پنل اطلاعات کمکی و یکپارچه‌سازی تقویم شمسی با انتخاب ساعت در نسخه عملیاتی PMS

هدف:
1. مستقل‌کردن اسکرول عمودی پنل اطلاعات کمکی در فرم ثبت رویداد؛ ارتفاع پنل نباید ارتفاع فرم اصلی/Modal را افزایش دهد.
2. یکپارچه‌سازی کامل رنگ‌ها، پس‌زمینه‌ها، مرزها، حالت hover/focus/disabled و دکمه‌های تقویم شمسی با توکن‌های تم روشن و تاریک.
3. افزودن انتخاب ساعت و دقیقه در popup تقویم برای تمام ورودی‌های تاریخ‌وساعت موجود؛ حفظ رفتار ورودی‌های صرفاً تاریخ و قراردادهای فعلی API/ذخیره‌سازی.
4. حفظ مسیرهای موجود، timezone محلی، مقدار ISO و سازگاری فرم‌های پویا؛ بدون تغییر Sheet یا API.

مخازن مجاز:
- Backend: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION
- Frontend: https://github.com/Saeidesl/PRSPRO2-PRODUCTION

شاخه کاری هر دو مخزن: `feature/unified-calendar-time-context-scroll-20261106`
شاخه مبنا: `main`
SHA مبنای Backend: `0d80ac586dd15451683982390ec6917ba65c5246`
SHA مبنای Frontend: `d560a02990d6eaab9572a32c84ccd384468f6671`

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### یافته‌های Task 1 — Discovery & Planning

#### وضعیت و سوابق
- مخازن عملیاتی مجاز و شاخه main بررسی شدند؛ TODO5.md هر دو مخزن پیش از شروع برابر «Ready for the next feature» بود و ARCHITECTURE.md مطالعه شد.
- آخرین commitهای main ثبت و شاخه کاری مستقل در هر دو مخزن مستقیماً از SHAهای بالا ساخته شد.
- فاز قبلی صفحه رویدادها بسته شده و سوابق آن در ARCHITECTURE.md حفظ شده است.

#### Frontend — فایل‌ها، توابع و جریان داده
- `js/components/jalali-calendar.js` (blob مبنا `46c52d63d1d479cff8affe3e3c8f370fd7f6835b`):
  - `PMS.JalaliCalendar.init()` با اسکن اولیه و MutationObserver ورودی‌های `date`, `datetime-local`, `data-jalali-date`, `.date-input`, `.date-picker` را پوشش می‌دهد؛ ورودی‌های پویا نیز از همین مسیر عبور می‌کنند.
  - `enhance(original)` ورودی نمایشی شمسی، ورودی مخفی ISO، trigger و popup را ایجاد می‌کند.
  - `render()` ماه/روزها/امروز/پاک‌کردن و min/max را مدیریت می‌کند؛ `setValue()` مقدار ISO و رویدادهای input/change را ثبت می‌کند.
  - برای `datetime-local` ساعت فقط به‌صورت متن کنار تاریخ حفظ می‌شود و کنترل انتخاب ساعت/دقیقه در popup وجود ندارد.
- `css/jalali-calendar.css` (blob مبنا `e876972f3edc0f4b8c4ee3408a14bbc0f4808dae`):
  - از توکن‌های legacy مانند `--border-color`, `--card-bg`, `--text-color`, `--surface`, `--muted`, `--accent` استفاده می‌کند؛ درحالی‌که تم برنامه از خانواده `--color-*` استفاده می‌کند.
  - دکمه‌های header/footer و وضعیت‌های hover/focus/disabled باید به‌طور کامل با تم روشن/تاریک هماهنگ شوند.
- `index.html`: CSS مشترک `css/jalali-calendar.css` و اسکریپت defer `js/components/jalali-calendar.js` را بارگذاری می‌کند؛ ترتیب بارگذاری فعلی حفظ و query version پس از تغییر به‌روز شود.
- `css/event-context.css` (blob مبنا `86916b8ba0959086eb69343d4747b3059c98a793`):
  - `.event-form-workspace` یک grid با ستون فرم و پنل 300px، `max-height:92vh` و `overflow:hidden` است.
  - فرم و پنل max-height دارند، اما پنل sticky بدون height/min-height مناسب ممکن است متناسب با محتوایش رشد کند.
  - اصلاح باید در همین CSS انجام شود؛ رفتار drawer موبایل با `.is-open` حفظ شود.
- `js/modules/events.js`:
  - `Events.openForm()` فیلد `#event-form-date[type=datetime-local]` را می‌سازد و مقدار اولیه محلی را تنظیم می‌کند.
  - `Events.createFieldInput(field,type)` نوع `date` را به date و نوع `datetime` را به datetime-local تبدیل می‌کند؛ MutationObserver تقویم، این فیلدهای پویا را نیز ارتقا می‌دهد.
  - `Events.submitForm()` مقدار `OccurredAt` را به ISO تبدیل می‌کند.
- `pages/events.html`: فیلترهای `#event-created-from`, `#event-created-to`, `#event-occurred-from`, `#event-occurred-to` از نوع date-only هستند.
- `js/modules/projects.js`: `#new-project-created-at` از نوع date-only است.
- `js/modules/project-detail.js`: `informationInput()` نوع‌های date/datetime را به ورودی متناظر تبدیل می‌کند.
- `js/modules/information-types.js`: تعریف انواع مرکزی date/datetime را پشتیبانی می‌کند.
- توکن‌های تم در `css/variables.css`, `css/dark-theme.css`, `css/unified-theme.css` قرار دارند؛ توکن رسمی موجود باید reuse شود.

#### Backend و قراردادهای حفظ‌شونده
- Backend مبتنی بر Apps Script V8 و Google Sheets است؛ `Router.js` مرجع route/permission است.
- ثبت رویداد از `POST /events` به `EventService.js` می‌رسد؛ تاریخ وقوع در `13_Events.OccurredAt` ذخیره می‌شود.
- فرم‌های متصل از `FormService.js` عبور می‌کنند. تغییر API، payload، permission، Sheet یا schema برای این فاز لازم نیست؛ Backend فقط برای کنترل سازگاری بررسی می‌شود.

#### اصول پذیرش
- پنل اطلاعات کمکی در دسکتاپ در محدوده ارتفاع Modal بماند و فقط خودش اسکرول عمودی داشته باشد؛ در موبایل drawer فعلی حفظ شود و محتوای آن اسکرول شود.
- تقویم در هر دو تم، پس‌زمینه/متن/مرز/دکمه‌ها و حالت‌های hover/focus/selected/today/disabled را با توکن‌های یکسان نمایش دهد.
- انتخاب ساعت و دقیقه در popup برای تمام ورودی‌های `datetime-local` موجود فعال شود؛ ورودی‌های date-only همچنان فقط تاریخ و مقدار `YYYY-MM-DD` داشته باشند تا قرارداد داده نشکند.
- مقدار datetime در input اصلی با قالب `YYYY-MM-DDTHH:mm` و timezone محلی مرورگر حفظ شود؛ reset، required، disabled، min/max، ورود دستی و eventهای input/change سازگار بمانند.
- هیچ کامپوننت، API، Sheet یا مسیر موازی ساخته نشود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - *Log:* مخازن عملیاتی و شاخه main بررسی شدند؛ TODO5.md و ARCHITECTURE.md خوانده شد. SHAهای مبنا ثبت و شاخه کاری مستقل `feature/unified-calendar-time-context-scroll-20261106` در هر دو مخزن از همان commitها ایجاد شد. مسیرهای واقعی `js/components/jalali-calendar.js`, `css/jalali-calendar.css`, `css/event-context.css`, `index.html`, `pages/events.html`, `js/modules/events.js`, `js/modules/projects.js`, `js/modules/project-detail.js`, `js/modules/information-types.js` ردیابی شدند. تقویم مشترک با MutationObserver ورودی‌های ثابت/پویا را پوشش می‌دهد؛ popup فعلی انتخاب ساعت ندارد و CSS از توکن‌های legacy استفاده می‌کند. پنل جانبی در grid ارتفاع محدود/حداقل ارتفاع مناسب ندارد. قرارداد Backend شامل `POST /events` و `13_Events.OccurredAt` بدون تغییر می‌ماند؛ تغییر Backend/DB/API لازم نیست. فاز به سه Macro-Task اجرایی تقسیم شد.

- [x] **Task 2 — اسکرول مستقل پنل اطلاعات کمکی**
  - *Log:* در مخزن Frontend عملیاتی، `css/event-context.css` اصلاح شد: ارتفاع workspace دسکتاپ با محدودیت `min(82vh, 780px)` تثبیت شد؛ grid با `grid-template-rows:auto minmax(0,1fr)` و `min-height:0` از رشد بر اساس محتوای پنل جلوگیری می‌کند. فرم اصلی و `.event-context-panel` دارای ارتفاع کامل، `overflow-y:auto` و `overscroll-behavior:contain` شدند؛ sticky پنل به relative تغییر کرد. drawer موبایل با `max-height:100dvh` و اسکرول مستقل حفظ شد. تست ساختاری در `tests/event-context-panel-scroll.test.js` اضافه شد. تغییرات Frontend در PR #19 ادغام شدند و کاربر نتیجه تست را تأیید کرد. در Backend هیچ فایل اجرایی، API، مجوز یا ساختار دیتابیسی تغییر نکرد.

- [x] **Task 3 — یکپارچه‌سازی تم تقویم شمسی**
  - *Log:* فایل `css/jalali-calendar.css` در Frontend با توکن‌های معنایی رسمی برنامه بازنویسی شد؛ پس‌زمینه، متن، مرزها، دکمه‌های سربرگ/پاورقی، hover/focus، selected/today/disabled و حالت‌های ورودی از توکن‌های مشترک تم روشن/تاریک استفاده می‌کنند. وابستگی به توکن‌های legacy حذف شد و نسخه CSS در `index.html` برای cache-busting به‌روزرسانی شد. تست ساختاری در `tests/event-context-panel-scroll.test.js` افزوده شد. تغییرات در Frontend PR #19 ادغام و تست بصری هر دو تم توسط مالک محصول در 2026-11-06 تأیید شد؛ Backend runtime/API/DB تغییری ندارد.

- [x] **Task 4 — انتخاب ساعت/دقیقه در تقویم مشترک و QA**
  - *Log:* قابلیت انتخاب زمان در تقویم مشترک تکمیل و توسط مالک محصول در 2026-11-06 با موفقیت تست شد. پس از انتخاب روز، نمای انتخاب ساعت (00 تا 23) و دقیقه (00 تا 59) باز می‌شود؛ کاربر می‌تواند به انتخاب تاریخ برگردد و با تأیید، مقدار محلی `YYYY-MM-DDTHH:mm` در ورودی اصلی ثبت می‌شود. رفتار ورودی‌های date-only حفظ شده است. در `js/components/jalali-calendar.js` انتقال دو مرحله‌ای، رندر deferred با `Promise.resolve().then(render)` و محافظ outside-click مبتنی بر `e.composedPath()` تثبیت شد. در `css/jalali-calendar.css` استایل مرحله زمان اضافه/هماهنگ شد و در `index.html` cache-busting به CSS نسخه `20261106-date-then-time-2` و JS نسخه `20261106-date-then-time-3` ارتقا یافت. تست‌های `tests/jalali-calendar-datetime.test.js` و `tests/jalali-calendar-datetime.browser.cjs` پوشش ساختاری و مرورگر Chromium را فراهم می‌کنند؛ تست Chromium شامل انتخاب روز، نمایش 24 ساعت و 60 دقیقه، انتخاب 08:45، ثبت مقدار در ورودی datetime-local و حفظ رفتار date-only است. PRهای Frontend #20 تا #24 و #26 در main ادغام شدند؛ PR #26 با SHA `7e09cd3c16b75b01d04132dcf836a6fbfea770b9` ادغام شد. workflowهای Frontend checks، agent suite، cross-repository QA و comprehensive UI performance audit موفق شدند. انتشار اختصاصی GitHub Pages برای SHA ادغام‌شده نیز موفق گزارش شد (Run `42134933236`). مالک محصول تست نهایی ثبت رویداد و انتخاب ساعت را موفق اعلام کرد؛ هیچ تغییر runtime در این مخزن لازم نبود. Backend runtime، API، permission و Google Sheets در این فاز تغییر نکردند.
