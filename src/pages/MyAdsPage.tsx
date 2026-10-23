import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Listing, ListingStatus } from '../types';
import { DalaniMap } from '../components/DalaniMap';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle,
  FileText,
  Eye,
  Heart,
  Edit,
  Trash2,
  Send,
  History,
  ShieldCheck,
  ChevronDown,
  Map as MapIcon,
  List as ListIcon,
  CalendarCheck,
  Lock
} from 'lucide-react';

interface MyAdsPageProps {
  onNavigateToWizard: () => void;
  onSelectListing: (listing: Listing) => void;
  onNavigateToBookings?: () => void;
}

export const MyAdsPage: React.FC<MyAdsPageProps> = ({
  onNavigateToWizard,
  onSelectListing,
  onNavigateToBookings
}) => {
  const { currentUser, listings, changeListingStatus, deleteListing, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<ListingStatus | 'all' | 'reserved'>('all');
  const [selectedTimelineListing, setSelectedTimelineListing] = useState<Listing | null>(null);
  const [displayMode, setDisplayMode] = useState<'list' | 'map'>('list');

  // Security Rule: Show only advertiser's own listings (or organization listings if org agent/manager)
  const myFilteredListings = listings.filter(listing => {
    // If org manager or agent, show org listings
    if (currentUser.role === 'org_manager' || currentUser.role === 'org_agent') {
      if (listing.advertiser.orgId && listing.advertiser.orgId === currentUser.orgId) {
        // If agent, show only his assigned or created listings
        if (currentUser.role === 'org_agent') {
          return listing.assignedAgentId === currentUser.id || listing.advertiser.id === currentUser.id;
        }
        return true;
      }
    }

    // Default individual advertiser
    if (currentUser.role === 'advertiser') {
      return listing.advertiser.id === currentUser.id;
    }

    // For testing/admin, show all
    if (currentUser.role === 'system_admin') return true;

    return listing.advertiser.id === currentUser.id;
  });

  const displayedListings = myFilteredListings.filter(l => {
    if (activeTab === 'all') return true;
    if (activeTab === 'reserved') return Boolean(l.isReserved);
    return l.status === activeTab;
  });

  const statusConfig: Record<ListingStatus, { label: string; color: string; icon: React.ReactNode }> = {
    published: { label: 'منشور ونشط', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
    draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <FileText className="w-3.5 h-3.5 text-slate-500" /> },
    under_review: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
    pending_completion: { label: 'بانتظار الاستكمال', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> },
    pending_verification: { label: 'بانتظار التحقق', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="w-3.5 h-3.5 text-blue-600" /> },
    needs_changes: { label: 'مطلوب تعديله', color: 'bg-orange-100 text-orange-900 border-orange-300', icon: <AlertCircle className="w-3.5 h-3.5 text-orange-700" /> },
    suspended: { label: 'موقوف مؤقتاً', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: <PauseCircle className="w-3.5 h-3.5 text-rose-600" /> },
    rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3.5 h-3.5 text-red-600" /> },
    expired: { label: 'منتهٍ', color: 'bg-slate-200 text-slate-800 border-slate-300', icon: <Clock className="w-3.5 h-3.5" /> },
    cancelled: { label: 'ملغى', color: 'bg-slate-200 text-slate-800 border-slate-300', icon: <XCircle className="w-3.5 h-3.5" /> },
    completed: { label: 'تمت الصفقة', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> }
  };

  const counts = {
    all: myFilteredListings.length,
    published: myFilteredListings.filter(l => l.status === 'published' && !l.isReserved).length,
    reserved: myFilteredListings.filter(l => l.isReserved).length,
    completed: myFilteredListings.filter(l => l.status === 'completed').length,
    under_review: myFilteredListings.filter(l => l.status === 'under_review').length,
    needs_changes: myFilteredListings.filter(l => l.status === 'needs_changes').length,
    draft: myFilteredListings.filter(l => l.status === 'draft').length,
    suspended: myFilteredListings.filter(l => l.status === 'suspended').length,
    rejected: myFilteredListings.filter(l => l.status === 'rejected').length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">لوحة إعلاناتي العقارية</h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة إعلاناتك، متابعة قرارات المشرفين، ومطالعة سجل انتقالات الحالة لكل إعلان
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {onNavigateToBookings && (
            <button
              onClick={onNavigateToBookings}
              className="px-4 py-2.5 bg-[#16324F] hover:bg-[#12A889] text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-300" />
              <span>إدارة الحجوزات والطلبات</span>
              {counts.reserved > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {counts.reserved} محجوز
                </span>
              )}
            </button>
          )}

          <button
            onClick={onNavigateToWizard}
            className="px-5 py-2.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة إعلان جديد</span>
          </button>
        </div>
      </div>

      {/* Reserved listings banner if any */}
      {counts.reserved > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0 text-amber-800">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-amber-900 block text-sm">
                يوجد لديك {counts.reserved} عقارات بحالة حجز مؤقت سارٍ حالياً
              </span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                العقارات المحجوزة مقفولة ومخفية عن البحث لحماية الاتفاق حتى انتهاء المهلة أو إتمام الصفقة.
              </p>
            </div>
          </div>
          {onNavigateToBookings && (
            <button
              type="button"
              onClick={onNavigateToBookings}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer shrink-0"
            >
              متابعة وإدارة الحجوزات
            </button>
          )}
        </div>
      )}

      {/* Basic Performance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs block mb-1">إجمالي الإعلانات</span>
          <span className="text-2xl font-black text-[#16324F]">{counts.all}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs block mb-1">إعلانات نشطة منشورة</span>
          <span className="text-2xl font-black text-emerald-600">{counts.published}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs block mb-1">قيد المراجعة / تعديل</span>
          <span className="text-2xl font-black text-amber-600">{counts.under_review + counts.needs_changes}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs block mb-1">إجمالي المشاهدات</span>
          <span className="text-2xl font-black text-blue-600">
            {myFilteredListings.reduce((sum, l) => sum + l.viewsCount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter Tabs & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs Filter */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex items-center gap-1 overflow-x-auto scrollbar-none text-xs font-bold">
          {[
            { tab: 'all', label: `الكل (${counts.all})` },
            { tab: 'published', label: `المتاحة للعامة (${counts.published})` },
            { tab: 'reserved', label: `محجوز حصرياً (${counts.reserved})` },
            { tab: 'completed', label: `تمت الصفقة (${counts.completed})` },
            { tab: 'under_review', label: `قيد المراجعة (${counts.under_review})` },
            { tab: 'needs_changes', label: `مطلوب تعديلها (${counts.needs_changes})` },
            { tab: 'draft', label: `المسودات (${counts.draft})` },
            { tab: 'suspended', label: `موقوفة مؤقتاً (${counts.suspended})` },
            { tab: 'rejected', label: `المرفوضة (${counts.rejected})` }
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab as any)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                activeTab === item.tab
                  ? 'bg-[#16324F] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* View Mode Switcher (List vs Map) */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex items-center gap-1 text-xs font-bold self-end sm:self-auto flex-shrink-0">
          <button
            onClick={() => setDisplayMode('list')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
              displayMode === 'list'
                ? 'bg-[#12A889] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ListIcon className="w-4 h-4" />
            <span>قائمة الإعلانات</span>
          </button>
          <button
            onClick={() => setDisplayMode('map')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
              displayMode === 'map'
                ? 'bg-[#12A889] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>خريطة عقاراتي</span>
          </button>
        </div>
      </div>

      {/* Main Content: Map View OR List View */}
      {displayMode === 'map' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>خريطة إعلاناتي العقارية المباشرة</span>
                <span className="w-2 h-2 rounded-full bg-[#12A889] animate-ping"></span>
              </h3>
              <p className="text-xs text-slate-400">
                عرض مواقع إعلاناتك الجغرافية مع تمييز الحالات (مسودات، قيد المراجعة، منشور) وفق صلاحياتك
              </p>
            </div>
            <button
              onClick={onNavigateToWizard}
              className="px-4 py-2 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة وتحديد عقار جديد</span>
            </button>
          </div>

          <DalaniMap
            listings={displayedListings}
            allowAllStatuses={true}
            showFilters={false}
            mapTitle="خريطة إعلاناتي العقارية"
            height="580px"
            onSelectListing={onSelectListing}
          />
        </div>
      ) : displayedListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">لا توجد إعلانات مسجلة في هذا القسم</h3>
          <p className="text-xs text-slate-400">يمكنك إنشاء إعلان جديد وتقديمه للمراجعة بكل سهولة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedListings.map(listing => {
            const statusMeta = statusConfig[listing.status] || {
              label: listing.status,
              color: 'bg-slate-100 text-slate-700',
              icon: null
            };

            return (
              <div
                key={listing.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Info block */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                    <img
                      src={(listing.images && listing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${statusMeta.color}`}>
                        {statusMeta.icon}
                        <span>{statusMeta.label}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        {listing.listingNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        تحديث: {listing.updatedAt || 'اليوم'}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectListing(listing)}
                      className="font-bold text-sm md:text-base text-[#16324F] hover:text-[#12A889] transition-colors cursor-pointer line-clamp-1"
                    >
                      {listing.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>📍 {listing.location?.city || ''} {listing.location?.district ? `- ${listing.location.district}` : ''}</span>
                      <span>•</span>
                      <span className="font-bold text-[#12A889]">
                        {listing.currency === 'USD'
                          ? `$${(listing.price || 0).toLocaleString()}`
                          : `${(listing.price || 0).toLocaleString()} ${listing.currency || 'YER'}`}
                      </span>
                      <span>•</span>
                      <span>{listing.area || 0} {listing.areaUnit || 'م²'}</span>
                    </div>

                    {/* Needs Changes Banner */}
                    {listing.status === 'needs_changes' && (
                      <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-900 mt-2 font-medium">
                        ⚠️ ملاحظة المشرف: يرجى استكمال النواقص وإعادة التقديم.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions & Metrics */}
                <div className="flex items-center gap-3 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-3 text-xs text-slate-400 pl-4 border-l border-slate-200 hidden sm:flex">
                    <span className="flex items-center gap-1" title="عدد المشاهدات">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{listing.viewsCount}</span>
                    </span>
                    <span className="flex items-center gap-1" title="عدد الحفظ في المفضلة">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>{listing.favoritesCount}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Details */}
                    <button
                      onClick={() => onSelectListing(listing)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      title="معاينة الإعلان"
                    >
                      معاينة
                    </button>

                    {/* Timeline History */}
                    <button
                      onClick={() => setSelectedTimelineListing(listing)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      title="مسار الحالة وسجل القرارات"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>السجل</span>
                    </button>

                    {/* Resubmit / Under Review */}
                    {(listing.status === 'draft' || listing.status === 'needs_changes') && (
                      <button
                        onClick={() => changeListingStatus(listing.id, 'under_review', 'إعادة إرسال للمراجعة بعد التعديل')}
                        className="px-3 py-1.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال للمراجعة</span>
                      </button>
                    )}

                    {/* Pause published ad */}
                    {listing.status === 'published' && (
                      <button
                        onClick={() => changeListingStatus(listing.id, 'suspended', 'إيقاف مؤقت بطلب من المعلن')}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        إيقاف مؤقت
                      </button>
                    )}

                    {/* Delete draft */}
                    {listing.status === 'draft' && (
                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        title="حذف المسودة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status Timeline History Modal */}
      {selectedTimelineListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#12A889]" />
                  <span>سجل انتقالات الحالة للإعلان</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedTimelineListing.listingNumber} - {selectedTimelineListing.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedTimelineListing(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              {selectedTimelineListing.statusTimeline.map((entry, idx) => (
                <div key={idx} className="relative pr-6 border-r-2 border-slate-200 space-y-1">
                  <div className="absolute -right-1.5 top-0 w-3 h-3 rounded-full bg-[#12A889] ring-4 ring-white" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#16324F]">الحالة: {entry.status}</span>
                    <span className="text-[11px] text-slate-400">{entry.timestamp}</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">بواسطة: {entry.changedBy} ({entry.userRole})</div>
                  {entry.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">{entry.notes}</p>}
                  {entry.reason && (
                    <div className="text-xs text-amber-800 font-bold bg-amber-50 p-2 rounded-lg">
                      السبب: {entry.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 text-left">
              <button
                onClick={() => setSelectedTimelineListing(null)}
                className="px-5 py-2 bg-[#16324F] text-white text-xs font-bold rounded-xl hover:bg-[#12A889] transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
