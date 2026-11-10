## 🎯 Current Objective
رفع نمایش دو رشته متنی اضافی `\\n` در صفحه طراحی قالب چاپ، بدون حذف یا تغییر قابلیت‌های موجود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
### مخازن و شاخه عملیاتی
- Backend: `Saeidesl/PRSPRO2BACKEND-PRODUCTION`، شاخه `fix/print-designer-literal-newlines-20261110`؛ فقط مستندات و پیگیری، بدون تغییر کد Backend.
- Frontend: `Saeidesl/PRSPRO2-PRODUCTION`، شاخه `fix/print-designer-literal-newlines-20261110`؛ تغییر محدود به `pages/print-designer.html`.
- هر دو شاخه از `main` مخازن عملیاتی ساخته شدند؛ مخازن توسعه خارج از محدوده‌اند.

### یافته‌های Discovery
- در `pages/print-designer.html` دقیقاً دو رشته literal از جنس `\\n` وجود داشت:
  1. انتهای خط ورودی `#pt-image-file` پیش از `#pt-editor-settings`.
  2. انتهای خط `#pt-page-tabs` پیش از `.pt-editor-preview-layout`.
- این رشته‌ها newline واقعی HTML نیستند و به‌صورت دو کاراکتر اضافی در صفحه نمایش داده می‌شوند.
- اصلاح فقط حذف همین دو رشته است؛ ساختار DOM، ترتیب عناصر و رفتارها نباید تغییر کند.

### قابلیت‌های صریحاً حفظ‌شونده
- ورود PDF و تصویر به‌عنوان پس‌زمینه و تمام جریان‌های ذخیره/بازیابی و رندر.
- افزودن تصویر مستقل از طریق `#pt-image-file`.
- طراحی صفحه، تب صفحات، پیش‌نمایش زنده، چاپ و دانلود.
- تمام APIها، داده‌ها، فایل‌های Drive، Sheetها و کد Backend بدون تغییر.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5.md و ARCHITECTURE.md هر دو مخزن، branchهای عملیاتی، صفحه و محل دقیق دو رشته اضافی انجام شد.
  - *Log:* Frontend `pages/print-designer.html` در دو نقطه پس از `#pt-image-file` و `#pt-page-tabs` دارای رشته literal `\\n` بود. هر دو مخزن عملیاتی و مستنداتشان بررسی شدند؛ Backend runtime/API/DB در این اصلاح دخالتی ندارد.
- [ ] **Task 2 — اصلاح دقیق HTML (IN PROGRESS):** حذف فقط دو رشته literal `\\n` از `pages/print-designer.html`؛ حفظ تمام قابلیت‌ها و سایر محتوای فایل.
- [ ] **Task 3 — Regression، ادغام و انتشار:** اجرای تست‌های Frontend، بررسی diff برای اطمینان از تغییر صرفاً دو رشته، ادغام از PR و انتشار رسمی GitHub Pages؛ سپس تست عملی صفحه توسط Product Owner.
