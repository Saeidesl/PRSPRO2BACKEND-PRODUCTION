## 🎯 Current Objective

پشتیبانی سازگاری Backend برای قابلیت «رویدادهای ثبت‌شده برای این پروژه» در Frontend. قابلیت از API موجود `GET /events` و فیلتر مجاز پروژه استفاده می‌کند؛ هدف حفظ قراردادهای سرور و عدم ایجاد endpoint یا تغییر داده غیرضروری است.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `feat/project-registered-events-button-20261107`، شاخه از main با مبنای آخرین commit `5838f1ccca5959d87fbdfe8dbb7561ef7414400e`.
- Frontend مرتبط: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `feat/project-registered-events-button-20261107`، شاخه از main با مبنای آخرین commit `1126b6be3908ae0ddf590747586b78c53bbeb53f`.
- هر دو مخزن عملیاتی و فایل‌های TODO5/ARCHITECTURE بررسی شدند؛ فاز قبلی بسته شده و TODO5 آماده قابلیت بعدی بود.

### قرارداد Backend مورد استفاده
- `Router.js`: مسیر موجود `GET /events` و کنترل مجوزهای مشاهده؛ محدودیت‌های tenant و دسترسی کاربر مرجع نهایی‌اند.
- فیلد `ProjectID` شناسه اتصال رویداد به پروژه است؛ فیلتر دقیق پروژه در Frontend انجام می‌شود.
- `EventService.js` و repositoryهای رویداد بدون تغییر باقی می‌مانند؛ endpoint یا query جدید موردنیاز نیست.
- شیت رویدادهای موجود `13_Events`؛ هیچ Sheet/column/schema/migration جدیدی اضافه نشود.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning: بررسی قرارداد API و مرز Backend [x]
- آخرین commit main، TODO5 و ARCHITECTURE مخزن عملیاتی و مسیرهای مرتبط مرور شدند.
- مشخص شد قابلیت با `GET /events` موجود و فیلتر `ProjectID` سمت Frontend انجام‌پذیر است؛ تغییر Backend runtime لازم نیست.
- *Log:* `Router.js:GET /events`، سرویس/مخزن فعلی رویداد و شیت `13_Events`؛ قرارداد `ProjectID` بدون تغییر. مبنای Backend `5838f1ccca5959d87fbdfe8dbb7561ef7414400e` و Frontend `1126b6be3908ae0ddf590747586b78c53bbeb53f`.

### Task 2 — تأیید سازگاری قرارداد Backend [x]
- بررسی نهایی مجوز مشاهده، tenant scoping و پاسخ `GET /events` در برابر فیلتر Frontend.
- عدم تغییر runtime، API، شیت و داده؛ ثبت دقیق نتیجه سازگاری.
- *Log:* `Router.js`: مسیر GET `/events` با `AccessControlService.require(params, 'EVENT_VIEW')` به `EventService.list(params)` متصل است. Frontend فقط رویدادهای برگشتی از همین API مجاز را با فیلد موجود `ProjectID` فیلتر می‌کند؛ tenant scoping و مجوز سرور دست‌نخورده‌اند. هیچ API، شیت، ستون یا schema جدیدی نیاز نیست.
 
### Task 3 — Cross-repository QA و ثبت نتیجه انتشار
- تطبیق رفتار Frontend با API موجود و اجرای QA یکپارچه.
- در صورت عدم تغییر Backend runtime، انتشار Apps Script لازم نیست و این موضوع صریحاً ثبت شود.
- نتیجه تست نسخه عملیاتی Frontend پس از انتشار از مالک محصول دریافت شود.
