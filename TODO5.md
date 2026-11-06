## 🎯 Current Objective
تکمیل تجربه انتخاب پروژه در فرم ثبت رویداد؛ کد پروژه در بالا با فونت بزرگ و برجسته و نام پروژه در پایین با فونت کوچک‌تر نمایش داده شود. منطق انتخاب، ProjectID و APIها بدون تغییر می‌مانند.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- مخازن عملیاتی: `Saeidesl/PRSPRO2-PRODUCTION` و `Saeidesl/PRSPRO2BACKEND-PRODUCTION`.
- شاخه کاری: `feature/project-code-display-order-20261106` در هر دو مخزن؛ مقصد ادغام Frontend برابر `main`.
- Frontend: `js/modules/events.js`، متد `Events.renderProjectPicker()`؛ select مرجع `#event-form-project[name="ProjectID"]`.
- CSS: `css/events.css`؛ نسخه assetها در `index.html`.
- تست: `tests/project-picker.test.js`؛ اجرای تست‌های Node و CI.
- Backend: `Router.js` و `EventService.js`؛ قرارداد `POST /events` با `ProjectID` بدون تغییر. هیچ API، Sheet، schema یا permission جدیدی نیاز نیست.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** بررسی TODO5 و ARCHITECTURE هر دو مخزن، آخرین commit شاخه main و محل رندر انتخاب‌گر و استایل.
  - *Log:* Frontend main در commit `5054e7131db816e108089252901ba264bde3363c` و Backend main در commit `881663232a51aa457c5717bfaf956aeca3a11af0` بررسی شد. شاخه اختصاصی از همین مبناها ساخته شد.
- [x] **Task 2 — اصلاح ترتیب و اندازه اطلاعات پروژه:** نمایش کد بزرگ در بالا و نام کوچک‌تر در پایین، در کارت گزینه‌ها و پروژه انتخاب‌شده.
  - *Log:* فقط Frontend تغییر می‌کند؛ Backend و قراردادهای آن حفظ می‌شوند.
- *Log:* تغییر اجرایی Backend لازم نبود؛ PR #29 فقط Frontend را تغییر داد و قرارداد `POST /events` و `ProjectID` بدون تغییر ماندند. PR #29 در Frontend main با commit `3243892193d1fadfa91c50e402c13fb09a967b22` ادغام شد؛ تأیید انتشار و تست زنده در انتظار است.
- [ ] **Task 3 — آزمون و ادغام (IN PROGRESS):** اجرای CI و تست رگرسیون، بررسی سازگاری و آماده‌سازی PR؛ انتشار و تأیید زنده جداگانه بررسی می‌شود.
