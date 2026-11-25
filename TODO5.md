## 🎯 Current Objective
بازطراحی خط زمانی رویدادهای صفحه جزئیات پروژه به لیست فشرده و بازشونده، با ارتفاع کم برای مشاهده مسیر پروژه در یک نگاه.

## 🗺️ Technical Spec & Architecture Map (DO NOT DELETE)
- Frontend عملیاتی; Backend بدون تغییر: `Saeidesl/PRSPRO2-PRODUCTION` شاخه کاری Frontend branch `feat/compact-project-event-timeline-20261125`; شاخه مبنا `main`.
- صفحه: `pages/project-detail.html`؛ container موجود `#project-detail-events` حفظ می‌شود.
- رندر و منطق: `js/modules/project-detail.js` تابع `ProjectDetail.renderEvents(events)`; مرتب‌سازی با `getEventTimestamp`; منبع تاریخ وقوع `OccurredAt/occurredAt` (fallback legacy به CreatedAt).
- مجری از `PerformedBy/PerformedByID` و users lookup موجود؛ ثبت‌کننده در حالت خلاصه نمایش داده نمی‌شود.
- Details native برای جزئیات بازشونده؛ dynamic data و summary cutting فعلی حفظ می‌شوند؛ بدون API/schema جدید.
- Backend فقط برای بررسی قرارداد داده؛ هیچ تغییری در مخزن Backend لازم نیست.

## 📋 Macro-Task Queue & Implementation Log
- [x] Task 1 — Discovery & Planning: بررسی مخازن عملیاتی، branch `main`, TODO5/ARCHITECTURE و مسیر فعلی `renderEvents`; مشخص شد رندر موجود کارت‌های بلند timeline، نمایش ثبت‌کننده/مجری و تاریخ وقوع/ثبت دارد.
  - *Log:* `ProjectDetail.renderEvents`, `getEventTimestamp`, `metaItem`, `renderDynamicData`, `ensureTimelineStyles` در `js/modules/project-detail.js` و container موجود `#project-detail-events` بررسی شد. تغییر فقط در Frontend خواهد بود و مسیر/داده/API موازی ساخته نمی‌شود.
- [ ] **Task 2 — IN PROGRESS: Compact Event Timeline UI:** ردیف‌های فشرده با تاریخ وقوع و انجام‌دهنده، جزئیات بازشونده و حفظ اطلاعات تکمیلی؛ آماده CI و PR.
- [ ] Task 3 — Integration, Regression & Acceptance: CI، بررسی رفتار RTL/mobile، ترتیب تاریخ، جزئیات و پذیرش Product Owner.
