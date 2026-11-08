## 🎯 Current Objective

پشتیبانی از واردکردن PDF آماده (تک‌صفحه‌ای و چندصفحه‌ای) به طراح قالب موجود؛ حفظ PDF به‌عنوان پس‌زمینه اصلی و افزودن اطلاعات پویا روی صفحات؛ ذخیره قالب قابل استفاده مجدد برای تمام پروژه‌های همان Tenant و تولید خروجی PDF/چاپ با حفظ چیدمان اصلی.

انتخاب محصولی تأییدشده: هر دو نوع PDF تک‌صفحه‌ای و چندصفحه‌ای باید پشتیبانی شوند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه کاری مشترک: `feat/pdf-template-background-20261108`
- Backend baseline از main: `8f850258599a6437251c83c3994fa910120c05b7`
- Frontend baseline از main: `4fcae36435120c5f489986765b6613b8db38e3b2`
- هر دو مخزن پیش از شروع دارای `TODO5.md = Ready for the next feature` و `ARCHITECTURE.md` بودند؛ فاز قبلی بسته شده بود.
- هیچ تغییری روی main یا مخازن توسعه مجاز نیست.
- تسک مستقل اعلان تلگرام که در سابقه قبلی PAUSED BY PRODUCT OWNER بوده، خارج از دامنه این فاز است.

### معماری فعلی قالب و چاپ — Backend
- `PrintTemplateService.js`:
  - `list/get/create/update/deactivate` مدیریت کتابخانه قالب‌های tenant-scoped را انجام می‌دهد.
  - `resolve(id, body, params)` پروژه را با کنترل Tenant و دسترسی بررسی می‌کند؛ داده‌های پروژه، اطلاعات مرکزی و پاسخ فرم‌های رویداد را بر اساس Definition.bindings حل می‌کند.
  - `_definition`, `_public`, `_template`, `_parse` برای ساختار و ارائه قالب استفاده می‌شوند.
- `PrintTemplateRepository.js`:
  - شیت موجود `36_PrintTemplates`.
  - ستون `DefinitionJSON` ساختار قالب را نگه می‌دارد؛ repository در صورت نیاز schema را به‌شکل additive تضمین می‌کند.
- `PrintTemplateValidator.js`:
  - `parseDefinition` نسخه schema 1، صفحه، عناصر و bindingها را اعتبارسنجی می‌کند.
  - JSON فعلی حداکثر 45,000 نویسه است؛ فایل PDF نباید در DefinitionJSON یا سلول Google Sheets قرار گیرد.
- `Router.js`: مسیرهای موجود `/print-templates` و `/print-templates/:id/resolve` به سرویس قالب متصل هستند. مسیر جدید فقط در صورت اثبات نیاز معماری و بررسی امنیتی اضافه شود.
- خروجی فعلی PDF در مرورگر Frontend تولید/چاپ می‌شود؛ سرویس فعلی resolve داده را برمی‌گرداند و PDF را merge نمی‌کند.
- اصل امنیتی: فایل و metadata باید به Tenant و قالب مربوط متصل باشند؛ دسترسی فایل از مسیر امن و موجود پیوست/ذخیره‌سازی بررسی شود.

### معماری فعلی قالب و چاپ — Frontend
- `js/modules/print-designer.js` ماژول مرکزی `PMS.Modules.PrintDesigner` است.
- `blankDefinition()`: ساختار فعلی شامل `schemaVersion`, `page`, `elements`, `bindings`.
- `createElement()`, `handleEditorAction()`, `renderCanvas()`, `renderInspector()`, `renderLayers()`: ساخت و ویرایش المان‌های متن، فیلد، جدول، تصویر و شکل‌ها.
- `saveTemplate()`, `loadLibrary()`, `editTemplate()`: ذخیره و بازیابی قالب از API موجود.
- `loadOutputOptions()`, `resolveOutput()`, `renderOutputDocument()`, `printOutput()`: انتخاب پروژه/قالب، دریافت داده، ساخت پیش‌نمایش و چاپ مرورگر.
- `css/print-template-library.css`: استایل کتابخانه، محیط طراحی، پیش‌نمایش و چاپ.
- `PMS.Api` مسیر انحصاری درخواست‌های Frontend است.
- در خروجی فعلی، یک `article.pt-print-page` از ابعاد و المان‌های تعریف ساخته می‌شود؛ renderer فعلی چندصفحه‌ای نیست و پس‌زمینه PDF ندارد.
- قابلیت جدید باید در همین ماژول و همان تعریف قالب توسعه یابد؛ ایجاد صفحه/کتابخانه/جریان موازی ممنوع است.

### تصمیمات فنی و الزامات طراحی
- PDF اصلی به‌صورت فایل مستقل در فضای ذخیره‌سازی امن موجود یا یک مسیر فایل‌محور سازگار با معماری فعلی نگهداری شود؛ نه در Google Sheets و نه در JSON قالب.
- Definition فقط شناسه فایل، مشخصات سند/صفحات، تنظیمات و مختصات عناصر را نگهداری کند.
- پشتیبانی از PDF تک‌صفحه‌ای و چندصفحه‌ای؛ هر صفحه باید ابعاد/جهت واقعی خود را حفظ کند.
- کاربر بتواند روی هر صفحه فیلدهای پویا، متن، تصویر و جدول را اضافه و جابه‌جا کند.
- لایه PDF اصلی در محیط طراحی به‌عنوان پس‌زمینه ثابت و غیرقابل‌ویرایش نمایش داده شود.
- قالب ذخیره‌شده برای تمام پروژه‌های مجاز همان Tenant قابل استفاده باشد.
- خروجی نهایی باید PDF اصلی را حفظ کند و اطلاعات پروژه را روی صفحات درست قرار دهد؛ بدون بازسازی ظاهری PDF از صفر.
- حفظ مجوزها، tenant scoping، محدودیت اندازه/تعداد صفحات، کنترل MIME واقعی، اعتبارسنجی فایل، و سازگاری با قالب‌های قدیمی الزامی است.
- وابستگی PDF (نمایش/ویرایش/ترکیب) قبل از انتخاب نهایی بررسی شود؛ از افزودن کتابخانه غیرضروری یا حجیم اجتناب شود.
- هیچ مهاجرت مخرب، حذف قالب‌های قبلی، تغییر داده عملیاتی یا deploy بدون آزمون و تأیید لازم انجام نشود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**: بررسی شاخه‌ها، آخرین commitها، TODO5/ARCHITECTURE و معماری فعلی قالب/چاپ در دو مخزن.
  - *Log:* هر دو مخزن عملیاتی در دسترس بودند. آخرین commitهای main هنگام شروع: Backend `8f850258599a6437251c83c3994fa910120c05b7` و Frontend `4fcae36435120c5f489986765b6613b8db38e3b2`؛ هر دو TODO5 آماده فاز بعد و ARCHITECTURE موجود بود. شاخه `feat/pdf-template-background-20261108` جداگانه از همین baselineها در هر دو مخزن ساخته شد. مسیرهای اصلی Backend: `PrintTemplateService.js`, `PrintTemplateRepository.js`, `PrintTemplateValidator.js`, `Router.js`, شیت `36_PrintTemplates`; مسیر اصلی Frontend: `js/modules/print-designer.js`, `css/print-template-library.css` و API موجود `/print-templates`. محدودیت فعلی DefinitionJSON برابر 45,000 نویسه است؛ PDF باید مستقل ذخیره شود. renderer فعلی خروجی یک صفحه HTML با `renderOutputDocument` و چاپ مرورگر با `printOutput` دارد؛ پس‌زمینه PDF و صفحات چندگانه ندارد.
- [ ] **Task 2 — PDF Asset و نمایش چندصفحه‌ای در طراح** (IN PROGRESS): انتخاب/آپلود امن PDF، ذخیره فایل مستقل، ثبت metadata در Definition و نمایش صفحات واقعی PDF در همان محیط طراحی؛ حفظ ابعاد و ترتیب صفحات.
- [ ] **Task 3 — لایه‌گذاری داده و تولید PDF نهایی**: اتصال عناصر به منابع داده فعلی، تعیین صفحه مقصد هر عنصر، پیش‌نمایش پروژه و ترکیب اطلاعات با PDF اصلی برای خروجی PDF/چاپ چندصفحه‌ای.
- [ ] **Task 4 — آزمون، ادغام و تحویل عملیاتی**: تست فایل‌های تک/چندصفحه‌ای، داده/تصویر/جدول، قالب‌های قدیمی، tenant access، حجم/خطاها، رگرسیون و انتشار مطابق workflow موجود؛ سپس ارائه دستور تست به Product Owner و توقف تا تأیید.
