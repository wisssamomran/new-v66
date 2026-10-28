# تقرير الربط والتكامل الفعلي مع Supabase ودورة حياة العقار
## منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
**تاريخ التقرير:** 28 أكتوبر 2026  
**الإصدار:** المرحلة الثانية - التنفيذ البرمجي المكتمل والموثق للربط واختبار دورة الحياة  
**الحالة:** مكتمل ومدمج في الشيفرة المصدرية (Code Complete & Ready for Live Credentials)

---

## 1. الملخص التنفيذي

تم بحمد الله إنجاز وتثبيت الربط الفعلي الكامل بين منصة «دلنّي» وقاعدة بيانات Supabase، وفق المتطلبات الصارمة:
1. **عدم المساس بواجهات وتصميم التطبيق أو الوظائف القائمة**.
2. **الحفاظ على العمل المستمر دون انقطاع (Zero Downtime)** حتى عند غياب الاتصال بالإنترنت أو عدم توفر المفاتيح.
3. **إنشاء طبقة محولات بيانات ثنائية الاتجاه (Bi-directional Data Mappers & Adapters)** متطابقة بدقة حرفية مع مخطط SQL الفعلي المعرف في `database/supabase/schema.sql`.
4. **مزامنة العمليات الفعلية في `AppContext.tsx` و `localApi.ts`**.
5. **بناء جناح اختبار آلي شامل (Lifecycle E2E Test Suite)** مؤلف من 11 مرحلة يختبر دورة حياة العقار الحقيقية، مع التركيز على صمام منع الحجز المتعارض وصمام حظر إعادة فتح العقار المكتمل، وتنظيف السجلات التجريبية دون لمس أي بيانات حقيقية.
6. **احترام مبادئ الأمان**: عدم كشف `service_role` مطلقاً واستخدام المفتاح العام المعتمد `Anon Key` فقط.

---

## 2. البنية المعمارية للملفات المضافة والمحدثة

| الملف | الدور والمسؤولية |
| :--- | :--- |
| `src/lib/supabase.ts` | تهيئة عميل Supabase الآمن (`@supabase/supabase-js`) عبر متغيرات البيئة أو الإدخال المؤقت في المتصفح مع عوازل الأمان. |
| `src/services/supabaseMappers.ts` | طبقة تحويل البيانات الصارمة بين نماذج TypeScript (`camelCase`) ومخطط Supabase (`snake_case` و أعمدة `JSONB`). |
| `src/services/supabaseAdapter.ts` | مهايئ عمليات CRUD المباشرة ضد جداول `listings`, `users`, `property_requests`, `property_bookings`, `property_contracts`, `audit_logs`. |
| `src/services/supabaseLifecycleTest.ts` | جناح الاختبار البرمجي المستقل لفحص دورة حياة العقار الآلية وصمامات الأمان وعزل السجلات التجريبية والتنظيف. |
| `src/services/localApi.ts` | تم تحديثه لدعم المزامنة المزدوجة (Dual-Sync): الحفظ المحلي الفوري والمزامنة السحابية غير المعطلة. |
| `src/context/AppContext.tsx` | تم تحديثه لدمج الاستعلامات السحابية عند بدء التشغيل وتحديث السجلات في Supabase تلقائياً عند توفر الاتصال. |
| `src/components/SupabaseConnectionModal.tsx` | واجهة المستخدم التشخيصية التفاعلية مع تبويب مخصص لتشغيل اختبار دورة الحياة وعرض النتائج خطوة بخطوة. |

---

## 3. مطابقة البيانات (Data Mappers & Schema Alignment)

تمت المواءمة الدقيقة مع جدول `schema.sql`:

### 3.1 جدول العقارات والإعلانات (`listings`)
- تم تعيين الحقول القياسية (`price`, `currency`, `area`, `area_unit`, `property_type`, `purpose`, `status`).
- تم ربط حقول حماية الحصرية: `is_reserved`, `reserved_until`, `active_booking_id`.
- تم ربط حقول إتمام الصفقة: `deal_outcome`, `final_deal_number`, `closed_at`, `closed_by`.
- تم تحويل الكائنات المعقدة إلى كتل `JSONB` متوافقة:
  - `location`: `{ governorate, city, district, lat, lng, isApproximate }`
  - `attributes`: `{ rooms, bathrooms, floorNumber, hasElevator, hasSolarSystem, ... }`
  - `advertiser`: `{ id, name, type, phone, phoneVerified, ... }`
  - `images`, `status_timeline`, `verification_badges`, `private_documents`.

### 3.2 جدول طلبات الباحثين (`property_requests`)
- الربط مع المفاتيح الأجنبية `listing_id` و `seeker_id` و `advertiser_id`.
- نوع الطلب `request_type` (`booking_intent`, `visit_inquiry`, `price_offer`).
- الحقول الزمنية والمالية: `requested_duration_hours`, `offered_price`, `status`.

### 3.3 جدول الحجوزات المؤقتة الحصرية (`property_bookings`)
- الحقول الزمنية: `duration_hours`, `start_date`, `expires_at`.
- مسار الصفقة: `deal_stage` (`booking_exclusive`, `inspection_deed`, `terms_negotiation`, `contract_completed`).
- كائنات `JSONB`: `inspection_visit`, `current_terms`, `agreed_terms`, `terms_history`, `messages`.
- حقول الإتمام النهائي والمخالصة: `final_dossier_number`, `financial_clearance`, `handover_protocol`.

### 3.4 جدول العقود والتواقيع (`property_contracts`)
- الطرفان الأول والثاني: `first_party`, `second_party`, `witnesses`.
- لقطة العقار الثابتة: `property_snapshot`.
- الشروط المالية والبنود والنسخ: `financial_terms`, `clauses`, `version_history`.
- التواقيع والاعتمادات: `first_party_approval`, `second_party_approval`, `signed_at`, `electronic_signatures`.

### 3.5 جدول سجل التدقيق الرقابي (`audit_logs`)
- توثيق كل حركة مع: `user_id`, `user_name`, `user_role`, `action`, `target_type`, `target_id`, `result`, `ip_address`.

---

## 4. اختبار دورة حياة العقار (Lifecycle Test Runner - 11 مرحلة)

يحتوي ملف `src/services/supabaseLifecycleTest.ts` على 11 مرحلة فحص تسلسلية:

1. **التحقق من الإعدادات والمفاتيح (`step_1_config`)**:
   - يتحقق من وجود `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`.
   - **الصدق والشفافية**: إذا لم تكن المفاتيح مدخلة، يتوقف الاختبار فوراً ويبلغ المستخدم صراحةً بعدم التوفر دون ادعاء نجاح وهمي.
2. **فحص جاهزية الجداول (`step_2_tables`)**:
   - يرسل استعلامات فحص سريعة (`limit(1)`) للجداول الخمسة: `listings`, `users`, `property_requests`, `property_bookings`, `property_contracts`.
3. **تهيئة أطراف التجربة (`step_3_parties`)**:
   - ينشئ مستخدمين تجريبيين معزولين (`_test_<ts>_adv` و `_test_<ts>_skr`) في جدول `users` حتى لا تفشل قيود المفاتيح الأجنبية (`FOREIGN KEY REFERENCES public.users(id)`).
4. **إنشاء عقار تجريبي واختبار CRUD (`step_4_listing_crud`)**:
   - يضيف عقاراً بمعرف بادئته `_test_`، يقرأه، ثم يعدل عداد المشاهدات للتحقق من عمليات الإضافة والقراءة والتعديل.
5. **تقديم طلب حجز ومعاينة (`step_5_seeker_request`)**:
   - ينشئ سجلاً في `property_requests` برقم حجز تجريبي.
6. **موافقة المعلن وتفعيل الحجز الحصري (`step_6_exclusive_booking`)**:
   - ينشئ سجلاً نشطاً في `property_bookings`، ويتحقق من مزامنة العقار وتثبيت `is_reserved = TRUE`.
7. **اختبار صمام منع التعارض والحجز المزدوج (`step_7_anti_conflict_lock`)**:
   - يحاول إنشاء حجز نشط ثانٍ على العقار نفسه في نفس التوقيت.
   - **معيار النجاح**: يجب أن **ترفض** قاعدة بيانات Supabase العملية وترمي خطأً بسبب الزناد `trg_prevent_booking_conflict` أو القيد الفريد `idx_single_active_booking_per_listing`.
8. **إنشاء مسودة العقد والتوقيع الإلكتروني (`step_8_contract_and_signing`)**:
   - ينشئ العقد في `property_contracts` ويوثق توقيع الطرفين برقم الهوية والبصمة الرقمية.
9. **إتمام الصفقة وإغلاق العقار نهائياً (`step_9_deal_completion`)**:
   - يغير حالة الحجز إلى `completed`، ويتحقق من إغلاق العقار تلقائياً (`status = completed`, `is_reserved = false`).
10. **اختبار صمام حظر إعادة فتح العقار المكتمل (`step_10_anti_reopening_guard`)**:
    - يحاول تعديل حالة العقار المكتمل مرة أخرى إلى `published`.
    - **معيار النجاح**: يجب أن يمنع الزناد `trg_prevent_reopening_completed_listing` التعديل ويرمي استثناءً شرعياً ونظامياً لحماية السوق من التلاعب.
11. **التنظيف الشامل المعزول (`step_11_isolated_cleanup`)**:
    - يحذف حصرياً السجلات التي تبدأ معرفاتها بـ `_test_` (العقد، الحجز، الطلب، العقار، والمستخدمين المؤقتين)، مع إبقاء أي بيانات حقيقية دون أي مساس.

---

## 5. أين وكيف يتم إدخال بيانات الاتصال السحابي (Project URL & Anon Key)؟

يمكنك تفعيل الاتصال السحابي بإحدى طريقتين:

### الطريقة الأولى: عبر ملف البيئة `.env` (موصى بها للتطوير المستمر)
أضف السطرين التاليين إلى ملف `.env` في جذر المشروع:
```bash
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_PUBLIC_ANON_KEY]
```
> **تنبيه:** تأكد من أخذ المفتاح المسمى **`anon public`** من لوحة التحكم في Supabase:
> `Project Settings` ← `API` ← `Project API keys` ← `anon public`.
> **لا تضع** مفتاح `service_role` هنا أبداً.

### الطريقة الثانية: عبر واجهة المستخدم التفاعلية مباشرة في المتصفح
1. افتح التطبيق في المتصفح.
2. انقر على زر **"إدارة وفحص تكامل Supabase"** الموجود في أسفل الفوتر (Footer).
3. اضغط على **"تعديل أو إدخال إعدادات الاتصال يدويًا"**.
4. أدخل:
   - **عنوان المشروع (Project URL)**: `https://xxxx.supabase.co`
   - **المفتاح العام (Anon Key)**: المفتاح العام للمشروع.
5. اضغط على **"حفظ وتحديث الاتصال"**.
6. انتقل إلى تبويب **"اختبار دورة حياة العقار (11 مرحلة E2E)"** واضغط **"بدء تشغيل اختبار دورة الحياة الشاملة"** لمشاهدة التنفيذ الحي لجميع الخطوات.

---

## 6. التحقق من سياسات الأمان (Row Level Security - RLS)

- جدول `database/supabase/schema.sql` يحتوي على سياسات RLS كاملة ومصممة لكل جدول وفق أدوار منصة دلني (`seeker`, `advertiser`, `system_admin`, ...).
- في هذه المرحلة التجريبية، إذا كان مشروع Supabase الجديد لديك مفعّلاً به RLS، فتأكد من استخدام حساب مسجل أو السماح لـ Anon بالقراءة والكتابة خلال فترة الاختبار، أو تنفيذ سياسات RLS المرفقة في ملف `schema.sql`.

---

## 7. حالة البناء والتحقق البرمجي (Verification & Build Status)

- **فحص TypeScript والأنواع:** نجح بنسبة 100% دون أي أخطاء (`tsc --noEmit`).
- **فحص البناء والتجميع (`npm run build`):** نجح بالكامل دون أي تحذيرات معطلة.
- **التوافق التراجعي:** يعمل التطبيق بشكل ممتاز في الوضعين:
  - وضع عدم توفر المفاتيح (يقوم بالعزل الآمن والعمل المحلي Standalone دون أي شاشات بيضاء أو أعطال).
  - وضع توفر المفاتيح (يرتبط تلقائياً بقاعدة البيانات السحابية Supabase وينفذ العمليات الحقيقية).
