import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, AuditLogEntry, ActiveSession, PropertyRequest, PropertyBooking } from '../types';
import { ROLES_INFO } from '../components/RoleSwitcher';
import {
  User,
  Shield,
  Key,
  Bell,
  Activity,
  Download,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Smartphone,
  Mail,
  Building,
  Calendar,
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  PhoneCall,
  History,
  FileText,
  Lock,
  LogOut,
  Trash2,
  RefreshCw,
  Sliders,
  DollarSign,
  Heart,
  Grid,
  Headphones,
  BookOpen,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  X,
  Laptop
} from 'lucide-react';

interface MyAccountPageProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const MyAccountPage: React.FC<MyAccountPageProps> = ({
  onNavigate,
  onOpenAuth
}) => {
  const {
    currentUser,
    setCurrentUserRole,
    updateUserProfile,
    deactivateAccount,
    logoutUser,
    listings,
    favorites,
    tickets,
    requests,
    bookings,
    acceptPropertyRequest,
    rejectPropertyRequest,
    cancelPropertyRequest,
    cancelBooking,
    extendBooking,
    completeBooking,
    fetchRequestsAndBookings,
    showToast
  } = useApp();

  const isVisitor = currentUser.role === 'visitor';

  // Active Tab in Dashboard
  const [activeTab, setActiveTab] = useState<'profile' | 'reservations' | 'membership' | 'security' | 'preferences' | 'activity' | 'shortcuts' | 'privacy'>('profile');

  // Reservations Sub-tab & Action Modals State
  const [resSubTab, setResSubTab] = useState<'incoming' | 'outgoing'>(() => {
    return ['advertiser', 'org_manager', 'org_agent', 'system_admin'].includes(currentUser.role) ? 'incoming' : 'outgoing';
  });
  const [acceptModalRequest, setAcceptModalRequest] = useState<PropertyRequest | null>(null);
  const [acceptDuration, setAcceptDuration] = useState<number>(48);
  const [acceptNotes, setAcceptNotes] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState(false);

  const [rejectModalRequest, setRejectModalRequest] = useState<PropertyRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [cancelBookingModalTarget, setCancelBookingModalTarget] = useState<PropertyBooking | null>(null);
  const [cancelBookingReason, setCancelBookingReason] = useState<string>('');
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  const [extendBookingTarget, setExtendBookingTarget] = useState<PropertyBooking | null>(null);
  const [extendHours, setExtendHours] = useState<number>(24);
  const [isExtendingBooking, setIsExtendingBooking] = useState(false);

  // Edit Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Sync state if currentUser changes
  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email || '');
    setAvatarUrl(currentUser.avatarUrl || '');
  }, [currentUser]);

  // Personal Activity Logs
  const [personalLogs, setPersonalLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');

  // Active User Sessions
  const [userSessions, setUserSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Deactivate Modal State
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Export Data State
  const [isExporting, setIsExporting] = useState(false);

  // User Preferences State (Stored in localStorage)
  const [currencyPref, setCurrencyPref] = useState<'YER' | 'USD' | 'SAR'>(() => {
    return (localStorage.getItem('dalani_preferred_currency') as any) || 'YER';
  });
  const [smsAlerts, setSmsAlerts] = useState<boolean>(() => {
    return localStorage.getItem('dalani_pref_sms') !== 'false';
  });
  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    return localStorage.getItem('dalani_pref_email') !== 'false';
  });
  const [fontSizePref, setFontSizePref] = useState<'normal' | 'large'>(() => {
    return (localStorage.getItem('dalani_pref_font_size') as any) || 'normal';
  });

  // Calculate Profile Completion Score
  const getCompletionScore = () => {
    let score = 25; // Base registered account
    if (currentUser.phoneVerified) score += 25;
    if (currentUser.email && currentUser.email.trim().length > 0) score += 25;
    if (currentUser.avatarUrl && currentUser.avatarUrl.trim().length > 0) score += 25;
    return score;
  };

  // Fetch Personal Activities
  const fetchPersonalActivity = async () => {
    if (isVisitor) return;
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/user/activity', {
        headers: {
          'x-user-role': currentUser.role,
          'Authorization': `Bearer ${currentUser.id}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPersonalLogs(data.logs || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch User Sessions
  const fetchUserSessions = async () => {
    if (isVisitor) return;
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/user/sessions', {
        headers: {
          'x-user-role': currentUser.role,
          'Authorization': `Bearer ${currentUser.id}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserSessions(data.sessions || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!isVisitor) {
      if (activeTab === 'activity') {
        fetchPersonalActivity();
      } else if (activeTab === 'security') {
        fetchUserSessions();
      }
    }
  }, [activeTab, isVisitor]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    if (name.trim().length < 2) {
      setProfileErrorMsg('الاسم الكامل يجب أن يحتوي على حرفين على الأقل');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileErrorMsg('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    setIsSavingProfile(true);
    const res = await updateUserProfile({
      name: name.trim(),
      email: email.trim(),
      avatarUrl: avatarUrl.trim()
    });
    setIsSavingProfile(false);

    if (res.success) {
      setProfileSuccessMsg(res.message || 'تم حفظ بيانات الملف الشخصي بنجاح');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } else {
      setProfileErrorMsg(res.message || 'تعذر تحديث الملف الشخصي');
    }
  };

  // Handle Export Data
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/user/export-data', {
        headers: {
          'x-user-role': currentUser.role,
          'Authorization': `Bearer ${currentUser.id}`
        }
      });

      if (!res.ok) {
        showToast('تعذر تصدير البيانات في الوقت الحالي', 'error');
        setIsExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalani-user-data-${currentUser.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('تم تنزيل أرشيف بياناتك الشخصية بنجاح بنسق JSON', 'success');
    } catch {
      showToast('حدث خطأ أثناء تنزيل ملف البيانات', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Terminate Session
  const handleTerminateSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'Authorization': `Bearer ${currentUser.id}`
        }
      });
      if (res.ok) {
        showToast('تم إنهاء الجلسة بنجاح من الخادم', 'success');
        fetchUserSessions();
      } else {
        showToast('فشل إنهاء الجلسة', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = () => {
    localStorage.setItem('dalani_preferred_currency', currencyPref);
    localStorage.setItem('dalani_pref_sms', String(smsAlerts));
    localStorage.setItem('dalani_pref_email', String(emailAlerts));
    localStorage.setItem('dalani_pref_font_size', fontSizePref);
    showToast('تم حفظ تفضيلات الاستخدام بنجاح', 'success');
  };

  // Handle Account Deactivation
  const handleConfirmDeactivate = async () => {
    setIsDeactivating(true);
    const res = await deactivateAccount();
    setIsDeactivating(false);
    setDeactivateModalOpen(false);

    if (res.success) {
      onNavigate('home');
    }
  };

  // Role details in Arabic
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'visitor': return 'زائر غير مسجل';
      case 'seeker': return 'باحث مسجل عن عقار';
      case 'advertiser': return 'معلن فردي موثق';
      case 'org_manager': return 'مدير منشأة عقارية';
      case 'org_agent': return 'وكيل ومسوق عقاري';
      case 'moderator': return 'مشرف مراجعة المحتوى والرقابة';
      case 'verifier': return 'مسؤول التحقق وبصائر الملكية';
      case 'reporter_admin': return 'مسؤول النزاعات والبلاغات';
      case 'support': return 'ممثل الدعم الفني وخدمة العملاء';
      case 'accountant': return 'المحاسب المالي للمنصة';
      case 'system_admin': return 'مدير النظام العام والسيادي';
      default: return role;
    }
  };

  // Quick stats calculation
  const myListingsCount = listings.filter(l => l.advertiser?.id === currentUser.id).length;
  const myTicketsCount = tickets.filter(t => t.userId === currentUser.id).length;

  // -------------------------------------------------------------
  // VIEW 1: VISITOR GATEWAY VIEW (When not logged in)
  // -------------------------------------------------------------
  if (isVisitor) {
    return (
      <div className="min-h-full bg-slate-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#16324F] to-[#0F2338] text-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-700/40 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#12A889]/20 border border-[#12A889]/40 flex items-center justify-center text-[#12A889] mb-5 shadow-inner">
              <User className="w-10 h-10" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black mb-3">
              بوابة حساب «دلنّي» العقاري
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              سجل دخولك أو أنشئ حسابك الموثق برقم هاتفك اليمني للوصول إلى كافة المزايا العقارية المتقدمة وإدارة عقاراتك وتفضيلاتك بكل أمان.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-6 py-3 rounded-2xl bg-[#12A889] hover:bg-[#0fa37f] text-white text-sm font-black shadow-lg shadow-[#12A889]/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>تسجيل الدخول برقم الهاتف</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>إنشاء حساب موثق جديد</span>
              </button>
            </div>
          </div>

          {/* Value propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#12A889] flex items-center justify-center mb-3">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">حفظ ومزامنة المفضلة</h3>
              <p className="text-slate-500 text-xs">احفظ العقارات التي تعجبك وتابع تغيرات أسعارها من أي جهاز.</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                <Grid className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">إضافة ونشر العقارات</h3>
              <p className="text-slate-500 text-xs">انشر عقاراتك للبيع أو الإيجار وتابع إحصائيات المشاهدات والاتصالات.</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">طلب فحص البصائر</h3>
              <p className="text-slate-500 text-xs">احصل على شارة الملكية المفحوصة لرفع موثوقية إعلاناتك أمام المشترين.</p>
            </div>
          </div>

          {/* Role switcher notice for demo */}
          <div className="p-5 bg-slate-100 rounded-2xl border border-slate-300/80 text-xs text-slate-600 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-xs shrink-0">
                <Sparkles className="w-5 h-5 text-[#12A889]" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">هل تختبر المنصة للأغراض التطويرية؟</span>
                <span>يمكنك استخدام شريط محاكي الأدوار في أعلى الشاشة للتبديل الفوري بين أي من الأدوار العشرة.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: AUTHENTICATED USER DASHBOARD
  // -------------------------------------------------------------
  const score = getCompletionScore();

  return (
    <div className="min-h-full bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. Account Header Card & Summary */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* User Avatar & Info */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative group shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#16324F] to-[#12A889] text-white flex items-center justify-center text-2xl font-black shadow-md overflow-hidden border-2 border-white">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{currentUser.name.slice(0, 2)}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px]" title="حساب نشط">
                  ✓
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#16324F]/10 text-[#16324F] border border-[#16324F]/20">
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  {currentUser.phone && (
                    <span className="flex items-center gap-1 text-emerald-700 font-mono font-bold">
                      <Smartphone className="w-3.5 h-3.5" />
                      {currentUser.phone}
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                  )}
                  {currentUser.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {currentUser.email}
                    </span>
                  )}
                  {currentUser.orgName && (
                    <span className="flex items-center gap-1 text-teal-700 font-bold">
                      <Building className="w-3.5 h-3.5" />
                      {currentUser.orgName}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                  <Calendar className="w-3 h-3" />
                  <span>تاريخ الانضمام للمنصة: {currentUser.createdAt || '2026-01-01'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Profile Completion Meter */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
              <div className="w-full md:w-56 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">اكتمال الملف الشخصي</span>
                  <span className="text-[#12A889] font-mono font-black">{score}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#12A889] to-emerald-400 transition-all duration-500"
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('bookings')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>الحجوزات والطلبات</span>
                </button>

                <button
                  onClick={() => onNavigate('favorites')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>المفضلة ({favorites.length})</span>
                </button>

                <button
                  onClick={() => onNavigate('my_ads')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>إعلاناتي ({myListingsCount})</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* 2. Responsive Tabbed Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <User className="w-4 h-4 text-[#12A889]" />
            <span>الملف الشخصي</span>
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'reservations'
                ? 'bg-[#12A889] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'reservations' ? 'text-white' : 'text-[#12A889]'}`} />
            <span>طلباتي والحجوزات</span>
            {(requests.length > 0 || bookings.length > 0) && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'reservations' ? 'bg-white text-emerald-900' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {requests.filter(r => r.status === 'pending').length || bookings.filter(b => b.status === 'active').length || (requests.length + bookings.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('membership')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'membership'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Shield className="w-4 h-4 text-[#12A889]" />
            <span>نوع الحساب والصلاحيات</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Key className="w-4 h-4 text-[#12A889]" />
            <span>الأمان والجلسات</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#12A889]" />
            <span>التفضيلات والإشعارات</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Activity className="w-4 h-4 text-[#12A889]" />
            <span>نشاطي وسجلي</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-[#12A889]" />
            <span>اختصارات سريعة</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Download className="w-4 h-4 text-rose-400" />
            <span>الخصوصية والبيانات</span>
          </button>
        </div>

        {/* 3. Tab Contents */}
        <div className="transition-all duration-200">

          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#12A889]" />
                  <span>تعديل البيانات والملف الشخصي</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  يمكنك تعديل اسمك الظاهر، بريدك الإلكتروني، ورابط صورتك الشخصية. رقم الهاتف والرتبة محميان ولا يتغيران إلا عبر التحقق الرسمي.
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الاسم الكامل (يظهر للمتعاملين والجمهور) *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#12A889] text-sm font-medium"
                    placeholder="مثال: م. علي صالح الأهدل"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    البريد الإلكتروني (لاستقبال الإشعارات والفواتير)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#12A889] text-sm font-medium text-left"
                    placeholder="user@example.com"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رابط الصورة الرمزية (Avatar URL)
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#12A889] text-sm font-medium text-left"
                    placeholder="https://images.unsplash.com/..."
                    dir="ltr"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    يمكنك لصق رابط صورة مباشرة لعرضها كصورة شخصية لحسابك.
                  </span>
                </div>

                {/* Non-editable protected fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم الهاتف اليمني الموثق</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{currentUser.phone || 'غير مسجل'}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">✓ مؤكد رسمياً برمز SMS</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">الدور الوظيفي والصلاحية</span>
                    <span className="text-xs font-bold text-[#16324F]">{getRoleLabel(currentUser.role)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">محكوم مركزياً من الخادم</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0fa37f] text-white text-xs font-bold shadow-md shadow-[#12A889]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جارٍ الحفظ في الخادم...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>حفظ التعديلات</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setName(currentUser.name);
                      setEmail(currentUser.email || '');
                      setAvatarUrl(currentUser.avatarUrl || '');
                      setProfileErrorMsg(null);
                      setProfileSuccessMsg(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                  >
                    إلغاء التغييرات
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1.5: RESERVATIONS & PROPERTY REQUESTS */}
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              {/* Header Banner & Stats */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#12A889]" />
                      <span>إدارة الطلبات العقارية والحجوزات المؤقتة</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      نظام حوكمة الحجوزات: تمكين الباحث من طلب حجز مؤقت لفحص وثائق الملكية والبصيرة، مع حماية أسبقية الحجز ومنع التعارض على نفس العقار.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchRequestsAndBookings()}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#12A889]" />
                      <span>تحديث الحالات</span>
                    </button>
                  </div>
                </div>

                {/* Quick Summary Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                    <span className="text-[11px] font-bold text-emerald-800 block mb-1">الحجوزات النشطة حالياً</span>
                    <span className="text-2xl font-black text-emerald-900">
                      {bookings.filter(b => b.status === 'active').length}
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
                    <span className="text-[11px] font-bold text-amber-800 block mb-1">الطلبات بانتظار الرد</span>
                    <span className="text-2xl font-black text-amber-900">
                      {requests.filter(r => r.status === 'pending').length}
                    </span>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
                    <span className="text-[11px] font-bold text-blue-800 block mb-1">إجمالي الطلبات المسجلة</span>
                    <span className="text-2xl font-black text-blue-900">{requests.length}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">مدة الحجز الافتراضية</span>
                    <span className="text-base font-black text-slate-900">48 ساعة عمل</span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: Incoming vs Outgoing */}
              <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl max-w-md">
                <button
                  type="button"
                  onClick={() => setResSubTab('incoming')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resSubTab === 'incoming'
                      ? 'bg-white text-[#16324F] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>الواردة على عقاراتي ({requests.filter(r => r.advertiserId === currentUser.id || currentUser.role === 'system_admin').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResSubTab('outgoing')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resSubTab === 'outgoing'
                      ? 'bg-white text-[#16324F] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>طلباتي المرسلة ({requests.filter(r => r.seekerId === currentUser.id).length})</span>
                </button>
              </div>

              {/* SUB-VIEW 1: INCOMING REQUESTS & BOOKINGS (On My Listings) */}
              {resSubTab === 'incoming' && (
                <div className="space-y-6">
                  {/* Active Bookings on My Properties */}
                  {bookings.filter(b => b.advertiserId === currentUser.id || currentUser.role === 'system_admin').length > 0 && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        <span>الحجوزات المؤقتة النشطة والمنتهية على عقاراتي</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {bookings
                          .filter(b => b.advertiserId === currentUser.id || currentUser.role === 'system_admin')
                          .map(bkg => {
                            const isExpired = new Date(bkg.expiresAt).getTime() <= Date.now() || bkg.status === 'expired';
                            const isActive = bkg.status === 'active' && !isExpired;
                            const remainingHours = Math.max(
                              0,
                              Math.round((new Date(bkg.expiresAt).getTime() - Date.now()) / (1000 * 3600))
                            );

                            return (
                              <div
                                key={bkg.id}
                                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                  isActive
                                    ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 opacity-80'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {bkg.bookingNumber}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isActive
                                          ? 'bg-emerald-100 text-emerald-800 flex items-center gap-1'
                                          : bkg.status === 'cancelled'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />}
                                      {isActive ? 'حجز نشط' : bkg.status === 'cancelled' ? 'ملغى' : 'منتهٍ'}
                                    </span>
                                  </div>

                                  {isActive && (
                                    <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                                      متبقي: {remainingHours} ساعة
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                                    {bkg.listingTitle}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    رقم العقار: {bkg.listingNumber}
                                  </p>
                                </div>

                                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">الباحث الحاجز:</span>
                                    <span className="font-bold text-slate-800">{bkg.seekerName}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">هاتف الباحث:</span>
                                    <span className="font-mono font-bold text-slate-800" dir="ltr">{bkg.seekerPhone}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">تاريخ الانتهاء:</span>
                                    <span className="font-bold text-emerald-900">
                                      {new Date(bkg.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                  </div>
                                  {bkg.cancellationReason && (
                                    <div className="pt-1 text-rose-700 border-t border-slate-100">
                                      سبب الإلغاء: {bkg.cancellationReason}
                                    </div>
                                  )}
                                </div>

                                {isActive && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExtendBookingTarget(bkg);
                                        setExtendHours(24);
                                      }}
                                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                                    >
                                      تمديد المدة
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelBookingModalTarget(bkg);
                                        setCancelBookingReason('');
                                      }}
                                      className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200"
                                    >
                                      إلغاء الحجز
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Incoming Requests on My Properties */}
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#12A889]" />
                        <span>قائمة الطلبات الواردة على عقاراتي ({requests.filter(r => r.advertiserId === currentUser.id || currentUser.role === 'system_admin').length})</span>
                      </div>
                      <span className="text-xs text-slate-500 font-normal">تحديث فوري من الخادم</span>
                    </h3>

                    {requests.filter(r => r.advertiserId === currentUser.id || currentUser.role === 'system_admin').length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="font-bold text-slate-700 text-sm">لا توجد طلبات واردة حالياً</p>
                        <p className="text-xs text-slate-500">عندما يقوم الباحثون بإرسال طلبات حجز أو معاينة لعقاراتك، ستظهر مباشرة هنا لتأكيدها أو رفضها.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requests
                          .filter(r => r.advertiserId === currentUser.id || currentUser.role === 'system_admin')
                          .map(req => {
                            const isPending = req.status === 'pending';
                            const isAccepted = req.status === 'accepted';
                            const isRejected = req.status === 'rejected';
                            const linkedBooking = bookings.find(b => b.requestId === req.id || b.id === req.bookingId);

                            return (
                              <div
                                key={req.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                  isPending
                                    ? 'bg-amber-50/30 border-amber-200'
                                    : isAccepted
                                    ? 'bg-emerald-50/20 border-emerald-200'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {req.requestNumber}
                                    </span>
                                    <span className="text-xs font-bold text-[#16324F]">{req.listingTitle}</span>
                                    <span className="font-mono text-[11px] text-slate-500">({req.listingNumber})</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                                        isPending
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : isAccepted
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                          : isRejected
                                          ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                          : 'bg-slate-200 text-slate-800'
                                      }`}
                                    >
                                      {isPending
                                        ? 'قيد الانتظار'
                                        : isAccepted
                                        ? 'تم القبول وتأكيد الحجز'
                                        : isRejected
                                        ? 'مرفوض'
                                        : 'ملغى'}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-3 text-xs">
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">الباحث:</span>
                                    <span className="font-bold text-slate-900">{req.seekerName}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">رقم الهاتف:</span>
                                    <span className="font-mono font-bold text-slate-900" dir="ltr">{req.seekerPhone}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">نوع الطلب:</span>
                                    <span className="font-bold text-emerald-800">
                                      {req.requestType === 'booking_intent'
                                        ? 'حجز مؤقت وشراء'
                                        : req.requestType === 'visit_inquiry'
                                        ? 'معاينة ميدانية'
                                        : 'عرض سعر تفاوضي'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">المدة المطلوبة:</span>
                                    <span className="font-bold text-slate-800">{req.requestedDurationHours || 48} ساعة</span>
                                  </div>
                                </div>

                                {req.offeredPrice && (
                                  <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 mb-3 flex items-center justify-between">
                                    <span>عرض السعر المقترح من الباحث:</span>
                                    <span className="font-black text-sm text-blue-950">
                                      {req.offeredPrice.toLocaleString()} {req.listingCurrency}
                                    </span>
                                  </div>
                                )}

                                {req.notes && (
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed mb-3">
                                    <span className="font-bold text-slate-900 block mb-0.5">رسالة الباحث:</span>
                                    {req.notes}
                                  </div>
                                )}

                                {/* Active Booking Process Card & Deal Finalization */}
                                {isAccepted && linkedBooking && linkedBooking.status === 'active' && (
                                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                                    <div className="space-y-0.5">
                                      <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>الحجز المؤقت سارٍ برقم [{linkedBooking.bookingNumber}] - العقار محجوب حصرياً</span>
                                      </div>
                                      <p className="text-[11px] text-emerald-800">
                                        ينتهي الحجز في: {new Date(linkedBooking.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (window.confirm('هل تؤكد إتمام الصفقة (بيع أو إيجار)؟ سيتم تحديث حالة الإعلان إلى (تمت الصفقة) وإغلاقه نهائياً ولن يعود للظهور العام.')) {
                                            await completeBooking(linkedBooking.id, 'تمت الصفقة بنجاح وتم توقيع العقد ونقل الملكية');
                                          }
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>إتمام الصفقة (بيع/تأجير)</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExtendBookingTarget(linkedBooking);
                                          setExtendHours(24);
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition-colors cursor-pointer"
                                      >
                                        تمديد الحجز
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCancelBookingModalTarget(linkedBooking);
                                          setCancelBookingReason('');
                                        }}
                                        className="py-1.5 px-3 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
                                      >
                                        إلغاء الحجز وإعادة الإتاحة
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isPending && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAcceptModalRequest(req);
                                        setAcceptDuration(req.requestedDurationHours || 48);
                                        setAcceptNotes('');
                                      }}
                                      className="py-2 px-4 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>قبول وتأكيد الحجز المؤقت</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectModalRequest(req);
                                        setRejectReason('');
                                      }}
                                      className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                                    >
                                      <span>اعتذار ورفض الطلب</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: OUTGOING REQUESTS & BOOKINGS (Sent by Me) */}
              {resSubTab === 'outgoing' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-[#12A889]" />
                      <span>طلباتي وحجوزاتي المرسلة ({requests.filter(r => r.seekerId === currentUser.id).length})</span>
                    </div>
                  </h3>

                  {requests.filter(r => r.seekerId === currentUser.id).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">لم تقم بإرسال أي طلبات حجز بعد</p>
                      <p className="text-xs text-slate-500">تصفح العقارات المعروضة واضغط على «طلب حجز مؤقت أو معاينة ميدانية» لتقديم طلبك مباشرة.</p>
                      <button
                        type="button"
                        onClick={() => onNavigate('search')}
                        className="mt-2 px-5 py-2 rounded-xl bg-[#12A889] text-white text-xs font-bold shadow-xs hover:bg-[#0f8e74] transition-colors"
                      >
                        استعراض العقارات المتاحة
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {requests
                        .filter(r => r.seekerId === currentUser.id)
                        .map(req => {
                          const isPending = req.status === 'pending';
                          const isAccepted = req.status === 'accepted';
                          const isRejected = req.status === 'rejected';
                          const linkedBooking = bookings.find(b => b.requestId === req.id || b.id === req.bookingId);

                          return (
                            <div
                              key={req.id}
                              className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                                isPending
                                  ? 'bg-amber-50/20 border-amber-200'
                                  : isAccepted
                                  ? 'bg-emerald-50/30 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {req.requestNumber}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-mono">{req.createdAt}</span>
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-sm">{req.listingTitle}</h4>
                                </div>

                                <div>
                                  <span
                                    className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                      isPending
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : isAccepted
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5'
                                        : isRejected
                                        ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                        : 'bg-slate-200 text-slate-800'
                                    }`}
                                  >
                                    {isAccepted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />}
                                    {isPending
                                      ? 'قيد مراجعة المعلن'
                                      : isAccepted
                                      ? 'مقبول - حجز مؤقت مفعل'
                                      : isRejected
                                      ? 'اعتذر المعلن عن الطلب'
                                      : 'ملغى'}
                                  </span>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 block mb-0.5">المعلن المسؤول:</span>
                                  <span className="font-bold text-slate-900">{req.advertiserName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-0.5">هاتف المعلن:</span>
                                  <span className="font-mono font-bold text-slate-900" dir="ltr">{req.advertiserPhone}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-0.5">نوع الطلب:</span>
                                  <span className="font-bold text-emerald-800">
                                    {req.requestType === 'booking_intent'
                                      ? 'حجز مؤقت وشراء'
                                      : req.requestType === 'visit_inquiry'
                                      ? 'معاينة ميدانية'
                                      : 'تقديم عرض سعر'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-0.5">المدة المطلوبة:</span>
                                  <span className="font-bold text-slate-800">{req.requestedDurationHours || 48} ساعة</span>
                                </div>
                              </div>

                              {/* If Accepted & Active Booking Details */}
                              {linkedBooking && linkedBooking.status === 'active' && (
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>حجزك المؤقت فعال برقم [{linkedBooking.bookingNumber}]</span>
                                    </div>
                                    <p className="text-[11px] text-emerald-800">
                                      ينتهي الحجز في: {new Date(linkedBooking.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelBookingModalTarget(linkedBooking);
                                      setCancelBookingReason('');
                                    }}
                                    className="py-1.5 px-3 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors self-start sm:self-center"
                                  >
                                    إلغاء حجز العقار
                                  </button>
                                </div>
                              )}

                              {req.rejectionReason && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                                  <span className="font-bold block mb-0.5">ملاحظات المعلن عند الرفض:</span>
                                  {req.rejectionReason}
                                </div>
                              )}

                              {isPending && (
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm('هل أنت متأكد من رغبتك بإلغاء هذا الطلب؟')) {
                                        await cancelPropertyRequest(req.id, 'إلغاء بطلب الباحث');
                                      }
                                    }}
                                    className="py-1.5 px-3.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                                  >
                                    إلغاء الطلب
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ACCEPT REQUEST MODAL */}
          {acceptModalRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 text-right"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>تأكيد الحجز المؤقت</span>
                  </div>
                  <button
                    onClick={() => setAcceptModalRequest(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-2">
                  <p>
                    أنت بصدد قبول الطلب على العقار{' '}
                    <strong className="text-slate-900">{acceptModalRequest.listingTitle}</strong> لصالح الباحث{' '}
                    <strong className="text-slate-900">{acceptModalRequest.seekerName}</strong>.
                  </p>
                  <p className="text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    تنبيه: سيتم حجز العقار مؤقتاً ومنع تأكيد أي حجوزات متعارضة طوال مدة الحجز المختارة.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">تحديد مدة الحجز المعتمدة:</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { h: 24, label: '24 ساعة' },
                      { h: 48, label: '48 ساعة (المعتاد)' },
                      { h: 72, label: '72 ساعة' },
                      { h: 120, label: '5 أيام' },
                      { h: 168, label: '7 أيام' }
                    ].map(item => (
                      <button
                        key={item.h}
                        type="button"
                        onClick={() => setAcceptDuration(item.h)}
                        className={`py-2 px-1 text-center rounded-xl border font-bold transition-all ${
                          acceptDuration === item.h
                            ? 'bg-[#12A889] text-white border-[#12A889]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">ملاحظات للمشتري / الباحث:</label>
                  <textarea
                    value={acceptNotes}
                    onChange={e => setAcceptNotes(e.target.value)}
                    rows={2}
                    placeholder="مرحباً، تم تأكيد حجز العقار بانتظار حضوركم غداً لمعاينة أصل البصيرة..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#12A889]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAcceptModalRequest(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isAccepting}
                    onClick={async () => {
                      setIsAccepting(true);
                      await acceptPropertyRequest(acceptModalRequest.id, acceptDuration, acceptNotes);
                      setIsAccepting(false);
                      setAcceptModalRequest(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAccepting ? 'جاري التأكيد...' : 'تأكيد الحجز الآن'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REJECT REQUEST MODAL */}
          {rejectModalRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 text-right"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>اعتذار ورفض الطلب</span>
                  </div>
                  <button
                    onClick={() => setRejectModalRequest(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  يرجى توضيح سبب الاعتذار للباحث{' '}
                  <strong className="text-slate-900">{rejectModalRequest.seekerName}</strong>:
                </p>

                <div>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="مثال: العقار مباع مسبقاً، أو السعر المقترح غير مناسب، أو عدم توفر المالك حالياً..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectModalRequest(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isRejecting}
                    onClick={async () => {
                      setIsRejecting(true);
                      await rejectPropertyRequest(rejectModalRequest.id, rejectReason || 'اعتذار المعلن لعدم ملاءمة الشروط');
                      setIsRejecting(false);
                      setRejectModalRequest(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isRejecting ? 'جاري التسجيل...' : 'تأكيد الرفض'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CANCEL BOOKING MODAL */}
          {cancelBookingModalTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 text-right"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>إلغاء الحجز المؤقت وإتاحة العقار</span>
                  </div>
                  <button
                    onClick={() => setCancelBookingModalTarget(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  هل أنت متأكد من إلغاء الحجز المؤقت رقم{' '}
                  <strong className="text-slate-900">{cancelBookingModalTarget.bookingNumber}</strong>؟ عند الإلغاء، سيتم رفع القفل فوراً وإعادة العقار متاحاً للحجوزات الأخرى.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">سبب الإلغاء:</label>
                  <input
                    type="text"
                    value={cancelBookingReason}
                    onChange={e => setCancelBookingReason(e.target.value)}
                    placeholder="مثال: تم إلغاء الاتفاق ودياً أو تراجع المشتري..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelBookingModalTarget(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    disabled={isCancellingBooking}
                    onClick={async () => {
                      setIsCancellingBooking(true);
                      await cancelBooking(cancelBookingModalTarget.id, cancelBookingReason || 'إلغاء بطلب المستخدم');
                      setIsCancellingBooking(false);
                      setCancelBookingModalTarget(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCancellingBooking ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EXTEND BOOKING MODAL */}
          {extendBookingTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 text-right"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                    <Clock className="w-5 h-5 text-[#12A889]" />
                    <span>تمديد مدة الحجز المؤقت</span>
                  </div>
                  <button
                    onClick={() => setExtendBookingTarget(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  تمديد الحجز رقم{' '}
                  <strong className="text-slate-900">{extendBookingTarget.bookingNumber}</strong> على العقار{' '}
                  <strong className="text-slate-900">{extendBookingTarget.listingTitle}</strong>:
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">المدة الإضافية:</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { h: 24, label: '+24 ساعة (يوم)' },
                      { h: 48, label: '+48 ساعة (يومان)' },
                      { h: 72, label: '+72 ساعة (3 أيام)' }
                    ].map(item => (
                      <button
                        key={item.h}
                        type="button"
                        onClick={() => setExtendHours(item.h)}
                        className={`py-2 px-1 text-center rounded-xl border font-bold transition-all ${
                          extendHours === item.h
                            ? 'bg-[#12A889] text-white border-[#12A889]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setExtendBookingTarget(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isExtendingBooking}
                    onClick={async () => {
                      setIsExtendingBooking(true);
                      await extendBooking(extendBookingTarget.id, extendHours);
                      setIsExtendingBooking(false);
                      setExtendBookingTarget(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isExtendingBooking ? 'جاري التمديد...' : 'تأكيد التمديد'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERSHIP & PERMISSIONS */}
          {activeTab === 'membership' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#12A889]" />
                  <span>نوع الحساب، الرتبة، والصلاحيات المعتمدة</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  تعتمد المنصة مصفوفة صلاحيات دقيقة مبنية على 10 أدوار وظيفية (10-Role RBAC) لضمان حوكمة السوق العقاري اليمني ومنع تضارب المصالح.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-slate-500 block">تفاصيل الدور الحالي</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#16324F] text-white flex items-center justify-center font-bold">
                      <Shield className="w-5 h-5 text-[#12A889]" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#16324F]">{getRoleLabel(currentUser.role)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Role ID: {currentUser.role}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/60">
                    {currentUser.role === 'advertiser' && 'أنت معلن فردي معتمد؛ يمكنك إضافة الإعلانات العقارية وإرسالها للمراجعة، وتعديل إعلاناتك الخاصة.'}
                    {currentUser.role === 'seeker' && 'أنت باحث مسجل عن عقار؛ يمكنك استعراض العقارات المنشورة وحفظ المفضلة والتواصل المباشر مع الملاك.'}
                    {currentUser.role === 'org_manager' && 'أنت مدير منشأة عقارية؛ يمكنك إدارة وكلاء المكتب العقاري والإشراف على كافة إعلانات المكتب.'}
                    {currentUser.role === 'org_agent' && 'أنت وكيل عقاري مفوض؛ يمكنك إدارة العقارات المسندة إليك من مكتبك العقاري.'}
                    {currentUser.role === 'moderator' && 'أنت مشرف مراجعة المحتوى؛ تتولى تدقيق الإعلانات قبل نشرها والتأكد من مطابقتها للمعايير.'}
                    {currentUser.role === 'verifier' && 'أنت مسؤول التحقق؛ تفحص أصول بصائر الملكية والوثائق العرفية وتمنح الشارات الرسمية.'}
                    {currentUser.role === 'reporter_admin' && 'أنت مسؤول البلاغات والنزاعات؛ تتولى حماية المشترين من الاحتيال وتجميد العقارات المخالفة.'}
                    {currentUser.role === 'support' && 'أنت ممثل الدعم الفني؛ تتواصل مع المستخدمين وتساعدهم في حل مشاكل الحسابات والعقارات.'}
                    {currentUser.role === 'accountant' && 'أنت المحاسب المالي؛ تشرف على إيرادات الباقات وفواتير الاشتراك والحسابات البنكية.'}
                    {currentUser.role === 'system_admin' && 'أنت مدير النظام العام؛ تمتلك الصلاحيات السيادية الكاملة للرقابة وإدارة الكادر والنسخ الاحتياطي.'}
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-slate-500 block">الانتماء المؤسسي والمنشأة العقارية</span>
                  {currentUser.orgName ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Building className="w-4 h-4 text-teal-600" />
                        <span>{currentUser.orgName}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">Org ID: {currentUser.orgId}</div>
                      <button
                        onClick={() => onNavigate('organization')}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>الانتقال للوحة إدارة المنشأة</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-3">
                      <span>حساب فردي غير مرتبط بمكتب عقاري. إذا كنت تمتلك مكتباً أو شركة وساطة عقارية، يمكنك تقديم طلب توثيق منشأة عبر لوحة الدعم.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security policy note */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block mb-0.5">ضابط أمني صارم لمنع الترقية الذاتية في بيئة الإنتاج:</span>
                  <span>في البيئة التشغيلية، تخضع الصلاحيات لتدقيق أمني على مستوى الخادم وسجل الرقابة غير القابل للتلاعب. وفي بيئة العرض، يمكنك أدناه اختبار الأدوار العشرة ومحاكاة تجربة كل دور والتحقق من قيود العزل المفروضة.</span>
                </div>
              </div>

              {/* 10-Role RBAC Simulator Grid inside Membership Tab */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#12A889]" />
                    <h3 className="text-sm font-black text-slate-900">محاكي الأدوار والصلاحيات الـ 10 (اختبار فوري)</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">انقر على أي دور للمحاكاة الفورية وفحص الصلاحيات</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROLES_INFO.map(item => {
                    const isSelected = item.role === currentUser.role;
                    return (
                      <div
                        key={item.role}
                        onClick={() => {
                          setCurrentUserRole(item.role);
                          showToast(`تم تبديل الدور إلى [${item.title}] بنجاح`, 'success');
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-[#12A889] bg-[#12A889]/5 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                              {item.icon}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#16324F] flex items-center gap-1.5">
                                <span>{item.title}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#12A889]" />}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Role: {item.role}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${item.color}`}>
                            {item.badge}
                          </span>
                        </div>

                        <div className="space-y-1 mt-2 text-[11px] border-t border-slate-100 pt-2">
                          <div className="text-emerald-700">
                            <span className="font-bold">متاح: </span>
                            <span>{item.allowed.slice(0, 2).join(' • ')}</span>
                          </div>
                          <div className="text-slate-400">
                            <span className="font-bold">محظور: </span>
                            <span>{item.restricted.slice(0, 1).join(' • ')}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-2.5 text-center py-1 bg-[#12A889] text-white rounded-lg text-[10px] font-bold">
                            الدور النشط حالياً في الجلسة
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onNavigate('support')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Headphones className="w-4 h-4 text-[#12A889]" />
                  <span>طلب ترقية أو تعديل بيانات الاعتماد عبر الدعم</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#12A889]" />
                  <span>الأمان، توثيق الهاتف، وإدارة الجلسات المفتوحة</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  مراقبة الأجهزة والجلسات المسجلة بحسابك وإمكانية طرد أي جهاز غير معروف فورياً لحماية بياناتك.
                </p>
              </div>

              {/* Phone security card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block">رقم الهاتف المؤكد للتحقق الثنائي (2FA)</span>
                    <span className="text-sm font-mono font-bold text-slate-900">{currentUser.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>مؤكد ومحمي برمز SMS</span>
                  </span>
                </div>
              </div>

              {/* Active Sessions list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#12A889]" />
                    <span>الجلسات والأجهزة النشطة ({userSessions.length || 1})</span>
                  </h3>

                  <button
                    onClick={fetchUserSessions}
                    className="text-xs text-[#12A889] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                    <span>تحديث الجلسات</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Current Active Session (Always visible) */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span>هذا الجهاز (الجلسة الحالية)</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px]">نشطة الآن</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          المتصفح: Chrome 128 / النظام: Web Client · الموقع: صنعاء، اليمن
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-emerald-800 font-bold self-end sm:self-center">
                      جلسة محمية
                    </span>
                  </div>

                  {/* Other Sessions from Server */}
                  {userSessions.filter(s => !s.isCurrentSession && s.id !== 'sess-current').map(session => (
                    <div
                      key={session.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                          {session.deviceType === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {session.deviceType === 'mobile' ? 'هاتف ذكي (تطبيق الجوال)' : 'متصفح حاسوب مكتبي'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            IP: {session.ipAddress} · الموقع: {session.location} · آخر نشاط: {session.lastActiveAt || 'منذ قليل'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTerminateSession(session.id || session.sessionId || '')}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-all flex items-center gap-1 cursor-pointer self-end sm:self-center"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>إنهاء وطرد الجلسة</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PREFERENCES & ALERTS */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#12A889]" />
                  <span>تفضيلات الاستخدام، العملة، والإشعارات</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  خصص طريقة عرض الأسعار واستقبال التنبيهات بما يناسب طبيعة نشاطك في السوق العقاري.
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Currency preference */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-900">
                    العملة المفضلة لعرض وتثمين العقارات
                  </label>
                  <p className="text-[11px] text-slate-500">
                    العملات الثلاث الأكثر تداولاً واعتماداً في السوق العقاري اليمني:
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrencyPref('YER')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        currencyPref === 'YER'
                          ? 'bg-[#16324F] text-white border-[#16324F] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>ريال يمني (YER)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrencyPref('USD')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        currencyPref === 'USD'
                          ? 'bg-[#16324F] text-white border-[#16324F] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>دولار أمريكي (USD)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrencyPref('SAR')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        currencyPref === 'SAR'
                          ? 'bg-[#16324F] text-white border-[#16324F] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>ريال سعودي (SAR)</span>
                    </button>
                  </div>
                </div>

                {/* Notifications Toggles */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="block text-xs font-bold text-slate-900">قنوات استقبال الإشعارات والتنبيهات</span>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#12A889]" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">إشعارات الرسائل القصيرة (SMS)</span>
                        <span className="text-[11px] text-slate-400">تنبيهات فورية عند اعتماد إعلاناتك أو ورود استفسارات جديدة</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={e => setSmsAlerts(e.target.checked)}
                      className="w-4 h-4 accent-[#12A889] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#12A889]" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">إشعارات البريد الإلكتروني</span>
                        <span className="text-[11px] text-slate-400">ملخصات أسبوعية بحركة السوق وتغيرات أسعار العقارات المفضلة</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={e => setEmailAlerts(e.target.checked)}
                      className="w-4 h-4 accent-[#12A889] cursor-pointer"
                    />
                  </label>
                </div>

                {/* Font Size & Accessibility */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="block text-xs font-bold text-slate-900">حجم الخط وإمكانية الوصول</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFontSizePref('normal')}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        fontSizePref === 'normal'
                          ? 'bg-[#12A889] text-white border-[#12A889]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      عادي (قياسي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSizePref('large')}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        fontSizePref === 'large'
                          ? 'bg-[#12A889] text-white border-[#12A889]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      خط كبير وواضح
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0fa37f] text-white text-xs font-bold shadow-md shadow-[#12A889]/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>تطبيق وحفظ التفضيلات</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PERSONAL ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#12A889]" />
                    <span>سجل أنشطتي وعملياتي في المنظومة</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    سجل شفاف وخاص بك فقط يوثق كافة الإجراءات التي قمت بها (إعلاناتك، بلاغاتك، وتذاكرك) لضمان الأمان والمتابعة.
                  </p>
                </div>

                <button
                  onClick={fetchPersonalActivity}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>تحديث السجل</span>
                </button>
              </div>

              {/* Activity Search Filter */}
              <div className="max-w-md">
                <input
                  type="text"
                  value={activitySearch}
                  onChange={e => setActivitySearch(e.target.value)}
                  placeholder="ابحث في سجلك (بالعملية أو التاريخ)..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#12A889]"
                />
              </div>

              {/* Logs table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                {loadingLogs ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-[#12A889]" />
                    <span>جارٍ تحميل سجل العمليات من الخادم...</span>
                  </div>
                ) : personalLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>لا توجد عمليات مسجلة حتى الآن. ستظهر هنا كافة نشاطاتك بمجرد البدء بإضافة إعلانات أو حفظ عقارات.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {personalLogs
                      .filter(l => !activitySearch || l.action.includes(activitySearch) || l.details.includes(activitySearch) || l.timestamp.includes(activitySearch))
                      .map(log => (
                        <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{log.action}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.result === 'success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.result === 'warning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {log.result === 'success' ? 'ناجحة' : log.result === 'warning' ? 'تنبيه' : 'مرفوضة'}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">{log.details}</p>
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono shrink-0">
                            {log.timestamp}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-[#12A889]" />
                  <span>روابط واختصارات سريعة للوجهات الرئيسية</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  انتقل بضغطة واحدة إلى الأقسام التي تهمك مع أرقام حقيقية محدثة من قاعدة البيانات.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  onClick={() => onNavigate('my_ads')}
                  className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 transition-all text-right group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                    <Grid className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">لوحة إعلاناتي</h3>
                  <p className="text-slate-500 text-xs mb-2">إدارة ومتابعة عقاراتك المعلنة وتحديث أسعارها.</p>
                  <span className="text-xs font-black text-[#12A889] font-mono">
                    {myListingsCount} عقار مسجل ←
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('favorites')}
                  className="p-5 rounded-2xl bg-slate-50 hover:bg-rose-50/40 border border-slate-200/80 hover:border-rose-300 transition-all text-right group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">عقاراتي المفضلة</h3>
                  <p className="text-slate-500 text-xs mb-2">العقارات التي قمت بحفظها للمقارنة والمتابعة.</p>
                  <span className="text-xs font-black text-rose-600 font-mono">
                    {favorites.length} عقار محفوظ ←
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('support')}
                  className="p-5 rounded-2xl bg-slate-50 hover:bg-sky-50/40 border border-slate-200/80 hover:border-sky-300 transition-all text-right group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">تذاكر الدعم والمساندة</h3>
                  <p className="text-slate-500 text-xs mb-2">التواصل مع خدمة العملاء وحل الاستفسارات.</p>
                  <span className="text-xs font-black text-sky-700 font-mono">
                    {myTicketsCount} تذكرة مفتوحة ←
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('help')}
                  className="p-5 rounded-2xl bg-slate-50 hover:bg-amber-50/40 border border-slate-200/80 hover:border-amber-300 transition-all text-right group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">سياسات النشر وشروط الاستخدام</h3>
                  <p className="text-slate-500 text-xs mb-2">الاطلاع على الضوابط القانونية وقواعد حماية السوق.</p>
                  <span className="text-xs font-black text-amber-700">
                    استعراض السياسات ←
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY, DATA EXPORT & ACCOUNT ACTIONS */}
          {activeTab === 'privacy' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-rose-600" />
                  <span>الخصوصية، تصدير البيانات، وإجراءات الحساب الحساسة</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  حقوقك في امتلاك بياناتك وتصديرها، وخيارات إيقاف الحساب أو تسجيل الخروج الآمن.
                </p>
              </div>

              {/* Data Portability / Export */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#12A889]" />
                    <span>تصدير نسخة كاملة من بياناتي (JSON Export)</span>
                  </span>
                  <p className="text-slate-500 text-xs max-w-lg leading-relaxed">
                    يتيح لك هذا الخيار تنزيل أرشيف رقمي منظم يحتوي على بيانات ملفك الشخصي، قائمة عقاراتك المعلنة، بلاغاتك وتذاكرك، وسجل أنشطتك دون أي بيانات سرية أو رموز أمنية.
                  </p>
                </div>

                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="px-5 py-2.5 rounded-xl bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جارٍ التوليد...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل الملف (JSON)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sensitive Zone */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>المنطقة الحساسة لإجراءات الحساب</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sign Out Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block mb-1">تسجيل الخروج من الجلسة الحالية</span>
                      <p className="text-[11px] text-slate-500">
                        إنهاء الجلسة والعودة لتصفح المنصة كزائر غير مسجل مع الحفاظ التام على بيانات حسابك.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        logoutUser();
                        onNavigate('home');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>

                  {/* Deactivate Card */}
                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-rose-900 text-xs block mb-1">تعطيل الحساب مؤقتاً (Deactivation)</span>
                      <p className="text-[11px] text-rose-700">
                        سيتم حجب إعلاناتك من العرض العام وإلغاء تسجيل الدخول في كافة الأجهزة مع إمكانية إعادة التفعيل لاحقاً.
                      </p>
                    </div>

                    <button
                      onClick={() => setDeactivateModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تعطيل هذا الحساب</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* 4. Confirmation Modal for Account Deactivation */}
      {deactivateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                تأكيد طلب تعطيل الحساب الشخصي
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في تعطيل حسابك على منصة دلنّي؟ سيترتب على هذا الإجراء ما يلي:
              </p>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1.5 font-medium">
              <div className="flex items-center gap-1.5">
                <span>•</span>
                <span>إخفاء وحجب جميع إعلاناتك العقارية المنشورة عن الجمهور.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>•</span>
                <span>إنهاء الجلسات النشطة على كافة أجهزتك فورياً.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>•</span>
                <span>تبقى بياناتك ومستنداتك محفوظة بشكل آمن لتمكينك من إعادة التفعيل.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeactivating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ التعطيل...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد تعطيل الحساب</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setDeactivateModalOpen(false)}
                disabled={isDeactivating}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
