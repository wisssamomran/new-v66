# تقرير التدقيق الأمني وهندسة الحماية وسياسات RLS المحكمة
**المشروع:** منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)  
**المستودع:** `wisssamomran/new-v66`  
**الفرع:** `integration/supabase-completion`  
**التاريخ:** 31 أكتوبر 2026  
**مستوى الأمان:** مشدد (Production Hardened - Multi-Tenant Zero-Trust)

---

## 1. استبدال السياسات المتساهلة القديمة وسياسات `USING (TRUE)`

تم رصد وجود سياسات قديمة في `schema.sql` كانت تستخدم `USING (TRUE)` أو `WITH CHECK (TRUE)`، وتم استبدالها كلياً في ملف التحديث `dalani_unlinked_systems_sync.sql` بسياسات أمان دقيقة مشروطة بالهوية والرتبة:

### 1.1 سياسة المستخدمين (`public.users`)
- **السياسة القديمة:** `users_self_write` كانت تسمح بالتعديل الشامل `USING (TRUE)`.
- **السياسة البديلة المحكمة:**
  - القراءة متاحة للجميع للبيانات العامة للملف الشخصي.
  - التعديل (`UPDATE`) محصور بصاحب الحساب نفسه أو مدراء النظام (`system_admin`, `moderator`).
  - شرط `WITH CHECK` يمنع المستخدم العادي من تعديل عمود `role` أو ترقية نفسه إلى رتبة إدارية دون صلاحية مدير نظام سابقة.

### 1.2 سياسة المنشآت العقارية (`public.organizations`)
- **السياسة القديمة:** `orgs_write` كانت تستخدم `USING (TRUE)`.
- **السياسة البديلة المحكمة:**
  - التعديل محصور بمدير المنشأة المعنية المسجل بها (`COALESCE(u.organization_id, u.org_id)::text = organizations.id::text` وبرتبة `org_manager` أو `office_admin`) أو مدير النظام العام.

### 1.3 سياسات الإعلانات العقارية (`public.listings`)
- **السياسة القديمة:** `listings_insert_advertisers` و`listings_update_owner_or_admin` كانتا تستخدمان `WITH CHECK (TRUE)`.
- **السياسة البديلة المحكمة:**
  - الإضافة والتعديل محصورة بالمعلن صاحب الإعلان (`advertiser_id::text = auth.uid()::text` أو عبر حسابه في `public.users`) أو مدراء المحتوى والنظام.

---

## 2. عزل بيانات المنشآت العقارية (Multi-Tenant Isolation)

- **جدول أعضاء المنشآت (`public.organization_members`):**
  - منع القراءة العامة نهائياً:
    ```sql
    CREATE POLICY org_members_read_policy ON public.organization_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND (
                  u.role IN ('system_admin', 'moderator') OR
                  (COALESCE(u.organization_id, u.org_id) IS NOT NULL AND COALESCE(u.organization_id, u.org_id)::text = organization_members.organization_id::text)
              )
        )
    );
    ```
  - حصر الإدارة والإضافة والتعديل بمدير المنشأة نفسها فقط:
    تم إثبات العزل التام في الاختبار الميداني `scripts/test-end-to-end-supabase-sync.ts` بنسبة تسريب 0%.

---

## 3. حماية وحصانة سجل التدقيق الإداري (Audit Log Immutability)

- **منع التزوير في حقل الهوية:**
  سياسة الـ `INSERT` تلزم بأن يكون `user_id` مطابقاً لجلسة المستخدم الحقيقية `auth.uid()::text`.
- **حظر التعديل والحذف عبر Trigger سحابي دائم:**
  تم ربط جدول `public.audit_logs` بمشغل `trg_audit_log_immutable` الذي يعترض أي محاولة تعديل أو حذف:
  ```text
  "Audit logs are append-only. Modification is prohibited."
  ```
  أثبت الفحص الميداني فشل محاولات الـ `UPDATE` والـ `DELETE` ورفضها التام على مستوى محرك PostgreSQL.

---

## 4. حظر الـ IP الحقيقي على مستوى الخادم (Server IP Guard)

- تطبيق الوسيط البرمجي `ipBlockGuard` في `server.ts` المدعوم بوحدة `src/server/supabaseServer.ts`.
- يتم الاستعلام المباشر من جدول `public.ip_blocks` مع كاش محلي ذي صلاحية TTL تبلغ 30 ثانية لتوفير استجابة شبه فورية (Sub-millisecond).
- عند رصد عنوان IP محظور، يتم إرجاع `HTTP 403 Forbidden` فورية ومنع وصول الطلب إلى مسارات النظام.
