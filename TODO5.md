## 🎯 Current Objective

پیاده‌سازی امکان ویرایش مستقیم داده‌های متصل به قالب پروژه با ذخیره در منبع اصلی؛ ویرایش فیلدهای رویداد و پاسخ فرم باید همان رکورد قبلی را اصلاح کند و رویداد جدید ایجاد نکند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌ها
- Backend: Saeidesl/PRSPRO2BACKEND-PRODUCTION، شاخه feat/template-inline-data-edit-20261113، مبنا: main در commit a313b06aa96ed3bebc844a219df30d0df75a0213.
- Frontend: Saeidesl/PRSPRO2-PRODUCTION، شاخه feat/template-inline-data-edit-20261113، مبنا: main در commit 9595b3e060ab7b544830045e1db08170db3cdbd6.
- هیچ تغییر مستقیمی روی main انجام نمی‌شود؛ مخازن Development خارج از محدوده‌اند.

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
- [ ] **Task 2 — Inline Editing UX (IN PROGRESS):** ویرایش درجا در خروجی قالب، با اتصال به bindingها و کنترل حالت ذخیره/لغو/خطا.
- [ ] **Task 3 — Source Update Services:** تکمیل سرویس‌های امن Backend برای اصلاح پروژه/اطلاعات مرکزی/پاسخ فرم/فیلدهای همان رویداد، بدون ساخت رویداد جدید.
- [ ] **Task 4 — Integration & Regression:** آزمون امنیت، داده چندردیفی، تاریخچه، سازگاری API، چاپ/PDF و جریان‌های موجود.

## وضعیت پیاده‌سازی
- فقط Task 1 انجام شده است. در این مرحله هیچ فایل اجرایی، API، شیت، داده عملیاتی یا deployment تغییر نکرده است.