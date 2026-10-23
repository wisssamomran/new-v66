import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Listing } from '../types';
import { DalaniMap } from '../components/DalaniMap';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MapPin,
  Clock,
  Shield,
  Layers,
  Send,
  History,
  Map as MapIcon,
  List as ListIcon
} from 'lucide-react';

interface ModerationPageProps {
  onSelectListing: (listing: Listing) => void;
}

export const ModerationPage: React.FC<ModerationPageProps> = ({ onSelectListing }) => {
  const { currentUser, listings, changeListingStatus, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'needs_changes' | 'all'>('pending');
  const [selectedReviewListing, setSelectedReviewListing] = useState<Listing | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Decision Modal State
  const [decisionType, setDecisionType] = useState<'approve' | 'request_changes' | 'reject' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [missingFields, setMissingFields] = useState('');

  // Queue of listings awaiting moderation
  const reviewQueue = listings.filter(l => {
    if (activeTab === 'pending') return l.status === 'under_review';
    if (activeTab === 'needs_changes') return l.status === 'needs_changes';
    return l.status === 'under_review' || l.status === 'needs_changes' || l.status === 'rejected';
  });

  const handleOpenDecision = (listing: Listing, type: 'approve' | 'request_changes' | 'reject') => {
    // Check rule: Moderator cannot approve his own listing
    if (type === 'approve' && listing.advertiser.id === currentUser.id) {
      showToast('قاعدة أمنية: لا يحق لمسؤول المراجعة اعتماد إعلان أنشأه بنفسه منعاً لتضارب المصالح', 'error');
      return;
    }

    setSelectedReviewListing(listing);
    setDecisionType(type);
    setDecisionReason('');
    setMissingFields('');
  };

  const handleConfirmDecision = () => {
    if (!selectedReviewListing || !decisionType) return;

    if (decisionType === 'approve') {
      changeListingStatus(
        selectedReviewListing.id,
        'published',
        'تم اعتماد الإعلان بعد التحقق من الصور والمواصفات والموقع',
        decisionReason || 'مطابق لضوابط العرض العام في منصة دلنّي'
      );
    } else if (decisionType === 'request_changes') {
      if (!decisionReason.trim()) {
        showToast('يرجى كتابة سبب طلب الاستكمال والنواقص المطلوب تعديلها', 'warning');
        return;
      }
      changeListingStatus(
        selectedReviewListing.id,
        'needs_changes',
        decisionReason.trim(),
        'مطلوب استكمال النواقص قبل إعادة الفحص',
        missingFields ? missingFields.split(',').map(s => s.trim()) : undefined
      );
    } else if (decisionType === 'reject') {
      if (!decisionReason.trim()) {
        showToast('يرجى ذكر سبب الرفض المسبب لحفظه في سجل التدقيق', 'warning');
        return;
      }
      changeListingStatus(
        selectedReviewListing.id,
        'rejected',
        decisionReason.trim(),
        'تم رفض الإعلان لمخالفته شروط النشر المعتمدة'
      );
    }

    setDecisionType(null);
    setSelectedReviewListing(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-1 border border-amber-200">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>لوحة مراجعة المحتوى والاعتماد الرسمي</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">طابور فحص الإعلانات العقارية</h1>
          <p className="text-xs text-slate-500 mt-1">
            مراجعة دقيقة للبيانات، الصور، الأسعار، والمواقع قبل إتاحة الإعلانات للجمهور العام
          </p>
        </div>

        {/* Status Counts & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              بانتظار المراجعة ({listings.filter(l => l.status === 'under_review').length})
            </button>
            <button
              onClick={() => setActiveTab('needs_changes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'needs_changes'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              مطلوب تعديلها ({listings.filter(l => l.status === 'needs_changes').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              سجل المراجعة الكامل
            </button>
          </div>

          {/* List vs Map Switcher */}
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-[#12A889] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>جدول الفحص</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                viewMode === 'map'
                  ? 'bg-[#12A889] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>خريطة المراجعة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Map View OR List View */}
      {viewMode === 'map' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>خريطة فحص ومراجعة الإعلانات العقارية</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              </h3>
              <p className="text-xs text-slate-400">
                توزيع جغرافي مباشر لطلبات المراجعة مع التحقق من دقة وملاءمة الموقع وصحة الإحداثيات
              </p>
            </div>
          </div>

          <DalaniMap
            listings={reviewQueue}
            allowAllStatuses={true}
            showFilters={false}
            mapTitle="خريطة طلبات المراجعة الجغرافية"
            height="580px"
            onSelectListing={listing => onSelectListing(listing)}
          />
        </div>
      ) : reviewQueue.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <FileCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">طابور المراجعة فارغ تماماً</h3>
          <p className="text-xs text-slate-400">جميع الإعلانات المقدمة تمت معالجتها والبت فيها.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewQueue.map(listing => (
            <div
              key={listing.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                    <img
                      src={(listing.images && listing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {listing.status === 'under_review' ? 'قيد المراجعة' : listing.status}
                      </span>
                      <span className="font-mono text-xs text-slate-400 font-bold">{listing.listingNumber}</span>
                      <span className="text-xs text-slate-400">تاريخ التقديم: {listing.createdAt || 'اليوم'}</span>
                    </div>

                    <h3 className="font-black text-base text-[#16324F] line-clamp-1">{listing.title}</h3>

                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                      <span>📍 {listing.location?.governorate || 'اليمن'} {listing.location?.district ? `- ${listing.location.district}` : ''}</span>
                      <span>•</span>
                      <span className="font-bold text-[#12A889]">
                        {listing.currency === 'USD'
                          ? `$${(listing.price || 0).toLocaleString()}`
                          : `${(listing.price || 0).toLocaleString()} ${listing.currency || 'YER'}`}
                      </span>
                      <span>•</span>
                      <span>المساحة: {listing.area || 0} {listing.areaUnit || 'م²'}</span>
                    </div>

                    <div className="text-xs text-slate-500 line-clamp-2 pt-1">{listing.description}</div>
                  </div>
                </div>

                {/* Submitter info */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 flex-shrink-0 w-full md:w-64">
                  <span className="font-bold text-slate-400 text-[10px] block">بيانات مقدم الإعلان:</span>
                  <div className="font-bold text-[#16324F]">{listing.advertiser?.name || 'معلن غير مسمى'}</div>
                  <div className="text-slate-500 font-mono">هاتف: {listing.advertiser?.phone || 'غير محدد'}</div>
                  {listing.advertiser?.orgName && (
                    <div className="text-[#12A889] font-bold text-[11px]">{listing.advertiser.orgName}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons for Moderator */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <button
                  onClick={() => onSelectListing(listing)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>معاينة الإعلان الكاملة</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDecision(listing, 'reject')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>رفض مسبب</span>
                  </button>

                  <button
                    onClick={() => handleOpenDecision(listing, 'request_changes')}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-amber-200"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>طلب استكمال بيانات</span>
                  </button>

                  <button
                    onClick={() => handleOpenDecision(listing, 'approve')}
                    className="px-5 py-2 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>اعتماد ونشر رسمي</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selectedReviewListing && decisionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-[#16324F]">
                {decisionType === 'approve'
                  ? 'اعتماد ونشر الإعلان العام'
                  : decisionType === 'request_changes'
                  ? 'طلب استكمال وتعديل بيانات الإعلان'
                  : 'رفض الإعلان العقاري'}
              </h3>
              <button
                onClick={() => setSelectedReviewListing(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600">
              العقار: <span className="font-bold text-[#16324F]">{selectedReviewListing.title}</span> (
              {selectedReviewListing.listingNumber})
            </div>

            {decisionType === 'request_changes' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحقول المطلوب استكمالها (مفصولة بفواصل):
                </label>
                <input
                  type="text"
                  value={missingFields}
                  onChange={e => setMissingFields(e.target.value)}
                  placeholder="مثال: السعر الدقيق، رقم الدور، صور إضافية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {decisionType === 'approve' ? 'ملاحظة الاعتماد (اختياري):' : 'سبب القرار الإلزامي (لحفظه في السجل):'}
              </label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                placeholder="اكتب التوضيح أو السبب..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedReviewListing(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDecision}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs ${
                  decisionType === 'approve'
                    ? 'bg-[#12A889] hover:bg-[#0f8d73]'
                    : decisionType === 'request_changes'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                تأكيد القرار وتسجيله
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
