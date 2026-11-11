## 🎯 Current Objective

ممیزی جامع نسخه عملیاتی PMS از نظر اجرای فرانت‌اند در دسکتاپ، تبلت و موبایل؛ شناسایی ایرادات قطعی و ریسک‌های احتمالی UI/UX، واکنش‌گرایی، دسترس‌پذیری، تعاملات، بارگذاری و ارتباط با API؛ بدون تغییر داده‌های عملیاتی و بدون ایجاد مسیر موازی.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن، شاخه‌ها و مبنای ممیزی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه ممیزی در هر دو مخزن: `qa/desktop-mobile-audit-20261111`
- مبنای Backend از `main`: `4f9855585cb4290b0b79c0e9330bfa97628c62c0`
- مبنای Frontend از `main`: `a29612d6ed916824819fa2600b0e143eb317cd84`
- شاخه قبلی `feature/project-created-at-datetime-20261111` در Backend نسبت به main دارای 7 commit جلو و 6 عقب و در Frontend دارای 20 commit جلو و 11 عقب است؛ برای ممیزی جاری از آن استفاده نمی‌شود. مبنا فقط main عملیاتی است.
- `TODO5.md` در main هر دو مخزن قبل از شروع این فاز برابر `Ready for the next feature` بود. `ARCHITECTURE.md` هر دو مخزن مطالعه شد و در این فاز تغییر نمی‌کند.

### Frontend — ساختار و نقاط بررسی
- `index.html`: shell اصلی، ترتیب بارگذاری CSS/JS، endpoint عملیاتی و cache-busting.
  - CSSهای پایه: `css/variables.css`, `css/main.css`, `css/forms.css`, `css/layout.css`, `css/components.css`, `css/tables.css`, `css/responsive.css`.
  - CSSهای ماژول: `css/events.css`, `css/event-context.css`, `css/procurement.css`, `css/project-form.css`, `css/jalali-calendar.css`, `css/projects-page.css`, `css/print-template-library.css`.
  - ماژول‌های کلیدی: `js/core/api.js`, `js/core/router.js`, `js/core/app.js`, `js/components/layout.js`, `js/components/jalali-calendar.js`, `js/modules/projects.js`, `js/modules/events.js`, `js/modules/procurement.js`, `js/modules/print-designer.js`.
  - PDF.js نسخه 3.11.174 در `index.html` به‌صورت سراسری و با `defer` بارگذاری می‌شود؛ در بررسی جست‌وجوی کد، مصرف‌کننده‌های مستقیم `window.pdfjsLib` فقط در `js/modules/print-designer.js` پیدا شدند (از جمله خطوط 539، 658، 733، 1764 و 1810). `pdf-lib` در خود ماژول چاپ با `loadExternalScript()` بارگذاری تنبل دارد.
- `css/layout.css`: layout، header و sidebar؛ 1113 خط و چند بلوک media query تکرارشونده برای breakpointهای 1100، 768 و 520.
- `css/responsive.css`: لایه عمومی واکنش‌گرایی؛ 345 خط و overrideهای تکمیلی برای modal، table، grid و mobile.
- `css/events.css`: مودال‌ها، فرم و مرکز عملیات رویداد؛ 2104 خط. مودال ثبت رویداد در موبایل max-height برابر 94vh دارد؛ در مقایسه با مودال انتخاب اطلاعات قالب که از 100dvh پشتیبانی می‌کند، رفتار با صفحه‌کلید موبایل نیازمند آزمون واقعی است.
- `css/procurement.css`: فرم سفارش/دریافت، کارت‌ها، جدول‌ها و breakpointهای 1100/760/640/480.
- `css/print-template-library.css`: کتابخانه و طراح چاپ، بوم A4، پنل ابزار، انتخاب منبع داده، پیش‌نمایش و print media؛ 731 خط. بوم در دسکتاپ min-width:148mm دارد و در موبایل override می‌شود؛ drag/resize و scroll لمسی باید با دستگاه واقعی تست شوند.
- `js/modules/procurement.js`: جریان‌های موجود `GET /procurement/workspace`, `GET /procurement/dashboard`, `GET /procurement/needs`, `GET /procurement/orders`, `POST /procurement/orders`, `POST /procurement/receipts/batch`.
- `js/modules/events.js`: بارگذاری پروژه‌ها، رویدادها، نوع رویدادها، اطلاعات و گردش کار؛ فرم ثبت رویداد و ثبت پاسخ فرم.
- `js/modules/projects.js`: فهرست/کارت پروژه، ایجاد و ویرایش از مسیرهای موجود `POST /projects` و `PUT /projects/:id`.
- `js/modules/print-designer.js`: طراح چاپ و APIهای موجود `/print-templates`, `/print-templates/sources`, `/print-templates/preview`, `/print-templates/:id/resolve`, و مسیرهای PDF/image.
- حفظ معماری موجود الزامی است؛ هیچ فرم، route، API، Sheet یا مسیر موازی برای ممیزی یا اصلاحات ایجاد نشود.

### Backend — نقاط یکپارچگی و داده
- Google Apps Script V8 و Google Sheets؛ `Router.js` مرجع مسیرها و کنترل دسترسی است.
- گزارش تشخیصی قبلی، endpointهای موجود procurement را اندازه‌گیری کرده است: `/procurement/reports`, `/procurement/orders`, `/procurement/needs`, `/procurement/dashboard`, `/procurement/workspace`.
- در این فاز Backend فقط برای تحلیل latency و قراردادهای مصرف‌شده توسط Frontend بررسی می‌شود؛ تغییر API، Sheet، داده و استقرار Backend خارج از محدوده ممیزی UI است مگر اینکه ناسازگاری مشخصی اثبات شود و برای فاز اصلاحی تصویب شود.

### مبنای آزمون موجود و محدودیت شواهد
- فایل‌های گزارش در Frontend: `test-results/latest-performance-report.md` و `test-results/latest-performance-report.json`.
- گزارش موجود در 2026-11-11 ساعت 11:47 UTC تولید شده، روی 20 route اجرا شده و فقط viewport موبایل 390px را ثبت کرده است.
- گزارش: 20/20 route بارگذاری، 0 route ناموفق، 0 خطای کنسول/صفحه، 0 درخواست ناموفق، 0 سرریز افقی در 390px؛ 340 درخواست شبکه اندازه‌گیری شده است.
- گزارش یک smoke/inventory read-only است؛ هیچ فرم ارسال نشده و عملیات تغییردهنده داده اجرا نشده است. بنابراین سلامت جریان‌های ذخیره/ویرایش و تمام تعاملات اثبات نشده است.
- 12 فرم و 11 فرم پویا inventory شده‌اند؛ بازشدن دو opener مربوط به نوع رویداد و کاربران تأیید نشده، submit فرم‌های چاپ/واحدها/نقش‌ها اجرا نشده و یک کنترل ذخیره گزارش در آن مسیر قابل مشاهده نبوده است. این‌ها ابتدا coverage gap هستند، نه باگ قطعی.
- گزارش برای route تأمین ملزومات زمان settled برابر 33,360ms ثبت کرده؛ endpoint `/procurement/reports` حدود 6,378ms در مرورگر و 4,959ms در Backend، `/procurement/orders` حدود 5,331/2,792ms، `/procurement/needs` حدود 4,146/2,438ms، `/procurement/dashboard` حدود 4,445/2,544ms و `/procurement/workspace` حدود 4,581/1,707ms ثبت کرده است. این اعداد baseline تشخیصی‌اند و باید در آزمون تازه بازتولید شوند.

### ماتریس هدف ممیزی
- موبایل: 320، 360، 390، 430 پیکسل.
- تبلت: 768 و 1024 پیکسل.
- دسکتاپ: 1366 و 1920 پیکسل.
- مسیرها: 20 مسیر موجود در گزارش قبلی، به‌علاوه فرم‌ها و مودال‌های پویا.
- سناریوها: navigation/sidebar، کارت‌ها، جدول‌ها، مودال‌ها، فرم‌های تک/چندردیفی، فایل/تصویر، تقویم شمسی و ساعت، طراح چاپ، preview/print، تم روشن/تاریک، صفحه‌کلید موبایل، اسکرول، focus و keyboard navigation.
- هیچ فرم عملیاتی یا عملیات مخرب روی داده Production اجرا نمی‌شود؛ آزمون submit فقط در محیط آزمایشی مجاز و با داده آزمایشی مشخص انجام می‌شود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - خواندن `TODO5.md` و `ARCHITECTURE.md` در هر دو مخزن عملیاتی.
  - تأیید دسترسی، شاخه‌های موجود، آخرین commitهای main و اختلاف شاخه feature قبلی.
  - بررسی shell فرانت‌اند، CSSهای واکنش‌گرا، ماژول‌های کلیدی و گزارش ممیزی قبلی.
  - ثبت یافته‌های baseline، شکاف‌های پوشش آزمون، نقاط حساس CSS و عملکرد procurement در نقشه فنی بالا.
  - تصمیم: ممیزی روی شاخه تازه منشعب‌شده از main؛ بدون تغییر main، بدون دست‌کاری شاخه feature قبلی و بدون تغییر Backend runtime/داده.
  - محدودیت اجرایی: گزارش مرورگر موجود تنها viewport 390px را پوشش می‌دهد؛ اجرای تازه چندرزولوشنی و سناریوهای واقعی تعامل باید تکمیل شود.

- [x] **Task 2 — Multi-viewport browser audit**
  - ممیزی ایستا و بررسی پوشش تست‌های مرورگر انجام شد؛ محدودیت viewport ثابت اتوماسیون در بخش یافته‌های تکمیلی ثبت شد.
  - Product Owner اعلام کرد صفحات را شخصاً در دسکتاپ و موبایل بررسی کرده و مشکلی مشاهده نکرده است؛ این تأیید دستی به‌عنوان نتیجه پذیرش بصری ثبت می‌شود و جایگزین ادعای اجرای خودکار ماتریس ۸ اندازه نیست.
  - *Log:* بررسی `index.html`، `css/layout.css`، `css/responsive.css`، `css/events.css`، `css/procurement.css`، `css/print-template-library.css`، `css/jalali-calendar.css` و `js/modules/{projects,events,procurement,print-designer}.js`؛ تحلیل گزارش `test-results/latest-performance-report.md/json` و workflowهای `pms-ui-performance-audit.yml` و `frontend-check.yml`؛ ثبت محدودیت viewportهای تست؛ تأیید دستی Product Owner مبنی بر نبود مشکل در دسکتاپ و موبایل. هیچ کد اجرایی یا داده‌ای تغییر نکرد.
### یافته‌های اولیه Task 2 — هنوز نیازمند بازتولید در مرورگر چندرزولوشنی
- **بهینه‌سازی با اطمینان بالا:** `index.html:97` کتابخانه PDF.js را برای تمام صفحات بارگذاری می‌کند؛ مصرف مستقیم `window.pdfjsLib` در بررسی فایل‌های ماژول فقط در `js/modules/print-designer.js` مشاهده شد. پیشنهاد بررسی انتقال بارگذاری PDF.js به زمان ورود/نیاز واقعی طراح چاپ؛ قبل از اصلاح باید تست چاپ و پیش‌نمایش حفظ شود.
- **ریسک cascade CSS:** `css/layout.css` شامل بلوک‌های breakpoint تکراری (از جمله 1100/768/520px) است؛ `css/responsive.css` نیز override عمومی جداگانه دارد. فایل‌های `css/dark-theme.css` (2145 خط) و `css/unified-theme.css` (860 خط) هم‌زمان و سراسری بارگذاری می‌شوند. این‌ها ریسک نگهداری/تعارض‌اند، نه باگ قطعی تا زمان بازتولید بصری.
- **ریسک صفحه‌کلید موبایل:** `css/events.css` برای مودال ثبت/جزئیات رویداد `max-height:94vh` دارد، درحالی‌که تقویم جلالی و مودال انتخاب داده قالب از `100dvh` استفاده می‌کنند. با بازشدن صفحه‌کلید و تغییر viewport باید آزمون شود.
- **ریسک تعامل لمسی طراح چاپ:** `css/print-template-library.css` برای عناصر قابل جابه‌جایی و resize از `touch-action:none` استفاده می‌کند و بوم A4 را در دسکتاپ حداقل 148mm نگه می‌دارد؛ در موبایل min-width بازنویسی می‌شود. drag/resize در کنار اسکرول صفحه باید روی دستگاه واقعی تست شود.
- **عملکرد:** گزارش قبلی procurement route را در 33,360ms settled ثبت کرده؛ endpoint `/procurement/reports` در مرورگر 6,378ms و Backend 4,959ms بوده است. این یافته اولویت performance است؛ هنوز علت قطعی فقط با این گزارش مشخص نمی‌شود.
- **شکاف پوشش آزمون:** گزارش 20 مسیر را فقط در عرض 390px بررسی کرده؛ 320/360/430، تبلت و دسکتاپ در آن گزارش نیستند. هیچ فرم submit نشده؛ openerهای نوع رویداد و کاربران باز نشدند؛ کنترل ذخیره گزارش در صفحه گزارش قابل مشاهده نبود. این موارد coverage gap هستند و بدون آزمون مجدد به‌عنوان باگ قطعی اعلام نمی‌شوند.
- **تفسیر دکمه‌ها:** چند کنترل با کلیک موفق ولی `visibleContentChanged=false` ثبت شده‌اند، درحالی‌که فرم مربوطه در inventory باز شده است؛ بنابراین معیار تغییر محتوای قابل مشاهده false positive محتمل دارد. تنها یک safe button check در summary به‌عنوان failed شمرده شده است.

  - اجرای ممیزی مرورگری روی ماتریس 320/360/390/430/768/1024/1366/1920 برای تمام routeهای موجود.
  - بررسی واقعی باز و بسته شدن مودال‌ها، فرم‌های پویا، تقویم/ساعت، جداول، کارت‌ها، منوی کناری، طراح چاپ، preview و print.
  - ثبت screenshot/console/network و تفکیک باگ قطعی از coverage gap و ریسک احتمالی.
  - بازتولید latency procurement و ثبت اندازه‌گیری frontend/backend؛ بدون ارسال فرم یا تغییر داده Production.

- [x] **Task 3 — Confirmed UI/UX and performance corrections**
  - بر اساس بررسی دستی Product Owner و شواهد موجود، هیچ ایراد قطعی UI/UX برای اصلاح تأیید نشد؛ از اعمال تغییرات حدسی و پرریسک خودداری شد.
  - بهینه‌سازی PDF.js و بازآرایی CSS صرفاً پیشنهادهای نیازمند اندازه‌گیری/تأیید باقی ماندند و در این فاز اعمال نشدند.
  - *Log:* هیچ فایل اجرایی، API، Sheet یا workflow عملیاتی تغییر نکرد؛ تصمیم ثبت‌شده: عدم اعمال اصلاح بدون باگ بازتولیدشده و تأییدشده.
  - رفع فقط ایرادهای بازتولیدشده با حفظ DOM/API/workflow موجود و بدون تغییرات غیرضروری.
  - بررسی بارگذاری تنبل PDF.js (در حال حاضر در shell سراسری است ولی مصرف مستقیم در Print Designer دیده شده) و CSSهای تکراری فقط پس از اثبات اثر و تست رگرسیون.
  - اصلاح واکنش‌گرایی مودال‌ها، scroll/touch و چیدمان فقط در صورت اثبات مشکل در ماتریس دستگاه‌ها.
  - عدم تغییر Backend/Sheets مگر با دلیل فنی مستند و تأیید محدوده.

- [ ] **Task 4 — Regression, integration & delivery (IN PROGRESS)**
  - اجرای تست‌های موجود، syntax checks، تست مرورگری چندرزولوشنی و regression روی مسیرهای اصلی.
  - بررسی سازگاری Frontend/API، مجوزها، درخواست‌ها، داده و عدم ایجاد regression.
  - ادغام از طریق PR به main فقط پس از تست و تأیید Product Owner؛ انتشار Frontend/Backend جداگانه و با راستی‌آزمایی مستقل گزارش شود.
  - تحویل گزارش نهایی با فهرست تغییرات و دستور تست کاربر؛ تا تأیید کاربر تسک بسته نشود.


### یافته‌های تکمیلی — بررسی پوشش واقعی اتوماسیون مرورگر
- فایل `.github/workflows/pms-ui-performance-audit.yml` در Frontend، تست Playwright را اجرا می‌کند؛ اما `scripts/pms-ui-performance-audit.cjs` فقط یک context با viewport ثابت `1365×900` می‌سازد. بنابراین اجرای workflow به‌تنهایی ماتریس 8 اندازه تعریف‌شده در این فاز را پوشش نمی‌دهد.
- تست مستقل `tests/jalali-calendar-datetime.browser.cjs` فقط viewport موبایل `390×844` را می‌سنجد و تست `tests/project-modal-accessibility.browser.cjs` روی DOM ایزوله و بدون ماتریس اندازه اجرا می‌شود؛ این تست‌ها برای اثبات واکنش‌گرایی کل صفحات کافی نیستند.
- workflow روی Pull Request قابل اجراست، ولی در دسترس فعلی ابزار GitHub امکان dispatch دستی workflow وجود ندارد؛ هیچ اجرای جدید چندرزولوشنی در این مرحله ادعا نمی‌شود.
- نتیجه: شکاف چندرزولوشنی در ابزار آزمون، یافته قطعی است؛ باگ بصری در خود صفحات هنوز از این شواهد نتیجه‌گیری نمی‌شود.
