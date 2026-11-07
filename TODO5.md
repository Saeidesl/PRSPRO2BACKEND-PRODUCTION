## 🎯 Current Objective

رفع تأخیر طولانی بین کلیک «ثبت رویداد» و آغاز ارسال درخواست ثبت به سرور؛ تمرکز این فاز بر مسیر Submit در Frontend است، نه زمان پردازش یا ذخیره رویداد در Backend. حفظ قرارداد فعلی `POST /events`، آپلود امن پیوست‌ها، ترتیب تصاویر، idempotency، سازگاری داده‌های قدیمی و رفتار فرم‌های مستقل/پروژه‌ای الزامی است.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feat/event-submit-latency-20261107`؛ مبنا از main با HEAD `a32046dae9d0460cb0db7735dee3b6d418c5b028`.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feat/event-submit-latency-20261107`؛ مبنا از main با HEAD `8224b20b24626f81bb1b9aa94822df4503407ba5`.
- هر دو مخزن عملیاتی تأیید و قابل دسترسی‌اند؛ فقط همین دو مخزن و شاخه‌های فاز تغییر می‌کنند. main و مخازن توسعه دست‌نخورده می‌مانند.

### مسیر فعلی Submit در Frontend
- `pages/events.html`: صفحه میزبان فرم ثبت رویداد.
- `js/modules/events.js`:
  - `Events.bindEvents`: اتصال submit فرم `#event-create-form` و فراخوانی `submitForm()`.
  - `Events.submitForm`: بررسی فرم و `reportValidity()`، سپس `await collectConfiguredFormResponses(projectId)`؛ فقط بعد از پایان این مرحله `this.submitting = true` و `setSubmitState(true)` اجرا می‌شود؛ سپس درخواست اصلی `PMS.Api.post('/events', payload)` فراخوانی می‌شود.
  - `Events.collectConfiguredFormResponses`: پیمایش فرم‌ها، فیلدها و ردیف‌های چندگانه؛ برای فیلدهای فایل/تصویر، آپلود را پیش از ارسال رویداد اجرا می‌کند.
  - `Events.uploadConfiguredFormImages`: تصاویر هر فیلد را با حلقه ترتیبی و `await` یکی‌یکی آپلود می‌کند.
  - `Events.uploadConfiguredFormFile`: فایل را با `FileReader.readAsDataURL` به Base64 تبدیل و سپس از مسیر موجود `PMS.Api.post('/projects/:projectId/attachments', ...)` ارسال می‌کند؛ نتیجه در همان input cache می‌شود.
  - انتخاب تصاویر نیز در handlerهای change با FileReader برای preview خوانده می‌شود، اما نتیجه خواندن فعلی برای upload مجدداً استفاده نمی‌شود.
- `js/core/api.js`:
  - `Api.post(path, body, options)` به `Api.request('POST', ...)` می‌رود.
  - `Api.request` بدنه را با `JSON.stringify` آماده می‌کند و سپس `fetch` را آغاز می‌کند.
  - درخواست اصلی ثبت همچنان `POST /events` و upload پیوست از API موجود پروژه است؛ هیچ مسیر موازی مجاز نیست.

### مسیر Backend و قرارداد داده
- `Router.js`: مسیر `POST /events` با مجوز `EVENT_CREATE` به `EventService.create(body, params)` متصل است؛ upload پروژه با مسیر موجود `POST /projects/:projectId/attachments` و مجوز `ATTACHMENT_UPLOAD` انجام می‌شود.
- `EventService.js:create`: idempotency را با `IdempotencyKey` اعمال و در ادامه `_createUnlocked_` را اجرا می‌کند.
- `AttachmentService.js` و `ProjectInformationService.js`: کنترل مالکیت/tenant و ثبت امن پیوست و reference اطلاعات مرکزی را حفظ می‌کنند.
- شیت‌های موجود مرتبط: `15_Attachments`, `30_ProjectInformation`, `31_ProjectInformationHistory`, `34_EventFormData` و شیت رویداد `13_Events`. در این فاز تغییر schema یا داده عملیاتی پیش‌فرض نیست.

### یافته قطعی Discovery
- پیش از آغاز هرگونه درخواست `POST /events`، Frontend منتظر تکمیل `collectConfiguredFormResponses` می‌ماند.
- در این مرحله فایل‌ها/تصاویر انتخاب‌شده ابتدا با FileReader خوانده و سپس upload می‌شوند؛ چند تصویر در یک فیلد به‌صورت ترتیبی ارسال می‌شوند و جمع‌آوری سایر فیلدها نیز ترتیبی است.
- تا پایان این preflight، `submitting` و `setSubmitState(true)` فعال نمی‌شوند؛ بنابراین دکمه و فرم نیز بازخورد فوری «در حال ثبت» نشان نمی‌دهند.
- این مسیر یک علت محتمل و مستقیم برای تأخیر قبل از `POST /events` است، به‌ویژه در فرم‌های دارای چند تصویر/فایل. برای تعیین سهم دقیق هر مرحله، اندازه‌گیری زمان از submit تا اولین fetch پیوست و تا fetch رویداد لازم است.
- صرفاً با خواندن کد نمی‌توان تأیید کرد که تمام تأخیر گزارش‌شده دقیقاً از فایل‌ها ناشی می‌شود؛ instrumentation مرورگر و تست کنترل‌شده باید علت را قطعی کند.

### اصول اجرایی
- زمان کلیک، شروع آماده‌سازی، شروع اولین upload، پایان uploadها، شروع `POST /events` و پاسخ سرور باید جداگانه سنجیده شوند.
- بازخورد بصری باید بلافاصله پس از کلیک معتبر نمایش داده شود؛ خطاهای اعتبارسنجی باید همچنان قابل مشاهده و قابل اصلاح باشند.
- ترتیب مقادیر آرایه‌ای تصاویر، تشخیص PROFILE/INFORMATION، cache فایل‌های uploadشده، retry و جلوگیری از پیوست تکراری حفظ شوند.
- آپلود موازی فقط با concurrency محدود و با حفظ ترتیب پاسخ‌ها و رفتار profile image مجاز است؛ از ایجاد فشار غیرقابل‌کنترل بر Drive/GAS اجتناب شود.
- هیچ API، فرم، مسیر ثبت، Sheet یا ساختار داده موازی ایجاد نشود.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning: ردیابی تأخیر پیش از ارسال [x]
- دسترسی، شاخه‌های main، آخرین commitها، TODO5 و ARCHITECTURE هر دو مخزن بررسی شد؛ شاخه اختصاصی فاز از HEAD عملیاتی main ایجاد شد.
- مسیر کلیک/submit تا `POST /events` و مسیر upload پیوست‌ها در Frontend و Router/Service بک‌اند ردیابی شد.
- علت قطعی در کد: `submitForm` پیش از فعال‌کردن وضعیت submitting منتظر `collectConfiguredFormResponses` می‌ماند؛ این تابع uploadهای فایل را به‌صورت ترتیبی انجام می‌دهد. اندازه واقعی تأخیر هر مرحله هنوز نیازمند instrumentation است.
- *Log:* Frontend: `pages/events.html`, `js/modules/events.js:bindEvents`, `submitForm`, `collectConfiguredFormResponses`, `uploadConfiguredFormImages`, `uploadConfiguredFormFile`, handlerهای change/preview تصویر؛ `js/core/api.js:post`, `request` و فراخوانی `fetch`. Backend: `Router.js:post` برای `POST /events` و `POST /projects/:projectId/attachments`؛ `EventService.js:create`, `_createUnlocked_`؛ `AttachmentService.js`. مسیرها و ساختارهای داده موجود حفظ می‌شوند؛ هیچ کد runtime یا داده عملیاتی در Task 1 تغییر نکرد.

### Task 2 — حذف تأخیر پیش از شروع درخواست و بازخورد فوری (IN PROGRESS)
- ثبت زمان‌های مرحله‌ای از کلیک Submit تا اولین درخواست upload و درخواست `POST /events` با ابزار تست/diagnostics بدون ذخیره اطلاعات حساس.
- انتقال بازخورد «در حال ثبت» به ابتدای جریان پس از عبور از اعتبارسنجی همگام؛ نمایش خطا و فعال‌سازی مجدد فرم در شکست preflight.
- حذف خواندن تکراری فایل در صورت امکان با reuse نتیجه آماده‌سازی فایل؛ بهینه‌سازی upload چندتصویری با concurrency محدود و حفظ ترتیب و AttachmentType.
- حفظ قرارداد payload، APIها، idempotency، رفتار اصلاح فرم، فرم‌های چندردیفی، تصاویر قدیمی/جدید و پیوست‌های موجود.
- خروجی قابل آزمون: پس از کلیک معتبر، UI فوراً واکنش نشان دهد و اولین درخواست شبکه بدون انتظار غیرضروری آغاز شود؛ زمان `POST /events` و uploadها قابل تفکیک باشد.

### Task 3 — Regression، یکپارچگی و انتشار کنترل‌شده
- اجرای تست‌های واحد/قراردادی Frontend و Backend و بررسی syntax.
- بررسی مسیرهای پروژه‌ای/مستقل، بدون فایل، تک‌فایل، چندتصویر، جدول چندردیفی، فرم اصلاحی، retry و خطای upload؛ کنترل ترتیب تصاویر و جلوگیری از ثبت تکراری.
- بررسی سازگاری Frontend/Backend و سلامت مجوزها، tenant isolation، Google Drive و Sheets؛ سپس ادغام و انتشار فقط طبق workflow عملیاتی و پس از موفقیت تست‌ها.
- گزارش جداگانه GitHub merge، Backend deployment، Frontend deployment و live verification؛ توقف برای آزمون مالک محصول.



#### Task 2 — Implementation progress (2026-11-07)

- Frontend `js/modules/events.js`: دکمه بلافاصله پس از اعتبارسنجی همگام وارد حالت آماده‌سازی/ثبت می‌شود؛ وضعیت در صورت پاسخ نامعتبر جمع‌آوری فرم یا تاریخ نامعتبر بازیابی می‌شود.
- پیش‌خوانی فایل‌ها هنگام انتخاب در handlerهای فیلد مستقل و ستون جدول به `getConfiguredFormFileData` منتقل شد؛ Promise خواندن هر File در همان input نگهداری و در upload مجدداً استفاده می‌شود تا FileReader برای همان فایل دوباره اجرا نشود.
- `uploadConfiguredFormImages`: آپلود تصاویر در batchهای حداکثر ۳تایی با `Promise.all` انجام می‌شود؛ نتایج به ترتیب انتخاب بازچینی و فقط تصویر اول در صورت فعال بودن گزینه به‌عنوان `PROFILE` ذخیره می‌شود. سقف ۲۰ تصویر و APIهای موجود حفظ شده‌اند.
- متن وضعیت Submit برای پوشش آماده‌سازی و ارسال فایل‌ها اصلاح شد؛ `index.html` cache-busting ماژول رویداد را به `20261107-event-submit-latency-1` تغییر داد.
- تست جدید `tests/event-submit-latency.test.js` اضافه شد. پنج تست قدیمی که نسخه ثابت قبلی فایل رویداد را assert می‌کردند، در فایل‌های `event-history-project-cards.test.js`, `event-queue-project-cards.test.js`, `event-type-loading-state.test.js`, `project-picker.test.js`, `workflow-management.test.js` به نسخه جدید همگام شدند.
- PR Frontend #44 برای CI و بازبینی ایجاد شد: https://github.com/Saeidesl/PRSPRO2-PRODUCTION/pull/44 . اجرای اولیه Frontend checks به‌دلیل پنج assertion قدیمی cache-busting شکست خورد؛ همه پنج reference در تست‌ها اصلاح شده‌اند و نتیجه اجرای مجدد هنوز در انتظار است.
- Backend در این Task تغییر runtime نداشته است: `Router.js`, `EventService.js`, `AttachmentService.js`, API `POST /events` و API موجود upload بدون تغییر مانده‌اند؛ هیچ Sheet/schema/داده‌ای تغییر نکرده است.
- وضعیت Task 2: `IN PROGRESS` تا تکمیل CI و بررسی رگرسیون. هیچ merge، Backend deployment، Frontend deployment یا live verification انجام نشده است.
