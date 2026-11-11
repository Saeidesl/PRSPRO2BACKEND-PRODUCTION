## 🎯 Current Objective

بهینه‌سازی فضای کاری صفحه قالب‌ساز عملیاتی با انتقال دو پنل «تنظیم المان انتخاب‌شده» و «لایه‌های صفحه» از سایدبار کنار بوم به ناحیه بالای بوم؛ هدف آزادسازی فضای افقی برای ویرایش قالب، بدون حذف قابلیت‌ها یا تغییر رفتار ذخیره/چاپ.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های فاز
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION` — شاخه `feature/print-designer-workspace-panels-20261111`؛ فقط مستندات فاز، بدون تغییر runtime.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION` — شاخه `feature/print-designer-workspace-panels-20261111`؛ تغییرات رابط کاربری Print Designer.
- مبنا: آخرین main عملیاتی پس از بستن فاز تلگرام؛ Backend `da32450e4b57f7daaca3eb30f6bd29d7e4d1b2dc`، Frontend `21f3aca31823fb48db577bc1e7f4bc38ada54923`.
- پشته: Frontend با HTML/CSS/JavaScript؛ Backend مبتنی بر Google Apps Script V8 و Google Sheets. این فاز API/Backend/DB را تغییر نمی‌دهد.

### نقشه فنی فعلی و یافته‌های Discovery
- `pages/print-designer.html`: ساختار صفحه قالب‌ساز، نوار ابزار، تنظیمات صفحه، تب صفحات، بوم طراحی و پیش‌نمایش زنده.
  - در وضعیت فعلی `.pt-editor-layout` شامل `aside.pt-editor-inspector` و `.pt-canvas-scroll` است.
  - پنل تنظیم المان با `details.pt-mobile-tools` و شناسه‌های ثابت `pt-inspector-empty`, `pt-inspector-fields` و فیلدهای `pt-prop-*` پیاده شده است.
  - پنل لایه‌ها با `details.pt-layer-details` و فهرست `#pt-layer-list` پیاده شده است.
- `css/print-template-library.css`: چیدمان دسکتاپ فعلی دو ستونه برای Inspector/Canvas، استایل details، قواعد breakpointهای 900/700/560px و حالت چاپ را کنترل می‌کند. CSS قدیمی mobile نیز برخی از همین پنل‌ها را با selectorهای اختصاصی هدف می‌گیرد؛ باید هنگام انتقال، قواعد تکراری/متعارض بازبینی شوند.
- `js/modules/print-designer.js`:
  - `renderInspector()` فیلدهای المان انتخاب‌شده را با همان IDهای DOM مقداردهی می‌کند.
  - `renderLayers()` فهرست `#pt-layer-list` را از `definition.elements` می‌سازد و کلیک هر لایه را به `selectElement()` متصل می‌کند.
  - `renderEditor()`، `selectElement()` و `applyInspectorChange()` چرخه رندر/انتخاب/ویرایش را مدیریت می‌کنند.
  - وابستگی JS به IDهای کنترل‌ها حفظ شود؛ جابه‌جایی DOM نباید شناسه‌ها، event pathها یا state را تغییر دهد.
- `index.html`: cache-busting asset نسخه Print Designer باید در صورت تغییر CSS/HTML/JS به‌روزرسانی شود.
- مسیرهای PDF/تصویر پس‌زمینه، تصاویر مستقل، ذخیره قالب، bindingها، پیش‌نمایش و چاپ باید بدون تغییر باقی بمانند.

### قراردادها و محدودیت‌های این فاز
- دو پنل در ردیف/ناحیه بالای بوم قرار می‌گیرند؛ سایدبار کنار بوم حذف می‌شود تا بوم عرض بیشتری بگیرد.
- کنترل باز/بسته بودن هر پنل با `details/summary` موجود حفظ می‌شود.
- در حالت موبایل، پنل‌ها باید تمام‌عرض و بدون فشرده‌سازی محتوا باشند؛ بوم در زیر آن‌ها باقی می‌ماند و اسکرول افقی خودش را حفظ می‌کند.
- هیچ شناسه DOM مورد استفاده JS، API، مدل Definition، Sheet یا داده عملیاتی تغییر نمی‌کند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی TODO5/ARCHITECTURE، شاخه و commitهای main، ساختار HTML/CSS/JS قالب‌ساز، وابستگی‌های DOM و نقاط شکست واکنش‌گرایی.
  - *Log:* آخرین mainهای عملیاتی پس از بستن فاز تلگرام بررسی شدند؛ شاخه مستقل فاز از همین mainها ایجاد شد. ساختار HTML نشان داد پنل تنظیم المان (`details.pt-mobile-tools`) و پنل لایه‌ها (`details.pt-layer-details`) هر دو داخل `aside.pt-editor-inspector` در ستون کنار بوم قرار دارند. وابستگی‌های JS در `renderInspector()`, `renderLayers()`, `renderEditor()`, `selectElement()` و `applyInspectorChange()` از IDهای ثابت DOM استفاده می‌کنند؛ بنابراین انتقال باید صرفاً ساختاری/استایلی باشد و IDها و event handling حفظ شوند. فایل‌های اصلی: `pages/print-designer.html`, `css/print-template-library.css`, `js/modules/print-designer.js`, `index.html`.
- [ ] **Task 2 — انتقال پنل‌ها و بازطراحی فضای کاری (IN PROGRESS):** انتقال هر دو پنل به ناحیه بالای بوم، حذف ستون Inspector کنار بوم، تنظیم چیدمان دسکتاپ/موبایل و حفظ رفتار باز/بسته و کنترل‌های موجود.
- [ ] **Task 3 — آزمون رگرسیون، سازگاری و تحویل:** بررسی syntax و تست‌های قالب‌ساز، صحت انتخاب/ویرایش/لایه‌ها، حفظ PDF/تصویر/ذخیره/پیش‌نمایش/چاپ، بررسی responsive و انتشار Frontend از workflow موجود پس از ادغام مجاز.
