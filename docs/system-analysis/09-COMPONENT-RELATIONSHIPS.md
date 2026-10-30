# 09. شجرة المكونات وتدفق البيانات والأحداث (COMPONENT RELATIONSHIPS & DATA FLOW)
## منصة «دلنّي» العقارية الوطنية الذكية (DALANI)

---

### 1. شجرة المكونات الهيكلية الشاملة (Component Hierarchy Tree)

يوضح المخطط الشجري أدناه كيفية احتضان المكونات وتوزيع الصفحات والنوافذ المنبثقة من نقطة الانطلاق وحتى أصغر مكوّن:

```
App (src/App.tsx)
 ├── AppProvider (src/context/AppContext.tsx)  [المستودع المركزي للحالة العامة]
 │    │
 │    ├── Navbar (src/components/Navbar.tsx)
 │    │    ├── DalaniLogo
 │    │    └── RoleSwitcher (محدد تبديل الدور السريع)
 │    │
 │    ├── <main> [حاوية التوجيه المشروط حسب currentView]
 │    │    ├── HomePage (src/pages/HomePage.tsx)
 │    │    │    ├── DalaniMap / MapComponent (الخريطة التفاعلية)
 │    │    │    └── ListingCard (البطاقات العائمة)
 │    │    │
 │    │    ├── SearchPage (src/pages/SearchPage.tsx)
 │    │    │    ├── FilterBar (شريط التصفية الجغرافية والمالية)
 │    │    │    └── ListingCard (شبكة عرض العقارات)
 │    │    │
 │    │    ├── ListingDetailsPage (src/pages/ListingDetailsPage.tsx)
 │    │    │    ├── ImageGalleryModal
 │    │    │    ├── VerificationBadgeDisplay
 │    │    │    └── MapComponent (الموقع التقريبي)
 │    │    │
 │    │    ├── ProtectedRoute (src/components/ProtectedRoute.tsx)
 │    │    │    ├── AdWizardPage (src/pages/AdWizardPage.tsx) [معالج الخطوات الخمس]
 │    │    │    ├── MyAdsPage (src/pages/MyAdsPage.tsx)
 │    │    │    ├── ModerationPage (src/pages/ModerationPage.tsx)
 │    │    │    ├── VerificationPage (src/pages/VerificationPage.tsx)
 │    │    │    ├── OrgDashboardPage (src/pages/OrgDashboardPage.tsx)
 │    │    │    ├── ReportsPage (src/pages/ReportsPage.tsx)
 │    │    │    └── AdminDashboardPage (src/pages/AdminDashboardPage.tsx) [12 تبويباً]
 │    │    │
 │    │    ├── BookingsManagementPage (src/pages/BookingsManagementPage.tsx)
 │    │    ├── FavoritesPage (src/pages/FavoritesPage.tsx)
 │    │    ├── MyAccountPage (src/pages/MyAccountPage.tsx)
 │    │    ├── HelpAndPoliciesPage (src/pages/HelpAndPoliciesPage.tsx)
 │    │    └── SupportPage (src/pages/SupportPage.tsx)
 │    │
 │    ├── Footer (src/components/Footer.tsx) [يظهر في غير صفحة الخريطة]
 │    ├── BottomNavBar (src/components/BottomNavBar.tsx) [شريط الهاتف السفلي]
 │    │
 │    └── [Global Modals & Drawers - النوافذ والأدراج المنبثقة المركزية]
 │         ├── AuthModal (src/components/AuthModal.tsx)
 │         ├── VisitorGateModal (src/components/VisitorGateModal.tsx)
 │         ├── BookingModal (src/components/BookingModal.tsx)
 │         ├── BookingDealWorkspaceModal (src/components/BookingDealWorkspaceModal.tsx)
 │         ├── ContractDocumentModal (src/components/ContractDocumentModal.tsx)
 │         ├── DalaniAiAssistantModal (src/components/DalaniAiAssistantModal.tsx)
 │         ├── AppPermissionsModal (src/components/AppPermissionsModal.tsx)
 │         ├── SupabaseConnectionModal (src/components/SupabaseConnectionModal.tsx)
 │         └── Global Toasts Container (إشعارات النجاح والتحذير)
```

---

### 2. تدفق البيانات وإدارة الحالة (Data Flow & Context Architecture)

تعتمد المنصة نمط التدفق أحادي الاتجاه المعزز بسياق مركزي موحد (**Uni-directional Context Flow**):

```
┌────────────────────────────────────────────────────────┐
│               AppContext Store (2,700+ Lines)          │
│  State: listings, bookings, requests, contracts, user  │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      (Props / Custom Hooks)    (Actions & Mutators)
    - listings: Listing[]      - submitPropertyRequest()
    - currentUser: User        - acceptPropertyRequest()
    - bookings: Booking[]      - approveContract()
    - contracts: Contract[]    - completeBooking()
               │                         │
               ▼                         ▼
┌─────────────────────────────┐ ┌────────────────────────┐
│     صفحات العرض (Pages)     │ │   النوافذ التفاعلية    │
│  HomePage, Search, Details  │ │  DealWorkspace, Modal  │
└─────────────────────────────┘ └────────────────────────┘
```

#### محاور إدارة الحالة المركزية داخل `AppContext.tsx`:
1. **إدارة الجلسة والمستخدم (`currentUser`):**
   * كائن المستخدم النشط ودوره (`role`) وبيانات توثيقه.
   * دالة `setCurrentUserRole(role)` لتغيير الدور لحظياً.
2. **سجل العقارات المعروضة (`listings`):**
   * مصفوفة العقارات المنشورة التي يتم تغذيتها من Supabase مع دمج التحديثات التفاؤلية فور إضافة أو تعديل عقار.
3. **محرك الحجوزات المؤقتة والطلبات (`requests` و `bookings`):**
   * يحمل طلبات الحجز المعلقة والحجوزات الحصرية النشطة.
   * يضمن صمام منع التعارض وقفل العقار برمجياً قبل تمرير الحجز لأي مستخدم آخر.
4. **محرك العقود القانونية (`contracts`):**
   * يحمل نسخ العقود، تاريخ التعديلات، اعتمادات الأطراف، والتوقيعات الإلكترونية المشفرة.
5. **نظام الإشعارات التفاعلية الشامل (`toasts`):**
   * إدارة رسائل النجاح والخطأ المنسدلة في زاوية الشاشة العلوية دون حجب أزرار الواجهة.

---

### 3. التبعيات وتوزيع المسؤوليات بين المكونات
* **الفصل بين العرض والمنطق:**
  * الصفحات والمكونات مسؤولة حصرياً عن تجربة المستخدم، التحقق من مدخلات النماذج (Validation)، وعرض حالات التحميل والأخطاء.
  * كافة العمليات الحسابية، وتوليد الأرقام الرسمية (`BKG-2026-XXXX`, `CNT-2026-XXXX`)، واستدعاء مهايئات السيرفر، وفحص صمامات الأمان تتركز حصراً داخل `AppContext.tsx` وخدمات `src/services/`.
* **العزل الصارم لحماية الزوار:**
  * مكون `VisitorGateModal` يعزل الميزات الحساسة ويعمل كحارس استباقي يمنع وصول الزائر غير الموثق لعمليات حجز العقارات أو حفظ المفضلة.
* **استقلالية محرك الطباعة:**
  * تم عزل منطق توليد وتنسيق وثائق العقود الرسمية وتوليد الباركود وتنسيقات الـ A4 في خدمة منفصلة تماماً (`src/services/printerService.ts`) لضمان عدم إثقال مكونات واجهة المستخدم.
