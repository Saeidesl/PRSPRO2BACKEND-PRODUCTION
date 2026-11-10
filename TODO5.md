## 🎯 Current Objective

بازطراحی روش افزودن اطلاعات به قالب‌ساز در همان Print Designer عملیاتی:
- جایگزینی فهرست پراکنده اتصال منابع با دکمه «افزودن اطلاعات» و مودال سه‌تب.
- افزودن گروهی کل اطلاعات هر فرم و امکان افزودن تکی فیلدها.
- افزودن گروهی یا تکی اطلاعات هر نوع رویداد، با انتخاب آخرین/همه رویدادها.
- افزودن مستقیم المان‌های متصل به بوم، جلوگیری از تکرار و حفظ Definition و APIهای موجود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و مبنا
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه کاری فاز: `feature/print-template-data-source-picker-20261110` در هر دو مخزن؛ از `main` فعلی منشعب شده است.
- آخرین commitهای مبنا هنگام آغاز فاز: Backend `f39a38e7c67170cd0950a3852f089017ca29ed90`؛ Frontend `d79edebaec08976f5947e85c90b4c5ddfa6df6f0`.
- در هر دو مخزن، TODO5 پیش از آغاز فاز برابر `Ready for the next feature` بود. ARCHITECTURE.md خوانده شد و سوابق فاز قبلی حفظ می‌شوند؛ این فاز تا زمان بسته‌شدن در آن فایل آرشیو نمی‌شود.

### Frontend — مسیرهای موجود
- `pages/print-designer.html`: toolbar فعلی شامل `data-pt-action="add-field"` و `add-table`؛ دو منبع‌لیست قدیمی `#pt-source-list` و `#pt-editor-source-list`؛ پنل اتصال اطلاعات در `details.pt-editor-source-picker`. این ورودی‌ها باید با یک دکمه اصلی و مودال جایگزین شوند، نه اینکه مسیر/صفحه جدید ساخته شود.
- `js/modules/print-designer.js`، ماژول `PMS.Modules.PrintDesigner`:
  - `loadLibrary()`: دریافت `GET /print-templates` و `GET /print-templates/sources` و نگهداری `this.sources`.
  - `renderSources()`: ساخت فهرست فعلی از `projectFields`, `informationTypes`, `forms`.
  - `addBinding(binding,label)`: افزودن binding با جلوگیری از تکرار شناسه؛ سپس renderBindings/renderInspector/renderCanvas/commitHistory.
  - `renderBindings()`: مدیریت منابع متصل و حذف منبع؛ حذف منبع، bindingId المان‌های وابسته را خالی می‌کند.
  - `createElement('field', ...)`: ساخت المان فیلد؛ باید برای انتخاب منبع، المان متصل را مستقیم و با چیدمان امن روی بوم بسازد.
  - `renderInspector()`, `applyInspectorChange()`: حفظ تنظیمات المان و انتخاب پاسخ.
- `css/print-template-library.css`: استایل فعلی toolbar، source picker، inspector و canvas؛ استایل مودال/تب/درخت منابع باید همین‌جا و همسو با طراحی موجود اضافه شود.
- `tests/print-template-library.test.js`: مجموعه آزمون رگرسیون Print Designer؛ تست رفتار مودال، گروه‌بندی، dedupe، افزودن مستقیم به بوم و عدم حذف PDF/تصویر باید توسعه یابد.
- `index.html`: بارگذاری ماژول و cache-busting؛ فقط در صورت نیاز واقعی به‌روزرسانی شود.

### Backend — منابع و قراردادهای موجود
- `Router.js`: route موجود `GET /print-templates/sources` به `PrintTemplateService.sources` متصل است؛ endpoint موازی نساز.
- `PrintTemplateService.js:sources(params)`: اکنون `projectFields`, `informationTypes` و `forms` را tenant-scoped و فقط از انواع/فرم‌های ACTIVE برمی‌گرداند. فیلدهای فرم از `FormRepository.findFieldsByForm(form.ID)` و `InformationTypeRepository` ساخته می‌شوند.
- `PrintTemplateService.js:_resolveProjectData(projectId, definition, user)`: داده پروژه، اطلاعات مرکزی، رویدادهای پروژه و پاسخ‌های فرم را tenant-scoped دریافت می‌کند؛ رویدادهای VOID/CANCELLED/CANCELED حذف می‌شوند. پاسخ فرم از `FormRepository.getEventResponses()` و snapshotهای `ResponseJSON` و `DefinitionSnapshotJSON` resolve می‌شوند.
- `PrintTemplateValidator.js:parseDefinition()`: allow-list فعلی `PROJECT_FIELD`, `PROJECT_INFORMATION`, `EVENT_FORM_FIELD`, `EVENT_FORM_RESPONSE`؛ نوع منبع رویداد عمومی جدید باید با اعتبارسنجی شناسه و فهرست فیلدهای مجاز افزوده شود.
- `EventRepository.findByProjectId(projectId)`: رویدادهای پروژه را مرتب‌شده با `OccurredAt || CreatedAt` می‌دهد.
- `EventTypeRepository.getAll()` و `findById()`: منبع نوع رویداد؛ باید tenant و ACTIVE فیلتر شود.
- `EventService.enrichEvent(event, tenantId)`: الگوی موجود برای استخراج `EventTypeName`, `CreatorName`, `PerformedByName`, `DepartmentName` با کنترل Tenant. از همان منطق/فیلدهای مرجع استفاده شود؛ در resolver از lookupهای تکراری برای هر فیلد اجتناب شود.
- ساختار شیت `13_Events` شامل `EventTypeID`, `PerformedBy`, `CreatedBy`, `DepartmentID`, `OccurredAt`, `CreatedAt`, `Description`, `Status` و شناسه‌های workflow است.
- `EventDataService.getByEventId()` و شیت `14_EventData` فقط مسیر legacy/read-only هستند؛ در این فاز به‌عنوان منبع پویای فعال معرفی نشوند.
- پاسخ‌های فرم در شیت `35_EventFormData` و تعریف فرم‌ها در `32_Forms` و `33_FormFields` قرار دارند؛ داده فرم به EventID متصل است. افزودن کل فرم باید فیلدهای فعال همان فرم را با binding پایدار موجود اضافه کند، نه اینکه پاسخ JSON خام به کاربر نمایش داده شود.
- Definition فعلی در `36_PrintTemplates` و `DefinitionJSON` ذخیره می‌شود؛ هیچ Sheet، migration، endpoint یا مدل ذخیره‌سازی موازی لازم نیست.

### قرارداد پیشنهادی binding رویداد
- نوع binding جدید: `EVENT_FIELD`.
- فیلدهای مجاز پیشنهادی: `EventTypeName`, `OccurredAt`, `CreatedAt`, `Description`, `CreatorName`, `PerformedByName`, `DepartmentName`, `Status`.
- binding شامل `eventTypeId`, `field` و `selection` است؛ selectionهای `LATEST` و `ALL` پشتیبانی می‌شوند. شناسه یک رخداد مشخص در تعریف قالب ذخیره نمی‌شود، چون قالب باید بین پروژه‌ها قابل استفاده مجدد باشد؛ انتخاب رخداد مشخص در صورت نیاز باید پارامتر زمان تولید خروجی باشد.
- منبع‌ها در همان `GET /print-templates/sources` با آرایه `eventTypes` ارائه می‌شوند.
- resolve رویداد باید بر اساس EventTypeID و پروژه جاری باشد؛ نام کاربر/واحد/نوع رویداد از روابط موجود resolve شود، نه از متن یا شناسه خام. Tenant و دسترسی پروژه حفظ شود.
- «افزودن کل فرم» در UI به چند binding مستقل `EVENT_FORM_FIELD` برای فیلدهای همان فرم تبدیل می‌شود؛ برای فرم‌های چندپاسخی، انتخاب پاسخ پیش‌فرض LATEST حفظ می‌شود و نمایش مجموعه‌ای تکرارشونده با جدول/ALL در محدوده سازگار فعلی بررسی و آزمون می‌شود.
- هر منبع فقط یک‌بار به قالب اضافه شود؛ افزودن گروهی باید موارد موجود را رد کند و موارد جدید را اضافه کند. شناسه binding پایدار و label فارسی حفظ شود.
- افزودن به بوم باید المان‌های متصل واقعی ایجاد کند و موقعیت/صفحه را با اندازه canvas و المان‌های قبلی هماهنگ کند؛ افزودن منبع به Definition بدون المان کافی نیست.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - بررسی TODO5 و ARCHITECTURE هر دو مخزن و سوابق فاز قبلی.
  - بررسی شاخه‌های موجود، آخرین commitهای main و ساخت شاخه feature عملیاتی مشترک.
  - ترسیم جریان واقعی منابع، API، Definition، event/form repositories و آزمون‌های فعلی.
  - تصمیم معماری: توسعه همان Print Designer و API منابع موجود؛ عدم ایجاد Sheet، endpoint، صفحه یا مسیر ذخیره‌سازی موازی.
  - یافته‌ها و قرارداد اولیه در بخش Technical Spec ثبت شد.

- [ ] **Task 2 — Unified data-source picker & direct canvas insertion (IN PROGRESS)**
  - Frontend: جایگزینی source pickerهای پراکنده با دکمه «افزودن اطلاعات» و مودال سه‌تب مرکزی/فرم‌ها/رویدادها؛ جستجو، باز/بسته‌کردن گروه‌ها، شمارنده انتخاب و وضعیت +/✓.
  - Frontend: افزودن کل فرم یا فیلد تکی؛ افزودن کل گروه رویداد یا فیلد تکی؛ افزودن خودکار المان‌های متصل به بوم با جلوگیری از هم‌پوشانی و حفظ undo/redo، inspector و bindings موجود.
  - Backend: گسترش پاسخ `GET /print-templates/sources` با انواع رویداد فعال و tenant-scoped؛ اعتبارسنجی و resolve فیلدهای رویداد در همان سرویس/Definition موجود.
  - تست: گروه کامل/انتخاب تکی، dedupe، رویدادهای متعدد، آخرین/همه/مشخص، نام‌های انسانی، tenant isolation و سازگاری قالب‌های قدیمی.

- [ ] **Task 3 — Integration, regression & delivery**
  - اجرای تست‌های Frontend و Backend، syntax و CI؛ بررسی PDF اصلی، تصویر مستقل، پیش‌نمایش، چاپ، ذخیره/بازگشایی و قالب‌های قدیمی.
  - بازبینی diff، قرارداد API، مجوزها و عدم تغییر داده/Sheet.
  - پس از موفقیت، ایجاد PRهای جداگانه به main؛ ادغام/انتشار فقط طبق چرخه مجاز و بدون ادعای استقرار تا تأیید workflow و بررسی نسخه زنده.
  - تحویل به Product Owner برای تست عملی؛ تا تأیید کاربر تسک بسته نمی‌شود.
