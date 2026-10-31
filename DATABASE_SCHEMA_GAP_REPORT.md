# تقرير تحليل الفجوات الهيكلية والمخطط الفعلي لقاعدة بيانات Supabase
**المشروع:** منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)  
**المستودع:** `wisssamomran/new-v66`  
**الفرع:** `integration/supabase-completion`  
**ملف الترحيل التصحيحي المعتمد:** `database/supabase/migrations/dalani_unlinked_systems_sync.sql`  
**التاريخ:** 31 أكتوبر 2026  

---

## 1. الفحص الفعلي لمخطط قاعدة البيانات الحية (Schema Reality Check)

تم فحص جداول وأعمدة قاعدة البيانات الحية في Supabase عبر استعلام `information_schema.columns` مباشرة، وجاءت النتائج الهندسية الدقيقة كالتالي:

### 1.1 جدول المستخدمين (`public.users`)
- **الأعمدة الفعلية:** `id` (VARCHAR), `name` (VARCHAR), `role` (VARCHAR), `email` (VARCHAR), `phone` (VARCHAR), `org_id` (VARCHAR), `org_name` (VARCHAR), `active_status` (BOOLEAN), `supabase_user_id` (UUID).
- **الفجوة المكتشفة والمعالجة:**  
  الجدول يحتوي تاريخياً على `org_id` وليس `organization_id`. أي استعلام RLS يعتمد فقط على `organization_id` كان يفشل فورياً.  
  **الحل المنفذ:** تم تحديث سياسات RLS ومهايئات السيرفر لتدعم `COALESCE(u.organization_id, u.org_id)`، مع إضافة أمر المزامنة الآمن:
  ```sql
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id VARCHAR(128);
  UPDATE public.users SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
  ```

### 1.2 جدول المنشآت العقارية (`public.organizations`)
- **الأعمدة الفعلية:** `id`, `name`, `license_number`, `owner_id`, `city`, `governorate`, `verification_status`, `commercial_reg_no`, `phone`, `manager_name`, `address`, `logo_url`, `is_verified`, `verified_at`, `members`.
- **الفجوة المكتشفة والمعالجة:**  
  الجدول لا يحتوي على عمود اسمه `org_type`. تم ضبط كافة عمليات الإدراج والاستعلام لعدم تمرير `org_type` والاعتماد على الأعمدة الحقيقية.

### 1.3 جدول أعضاء المنشآت (`public.organization_members`)
- **الأعمدة الفعلية:** `id`, `organization_id` (VARCHAR), `user_id` (VARCHAR), `member_name`, `member_phone`, `role_in_org`, `is_active` (BOOLEAN), `assigned_listing_count` (INTEGER), `created_at`, `updated_at`.
- **العلاقة:** ترتبط بـ `public.organizations(id)` و`public.users(id)`.

### 1.4 جدول مفضلة المستخدمين (`public.user_favorites`)
- **الأعمدة الفعلية:** `id` (VARCHAR), `user_id` (VARCHAR), `listing_id` (VARCHAR), `created_at` (TIMESTAMPTZ).
- **القيد الفريد المعتمد:** `CONSTRAINT uq_user_listing_favorite UNIQUE (user_id, listing_id)`.
- تم التحقق من عمل القيد برفض التكرار بالكود `23505`.

### 1.5 جدول حظر الـ IP والأمان (`public.ip_blocks`)
- **الأعمدة الفعلية:** `id`, `ip_address` (VARCHAR), `reason` (TEXT), `blocked_by` (VARCHAR), `blocked_at` (TIMESTAMPTZ), `is_active` (BOOLEAN).
- **الفجوة المكتشفة والمعالجة:**  
  العمود في قاعدة البيانات هو `ip_address` وليس `ip`. تم تحديث وحدة السيرفر `src/server/supabaseServer.ts` ومسارات API لتوحيد التعامل مع `ip_address` حصراً.

### 1.6 جدول سجل التدقيق الإداري (`public.audit_logs`)
- **الأعمدة الفعلية:** `id`, `user_id`, `user_name`, `user_role`, `action`, `category`, `target_id`, `target_type`, `result`, `status`, `details`, `ip_address`, `created_at`.
- **الحماية:** محمي بالمشغل السحابي المانع للتعديل أو الحذف: `"Audit logs are append-only. Modification is prohibited."`.

---

## 2. التحليل الجذري لخطأ `ERROR: 42883: operator does not exist: uuid = text`

### التشخيص التقني:
1. في Supabase Auth: القيمة المعادة من `auth.uid()` هي من نوع `UUID`.
2. في مخطط منصة دلنّي: عمود `public.users.id` هو من نوع `VARCHAR(128)` ليتسع لمعرفات النظام، بينما `public.users.supabase_user_id` هو من نوع `UUID`.
3. أعمدة `user_favorites.user_id` و`audit_logs.user_id` هي من نوع `VARCHAR(128)`.
4. عند إجراء مقارنة مباشرة:
   ```sql
   -- ❌ يسبب خطأ 42883 فورياً
   WHERE user_id = auth.uid()
   ```
   يفشل محرك PostgreSQL لأنه لا يوجد عامل مقارنة مساواة افتراضي بين `uuid` و`text` أو `character varying`.

### الحل الصحيح المطبق في `dalani_unlinked_systems_sync.sql`:
تحويل صريح آمن للطرفين باستخدام `::text`:
```sql
-- ✅ مقارنة آمنة وخالية من أي خطأ
WHERE user_id::text = auth.uid()::text OR
EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id::text = user_favorites.user_id::text 
      AND (u.supabase_user_id::text = auth.uid()::text OR u.id::text = auth.uid()::text)
)
```

---

## 3. مصفوفة التوافقية الهندسية النهائية

| الجدول | العمود المعتمد في DB | النوع في DB | التوافق البرمجي في TypeScript | حالة التحقق الميداني |
|-------|--------------------|------------|-----------------------------|-------------------|
| `users` | `id` | `VARCHAR(128)` | `string` | ✅ مطابق ومفحوص |
| `users` | `supabase_user_id` | `UUID` | `string` (UUID format) | ✅ مطابق ومفحوص |
| `users` | `org_id` / `organization_id` | `VARCHAR(128)` | `string` | ✅ متزامن عبر `COALESCE` |
| `user_favorites` | `user_id` | `VARCHAR(128)` | `string` | ✅ مفحوص مع قيد التكرار |
| `organization_members` | `organization_id` | `VARCHAR(128)` | `string` | ✅ مفحوص مع عزل تام للمنشأة |
| `ip_blocks` | `ip_address` | `VARCHAR(64)` | `string` | ✅ مفحوص مع كاش وسيط السيرفر |
| `audit_logs` | `id` | `VARCHAR(128)` | `string` | ✅ مفحوص مع حصانة ضد التعديل |
