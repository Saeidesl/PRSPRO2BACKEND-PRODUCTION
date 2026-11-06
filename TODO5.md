## 🎯 Current Objective
بازطراحی رابط انتخاب نوع رویداد در فرم ثبت رویداد؛ جایگزینی پنجره انتخاب رادیویی/native موبایل با فهرست سفارشی، حرفه‌ای، RTL و واکنش‌گرا، با حفظ کامل قواعد دسترسی و گردش‌کار و قرارداد EventTypeID.

Ready for the next feature


### تسک جدید در فاز باز (2026-11-06): بازطراحی انتخاب نوع رویداد

#### تکمیل نقشه فنی این تسک
- شاخه کاری: `feature/event-type-picker-cards-20261106` در هر دو مخزن؛ مبنای Frontend main: `3c1ad10d9b7f0c32f7a53d201e5f05fa6d0cfef9`؛ مبنای Backend main: `881663232a51aa457c5717bfaf956aeca3a11af0`.
- Frontend: `js/modules/events.js`؛ ساخت فیلد انتخاب در `Events.openForm()` و به‌روزرسانی گزینه‌ها در `Events.refreshEventTypeOptions()`؛ بارگذاری قواعد در `Events.loadWorkflowProgress()`؛ نمایش انتظار در `Events.setEventTypeLoadingState()`.
- فیلد مرجع `#event-form-type[name="EventTypeID"]` منبع حقیقت و مقدار ارسالی فرم باقی می‌ماند. تغییر انتخاب باید رویداد `change` همین فیلد را اجرا کند تا amendment mode، فیلد مقدار، فرم‌های متصل و اطلاعات کمکی از مسیر موجود به‌روز شوند.
- گزینه‌ها بر اساس منطق فعلی `available` و `restricted`، قواعد گردش‌کار، پروژه Draft، اتصال PROJECT/INDEPENDENT، ترتیب رویداد و تعداد ثبت تکراری ساخته می‌شوند. ظاهر جدید باید علت محدودیت گزینه‌های غیرفعال را قابل‌فهم نمایش دهد.
- استایل در `css/events.css`؛ نسخه‌گذاری asset در `index.html`؛ تست‌های Node در `tests/*.test.js` و تست مرورگر در صورت وجود harness مناسب.
- Backend: هیچ endpoint، مجوز، Sheet یا schema جدیدی لازم نیست؛ `POST /events` و قرارداد `EventTypeID` بدون تغییر می‌مانند.

#### صف تسک‌های کلان
- [x] **Task 1 — Discovery & Planning:** بررسی مستندات، شاخه‌ها، commitهای اصلی، فیلد انتخاب فعلی، منطق دسترس‌پذیری گزینه‌ها و جریان‌های وابسته.
  - *Log:* در Frontend، آخرین commit مبنا `3c1ad10d9b7f0c32f7a53d201e5f05fa6d0cfef9` و در Backend `881663232a51aa457c5717bfaf956aeca3a11af0` بررسی شد. `TODO5.md` و `ARCHITECTURE.md` هر دو مخزن خوانده شدند. مشخص شد انتخاب فعلی در `Events.openForm()` یک `select#event-form-type` استاندارد است و به همین علت در Android به پنجره native رادیویی تبدیل می‌شود. `Events.refreshEventTypeOptions()` گروه‌های مجاز/محدود، وضعیت گردش‌کار، ترتیب و تکرار را محاسبه می‌کند؛ `Events.loadWorkflowProgress()` داده مرجع را بارگذاری می‌کند و `Events.setEventTypeLoadingState()` وضعیت انتظار را مدیریت می‌کند. رویداد `change` نوع رویداد به فرم‌های متصل، حالت اصلاح، مقدار تولید و پنل اطلاعات کمکی متصل است. شاخه کاری هم‌نام از main در هر دو مخزن ساخته شد. دامنه تغییر Frontend-only است و Backend/API/Sheet/schema تغییر نمی‌کند.
- [ ] **Task 2 — اجرای انتخاب‌گر سفارشی نوع رویداد (IN PROGRESS):** جایگزینی تجربه native/radio با پنل فهرست سفارشی و کارت‌های انتخابی؛ تفکیک بصری گزینه‌های قابل ثبت و محدود، نمایش عنوان و توضیح وضعیت، حالت انتخاب‌شده، RTL، تم روشن/تاریک، موبایل و صفحه‌کلید؛ حفظ select مرجع، مقدار EventTypeID و رویداد change.
- [ ] **Task 3 — تست و کنترل سازگاری:** تست قواعد گزینه‌های مجاز/غیرمجاز، پروژه‌های Draft و Independent، بارگذاری/خطای گردش‌کار و retry، انتخاب قبلی، فرم‌های متصل، ثبت رویداد و رگرسیون‌های موجود؛ آماده‌سازی PR پس از موفقیت CI.
- [ ] **Task 4 — انتشار و پذیرش عملیاتی:** ادغام PR پس از کنترل‌ها، انتشار GitHub Pages و دریافت تأیید تست مالک محصول در موبایل و دسکتاپ.
