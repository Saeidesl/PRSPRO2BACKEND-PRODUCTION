## 🎯 Current Objective

تکمیل اتصال تلگرام در نسخه عملیاتی PMS به‌گونه‌ای که:
- پس از ایجاد پروژه (پیش‌نویس یا فعال) اعلان متناسب با اطلاعات ذخیره‌شده ارسال شود.
- پس از ثبت موفق رویداد، اطلاعات نوع رویداد، داده‌های پویای رویداد، اطلاعات مرکزی مرتبط با همان رویداد، پاسخ فرم‌های متصل و فایل‌ها/تصاویر ثبت‌شده به تلگرام ارسال شوند.
- ارسال اعلان tenant-scoped، قابل اتکا و best-effort باشد؛ خطای تلگرام نباید ثبت پروژه یا رویداد را ناموفق کند.
- معماری موجود توسعه یابد؛ هیچ مسیر موازی برای ثبت پروژه/رویداد یا ذخیره‌سازی جدید ساخته نشود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه عملیاتی فاز
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه فاز: `feature/telegram-notifications-20261111` در هر دو مخزن؛ از `main` ایجاد شده است. شاخه‌های `main` و مخازن توسعه مجاز به تغییر نیستند.
- Backend: Google Apps Script V8 + Google Sheets؛ فایل‌ها در Google Drive.
- Frontend: HTML/CSS/JavaScript؛ برای این قابلیت فعلاً تغییر رابط کاربری لازم تشخیص داده نشده است.

### مسیرهای جاری Backend
- `Router.js`
  - `POST /projects` با مجوز `PROJECT_CREATE` به `ProjectService.create(body, params)` متصل است.
  - `POST /events` با مجوز `EVENT_CREATE` به `EventService.create(body, params)` متصل است.
- `ProjectService.js`
  - `ProjectService.create(project, params)` مسیر اصلی ایجاد پروژه است.
  - پروژه پیش‌نویس در شاخه `RecordState=DRAFT` ساخته و در `ProjectRepository.insert(draft)` ذخیره می‌شود؛ در این شاخه بازگشت زودهنگام وجود دارد.
  - پروژه فعال پس از اعتبارسنجی گردش‌کار و کد یکتا در `ProjectRepository.insert(newProject)` ذخیره می‌شود.
  - اعلان پروژه باید بعد از ذخیره موفق و ثبت Audit در هر دو مسیر انجام شود؛ retry ایجاد پروژه نباید اعلان تکراری ایجاد کند.
- `EventService.js`
  - `EventService.create(event, params)` کنترل idempotency را انجام می‌دهد و در نهایت `_createUnlocked_(event, params)` را اجرا می‌کند.
  - پس از ذخیره رویداد، داده‌ها/فرم‌ها، تغییرات پروژه، Audit و تکمیل نشانگر idempotency، `TelegramBotService.notifyEvent(finalEvent, updatedProject || project, eventType, department, performedUser, user.TenantID)` فراخوانی می‌شود.
  - خطای تلگرام عمداً نباید نتیجه ثبت رویداد را rollback یا ناموفق کند.
- `TelegramBotService.js`
  - `sendMessage`: ارسال پیام به Telegram Bot API.
  - `registerTenantChat`: نگاشت شناسه چت به Tenant در Script Property.
  - `notifyEvent`: اعلان رویداد به چت‌های Tenant.
  - `_formatNotificationForms_`: خواندن snapshot و پاسخ فرم‌ها از `FormRepository.findResponsesByEvent`.
  - `_formatNotificationValue_` و `_notificationAttachmentLabel_`: قالب‌بندی داده‌ها و بررسی metadata فایل؛ نسخه فعلی نام فایل را نمایش می‌دهد و فایل واقعی را ارسال نمی‌کند.
  - `_splitNotificationMessage_`: تقسیم پیام بلند به قطعات قابل ارسال.
  - `setupPolling`, `pollUpdates`: دریافت فرمان‌های ربات با polling.
- `Code.js`
  - `runTelegramBotSetup()` در `Code.js` توکن را با پنجره ورودی دریافت می‌کند؛ `TelegramBotService.configureBotToken()` هویت `@PRS_Production_Notifications_Bot` را با `getMe` اعتبارسنجی، توکن را فقط در Script Properties ذخیره و polling یک‌دقیقه‌ای را فعال می‌کند.
  - `runTelegramWebhookSetup()`، `runTelegramPolling()` و `runTelegramWebhookInfo()` نقاط اجرای تنظیم/عیب‌یابی polling هستند.
  - webhook ورودی در `doPost` از API اصلی تفکیک شده است؛ راهکار polling برای اجتناب از محدودیت 401 endpoint ناشناس Apps Script موجود است.

### داده‌ها و ذخیره‌سازی
- `08_Projects`: پروژه شامل `ID`, `TenantID`, `ProjectCode`, `Title`, `Quantity`, `RecordState`, `NotifyEnabled`, `CreatedBy`, `CreatedAt`.
- `EventDataService.js` و `EventDataRepository.js`: داده‌های پویای نوع رویداد در `DataJSON` ذخیره/بازیابی می‌شوند؛ فیلدهای واقعی باید از کد و snapshot موجود خوانده شوند، نه از payload حدس زده شوند.
- `FormRepository.js`:
  - فرم‌ها: `32_Forms`
  - فیلدها: `33_FormFields`
  - اتصال نوع رویداد به فرم: `34_EventTypeForms`
  - پاسخ فرم رویداد: `35_EventFormData`
  - پاسخ‌ها در `ResponseJSON` و snapshot تعریف در `DefinitionSnapshotJSON` نگهداری می‌شود.
- `ProjectInformationRepository.js` و `ProjectInformationService.js`:
  - اطلاعات جاری پروژه در `30_ProjectInformation.ValueJSON`.
  - تاریخچه در `31_ProjectInformationHistory`.
  - `SourceEventID` ارتباط اطلاعات ثبت‌شده از یک رویداد با همان رویداد را مشخص می‌کند.
- `AttachmentService.js`, `AttachmentRepository.js`, `StorageRepository.js`, `GoogleDriveStorage.js`:
  - metadata فایل در `15_Attachments` شامل `ID`, `TenantID`, `EntityType`, `EntityID`, `FileName`, `MimeType`, `FileSize`, `StorageProvider`, `StorageKey`, `Status`, `AttachmentType` است.
  - فایل واقعی با `StorageKey` در Google Drive بازیابی می‌شود؛ ارسال فایل باید فقط پس از کنترل Tenant، مالکیت entity، وضعیت فعال، MIME و محدودیت حجم انجام شود.
  - پیوست فرم فعلی ممکن است به پروژه متصل باشد؛ پیوست رویداد نیز باید با entity واقعی خودش بررسی شود. به نام یا metadata ارسالی کلاینت اعتماد نشود.
- Script Properties موجود در طراحی:
  - `TELEGRAM_BOT_TOKEN` (از طریق `runTelegramBotSetup()`؛ هرگز در کد/Log/GitHub ذخیره نمی‌شود)
  - `TELEGRAM_WEBHOOK_SECRET` (فقط برای webhook؛ polling موجود است)
  - `TELEGRAM_TENANT_CHAT_IDS` (JSON نگاشت TenantID به آرایه chat ID)
  - هیچ توکن یا secret نباید در GitHub commit شود.

### استقرار و آزمون
- `.github/workflows/backend-check.yml`: آزمون‌ها و syntax بک‌اند.
- `.github/workflows/sync-apps-script.yml`: workflow دستی؛ فقط `main` را checkout می‌کند و گزینه‌های `push_only` و `push_and_deploy` دارد. انتشار تولید فقط با تأیید صریح و مجوز تنظیم‌شده workflow مجاز است.
- تست‌های موجود:
  - `tests/telegram-bot-service.test.js`
  - `tests/telegram-notification.test.js`
- تست‌های جدید باید ارسال پروژه، داده‌های پویای رویداد، اطلاعات مرکزی دارای `SourceEventID`، فرم‌های تک/چندردیفی، فایل/تصویر واقعی، tenant isolation، پروژه مستقل، `NotifyEnabled=false`، retry/idempotency و خطای Telegram API را پوشش دهند.
- انتشار GitHub، sync به Apps Script، deploy نسخه Web App و تأیید زنده چهار وضعیت جداگانه‌اند و نباید با یکدیگر اشتباه شوند.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning:** بررسی مخازن عملیاتی، شاخه‌ها، TODO5/ARCHITECTURE، مسیرهای ثبت پروژه/رویداد، سرویس تلگرام، مدل فرم/اطلاعات مرکزی/پیوست و workflow استقرار.
  - *Log:* هر دو مخزن عملیاتی قابل دسترسی‌اند؛ HEAD شاخه `main` در Backend برابر `4f9855585cb4290b0b79c0e9330bfa97628c62c0` و در Frontend برابر `a29612d6ed916824819fa2600b0e143eb317cd84` بود. `TODO5.md` در هر دو مخزن عبارت Ready for the next feature داشت. شاخه قدیمی `feat/telegram-event-notifications-20261107` در هر دو مخزن موجود اما از main منشعب و diverged است (Backend: پنج commit جلو و ۷۲ عقب؛ Frontend: دو commit جلو و ۱۴۷ عقب)؛ بنابراین هیچ commit آن بدون بازبینی/ادغام انتخابی وارد نمی‌شود. زیرساخت TelegramBotService و hook اعلان رویداد در main بک‌اند موجود است؛ اعلان پروژه وجود ندارد، داده‌های پویای EventData و اطلاعات مرکزی مرتبط باید به اعلان افزوده شوند و پیوست‌ها فعلاً فقط با نام نمایش داده می‌شوند. شاخه تازه `feature/telegram-notifications-20261111` از main در هر دو مخزن ایجاد شد.
- [ ] **Task 2 — تکمیل یکپارچه اعلان‌های پروژه و رویداد (IN PROGRESS):** توسعه TelegramBotService و hook موجود ProjectService/EventService برای اعلان ایجاد پیش‌نویس و پروژه فعال؛ تکمیل اطلاعات نوع رویداد، داده‌های پویای رویداد، اطلاعات مرکزی متصل به SourceEventID، snapshot فرم‌ها و ارسال امن فایل/تصویر از Google Drive؛ افزودن راه‌اندازی تعاملی ربات اختصاصی Production با اعتبارسنجی username و ذخیره امن token؛ حفظ tenant isolation، NotifyEnabled، idempotency و عدم تأثیر خطای تلگرام بر ثبت.
- [ ] **Task 3 — آزمون یکپارچگی، همگام‌سازی و پذیرش عملیاتی:** افزودن/اجرای تست‌های واحد و رگرسیون، بررسی API و دسترسی فایل، بررسی workflow و سازگاری نسخه‌ها؛ سپس آماده‌سازی sync/deploy طبق workflow عملیاتی و انجام تست زنده با تنظیمات امن تلگرام. وضعیت GitHub، Apps Script sync، Web App deploy و live verification جداگانه گزارش شود.
