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

- [ ] **Task 2 — تکمیل گردآوری و قالب پیام اعلان (IN PROGRESS)**: تکمیل `TelegramBotService.notifyEvent` و توابع کمکی برای رویداد پروژه‌ای/مستقل، استخراج مقادیر فرم‌های متصل (از جمله ردیف‌های چندگانه)، جزئیات واریانت و metadata پیوست؛ قالب‌بندی فارسی خوانا و تقسیم امن پیام‌های طولانی؛ حفظ Tenant isolation و NotifyEnabled پروژه.
- [ ] **Task 3 — اتصال امن به چرخه ثبت و جلوگیری از اعلان تکراری**: اصلاح نقطه فراخوانی در `EventService._createUnlocked_` فقط پس از موفقیت ذخیره نهایی؛ اعلان برای رویداد مستقل نیز؛ عدم ارسال در idempotent replay؛ خطای Telegram کاملاً best-effort و بدون اثر بر نتیجه ثبت.
- [ ] **Task 4 — آزمون، سازگاری و تحویل عملیاتی**: تست واحد برای رویداد پروژه‌ای/مستقل، فرم‌های تک‌فیلدی و چندردیفی، تصویر/پیوست، پیام بلند، mapping چند chat/tenant، NotifyEnabled=false، عدم پیکربندی، خطا/timeout تلگرام و idempotent replay؛ بررسی Frontend/API و رگرسیون؛ سپس PR/ادغام طبق workflow مجاز و تفکیک GitHub، Apps Script deployment و تأیید نسخه زنده.
