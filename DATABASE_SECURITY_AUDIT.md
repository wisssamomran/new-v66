# تقرير التدقيق الأمني وهندسة الحماية وسياسات RLS
**المشروع:** منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)  
**المستودع:** `wisssamomran/new-v66`  
**التاريخ:** 31 أكتوبر 2026  
**مستوى الأمان:** مرتفع جداً (Enterprise Grade Security & Multi-Tenant Isolation)

---

## 1. تدقيق سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)

تمت مراجعة كافة سياسات RLS في قاعدة البيانات والتأكد من عدم وجود أي ثغرات أو سياسات متساهلة (`USING(TRUE)` أو `WITH CHECK(TRUE)`):

### 1.1 عزل مفضلة المستخدمين (`public.user_favorites`)
- **سياسة القراءة والكتابة:** محصورة تماماً بالمستخدم صاحب الحساب:
  ```sql
  user_id::text = auth.uid()::text OR
  EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id::text = user_favorites.user_id::text 
        AND u.supabase_user_id::text = auth.uid()::text
  )
  ```
- **النتيجة:** يستحيل على أي مستخدم الاطلاع على مفضلة مستخدم آخر، أو إضافة عقارات إلى مفضلة غيره.

### 1.2 عزل بيانات المنشآت العقارية (Multi-Tenant Isolation)
- **جدول الأعضاء (`public.organization_members`):**
  - تم إلغاء أي سياسة تسمح بالقراءة العامة.
  - لا يمكن لمدير المنشأة (أ) الاطلاع على موظفي أو مسوقي المنشأة (ب).
  - لا يمكن لمدير المنشأة (أ) إضافة موظف أو تعديل صلاحياته إلا داخل منشأته المسجل بها في حقل `organization_id`.
- **التحقق من الصلاحيات:**
  ```sql
  EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
        AND u.role IN ('system_admin', 'org_manager', 'organization_manager')
        AND (u.organization_id IS NOT NULL AND u.organization_id::text = organization_members.organization_id::text)
  )
  ```

### 1.3 حماية موظفي النظام وحظر الـ IP وإعدادات المنظومة
- الجداول: `public.staff_members` و `public.ip_blocks` و `public.system_settings`.
- محصورة كلياً برتبة `system_admin` و `moderator`.
- يمنع أي مستخدم عادي (باحث، معلن فرد، موظف منشأة) من قراءة إعدادات النظام الحساسة أو تعديل قائمة الموظفين.

---

## 2. منع تصعيد الصلاحيات (Privilege Escalation Prevention)

1. **إغلاق ثغرة تبديل الأدوار في السيرفر:**  
   في مسار `/api/auth/switch-role` في `server.ts`، تم تطبيق حماية صارمة تشترط:
   - أن يكون المستخدم الحالي مسجلاً برتبة `system_admin` حصراً.
   - التحقق من ترويسة الجلسة الموثقة وعدم السماح للواجهة بتمرير رتبة إدارية دون مصادقة.
2. **منع التعديل المباشر على عمود `role` في قاعدة البيانات:**  
   سياسات التعديل تمنع المستخدم العادي من تعديل عمود `role` أو ترقية حسابه إلى رتبة إدارية.

---

## 3. حماية سجل التدقيق الإداري من التلاعب (Audit Log Immutability)

لضمان سلامة الحوكمة والامتثال القانوني:
1. **منع التزوير في حقل الهوية:**  
   سياسة الـ `INSERT` تلزم بأن يكون `user_id` مطابقاً لـ `auth.uid()::text`، مما يمنع انتحال شخصية مستخدم آخر أثناء تسجيل العمليات.
2. **قفل التعديل والحذف عبر Trigger:**  
   تم ربط جدول `public.audit_logs` بالمشغل `trg_audit_log_immutable`:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
   RETURNS TRIGGER AS $$
   BEGIN
       RAISE EXCEPTION 'سجل التدقيق غير قابل للتعديل أو الحذف لحفظ سلامة الحوكمة والأمان.';
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_audit_log_immutable
   BEFORE UPDATE OR DELETE ON public.audit_logs
   FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();
   ```
   **الأثر الأمني:** لا يمكن لأي مستخدم أو موظف تعديل أي سجل تدقيق سابق أو حذفه حتى لو كان يمتلك صلاحيات مدير نظام.

---

## 4. تطبيق حظر الـ IP الحقيقي على مستوى الخادم (Real Server IP Blocking)

في ملف `server.ts`:
1. تم تفعيل خيار `app.set('trust proxy', 1)` لضمان القراءة الدقيقة لعنوان الـ IP الحقيقي للعميل حتى خلف خوادم البروكسي وCloudflare.
2. تم بناء الوسيط البرمجي `ipBlockGuard` الذي يستعلم فورياً عن عنوان الـ IP في جدول `public.ip_blocks` (مع كاش محلي فائق السرعة).
3. في حال وجود حظر نشط، يتم إرجاع استجابة `HTTP 403 Forbidden` فورية ومنع وصول الطلب إلى أي واجهة أو قاعدة بيانات.
