import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { VerificationRequest } from '../types';
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Eye,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';

export const VerificationPage: React.FC = () => {
  const { verificationRequests, reviewVerificationRequest, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'under_review' | 'approved' | 'rejected'>('all');
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'needs_info' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const filteredRequests = verificationRequests.filter(req => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });

  const handleConfirmDecision = () => {
    if (!selectedReq || !reviewAction) return;
    if (!decisionNotes.trim()) {
      showToast('يرجى كتابة الملاحظات ومصدر التحقق لحفظها في سجل التدقيق', 'warning');
      return;
    }

    reviewVerificationRequest(selectedReq.id, reviewAction, decisionNotes.trim());
    setSelectedReq(null);
    setReviewAction(null);
    setDecisionNotes('');
  };

  const getStatusBadge = (status: VerificationRequest['status']) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">معتمد</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">مرفوض</span>;
      case 'needs_info':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">بانتظار استكمال</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">قيد الفحص</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold mb-1 border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>لوحة فحص وثائق التحقق والاعتماد القانوني</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">طلبات التحقق من الهويات والمنشآت والبصائر</h1>
          <p className="text-xs text-slate-500 mt-1">
            فحص آمن للوثائق الرسمية الحساسة، ومنح الشارات المعتمدة وفق ضوابط الشفافية المحلية
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {[
            { tab: 'all', label: 'الكل' },
            { tab: 'under_review', label: 'قيد الفحص' },
            { tab: 'approved', label: 'المعتمدة' },
            { tab: 'rejected', label: 'المرفوضة' }
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === item.tab
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security Vault Notice */}
      <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200 flex items-start gap-3 text-xs text-teal-950">
        <Lock className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">سياسة أمن المستندات الحساسة (Document Vault): </span>
          تخضع وثائق الهوية الشخصية والبصائر الشرعية والسجلات التجارية لحماية صارمة على مستوى الخادم، ولا يجوز كشفها
          للجمهور العام أو تضمينها في واجهات التصفح المفتوحة. الوصول إليها مقتصر على مسؤول التحقق لأغراض التحقق فقط.
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.map(req => (
          <div
            key={req.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                  نوع الطلب:{' '}
                  {req.requestType === 'individual_advertiser'
                    ? 'تحقق هوية معلن فرد'
                    : req.requestType === 'organization'
                    ? 'تحقق منشأة وسجل تجاري'
                    : 'تحقق بصيرة شرعية لعقار'}
                </span>
                <h3 className="font-black text-base text-[#16324F]">{req.targetName}</h3>
                <span className="text-xs text-slate-500 font-mono">المقدم: {req.submittedBy} ({req.submittedByPhone})</span>
              </div>
              {getStatusBadge(req.status)}
            </div>

            {/* Attached Private Docs */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 block">المستندات المرفوعة في الخزانة الخاصة:</span>
              {req.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-medium text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#12A889]" />
                    <span>{doc.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{doc.sizeMb} MB</span>
                </div>
              ))}
            </div>

            {req.moderatorNotes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">ملاحظات التحقق: </span>
                <span>{req.moderatorNotes}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">تاريخ الطلب: {req.createdAt}</span>

              {req.status === 'under_review' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedReq(req);
                      setReviewAction('rejected');
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200"
                  >
                    رفض
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReq(req);
                      setReviewAction('approved');
                    }}
                    className="px-4 py-1.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-lg shadow-2xs"
                  >
                    اعتماد ومنح الشارة
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-bold">تم البت في الطلب ({req.reviewedBy})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Decision Modal */}
      {selectedReq && reviewAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="font-black text-base text-[#16324F]">
              {reviewAction === 'approved' ? 'تأكيد اعتماد التحقق ومنح الشارة' : 'رفض طلب التحقق'}
            </h3>

            <p className="text-xs text-slate-600">
              الطلب المقدم من: <strong>{selectedReq.targetName}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات التحقق ومصدر المطابقة (يسجل في سجل التدقيق):
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                placeholder="مثال: تمت مطابقة صورة البطاقة الشخصية مع السجل المدني وتأكيد صحة البيانات..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDecision}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs ${
                  reviewAction === 'approved' ? 'bg-[#12A889] hover:bg-[#0f8d73]' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                تسجيل القرار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
