import React, { useState } from 'react';
import { Listing, PropertyRequestType } from '../types';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Phone,
  X,
  ShieldCheck,
  Building2,
  FileCheck2,
  Users,
  CreditCard,
  CalendarDays
} from 'lucide-react';

interface BookingModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser, submitPropertyRequest, showToast } = useApp();

  const isSale = listing.purpose === 'sale';
  const isRent = listing.purpose === 'rent';

  // Common fields
  const [requestType, setRequestType] = useState<PropertyRequestType>('booking_intent');
  const [requestedDurationHours, setRequestedDurationHours] = useState<number>(48);
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [offeredPrice, setOfferedPrice] = useState<string>('');
  const [seekerPhone, setSeekerPhone] = useState<string>(currentUser.phone || '');
  const [notes, setNotes] = useState<string>('');

  // Sale-specific fields (Requirement 2)
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>('cash');
  const [requestDeedCheck, setRequestDeedCheck] = useState<boolean>(true);

  // Rent-specific fields (Requirement 2)
  const [rentalUsageType, setRentalUsageType] = useState<string>('family');
  const [leaseDurationMonths, setLeaseDurationMonths] = useState<number>(12);
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [occupantsCount, setOccupantsCount] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isReserved = Boolean(listing.isReserved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (currentUser.role === 'visitor') {
      showToast('يجب تسجيل الدخول أو تأكيد رقم هاتفك أولاً لتقديم الطلب', 'warning');
      return;
    }

    if (listing.advertiser.id === currentUser.id) {
      setErrorMsg('لا يمكنك تقديم طلب حجز على إعلانك الخاص');
      return;
    }

    if (!seekerPhone.trim()) {
      setErrorMsg('رقم الهاتف للتواصل مطلوب');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build comprehensive notes incorporating custom requirements
      let additionalNotes = notes.trim();
      if (isSale && requestDeedCheck) {
        additionalNotes = additionalNotes
          ? `${additionalNotes} | [طلب مطابقة وفحص أصل البصيرة الشرعية لدى الأمين]`
          : '[طلب مطابقة وفحص أصل البصيرة الشرعية لدى الأمين]';
      }
      if (isRent && occupantsCount) {
        additionalNotes = additionalNotes
          ? `${additionalNotes} | [العدد المتوقع: ${occupantsCount}]`
          : `[العدد المتوقع: ${occupantsCount}]`;
      }

      const res = await submitPropertyRequest({
        listingId: listing.id,
        requestType,
        notes: additionalNotes,
        offeredPrice: offeredPrice ? Number(offeredPrice) : undefined,
        preferredDate: preferredDate || undefined,
        requestedDurationHours,
        seekerPhone: seekerPhone.trim(),
        paymentMethod: isSale ? salePaymentMethod : paymentFrequency,
        rentalUsageType: isRent ? rentalUsageType : undefined,
        leaseDurationMonths: isRent ? leaseDurationMonths : undefined,
        paymentFrequency: isRent ? paymentFrequency : undefined
      });

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedPrice = () => {
    if (listing.currency === 'USD') return `$${listing.price.toLocaleString()}`;
    if (listing.currency === 'SAR') return `${listing.price.toLocaleString()} ر.س`;
    return `${listing.price.toLocaleString()} ر.ي`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#16324F] to-[#1a3d61] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#12A889]/20 flex items-center justify-center border border-[#12A889]/30 text-[#12A889]">
              <Lock className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base md:text-lg">طلب حجز العقار مؤقتاً</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSale ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-emerald-950'
                }`}>
                  {isSale ? 'عقار للبيع والشراء' : 'عقار للإيجار'}
                </span>
              </div>
              <p className="text-xs text-slate-300">نموذج رسمي لتقديم الطلب وحجز موعد المعاينة وتجميد العروض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Target Listing Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
            <img
              src={listing.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
              alt={listing.title}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {listing.listingNumber}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  isSale ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {isSale ? 'للبيع' : 'للإيجار'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {listing.location.governorate} - {listing.location.city}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 truncate text-xs sm:text-sm">{listing.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-black text-sm text-[#12A889]">{formattedPrice()}</span>
                {isRent && <span className="text-[11px] text-slate-500 font-normal">/ شهري أو سنوي</span>}
              </div>
            </div>
          </div>

          {/* Reserved Status Alert if currently held */}
          {isReserved && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">تنبيه: هذا العقار محجوز مؤقتاً حالياً</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يوجد حجز مؤقت جارٍ على هذا العقار. بإمكانك إرسال طلبك للانضمام إلى قائمة الانتظار، وسيتمكن المعلن من مراجعته فور انتهاء الحجز أو إلغائه.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Request Type Selector */}
            <div>
              <label className="block font-bold text-slate-800 mb-2">نوع الطلب:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestType('booking_intent')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    requestType === 'booking_intent'
                      ? 'border-[#12A889] bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">حجز مؤقت جاد</span>
                    <Lock className={`w-3.5 h-3.5 ${requestType === 'booking_intent' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">قفل تعاملي لمعاينة وفحص الوثائق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('visit_inquiry')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    requestType === 'visit_inquiry'
                      ? 'border-[#12A889] bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">معاينة ميدانية</span>
                    <Calendar className={`w-3.5 h-3.5 ${requestType === 'visit_inquiry' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">تحديد موعد لزيارة العقار</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('price_offer')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    requestType === 'price_offer'
                      ? 'border-[#12A889] bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">تقديم عرض سعر</span>
                    <DollarSign className={`w-3.5 h-3.5 ${requestType === 'price_offer' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">اقتراح سعر تفاوضي مع الحجز</span>
                </button>
              </div>
            </div>

            {/* PURPOSE-SPECIFIC SECTION (Requirement 2) */}
            {isSale ? (
              /* ================= SALE SPECIFIC FIELDS ================= */
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs pb-1 border-b border-amber-200">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>بيانات وإجراءات الشراء المقترحة (خاص بعقارات البيع):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      طريقة الدفع المقترحة:
                    </label>
                    <select
                      value={salePaymentMethod}
                      onChange={e => setSalePaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value="cash">نقداً بالكامل (كاش عند التوقيع)</option>
                      <option value="certified_check">شيك مصرفي مصدق</option>
                      <option value="installments">دفعة أولى + أقساط ميسرة</option>
                      <option value="bank_finance">تسهيل بنكي / مصرفي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      عرض الشراء المقترح ({listing.currency}):
                    </label>
                    <input
                      type="number"
                      value={offeredPrice}
                      onChange={e => setOfferedPrice(e.target.value)}
                      placeholder={`السعر المعلن: ${listing.price.toLocaleString()}`}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    />
                  </div>
                </div>

                {/* Deed verification request */}
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={requestDeedCheck}
                    onChange={e => setRequestDeedCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-[#12A889] border-slate-300 focus:ring-[#12A889]"
                  />
                  <span className="font-bold">أطلب فحص أصل البصيرة الشرعية ومطابقة الحدود لدى الأمين الشرعي المعتمد</span>
                </label>
              </div>
            ) : (
              /* ================= RENT SPECIFIC FIELDS ================= */
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs pb-1 border-b border-emerald-200">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>بيانات عقد الإيجار المقترح (خاص بعقارات الإيجار):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      طبيعة الاستخدام المطلوب:
                    </label>
                    <select
                      value={rentalUsageType}
                      onChange={e => setRentalUsageType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value="family">سكن عائلي</option>
                      <option value="singles">سكن عزاب / طلاب</option>
                      <option value="commercial">محل / نشاط تجاري</option>
                      <option value="office">مكتب إداري / شركة</option>
                      <option value="medical">عيادة / مركز خدمي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      مدة عقد الإيجار المقترحة:
                    </label>
                    <select
                      value={leaseDurationMonths}
                      onChange={e => setLeaseDurationMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value={12}>سنة كاملة (12 شهراً)</option>
                      <option value={6}>6 أشهر</option>
                      <option value={24}>سنتان (24 شهراً)</option>
                      <option value={36}>3 سنوات أو أكثر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      وتيرة دفع الإيجار المفضلة:
                    </label>
                    <select
                      value={paymentFrequency}
                      onChange={e => setPaymentFrequency(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value="monthly">شهرياً مقدماً</option>
                      <option value="quarterly">كل 3 أشهر (ربع سنوي)</option>
                      <option value="semi_annual">كل 6 أشهر (نصف سنوي)</option>
                      <option value="annual">سنوي مقدماً</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      عدد الأفراد أو الساكنين المتوقع:
                    </label>
                    <input
                      type="text"
                      value={occupantsCount}
                      onChange={e => setOccupantsCount(e.target.value)}
                      placeholder="مثال: عائلة من 4 أفراد"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Duration Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>مدة الحجز المؤقت المطلوبة:</span>
                </label>
                <span className="text-[11px] text-slate-500">قابلة للاتفاق والتمديد من المعلن</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { hours: 24, label: '24 ساعة' },
                  { hours: 48, label: '48 ساعة (الموصى بها)' },
                  { hours: 72, label: '72 ساعة' },
                  { hours: 120, label: '5 أيام' },
                  { hours: 168, label: '7 أيام (الحد الأقصى)' }
                ].map(item => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setRequestedDurationHours(item.hours)}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      requestedDurationHours === item.hours
                        ? 'border-[#12A889] bg-[#12A889] text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Phone & Preferred Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  رقم الهاتف المعتمد للتواصل: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={seekerPhone}
                    onChange={e => setSeekerPhone(e.target.value)}
                    placeholder="770000000"
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none text-right font-mono"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  الموعد المفضل للمعاينة والاتفاق:
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none"
                />
              </div>
            </div>

            {/* Notes / Message */}
            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">
                ملاحظات أو استفسارات إضافية موجهة للمعلن:
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder={isSale
                  ? "أرغب بفحص البصيرة الشرعية ومطابقة المخطط غداً، أو استفسار حول الضمانات وتوثيق العقد لدى المحكمة..."
                  : "أود معرفة تفاصيل تأمين الإيجار وموعد تسليم المفاتيح وفترة السماح..."
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Platform Trust & Policy Box */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>ضمانات الحجز المؤقت في دلنّي:</span>
              </div>
              <p>• عند قبول المعلن للطلب، يُقفل العقار حصرياً ويُمنع أي حجز متعارض طوال المدة المعتمدة.</p>
              <p>• الحجز مجاني ومخصص لمعاينة العقار وفحص الوثائق مع المالك دون أي التزام مالي مسبق.</p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وإرسال طلب الحجز</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
