# دليل استيراد وتشغيل قاعدة بيانات «دلنّي» في Supabase
## Dalani Platform - Supabase Import & Deployment Guide (باللغة العربية)

هذا الدليل يوضح بالخطوات العملية والمباشرة كيفية استيراد قاعدة بيانات منصة «دلنّي» وتشغيلها في مشروعك على **Supabase**، وتجهيز الجداول والبيانات والسياسات الأمنية للعمل المباشر مع تطبيق الويب والهاتف.

---

## 1. الملفات المجهزة للاستيراد

تجد كافة الملفات المهندسة داخل مجلد المشروع في المسار:
```text
database/
├── supabase/
│   ├── schema.sql      # مخطط البناء DDL (الجداول، القيود، المشغلات، الفهارس، سياسات RLS)
│   └── seed.sql        # البيانات الأولية والاختبارية الواقعية لكافة السيناريوهات
├── DATABASE_SCHEMA.md  # التوثيق التقني وقاموس البيانات
├── IMPORT_DATABASE_AR.md # هذا الدليل الإرشادي
└── DATABASE_IMPLEMENTATION_REPORT.md # التقرير الهندسي الشامل
```

---

## 2. طرق الاستيراد المتاحة

### الطريقة الأولى: عبر لوحة تحكم Supabase Dashboard (موصى بها للمبتدئين والسرعة)

1. سجل الدخول إلى حسابك على [Supabase Dashboard](https://supabase.com/dashboard).
2. اختر مشروعك أو أنشئ مشروعاً جديداً (New Project).
3. من القائمة الجانبية اليسرى، انقر على أيقونة **SQL Editor**.
4. اضغط على زر **New query** (استعلام جديد).
5. **الخطوة الأولى - إنشاء المخطط البنائي (Schema):**
   - افتح الملف `database/supabase/schema.sql` في محرر الأكواد لديك.
   - انسخ كامل محتويات الملف، والصقها في محرر SQL على Supabase.
   - اضغط على زر **Run** (أو اضغط `Ctrl + Enter` / `Cmd + Enter`).
   - تأكد من ظهور رسالة النجاح: `Success. No rows returned`.
6. **الخطوة الثانية - زرع البيانات الأولية (Seed Data):**
   - افتح استعلاماً جديداً بالضغط على `+` في SQL Editor.
   - افتح الملف `database/supabase/seed.sql` وانسخ كامل محتوياته.
   - الصق المحتوى في المحرر واضغط **Run**.
   - ستظهر رسالة النجاح بتأكيد إدراج السجلات بنجاح.
7. **التحقق البصري:**
   - انتقل إلى تبويب **Table Editor** في القائمة الجانبية.
   - ستجد كافة الجداول الـ 13 (users, organizations, listings, property_requests, property_bookings, property_contracts, ...) جاهزة ومملوءة بالبيانات.
   - انتقل إلى تبويب **Database** ثم **Schema Visualizer** للاطلاع على المخطط العلائقي الكامل للمشروع.

---

### الطريقة الثانية: عبر سطر الأوامر Supabase CLI (للمطورين وبيئات CI/CD)

إذا كنت تفضل استخدام أداة سطر الأوامر الخاصة بـ Supabase:

1. تأكد من تثبيت Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. سجل الدخول إلى حسابك:
   ```bash
   supabase login
   ```
3. اربط مشروعك المحلي بمشروع Supabase البعيد:
   ```bash
   supabase link --project-ref your-project-id
   ```
4. نفذ ملفات المخطط والبيانات مباشرة:
   ```bash
   supabase db push
   # أو تشغيل الملفات يدوياً عبر psql:
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f database/supabase/schema.sql
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f database/supabase/seed.sql
   ```

---

### الطريقة الثالثة: عبر أدوات إدارة قواعد البيانات (DBeaver, TablePlus, pgAdmin)

1. احصل على رابط الاتصال المباشر (Direct Connection URI) من مشروعك في Supabase:
   - انتقل إلى **Project Settings** > **Database** > **Connection string** > **URI**.
2. افتح أداة DBeaver أو TablePlus وأنشئ اتصالاً جديداً بنوع **PostgreSQL**.
3. الصق رابط الاتصال وأدخل كلمة المرور التي اخترتها عند إنشاء المشروع.
4. افتح نافذة SQL Script وشغّل أولاً `database/supabase/schema.sql` ثم `database/supabase/seed.sql`.

---

## 3. إعداد مستودعات التخزين السحابي (Supabase Storage Buckets)

لتخزين صور العقارات ومستندات البصائر الشرعية المرفوعة من التطبيق:

1. من القائمة الجانبية في Supabase، انتقل إلى **Storage**.
2. اضغط على **New bucket** وأنشئ المستودعات التالية:
   - **`listings-images`**:
     - الصلاحية: **Public bucket** (مفتوح للعامة لعرض صور العقارات في البطاقات والخريطة).
     - الحجم الأقصى للملف: 10 ميجابايت.
     - الصيغ المسموحة: `image/jpeg, image/png, image/webp`.
   - **`verification-documents`**:
     - الصلاحية: **Private bucket** (غير متاح للعامة إطلاقاً لحماية صور البطاقات الشخصية والبصائر الشرعية).
     - الصلاحيات: مقيدة عبر سياسات RLS لطاقم التحقق وأصحاب المستند فقط.
   - **`contracts-archive`**:
     - الصلاحية: **Private bucket** (أرشيف عقود الصفقات ومحاضر الاستلام الموقعة).

---

## 4. ربط التطبيق بقاعدة البيانات (Environment Variables)

لربط تطبيق React وCapacitor والواجهة الخلفية بـ Supabase، قم بتحديث ملف البيئة `.env`:

```env
# رابط واجهة برمجة التطبيقات في Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# المفتاح العام الآمن للمتصفح وتطبيق الهاتف (يدعم سياسات RLS)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# المفتاح السيادي للخادم فقط (يحظر وضعه في كود الواجهة أو تطبيق APK)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **تنبيه أمني هام:** مفتاح `SUPABASE_SERVICE_ROLE_KEY` يتمتع بصلاحيات تتجاوز سياسات الأمان RLS؛ لذا يجب أن يبقى دائماً على الخادم فقط ولا يُدرج نهائياً في ملفات الـ APK أو كود الواجهات الأمامية.

---

## 5. استعلامات فحص واختبار الجاهزية (Verification Queries)

بعد الانتهاء من الاستيراد، يمكنك تشغيل هذه الاستعلامات في **SQL Editor** للتأكد من عمل كافة الآليات الرقابية والمشغلات:

### 1. التحقق من إحصائيات الجداول والسجلات
```sql
SELECT 
    'users' AS table_name, COUNT(*) AS total_rows FROM public.users
UNION ALL
SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL
SELECT 'listings', COUNT(*) FROM public.listings
UNION ALL
SELECT 'property_requests', COUNT(*) FROM public.property_requests
UNION ALL
SELECT 'property_bookings', COUNT(*) FROM public.property_bookings
UNION ALL
SELECT 'property_contracts', COUNT(*) FROM public.property_contracts
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM public.audit_logs;
```

### 2. اختبار قفل الحجز الحصري (Anti-Conflict Lock Test)
حاول إنشاء حجز نشط متزامن على العقار المحجوز مسبقاً (`list-101`):
```sql
-- يجب أن يفشل هذا الاستعلام فوراً ويعيد رسالة خطأ تمنع الحجز المزدوج
INSERT INTO public.property_bookings (
    id, booking_number, request_id, listing_id, seeker_id, advertiser_id,
    status, duration_hours, start_date, expires_at
)
VALUES (
    'bkg-test-conflict', 'BKG-TEST-01', 'req-102', 'list-101', 'usr-seeker-2', 'adv-1',
    'active', 48, NOW(), NOW() + INTERVAL '48 hours'
);
```
> **النتيجة المتوقعة:** خطأ صريح من المشغل:
> `ERROR: تعذر تنفيذ الحجز: العقار محجوز حصرياً لطلب نشط آخر ولم تنتهِ فترة الحجز بعد.`

### 3. اختبار حظر إعادة فتح العقار المكتمل (Irreversible Completed State Test)
حاول إعادة فتح دار صنعاء القديمة المكتمل بيعه (`list-107`) إلى حالة `published`:
```sql
-- يجب أن يُرفض هذا التعديل فوراً
UPDATE public.listings 
SET status = 'published' 
WHERE id = 'list-107';
```
> **النتيجة المتوقعة:** خطأ صريح من المشغل:
> `ERROR: يحظر نظام دلنّي العقاري إعادة نشر أو فتح عقار تم إتمام صفقته (مباع أو مؤجر) نهائياً حفاظاً على حقوق الأطراف ومصداقية السوق.`

---

## 6. الدعم الفني والمتابعة
في حال واجهتك أي استفسارات أثناء استيراد الجداول أو ضبط الصلاحيات، يرجى مراجعة ملف التوثيق الشامل `database/DATABASE_SCHEMA.md` الذي يحتوي على التفاصيل الدقيقة لكافة الحقول ومصفوفة الصلاحيات.
