# خريطة العمليات البرمجية وربط واجهات منصة «دلنّي» بقاعدة بيانات Supabase
**المشروع:** منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)  
**المستودع:** `wisssamomran/new-v66`  
**التاريخ:** 31 أكتوبر 2026  

---

## جدول الربط الكامل للعمليات والأزرار مع جداول ودوائر عمل Supabase

| الإجراء / الزر في الواجهة | المكون البرمجي (Component) | نوع الإجراء (CRUD) | الجدول المستهدف في Supabase | شروط RLS والصلاحيات | آلية التحقق والتحديث في الواجهة |
|-------------------------|--------------------------|-------------------|----------------------------|---------------------|--------------------------------|
| **إضافة / إزالة من المفضلة** | `ListingCard`, `ListingDetailModal` | `INSERT` / `DELETE` | `user_favorites` | `user_id::text = auth.uid()::text` | فحص `res.success`، لا تعديل للواجهة إلا بعد تأكيد DB |
| **إنشاء إعلان عقاري جديد** | `AddListingModal` | `INSERT` | `listings` | المعلنون والمنشآت الموثقة فقط | توليد رقم العقار `YEM-2026-xxx` وتثبيته في السحابة |
| **تعديل بيانات الإعلان** | `EditListingModal` | `UPDATE` | `listings` | صاحب الإعلان أو مدير النظام | تحديث التاريخ `updated_at`، ومزامنة فورية |
| **حذف إعلان عقاري** | لوحة المعلن / لوحة المشرف | `DELETE` | `listings` | صاحب الإعلان أو مدير النظام | حذف العقار مع تسجيل العملية في `audit_logs` |
| **اعتماد / رفض الإعلان** | `ModeratorDashboard` | `UPDATE` | `listings`, `audit_logs` | مراجع المحتوى `moderator` ومدير النظام فقط | تسجيل القرار في `statusTimeline` وسبب الرفض إن وجد |
| **إضافة عضو جديد للمنشأة** | `OrgManagerDashboard` | `INSERT` | `organization_members` | مدير المنشأة نفسها `org_manager` | التحقق من `organization_id` لمنع تداخل المنشآت |
| **تفعيل / تعطيل عضو منشأة** | `OrgManagerDashboard` | `UPDATE` | `organization_members` | مدير المنشأة المعنية حصراً | تحديث حقل `is_active` فورياً |
| **إسناد عقار لموظف مسوق** | لوحة مدير المنشأة | `UPDATE` | `listings` | مدير المنشأة المعنية | تحديث `assigned_agent_id` و `assigned_agent_name` |
| **تقديم طلب تحقق من بصيرة** | تفاصيل العقار / لوحة المعلن | `INSERT` | `verification_requests` | صاحب الإعلان | رفع الوثائق وتثبيت الطلب بحالة `under_review` |
| **مراجعة واعتماد طلب التحقق**| `VerifierDashboard` | `UPDATE` | `verification_requests`, `listings` | مدقق الوثائق `verifier` أو مدير النظام | إضافة شارة التوثيق في مصفوفة `verificationBadges` |
| **إرسال بلاغ عن عقار** | نافذة البلاغ `ReportModal` | `INSERT` | `reports` | المستخدمون المسجلون والزوار | إنشاء رقم قضية رسمي `REP-2026-xxx` |
| **معالجة البلاغ وتجميد الإعلان**| `ReporterAdminDashboard` | `UPDATE` | `reports`, `listings` | مسؤول البلاغات `reporter_admin` | تحويل حالة العقار إلى `suspended` تلقائياً |
| **إنشاء تذكرة دعم فني** | `SupportModal` | `INSERT` | `support_tickets` | كافة المستخدمين المسجلين | حفظ التذكرة والرسالة الأولى `messages` |
| **الرد على تذكرة دعم** | `SupportDashboard` | `UPDATE` | `support_tickets` | صاحب التذكرة أو موظف الدعم `support` | إضافة الرسالة لمصفوفة التذكرة وتحديث `updated_at` |
| **تغيير حالة تذكرة الدعم** | `SupportDashboard` | `UPDATE` | `support_tickets` | موظف الدعم أو مدير النظام | تحديث الحالة (`open`, `in_progress`, `closed`) |
| **حظر عنوان IP مشبوه** | `SystemAdminDashboard` | `INSERT` | `ip_blocks` | مدير النظام `system_admin` فقط | تفعيل الحظر على الخادم عبر `ipBlockGuard` فورياً |
| **تحديث إعدادات المنظومة** | `SystemAdminDashboard` | `UPSERT` | `system_settings` | مدير النظام `system_admin` فقط | حفظ إعدادات المنصة في سجلات JSONB موثقة |
| **تسجيل الدخول الموحد** | `LoginModal` | `SELECT` | `users`, `auth.users` | المصادقة الرسمية | مطابقة البريد/الهاتف وتوليد الجلسة |
| **حجز عقار مؤقت لمدة 48 ساعة**| تفاصيل العقار / طلب الباحث | `INSERT` | `property_bookings` | الباحثون المسجلون `seeker` | فحص قيد الحصرية ومنع الحجز المتوازي |
| **توقيع العقد إلكترونياً** | نافذة العقد الرقمي | `UPDATE` | `property_contracts`, `audit_logs` | أطراف العقد المحددة حصراً | التحقق من تطابق رقم الإصدار وإثبات التوقيع |
