## 🎯 Current Objective

افزایش سرعت صفحه خروجی قالب پروژه با ذخیره دائمی تعریف قالب‌ها در کش مرورگر همراه با تشخیص نسخه و همگام‌سازی تغییرات قالب بین دستگاه‌ها؛ در بازدیدهای بعدی فقط بررسی سبک revision انجام شود و صرفاً قالب‌های تغییرکرده دریافت شوند. کش فقط پس از ایجاد قالب جدید، ویرایش قالب موجود یا غیرفعال‌سازی آن در مسیرهای مدیریت قالب به‌روزرسانی شود. داده‌های وابسته به پروژه و نتیجه resolve همچنان تازه از سرور دریافت شوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `main`؛ در Discovery تغییری نیاز نشد.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه عملیاتی مبنا `main`؛ شاخه کاری این فاز `perf/persistent-print-template-cache-20261116` از آخرین main ساخته شد.
- فاز قبلی «بهینه‌سازی resolve و نمایش خروجی قالب پروژه» در 2026-11-16 بسته و مستندات آن به ARCHITECTURE.md هر دو مخزن آرشیو شد.
- مخازن Development خارج از محدوده هستند.

### معماری موجود و مسیرهای واقعی
- Frontend صفحه خروجی: `pages/print-output.html`.
- منطق قالب و خروجی: `js/modules/print-designer.js`.
- در `PrintDesigner.initProjectOutput(projectId)` درخواست `PMS.Api.get('/print-templates')` در هر بار ورود اجرا می‌شود؛ سپس برای هر قالب درخواست مجزای `POST /print-templates/:id/resolve` با ProjectID جاری اجرا می‌شود.
- در مسیر مدیریت قالب، `PrintDesigner.loadLibrary()` فهرست قالب‌ها را با `GET /print-templates` و منابع داده را با `GET /print-templates/sources` دریافت می‌کند.
- `PrintDesigner.editTemplate(id)` جزئیات قالب را با `GET /print-templates/:id` می‌گیرد؛ سپس PDF و تصاویر قالب از مسیرهای جداگانه دریافت می‌شوند.
- ذخیره قالب در `PrintDesigner.saveTemplate()` از `POST /print-templates` برای ایجاد و `PUT /print-templates/:id` برای ویرایش استفاده می‌کند؛ آپلود تصویر از `POST /print-templates/:id/images` و PDF از `POST /print-templates/:id/pdf` انجام می‌شود. غیرفعال‌سازی از `DELETE /print-templates/:id` است.
- Backend مسیرها در `Router.js` به `PrintTemplateService.list/get/create/update/uploadImage/uploadPdf` متصل‌اند. لیست و جزئیات شامل Definition و metadata تصاویر/PDF است؛ محتوای باینری تصاویر و PDF endpoint جداگانه دارد.
- Backend ویرایش و آپلود PDF نسخه قالب را افزایش می‌دهند؛ نسخه و UpdatedAt در خروجی قالب وجود دارند. ایجاد، ویرایش و حذف باید محرک invalidation کش باشند.

### زیرساخت Cache موجود
- `js/core/cache.js`: `PMS.Cache.set/get/getMeta/remove/clear` روی localStorage با پیشوند `PMS_CACHE_`. اگر گزینه ttl داده نشود، `expiresAt=null` و ورودی بدون انقضا ذخیره می‌شود.
- `js/core/api.js`: `PMS.Api.getCached(path, cacheKey, options)` از cache موجود استفاده می‌کند. با `refreshCached:false` در cache hit هیچ درخواست شبکه‌ای اجرا نمی‌شود؛ در cache miss از GET استفاده و پاسخ را ذخیره می‌کند. `PMS.Api.invalidate/invalidateMany` برای حذف کلیدهای cache موجودند.
- `js/core/session.js`: `PMS.Session.getUser()` اطلاعات کاربر نشست را می‌دهد؛ cache قالب باید به tenant/user جاری scope شود تا بین حساب‌ها/مستأجرها داده مشترک نشود.
- نتیجه resolve پروژه، اطلاعات پروژه و پاسخ فرم‌ها داده پویا هستند و نباید در cache دائمی تعریف قالب ذخیره شوند؛ فقط definition/metadata و در صورت طراحی امن، assetهای ثابت قالب مشمول این فازند.

### تصمیم‌های حفاظتی و معیارهای پذیرش
- از زیرساخت Cache موجود استفاده شود؛ سیستم cache موازی یا وابستگی جدید ساخته نشود.
- cache قالب‌ها بدون TTL باشد و در cache hit، GET فهرست/تعریف قالب تکرار نشود.
- ایجاد، ویرایش (از جمله تغییر Definition، PDF و تصاویر) و غیرفعال‌سازی قالب پس از موفقیت عملیات، cache مرتبط را invalidate/update کند؛ در شکست ذخیره، cache معتبر قبلی حفظ شود.
- cache به tenant و در صورت نیاز user جاری محدود باشد؛ تغییر حساب یا tenant نباید قالب‌های حساب قبلی را نمایش دهد.
- `POST /print-templates/:id/resolve` برای هر پروژه همچنان از سرور اجرا شود؛ هیچ داده پروژه‌ای از cache تعریف قالب خوانده نشود.
- قرارداد API، مجوزها، tenant isolation، ساختار Google Sheets و داده‌های عملیاتی حفظ شوند.
- محدودیت حجم localStorage و حجم تصاویر/PDF بررسی شود؛ محتوای باینری حجیم بدون ارزیابی ظرفیت در localStorage ذخیره نشود.
- رفتار cache miss، خطای شبکه، invalidation پس از عملیات موفق و عدم invalidation در عملیات ناموفق باید آزمون شوند.


### همگام‌سازی کش قالب‌ها بین دستگاه‌ها
- Backend: مسیر GET /print-templates/revision در Router.js با همان مجوزهای SYSTEM_SETTINGS یا PROJECT_VIEW به PrintTemplateService.revision(params) متصل است.
- PrintTemplateService.revision فقط قالب‌های فعال Tenant جاری را می‌خواند و metadata سبک شامل ID، Code، Name، Description، Version و UpdatedAt را همراه revision hash برمی‌گرداند؛ Definition و محتوای فایل‌ها در پاسخ نیستند.
- revision از metadata مرتب‌شده ساخته می‌شود؛ ایجاد، ویرایش، آپلود تصویر، آپلود PDF و غیرفعال‌سازی به دلیل افزایش Version/UpdatedAt در نسخه قالب تشخیص داده می‌شوند. هیچ Sheet/schema یا داده عملیاتی جدیدی اضافه نشده است.
- Frontend در PrintDesigner.getTemplateListCached() هنگام ورود به صفحه، revision سرور را بررسی می‌کند. در صورت برابر بودن revision، فقط کش دائمی قبلی استفاده می‌شود؛ در صورت تغییر، فقط قالب‌های جدید/تغییرکرده با GET /print-templates/:id دریافت و قالب‌های حذف/غیرفعال‌شده از کش کنار گذاشته می‌شوند.
- آخرین revision موفق در کش tenant/user ذخیره می‌شود. اگر بررسی شبکه یا دریافت یک قالب تغییرکرده شکست بخورد، آخرین کش معتبر حفظ می‌شود و همگام‌سازی در بازدید بعدی دوباره تلاش می‌شود.
- نتیجه Resolve پروژه، داده پروژه و فرم‌ها همچنان تازه از سرور دریافت می‌شوند و در کش دائمی Definition قرار نمی‌گیرند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی معماری cache، مسیرهای مصرف قالب و عملیات ایجاد/ویرایش/حذف.
  - *Log:* در Frontend فایل‌های `pages/print-output.html`، `js/modules/print-designer.js`، `js/core/cache.js`، `js/core/api.js` و `js/core/session.js` بررسی شدند. مشخص شد `initProjectOutput()` در هر ورود `GET /print-templates` را مستقیم فراخوانی می‌کند و `editTemplate()` نیز جزئیات قالب را مستقیم می‌گیرد؛ زیرساخت `PMS.Cache` و `PMS.Api.getCached()` از قبل قابلیت ذخیره بدون TTL و cache hit بدون شبکه با `refreshCached:false` را دارد. مسیرهای mutation شامل POST/PUT/DELETE قالب، آپلود PDF و تصویر شناسایی شدند. در Backend فایل‌های `Router.js`، `PrintTemplateService.js` و `PrintTemplateRepository.js` بررسی شدند؛ Version و UpdatedAt برای تشخیص تغییر موجود است و endpointهای resolve و asset مجزا هستند. مسیر resolve داده پروژه باید تازه بماند و از cache تعریف قالب جدا باشد. هیچ کد اجرایی یا داده عملیاتی در Discovery تغییر نکرد.
- [ ] **Task 2 — Persistent Template Cache (IN PROGRESS):** اتصال فهرست و تعریف قالب‌ها به cache دائمی موجود، با scope امن tenant/user و حذف درخواست شبکه در cache hit.
- [ ] **Task 3 — Targeted Cache Invalidation:** همگام‌سازی کش پس از ایجاد، ویرایش، تغییر PDF/تصاویر و غیرفعال‌سازی قالب؛ حفظ cache در صورت شکست عملیات.
- [ ] **Task 4 — Regression & Operational Acceptance:** آزمون cache hit/miss، حساب‌های متفاوت، تغییرات قالب، resolve تازه پروژه، چاپ/PDF و پذیرش عملیاتی Product Owner.
