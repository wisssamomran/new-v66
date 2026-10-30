# 08. خريطة وتصنيف طبقة البيانات وقواعد البيانات (DATABASE MAPPING & STORAGE AUDIT)
## منصة «دلنّي» العقارية الوطنية الذكية (DALANI)

---

### 1. نظرة عامة على استراتيجية البيانات
تعتمد منصة «دلنّي» بنية تخزين هجينة ذكية تجمع بين:
* **قاعدة بيانات Supabase (PostgreSQL) السحابية الحية:** لمعالجة العمليات الحرجة والحجوزات المتزامنة والعقود وصمام منع التعارض.
* **طبقة الذاكرة والتخزين المحلي المتزامن (In-Memory + SessionStorage):** لضمان سرعة الاستجابة الخاطفة في بيئات الإنترنت المتقطع باليمن وتفادي تعليق المستخدمين.
* **مهايئات التحويل المزدوجة (`supabaseMappers.ts`):** لتوحيد تسميات الحقول بين معيار قاعدة البيانات (`snake_case`) ومعيار كود الواجهات البرمجية لـ TypeScript (`camelCase`).

---

### 2. التصنيف الرباعي لبيانات المنظومة

```
┌────────────────────────────────────────────────────────────────────────┐
│                        تصنيف طبقة البيانات في المنظومة                 │
├────────────────────┬────────────────────┬──────────────────────────────┤
│  الفئة 1: حية في   │  الفئة 2: هجينة    │  الفئة 3: محلية/محاكاة       │
│     Supabase       │  (مزامنة جزئية)   │  (Mock / Local Store)        │
│ • listings         │ • active sessions  │ • audit_logs (ذاكرة)         │
│ • property_bookings│ • settings / flags │ • staff_members              │
│ • property_requests│ • deal_messages    │ • threat_monitor             │
│ • property_contracts                    │ • backup_snapshots           │
└─────────────────────────────────────────┴──────────────────────────────┘
```

---

#### الفئة الأولى: الجداول والبيانات الحية المرتبطة فعلياً بـ Supabase
هذه الجداول حقيقية، تُرسل إليها وتُقرأ منها البيانات مباشرة عبر `supabaseAdapter.ts` و `supabaseClientService.ts`:

1. **جدول العقارات والإعلانات (`listings`):**
   * *الأعمدة الحية في قاعدة البيانات:* `id`, `listing_number`, `title`, `description`, `property_type`, `purpose`, `status`, `price`, `currency`, `is_negotiable`, `area`, `area_unit`, `location` (JSONB), `attributes` (JSONB), `images` (Array), `advertiser` (JSONB), `verification_badges` (JSONB), `status_timeline` (JSONB), `views_count`, `favorites_count`, `is_reserved`, `active_booking_id`, `created_at`, `updated_at`.
   * *العمليات الحية:* القراءة الحية، الإدراج عند النشر (`createListing`)، التعديل، وقفل الحجز الحصري.
2. **جدول الحجوزات العقارية (`property_bookings`):**
   * *الأعمدة الحية:* `id`, `booking_number`, `request_id`, `listing_id`, `listing_title`, `listing_price`, `listing_currency`, `seeker_id`, `seeker_name`, `seeker_phone`, `advertiser_id`, `status`, `duration_hours`, `start_date`, `expires_at`, `deal_stage`, `agreed_terms` (JSONB), `inspection_visit` (JSONB), `financial_clearance` (JSONB), `handover_protocol` (JSONB), `created_at`.
   * *العمليات الحية:* تفعيل قفل منع التعارض، مد ساعات الحجز، تسجيل المعاينة الميدانية، والمخالصة المالية.
3. **جدول طلبات العقار (`property_requests`):**
   * *الأعمدة الحية:* `id`, `request_number`, `listing_id`, `seeker_id`, `seeker_name`, `seeker_phone`, `advertiser_id`, `request_type`, `status`, `notes`, `offered_price`, `requested_duration_hours`, `created_at`.
   * *العمليات الحية:* تقديم طلب جديد، قبول الطلب وتحويله لحجز، أو رفضه.
4. **جدول العقود العقارية الموحدة (`property_contracts`):**
   * *الأعمدة الحية:* `id`, `contract_number`, `booking_id`, `listing_id`, `contract_type`, `status`, `property_snapshot` (JSONB), `first_party` (JSONB), `second_party` (JSONB), `financial_terms` (JSONB), `clauses` (JSONB), `current_version`, `version_history` (JSONB), `first_party_approval`, `second_party_approval`, `approved_at`, `signed_at`, `electronic_signatures` (JSONB).
   * *العمليات الحية:* توليد العقد، تعديل المسودة، اعتماد الأطراف، التوقيع الرقمي، وفك قيد المراجعة.

---

#### الفئة الثانية: البيانات الهجينة (تزامن جزئي بين السيرفر والتخزين المحلي)
بيانات يتم قراءتها وتحديثها في الذاكرة مع إرسال تحديث تفاؤلي للسيرفر، مع الرجوع للتخزين المحلي في حال غياب الاتصال:

1. **رسائل ومحادثات صالة الصفقة (`deal_messages`):**
   * تُخزن داخل كائن الحجز في Supabase وتُحدّث فورياً في الذاكرة لتوفير تجربة مراسلة فائقة السرعة بدون أي تأخير للمستخدم.
2. **العقارات المفضلة (`favorites`):**
   * تُحفظ في `localStorage` للمتصفح الحالي، وتُدمج مع مصفوفة تفضيلات الحساب عند تسجيل الدخول.
3. **معايير وحالة البحث (`dalani_search_params` و `dalani_current_view`):**
   * تُحفظ في `sessionStorage` لمنع إعادة تحميل الصفحة أو فقدان المستخدم للفلتر عند التنقل.

---

#### الفئة الثالثة: البيانات المحلية / المحاكاة (Mock / Local Store)
بيانات تشغيلية تخدم واجهات المحاكاة والإدارة المحلية وتُدار عبر `src/data/yemenData.ts` و `localDatabase.ts`:

1. **سجل التدقيق الجنائي الداخلي (`audit_logs`):**
   * يُنشأ ويزاد محلياً في مصفوفة الذاكرة عند كل إجراء إداري، مع إمكانية التصدير، بانتظار ربط جدول `audit_logs` السحابي بالكامل.
2. **سجل مراقبة التهديدات والجلسات النشطة (`active_sessions` و `security_threats`):**
   * بيانات استرشادية حية توضح آلية طرد الجلسات المشبوهة وحظر عناوين الـ IP في لوحة الإدارة.
3. **نقاط النسخ الاحتياطي (`backup_snapshots`):**
   * توليد محلي لنقاط النسخ وحساب بصمة التشفير `SHA-256 Checksum` في الذاكرة.
4. **كادر الموظفين والصلاحيات المخصصة (`staff_members`):**
   * مُعرفة في بيانات التأسيس مع إمكانية تعديل صلاحيات الموظف حياً في سياق الجلسة.

---

#### الفئة الرابعة: الحقول غير المكتملة أو التجميلية في الواجهة (Incomplete / Pure UI)
عناصر تظهر في واجهة المستخدم لإعطاء تجربة مكتملة الأركان ولكنها لا تؤثر بشكل دائم في قاعدة البيانات السحابية:

1. **الشهود الميدانيون في نافذة العقد (`witnesses`):**
   * توجد حقول لإدخال بيانات الشاهدين في واجهة محرر العقد، ويتم حفظها داخل مصفوفة بنود العقد الحالية في الذاكرة، ولكن لم يُخصص لها جدول علائقي مستقل للأمناء الشرعيين.
2. **رابط إثبات السداد المالي (`evidenceUrl`):**
   * حقل رابط الصورة في بطاقة المخالصة المالية يقبل الروابط النصية، ولم يتم ربطه بعد بدلو تخزين سحابي مباشر (Supabase Storage Bucket) لرفع الملفات عبر الهاتف.
3. **اختيار الشارع الدقيق في معالج الإضافة:**
   * يتم تخزين اسم الشارع كنص عام داخل كائن `location.street` دون الربط بقاعدة بيانات جغرافية رسمية للبلديات اليمنية.
