import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SupportTicket } from '../types';
import {
  Headphones,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  User,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

export const SupportPage: React.FC = () => {
  const { currentUser, tickets, replyToTicket, updateTicketStatus, createTicket, showToast } = useApp();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [replyText, setReplyText] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicket['category']>('listing_issue');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('medium');
  const [newInitialMsg, setNewInitialMsg] = useState('');

  // If user is regular seeker or advertiser, only show their own tickets. If support or admin, show all!
  const isStaff = currentUser.role === 'support' || currentUser.role === 'system_admin';
  const visibleTickets = isStaff ? tickets : tickets.filter(t => t.userId === currentUser.id);

  const selectedTicket = visibleTickets.find(t => t.id === selectedTicketId) || visibleTickets[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    replyToTicket(selectedTicket.id, replyText.trim());
    setReplyText('');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMsg.trim()) {
      showToast('يرجى ملء الموضوع وتفاصيل الرسالة', 'warning');
      return;
    }
    createTicket(newSubject.trim(), newCategory, newPriority, newInitialMsg.trim());
    setShowNewTicketModal(false);
    setNewSubject('');
    setNewInitialMsg('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-bold mb-1 border border-purple-200">
            <Headphones className="w-3.5 h-3.5 text-purple-600" />
            <span>مركز الدعم الفني وتذاكر المساعدة</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">إدارة تذاكر واستفسارات المستخدمين</h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة استفسارات إعلانات العقارات، الدعم الفني، ومساعدة المعلنين والباحثين في اليمن
          </p>
        </div>

        <button
          onClick={() => setShowNewTicketModal(true)}
          className="px-4 py-2.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>فتح تذكرة دعم جديدة</span>
        </button>
      </div>

      {visibleTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Headphones className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-700">لا توجد تذاكر دعم فني مفتوحة حالياً</h3>
          <p className="text-xs text-slate-400">يمكنك فتح تذكرة جديدة للاستفسار عن أي خدمة أو إعلان في المنصة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Tickets List Column */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-600">
              قائمة التذاكر ({visibleTickets.length})
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {visibleTickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 transition-all cursor-pointer ${
                      isSelected ? 'bg-purple-50/70 border-r-4 border-purple-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold text-purple-700">{t.ticketNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status === 'resolved' ? 'محلولة' : t.status === 'in_progress' ? 'قيد المعالجة' : 'مفتوحة'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#16324F] line-clamp-1 mb-1">{t.subject}</h4>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>المرسل: {t.userName}</span>
                      <span>{t.updatedAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversation Detail Column */}
          {selectedTicket && (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col h-[650px] overflow-hidden">
              {/* Ticket Top Info */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700">{selectedTicket.ticketNumber}</span>
                    <span className="text-xs text-slate-400">التصنيف: {selectedTicket.category}</span>
                  </div>
                  <h3 className="font-black text-base text-[#16324F] mt-0.5">{selectedTicket.subject}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    المستخدم: {selectedTicket.userName} ({selectedTicket.userPhone})
                  </div>
                </div>

                {isStaff && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">الحالة:</span>
                    <select
                      value={selectedTicket.status}
                      onChange={e => updateTicketStatus(selectedTicket.id, e.target.value as any)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="open">مفتوحة</option>
                      <option value="in_progress">قيد المتابعة</option>
                      <option value="waiting_user">بانتظار العميل</option>
                      <option value="resolved">محلولة ومعتمدة</option>
                      <option value="closed">مغلقة نهائياً</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {selectedTicket.messages.map(msg => {
                  const isStaffMsg = msg.senderRole === 'support';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaffMsg ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-700">{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] text-xs md:text-sm leading-relaxed ${
                          isStaffMsg
                            ? 'bg-[#16324F] text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="اكتب ردك هنا للتواصل المباشر..."
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#12A889]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال الرد</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="font-black text-base text-[#16324F]">إنشاء تذكرة دعم فني جديدة</h3>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">موضوع التذكرة:</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="مثال: استفسار حول إعلانات الأراضي في صنعاء..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التصنيف:</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="listing_issue">مشكلة في إعلان</option>
                    <option value="verification">طلب أو استفسار تحقق</option>
                    <option value="account">الحساب والبيانات</option>
                    <option value="technical">خلل تقني في المنصة</option>
                    <option value="inquiry">استفسار عام</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الأولوية:</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="low">عادية</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عاجلة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الرسالة والتفاصيل:</label>
                <textarea
                  rows={4}
                  value={newInitialMsg}
                  onChange={e => setNewInitialMsg(e.target.value)}
                  placeholder="اشرح المشكلة أو الاستفسار بدقة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#12A889] hover:bg-[#0f8d73] text-white font-bold rounded-xl shadow-xs"
                >
                  إرسال التذكرة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
