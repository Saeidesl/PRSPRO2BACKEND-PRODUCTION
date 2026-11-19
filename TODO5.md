## 🎯 Current Objective
حذف مسیر نتیجه جداگانه پس از ثبت رویداد، حفظ نمایش دقیق نتیجه ذخیره‌سازی و یکپارچگی ملزومات در پاسخ API، و حذف مسیر retry اختصاصی که دیگر در رابط کاربری استفاده نمی‌شود.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- Runtime: Google Apps Script V8؛ داده عملیاتی در Google Sheets.
- API ثبت رویداد: `POST /events` در `Router.js` به `EventService.create` متصل است.
- منطق ثبت و یکپارچگی: `EventService.js`؛ رویداد، پاسخ فرم‌ها، اطلاعات مرکزی، workflow، audit و ProcurementEventIntegrationService را مدیریت می‌کند.
- قرارداد پاسخ: `Response.success(data, meta)`؛ فرانت‌اند از `PMS.Api.extractData` برای استخراج payload استفاده می‌کند.
- خروجی ثبت رویداد اکنون شامل `event`، `project`، `formPersistence`، `centralInformation` و `procurementIntegration` است.
- مسیر retry اختصاصی `/events/:id/procurement-retry` و متد `EventService.retryProcurementIntegration` حذف شده‌اند؛ مسیر اصلی ثبت رویداد و `ProcurementEventIntegrationService.apply` حفظ شده است.
- تست‌های مرتبط: `tests/forms-api-contract.test.js` و `tests/procurement-event-integration.test.js`.
- هیچ تغییر Sheet schema، migration یا حذف داده عملیاتی در این تسک وجود ندارد.

## 📋 Macro-Task Queue & Implementation Log
- [x] **Task 1 — Discovery & Planning:** ردیابی مسیر ثبت رویداد، قرارداد پاسخ، اتصال Procurement و مسیر retry.
  - *Log:* مسیر `POST /events` در `Router.js` به `EventService.create` می‌رسد؛ شکست Procurement پس از ذخیره رویداد در `procurementIntegration.status = FAILED` ثبت می‌شود. پیش از این تغییر، payload نهایی پاسخ وضعیت integration را به Frontend منتقل نمی‌کرد.
- [x] **Task 2 — Backend contract & route cleanup:** بازگرداندن وضعیت‌های persistence/integration در پاسخ ثبت و حذف route/service retry اختصاصی.
  - *Log:* در `EventService.js` فیلدهای `formPersistence`، `centralInformation` و `procurementIntegration` به payload پاسخ اضافه شدند؛ مسیر `procurementRetryMatch` در `Router.js` و متد `retryProcurementIntegration` حذف شدند. تست‌های `forms-api-contract.test.js` و `procurement-event-integration.test.js` به قرارداد جدید و نبود مسیر اختصاصی به‌روزرسانی شدند. Backend source checks، unit/integration tests، manifest/syntax، QA/release safety و domain contract review همگی موفق هستند.
- [ ] **Task 3 — Integration & merge verification (IN PROGRESS):** تأیید سازگاری با Frontend PR #157، بررسی CI نهایی و ادغام ایمن PR #96؛ بدون deployment تا تأیید جداگانه.
  - *Log:* PR #96 با آخرین commit `6969811145c780906305deb6f98c5532e631e6b8` باز است؛ CIهای Backend موفق‌اند. ادغام پس از سبز شدن کامل CI نهایی Frontend و Browser Audit انجام می‌شود.
