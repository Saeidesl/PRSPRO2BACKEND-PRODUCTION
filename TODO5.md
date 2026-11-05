## 🎯 Current Objective

اجرای آزمون یکپارچگی و رگرسیون روی نسخه عملیاتی PMS پس از انتشار قابلیت رویدادهای تکرارپذیر؛ رفع شکست‌های CI و تست‌های نادرست بدون تغییر غیرضروری در منطق عملیاتی، و بررسی سازگاری Frontend/Backend، مجوزها، tenant isolation، Idempotency، فرم‌ها، پیوست‌ها و Workflowهای قدیمی.

محدوده ایمنی:
- همه اصلاحات QA در شاخه مستقل `qa/integration-regression-20261105` انجام می‌شوند.
- تا تأیید مالک محصول هیچ PR ادغام و هیچ نسخه‌ای دوباره منتشر نمی‌شود.
- آزمون‌هایی که به API محیط staging نیاز دارند، بدون تنظیمات staging به‌عنوان کامل/موفق گزارش نمی‌شوند.
- هیچ داده عملیاتی یا شیت موجود تغییر داده نمی‌شود.

تصمیم کسب‌وکاری تأییدشده:
- رویدادهای تکرارپذیر مانند «درخواست اصلاح نمونه» می‌توانند هر تعداد بار در مرحله جاری ثبت شوند.
- ثبت رویداد تکرارپذیر به‌تنهایی مرحله را تکمیل نمی‌کند.
- پایان مرحله باید با اقدام صریح مسئول مجاز مرحله اعلام شود.
- پس از پایان مرحله، ثبت رویدادهای آن مرحله متوقف و وضعیت مرحله تکمیل‌شده می‌شود.
- تعداد دفعات از پیش تعیین نمی‌شود.



## وضعیت ادغام و تحویل
- تغییرات Backend از طریق PR #2 در `main` ادغام شدند؛ Merge Commit: `91d7c80aaaae0f04284f00fab95a52e3b666c039`.
- انتشار Backend در 2026-11-05 از طریق Workflow رسمی `Sync and deploy backend to Google Apps Script (PRODUCTION)` با Run ID `42091457135` و نتیجه `success` انجام شد؛ هر دو گام `Push validated source to isolated production Apps Script` و `Deploy isolated production web app` موفق بودند.
- Workflow روی شاخه `main` و commit `27d99fd809cdffe7752eb28cdd8f44b6fd341a87` اجرا شد؛ هیچ ادعایی درباره انتشار محیط‌های محافظت‌شده دیگر وجود ندارد.
- مالک محصول آزمون عملیاتی ثبت چندباره، مستقل بودن پاسخ فرم‌ها، عدم تکمیل خودکار مرحله، اعلام پایان توسط مسئول و جلوگیری از ثبت پس از پایان را موفق اعلام کرد.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه فاز
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feature/repeatable-workflow-events`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feature/repeatable-workflow-events`
- مبنای هر دو شاخه: آخرین `main` بررسی‌شده در 2026-11-05.
- شاخه feature پس از بررسی و به درخواست صریح کاربر از طریق PR #2 در `main` ادغام شد؛ هیچ force-push یا بازنویسی تاریخچه انجام نشد.

### Backend — مسیر و وابستگی‌های کشف‌شده
- `Router.js`: مسیر `POST /events` به `EventService.create(body, params)` و مسیر `GET /projects/{projectId}/workflow-progress` به `EventService.workflowProgress(projectId, params)` متصل است.
- `EventService.js`:
  - `create()` کلید Idempotency و جلوگیری از پردازش مجدد یک درخواست شبکه را مدیریت می‌کند.
  - `_createUnlocked_()` پروژه، نوع رویداد، tenant، مجوز واحد و قواعد مرحله را اعتبارسنجی و رویداد را در مسیر اصلی ذخیره می‌کند.
  - `_getWorkflowRuleProgress_()` قواعد مرحله و رویدادهای معتبر دارای همان `WorkflowStepID` را بررسی می‌کند؛ در نسخه فعلی وجود یک رویداد هم‌نوع برای قاعده کافی است.
  - `_validateWorkflowEvent_()` در حال حاضر قاعده‌ای را که قبلاً یک بار ثبت شده رد می‌کند.
  - پس از ثبت، `workflowProgressAfter.stageComplete` می‌تواند `CurrentStepStatus` را خودکار به `COMPLETED` تغییر دهد؛ این رفتار باید برای مراحل دارای تکمیل دستی کنترل شود.
  - ابطال رویداد نیز وضعیت مرحله را با `_getWorkflowRuleProgress_()` باز‌محاسبه می‌کند و باید با سیاست جدید سازگار بماند.
- `WorkflowService.js`: `saveStepEventRules()` قواعد مرحله را اعتبارسنجی و در مخزن ذخیره می‌کند؛ `getStepEventRules()` قواعد نسخه Workflow را برمی‌گرداند.
- `WorkflowStepEventRuleValidator.js`: اعتبارسنجی RequirementMode، DataSource و SequenceMode.
- `WorkflowStepEventRuleRepository.js`: شیت `37_WorkflowStepEventRules` و نسخه‌بندی قواعد؛ متدهای `findByStepAndVersion` و `replaceForStepVersion`.
- `EventTypeService.js` و `EventTypeValidator.js`: مدیریت نوع رویداد. فیلد `IsWorkCompletion` از قبل در schema/validator/normalizer وجود دارد، اما create آن را در رکورد جدید ذخیره نمی‌کند و منطق Backend تکمیل مرحله از آن استفاده نمی‌کند؛ این فیلد بدون بررسی اثرات جانبی نباید به‌عنوان فرمان تکمیل مرحله فرض شود.
- `DatabaseSetup.js`: شیت `37_WorkflowStepEventRules` و ستون‌های فعلی قواعد؛ هر تغییر schema باید افزایشی و بدون حذف/بازنویسی داده باشد.
- `EventRepository.js`: شیت `13_Events`؛ رویدادها با شناسه مستقل و فیلدهای `WorkflowID`, `WorkflowVersion`, `WorkflowStepID`, `EventTypeID`, `Status`, `IdempotencyKey`, `IdempotencyStatus` ذخیره می‌شوند.
- `FormService.js` و `FormRepository.js`: پاسخ فرم در شیت `35_EventFormData` با `EventID` و `FormID` ذخیره می‌شود؛ Snapshot نسخه فرم نگهداری می‌شود. پاسخ‌های رویدادهای مختلف مستقل‌اند.
- `ProjectRepository.js`: وضعیت جاری مرحله پروژه با `CurrentStepID` و `CurrentStepStatus` نگهداری می‌شود.
- مجوزهای ثبت فعلی: `EVENT_CREATE` در Router و کنترل tenant، دسترسی پروژه و واحد/کاربر در EventService؛ اقدام پایان مرحله باید در Backend و با کنترل مجوز/واحد مسئول مرحله اعتبارسنجی شود.

### Frontend — مسیر و وابستگی‌های کشف‌شده
- `js/modules/events.js`: فرم ثبت واحد، ارسال `POST /events`، دریافت پیشرفت از `GET /projects/{id}/workflow-progress` و غیرفعال‌سازی انواع رویداد بر اساس `rule.satisfied`.
- `js/modules/workflows.js`: ویرایشگر قواعد هر مرحله، بارگذاری و ذخیره از مسیر `/workflows/{workflowId}/steps/{stepId}/event-rules`.
- `index.html`: بارگذاری ماژول‌ها و نسخه‌گذاری cache-busting.
- `tests/workflow-management.test.js`: قراردادهای ویرایشگر Workflow و نمایش پیشرفت رویداد.
- رابط کاربری باید رویداد تکرارپذیر را تا اعلام پایان قابل انتخاب نگه دارد، تعداد وقوع را نمایش دهد و اقدام پایان را فقط برای مسئول مجاز مرحله عرضه کند.

### قواعد سازگاری و یکپارچگی
- API اصلی `POST /events` و مدل Event/Form موجود حفظ شود؛ برای ثبت رویداد مسیر موازی ساخته نشود.
- Idempotency فقط برای retry همان درخواست باقی بماند؛ هر ثبت واقعی جدید باید کلید مستقل داشته باشد.
- پیش‌فرض قواعد فعلی باید رفتار سابق را حفظ کند؛ Workflowهای منتشرشده و قدیمی نباید ناخواسته تکرارپذیر یا تکمیل دستی شوند.
- رویدادهای ابطال‌شده نباید در شمارش وقوع/تکمیل مؤثر باشند.
- همه خواندن‌ها و نوشتن‌ها tenant-scoped و با حفظ مجوزهای موجود باشند.
- پاسخ فرم، snapshot، پیوست‌ها، Audit، اعلان‌ها و یکپارچگی تأمین باید از مسیر جاری عبور کنند.
- هیچ داده عملیاتی حذف یا مهاجرت مخرب انجام نشود.
- تکمیل مرحله باید اتمیک/قابل بازیابی باشد و پس از بسته‌شدن مرحله، ثبت عادی در مرحله بسته رد شود.
- تغییرات Backend و Frontend باید روی همین شاخه‌های feature سازگار بمانند؛ انتشار یا ادغام به main بدون پذیرش کاربر انجام نشود.

### جریان داده فعلی
1. Frontend پروژه و نوع رویداد را انتخاب می‌کند و پیشرفت Workflow را از endpoint موجود می‌خواند.
2. فرم‌های متصل به نوع رویداد دریافت و اعتبارسنجی می‌شوند.
3. Frontend payload فعلی شامل `ProjectID`, `EventTypeID`, `OccurredAt`, `Description`, `FormResponses`, `VariantQuantity` و `IdempotencyKey` را به `POST /events` می‌فرستد.
4. Backend در EventService دسترسی و Workflow را اعتبارسنجی و رویداد را در `13_Events` ذخیره می‌کند.
5. FormService پاسخ‌ها را در `35_EventFormData` ذخیره و اطلاعات مرکزی پروژه را طبق قواعد فعلی به‌روزرسانی می‌کند.
6. EventService نتیجه Workflow و وضعیت پروژه را برمی‌گرداند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning: بررسی معماری، تثبیت تصمیم محصول و طراحی دامنه تغییر**
  - *Log:* هر دو مخزن عملیاتی، شاخه‌ها، آخرین commitها، `TODO5.md` و `ARCHITECTURE.md` بررسی شدند. هر دو main در وضعیت مستقل و بدون تغییر باقی ماندند. مسیر واقعی ثبت در `Router.js`, `EventService.create()`, `EventService._createUnlocked_()`, `EventService._getWorkflowRuleProgress_()`, `EventService._validateWorkflowEvent_()`, `FormService.prepareEventResponses()`, `FormService.saveEventResponses()` و `EventRepository` ردیابی شد. ارتباط UI در `js/modules/events.js` و `js/modules/workflows.js` و قواعد در `WorkflowService.saveStepEventRules()`, `WorkflowStepEventRuleValidator.js`, `WorkflowStepEventRuleRepository.js` بررسی شد. ذخیره رویداد در `13_Events` و پاسخ فرم در `35_EventFormData` است و پاسخ‌ها به EventID مستقل وابسته‌اند. علت محدودیت، تکمیل قاعده با اولین وقوع و رد مجدد آن در Backend و Frontend است. فیلد `IsWorkCompletion` موجود است اما به‌تنهایی منطق تکمیل مرحله را اجرا نمی‌کند. تصمیم کاربر: ثبت نامحدود رویداد تکرارپذیر و پایان صریح توسط مسئول مرحله؛ Idempotency و مسیر اصلی ثبت حفظ شود. شاخه‌های `feature/repeatable-workflow-events` از آخرین main در هر دو مخزن ایجاد شدند؛ هیچ کد اجرایی تغییر نکرد.
- [x] **Task 2 — پشتیبانی یکپارچه از رویدادهای تکرارپذیر و پایان دستی مرحله**
  - Backend: افزودن `AllowRepeat` به قواعد Workflow؛ شمارش occurrenceها؛ اجازه ثبت چندباره تا بسته‌شدن مرحله؛ افزودن `POST /projects/{id}/complete-step` با کنترل tenant، دسترسی پروژه، واحد مسئول، الزامات و Audit.
  - Frontend: تنظیم تکرارپذیری در `js/modules/workflows.js`؛ نمایش شمارنده، وضعیت مرحله و اقدام پایان برای مسئول مجاز در `js/modules/events.js`؛ حفظ مسیر اصلی `POST /events` و پاسخ مستقل فرم‌ها.
  - انتشار: Backend با Workflow Run `42091457135` (Push و Deploy موفق)؛ Frontend با GitHub Pages Run `42090914176` (موفق).
  - *Log:* Backend: `WorkflowStepEventRuleValidator.js` اعتبارسنجی `AllowRepeat`؛ `WorkflowStepEventRuleRepository.js` افزودن ستون و حفظ آن هنگام clone نسخه Workflow؛ `DatabaseSetup.js` افزودن header افزایشی؛ `EventService.js` شمارش occurrenceها و خروجی‌های `eventCount`, `allowRepeat`, `manualCompletionRequired`, `stepClosed`, `requirementsSatisfied`, `stageComplete`، متد `completeStep()` و کنترل `_canUserCompleteStep_()`؛ `EventRepository.js` و `GoogleSheetsRepository.js` اجرای revalidation در callback داخل ScriptLock؛ `Router.js` افزودن `POST /projects/{id}/complete-step` با `EVENT_CREATE`. Frontend: `js/modules/workflows.js` تنظیم `AllowRepeat`؛ `js/modules/events.js` ثبت مجدد رویداد، نمایش شمارنده و اقدام اعلام پایان؛ `index.html` cache-busting. ذخیره رویدادها در `13_Events` و پاسخ فرم‌ها در `35_EventFormData` با EventID مستقل؛ قواعد در `37_WorkflowStepEventRules`. تست‌های افزوده/به‌روزشده در `tests/workflow-event-enforcement.test.js` و `tests/workflow-management.test.js`. PRهای ادغام‌شده: Backend #2 (merge `91d7c80aaaae0f04284f00fab95a52e3b666c039`) و Frontend #1 (merge `ec13efe137deb14c9937499666046538e35a46a0`). آزمون پذیرش عملیاتی کاربر در 2026-11-05 موفق اعلام شد: حداقل سه ثبت هم‌نوع مستقل، شمارنده، عدم تکمیل خودکار، پایان دستی توسط مسئول و رد ثبت پس از بسته‌شدن مرحله تأیید شدند.
- [ ] **Task 3 — Integration QA & Regression (IN PROGRESS): آزمون سرتاسری و بررسی رگرسیون
  - [x] Discovery & Planning: هر دو `TODO5.md` و `ARCHITECTURE.md` خوانده شدند؛ شاخه‌ها و آخرین commitهای main بررسی شدند. Backend main در زمان شروع `123b2bfaae4929beb56aeda71c89984aaffbdbf0` و Frontend main `5a7978ea5d657b17a40132892f30f3f957f94d7d` بود. شاخه QA مستقل در هر دو مخزن از همین commitها ایجاد شد.
  - [x] اصلاح شکست‌های CI بک‌اند: سه تست `google-sheets-cache-invalidation.test.js` به دلیل نبود global مربوط به resolver دیتابیس در mock محیط تست fail می‌شدند؛ resolver آزمایشی به context تست اضافه شد. تست `schema-contract.test.js` انتظار workflow خودکار deploy روی push را داشت که با سیاست امنیتی جدید ناسازگار بود؛ assertionها با workflow واقعی manual-dispatch و تأیید صریح هم‌راستا شدند.
  - [x] اصلاح وابستگی تست مرورگر: نصب شناور Playwright به نسخه منتشرنشده `1.65.0` resolve می‌شد؛ workflow به نسخه پایدار منتشرشده `1.64.1` pin شد.
  - [x] Backend CI روی commit `ecbb842c6d9d834e963c06531ef4fcd22088a2ff`: 172/172 تست Backend موفق؛ 14/14 تست Procurement diagnostics موفق؛ هر دو agent مربوط به Domain Contract و QA/Release Safety موفق.
  - [x] Frontend CI روی commit `2ba6612976a79d5958248d818c834206a6907656`: Frontend Checks، Cross-repository QA، Browser Audit و تست واقعی دسترس‌پذیری/کیبورد موفق.
  - محدودیت باقیمانده: گزارش Browser Audit مقدار `overallStatus=blocked-no-staging-api` را برگرداند؛ مسیرهای بررسی‌شده خطای route، network یا console نداشتند، اما آزمون API/performance متصل به staging به دلیل نبود تنظیمات/دسترسی staging قابل تکمیل نبود. این مورد به‌عنوان قبولی کامل API staging محسوب نمی‌شود.
  - PRها برای بازبینی و نگهداری تغییرات QA باز و Draft هستند: Backend PR #3 و Frontend PR #2. هیچ‌کدام ادغام نشده‌اند و main/نسخه عملیاتی تغییر نکرده است.
  - *Log موقت:* Backend: `tests/google-sheets-cache-invalidation.test.js` و `tests/schema-contract.test.js`. Frontend: `.github/workflows/pms-ui-performance-audit.yml`. شاخه‌های QA: `qa/integration-regression-20261105`. اجرای تست‌ها از GitHub Actions انجام شد؛ نتیجه نهایی Task 3 پس از رفع محدودیت staging و تأیید مالک محصول ثبت می‌شود.
