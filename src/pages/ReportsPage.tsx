import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReportCase } from '../types';
import {
  Flag,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Eye,
  Lock,
  PauseCircle,
  UserX,
  FileText
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { reports, resolveReport, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'investigating' | 'resolved'>('all');
  const [selectedCase, setSelectedCase] = useState<ReportCase | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'resolved_ad_suspended' | 'dismissed' | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');

  const filteredReports = reports.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'resolved') return r.status === 'resolved_ad_suspended' || r.status === 'dismissed';
    return r.status === activeTab;
  });

  const handleConfirmResolution = () => {
    if (!selectedCase || !resolutionAction) return;
    if (!resolutionReason.trim()) {
      showToast('يرجى كتابة سبب المعالجة المسبب لحفظه في سجل التدقيق', 'warning');
      return;
    }

    resolveReport(selectedCase.id, resolutionAction, resolutionReason.trim());
    setSelectedCase(null);
    setResolutionAction(null);
    setResolutionReason('');
  };

  const getPriorityBadge = (priority: ReportCase['priority']) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">خطورة حرجة</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">أولوية عالية</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">أولوية متوسطة</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">أولوية عادية</span>;
    }
  };

  const getStatusBadge = (status: ReportCase['status']) => {
    switch (status) {
      case 'resolved_ad_suspended':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">مقبول - أوقف الإعلان</span>;
      case 'dismissed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">مرفوض لعدم الصحة</span>;
      case 'investigating':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">قيد التحقيق</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">جديد غير معالج</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold mb-1 border border-rose-200">
            <Flag className="w-3.5 h-3.5 text-rose-600" />
            <span>لوحة إدارة البلاغات والقضايا والنزاعات</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">بلاغات الإعلانات المخالفة</h1>
          <p className="text-xs text-slate-500 mt-1">
            التحقيق في شكاوى المستخدمين مع الحفاظ الصارم على سرية هوية المبلغين وعدم الحذف الكيدي التلقائي
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {[
            { tab: 'all', label: 'جميع البلاغات' },
            { tab: 'new', label: 'الجديدة' },
            { tab: 'investigating', label: 'قيد المتابعة' },
            { tab: 'resolved', label: 'المعالجة' }
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === item.tab
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reporter Privacy Shield Notice */}
      <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 flex items-start gap-3 text-xs text-rose-950">
        <Lock className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">درع حماية هوية المبلغ (Reporter Privacy Shield): </span>
          يحظر النظام كشف اسم أو هاتف مقدم البلاغ للمعلن تحت أي ظرف. لا يُعتبر البلاغ إدانة تلقائية، ويجب إتاحة فرصة
          التوضيح وفحص الأدلة قبل اتخاذ قرار تعليق الإعلان.
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map(rep => (
          <div
            key={rep.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(rep.status)}
                  {getPriorityBadge(rep.priority)}
                  <span className="font-mono text-xs font-bold text-slate-400">{rep.caseNumber}</span>
                  <span className="text-xs text-slate-400">بتاريخ: {rep.createdAt}</span>
                </div>

                <h3 className="font-black text-base text-[#16324F] leading-snug">
                  بلاغ عن: {rep.listingTitle}
                </h3>

                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div>
                    <span className="font-bold text-slate-800">سبب البلاغ: </span>
                    <span className="text-rose-700 font-bold">{rep.reason}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">تفاصيل الشكوى: </span>
                    <span>{rep.details}</span>
                  </div>
                </div>

                {/* Confidential Reporter Details for Admin */}
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>بيانات المبلّغ (سرية ومحجوبة عن المعلن):</span>
                  </div>
                  <div className="text-slate-700">
                    الاسم: <strong>{rep.reporterName}</strong> • الهاتف: <span className="font-mono">{rep.reporterPhone}</span>
                  </div>
                  {rep.reporterConfidentialNotes && (
                    <div className="text-slate-600 text-[11px] pt-1 border-t border-amber-200/60">
                      ملاحظة داخلية: {rep.reporterConfidentialNotes}
                    </div>
                  )}
                </div>

                {/* Resolution note if processed */}
                {rep.resolutionReason && (
                  <div className="p-2.5 bg-slate-100 rounded-lg text-xs text-slate-700">
                    <span className="font-bold text-slate-900">قرار المعالجة: </span>
                    <span>{rep.resolutionReason} ({rep.resolvedAt})</span>
                  </div>
                )}
              </div>

              {/* Ad Snapshot at report time */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 w-full md:w-64 flex-shrink-0">
                <span className="font-bold text-slate-400 text-[10px] block">نسخة الإعلان وقت البلاغ:</span>
                <div className="font-bold text-[#16324F] line-clamp-1">{rep.listingTitle}</div>
                <div className="text-[#12A889] font-black text-sm">{rep.listingSnapshotPrice}</div>
                <div className="text-slate-500">المعلن: {rep.listingSnapshotAdvertiser}</div>
              </div>
            </div>

            {/* Action Buttons */}
            {rep.status !== 'resolved_ad_suspended' && rep.status !== 'dismissed' && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedCase(rep);
                    setResolutionAction('dismissed');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  رد البلاغ (غير صحيح)
                </button>
                <button
                  onClick={() => {
                    setSelectedCase(rep);
                    setResolutionAction('resolved_ad_suspended');
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  إيقاف الإعلان واعتماد البلاغ
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resolution Modal */}
      {selectedCase && resolutionAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="font-black text-base text-[#16324F]">
              {resolutionAction === 'resolved_ad_suspended'
                ? 'إيقاف الإعلان وإصدار قرار مسبب'
                : 'رد البلاغ لعدم كفاية الأدلة'}
            </h3>

            <p className="text-xs text-slate-600">
              القضية رقم: <strong>{selectedCase.caseNumber}</strong> للإعلان:{' '}
              <strong>{selectedCase.listingTitle}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب القرار الإلزامي (يسجل في سجل التدقيق الإداري):
              </label>
              <textarea
                rows={3}
                value={resolutionReason}
                onChange={e => setResolutionReason(e.target.value)}
                placeholder="اكتب التوضيح القانوني أو الفني المسبب للقرار..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmResolution}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs ${
                  resolutionAction === 'resolved_ad_suspended'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                تأكيد واعتماد القرار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
