## 🎯 Current Objective

انتقال تمام فایل‌ها و تصاویر بارگذاری‌شده برای پروژه‌ها به پوشه اختصاصی Google Drive:
https://drive.google.com/drive/folders/1E-nYv5GF8wPn9diOZlfiGXnWQH-2WSmB

محدوده: تغییر مقصد ذخیره‌سازی در مسیر موجود Google Drive؛ حفظ APIها، شناسه‌های پیوست، metadata شیت، مجوزها، tenant isolation، اعتبارسنجی فایل و جریان کپی تصویر پروژه. هیچ مسیر آپلود یا ذخیره‌سازی موازی ایجاد نشود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)

### مخزن و شاخه عملیاتی
- Backend: Saeidesl/PRSPRO2BACKEND-PRODUCTION — شاخه feature/drive-project-attachments
- Frontend: Saeidesl/PRSPRO2-PRODUCTION — شاخه feature/drive-project-attachments
- آخرین commit بررسی‌شده Backend: 8cd0429fc72fe9e95490093cdf6d18d0db1cee69
- آخرین commit بررسی‌شده Frontend: شاخه main؛ commit جاری در زمان Discovery از فهرست آخرین commitها ثبت نشده است.
- TODO5.md در شروع این فاز وجود نداشت؛ این فایل برای پیگیری فاز ایجاد شده است.

### معماری موجود Backend
- Google Apps Script V8؛ Google Sheets دیتابیس؛ Google Drive ارائه‌دهنده ذخیره فایل.
- AppConfig.gs.js → AppConfig.FILES شامل MAX_SIZE_MB=10، GOOGLE_DRIVE_FOLDER_ID (فعلاً رشته خالی در فایل مخزن) و ALLOWED_MIME_TYPES.
- GoogleDriveStorage.js:
  - getRootFolder_(): اگر GOOGLE_DRIVE_FOLDER_ID تنظیم باشد از DriveApp.getFolderById استفاده می‌کند؛ در غیر این صورت پوشه‌ای با نام APP_NAME پیدا یا ایجاد می‌کند.
  - uploadBase64(data): decode/اعتبارسنجی حجم و MIME، سپس folder.createFile(blob).
  - copyFile(storageKey,fileName): کپی native از طریق source.makeCopy در همان پوشه ریشه.
  - getFile، getFileAsBase64 و delete نیز همین storageKey/Drive file ID را مصرف می‌کنند.
- StorageRepository.js: facade موجود برای uploadBase64، copyFile، getFile، getFileAsBase64 و delete.
- AttachmentService.js: کنترل دسترسی پروژه/رویداد و tenant، استفاده از StorageRepository، ثبت metadata پیوست در AttachmentRepository.
- AttachmentRepository.js و شیت 15_Attachments: نگهداری StorageProvider، StorageKey، FileName، MimeType، FileSize و اطلاعات مالکیت.
- Router.js: مسیرهای موجود POST /projects/:projectId/attachments، GET /projects/:projectId/attachments، GET /attachments/:attachmentId/download و DELETE /attachments/:attachmentId.
- ProjectService.js و AttachmentService.copyProjectImage: کپی تصویر مرجع پروژه از مسیر StorageRepository.copyFile.
- مسیر آپلود فرم‌های پویا نیز از AttachmentService/مسیر پیوست موجود استفاده می‌کند؛ قرارداد API نباید تغییر کند.

### معماری Frontend
- js/modules/project-detail.js و js/modules/project-images.js: نمایش/مدیریت فایل و تصاویر پروژه.
- js/modules/events.js: بارگذاری فایل‌های فرم رویداد و اتصال به پیوست پروژه از API موجود.
- صفحات پروژه/رویداد از APIهای موجود مصرف می‌کنند؛ تغییر مقصد ذخیره‌سازی باید صرفاً Backend باشد، مگر تست سازگاری نیاز دیگری را اثبات کند.

### قیود
- فقط پوشه مقصد فایل‌های جدید و کپی‌شده تغییر کند؛ فایل‌های قبلی جابه‌جا یا حذف نشوند.
- StorageKey همچنان شناسه فایل Drive بماند؛ metadata و API response سازگار بمانند.
- دسترسی حساب Google Apps Script اجراکننده به پوشه مقصد باید در تست واقعی تأیید شود.
- پوشه مقصد با ID برابر 1E-nYv5GF8wPn9diOZlfiGXnWQH-2WSmB است.
- از دست‌کاری Script Properties یا تنظیمات محیط زنده بدون بررسی مسیر استقرار خودداری شود.

## 📋 Macro-Task Queue & Implementation Log

- [x] **Task 1 — Discovery & Planning**
  - *Log:* مخازن عملیاتی مجاز بررسی شدند؛ هر دو روی شاخه main هستند. Backend آخرین commit بررسی‌شده 8cd0429fc72fe9e95490093cdf6d18d0db1cee69 است. ARCHITECTURE.md در هر دو مخزن مطالعه شد. TODO5.md پیش از این فاز وجود نداشت. کد واقعی AppConfig.gs.js، GoogleDriveStorage.js، StorageRepository.js و AttachmentService.js بررسی شد. مشخص شد مقصد Drive از AppConfig.FILES.GOOGLE_DRIVE_FOLDER_ID کنترل می‌شود و هر دو uploadBase64 و copyFile از getRootFolder_ استفاده می‌کنند؛ مقدار این تنظیم در فایل فعلی خالی است و در این حالت پوشه پیش‌فرض برنامه استفاده/ایجاد می‌شود. مسیرهای API و metadata فعلی باید بدون تغییر حفظ شوند. هیچ کد اجرایی یا داده عملیاتی تغییر نکرد.
- [x] **Task 2 — تنظیم مقصد واحد Google Drive در مسیر ذخیره‌سازی موجود**
  - *Log:* در `AppConfig.gs.js` مقدار `AppConfig.FILES.GOOGLE_DRIVE_FOLDER_ID` به شناسه پوشه معرفی‌شده تغییر کرد. منطق مشترک `GoogleDriveStorage.getRootFolder_()` بدون تغییر باقی ماند؛ بنابراین `uploadBase64()` و `copyFile()` از طریق `folder.createFile(blob)` و `source.makeCopy(name, folder)` در همان مقصد ذخیره می‌کنند. `StorageRepository`، `AttachmentService`، مسیرهای Router و شیت `15_Attachments` تغییر نکردند. فایل‌های قدیمی جابه‌جا/حذف نمی‌شوند. تست خودکار `tests/google-drive-storage-folder.test.js` برای مقصد آپلود، کپی تصویر و خطای دسترسی پوشه اضافه شد. Commitهای کد: `26d477f8b5301781dd11ecbdafaceb4bf5cf73aa` و تست: `516be50d836d13581bdc86c91bd47fbd09cb90c9`.
- [ ] **Task 3 — آزمون یکپارچگی و پذیرش عملیاتی (IN PROGRESS)**
  - بررسی syntax و تست‌های Backend مرتبط با Attachment/Storage.
  - بررسی عدم تغییر قراردادهای Frontend و مسیرهای موجود.
  - تست واقعی آپلود تصویر، فایل، فایل اطلاعات مرکزی/فرم و کپی تصویر پروژه؛ تأیید محل ذخیره در پوشه مقصد.
  - بررسی download/delete و ثبت metadata در 15_Attachments؛ بدون جابه‌جایی یا حذف فایل‌های قدیمی.
  - پس از گزارش نتایج، توقف برای تأیید کاربر.
