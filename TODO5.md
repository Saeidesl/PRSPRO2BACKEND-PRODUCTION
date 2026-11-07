## 🎯 Current Objective

پشتیبانی سازگاری Backend برای دکمه «رویدادهای ثبت‌شده برای این پروژه» روی کارت پروژه در صفحه رویدادها. Frontend از API موجود `GET /events` و فیلتر مجاز `ProjectID` استفاده می‌کند؛ دکمه در همان صفحه و کنار «ثبت رویداد برای این پروژه» قرار می‌گیرد. هیچ endpoint یا تغییر داده جدیدی لازم نیست.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخازن و شاخه‌های عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه مستندسازی اصلاح محل دکمه `fix/project-event-history-shortcut-placement-20261107`، مبنا `5353ef0afa868ea768d6cdece7835d81fc3aa3ae`.
- Frontend مرتبط: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `fix/project-event-history-shortcut-placement-20261107`، مبنا `c602e34983226a446f54a42004371a2003c4e29e`.
- هر دو مخزن عملیاتی و فایل‌های TODO5/ARCHITECTURE بررسی شدند؛ فاز قبلی بسته شده و TODO5 آماده قابلیت بعدی بود.

### قرارداد Backend مورد استفاده
- `Router.js`: مسیر موجود `GET /events` و کنترل مجوزهای مشاهده؛ محدودیت‌های tenant و دسترسی کاربر مرجع نهایی‌اند.
- فیلد `ProjectID` شناسه اتصال رویداد به پروژه است؛ فیلتر دقیق پروژه در Frontend انجام می‌شود.
- `EventService.js` و repositoryهای رویداد بدون تغییر باقی می‌مانند؛ endpoint یا query جدید موردنیاز نیست.
- شیت رویدادهای موجود `13_Events`؛ هیچ Sheet/column/schema/migration جدیدی اضافه نشود.

## 📋 Macro-Task Queue & Implementation Log

### Task 1 — Discovery & Planning: بررسی قرارداد API و مرز Backend [x]
- آخرین commit main، TODO5 و ARCHITECTURE مخزن عملیاتی و مسیرهای مرتبط مرور شدند.
- مشخص شد دکمه روی کارت صف پروژه در صفحه رویدادها با `GET /events` موجود و فیلتر `ProjectID` سمت Frontend انجام‌پذیر است؛ تغییر Backend runtime، API، Sheet یا migration لازم نیست.
- *Log:* `Router.js:GET /events`، سرویس/مخزن فعلی رویداد و شیت `13_Events`؛ قرارداد `ProjectID` بدون تغییر. مبنای Backend `5838f1ccca5959d87fbdfe8dbb7561ef7414400e` و Frontend `1126b6be3908ae0ddf590747586b78c53bbeb53f`.

### Task 2 — تأیید سازگاری قرارداد Backend [x]
- بررسی نهایی مجوز مشاهده، tenant scoping و پاسخ `GET /events` در برابر فیلتر Frontend.
- عدم تغییر runtime، API، شیت و داده؛ ثبت دقیق نتیجه سازگاری.
- *Log:* `Router.js`: مسیر GET `/events` با `AccessControlService.require(params, 'EVENT_VIEW')` به `EventService.list(params)` متصل است. Frontend فقط رویدادهای برگشتی از همین API مجاز را با فیلد موجود `ProjectID` فیلتر می‌کند؛ tenant scoping و مجوز سرور دست‌نخورده‌اند. هیچ API، شیت، ستون یا schema جدیدی نیاز نیست.
 
### Task 3 — Cross-repository QA و ثبت نتیجه انتشار [x]
- تطبیق رفتار دکمه روی کارت پروژه در صفحه رویدادها با API موجود `GET /events`، مجوز `EVENT_VIEW`، tenant scoping و فیلد `ProjectID`.
- در صورت عدم تغییر Backend runtime، انتشار Apps Script لازم نیست و این موضوع صریحاً ثبت شود.
- نتیجه تست نسخه عملیاتی Frontend پس از انتشار از مالک محصول دریافت شود.
- *Log:* Frontend PR #49 با squash در commit `9c0bed3be00e265d361b446129614a1f21945b45` روی `main` ادغام و GitHub Pages با موفقیت منتشر شد. ۲۰۸ تست Frontend، Agent Suite، Cross-repository QA و Browser/Performance audit پیش از ادغام موفق شدند؛ مالک محصول در 2026-11-07 تست نسخه زنده را موفق تأیید کرد. Backend PR #26 صرفاً مستندات سازگاری را ثبت کرد و ادغام شد؛ `Router.js:GET /events`، `AccessControlService.require(..., 'EVENT_VIEW')`، `EventService.list(params)`، فیلتر `ProjectID` و شیت `13_Events` بدون تغییر ماندند. هیچ Backend runtime، API، Sheet، schema یا داده‌ای تغییر نکرد؛ بنابراین انتشار Apps Script لازم نبود.
