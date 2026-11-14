## 🎯 Current Objective

پیاده‌سازی امکان ویرایش مستقیم داده‌های متصل به قالب پروژه با ذخیره در منبع اصلی؛ ویرایش فیلدهای رویداد و پاسخ فرم باید همان رکورد قبلی را اصلاح کند و رویداد جدید ایجاد نکند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌ها
- Backend: Saeidesl/PRSPRO2BACKEND-PRODUCTION، شاخه feat/template-inline-data-edit-20261113، مبنا: main در commit a313b06aa96ed3bebc844a219df30d0df75a0213.
- Frontend: Saeidesl/PRSPRO2-PRODUCTION، شاخه main؛ Task 2 از PR #129 با merge commit 19ec7226960a643d7242f3f5836bc8876e1fcde3 ادغام و توسط Product Owner تست شد.
- مخازن Development خارج از محدوده‌اند؛ تغییرات Backend همچنان فقط روی شاخه feature انجام می‌شوند.

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

## 🧩 تکمیل دامنه ویرایش در خروجی قالب

- رفتار ویرایش متنی و ذخیره در منبع اصلی در نسخه عملیاتی تست شد و موفق بود.
- دو کمبود تأییدشده برای ادامه: (۱) ویرایش فیلدهای `image` و `file` با بارگذاری پیوست و ثبت reference امن در منبع اصلی؛ (۲) مدیریت کامل ردیف‌های داده چندردیفی شامل افزودن، حذف و ویرایش ردیف‌ها.
- مسیر موجود پیوست باید استفاده شود: `POST /projects/:projectId/attachments`، `GET /projects/:projectId/attachments`، `GET /attachments/:attachmentId/download` و `DELETE /attachments/:attachmentId`؛ metadata در `15_Attachments` و فایل باینری در Google Drive. برای اطلاعات مرکزی، reference پیوست با `AttachmentType=INFORMATION` و اعتبارسنجی tenant/project/MIME الزامی است.
- برای جدول‌ها، ساختار `ValueJSON` در `30_ProjectInformation` و پاسخ `ResponseJSON` در `35_EventFormData` حفظ می‌شود؛ افزودن/حذف ردیف باید در همان binding و با حفظ ترتیب ستون‌ها، validation، required fields و revision انجام شود. هیچ Sheet یا API موازی ایجاد نشود مگر ضرورت اثبات شود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی Router، سرویس‌ها، مخازن، bindingهای قالب، APIهای موجود و مسیرهای ثبت/اصلاح رویداد انجام شد.
  - *Log:* Router.js, PrintTemplateService.js, ProjectInformationService.js, FormService.js, EventService.js, EventRepository.js, FormRepository.js و tests/print-templates.test.js بررسی شدند. ProjectInformationService.save() تاریخچه پروژه را حفظ می‌کند؛ FormRepository.updateResponse() امکان اصلاح همان پاسخ را دارد؛ اما FormService.updateEventFormResponse() فعلی به رویداد اصلاحی مجزا وابسته است و برای تصمیم جدید کافی نیست. EventRepository.update() موجود است ولی متد عمومی امن در EventService وجود ندارد. هیچ کد عملیاتی تغییر نکرد.
- [x] **Task 2 — Inline Editing UX:** رابط ویرایش درجا در Frontend عملیاتی پیاده‌سازی، CI و بررسی عملکرد مرورگر با موفقیت گذرانده، ادغام و توسط Product Owner تست شد.
  - *Log:* تغییرات UX فقط در مخزن Frontend انجام شد: `js/modules/print-designer.js` (allow-list ویرایش، مدیریت ویرایش inline، ویرایش سلول جدول و حفظ مقدار هنگام چاپ)، `css/print-template-library.css` (ظاهر کنترل‌ها، موبایل و چاپ)، `index.html` (cache-bust) و تست‌های `tests/project-print-designer.test.js` و `tests/print-template-library.test.js`. PR #129 با همه بررسی‌های CI از جمله comprehensive UI performance audit موفق، با merge commit `19ec7226960a643d7242f3f5836bc8876e1fcde3` در Frontend main ادغام شد و Product Owner موفقیت تست ویرایش را اعلام کرد. در Backend هیچ فایل اجرایی، API، Sheet یا داده عملیاتی تغییر نکرد؛ ذخیره منبع اصلی موضوع Task 3 است.
- [x] **Task 3 — Source Update Services:** ذخیره امن ویرایش‌های متنی در منبع اصلی تکمیل و در نسخه عملیاتی تست شد.** تکمیل سرویس‌های امن Backend برای اصلاح پروژه/اطلاعات مرکزی/پاسخ فرم/فیلدهای همان رویداد، بدون ساخت رویداد جدید.
  - *Progress Log:* پیاده‌سازی اولیه روی شاخه feature انجام شد: Router.js مسیر PUT /print-templates/:id/project-data را به PrintTemplateService.updateProjectBinding() متصل می‌کند؛ PrintTemplateService._resolveProjectData() اکنون metadata منبع و tokenهای concurrency را همراه resolve برمی‌گرداند و resolve() نیز آن‌ها را به Frontend می‌دهد. ProjectService.updateFromTemplate() چهار فیلد مجاز پروژه را با tenant/project access، قفل، کنترل نسخه، یکتایی کد و Audit ذخیره می‌کند. ProjectInformationService.save() از ExpectedRevision پشتیبانی می‌کند و saveWithLock() بررسی revision و نوشتن اطلاعات مرکزی را در قفل مشترک Script اجرا می‌کند؛ Router مسیر POST موجود و PrintTemplateService از همین wrapper استفاده می‌کنند و مسیر تاریخچه 30_ProjectInformation/31_ProjectInformationHistory حفظ شده است. FormService.updateEventFormFieldFromTemplate() پاسخ همان رکورد 35_EventFormData را از طریق FormRepository.updateResponse(existing.ID, ...) تغییر می‌دهد، اعتبارسنجی فرم را اجرا و اطلاعات مرکزی مرتبط را همگام می‌کند؛ هیچ AmendmentEventID یا رویداد جدیدی ساخته نمی‌شود. EventService.updateFieldFromTemplate() فقط OccurredAt و Description را روی همان ردیف 13_Events تغییر می‌دهد، محدودیت واحد ثبت‌کننده و ترتیب رویدادها را رعایت می‌کند و workflow را دوباره اجرا نمی‌کند. تست‌های tests/print-templates.test.js گسترش یافتند. PR #80 در 2026-11-13 با merge commit `3106574d8476c92be1244b0b8360841d44cb5a17` در `main` ادغام شد؛ Product Owner ذخیره ویرایش متنی را تست کرد و دو کمبود فایل/تصویر و مدیریت ردیف‌های جدول را برای Task 4 اعلام کرد. آخرین CI Backend روی commit 81a644d695e2f184dcf92f19be6f7ebc48166122 موفق: 219/219 تست، Backend source checks و Procurement performance diagnostics؛ دو agent بررسی نیز موفق.
- [ ] **Task 4 — File/Image Upload & Multi-row Editing (IN PROGRESS):** تکمیل ویرایش فایل/تصویر و عملیات افزودن/حذف ردیف جدول در همان خروجی قالب، همراه با ذخیره امن در منبع اصلی و حفظ سازگاری. آزمون امنیت، داده چندردیفی، تاریخچه، سازگاری API، چاپ/PDF و جریان‌های موجود.

## وضعیت پیاده‌سازی
- Task 1 و Task 2 تکمیل شده‌اند؛ Task 2 صرفاً تغییر Frontend بوده و هیچ فایل اجرایی، API، شیت یا داده عملیاتی Backend تغییر نکرده است. Task 3 اکنون در حال انجام است؛ deployment مستقل Frontend در این ثبت تأیید نشده است.
  - *Progress Log:* Discovery تأیید کرد که رندرر فعلی فایل/تصویر را به‌صورت read-only نگه می‌دارد (`isProjectOutputBindingEditable()` در `js/modules/print-designer.js`) و ویرایش جدول فعلاً فقط سلول موجود را تغییر می‌دهد؛ کنترل‌های افزودن/حذف ردیف وجود ندارند. باید upload از API پیوست موجود پروژه استفاده کند و پس از upload فقط reference برگشتی و معتبر را از مسیر ذخیره binding به `ProjectInformationService`/`FormService` بفرستد. Task 4 در شاخه‌های عملیاتی جدید آغاز شده است؛ هیچ تغییر runtime یا داده عملیاتی در این مرحله انجام نشده.
