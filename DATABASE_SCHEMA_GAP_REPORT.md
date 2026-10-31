# تقرير تحليل الفجوات الهيكلية والتوافق البرمجي لقاعدة البيانات
**المشروع:** منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)  
**المستودع:** `wisssamomran/new-v66`  
**ملف الترحيل التصحيحي المعتمد:** `database/supabase/migrations/dalani_unlinked_systems_sync.sql`  
**التاريخ:** 31 أكتوبر 2026  

---

## 1. تحليل سبب الخطأ الشهير: `ERROR: 42883: operator does not exist: uuid = text`

### التشخيص الجذري:
في نظام Supabase الافتراضي:
- جدول المصادقة الداخلي `auth.users.id` نوعه **`UUID`**.
- الدالة المدمجة `auth.uid()` تُعيد قيمة من نوع **`UUID`**.
- بينما في جدول المستخدمين العام لمنظومة دلنّي `public.users.id`، تم تعريف الحقل كـ **`VARCHAR(128)`** (أو `TEXT`) لاستيعاب معرفات الأنظمة المتعددة مثل (`usr-admin-1`, `usr-seeker-101`).
- جدول المفضلة وسجلات التدقيق تحتوي على أعمدة `user_id` بنوع `VARCHAR(128)`.

عند كتابة سياسات RLS بالشكل التالي:
```sql
-- ❌ خطأ: مقارنة UUID مع TEXT مباشرة تسبب خطأ 42883
CREATE POLICY bad_policy ON public.user_favorites 
USING (user_id = auth.uid());
```
يرفض محرك PostgreSQL تنفيذ الاستعلام ويرمي الخطأ: `ERROR: 42883: operator does not exist: uuid = text`.

### الحل الجذري المعتمد في المنظومة:
تم تصحيح كافة سياسات الأمان RLS في ملف الترحيل `dalani_unlinked_systems_sync.sql` بإجراء تحويل صريح للنوعين على جانبي المقارنة باستخدام `::text`:
```sql
-- ✅ الحل الصحيح المعتمد والخالي من أي خطأ
CREATE POLICY favorites_owner_policy ON public.user_favorites
FOR ALL
USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id::text = user_favorites.user_id::text 
          AND u.supabase_user_id::text = auth.uid()::text
    )
)
WITH CHECK (
    user_id::text = auth.uid()::text OR
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id::text = user_favorites.user_id::text 
          AND u.supabase_user_id::text = auth.uid()::text
    )
);
```

---

## 2. جدول الفروقات والأنواع بين كود الواجهة ومخطط PostgreSQL

| الجدول والعمود | نوع الحقل في PostgreSQL | نوع الحقل في TypeScript | العلاقة والتوافقية الهندسية | الحل المعتمد |
|--------------|------------------------|-------------------------|---------------------------|-------------|
| `users.id` | `VARCHAR(128)` | `string` | المعرف الأساسي في التطبيق (Primary Key) | يتم الحفاظ عليه كما هو لضمان سلامة العلاقات القائمة |
| `users.supabase_user_id` | `VARCHAR(128)` / `UUID` | `string` | يربط مع `auth.users.id` بعد تسجيل الدخول | مفهرس بـ `idx_users_supabase_user_id` للبحث فائق السرعة |
| `user_favorites.user_id` | `VARCHAR(128)` | `string` | Foreign Key يربط مع `public.users(id)` | قيد فريد `UNIQUE(user_id, listing_id)` لمنع التكرار نهائياً |
| `organizations.id` | `VARCHAR(128)` | `string` | المعرف الأساسي للمنشأة | يربط أعضاء المنشأة وعقاراتها |
| `users.org_id` / `organization_id` | `VARCHAR(128)` | `string` | يحدد المنشأة التي ينتمي إليها المستخدم | تم دعم الاسمين في مهايئات `supabaseMappers.ts` تجنباً لأي تعارض |
| `organization_members.organization_id` | `VARCHAR(128)` | `string` | Foreign Key يربط مع `public.organizations(id)` | محمي بسياسة RLS تمنع وصول المدراء من خارج المنشأة |
| `listings.assigned_agent_id` | `VARCHAR(128)` | `string` | معرف الموظف المسند إليه العقار | موجود بالفعل في `listings` دون الحاجة لإنشاء أعمدة مكررة |
| `listings.assigned_agent_name` | `VARCHAR(255)` | `string` | اسم الموظف المسند إليه العقار | يضمن سرعة العرض دون الحاجة لـ JOIN إضافي |
| `staff_members.role` | `VARCHAR(64)` | `string` | دور موظف الإدارة والرقابة | مقيد بـ `CHECK (role IN ('system_admin', 'moderator', 'support', 'legal_auditor', 'financial_auditor'))` |
| `audit_logs.user_id` | `VARCHAR(128)` | `string` | معرف منفذ العملية في النظام | غير قابل للتعديل أو الحذف بفضل التريغر `trg_audit_log_immutable` |
| `system_settings.key` | `VARCHAR(128)` | `string` | مفتاح الإعداد (Primary Key) | يتم تخزين الإعدادات بصيغة JSONB آمنة محصورة بمدير النظام |

---

## 3. التحقق من سلامة القيود والفهارس (Constraints & Indexes)

1. **قيد المفضلة الفريد:**
   - تم التحقق من وجود `CONSTRAINT uq_user_listing_favorite UNIQUE (user_id, listing_id)`.
   - يمنع هذا القيد إمكانية إضافة العقار نفسه إلى مفضلة المستخدم أكثر من مرة على مستوى محرك قاعدة البيانات، حتى لو تم الضغط على الزر عدة مرات متزامنة.
2. **فهارس تسريع الاستعلامات:**
   - `idx_favorites_user` على `user_favorites(user_id)`
   - `idx_favorites_listing` على `user_favorites(listing_id)`
   - `idx_org_members_org` على `organization_members(organization_id)`
   - `idx_org_members_user` على `organization_members(user_id)`
   - `idx_staff_user` على `staff_members(user_id)`
   - `idx_audit_logs_user` على `audit_logs(user_id)`
   - `idx_audit_logs_created` على `audit_logs(created_at DESC)`
3. **قيد منع الحجز المتزامن على العقارات:**
   - `idx_single_active_booking_per_listing` لمنع وجود أكثر من حجز فعال واحد لنفس العقار بالتوازي لضمان الحصرية المطلقة لمدى 48 ساعة.
