# 06. مسارات العمل ودورات الحياة التشغيلية (WORKFLOWS & LIFECYCLES)
## منصة «دلنّي» العقارية الوطنية الذكية (DALANI)

---

### 1. دورة حياة الإعلان العقاري (Listing Full Lifecycle)

توضح دورة الحياة التالية المسار الكامل للعقار منذ إنشائه كمسودة وحتى إتمام بيعه أو تأجيره ونقل ملكيته وأرشفته:

```mermaid
stateDiagram-v2
    [*] --> Draft : إنشاء مسودة (AdWizardPage)
    Draft --> UnderReview : إرسال للنشر والمراجعة
    
    state UnderReview {
        [*] --> ContentModeration : فحص النصوص والأسعار
        ContentModeration --> VerificationCheck : مطابقة البصيرة والهوية
    }

    UnderReview --> NeedsChanges : ملاحظات الكادر الإداري
    NeedsChanges --> UnderReview : تعديل الحقول من قبل المعلن

    UnderReview --> Rejected : مخالفة جسيمة / احتيال
    Rejected --> [*]

    UnderReview --> Published : اعتماد الإعلان ونشره

    state Published {
        [*] --> ActiveAvailable : متاح للجمهور والبحث
        ActiveAvailable --> TemporarilyLocked : قبول طلب حجز حصري (Anti-Conflict)
        TemporarilyLocked --> ActiveAvailable : إلغاء الحجز أو انتهاء مدته (48h)
    }

    Published --> Suspended : بلاغ نزاع نشط أو أمر قضائي
    Suspended --> Published : حفظ البلاغ بعد التحقيق
    Suspended --> Rejected : ثبوت الاحتيال

    TemporarilyLocked --> Completed : إتمام الصفقة وتوقيع العقد والمخالصة
    Completed --> [*] : أرشفة الإضبارة (dealOutcome: sold / rented)
```

---

### 2. دورة حياة طلب العقار وصمام الحجز الحصري (Anti-Conflict Booking Workflow)

يوضح المخطط كيفية تقديم طلب الحجز وتفعيل قفل منع التعارض لمنع تكرار بيع العقار نفسه:

```mermaid
sequenceDiagram
    autonumber
    actor Seeker as الباحث (أحمد العولقي)
    participant UI as واجهة المنصة (BookingModal)
    participant Context as سياق التطبيق (AppContext)
    participant DB as قاعدة البيانات (Supabase)
    actor Advertiser as المعلن (هشام القدسي)

    Seeker->>UI: اختيار العقار والنقر على "طلب حجز ومعاينة"
    UI->>Seeker: فتح نافذة تحديد نوع الطلب، السعر، والمدة (48 ساعة)
    Seeker->>UI: النقر على "تأكيد وإرسال طلب الحجز"
    UI->>Context: استدعاء submitPropertyRequest()
    Context->>DB: إدراج سجل في جدول property_requests (status: pending)
    DB-->>Advertiser: إشعار المعلن بطلب حجز جديد على عقاره
    
    alt المعلن يرفض الطلب
        Advertiser->>Context: استدعاء rejectPropertyRequest(reason)
        Context->>DB: تحديث status = 'rejected'
        DB-->>Seeker: إشعار برفض الطلب مع السبب
    else المعلن يقبل الطلب (تفعيل صمام الحجز الحصري)
        Advertiser->>Context: استدعاء acceptPropertyRequest(requestId, 48h)
        Context->>DB: فحص صمام منع التعارض (Anti-Conflict Lock Check)
        Note over DB: التأكد من عدم وجود حجز نشط آخر على نفس العقار
        Context->>DB: 1. تحديث الطلب لـ accepted
        Context->>DB: 2. إنشاء حجز جديد في property_bookings (status: active)
        Context->>DB: 3. قفل العقار في listings: isReserved = true, activeBookingId
        DB-->>Seeker: إشعار بقبول الحجز وحصريته لـ 48 ساعة
        Note over UI: يظهر العقار للجمهور بعلامة "محجوز مؤقتاً" ويُحجب عن باقي الحجوزات
    end
```

---

### 3. مسار صالة التفاوض والمعاينة الميدانية (Deal Workspace Workflow)

بعد إنشاء الحجز النشط، يدخل الطرفان في مساحة عمل تفاعلية (`BookingDealWorkspaceModal`):

```mermaid
flowchart TD
    Start[دخول صالة متابعة الصفقة] --> Chat[المراسلات والتنسيق المباشر]
    
    Chat --> VisitStep{المعاينة الميدانية}
    VisitStep -->|طلب موعد| ScheduleVisit[جدولة موعد المعاينة وتحديد الوقت]
    ScheduleVisit -->|تأكيد المعلن| ConfirmVisit[تأكيد الموعد وكشف العنوان الدقيق]
    ConfirmVisit -->|إجراء الزيارة| CompleteVisit[تسجيل نتيجة المعاينة: مرضي / يتطلب تفاوض]
    
    CompleteVisit --> TermsStep{التفاوض المالي والشروط}
    TermsStep --> ProposeTerms[اقتراح مسودة الشروط: السعر، العربون، الدفعات]
    ProposeTerms --> ReviewTerms{مراجعة الطرف الآخر}
    ReviewTerms -->|طلب تعديل| ProposeTerms
    ReviewTerms -->|موافقة الطرفين| AgreedTerms[تثبيت الشروط المعتمدة بالتراضي]
    
    AgreedTerms --> GenContract[توليد العقد العقاري الرسمي الموحد بنقرة زر]
```

---

### 4. دورة حياة العقد القانوني الموحد والاعتمادات والطباعة (Contract Lifecycle)

يوضح المخطط آلية صياغة العقد، منع التعديل الصامت، مسار الموافقات، والتوقيع الإلكتروني والطباعة:

```mermaid
stateDiagram-v2
    [*] --> Draft : توليد العقد من شروط الصفقة (CNT-2026-XXXX)
    
    state Draft {
        [*] --> EditingClauses : مراجعة وتعديل البنود
        EditingClauses --> VersionIncrement : حفظ تعديل (version + 1)
        Note right of VersionIncrement : صمام Anti-Silent Modification يلغي أي موافقات سابقة
    }

    Draft --> PendingApprovals : اكتمال الصياغة وعرضه للاعتماد

    state PendingApprovals {
        FirstPartyApproval : موافقة الطرف الأول (المؤجر/البائع)
        SecondPartyApproval : موافقة الطرف الثاني (المستأجر/المشتري - أحمد العولقي)
        AdminBypass : تجاوز قيد المراجعة القانونية (مدير النظام)
    }

    FirstPartyApproval --> BothApproved : موافقة الطرف الثاني
    SecondPartyApproval --> BothApproved : موافقة الطرف الأول
    AdminBypass --> BothApproved : فك القيد بقرار إداري علوي

    BothApproved --> Approved : اعتماد العقد بالتراضي التام
    
    Approved --> Signed : التوقيع الإلكتروني للطرفين (بصمة رقمية + رقم الهوية الوطنية)

    state Signed {
        PrintSystem : استدعاء طابعة نظام الهاتف / المتصفح
        SaveAsPDF : خيار الحفظ كملف PDF رسمي
    }

    Signed --> CompletedDeal : تسليم العقد وبدء مرحلة الإغلاق المالي
    CompletedDeal --> [*]
```

---

### 5. دورة تسوية وإغلاق الصفقة والمخالصة النهائية (Deal Settlement & Handover)

المرحلة الختامية قبل أرشفة العقار نهائياً:

```mermaid
flowchart LR
    subgraph PreReqs [المتطلبات الإلزامية للإغلاق]
        A[عقد موقع رسمياً status: signed]
        B[تسجيل سند القبض والمخالصة المالية]
        C[محضر تسليم المفاتيح وقراءة العدادات أو البصيرة]
    end

    subgraph Action [إجراء الإتمام]
        D[النقر على إتمام الصفقة نهائياً]
    end

    subgraph Outcome [النتائج في النظام]
        E[تحول الحجز إلى completed]
        F[تحول العقار إلى status: completed]
        G[إصدار رقم إضبارة نهائي DOS-2026-XXXX]
        H[تحرير صمام الحجز ونقل الملكية بالأرشيف]
    end

    PreReqs --> Action
    Action --> Outcome
```

---

### 6. مسار إدارة النزاعات والبلاغات القانونية (Dispute & Incident Workflow)

```mermaid
flowchart TD
    UserReport[تقديم بلاغ نزاع أو احتيال من مستخدم أو طرف في الصفقة] --> ConfidentialIntake[تسجيل البلاغ برقم رسمي وحجب هوية المبلغ عن الخصم]
    ConfidentialIntake --> AdminReview[إحالة البلاغ لمسؤول البلاغات reporter_admin]
    
    AdminReview --> FastAction{تقييم درجة الخطورة}
    FastAction -->|حرج / شبهة احتيال| FreezeAd[إيقاف وتجميد الإعلان فوراً suspend_ad]
    FastAction -->|نزاع تعاقدي| HoldDeal[تجميد الحجز مؤقتاً ومنع الإغلاق المالي]
    
    FreezeAd --> Investigation[التحقيق ومطابقة أصل البصيرة مع سجل الأمانة]
    HoldDeal --> Investigation
    
    Investigation --> Resolution{قرار الإدارة}
    Resolution -->|كيدي / غير صحيح| Dismiss[حفظ البلاغ وإلغاء التجميد]
    Resolution -->|ثبوت المخالفة| Terminate[حظر المعلن + إلغاء الحجز + إحالة للجهات المختصة]
    Resolution -->|تسوية ودية| MutualAgreement[توثيق محضر الصلح واستئناف الصفقة]
```
