import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PropertyRequest, PropertyBooking, Listing } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Phone,
  MessageCircle,
  Search,
  Filter,
  ArrowRight,
  Building2,
  User,
  ShieldCheck,
  CalendarCheck,
  RefreshCw,
  FileText,
  DollarSign,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Tag,
  Share2,
  Eye,
  Check,
  X,
  FileCheck,
  Printer
} from 'lucide-react';
import { BookingDealWorkspaceModal } from '../components/BookingDealWorkspaceModal';
import { ContractDocumentModal } from '../components/ContractDocumentModal';

interface BookingsManagementPageProps {
  onNavigateHome: () => void;
  onSelectListing: (listing: Listing) => void;
  initialRoleView?: 'seeker' | 'advertiser';
  onOpenAuth: (mode: 'login' | 'register') => void;
}

// Live Countdown Component for active reservations (Requirement 5)
const ReservationCountdown: React.FC<{ expiresAt: string; durationHours?: number }> = ({ expiresAt, durationHours = 48 }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    totalRemainingMs: number;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false, totalRemainingMs: 0 });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, totalRemainingMs: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false, totalRemainingMs: diff });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span>انتهت مهلة الحجز المحددة</span>
      </span>
    );
  }

  const isUrgent = timeLeft.hours < 6;
  const isModerate = timeLeft.hours < 24;

  const badgeColor = isUrgent
    ? 'bg-rose-50 text-rose-800 border-rose-200'
    : isModerate
    ? 'bg-amber-50 text-amber-900 border-amber-200'
    : 'bg-emerald-50 text-emerald-900 border-emerald-200';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-2xs ${badgeColor}`}>
      <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`} />
      <span>
        المتبقي: {timeLeft.hours} س : {timeLeft.minutes} د : {timeLeft.seconds} ث
      </span>
    </div>
  );
};

export const BookingsManagementPage: React.FC<BookingsManagementPageProps> = ({
  onNavigateHome,
  onSelectListing,
  initialRoleView,
  onOpenAuth
}) => {
  const {
    currentUser,
    requests,
    bookings,
    listings,
    contracts,
    generateContractFromBooking,
    acceptPropertyRequest,
    rejectPropertyRequest,
    cancelPropertyRequest,
    cancelBooking,
    extendBooking,
    completeBooking,
    fetchRequestsAndBookings,
    showToast
  } = useApp();

  const isAdvertiserRole = ['advertiser', 'org_manager', 'org_agent', 'system_admin'].includes(currentUser.role);

  // Tab: 'seeker' (طلباتي كباحث) OR 'advertiser' (الطلبات الواردة كمعلن)
  const [activeTab, setActiveTab] = useState<'seeker' | 'advertiser'>(() => {
    try {
      const stored = sessionStorage.getItem('dalani_bookings_active_tab');
      if (stored === 'seeker' || stored === 'advertiser') return stored;
    } catch {}
    if (initialRoleView) return initialRoleView;
    return isAdvertiserRole ? 'advertiser' : 'seeker';
  });

  const handleTabChange = (tab: 'seeker' | 'advertiser') => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem('dalani_bookings_active_tab', tab);
    } catch {}
  };

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'cancelled_or_rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Action Modals State
  const [acceptModalRequest, setAcceptModalRequest] = useState<PropertyRequest | null>(null);
  const [acceptDuration, setAcceptDuration] = useState<number>(48);
  const [acceptNotes, setAcceptNotes] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState(false);

  const [rejectModalRequest, setRejectModalRequest] = useState<PropertyRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [cancelBookingTarget, setCancelBookingTarget] = useState<PropertyBooking | null>(null);
  const [cancelBookingReason, setCancelBookingReason] = useState<string>('');
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  const [extendBookingTarget, setExtendBookingTarget] = useState<PropertyBooking | null>(null);
  const [extendHours, setExtendHours] = useState<number>(24);
  const [isExtendingBooking, setIsExtendingBooking] = useState(false);

  const [cancelRequestTarget, setCancelRequestTarget] = useState<PropertyRequest | null>(null);
  const [cancelRequestReason, setCancelRequestReason] = useState<string>('');
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);

  const [completeBookingTarget, setCompleteBookingTarget] = useState<PropertyBooking | null>(null);
  const [completeDealNotes, setCompleteDealNotes] = useState<string>('');
  const [isCompletingDeal, setIsCompletingDeal] = useState(false);

  // Deal Follow-up Workspace Modal State (Persisted in sessionStorage)
  const [selectedDealBookingId, setSelectedDealBookingId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('dalani_selected_deal_booking_id') || null;
    } catch {
      return null;
    }
  });

  const handleOpenDealWorkspace = (bookingId: string) => {
    setSelectedDealBookingId(bookingId);
    try {
      sessionStorage.setItem('dalani_selected_deal_booking_id', bookingId);
    } catch {}
  };

  const handleCloseDealWorkspace = () => {
    setSelectedDealBookingId(null);
    try {
      sessionStorage.removeItem('dalani_selected_deal_booking_id');
    } catch {}
  };

  // Contract Document Modal State (Requirement 1, 4, 8, 9) (Persisted in sessionStorage)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('dalani_selected_contract_id') || null;
    } catch { return null; }
  });
  const [selectedContractBookingId, setSelectedContractBookingId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('dalani_selected_contract_booking_id') || null;
    } catch { return null; }
  });

  const handleOpenContractById = (contractId: string) => {
    setSelectedContractId(contractId);
    try {
      sessionStorage.setItem('dalani_selected_contract_id', contractId);
    } catch {}
  };

  const handleOpenContractByBookingId = (bookingId: string) => {
    setSelectedContractBookingId(bookingId);
    try {
      sessionStorage.setItem('dalani_selected_contract_booking_id', bookingId);
    } catch {}
  };

  const handleCloseContractModal = () => {
    setSelectedContractId(null);
    setSelectedContractBookingId(null);
    try {
      sessionStorage.removeItem('dalani_selected_contract_id');
      sessionStorage.removeItem('dalani_selected_contract_booking_id');
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRequestsAndBookings();
      showToast('تم تحديث قائمة الطلبات والحجوزات', 'info');
    } catch {
      showToast('تعذر التحديث', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Seeker Requests & Bookings (طلبات الباحث)
  const seekerRequests = requests.filter(r => r.seekerId === currentUser.id);

  // Advertiser Incoming Requests & Managed Bookings
  const advertiserRequests = requests.filter(r => {
    if (currentUser.role === 'system_admin') return true;
    if (r.advertiserId === currentUser.id) return true;
    const listing = listings.find(l => l.id === r.listingId);
    if (currentUser.role === 'org_manager' && currentUser.orgId && listing?.advertiser.orgId === currentUser.orgId) return true;
    if (currentUser.role === 'org_agent' && listing?.assignedAgentId === currentUser.id) return true;
    return false;
  });

  // Calculate Counters
  const seekerActiveBookingsCount = bookings.filter(b => b.seekerId === currentUser.id && b.status === 'active').length;
  const seekerPendingCount = seekerRequests.filter(r => r.status === 'pending').length;
  const seekerCompletedCount = bookings.filter(b => b.seekerId === currentUser.id && b.status === 'completed').length;

  const advertiserPendingCount = advertiserRequests.filter(r => r.status === 'pending').length;
  const advertiserActiveBookingsCount = bookings.filter(b => {
    if (currentUser.role === 'system_admin') return b.status === 'active';
    if (b.advertiserId === currentUser.id) return b.status === 'active';
    const listing = listings.find(l => l.id === b.listingId);
    return currentUser.role === 'org_manager' && currentUser.orgId && listing?.advertiser.orgId === currentUser.orgId && b.status === 'active';
  }).length;
  const advertiserCompletedCount = bookings.filter(b => {
    if (currentUser.role === 'system_admin') return b.status === 'completed';
    return b.advertiserId === currentUser.id && b.status === 'completed';
  }).length;

  // Filter active dataset based on active tab
  const currentRequestsList = activeTab === 'seeker' ? seekerRequests : advertiserRequests;

  const filteredRequests = currentRequestsList.filter(req => {
    const linkedBooking = req.bookingId ? bookings.find(b => b.id === req.bookingId) : undefined;
    const bookingStatus = linkedBooking?.status;

    // Filter by status tab
    if (statusFilter === 'pending' && req.status !== 'pending') return false;
    if (statusFilter === 'active' && (!linkedBooking || bookingStatus !== 'active')) return false;
    if (statusFilter === 'completed' && (!linkedBooking || bookingStatus !== 'completed')) return false;
    if (statusFilter === 'cancelled_or_rejected') {
      const isReqCancelled = req.status === 'cancelled' || req.status === 'rejected';
      const isBkgCancelled = linkedBooking && (bookingStatus === 'cancelled' || bookingStatus === 'expired');
      if (!isReqCancelled && !isBkgCancelled) return false;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchListingNum = req.listingNumber?.toLowerCase().includes(query);
      const matchTitle = req.listingTitle?.toLowerCase().includes(query);
      const matchSeeker = req.seekerName?.toLowerCase().includes(query) || req.seekerPhone?.includes(query);
      const matchAdvertiser = req.advertiserName?.toLowerCase().includes(query) || req.advertiserPhone?.includes(query);
      const matchBookingNum = linkedBooking?.bookingNumber?.toLowerCase().includes(query);
      if (!matchListingNum && !matchTitle && !matchSeeker && !matchAdvertiser && !matchBookingNum) {
        return false;
      }
    }

    return true;
  });

  // Handle Accept Confirmation
  const confirmAcceptRequest = async () => {
    if (!acceptModalRequest) return;
    setIsAccepting(true);
    try {
      const res = await acceptPropertyRequest(acceptModalRequest.id, acceptDuration, acceptNotes);
      if (res.success) {
        setAcceptModalRequest(null);
      }
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Reject Confirmation
  const confirmRejectRequest = async () => {
    if (!rejectModalRequest) return;
    setIsRejecting(true);
    try {
      const res = await rejectPropertyRequest(rejectModalRequest.id, rejectReason || 'اعتذار المعلن لعدم ملاءمة الشروط');
      if (res.success) {
        setRejectModalRequest(null);
      }
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Cancel Booking Confirmation
  const confirmCancelBooking = async () => {
    if (!cancelBookingTarget) return;
    setIsCancellingBooking(true);
    try {
      const res = await cancelBooking(cancelBookingTarget.id, cancelBookingReason || 'إلغاء باتفاق الطرفين');
      if (res.success) {
        setCancelBookingTarget(null);
      }
    } finally {
      setIsCancellingBooking(false);
    }
  };

  // Handle Extend Booking Confirmation
  const confirmExtendBooking = async () => {
    if (!extendBookingTarget) return;
    setIsExtendingBooking(true);
    try {
      const res = await extendBooking(extendBookingTarget.id, extendHours);
      if (res.success) {
        setExtendBookingTarget(null);
      }
    } finally {
      setIsExtendingBooking(false);
    }
  };

  // Handle Cancel Request Confirmation
  const confirmCancelRequest = async () => {
    if (!cancelRequestTarget) return;
    setIsCancellingRequest(true);
    try {
      const res = await cancelPropertyRequest(cancelRequestTarget.id, cancelRequestReason || 'إلغاء بطلب الباحث');
      if (res.success) {
        setCancelRequestTarget(null);
      }
    } finally {
      setIsCancellingRequest(false);
    }
  };

  // Handle Complete Deal Confirmation
  const confirmCompleteDeal = async () => {
    if (!completeBookingTarget) return;
    setIsCompletingDeal(true);
    try {
      const res = await completeBooking(completeBookingTarget.id, completeDealNotes || 'تمت الصفقة بنجاح وتم نقل الملكية / إبرام عقد الإيجار');
      if (res.success) {
        setCompleteBookingTarget(null);
      }
    } finally {
      setIsCompletingDeal(false);
    }
  };

  if (currentUser.role === 'visitor') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6" dir="rtl">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#16324F]">إدارة الطلبات والحجوزات المؤقتة</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            يتطلب استعراض ومتابعة طلبات حجز العقارات تسجيل الدخول لحسابك المعتمد في المنصة.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuth('login')}
            className="px-6 py-3 bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            تسجيل الدخول الآن
          </button>
          <button
            onClick={onNavigateHome}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
          >
            الرجوع للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#12A889] font-bold mb-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-[#16324F] flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-[#12A889]" />
            <span>إدارة طلبات العقارات والحجوزات المؤقتة</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            متابعة دقيقة لمواعيد انتهاء الحجوزات، فحص الوثائق، وتأكيد أو إلغاء الصفقات بحصرية كاملة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#12A889]' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher: Seeker (طلباتي) vs Advertiser (لوحة المعلن) */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              handleTabChange('seeker');
              setStatusFilter('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'seeker'
                ? 'bg-white text-[#16324F] shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-[#12A889]" />
            <span>طلباتي وحجوزاتي (كباحث)</span>
            {seekerActiveBookingsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono">
                {seekerActiveBookingsCount} نشط
              </span>
            )}
          </button>

          {isAdvertiserRole && (
            <button
              type="button"
              onClick={() => {
                handleTabChange('advertiser');
                setStatusFilter('all');
              }}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'advertiser'
                  ? 'bg-white text-[#16324F] shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#12A889]" />
              <span>لوحة الطلبات الواردة (كمعلن)</span>
              {advertiserPendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse">
                  {advertiserPendingCount} جديد
                </span>
              )}
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 px-2 hidden md:block">
          {activeTab === 'seeker'
            ? 'تتابع هنا العقارات التي طلبت حجزها أو الاستفسار عنها'
            : 'تراجع هنا الطلبات الواردة من الباحثين وتقبلها أو تعتذر عنها'}
        </div>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {activeTab === 'seeker' ? (
          <>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 block">الحجوزات المؤقتة النشطة</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-700 font-mono">{seekerActiveBookingsCount}</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 block">طلبات قيد مراجعة المعلن</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-amber-600 font-mono">{seekerPendingCount}</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 block">صفقات مكتملة (شراء/تأجير)</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#12A889] font-mono">{seekerCompletedCount}</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#12A889] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 block">إجمالي سجل الطلبات</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-800 font-mono">{seekerRequests.length}</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-amber-600 block">طلبات واردة معلقة</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-amber-600 font-mono">{advertiserPendingCount}</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 block">حجوزات مؤقتة سارية حالياً</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-700 font-mono">{advertiserActiveBookingsCount}</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 block">صفقات تم إتمامها بنجاح</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#12A889] font-mono">{advertiserCompletedCount}</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#12A889] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 block">إجمالي الطلبات الواردة</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-800 font-mono">{advertiserRequests.length}</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Bar & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الحجز، رقم الإعلان، اسم أو هاتف الطرف الآخر..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-[#12A889] outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold shrink-0">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'pending', label: 'قيد المراجعة' },
              { id: 'active', label: 'حجوزات سارية' },
              { id: 'completed', label: 'تمت الصفقة' },
              { id: 'cancelled_or_rejected', label: 'ملغى / معتذر عنه' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[#16324F] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Request / Booking Cards List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">لا توجد طلبات أو حجوزات تطابق الفلتر الحالي</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'seeker'
                  ? 'يمكنك تصفح العقارات المتاحة والضغط على زر «طلب حجز العقار» لبدء أول حجز مؤقت.'
                  : 'ستظهر هنا أي طلبات حجز أو معاينة يرسلها الباحثون فور ورودها.'}
              </p>
            </div>
            {activeTab === 'seeker' && (
              <button
                onClick={onNavigateHome}
                className="px-5 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <span>تصفح العقارات المتاحة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>
        ) : (
          filteredRequests.map(req => {
            const linkedBooking = req.bookingId ? bookings.find(b => b.id === req.bookingId) : bookings.find(b => b.requestId === req.id);
            const linkedContract = linkedBooking
              ? contracts.find(c => c.bookingId === linkedBooking.id || c.id === linkedBooking.contractId)
              : contracts.find(c => c.requestId === req.id || c.listingId === req.listingId);
            const targetListing = listings.find(l => l.id === req.listingId);
            const isPending = req.status === 'pending';
            const isAccepted = req.status === 'accepted';
            const isRejected = req.status === 'rejected';
            const isCancelled = req.status === 'cancelled';
            const isBookingActive = linkedBooking?.status === 'active';
            const isBookingCompleted = linkedBooking?.status === 'completed';
            const isBookingCancelled = linkedBooking?.status === 'cancelled';
            const isBookingExpired = linkedBooking?.status === 'expired';

            const isSale = req.listingPurpose === 'sale' || targetListing?.purpose === 'sale';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-3xl border transition-all p-4 sm:p-6 shadow-2xs space-y-4 ${
                  isBookingActive
                    ? 'border-emerald-300 ring-2 ring-emerald-100'
                    : isPending
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Header: Property Info, Status Badge & Countdown */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-start gap-3.5">
                    {req.listingImage ? (
                      <img
                        src={req.listingImage}
                        alt={req.listingTitle}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Building2 className="w-7 h-7" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {req.listingNumber}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isSale ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {isSale ? 'عقار للبيع' : 'عقار للإيجار'}
                        </span>
                        {req.listingGovernorate && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            📍 {req.listingGovernorate}
                          </span>
                        )}
                        {linkedBooking && (
                          <span className="font-mono text-[11px] font-bold bg-[#16324F] text-white px-2 py-0.5 rounded-md">
                            {linkedBooking.bookingNumber}
                          </span>
                        )}
                        {linkedContract && (
                          <span className="font-mono text-[11px] font-bold bg-[#12A889] text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            <span>{linkedContract.contractNumber}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-sm sm:text-base">{req.listingTitle}</h3>
                      <div className="text-xs text-[#12A889] font-black">
                        السعر المعلن: {req.listingPrice.toLocaleString()} {req.listingCurrency}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Status and Live Countdown */}
                  <div className="flex flex-col sm:items-end gap-2 self-start md:self-auto">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {isBookingActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                          <span>حجز مؤقت سارٍ ومقفول حصرياً</span>
                        </span>
                      ) : isBookingCompleted ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-700 text-white font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تمت الصفقة بنجاح</span>
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 font-bold text-xs border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>قيد مراجعة المعلن</span>
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-xs border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>اعتذر المعلن عن الطلب</span>
                        </span>
                      ) : isBookingCancelled || isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                          <span>ملغى</span>
                        </span>
                      ) : isBookingExpired ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">
                          <span>انتهت مهلة الحجز</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {req.status}
                        </span>
                      )}

                      {/* Linked Contract Status Badge (Requirement 8) */}
                      {linkedContract && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border ${
                          linkedContract.status === 'signed'
                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                            : linkedContract.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : linkedContract.status === 'pending_approval'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          <FileCheck className="w-3.5 h-3.5 text-[#12A889]" />
                          <span>
                            {linkedContract.contractType === 'sale' ? 'عقد بيع: ' : 'عقد إيجار: '}
                            {linkedContract.status === 'signed' ? 'موقع رسمياً' :
                             linkedContract.status === 'approved' ? 'معتمد' :
                             linkedContract.status === 'pending_approval' ? 'قيد الاعتماد' :
                             linkedContract.status === 'cancelled' ? 'ملغي' : `مسودة (v${linkedContract.currentVersion})`}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Live Countdown if active booking */}
                    {isBookingActive && linkedBooking?.expiresAt && (
                      <ReservationCountdown
                        expiresAt={linkedBooking.expiresAt}
                        durationHours={linkedBooking.durationHours}
                      />
                    )}
                  </div>
                </div>

                {/* Body Details: Specific to Sale or Rent & Parties Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                  {/* Party Information */}
                  {activeTab === 'advertiser' ? (
                    <div>
                      <span className="text-slate-400 block mb-0.5">الباحث مقدم الطلب:</span>
                      <span className="font-bold text-slate-900 block">{req.seekerName}</span>
                      <div className="flex items-center gap-2 mt-1 font-mono font-bold text-slate-700">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span dir="ltr">{req.seekerPhone}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-400 block mb-0.5">المعلن المسؤول:</span>
                      <span className="font-bold text-slate-900 block">{req.advertiserName}</span>
                      <div className="flex items-center gap-2 mt-1 font-mono font-bold text-slate-700">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span dir="ltr">{req.advertiserPhone}</span>
                      </div>
                    </div>
                  )}

                  {/* Purpose-specific fields */}
                  {isSale ? (
                    <>
                      <div>
                        <span className="text-slate-400 block mb-0.5">طريقة الدفع المقترحة:</span>
                        <span className="font-bold text-slate-800">
                          {req.paymentMethod === 'cash' ? 'نقداً بالكامل' :
                           req.paymentMethod === 'certified_check' ? 'شيك مصرفي مصدق' :
                           req.paymentMethod === 'installments' ? 'أقساط ودفعات' :
                           req.paymentMethod === 'bank_finance' ? 'تسهيل بنكي' :
                           req.paymentMethod || 'نقداً'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">عرض الشراء المقترح:</span>
                        <span className="font-black text-emerald-800">
                          {req.offeredPrice
                            ? `${req.offeredPrice.toLocaleString()} ${req.listingCurrency}`
                            : 'حسب السعر المعلن'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">المدة المطلوبة للحجز:</span>
                        <span className="font-bold text-slate-800">
                          {req.requestedDurationHours || 48} ساعة
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400 block mb-0.5">طبيعة الاستخدام للإيجار:</span>
                        <span className="font-bold text-slate-800">
                          {req.rentalUsageType === 'family' ? 'سكن عائلي' :
                           req.rentalUsageType === 'singles' ? 'سكن عزاب / طلاب' :
                           req.rentalUsageType === 'commercial' ? 'محل تجاري' :
                           req.rentalUsageType === 'office' ? 'مكتب إداري' :
                           req.rentalUsageType || 'سكن'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">مدة العقد والدفع:</span>
                        <span className="font-bold text-slate-800">
                          {req.leaseDurationMonths ? `${req.leaseDurationMonths} شهر` : 'سنة كاملة'} (
                          {req.paymentFrequency === 'monthly' ? 'شهرياً' :
                           req.paymentFrequency === 'quarterly' ? 'ربع سنوي' :
                           req.paymentFrequency === 'semi_annual' ? 'نصف سنوي' :
                           req.paymentFrequency === 'annual' ? 'سنوي' : 'شهرياً'}
                          )
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">المدة المطلوبة للحجز:</span>
                        <span className="font-bold text-slate-800">
                          {req.requestedDurationHours || 48} ساعة
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Additional Notes or Rejection / Cancellation notices */}
                {req.notes && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-0.5">رسالة وملاحظات الطلب:</span>
                    <p>{req.notes}</p>
                  </div>
                )}

                {req.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-0.5">
                    <span className="font-bold block">سبب اعتذار المعلن:</span>
                    <p>{req.rejectionReason}</p>
                  </div>
                )}

                {linkedBooking?.cancellationReason && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-0.5">
                    <span className="font-bold block">سبب إلغاء الحجز:</span>
                    <p>{linkedBooking.cancellationReason}</p>
                    {linkedBooking.cancelledBy && (
                      <span className="text-[11px] text-slate-500 block">بواسطة: {linkedBooking.cancelledBy}</span>
                    )}
                  </div>
                )}

                {/* Linked Contract Highlight Bar (Requirement 7 & 8) */}
                {linkedContract && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>{linkedContract.contractType === 'sale' ? 'عقد بيع عقار شرعي قطعي' : 'عقد إيجار عقار موثق'}</span>
                          <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                            {linkedContract.contractNumber}
                          </span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                            إصدار (v{linkedContract.currentVersion})
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            linkedContract.status === 'signed' ? 'bg-teal-100 text-teal-900' :
                            linkedContract.status === 'approved' ? 'bg-emerald-100 text-emerald-900' :
                            linkedContract.status === 'pending_approval' ? 'bg-purple-100 text-purple-900' :
                            'bg-amber-100 text-amber-900'
                          }`}>
                            {linkedContract.status === 'signed' ? 'موقع رسمياً' :
                             linkedContract.status === 'approved' ? 'معتمد' :
                             linkedContract.status === 'pending_approval' ? 'بانتظار الاعتماد' :
                             linkedContract.status === 'cancelled' ? 'ملغي ومؤرشف' : 'مسودة قيد المراجعة'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          القيمة الإجمالية: {linkedContract.financialTerms.totalAmount.toLocaleString()} {linkedContract.financialTerms.currency} • {linkedContract.clauses.length} بنود قانونية • الأطراف: ({linkedContract.firstParty.name} و {linkedContract.secondParty.name})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenContractById(linkedContract.id);
                          if (linkedBooking) handleOpenContractByBookingId(linkedBooking.id);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>فتح وثيقة العقد والطباعة</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Action Bar according to Role (Requirement 4 & 6) */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
                  {/* View Listing Link */}
                  {targetListing ? (
                    <button
                      type="button"
                      onClick={() => onSelectListing(targetListing)}
                      className="text-xs font-bold text-slate-600 hover:text-[#12A889] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض صفحة العقار</span>
                    </button>
                  ) : <div />}

                  {/* Role Specific Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* ADVERTISER ACTIONS */}
                    {activeTab === 'advertiser' && (
                      <>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setAcceptModalRequest(req);
                                setAcceptDuration(req.requestedDurationHours || 48);
                                setAcceptNotes('');
                              }}
                              className="px-4 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                            >
                              <span>اعتذار ورفض الطلب</span>
                            </button>
                          </>
                        )}

                        {/* Deal Follow-up Workspace Trigger (Advertiser) */}
                        {linkedBooking && (
                          <button
                            type="button"
                            onClick={() => handleOpenDealWorkspace(linkedBooking.id)}
                            className="px-4 py-2 rounded-xl bg-[#16324F] hover:bg-[#0f2438] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ring-2 ring-[#12A889]/30"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>مساحة متابعة الحجز والاتفاق</span>
                          </button>
                        )}

                        {/* Contract Actions (Advertiser) */}
                        {linkedContract ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenContractById(linkedContract.id);
                              if (linkedBooking) handleOpenContractByBookingId(linkedBooking.id);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#16324F] hover:bg-[#0f2438] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>وثيقة العقد [{linkedContract.contractNumber}]</span>
                          </button>
                        ) : linkedBooking && (linkedBooking.termsStatus === 'accepted' || isBookingActive) ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await generateContractFromBooking(linkedBooking.id);
                              if (res.success && res.contract) {
                                handleOpenContractById(res.contract.id);
                                handleOpenContractByBookingId(linkedBooking.id);
                              } else {
                                handleOpenContractByBookingId(linkedBooking.id);
                                handleCloseContractModal();
                                handleOpenContractByBookingId(linkedBooking.id);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>إنشاء مسودة العقد</span>
                          </button>
                        ) : null}

                        {isBookingActive && linkedBooking && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCompleteBookingTarget(linkedBooking);
                                setCompleteDealNotes('');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
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
                              className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 text-emerald-700" />
                              <span>تمديد الحجز</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCancelBookingTarget(linkedBooking);
                                setCancelBookingReason('');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <span>إلغاء الحجز وإعادة الإتاحة</span>
                            </button>
                          </>
                        )}

                        {/* Direct contact with seeker */}
                        <a
                          href={`tel:${req.seekerPhone}`}
                          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>اتصال بالباحث</span>
                        </a>
                      </>
                    )}

                    {/* SEEKER ACTIONS */}
                    {activeTab === 'seeker' && (
                      <>
                        {/* Deal Follow-up Workspace Trigger (Seeker) */}
                        {linkedBooking && (
                          <button
                            type="button"
                            onClick={() => handleOpenDealWorkspace(linkedBooking.id)}
                            className="px-4 py-2 rounded-xl bg-[#16324F] hover:bg-[#0f2438] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ring-2 ring-[#12A889]/30"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>مساحة متابعة الحجز والاتفاق</span>
                          </button>
                        )}

                        {/* Contract Document Button (Seeker) */}
                        {linkedContract ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenContractById(linkedContract.id);
                              if (linkedBooking) handleOpenContractByBookingId(linkedBooking.id);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#16324F] hover:bg-[#0f2438] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>مراجعة وثيقة العقد [{linkedContract.contractNumber}]</span>
                          </button>
                        ) : linkedBooking && (linkedBooking.termsStatus === 'accepted' || isBookingActive) ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await generateContractFromBooking(linkedBooking.id);
                              if (res.success && res.contract) {
                                handleOpenContractById(res.contract.id);
                                handleOpenContractByBookingId(linkedBooking.id);
                              } else {
                                handleOpenContractByBookingId(linkedBooking.id);
                                handleCloseContractModal();
                                handleOpenContractByBookingId(linkedBooking.id);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>إنشاء مسودة العقد</span>
                          </button>
                        ) : null}

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelRequestTarget(req);
                              setCancelRequestReason('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                          >
                            <span>إلغاء الطلب</span>
                          </button>
                        )}

                        {isBookingActive && linkedBooking && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelBookingTarget(linkedBooking);
                              setCancelBookingReason('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>إلغاء الحجز المؤقت</span>
                          </button>
                        )}

                        {/* Direct contact with advertiser */}
                        <a
                          href={`tel:${req.advertiserPhone}`}
                          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#12A889]" />
                          <span>اتصال بالمعلن</span>
                        </a>

                        <a
                          href={`https://wa.me/967${req.advertiserPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
                            `مرحباً، أتابع بخصوص طلبي على العقار [${req.listingNumber}] عبر منصة دلنّي`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>واتساب</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= MODALS SECTION ================= */}

      {/* 1. ACCEPT REQUEST MODAL */}
      {acceptModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>قبول وتأكيد الحجز المؤقت</span>
              </div>
              <button
                onClick={() => setAcceptModalRequest(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
              <p className="font-bold">أنت على وشك تأكيد الحجز لصالح: {acceptModalRequest.seekerName}</p>
              <p className="text-[11px] leading-relaxed">
                سيتم قفل العقار برقم حجز رسمي وإخفاؤه عن نتائج البحث العامة طوال مدة الحجز لتمكين الباحث من معاينة العقار وفحص الوثائق.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مدة سريان الحجز المؤقت:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 48, 72, 120, 168].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setAcceptDuration(h)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        acceptDuration === h
                          ? 'border-[#12A889] bg-[#12A889] text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {h < 48 ? `${h} ساعة` : h === 48 ? '48 ساعة' : h === 72 ? '72 ساعة' : `${h / 24} أيام`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو تعليمات للباحث (اختياري):
                </label>
                <textarea
                  value={acceptNotes}
                  onChange={e => setAcceptNotes(e.target.value)}
                  placeholder="مثال: يرجى الحضور غداً الساعة 4 عصراً لمعاينة أصل البصيرة في مقر المكتب..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#12A889] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAcceptModalRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isAccepting}
                onClick={confirmAcceptRequest}
                className="px-5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAccepting ? 'جاري التأكيد...' : 'تأكيد وقفل العقار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REJECT REQUEST MODAL */}
      {rejectModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>الاعتذار عن قبول الطلب</span>
              </div>
              <button
                onClick={() => setRejectModalRequest(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                يرجى كتابة سبب الاعتذار لتوضيحه للباحث وإشعاره به بشفافية:
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="مثال: نعتذر لعدم مناسبة السعر المقترح أو لوجود حجز مسبق..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={confirmRejectRequest}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'جاري الإرسال...' : 'تأكيد الاعتذار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CANCEL BOOKING MODAL */}
      {cancelBookingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>إلغاء الحجز المؤقت للعقار</span>
              </div>
              <button
                onClick={() => setCancelBookingTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <p className="font-bold">رقم الحجز: [{cancelBookingTarget.bookingNumber}]</p>
              <p className="text-[11px] leading-relaxed">
                عند إلغاء الحجز، سيتم فك قفل العقار وإعادته للظهور العام للباحثين الآخرين فوراً.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                سبب الإلغاء:
              </label>
              <input
                type="text"
                value={cancelBookingReason}
                onChange={e => setCancelBookingReason(e.target.value)}
                placeholder="مثال: تم الاتفاق على إلغاء الحجز / عدم التوافق على الشروط"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelBookingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isCancellingBooking}
                onClick={confirmCancelBooking}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCancellingBooking ? 'جاري الإلغاء...' : 'تأكيد فك الحجز وإتاحة العقار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXTEND BOOKING MODAL */}
      {extendBookingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <Clock className="w-5 h-5 text-[#12A889]" />
                <span>تمديد مدة الحجز المؤقت</span>
              </div>
              <button
                onClick={() => setExtendBookingTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                الحجز الحالي ينتهي في: {new Date(extendBookingTarget.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الساعات الإضافية المراد إضافتها:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 48, 72].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtendHours(h)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        extendHours === h
                          ? 'border-[#12A889] bg-[#12A889] text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      +{h} ساعة ({h / 24} يوم)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExtendBookingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isExtendingBooking}
                onClick={confirmExtendBooking}
                className="px-5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isExtendingBooking ? 'جاري التمديد...' : 'تأكيد التمديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPLETE DEAL MODAL */}
      {completeBookingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>إتمام الصفقة العقارية نهائياً</span>
              </div>
              <button
                onClick={() => setCompleteBookingTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p className="font-bold">تهانينا على إتمام الصفقة!</p>
              <p className="text-[11px] leading-relaxed">
                سيتم تحديث حالة الإعلان تلقائياً إلى «تمت الصفقة»، وإغلاق الحجز المؤقت، ولن يعود العقار متاحاً للبحث أو الطلبات الجديدة.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                ملاحظات إتمام الصفقة (اختياري):
              </label>
              <textarea
                value={completeDealNotes}
                onChange={e => setCompleteDealNotes(e.target.value)}
                placeholder="مثال: تم توقيع عقد البيع لدى الأمين الشرعي واستلام كامل القيمة المتفق عليها..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#12A889] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompleteBookingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isCompletingDeal}
                onClick={confirmCompleteDeal}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCompletingDeal ? 'جاري الإتمام...' : 'تأكيد إتمام الصفقة وإغلاق الإعلان'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CANCEL REQUEST MODAL (FOR SEEKER) */}
      {cancelRequestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>إلغاء طلب الحجز / المعاينة</span>
              </div>
              <button
                onClick={() => setCancelRequestTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                هل أنت متأكد من رغبتك في إلغاء طلبك على العقار [{cancelRequestTarget.listingNumber}]؟
              </p>
              <input
                type="text"
                value={cancelRequestReason}
                onChange={e => setCancelRequestReason(e.target.value)}
                placeholder="سبب الإلغاء (اختياري)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelRequestTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isCancellingRequest}
                onClick={confirmCancelRequest}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCancellingRequest ? 'جاري الإلغاء...' : 'تأكيد إلغاء الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOOKING DEAL FOLLOW-UP WORKSPACE MODAL */}
      {selectedDealBookingId && (
        <BookingDealWorkspaceModal
          bookingId={selectedDealBookingId}
          isOpen={Boolean(selectedDealBookingId)}
          onClose={handleCloseDealWorkspace}
          onSelectListing={onSelectListing}
        />
      )}

      {/* 7. CONTRACT DOCUMENT MODAL (Requirement 1, 4, 8, 9) */}
      {(selectedContractId || selectedContractBookingId) && (
        <ContractDocumentModal
          contractId={selectedContractId || undefined}
          bookingId={selectedContractBookingId || undefined}
          isOpen={Boolean(selectedContractId || selectedContractBookingId)}
          onClose={() => {
            handleCloseContractModal();
            fetchRequestsAndBookings();
          }}
          onSelectListing={onSelectListing}
        />
      )}
    </div>
  );
};
