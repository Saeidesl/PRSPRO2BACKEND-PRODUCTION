## 🎯 Current Objective

ارسال اعلان تلگرام پس از ثبت موفق تمام رویدادهای PMS، شامل رویدادهای متصل به پروژه و رویدادهای مستقل، همراه با جزئیات واقعی ثبت‌شده؛ بدون ایجاد مسیر ثبت موازی و بدون وابسته‌کردن موفقیت ثبت رویداد به در دسترس بودن تلگرام.

دامنه تأییدشده مالک محصول:
- رویدادهای پروژه‌ای و مستقل هر دو اعلان شوند.
- پیام شامل مشخصات رویداد، پروژه در صورت وجود، ثبت‌کننده، واحد، زمان، توضیحات، مقادیر ثبت‌شده و پاسخ فرم‌های متصل باشد.
- پیام‌های طولانی به‌صورت امن به چند پیام مجاز تلگرام تقسیم شوند.
- خرابی یا timeout تلگرام نباید ثبت موفق رویداد را rollback یا ناموفق جلوه دهد.
- تنظیمات موجود Tenant و Chat ID و گزینه NotifyEnabled پروژه حفظ شوند؛ NotifyEnabled فقط برای رویدادهای پروژه‌ای اعمال می‌شود.
- هیچ token، شناسه محرمانه یا داده tenant دیگری در پیام/لاگ افشا نشود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه
- Backend عملیاتی: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`
- Frontend عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION`
- شاخه کاری فاز: `feat/telegram-event-notifications-20261107` در هر دو مخزن؛ از commit مبنای main ساخته شده است.
- Backend baseline: `1c9c9be4cc6c92fdc6e35d5bf19740945740264e`
- Frontend baseline: `1758a295b4158d32799667f3cf30644178e90c87`
- `TODO5.md` در هر دو مخزن پیش از شروع برابر «Ready for the next feature» بود؛ فاز قبلی بسته شده بود.
- `ARCHITECTURE.md` در هر دو مخزن موجود است؛ مستندات دائمی در این فاز فقط در صورت پذیرش/بستن فاز به‌روزرسانی می‌شوند.

### مسیر ثبت و اعلان موجود
- `Router.js`: مسیر موجود `POST /events` با مجوز `EVENT_CREATE` به `EventService.create(body, params)` متصل است.
- `EventService.js:create`: کنترل idempotency و جلوگیری از ثبت تکراری را انجام می‌دهد.
- `EventService.js:_createUnlocked_`: اعتبارسنجی tenant، نوع رویداد، پروژه (در صورت وجود)، واحد، ثبت‌کننده و فرم‌های متصل؛ ذخیره رویداد؛ ذخیره پاسخ فرم؛ اتصال تأمین؛ تغییر وضعیت پروژه و ثبت Audit را انجام می‌دهد.
- پس از تکمیل عملیات و ثبت وضعیت idempotency، فراخوانی best-effort فعلی `TelegramBotService.notifyEvent(finalEvent, updatedProject || project, eventType, department, performedUser, user.TenantID)` وجود دارد؛ اما شرط `if (project)` مانع اعلان رویداد مستقل است.
- خطای ارسال تلگرام در حال حاضر نباید عملیات ثبت رویداد را برگرداند؛ این تضمین باید حفظ شود.

### سرویس تلگرام موجود
- `TelegramBotService.js`:
  - `_getToken_`: خواندن `TELEGRAM_BOT_TOKEN` از Script Properties.
  - `sendMessage(chatId, text)`: ارسال متن با Telegram Bot API و محدودیت فعلی ۴۰۰۰ کاراکتر.
  - `registerTenantChat(tenantId, chatId)`: ثبت شناسه‌های مقصد در `TELEGRAM_TENANT_CHAT_IDS`.
  - `notifyEvent(event, project, eventType, department, performedUser, tenantId)`: اعلان خلاصه فعلی؛ mapping مقصد بر اساس Tenant.
  - `setupPolling`, `pollUpdates`, `handleWebhook`: دریافت فرمان‌های ربات؛ در این فاز نباید تغییر غیرضروری کنند.
- تنظیمات امن در Script Properties است؛ هیچ token نباید وارد Git شود.
- mapping مقصد: JSON با کلید TenantID و آرایه chat ID؛ هیچ مقصدی نباید از tenant دیگر خوانده شود.

### داده‌ها و منابع واقعی جزئیات
- شیت `13_Events` / `EventRepository.js`: رویداد شامل `ID, TenantID, ProjectID, EventTypeID, PerformedBy, CreatedBy, DepartmentID, OccurredAt, CreatedAt, Description, Status, Color, Size, VariantQuantity, VariantDetailsJSON` و snapshotهای گردش‌کار/idempotency است.
- شیت `08_Projects` / `ProjectRepository.js`: اطلاعات پروژه؛ `NotifyEnabled` تنظیم اعلان موجود پروژه است.
- `EventTypeRepository.js` و `EventTypeService.js`: نام و کد نوع رویداد و اطلاعات پیکربندی.
- `DepartmentRepository.js` و `UserRepository.js`: نام واحد و نام کاربر ثبت‌کننده/انجام‌دهنده.
- شیت `35_EventFormData` (در DatabaseSetup با نام `EVENT_FORM_DATA`) / `FormRepository.findResponsesByEvent(eventId)`: پاسخ‌های فرم متصل؛ `FormService.saveEventResponses(event, responses, user, params)` پس از ذخیره رویداد پاسخ‌ها را ذخیره می‌کند.
- `FormService.js`: `getEventResponses` و snapshotهای `ResponseJSON` و `DefinitionSnapshotJSON`؛ پاسخ‌ها می‌توانند آرایه/جدول چندردیفی و مقادیر تصویری باشند.
- شیت `15_Attachments` / `AttachmentRepository.findByEntity(entityType, entityId)`: metadata پیوست‌ها؛ فایل‌ها در Storage/Google Drive هستند. هر شناسه/فایل باید tenant و entity معتبر داشته باشد. ارسال فایل واقعی تلگرام در این فاز پیش‌فرض نیست؛ حداقل نام فایل/تصویر در جزئیات متنی درج شود، مگر تست و بررسی ایمنی مسیر رسانه امکان ارسال مطمئن را ثابت کند.
- شیت legacy `14_EventData` / `EventDataRepository.findByEventId` و `EventDataService.getByEventId`: داده‌های پویا تاریخی را می‌خواند؛ در مسیر فعلی `_createUnlocked_` محل نوشتن فعال برای این جدول مشاهده نشد. قبل از استفاده، وجود و قرارداد داده باید بررسی شود و از فرض‌کردن اینکه تمام فیلدهای پویا در این جدول ثبت می‌شوند خودداری شود.
- `EventService._enrichEventsBatch_` و `getProjectDetails` نمونه‌های موجود برای بازیابی گروهی اطلاعات رویداد/فرم/پیوست هستند؛ در مسیر اعلان از خواندن تکراری شیت‌ها برای هر فیلد اجتناب شود.

### داده و قراردادهای پایدار
- مسیرهای API موجود `POST /events` و `POST /projects/:projectId/attachments` حفظ شوند.
- Sheetهای موجود `13_Events`, `35_EventFormData`, `15_Attachments`, `08_Projects` و mapping تنظیمات Script Properties منبع حقیقت‌اند.
- ایجاد endpoint، Sheet، ستون، migration یا مسیر ثبت موازی در دامنه نیست.
- Frontend در `pages/events.html` و `js/modules/events.js` همان مسیر ثبت و جمع‌آوری پاسخ فرم را استفاده می‌کند؛ تغییر UI/Frontend فقط در صورت نیاز واقعی قرارداد مجاز است.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**: بررسی مخازن عملیاتی، شاخه‌ها، TODO5/ARCHITECTURE، مسیر ثبت، سرویس تلگرام، پاسخ فرم‌ها و منابع داده انجام شد.
  - *Log:* شاخه `feat/telegram-event-notifications-20261107` از commitهای مبنای main در هر دو مخزن ساخته شد. در Backend، `Router.js:POST /events` به `EventService.create/_createUnlocked_` متصل است؛ فراخوانی فعلی `TelegramBotService.notifyEvent` پس از ثبت نهایی idempotency انجام می‌شود اما به وجود پروژه شرط شده است. `TelegramBotService.js` از `TELEGRAM_BOT_TOKEN` و `TELEGRAM_TENANT_CHAT_IDS` استفاده می‌کند. جزئیات فرم از `FormRepository.findResponsesByEvent` و `35_EventFormData` قابل بازیابی است؛ فایل‌ها در `15_Attachments` metadata و در Storage/Drive محتوا دارند. در Frontend مسیر موجود `POST /events` و `js/modules/events.js` حفظ می‌شود. هیچ فایل اجرایی هنوز تغییر نکرده است.

- [x] **Task 2 — تکمیل گردآوری و قالب پیام اعلان**: قالب پیام فارسی و خوانا برای رویدادهای پروژه‌ای/مستقل، مشخصات رویداد، پاسخ فرم‌ها، جداول چندردیفی، جزئیات رنگ/سایز و نام پیوست‌ها پیاده‌سازی شد؛ پیام‌های بلند قطعه‌بندی می‌شوند.
  - *Log:* `TelegramBotService.js` — توابع `_parseNotificationJson_`, `_notificationAttachmentLabel_`, `_formatNotificationValue_`, `_formatNotificationForms_`, `_splitNotificationMessage_` و `notifyEvent` اضافه/تکمیل شدند. پاسخ‌ها فقط از `FormRepository.findResponsesByEvent` و ردیف‌های همان `TenantID/EventID` خوانده می‌شوند؛ metadata پیوست با `AttachmentRepository.findById` و tenant/status/project کنترل می‌شود؛ هیچ token یا StorageKey در پیام درج نمی‌شود. قالب پیام شامل پروژه یا برچسب رویداد مستقل، نوع رویداد، واحد، ثبت‌کننده، زمان‌ها، توضیحات، ترکیب‌ها و فرم‌های ثبت‌شده است.
- [x] **Task 3 — اتصال امن به چرخه ثبت و جلوگیری از اعلان تکراری**: اعلان هر دو نوع رویداد از مسیر موجود، پس از ذخیره نهایی و تکمیل idempotency ارسال می‌شود؛ replay اعلان جدید ایجاد نمی‌کند و خطای تلگرام best-effort است.
  - *Log:* `EventService.js:_createUnlocked_` — شرط قبلی `if (project)` حذف شد و همان فراخوانی `TelegramBotService.notifyEvent` برای رویداد مستقل نیز فعال شد؛ ترتیب بعد از ذخیره رویداد/فرم، اتصال تأمین، تغییر پروژه، Audit و ثبت `IdempotencyStatus=COMPLETED` حفظ شد. `NotifyEnabled=false` فقط اعلان پروژه‌ای را متوقف می‌کند؛ رویداد مستقل به پروژه وابسته نیست. مسیر `Router.js:POST /events` و payload موجود تغییر نکردند.
- [ ] **Task 4 — آزمون، سازگاری و تحویل عملیاتی (IN PROGRESS)**: CI، آزمون‌های Backend و بازبینی قرارداد/ایمنی؛ سپس ادغام PR پس از مجوز لازم، انتشار Apps Script و تست نسخه زنده. تفکیک GitHub، Apps Script deployment و تأیید نسخه زنده الزامی است.
  - *Log:* `tests/telegram-notification.test.js` — پوشش اعلان رویداد مستقل، چند مقصد یک Tenant، پاسخ فرم چندردیفی، نام canonical تصویر، رد داده Tenant دیگر، `NotifyEnabled=false`، قطعه‌بندی پیام بلند و نبود تنظیمات. Backend unit tests، syntax/manifest و هر دو Agent Suite در GitHub Actions موفق شدند. PR Backend #29 با روش squash در `main` ادغام شد (merge commit: `6642f9acf12046c2062c99d31885f27e030b215b`). کد در GitHub main تأیید شد؛ انتشار Apps Script و آزمون نسخه زنده هنوز انجام نشده‌اند.
