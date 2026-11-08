# اتصال Google Sheets به PMS

این پروژه یک Google Sheets Editor Add-on مستقل است و عمداً در پوشه‌ای خارج از ریشه Apps Script عملیاتی نگهداری می‌شود؛ workflow فعلی `sync-apps-script.yml` فقط فایل‌های ریشه را به Web App موجود منتقل می‌کند و این Add-on را به Backend عملیاتی تزریق نمی‌کند.

## روش کار MVP
1. کاربر فایل قالب را در Google Sheets باز می‌کند.
2. از منوی «PMS | مدیریت تولید» گزینه «اتصال به PMS و انتخاب پروژه» را اجرا می‌کند.
3. با نام کاربری و رمز PMS وارد می‌شود؛ فقط توکن نشست در User Properties همان کاربر ذخیره می‌شود.
4. پروژه از API مجاز `GET /projects` انتخاب می‌شود.
5. Add-on جزئیات و اطلاعات مرکزی پروژه را از APIهای موجود می‌خواند.
6. یک کپی از فایل قالب در همان پوشه Drive می‌سازد و فقط کپی را تکمیل می‌کند.

## قرارداد نگاشت MVP
برای هر محل داده، در Google Sheets یک Named range تک‌سلولی بسازید. نام محدوده باید یکی از این موارد باشد:

- `PMS_PROJECT_ID`
- `PMS_PROJECT_CODE`
- `PMS_PROJECT_TITLE`
- `PMS_PROJECT_DESCRIPTION`
- `PMS_PROJECT_STATUS`
- `PMS_PROJECT_QUANTITY`
- `PMS_PROJECT_CREATED_AT`
- `PMS_PROJECT_UPDATED_AT`
- اطلاعات مرکزی: `PMS_INFO_<InformationTypeID>` 

نمونه: سلول B4 را انتخاب کنید، از Data > Named ranges نام `PMS_PROJECT_TITLE` را برای آن ثبت کنید. ظاهر سلول، ادغام، اندازه، فرمت و تنظیمات چاپ آزادانه توسط کاربر تعیین می‌شود.

در MVP فقط نگاشت تک‌سلولی و مقدارهای ساده پشتیبانی می‌شود. اطلاعات چندردیفی/چندمقداری، تصاویر، درج ردیف‌های تکراری و PDF در Task 3 توسعه داده می‌شوند. Named range چندسلولی عمداً نوشته نمی‌شود و در گزارش خروجی اعلام خواهد شد.

## راه‌اندازی آزمایشی (نیازمند مالک حساب Google)
1. یک Apps Script project مستقل برای این پوشه بسازید و فایل‌های این پوشه را به آن منتقل کنید یا از clasp با Script ID جداگانه استفاده کنید.
2. فایل manifest را به‌عنوان `appsscript.json` قرار دهید.
3. در Apps Script، پروژه را به Google Cloud project استاندارد متصل کنید.
4. از Deploy > Test deployments، نوع Editor add-on را فعال و فایل Sheet آزمایشی را انتخاب کنید.
5. Add-on را اجرا و مجوزهای Google را تأیید کنید.

این مرحله یک Test deployment است؛ انتشار عمومی/Marketplace و هیچ deployment در Web App عملیاتی PMS در این تسک انجام نمی‌شود. راهنمای رسمی: https://developers.google.com/workspace/add-ons/how-tos/testing-editor-addons

## امنیت و محدودیت‌های شناخته‌شده
- احراز هویت با مسیر فعلی `POST /auth/login` انجام می‌شود.
- توکن فقط در User Properties ذخیره می‌شود و رمز عبور ذخیره نمی‌شود.
- فهرست و جزئیات پروژه از API فعلی عبور می‌کند؛ tenant و مجوزها در Backend مرجع نهایی‌اند.
- هیچ دسترسی مستقیمی به Google Sheets دیتابیس PMS وجود ندارد.
- آدرس API نسخه عملیاتی در کد ثابت شده و فقط به endpoint فعلی اشاره می‌کند؛ Add-on مستقل است.
