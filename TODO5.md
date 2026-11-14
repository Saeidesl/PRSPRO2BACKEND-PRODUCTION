## 🎯 Current Objective

تکمیل ویرایش مستقیم روی خروجی قالب پروژه: پشتیبانی از ویرایش و بارگذاری فیلدهای image/file و مدیریت ردیف‌های اطلاعات چندمقداری/جدولی، با ذخیره امن در همان منبع اصلی و بدون ایجاد رویداد جدید.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌ها
- Backend عملیاتی: `main` روی commit `3106574d8476c92be1244b0b8360841d44cb5a17`؛ شاخه جاری این توسعه: `feat/print-output-file-table-edit-20261114`.
- Frontend عملیاتی: `main` در زمان شروع این توسعه روی commit `5db305d31f04713fae6eaf7d5d5dddaa0169cb96`؛ شاخه جاری: `feat/print-output-file-table-edit-20261114`.
- Backend نسخه ۲۷ Apps Script با Workflow `43484527937` با موفقیت deploy شد؛ Frontend Pages نیز قبلاً با موفقیت منتشر شده است. مخازن Development خارج از محدوده‌اند.

### معماری و داده‌های موجود
- Google Apps Script V8 و Google Sheets؛ Router مرجع کنترل مجوز و tenant است.
- Router.js: مسیر resolve قالب POST /print-templates/:id/resolve؛ ویرایش پروژه PUT /projects/:id؛ ذخیره اطلاعات مرکزی POST /projects/:projectId/information/:typeId؛ ویرایش پاسخ فرم PUT /events/:eventId/forms/:formId.
- PrintTemplateService._resolveProjectData(): منابع PROJECT_FIELD, PROJECT_INFORMATION, EVENT_FORM_FIELD و EVENT_FIELD را از مخازن اصلی resolve می‌کند.
- ProjectInformationService.save(): مقدار جاری را در 30_ProjectInformation و سابقه را در 31_ProjectInformationHistory ثبت می‌کند.
- FormRepository.findResponse() و updateResponse(): پاسخ فرم همان رویداد را در 35_EventFormData پیدا و به‌روزرسانی می‌کنند.
- EventRepository.update(): امکان به‌روزرسانی ردیف موجود 13_Events را دارد؛ اما EventService متد عمومی update ندارد.
- FormService.updateEventFormResponse() فعلی برای اصلاح پاسخ فرم به AmendmentEventID و رویداد اصلاحی جداگانه نیاز دارد؛ این جریان باید برای قابلیت جدید بدون ایجاد رویداد، به‌صورت سازگار و کنترل‌شده توسعه یابد.
- AuditService.log() و تاریخچه اطلاعات پروژه ابزارهای موجود برای ثبت سابقه‌اند؛ نباید رویداد عملیاتی جدید برای ممیزی ساخته شود.
- Frontend مسیر خروجی در pages/print-output.html و js/modules/print-designer.js قرار دارد؛ PrintDesigner.initProjectOutput() قالب‌های فعال را resolve می‌کند و renderOutputDocument() عناصر و bindingها را رندر می‌کند.

### قواعد حفاظتی
- binding و شناسه واقعی منبع داده مرجع ویرایش است، نه متن HTML یا مقدار نمایشی.
- فقط فیلدهای business-editable با allow-list و مجوز متناظر قابل تغییر باشند؛ شناسه‌ها، سازنده، نوع رویداد، وضعیت محاسبه‌شده و فیلدهای سیستمی read-only بمانند مگر مجوز/قاعده فعلی صریحاً اجازه دهد.
- tenant isolation، project access، permission، اعتبارسنجی نوع اطلاعات و فرم، concurrency و Audit/History حفظ شوند.
- ذخیره فرم/رویداد نباید EventService.create()، integration تأمین یا حرکت Workflow را دوباره اجرا کند.
- چاپ/PDF پس از تأیید ذخیره باید با داده resolve‌شده تازه تولید شود؛ شکست ذخیره، داده را موفق/ثبت‌شده نشان ندهد.
- هیچ Sheet، ستون، migration یا endpoint موازی بدون اثبات نیاز و بررسی سازگاری ایجاد نشود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی Router، سرویس‌ها، مخازن، bindingهای قالب، APIهای موجود و مسیرهای ثبت/اصلاح رویداد انجام شد.
  - *Log:* Router.js, PrintTemplateService.js, ProjectInformationService.js, FormService.js, EventService.js, EventRepository.js, FormRepository.js و tests/print-templates.test.js بررسی شدند. ProjectInformationService.save() تاریخچه پروژه را حفظ می‌کند؛ FormRepository.updateResponse() امکان اصلاح همان پاسخ را دارد؛ اما FormService.updateEventFormResponse() فعلی به رویداد اصلاحی مجزا وابسته است و برای تصمیم جدید کافی نیست. EventRepository.update() موجود است ولی متد عمومی امن در EventService وجود ندارد. هیچ کد عملیاتی تغییر نکرد.
- [x] **Task 2 — Inline Editing UX:** رابط ویرایش درجا در Frontend عملیاتی پیاده‌سازی، CI و بررسی عملکرد مرورگر با موفقیت گذرانده، ادغام و توسط Product Owner تست شد.
  - *Log:* تغییرات UX فقط در مخزن Frontend انجام شد: `js/modules/print-designer.js` (allow-list ویرایش، مدیریت ویرایش inline، ویرایش سلول جدول و حفظ مقدار هنگام چاپ)، `css/print-template-library.css` (ظاهر کنترل‌ها، موبایل و چاپ)، `index.html` (cache-bust) و تست‌های `tests/project-print-designer.test.js` و `tests/print-template-library.test.js`. PR #129 با همه بررسی‌های CI از جمله comprehensive UI performance audit موفق، با merge commit `19ec7226960a643d7242f3f5836bc8876e1fcde3` در Frontend main ادغام شد و Product Owner موفقیت تست ویرایش را اعلام کرد. در Backend هیچ فایل اجرایی، API، Sheet یا داده عملیاتی تغییر نکرد؛ ذخیره منبع اصلی موضوع Task 3 است.
- [x] **Task 3 — Safe Source Persistence:** ذخیره امن فیلدهای متنی در منبع اصلی، بدون ساخت رویداد جدید، پیاده‌سازی، ادغام، deploy و توسط Product Owner تست شد.
  - *Log:* Backend PR #80 با merge commit `3106574d8476c92be1244b0b8360841d44cb5a17` در `main` ادغام شد. `Router.js` مسیر `PUT /print-templates/:id/project-data` را به `PrintTemplateService.updateProjectBinding()` وصل می‌کند. `PrintTemplateService._resolveProjectData()` شناسه منبع و concurrency tokenها را در `sources` برمی‌گرداند. `ProjectService.updateFromTemplate()` فیلدهای مجاز پروژه را با tenant/project access، lock، revision و Audit ذخیره می‌کند؛ `ProjectInformationService.saveWithLock()` داده مرکزی را در `30_ProjectInformation` با تاریخچه `31_ProjectInformationHistory` ذخیره می‌کند؛ `FormService.updateEventFormFieldFromTemplate()` همان پاسخ موجود در `35_EventFormData` را به‌روزرسانی می‌کند؛ `EventService.updateFieldFromTemplate()` فقط فیلدهای مجاز همان ردیف `13_Events` را اصلاح می‌کند و workflow را دوباره اجرا نمی‌کند. Backend source checks، Procurement diagnostics و PMS agent suite موفق شدند. GitHub Actions run `43484527937` روی commit نهایی، ۸۶ فایل را با clasp push و Web App را به نسخه ۲۷ deploy کرد؛ تمام مراحل workflow موفق بودند. Product Owner تست ویرایش متنی و ماندگاری داده پس از refresh را موفق اعلام کرد.
- [ ] **Task 4 — Advanced Inline Editing (IN PROGRESS):** افزودن ویرایش فیلدهای فایل/تصویر و امکان اضافه/حذف ردیف در جدول‌های چندمقداری، با استفاده از AttachmentService و قرارداد اعتبارسنجی فعلی؛ بدون ایجاد API یا Sheet موازی.
  - *Discovery Log:* `ProjectInformationService._scalar()` از قبل referenceهای پیوست را برای DataTypeهای `image` و `file` اعتبارسنجی می‌کند؛ image می‌تواند آرایه‌ای تا ۲۰ پیوست باشد و ستون‌های جدول نیز از همین scalar validation عبور می‌کنند. `AttachmentService.upload()` فایل را از مسیر موجود `POST /projects/:projectId/attachments` با `AttachmentType=INFORMATION` می‌پذیرد و در `15_Attachments` ثبت می‌کند. `PrintTemplateService._resolveProjectData()` در حال حاضر source token را برمی‌گرداند اما metadata نوع داده/کاردینالیتی/ستون‌ها برای ساخت کنترل مناسب در خروجی کافی نیست؛ باید metadata امن ستون‌ها (Code, Name, DataType, IsRequired) و نوع/کاردینالیتی را به resolver اضافه کند. Frontend در `js/modules/print-designer.js` تابع `isProjectOutputBindingEditable()` عمداً image attachment و object را read-only می‌کند؛ `renderOutputDocument()` جدول را بدون کنترل مدیریت ردیف رندر می‌کند؛ `persistProjectOutputEdit()` مسیر ذخیره موجود را دارد. الگوی بارگذاری امن و metadata reference در `js/modules/project-detail.js:uploadInformationFile()` و `js/modules/events.js:uploadConfiguredFormFile()` وجود دارد و باید با همان API/محدودیت ۱۰MB/MIME و بدون کپی منطق ذخیره‌سازی استفاده شود. `ProjectInformationService._validate()` برای جدول MULTIPLE آرایه‌ای از objectها با کلید Code ستون‌ها انتظار دارد؛ ردیف جدید باید با همین schema ساخته شود. پیاده‌سازی باید برای PROJECT_INFORMATION و EVENT_FORM_FIELD، و برای ستون‌های جدولی image/file، منبع واقعی را حفظ کند.
  - *Progress Log:* در `PrintTemplateService.js`، `_resolveProjectData()` برای bindingهای `PROJECT_INFORMATION` و `EVENT_FORM_FIELD`، metadata نوع داده، cardinality و ستون‌های فعال (Code/Name/DataType/IsRequired/Options) را به همراه source token برمی‌گرداند. در `tests/print-templates.test.js` آزمون قرارداد جدول MULTIPLE و metadata فیلد image افزوده شد. PR #81: https://github.com/Saeidesl/PRSPRO2BACKEND-PRODUCTION/pull/81؛ head `bb7685a900a21ed48c9d8c1013e59760c866a019`. Backend source checks: 221/221 تست موفق در run `43577769133`؛ PMS agent suite در run `43577769129` موفق. PR باز است؛ هنوز merge یا deploy نشده است.
- [ ] **Task 5 — Integration & Regression:** آزمون یکپارچه بارگذاری فایل/تصویر، جدول MULTIPLE، اعتبارسنجی ستون‌های اجباری، مجوزها، concurrency، تاریخچه، refresh و چاپ/PDF؛ سپس انتشار کنترل‌شده و پذیرش Product Owner.

## وضعیت پیاده‌سازی
- Task 1 و Task 2 و Task 3 تکمیل و تأیید شده‌اند. Task 3 فقط فیلدهای متنی را در آزمون عملی Product Owner پوشش داده است. Task 4 اکنون در شاخه feature پیاده‌سازی شده و CI Backend موفق است؛ PR #81 باز است و هنوز merge/deploy نشده؛ main و Apps Script عملیاتی دست‌نخورده‌اند.
