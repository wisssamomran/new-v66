import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  PropertyBooking,
  PropertyRequest,
  Listing,
  DealTerms,
  TermsRevision,
  DealMessage,
  InspectionVisit,
  InspectionResult,
  DealStage,
  Currency,
  ContractClause,
  ContractVersion,
  FinancialClearance,
  HandoverProtocol,
  DealDispute
} from '../types';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Building2,
  User,
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  Send,
  ShieldCheck,
  Check,
  ArrowRight,
  Eye,
  Edit3,
  DollarSign,
  AlertCircle,
  History,
  MapPin,
  ChevronRight,
  RefreshCw,
  Sparkles,
  HelpCircle,
  BadgeAlert,
  CalendarCheck,
  FileCheck,
  ShieldAlert,
  Scale,
  Receipt,
  Key,
  FileSignature,
  Printer
} from 'lucide-react';
import { ContractDocumentModal } from './ContractDocumentModal';

/**
 * تنظيف وتحويل الأرقام العربية والإنجليزية وإزالة الفواصل والرموز غير الرقمية
 * تدعم: ٠١٢٣٤٥٦٧٨٩ و 0-9 مع السماح بالنقطة العشرية ومسح الحقل بالكامل دون إعادته لصفر
 */
export const sanitizeNumericInput = (raw: string): string => {
  if (!raw) return '';
  // تحويل الأرقام الهندية/العربية (٠-٩) والفارسية (۰-۹) إلى أرقام لاتينية (0-9)
  const converted = raw
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/٫/g, '.') // الفاصلة العشرية العربية
    .replace(/[٬,\s]/g, ''); // إزالة الفواصل والمسافات
  // الاحتفاظ بالأرقام ونقطة عشرية واحدة فقط
  let result = '';
  let hasDecimal = false;
  for (const char of converted) {
    if (char >= '0' && char <= '9') {
      result += char;
    } else if (char === '.' && !hasDecimal) {
      result += char;
      hasDecimal = true;
    }
  }
  return result;
};

interface BookingDealWorkspaceModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectListing?: (listing: Listing) => void;
}

export const BookingDealWorkspaceModal: React.FC<BookingDealWorkspaceModalProps> = ({
  bookingId,
  isOpen,
  onClose,
  onSelectListing
}) => {
  const {
    currentUser,
    bookings,
    listings,
    contracts,
    fetchDealWorkspace,
    sendDealMessage,
    proposeDealTerms,
    respondToDealTerms,
    updateDealInspection,
    updateDealStage,
    completeBooking,
    cancelBooking,
    cancelBookingWithCategory,
    extendBooking,
    fetchCompletionPrerequisites,
    updateBookingFinancialClearance,
    updateBookingHandoverProtocol,
    raiseDealDispute,
    resolveDealDispute,
    generateContractFromBooking,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'terms' | 'inspection' | 'chat' | 'overview' | 'contract' | 'completion'>('terms');
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [prereqsData, setPrereqsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showContractDocumentModal, setShowContractDocumentModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_contract') === 'true'; } catch { return false; }
  });
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleContractModal = (show: boolean) => {
    setShowContractDocumentModal(show);
    try { sessionStorage.setItem('dalani_deal_show_contract', String(show)); } catch {}
  };

  // Propose Terms Form State
  const [showProposeTermsModal, setShowProposeTermsModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_terms') === 'true'; } catch { return false; }
  });

  const toggleProposeTermsModal = (show: boolean) => {
    setShowProposeTermsModal(show);
    try { sessionStorage.setItem('dalani_deal_show_terms', String(show)); } catch {}

    // عند فتح النافذة، إذا كان السعر فارغاً أو صفراً، نقوم بتهيئته تلقائياً من بيانات العقار أو الشروط السابقة
    if (show && (!termsFormPrice || termsFormPrice === '0' || termsFormPrice === '')) {
      const fallbackPrice = booking?.currentTerms?.price || booking?.agreedTerms?.price || booking?.listingPrice;
      if (fallbackPrice && fallbackPrice > 0) {
        setTermsFormPrice(String(fallbackPrice));
        if (!termsFormDeposit || termsFormDeposit === '0' || termsFormDeposit === '') {
          setTermsFormDeposit(String(Math.round(fallbackPrice * 0.05)));
        }
      }
    }
  };
  const [termsFormPrice, setTermsFormPrice] = useState<string>('');
  const [termsFormCurrency, setTermsFormCurrency] = useState<Currency>('USD');
  const [termsFormPaymentMethod, setTermsFormPaymentMethod] = useState<string>('certified_check');
  const [termsFormDeposit, setTermsFormDeposit] = useState<string>('');
  const [termsFormHandoverDate, setTermsFormHandoverDate] = useState<string>('');
  const [termsFormFeeBy, setTermsFormFeeBy] = useState<'shared_equally' | 'buyer_only' | 'seller_only' | 'tenant_only'>('shared_equally');
  const [termsFormSpecialConditions, setTermsFormSpecialConditions] = useState<string[]>([]);
  const [newConditionInput, setNewConditionInput] = useState('');
  const [termsFormNotes, setTermsFormNotes] = useState('');
  const [isSubmittingTerms, setIsSubmittingTerms] = useState(false);

  // Respond Terms State
  const [respondModalRevision, setRespondModalRevision] = useState<TermsRevision | null>(null);
  const [respondAction, setRespondAction] = useState<'accept' | 'reject'>('accept');
  const [respondNotes, setRespondNotes] = useState('');
  const [isRespondingTerms, setIsRespondingTerms] = useState(false);

  // Inspection Form State
  const [showInspectionModal, setShowInspectionModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_inspection') === 'true'; } catch { return false; }
  });

  const toggleInspectionModal = (show: boolean) => {
    setShowInspectionModal(show);
    try { sessionStorage.setItem('dalani_deal_show_inspection', String(show)); } catch {}
  };

  const [inspectionAction, setInspectionAction] = useState<'request' | 'confirm' | 'complete'>('request');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('16:00');
  const [inspectionLocationNotes, setInspectionLocationNotes] = useState('');
  const [inspectionResult, setInspectionResult] = useState<InspectionResult>('satisfied');
  const [inspectionResultNotes, setInspectionResultNotes] = useState('');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);

  // Financial Clearance Form State (Requirement 4)
  const [showFinancialClearanceModal, setShowFinancialClearanceModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_financial') === 'true'; } catch { return false; }
  });

  const toggleFinancialClearanceModal = (show: boolean) => {
    setShowFinancialClearanceModal(show);
    try { sessionStorage.setItem('dalani_deal_show_financial', String(show)); } catch {}
  };

  const [fcPaidAmount, setFcPaidAmount] = useState<number>(0);
  const [fcTotalAmount, setFcTotalAmount] = useState<number>(0);
  const [fcCurrency, setFcCurrency] = useState<Currency>('USD');
  const [fcReceiptVoucherNumber, setFcReceiptVoucherNumber] = useState<string>('');
  const [fcPaymentMethod, setFcPaymentMethod] = useState<string>('سند إيداع بنكي معتمد');
  const [fcClearanceDate, setFcClearanceDate] = useState<string>('');
  const [fcNotes, setFcNotes] = useState<string>('');
  const [isSavingFinancial, setIsSavingFinancial] = useState(false);

  // Handover Protocol Form State (Requirement 4)
  const [showHandoverModal, setShowHandoverModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_handover') === 'true'; } catch { return false; }
  });

  const toggleHandoverModal = (show: boolean) => {
    setShowHandoverModal(show);
    try { sessionStorage.setItem('dalani_deal_show_handover', String(show)); } catch {}
  };

  const [hpHandoverDate, setHpHandoverDate] = useState<string>('');
  const [hpHandedOverBy, setHpHandedOverBy] = useState<string>('');
  const [hpReceivedBy, setHpReceivedBy] = useState<string>('');
  const [hpDeedVerified, setHpDeedVerified] = useState<boolean>(true);
  const [hpOriginalDeedHandedOver, setHpOriginalDeedHandedOver] = useState<boolean>(true);
  const [hpDeedNumber, setHpDeedNumber] = useState<string>('');
  const [hpCourtNotaryNotes, setHpCourtNotaryNotes] = useState<string>('');
  const [hpKeysHandedOver, setHpKeysHandedOver] = useState<boolean>(true);
  const [hpNumberOfKeys, setHpNumberOfKeys] = useState<number>(2);
  const [hpElectricityMeter, setHpElectricityMeter] = useState<string>('');
  const [hpWaterMeter, setHpWaterMeter] = useState<string>('');
  const [hpPremisesSatisfied, setHpPremisesSatisfied] = useState<boolean>(true);
  const [hpNotes, setHpNotes] = useState<string>('');
  const [isSavingHandover, setIsSavingHandover] = useState(false);

  // Dispute Modals State (Requirement 10)
  const [showDisputeModal, setShowDisputeModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_dispute') === 'true'; } catch { return false; }
  });

  const toggleDisputeModal = (show: boolean) => {
    setShowDisputeModal(show);
    try { sessionStorage.setItem('dalani_deal_show_dispute', String(show)); } catch {}
  };

  const [disputeClaimType, setDisputeClaimType] = useState<'breach_of_terms' | 'misrepresentation' | 'payment_default' | 'document_defect' | 'other'>('breach_of_terms');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const [showResolveDisputeModal, setShowResolveDisputeModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_resolve') === 'true'; } catch { return false; }
  });

  const toggleResolveDisputeModal = (show: boolean) => {
    setShowResolveDisputeModal(show);
    try { sessionStorage.setItem('dalani_deal_show_resolve', String(show)); } catch {}
  };

  const [disputeResolution, setDisputeResolution] = useState<'dismissed' | 'resolved' | 'cancel_deal'>('resolved');
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState<string>('');
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // Complete & Cancel Modals State
  const [showCompleteDealModal, setShowCompleteDealModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_complete') === 'true'; } catch { return false; }
  });

  const toggleCompleteDealModal = (show: boolean) => {
    setShowCompleteDealModal(show);
    try { sessionStorage.setItem('dalani_deal_show_complete', String(show)); } catch {}
  };

  const [completeNotes, setCompleteNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [forceAdminOverride, setForceAdminOverride] = useState(false);
  const [completionErrors, setCompletionErrors] = useState<any[]>([]);

  const [showCancelModal, setShowCancelModal] = useState(() => {
    try { return sessionStorage.getItem('dalani_deal_show_cancel') === 'true'; } catch { return false; }
  });

  const toggleCancelModal = (show: boolean) => {
    setShowCancelModal(show);
    try { sessionStorage.setItem('dalani_deal_show_cancel', String(show)); } catch {}
  };
  const [cancelCategory, setCancelCategory] = useState<'buyer_retracted' | 'seller_retracted' | 'inspection_unsatisfactory' | 'deed_issue' | 'price_disagreement' | 'mutual_cancellation' | 'dispute_cancelled'>('mutual_cancellation');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = async () => {
    if (!bookingId) return;
    setIsLoading(true);
    const [res, prereqs] = await Promise.all([
      fetchDealWorkspace(bookingId),
      fetchCompletionPrerequisites(bookingId)
    ]);

    if (prereqs) {
      setPrereqsData(prereqs);
    }

    if (res.success && res.data) {
      setWorkspaceData(res.data);
      const booking: PropertyBooking = res.data.booking;
      const initialTerms = booking.currentTerms || booking.agreedTerms;
      if (initialTerms) {
        setTermsFormPrice(initialTerms.price ? String(initialTerms.price) : (booking.listingPrice ? String(booking.listingPrice) : ''));
        setTermsFormCurrency(initialTerms.currency || booking.listingCurrency || 'USD');
        setTermsFormPaymentMethod(initialTerms.paymentMethod || 'certified_check');
        setTermsFormDeposit(initialTerms.depositAmount !== undefined && initialTerms.depositAmount !== null ? String(initialTerms.depositAmount) : (initialTerms.price ? String(Math.round(initialTerms.price * 0.05)) : ''));
        setTermsFormHandoverDate(initialTerms.handoverDate || '');
        setTermsFormFeeBy(initialTerms.feeResponsibility || 'shared_equally');
        setTermsFormSpecialConditions(initialTerms.specialConditions || []);
        setTermsFormNotes(initialTerms.notes || '');
      } else {
        setTermsFormPrice(booking.listingPrice ? String(booking.listingPrice) : '');
        setTermsFormCurrency(booking.listingCurrency || 'USD');
        setTermsFormPaymentMethod(booking.paymentMethod || 'certified_check');
        setTermsFormDeposit(booking.listingPrice ? String(Math.round(booking.listingPrice * 0.05)) : '');
        setTermsFormHandoverDate('');
        setTermsFormFeeBy('shared_equally');
        setTermsFormSpecialConditions([
          'فحص وثائق الملكية والبصيرة الشرعية قبل سداد الدفعة النهائية',
          'سداد كافة فواتير الخدمات السابقة حتى تاريخ استلام العقار'
        ]);
        setTermsFormNotes('');
      }

      // Pre-fill Financial Clearance
      if (booking.financialClearance) {
        setFcPaidAmount(booking.financialClearance.paidAmount || 0);
        setFcTotalAmount(booking.financialClearance.totalAmount || booking.listingPrice || 0);
        setFcCurrency(booking.financialClearance.currency || booking.listingCurrency || 'USD');
        setFcReceiptVoucherNumber(booking.financialClearance.receiptVoucherNumber || '');
        setFcPaymentMethod(booking.financialClearance.paymentMethod || 'سند إيداع بنكي معتمد');
        setFcClearanceDate(booking.financialClearance.clearanceDate || '');
        setFcNotes(booking.financialClearance.notes || '');
      } else {
        const total = initialTerms?.price || booking.listingPrice || 0;
        setFcPaidAmount(total);
        setFcTotalAmount(total);
        setFcCurrency(initialTerms?.currency || booking.listingCurrency || 'USD');
        setFcReceiptVoucherNumber(`VOU-YE-${Math.floor(100000 + Math.random() * 900000)}`);
        setFcClearanceDate(new Date().toISOString().split('T')[0]);
      }

      // Pre-fill Handover Protocol
      if (booking.handoverProtocol) {
        setHpHandoverDate(booking.handoverProtocol.handoverDate || '');
        setHpHandedOverBy(booking.handoverProtocol.handedOverBy || booking.advertiserName);
        setHpReceivedBy(booking.handoverProtocol.receivedBy || booking.seekerName);
        setHpDeedVerified(booking.handoverProtocol.deedVerified ?? true);
        setHpOriginalDeedHandedOver(booking.handoverProtocol.originalDeedHandedOver ?? true);
        setHpDeedNumber(booking.handoverProtocol.deedNumber || '');
        setHpCourtNotaryNotes(booking.handoverProtocol.courtOrRegistrarNotaryNotes || '');
        setHpKeysHandedOver(booking.handoverProtocol.keysHandedOver ?? true);
        setHpNumberOfKeys(booking.handoverProtocol.numberOfKeys || 2);
        setHpElectricityMeter(booking.handoverProtocol.electricityMeterReading || '');
        setHpWaterMeter(booking.handoverProtocol.waterMeterReading || '');
        setHpPremisesSatisfied(booking.handoverProtocol.premisesConditionSatisfied ?? true);
        setHpNotes(booking.handoverProtocol.notes || '');
      } else {
        setHpHandoverDate(new Date().toISOString().split('T')[0]);
        setHpHandedOverBy(booking.advertiserName);
        setHpReceivedBy(booking.seekerName);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      loadData();
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, workspaceData?.booking?.messages]);

  if (!isOpen) return null;

  // Real-time booking representation
  const booking: PropertyBooking | undefined = workspaceData?.booking || bookings.find(b => b.id === bookingId);
  const listing: Listing | undefined = workspaceData?.listing || listings.find(l => l.id === booking?.listingId);
  const currentContract = workspaceData?.contract || contracts.find(c => (booking?.id && c.bookingId === booking.id) || (booking?.contractId && c.id === booking.contractId));
  const hasContract = Boolean(currentContract || booking?.contractId);
  const userRoleInDeal = workspaceData?.userRoleInDeal || 'seeker';

  const isSeeker = booking?.seekerId === currentUser.id;
  const isAdvertiser = booking?.advertiserId === currentUser.id || listing?.advertiser?.id === currentUser.id;
  const isOrgManager = currentUser.role === 'org_manager' && Boolean(currentUser.orgId && listing?.advertiser?.orgId === currentUser.orgId);
  const isAssignedAgent = listing?.assignedAgentId === currentUser.id;
  const isSysAdmin = currentUser.role === 'system_admin';
  const isManagingParty = isAdvertiser || isOrgManager || isAssignedAgent || isSysAdmin;

  const isSale = booking?.listingPurpose === 'sale' || listing?.purpose === 'sale' || (booking && booking.listingPrice > 20000 && !booking.rentalUsageType);
  const isBookingActive = booking?.status === 'active';
  const isBookingCompleted = booking?.status === 'completed';
  const isTermsApproved = booking?.termsStatus === 'accepted' && Boolean(booking?.agreedTerms);
  const isTermsPendingReapproval = booking?.termsStatus === 'pending_reapproval';

  const stagesList: { key: DealStage; label: string; desc: string }[] = [
    { key: 'request_submitted', label: 'تقديم الطلب', desc: 'استلام رغبة الباحث ومراجعة المعلن' },
    { key: 'booking_exclusive', label: 'الحجز الحصري', desc: 'قفل العقار وحجبه عن الجمهور' },
    { key: 'inspection_deed', label: 'المعاينة والوثائق', desc: 'التحري الميداني وفحص صك البصيرة' },
    { key: 'terms_negotiation', label: 'اعتماد الشروط', desc: 'الاتفاق على السعر والعربون وموعد الإفراغ' },
    { key: 'contract_completed', label: 'إتمام الصفقة', desc: 'إبرام العقد النهائي ونقل الملكية' }
  ];

  const currentStageIndex = stagesList.findIndex(s => s.key === (booking?.dealStage || 'booking_exclusive'));

  // Handle Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !booking) return;

    setIsSendingMessage(true);
    const textToSend = messageInput.trim();
    setMessageInput('');
    try {
      const res = await sendDealMessage(booking.id, textToSend);
      if (res.success) {
        await loadData();
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Quick Suggestion Click
  const handleQuickPrompt = (prompt: string) => {
    setMessageInput(prompt);
  };

  // Add Special Condition item
  const handleAddCondition = () => {
    if (newConditionInput.trim()) {
      setTermsFormSpecialConditions(prev => [...prev, newConditionInput.trim()]);
      setNewConditionInput('');
    }
  };

  // Remove Special Condition item
  const handleRemoveCondition = (index: number) => {
    setTermsFormSpecialConditions(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Propose Terms
  const handleSubmitProposeTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    // تنظيف وتحويل السعر المقترح
    const cleanPriceStr = sanitizeNumericInput(termsFormPrice);
    const parsedPrice = parseFloat(cleanPriceStr);

    if (!cleanPriceStr || isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('يرجى تحديد سعر مقترح صالح وأكبر من صفر', 'error');
      return;
    }

    // تنظيف وتحويل مبلغ العربون (إن وُجد)
    const cleanDepositStr = sanitizeNumericInput(termsFormDeposit);
    let parsedDeposit: number | undefined = undefined;
    if (cleanDepositStr) {
      const depNum = parseFloat(cleanDepositStr);
      if (isNaN(depNum) || depNum < 0) {
        showToast('مبلغ العربون غير صالح، يرجى إدخال قيمة صحيحة', 'error');
        return;
      }
      if (depNum > parsedPrice) {
        showToast('مبلغ العربون لا يمكن أن يتجاوز السعر الإجمالي المقترح', 'error');
        return;
      }
      parsedDeposit = depNum;
    }

    setIsSubmittingTerms(true);
    try {
      const termsPayload: DealTerms = {
        price: parsedPrice,
        currency: termsFormCurrency,
        paymentMethod: termsFormPaymentMethod,
        depositAmount: parsedDeposit,
        depositCurrency: termsFormCurrency,
        handoverDate: termsFormHandoverDate || undefined,
        feeResponsibility: termsFormFeeBy,
        specialConditions: termsFormSpecialConditions,
        notes: termsFormNotes || undefined
      };

      const res = await proposeDealTerms(booking.id, termsPayload);
      if (res.success) {
        toggleProposeTermsModal(false);
        await loadData();
      }
    } finally {
      setIsSubmittingTerms(false);
    }
  };

  // Submit Respond to Terms
  const handleConfirmRespondTerms = async () => {
    if (!booking || !respondModalRevision) return;
    setIsRespondingTerms(true);
    try {
      const res = await respondToDealTerms(booking.id, respondModalRevision.id, respondAction, respondNotes);
      if (res.success) {
        setRespondModalRevision(null);
        await loadData();
      }
    } finally {
      setIsRespondingTerms(false);
    }
  };

  // Submit Inspection Update
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsSubmittingInspection(true);
    try {
      const res = await updateDealInspection(booking.id, {
        action: inspectionAction,
        requestedDate: inspectionDate || undefined,
        requestedTime: inspectionTime || undefined,
        locationNotes: inspectionLocationNotes || undefined,
        result: inspectionAction === 'complete' ? inspectionResult : undefined,
        resultNotes: inspectionAction === 'complete' ? inspectionResultNotes : undefined
      });
      if (res.success) {
        toggleInspectionModal(false);
        await loadData();
      }
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  // Submit Save Financial Clearance (Requirement 4)
  const handleSaveFinancialClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    if (!fcPaidAmount || !fcReceiptVoucherNumber.trim()) {
      showToast('يرجى تحديد المبلغ المدفوع ورقم سند القبض أو الإشعار البنكي', 'error');
      return;
    }
    setIsSavingFinancial(true);
    try {
      const res = await updateBookingFinancialClearance(booking.id, {
        totalAmount: Number(fcTotalAmount || fcPaidAmount),
        paidAmount: Number(fcPaidAmount),
        currency: fcCurrency,
        receiptVoucherNumber: fcReceiptVoucherNumber.trim(),
        paymentMethod: fcPaymentMethod,
        clearanceDate: fcClearanceDate || new Date().toISOString().split('T')[0],
        notes: fcNotes
      });
      if (res.success) {
        toggleFinancialClearanceModal(false);
        await loadData();
      }
    } finally {
      setIsSavingFinancial(false);
    }
  };

  // Submit Save Handover Protocol (Requirement 4)
  const handleSaveHandoverProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setIsSavingHandover(true);
    try {
      const res = await updateBookingHandoverProtocol(booking.id, {
        handoverDate: hpHandoverDate || new Date().toISOString().split('T')[0],
        handedOverBy: hpHandedOverBy || currentUser.name,
        receivedBy: hpReceivedBy || booking.seekerName,
        deedVerified: hpDeedVerified,
        originalDeedHandedOver: hpOriginalDeedHandedOver,
        deedNumber: hpDeedNumber,
        courtOrRegistrarNotaryNotes: hpCourtNotaryNotes,
        keysHandedOver: hpKeysHandedOver,
        numberOfKeys: Number(hpNumberOfKeys) || 1,
        electricityMeterReading: hpElectricityMeter,
        waterMeterReading: hpWaterMeter,
        premisesConditionSatisfied: hpPremisesSatisfied,
        notes: hpNotes
      });
      if (res.success) {
        toggleHandoverModal(false);
        await loadData();
      }
    } finally {
      setIsSavingHandover(false);
    }
  };

  // Submit Raise Dispute (Requirement 10)
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    if (!disputeDescription.trim()) {
      showToast('يرجى كتابة سبب وتفاصيل طلب النزاع', 'error');
      return;
    }
    setIsSubmittingDispute(true);
    try {
      const res = await raiseDealDispute(booking.id, disputeClaimType, disputeDescription.trim());
      if (res.success) {
        toggleDisputeModal(false);
        setDisputeDescription('');
        await loadData();
      }
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Submit Resolve Dispute (Requirement 10)
  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setIsResolvingDispute(true);
    try {
      const res = await resolveDealDispute(booking.id, disputeResolution, disputeResolutionNotes.trim());
      if (res.success) {
        toggleResolveDisputeModal(false);
        await loadData();
      }
    } finally {
      setIsResolvingDispute(false);
    }
  };

  // Submit Complete Deal (Requirement 4, 5, 6, 7)
  const handleConfirmCompleteDeal = async () => {
    if (!booking) return;
    setCompletionErrors([]);
    setIsCompleting(true);
    try {
      const res = await completeBooking(booking.id, {
        notes: completeNotes || 'تم إتمام الصفقة ونقل الملكية بنجاح واعتماد العقد',
        financialClearance: booking.financialClearance,
        handoverProtocol: booking.handoverProtocol,
        forceAdminOverride: isSysAdmin && forceAdminOverride
      });
      if (res.success) {
        toggleCompleteDealModal(false);
        await loadData();
        setActiveTab('completion');
      } else {
        if (res.missingRequirements && res.missingRequirements.length > 0) {
          setCompletionErrors(res.missingRequirements);
        }
      }
    } finally {
      setIsCompleting(false);
    }
  };

  // Submit Cancel Booking (Requirement 10)
  const handleConfirmCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const res = await cancelBookingWithCategory(booking.id, cancelCategory, cancelReason || 'إلغاء باتفاق الطرفين');
      if (res.success) {
        toggleCancelModal(false);
        await loadData();
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Generate Contract Draft from Booking (Requirement 1, 2, 3)
  const handleGenerateContract = async () => {
    if (!booking) return;
    setIsGeneratingContract(true);
    try {
      const res = await generateContractFromBooking(booking.id);
      if (res.success && res.contract) {
        showToast(res.message || 'تم إنشاء مسودة العقد بنجاح واستيراد كافة بيانات الحجز والشروط', 'success');
        await loadData();
        toggleContractModal(true);
      } else {
        showToast(res.message || 'تعذر إنشاء مسودة العقد', 'error');
      }
    } finally {
      setIsGeneratingContract(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="bg-[#16324F] text-white p-4 sm:p-5 flex flex-col gap-3 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#12A889]/20 border border-[#12A889]/40 flex items-center justify-center text-[#12A889] shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 text-white">
                    {booking?.bookingNumber || 'BKG-2026-XXXX'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isSale ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  }`}>
                    {isSale ? 'صفقة بيع عقاري' : 'صفقة إيجار عقاري'}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    رقم الإعلان: <span className="font-mono font-bold text-white">{booking?.listingNumber}</span>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1 line-clamp-1">
                  مساحة متابعة الحجز والاتفاق: {booking?.listingTitle}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="إغلاق مساحة المتابعة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Exclusivity Lock & Security Banner (Requirement 9) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isBookingActive
                  ? 'العقار محجوز حصرياً ومحجوب عن الباحثين وقوائم العرض العامة طوال سريان الحجز.'
                  : isBookingCompleted
                  ? 'تمت الصفقة بنجاح وتم إغلاق الإعلان نهائياً من العرض العام.'
                  : 'الحجز غير نشط حالياً.'}
              </span>
            </div>

            {isBookingActive && booking?.expiresAt && (
              <div className="flex items-center gap-2 font-mono text-xs bg-white/10 px-3 py-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>ينتهي الحجز في: {new Date(booking.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= PIPELINE & NEXT STEP (Requirement 5) ================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 shrink-0 space-y-3">
          {/* 5-Step Pipeline */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {stagesList.map((stg, idx) => {
              const isPast = idx < currentStageIndex || isBookingCompleted;
              const isCurrent = idx === currentStageIndex && !isBookingCompleted;
              return (
                <div
                  key={stg.key}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isCurrent
                      ? 'bg-emerald-50 border-[#12A889] text-[#16324F] shadow-2xs ring-2 ring-[#12A889]/30'
                      : isPast
                      ? 'bg-white border-emerald-200 text-emerald-900'
                      : 'bg-white/60 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#12A889] text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full">{stg.label}</span>
                </div>
              );
            })}
          </div>

          {/* Dynamic Next Step Banner */}
          {workspaceData?.nextStep && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="font-extrabold text-amber-950 flex items-center gap-2">
                    <span>الخطوة التالية المطلوبة:</span>
                    <span className="underline decoration-amber-400 font-black">{workspaceData.nextStep.title}</span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">{workspaceData.nextStep.description}</p>
                </div>
              </div>

              {/* Action shortcut button */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {isBookingActive && !isTermsApproved && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('terms');
                      toggleProposeTermsModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تقديم / تعديل الشروط</span>
                  </button>
                )}

                {isBookingActive && isTermsApproved && isManagingParty && (
                  <button
                    type="button"
                    onClick={() => toggleCompleteDealModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>إتمام الصفقة رسمياً</span>
                  </button>
                )}

                {isBookingActive && (hasContract || isTermsApproved) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasContract) {
                        toggleContractModal(true);
                      } else {
                        setActiveTab('contract');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#16324F] hover:bg-[#0f2438] text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-[#12A889]" />
                    <span>{hasContract ? 'عرض وثيقة العقد' : 'إنشاء وثيقة العقد'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= TAB NAVIGATION ================= */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white shrink-0 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الشروط والتفاوض المالي</span>
            {isTermsApproved ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="شروط معتمدة" />
            ) : isTermsPendingReapproval ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="تعديل قيد الاعتماد" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inspection')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inspection'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>المعاينة الميدانية والوثائق</span>
            {booking?.inspectionVisit?.status === 'confirmed' && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">موعد مؤكد</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>المحادثة وسجل التواصل</span>
            {booking?.messages && booking.messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                {booking.messages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>تفاصيل العقار والطرفين والضوابط</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contract')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contract'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>العقد والتوثيق الرسمي</span>
            {hasContract ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {currentContract?.status === 'signed' ? 'موقع رسمياً' : currentContract?.status === 'approved' ? 'معتمد' : 'مسودة موثقة'}
              </span>
            ) : isTermsApproved ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold animate-pulse">
                جاهز للإنشاء
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completion')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'completion'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isBookingCompleted ? 'محضر إتمام الصفقة والأرشيف' : 'المرحلة النهائية وإتمام الصفقة'}</span>
            {isBookingCompleted ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                مكتمل ومؤرشف
              </span>
            ) : prereqsData?.canComplete ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold animate-pulse">
                جاهز للإتمام (5/5)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {prereqsData?.requirements ? `${prereqsData.requirements.filter((r: any) => r.satisfied).length}/5 متطلبات` : 'المتطلبات'}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB CONTENTS ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {isLoading && !workspaceData ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#12A889]" />
              <p className="text-sm font-bold">جاري تحميل بيانات مساحة متابعة الصفقة...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DEAL TERMS & NEGOTIATION */}
              {activeTab === 'terms' && (
                <div className="space-y-6">
                  {/* Approved Core Terms Certified Card (Requirement 7 & 8) */}
                  {isTermsApproved && booking?.agreedTerms ? (
                    <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-3xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-emerald-950 text-sm sm:text-base">
                                الشروط الأساسية المعتمدة للاتفاق المبدئي
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold">
                                معتمدة وملزمة مبدئياً
                              </span>
                            </div>
                            <p className="text-emerald-800 text-xs mt-0.5">
                              تم اعتماد هذه البنود صراحة من الطرفين في{' '}
                              <span className="font-bold">
                                {booking.agreedTermsApprovedAt
                                  ? new Date(booking.agreedTermsApprovedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
                                  : 'الجلسة الموثقة'}
                              </span>
                              . أي تعديل عليها لا يمكن أن يتم بصمت.
                            </p>
                          </div>
                        </div>

                        {isBookingActive && (
                          <button
                            type="button"
                            onClick={() => toggleProposeTermsModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>طلب تعديل الشروط المعتمدة</span>
                          </button>
                        )}
                      </div>

                      {/* Terms Key Data Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/80 p-4 rounded-2xl border border-emerald-200/80 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">السعر النهائي المتفق عليه:</span>
                          <span className="font-black text-emerald-900 text-base font-mono">
                            {booking.agreedTerms.price.toLocaleString()} {booking.agreedTerms.currency}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">طريقة الدفع المعتمدة:</span>
                          <span className="font-bold text-slate-800">
                            {booking.agreedTerms.paymentMethod === 'certified_check' ? 'شيك مصرفي مصدق' :
                             booking.agreedTerms.paymentMethod === 'cash' ? 'نقداً بالكامل' :
                             booking.agreedTerms.paymentMethod === 'installments' ? 'أقساط ودفعات' :
                             booking.agreedTerms.paymentMethod || 'نقداً'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">مبلغ العربون المقيد:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {booking.agreedTerms.depositAmount
                              ? `${booking.agreedTerms.depositAmount.toLocaleString()} ${booking.agreedTerms.depositCurrency || booking.agreedTerms.currency}`
                              : 'حسب العقد المبرم'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">موعد الإفراغ / التسليم:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {booking.agreedTerms.handoverDate || 'خلال 14 يوماً من توقيع العقد'}
                          </span>
                        </div>
                      </div>

                      {/* Special Conditions List */}
                      {booking.agreedTerms.specialConditions && booking.agreedTerms.specialConditions.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-bold text-emerald-950 block">البنود والشروط الخاصة المتفق عليها:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {booking.agreedTerms.specialConditions.map((cond, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-200/60 text-xs text-slate-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{cond}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isTermsPendingReapproval ? (
                    /* Anti-Silent Modification Warning Banner (Requirement 8) */
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <BadgeAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-black text-amber-950 text-sm sm:text-base">
                            تنبيه: تم تعليق الشروط المعتمدة لوجود طلب تعديل جديد (منع التعديل الصامت)
                          </h4>
                          <p className="text-amber-800 text-xs mt-1">
                            تم اقتراح تعديل على الشروط السابقة. بموجب ضوابط المنصة الصارمة، لا يمكن سريان أي تعديل بصمت، ويلزم مراجعة واعتماد الطرف الآخر للنسخة الجديدة رقم #{booking?.termsHistory?.[0]?.version}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Header: Action to Propose New Terms */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">سجل عروض ومسودات الشروط (التفاوض المالي)</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        يوثق كل عرض مالي أو تعديل مع التاريخ وهوية من قام بالاقتراح والرد.
                      </p>
                    </div>

                    {isBookingActive && (
                      <button
                        type="button"
                        onClick={() => toggleProposeTermsModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>اقتراح مسودة شروط جديدة</span>
                      </button>
                    )}
                  </div>

                  {/* Revisions History List (Requirement 4) */}
                  <div className="space-y-3">
                    {(!booking?.termsHistory || booking.termsHistory.length === 0) ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">لم يتم تسجيل مسودات شروط بعد في هذه العملية.</p>
                        {isBookingActive && (
                          <button
                            type="button"
                            onClick={() => toggleProposeTermsModal(true)}
                            className="text-[#12A889] text-xs font-bold underline cursor-pointer"
                          >
                            ابدأ الآن باقتراح مسودة الشروط الأولى
                          </button>
                        )}
                      </div>
                    ) : (
                      booking.termsHistory.map((rev, revIdx) => {
                        const isLatest = revIdx === 0;
                        const isProposerMe = rev.proposedBy.id === currentUser.id;
                        const canIRespond = isBookingActive && isLatest && !isProposerMe && (rev.status === 'pending_approval' || rev.status === 'pending_reapproval');

                        return (
                          <div
                            key={rev.id}
                            className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all space-y-3 ${
                              rev.status === 'accepted'
                                ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                                : rev.status === 'pending_approval' || rev.status === 'pending_reapproval'
                                ? 'border-amber-300 ring-2 ring-amber-100 shadow-2xs'
                                : 'border-slate-200 opacity-80'
                            }`}
                          >
                            {/* Revision Top Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold bg-[#16324F] text-white px-2 py-0.5 rounded-lg">
                                  إصدار #{rev.version}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  بواسطة: {rev.proposedBy.name} ({rev.proposedBy.role === 'seeker' ? 'الباحث' : 'المعلن'})
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  🕒 {rev.proposedAt}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {rev.status === 'accepted' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>معتمد رسمياً</span>
                                  </span>
                                ) : rev.status === 'pending_approval' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>قيد مراجعة الطرف الآخر</span>
                                  </span>
                                ) : rev.status === 'pending_reapproval' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 font-bold text-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                    <span>تعديل معلق لإعادة الاعتماد</span>
                                  </span>
                                ) : rev.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-xs">
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>مرفوض</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                                    تم استبداله بإصدار أحدث
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Terms Snapshot */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                              <div>
                                <span className="text-slate-400 block mb-0.5">السعر:</span>
                                <span className="font-black text-slate-900 font-mono text-sm">
                                  {rev.terms.price.toLocaleString()} {rev.terms.currency}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">طريقة السداد:</span>
                                <span className="font-bold text-slate-800">
                                  {rev.terms.paymentMethod === 'certified_check' ? 'شيك مصدق' :
                                   rev.terms.paymentMethod === 'cash' ? 'نقداً' :
                                   rev.terms.paymentMethod === 'installments' ? 'أقساط' : rev.terms.paymentMethod}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">العربون:</span>
                                <span className="font-bold text-slate-800 font-mono">
                                  {rev.terms.depositAmount ? `${rev.terms.depositAmount.toLocaleString()} ${rev.terms.depositCurrency || rev.terms.currency}` : 'غير محدد'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">موعد التسليم:</span>
                                <span className="font-bold text-slate-800 font-mono">
                                  {rev.terms.handoverDate || 'حسب الاتفاق'}
                                </span>
                              </div>
                            </div>

                            {/* Special Conditions of this revision */}
                            {rev.terms.specialConditions && rev.terms.specialConditions.length > 0 && (
                              <div className="text-xs space-y-1">
                                <span className="text-slate-500 font-bold">الشروط المحددة:</span>
                                <ul className="list-disc list-inside text-slate-700 space-y-0.5 pr-2">
                                  {rev.terms.specialConditions.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Response details if responded */}
                            {rev.responseBy && (
                              <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                                <span className="text-slate-600">
                                  الرد بواسطة: <span className="font-bold text-slate-900">{rev.responseBy.name}</span> في {rev.responseAt}
                                  {rev.responseNotes && ` — ملاحظات: "${rev.responseNotes}"`}
                                </span>
                              </div>
                            )}

                            {/* Counterparty Accept / Reject Action Bar */}
                            {canIRespond && (
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRespondModalRevision(rev);
                                    setRespondAction('accept');
                                    setRespondNotes('موافق ومعتمد لكافة البنود المذكورة');
                                  }}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>قبول واعتماد هذه الشروط رسمياً</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRespondModalRevision(rev);
                                    setRespondAction('reject');
                                    setRespondNotes('');
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>رفض الشروط</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INSPECTION VISIT & DEED VERIFICATION (Requirement 6) */}
              {activeTab === 'inspection' && (
                <div className="space-y-6">
                  {/* Current Inspection Status Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base">
                            حالة المعاينة الميدانية ومطابقة البصيرة
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5">
                            التنسيق للمعاينة على الطبيعة ومطابقة أصول الصكوك الشرعية مع الأمين المعتمد.
                          </p>
                        </div>
                      </div>

                      {/* Inspection Status Badge */}
                      <div>
                        {booking?.inspectionVisit?.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>تمت المعاينة الميدانية بنجاح</span>
                          </span>
                        ) : booking?.inspectionVisit?.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-950 font-bold text-xs border border-blue-300">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>الموعد مؤكد بين الطرفين</span>
                          </span>
                        ) : booking?.inspectionVisit?.status === 'requested' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 font-bold text-xs border border-amber-300">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>طلب معاينة قيد تأكيد المعلن</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                            لم يُحدد موعد معاينة بعد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inspection Details View */}
                    {booking?.inspectionVisit && booking.inspectionVisit.status !== 'not_scheduled' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">التاريخ والوقت المحدد:</span>
                            <span className="font-black text-slate-900 font-mono text-sm">
                              {booking.inspectionVisit.requestedDate || 'غير محدد'} — {booking.inspectionVisit.requestedTime || ''}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block mb-0.5">مكان ونقطة اللقاء:</span>
                            <span className="font-bold text-slate-800">
                              {booking.inspectionVisit.locationNotes || 'أمام مدخل العقار مباشرة'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block mb-0.5">المُنسق:</span>
                            <span className="font-bold text-slate-800">
                              {booking.inspectionVisit.scheduledBy || booking.seekerName}
                            </span>
                          </div>
                        </div>

                        {/* Completed Result Box */}
                        {booking.inspectionVisit.status === 'completed' && (
                          <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                            booking.inspectionVisit.result === 'satisfied'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : booking.inspectionVisit.result === 'needs_negotiation'
                              ? 'bg-amber-50 border-amber-300 text-amber-950'
                              : 'bg-rose-50 border-rose-300 text-rose-950'
                          }`}>
                            <div className="flex items-center gap-2 font-black">
                              <span>نتيجة المعاينة المسجلة:</span>
                              <span>
                                {booking.inspectionVisit.result === 'satisfied' ? '✅ معاينة ناجحة ومطابقة للمواصفات وصك البصيرة' :
                                 booking.inspectionVisit.result === 'needs_negotiation' ? '⚠️ توجد ملاحظات تستدعي تعديل السعر أو الشروط' :
                                 '❌ عدم الرغبة بعد المعاينة'}
                              </span>
                            </div>
                            {booking.inspectionVisit.resultNotes && (
                              <p className="text-slate-700 text-xs mt-1">
                                ملاحظات المعاينة: "{booking.inspectionVisit.resultNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action buttons on inspection */}
                        {isBookingActive && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                            {booking.inspectionVisit.status === 'requested' && isManagingParty && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectionAction('confirm');
                                  setInspectionDate(booking.inspectionVisit?.requestedDate || '');
                                  setInspectionTime(booking.inspectionVisit?.requestedTime || '16:00');
                                  setInspectionLocationNotes(booking.inspectionVisit?.locationNotes || '');
                                  toggleInspectionModal(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>تأكيد موعد المعاينة المقترح</span>
                              </button>
                            )}

                            {booking.inspectionVisit.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectionAction('complete');
                                  setInspectionResult('satisfied');
                                  setInspectionResultNotes('العقار مطابق للوصف وصك البصيرة الشرعية سليم');
                                  toggleInspectionModal(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تسجيل إتمام المعاينة والنتيجة</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setInspectionAction('request');
                                setInspectionDate('');
                                setInspectionTime('16:00');
                                setInspectionLocationNotes('');
                                toggleInspectionModal(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 cursor-pointer"
                            >
                              <span>تغيير الموعد / إعادة التنسيق</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No Inspection Scheduled Yet */
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
                        <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">لم يتم تحديد موعد معاينة ميدانية بعد</h4>
                          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                            يُفضل تحديد موعد للمعاينة على الطبيعة لفحص العقار ومطابقة بصيرة الملكية قبل اعتماد الشروط وتوقيع العقد.
                          </p>
                        </div>
                        {isBookingActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectionAction('request');
                              setInspectionDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                              setInspectionTime('16:30');
                              setInspectionLocationNotes('أمام بوابة العقار - التنسيق المسبق هاتفياً');
                              toggleInspectionModal(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <CalendarCheck className="w-4 h-4" />
                            <span>طلب موعد معاينة ميدانية الآن</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CHAT & COMMUNICATION (Requirement 2) */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[520px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {(!booking?.messages || booking.messages.length === 0) ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</p>
                      </div>
                    ) : (
                      booking.messages.map(msg => {
                        const isSystem = msg.type === 'system' || msg.type === 'terms_proposal' || msg.type === 'terms_accepted' || msg.type === 'terms_modified' || msg.type === 'inspection_update';
                        const isMine = msg.senderId === currentUser.id;

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center my-2">
                              <div className="max-w-md bg-slate-100 text-slate-700 text-xs px-3.5 py-1.5 rounded-xl border border-slate-200 text-center space-y-0.5 shadow-2xs">
                                <span className="font-mono text-[10px] text-slate-400 block">{msg.timestamp}</span>
                                <span className="font-medium">{msg.text}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMine ? 'items-start' : 'items-end'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                              <span className="font-bold text-slate-700">{msg.senderName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                {msg.senderRole === 'seeker' ? 'باحث' : msg.senderRole === 'system_admin' ? 'مدير نظام' : 'معلن'}
                              </span>
                              <span className="font-mono text-[10px]">{msg.timestamp}</span>
                            </div>

                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-2xs ${
                                isMine
                                  ? 'bg-[#12A889] text-white rounded-br-xs'
                                  : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Prompts Bar */}
                  {isBookingActive && (
                    <div className="bg-slate-100/80 px-3 py-2 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-slate-700 shrink-0">
                      <span className="text-slate-400 shrink-0">مقترحات:</span>
                      {[
                        'أرغب في تحديد موعد لمعاينة العقار على الطبيعة',
                        'تم الاطلاع على وثائق الملكية، نود مناقشة شروط الدفع',
                        'نحن جاهزون لسداد العربون وتجهيز صك البيع المبدئي',
                        'يرجى إرسال نسخة من عقد الإيجار المقترح للمراجعة'
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleQuickPrompt(prompt)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#12A889] hover:text-[#12A889] shrink-0 transition-colors cursor-pointer text-right"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input Form */}
                  {isBookingActive ? (
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        placeholder="اكتب رسالتك بخصوص هذا العقار والحجز..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSendingMessage || !messageInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5 rotate-180" />
                        <span>إرسال</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-slate-100 text-slate-500 text-xs text-center font-bold">
                      تم إغلاق المحادثة لانتهاء أو اكتمال الحجز.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: OVERVIEW & PROPERTY SPECS (Requirement 1) */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Property Card Full Details */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {booking?.listingImage && (
                        <img
                          src={booking.listingImage}
                          alt={booking.listingTitle}
                          className="w-full sm:w-44 h-32 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {booking?.listingNumber}
                          </span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {isSale ? 'للبيع' : 'للإيجار'}
                          </span>
                          {booking?.listingGovernorate && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{booking.listingGovernorate}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 text-base sm:text-lg">{booking?.listingTitle}</h3>
                        <div className="text-base font-black text-[#12A889] font-mono">
                          السعر المعلن: {booking?.listingPrice.toLocaleString()} {booking?.listingCurrency}
                        </div>
                        {listing && (
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">{listing.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Parties Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      {/* Seeker Card */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">طرف الباحث:</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            مقدم الطلب
                          </span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">{booking?.seekerName}</div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking?.seekerPhone}</span>
                        </div>
                      </div>

                      {/* Advertiser Card */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">طرف المعلن المسؤول:</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            معلن موثق
                          </span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">{booking?.advertiserName}</div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking?.advertiserPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Platform Governance & Guarantee Banner */}
                    <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                      <div className="font-bold text-[#16324F] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#12A889]" />
                        <span>حوكمة دلنّي لحماية صفقات العقار اليمني</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        يتم تشفير وتوثيق كل مرحلة، وحجب العقار المحجوز عن السوق العام، ومنع أي تعديل صامت على الشروط المعتمدة لضمان حقوق الباحث والمعلن.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CONTRACT & OFFICIAL DOCUMENTATION (منظومة العقود والتوثيق) */}
              {activeTab === 'contract' && (
                <div className="space-y-6">
                  {currentContract ? (
                    <>
                      {/* 1. CONTRACT MAIN STATUS BANNER */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                              <FileCheck className="w-6 h-6 text-[#12A889]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-base">
                                  {currentContract.contractType === 'sale'
                                    ? 'وثيقة عقد بيع عقار شرعي قطعي'
                                    : 'وثيقة عقد إيجار عقار سكني/تجاري موثق'}
                                </span>
                                <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                  {currentContract.contractNumber}
                                </span>
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  إصدار (v{currentContract.currentVersion})
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                موثق رسمياً وفق أحكام قانون المعاملات المدنية والشرعية اليمنية ومحكوم بضوابط حماية الصفقات
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => toggleContractModal(true)}
                              className="px-4 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                              <span>فتح وثيقة العقد للمراجعة والطباعة</span>
                            </button>
                          </div>
                        </div>

                        {/* Anti-Silent Modification Warning if pending approval */}
                        {currentContract.isModificationPendingApproval && (
                          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-black text-amber-900">
                                تنبيه حوكمة صارم (تعديل قيد الاعتماد - منع التعديل الصامت):
                              </div>
                              <p className="text-[11px] leading-relaxed mt-0.5">
                                تم تقديم مسودة تعديل جديدة على هذا العقد المعتمد، وقد عُلّق سريان الاعتماد السابق تلقائياً لحين موافقة الطرفين صراحةً على التعديلات وتوثيق الإصدار الجديد.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Contract Lifecycle and Status Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">حالة العقد القانونية:</div>
                            <div className="font-black flex items-center gap-1.5">
                              {currentContract.status === 'signed' ? (
                                <span className="text-teal-700 font-extrabold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> موقع رسمياً
                                </span>
                              ) : currentContract.status === 'approved' ? (
                                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> معتمد من الطرفين
                                </span>
                              ) : currentContract.status === 'pending_approval' ? (
                                <span className="text-purple-700 font-extrabold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> بانتظار الاعتماد
                                </span>
                              ) : currentContract.status === 'cancelled' ? (
                                <span className="text-rose-700 font-extrabold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> ملغي ومؤرشف
                                </span>
                              ) : (
                                <span className="text-amber-700 font-extrabold flex items-center gap-1">
                                  <Edit3 className="w-3.5 h-3.5" /> مسودة قيد التدقيق
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">إجمالي قيمة الصفقة:</div>
                            <div className="font-black text-slate-900 font-mono">
                              {currentContract.financialTerms.totalAmount.toLocaleString()} {currentContract.financialTerms.currency}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">العربون المعتمد:</div>
                            <div className="font-black text-slate-900 font-mono">
                              {currentContract.financialTerms.depositAmount
                                ? `${currentContract.financialTerms.depositAmount.toLocaleString()} ${currentContract.financialTerms.currency}`
                                : 'لا يوجد عربون'}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">إصدارات العقد المسجلة:</div>
                            <div className="font-black text-slate-900">
                              {currentContract.versions.length} إصدارات موثقة
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. PARTIES AND APPROVALS CARD */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-[#12A889]" />
                          <span>أطراف العقد والاعتمادات والتوقيعات الرسمية</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* First Party (Seller/Lessor) */}
                          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="font-extrabold text-slate-800">
                                الطرف الأول ({currentContract.firstParty.role === 'seller' ? 'البائع / المالك' : 'المؤجر'})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {currentContract.firstParty.signatureStatus === 'signed' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> تم التوقيع الإلكتروني
                                  </span>
                                ) : currentContract.firstPartyApproval ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                                    <Check className="w-3 h-3" /> معتمد
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 text-slate-700">
                              <div className="font-bold text-slate-900 text-sm">
                                {currentContract.firstParty.name}
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 font-mono" dir="ltr">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{currentContract.firstParty.phone}</span>
                              </div>
                              {currentContract.firstParty.signedAt && (
                                <div className="text-[10px] text-teal-800 font-medium">
                                  وُقّع في: {new Date(currentContract.firstParty.signedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Second Party (Buyer/Lessee) */}
                          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="font-extrabold text-slate-800">
                                الطرف الثاني ({currentContract.secondParty.role === 'buyer' ? 'المشتري' : 'المستأجر'})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {currentContract.secondParty.signatureStatus === 'signed' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> تم التوقيع الإلكتروني
                                  </span>
                                ) : currentContract.secondPartyApproval ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                                    <Check className="w-3 h-3" /> معتمد
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 text-slate-700">
                              <div className="font-bold text-slate-900 text-sm">
                                {currentContract.secondParty.name}
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 font-mono" dir="ltr">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{currentContract.secondParty.phone}</span>
                              </div>
                              {currentContract.secondParty.signedAt && (
                                <div className="text-[10px] text-teal-800 font-medium">
                                  وُقّع في: {new Date(currentContract.secondParty.signedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. LEGAL CLAUSES SUMMARY & PREVIEW */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#12A889]" />
                            <span>بنود العقد المستوردة والاشتراطات الخاصة ({currentContract.clauses.length} بنود)</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleContractModal(true)}
                            className="text-xs font-bold text-[#12A889] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>مراجعة وتعديل الصياغة</span>
                            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                          </button>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {currentContract.clauses.map((clause: ContractClause, idx: number) => (
                            <div
                              key={clause.id || idx}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                            >
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono shrink-0">
                                  {clause.number || idx + 1}
                                </span>
                                <span>{clause.title}</span>
                                {clause.isMandatory && (
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                    بند نظامي
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 pr-7">
                                {clause.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. AUDIT TRAIL AND VERSIONS CARD */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <History className="w-4 h-4 text-purple-600" />
                            <span>سجل الإصدارات الموثقة وتاريخ التعديلات</span>
                          </h4>
                          <span className="text-xs text-slate-400 font-mono">
                            {(currentContract.versions || currentContract.versionHistory || []).length} نسخ محفوظة
                          </span>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                          {(currentContract.versions || currentContract.versionHistory || []).slice().reverse().map((ver: ContractVersion) => (
                            <div
                              key={ver.version}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                ver.version === currentContract.currentVersion
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span>الإصدار رقم (v{ver.version})</span>
                                  {ver.version === currentContract.currentVersion && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                                      الإصدار الساري
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-600 text-[11px]">
                                  {ver.summaryOfChanges || 'إنشاء أو تعديل مسودة العقد'}
                                </p>
                              </div>

                              <div className="text-left text-[10px] text-slate-400 font-mono shrink-0">
                                <div>{ver.createdBy?.name || 'النظام'}</div>
                                <div>{new Date(ver.createdAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* NO CONTRACT YET - CALL TO ACTION */
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5 shadow-xs">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#12A889] border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
                        <FileCheck className="w-8 h-8" />
                      </div>

                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="font-black text-slate-900 text-lg">
                          إنشاء مسودة العقد الرسمي المعتمد
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          يمكنك تحويل هذا الحجز إلى مسودة عقد رسمية (عقد بيع قطعي أو عقد إيجار موثق) مع استيراد كافة بيانات العقار والطرفين والشروط المتفق عليها تلقائياً دون إعادة إدخالها.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-xs text-right">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>استيراد أوتوماتيكي شامل</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            يتم سحب السعر، العملة، جدول الدفعات، أطوال وحدود البصيرة، وتاريخ الاستلام.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>حوكمة ومنع التعديل الصامت</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            حفظ كافة الإصدارات، وتوثيق موافقة الطرفين، ومنع أي تغيير على النسخة المعتمدة دون إشعار صريح.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isGeneratingContract}
                          onClick={handleGenerateContract}
                          className="px-6 py-3.5 rounded-2xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-black text-sm shadow-md hover:shadow-lg flex items-center gap-2 mx-auto transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span>{isGeneratingContract ? 'جاري تحرير مسودة العقد واستيراد البيانات...' : 'إنشاء مسودة العقد الرسمي الآن'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: FINAL STAGE, COMPLETION DOSSIER & ARCHIVAL (المرحلة النهائية وإتمام الصفقة) */}
              {activeTab === 'completion' && (
                <div className="space-y-6">
                  {isBookingCompleted ? (
                    /* COMPLETED DEAL DOSSIER & ARCHIVAL VIEW */
                    <div className="space-y-6">
                      {/* 1. Official Completed Dossier Banner */}
                      <div className="bg-gradient-to-r from-emerald-900 to-[#0F2942] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-700/50 pb-5">
                          <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-300 shadow-inner">
                              <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg sm:text-xl font-black text-white">
                                  محضر إغلاق المعاملة العقارية والأرشيف الدائم
                                </h3>
                                <span className="px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                                  مكتمل رسمياً ومغلق نهائياً
                                </span>
                              </div>
                              <p className="text-xs text-emerald-200/90 mt-1">
                                النتيجة النهائية:{' '}
                                <span className="font-black text-white">
                                  {isSale ? 'بيع عقاري قطعي ناقل للملكية' : 'إيجار عقاري رسمي موحد'}
                                </span>{' '}
                                | رقم المحضر:{' '}
                                <span className="font-mono font-black text-emerald-300">
                                  {booking?.finalDossierNumber || 'DOS-2026-FINAL'}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleContractModal(true)}
                              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-emerald-50 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                            >
                              <FileCheck className="w-4 h-4 text-[#12A889]" />
                              <span>عرض وثيقة العقد الموقعة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="px-3.5 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-600/50"
                            >
                              <Printer className="w-4 h-4" />
                              <span>طباعة المحضر</span>
                            </button>
                          </div>
                        </div>

                        {/* Closure Meta Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-black/20 p-4 rounded-2xl border border-white/10">
                          <div>
                            <span className="text-emerald-300/80 block text-[11px] mb-0.5">تاريخ الإغلاق والتوثيق:</span>
                            <span className="font-bold text-white font-mono">
                              {booking?.completedAt ? new Date(booking.completedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }) : 'معتمد'}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-300/80 block text-[11px] mb-0.5">المحرر والمسؤول:</span>
                            <span className="font-bold text-white">
                              {booking?.completedBy || 'إدارة النظام'}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-300/80 block text-[11px] mb-0.5">حالة العقار والإعلان:</span>
                            <span className="font-bold text-emerald-300 flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" />
                              <span>مغلق ومحجوب نهائياً</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-300/80 block text-[11px] mb-0.5">ضمان الحوكمة:</span>
                            <span className="font-bold text-white">
                              منع إعادة العرض تلقائياً
                            </span>
                          </div>
                        </div>

                        {/* Permanent Governance Notice */}
                        <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-500/30 text-xs text-emerald-100 flex items-start gap-2.5 leading-relaxed">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-white mb-0.5">
                              حماية الأرشيف ومنع إعادة العقار المباع/المؤجر للوفرة (المتطلب 6 و 7 و 8):
                            </span>
                            تم إغلاق الإعلان العقاري برقم [{booking?.listingNumber}] نهائياً وتحديث وضعه إلى ({isSale ? 'مباع' : 'مؤجر'})، ويمنع النظام إعادة العقار إلى قوائم البحث أو العرض أو استقبال طلبات جديدة تلقائياً، مع الاحتفاظ الدائم بكافة وثائق العقد ومحاضر التسليم والمراسلات وسجل التدقيق في هذا الأرشيف.
                          </div>
                        </div>
                      </div>

                      {/* 2. Detailed Dossier Records 4-Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Record 1: Contract Document Record */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <FileSignature className="w-5 h-5 text-indigo-600" />
                              <h4 className="font-black text-slate-900 text-sm">1. وثيقة العقد الرسمية المعتمدة</h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200">
                              v{currentContract?.currentVersion || 1}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div><span className="text-slate-400">رقم العقد:</span> <span className="font-mono font-bold">{currentContract?.contractNumber || booking?.contractNumber || 'موثق'}</span></div>
                            <div><span className="text-slate-400">النوع:</span> <span className="font-bold">{isSale ? 'عقد بيع قطعي ومناقلة ملكية' : 'عقد إيجار عقار سكني/تجاري'}</span></div>
                            <div><span className="text-slate-400">حالة التوقيع:</span> <span className="text-emerald-700 font-bold">موقع ومختوم إلكترونياً من الطرفين</span></div>
                            <div><span className="text-slate-400">البصمة الرقمية:</span> <span className="font-mono text-[10px] text-slate-500">{currentContract?.electronicSignatures?.[0]?.digitalFingerprint || 'SIG-YE-CERTIFIED'}</span></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleContractModal(true)}
                            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>استعراض بنود العقد وتواقيع الأطراف</span>
                          </button>
                        </div>

                        {/* Record 2: Financial Clearance Record */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <Receipt className="w-5 h-5 text-emerald-600" />
                              <h4 className="font-black text-slate-900 text-sm">2. سند المخالصة المالية المعتمد</h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              خالصة مسددة
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div><span className="text-slate-400">رقم سند القبض / الإشعار:</span> <span className="font-mono font-bold text-emerald-800">{booking?.financialClearance?.receiptVoucherNumber || 'VOU-YE-RECORDED'}</span></div>
                            <div><span className="text-slate-400">المبلغ المسدد:</span> <span className="font-mono font-black text-slate-900">{booking?.financialClearance?.paidAmount?.toLocaleString() || booking?.listingPrice?.toLocaleString()} {booking?.financialClearance?.currency || booking?.listingCurrency}</span></div>
                            <div><span className="text-slate-400">طريقة السداد:</span> <span className="font-bold">{booking?.financialClearance?.paymentMethod || 'سند قبض معتمد'}</span></div>
                            <div><span className="text-slate-400">تاريخ المخالصة:</span> <span className="font-mono font-bold">{booking?.financialClearance?.clearanceDate || booking?.updatedAt}</span></div>
                          </div>
                          <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900">
                            سند القبض المالي موثق قانونياً ومقيد ضمن الأرشيف المالي للعملية.
                          </div>
                        </div>

                        {/* Record 3: Handover Protocol Record */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <Key className="w-5 h-5 text-amber-600" />
                              <h4 className="font-black text-slate-900 text-sm">3. محضر استلام وتسليم العقار</h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                              تم الاستلام
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div><span className="text-slate-400">تاريخ التسليم الفعلي:</span> <span className="font-mono font-bold">{booking?.handoverProtocol?.handoverDate || booking?.updatedAt}</span></div>
                            <div><span className="text-slate-400">المسلّم:</span> <span className="font-bold">{booking?.handoverProtocol?.handedOverBy || booking?.advertiserName}</span></div>
                            <div><span className="text-slate-400">المستلم:</span> <span className="font-bold">{booking?.handoverProtocol?.receivedBy || booking?.seekerName}</span></div>
                            <div><span className="text-slate-400">{isSale ? 'صك البصيرة الشرعية:' : 'مفاتيح العقار والعدادات:'}</span> <span className="font-bold text-slate-900">{isSale ? (booking?.handoverProtocol?.deedVerified ? 'تم تدقيق البصيرة وحيازة العقار' : 'صك الملكية مقيد') : `تم تسليم المفاتيح (${booking?.handoverProtocol?.numberOfKeys || 1})`}</span></div>
                          </div>
                          <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900">
                            محضر الاستلام موقع ومطابق للشروط التعاقدية ومعاينة العقار.
                          </div>
                        </div>

                        {/* Record 4: Notifications and Audit History */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <History className="w-5 h-5 text-purple-600" />
                              <h4 className="font-black text-slate-900 text-sm">4. إشعارات الإتمام وسجل المراسلات</h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200">
                              مؤرشف دائم
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div><span className="text-slate-400">إشعارات الإتمام (المتطلب 9):</span> <span className="text-emerald-700 font-bold">تم إرسال إشعارات الإتمام للطرفين</span></div>
                            <div><span className="text-slate-400">سجل الرسائل المتبادلة:</span> <span className="font-mono font-bold">{booking?.messages?.length || 0} رسالة مسجلة</span></div>
                            <div><span className="text-slate-400">حالة النزاعات:</span> <span className="text-emerald-700 font-bold">خالية من أي نزاع أو اعتراض</span></div>
                            <div><span className="text-slate-400">سجل التدقيق:</span> <span className="font-bold">مقيد في سجل التدقيق غير القابل للتلاعب</span></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('chat')}
                            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
                            <span>استعراض سجل المحادثة والرسائل المؤرشفة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PENDING DEAL COMPLETION PREREQUISITES MATRIX */
                    <div className="space-y-6">
                      {/* Regulatory Notice Banner (Requirement 3 & 4) */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border-2 border-amber-300 shadow-xs space-y-2 text-xs text-amber-950">
                        <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>ضوابط الحوكمة الصارمة لإتمام المعاملة العقارية (المتطلب 3 و 4):</span>
                        </div>
                        <p className="text-amber-900 leading-relaxed text-[11px] sm:text-xs">
                          وفقاً للضوابط القانونية والشرعية المنظمة للمنصة: لا تعتبر الموافقة المبدئية أو اعتماد مسودة العقد توقيعاً قانونياً أو إتماماً للصفقة. يجب استيفاء كافة المتطلبات الخمسة الإلزامية المحددة أدناه قبل التمكن من إصدار محضر الإغلاق النهائي وتحديث حالة العقار إلى مباع أو مؤجر ومنع إعادته للوفرة.
                        </p>
                      </div>

                      {/* Prerequisites Completion Progress Bar */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                              <Scale className="w-5 h-5 text-[#12A889]" />
                              <span>مصفوفة المتطلبات الخمسة لإتمام المعاملة</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              تحقق دقيق من كل متطلب قانوني وإجرائي لنوع المعاملة ({isSale ? 'بيع عقاري' : 'إيجار عقاري'})
                            </p>
                          </div>
                          <div className="text-left">
                            <span className="font-mono font-black text-lg text-[#12A889]">
                              {prereqsData?.requirements ? prereqsData.requirements.filter((r: any) => r.satisfied).length : 0} / 5
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 block">متطلبات مستوفاة</span>
                          </div>
                        </div>

                        {/* Progress meter */}
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              prereqsData?.canComplete ? 'bg-emerald-500' : 'bg-[#12A889]'
                            }`}
                            style={{
                              width: `${((prereqsData?.requirements ? prereqsData.requirements.filter((r: any) => r.satisfied).length : 0) / 5) * 100}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* 5 Interactive Requirements Cards */}
                      <div className="space-y-3">
                        {/* 1. Contract Approval */}
                        {(() => {
                          const reqItem = prereqsData?.requirements?.find((r: any) => r.key === 'contract_approval');
                          const isSatisfied = Boolean(reqItem?.satisfied);
                          return (
                            <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                              isSatisfied ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    isSatisfied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {isSatisfied ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-sm">1. مراجعة واعتماد بنود العقد من الطرفين</h4>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isSatisfied ? 'معتمد بالتراضي' : 'بانتظار الاعتماد'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                      {reqItem?.details || 'يلزم اعتماد مسودة العقد صراحة من الطرف الأول والطرف الثاني للإصدار الحالي.'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleContractModal(true)}
                                  className="px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-[#16324F] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#12A889]" />
                                  <span>{isSatisfied ? 'مراجعة العقد المعتمد' : 'فتح العقد للاعتماد'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 2. Electronic Signatures */}
                        {(() => {
                          const reqItem = prereqsData?.requirements?.find((r: any) => r.key === 'contract_signature');
                          const isSatisfied = Boolean(reqItem?.satisfied);
                          return (
                            <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                              isSatisfied ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    isSatisfied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {isSatisfied ? <CheckCircle2 className="w-5 h-5" /> : <FileSignature className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-sm">2. التوقيع الإلكتروني الموثق لكلا الطرفين</h4>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isSatisfied ? 'موقع رسمياً' : 'بانتظار التوقيع'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                      {reqItem?.details || 'يلزم توقيع العقد إلكترونياً وتوثيق البصمة الرقمية ورقم الهوية والإقرار القانوني للطرفين.'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleContractModal(true)}
                                  className="px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-[#16324F] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                                >
                                  <FileSignature className="w-3.5 h-3.5 text-[#12A889]" />
                                  <span>{isSatisfied ? 'عرض بيانات التواقيع' : 'الانتقال للتوقيع'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 3. Financial Clearance */}
                        {(() => {
                          const reqItem = prereqsData?.requirements?.find((r: any) => r.key === 'financial_clearance');
                          const isSatisfied = Boolean(reqItem?.satisfied);
                          return (
                            <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                              isSatisfied ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    isSatisfied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {isSatisfied ? <CheckCircle2 className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-sm">3. المخالصة المالية وسند القبض / الإشعار البنكي</h4>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isSatisfied ? 'مسدد ومقيد' : 'مطلوب إرفاق السند'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                      {reqItem?.details || 'يلزم تسجيل بيانات المخالصة المالية وإرفاق رقم سند القبض أو الإشعار البنكي.'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleFinancialClearanceModal(true)}
                                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>{isSatisfied ? 'تعديل سند المخالصة' : 'تسجيل سند المخالصة المالية'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 4. Handover Protocol */}
                        {(() => {
                          const reqItem = prereqsData?.requirements?.find((r: any) => r.key === 'handover_protocol');
                          const isSatisfied = Boolean(reqItem?.satisfied);
                          return (
                            <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                              isSatisfied ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    isSatisfied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {isSatisfied ? <CheckCircle2 className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-sm">4. محضر استلام وتسليم العقار {isSale ? '(تدقيق البصيرة الشرعية)' : '(المفاتيح والعدادات)'}</h4>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isSatisfied ? 'موثق رسمياً' : 'مطلوب توثيق المحضر'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                      {reqItem?.details || 'يلزم توثيق محضر تسليم العقار رسمياً وتأكيد الحيازة أو المفاتيح.'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleHandoverModal(true)}
                                  className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                  <span>{isSatisfied ? 'تعديل محضر الاستلام' : 'توثيق محضر استلام العقار'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 5. Dispute Free Check */}
                        {(() => {
                          const reqItem = prereqsData?.requirements?.find((r: any) => r.key === 'dispute_free');
                          const isSatisfied = Boolean(reqItem?.satisfied);
                          return (
                            <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                              isSatisfied ? 'bg-emerald-50/60 border-emerald-300' : 'bg-rose-50 border-rose-300'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    isSatisfied ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                                  }`}>
                                    {isSatisfied ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-sm">5. خلو المعاملة من أي نزاع أو اعتراض قانوني</h4>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                                      }`}>
                                        {isSatisfied ? 'خالية من النزاعات' : 'نزاع نشط معلق'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                      {reqItem?.details || 'يجب ألا يكون هناك أي نزاع نشط أو شكوى قضائية معلقة على هذه المعاملة.'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                  {!isSatisfied && (isSysAdmin || currentUser.role === 'reporter_admin') && (
                                    <button
                                      type="button"
                                      onClick={() => toggleResolveDisputeModal(true)}
                                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                    >
                                      فض النزاع والبت فيه
                                    </button>
                                  )}
                                  {isSatisfied && (
                                    <button
                                      type="button"
                                      onClick={() => toggleDisputeModal(true)}
                                      className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      تقديم اعتراض أو نزاع
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Final Completion Action Box */}
                      <div className={`p-6 rounded-3xl border-2 space-y-4 shadow-sm ${
                        prereqsData?.canComplete
                          ? 'bg-emerald-50 border-emerald-400'
                          : 'bg-slate-100/80 border-slate-300'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-black text-slate-900 text-base">
                              {prereqsData?.canComplete
                                ? 'جاهز للإتمام النهائي وإصدار المحضر الرسمي'
                                : 'المعاملة قيد الاستيفاء - لا يمكن الإتمام حتى استكمال الشروط'}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                              {prereqsData?.canComplete
                                ? 'استوفيت جميع المتطلبات المحددة بنجاح (العقد المعتمد، التوقيع الإلكتروني، المخالصة، التسليم، والخلو من النزاع). يمكنك الآن إتمام الصفقة وإغلاق الإعلان وتوثيق المحضر.'
                                : 'لا يعتبر الضغط على زر الموافقة الأولية إتماماً للصفقة. يرجى استيفاء المتطلبات المتبقية أعلاه لتفعيل زر الإتمام النهائي.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleCompleteDealModal(true)}
                              disabled={!prereqsData?.canComplete && !(isSysAdmin && forceAdminOverride)}
                              className={`px-6 py-3 rounded-2xl font-black text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                                prereqsData?.canComplete || (isSysAdmin && forceAdminOverride)
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg'
                                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              <span>إتمام الصفقة وإصدار محضر الإغلاق النهائي</span>
                            </button>
                          </div>
                        </div>

                        {/* Admin Override Checkbox if admin */}
                        {isSysAdmin && !prereqsData?.canComplete && (
                          <div className="pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              id="forceOverrideCheck"
                              checked={forceAdminOverride}
                              onChange={e => setForceAdminOverride(e.target.checked)}
                              className="rounded text-rose-600 cursor-pointer w-4 h-4"
                            />
                            <label htmlFor="forceOverrideCheck" className="cursor-pointer font-bold text-rose-800">
                              تمكين التجاوز الإداري الاستثنائي (صلاحية مدير النظام فقط - يقيد في سجل التدقيق)
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ================= MODAL FOOTER ACTIONS (Requirement 10) ================= */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">دورك في هذه العملية:</span>
            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
              {isSysAdmin ? 'مدير نظام المنصة' : isSeeker ? 'الباحث المشتري/المستأجر' : 'المعلن المسؤول عن العقار'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Complete Deal Button */}
            {isBookingActive && isManagingParty && (
              <button
                type="button"
                onClick={() => toggleCompleteDealModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>إتمام الصفقة وإغلاق الإعلان</span>
              </button>
            )}

            {/* Cancel Booking Button */}
            {isBookingActive && (
              <button
                type="button"
                onClick={() => toggleCancelModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <span>إلغاء الحجز والعملية</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>إغلاق النافذة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= ACTION MODALS ================= */}

      {/* 1. PROPOSE / EDIT TERMS MODAL (Requirement 3 & 8) */}
      {showProposeTermsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#12A889]" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isTermsApproved ? 'طلب تعديل الشروط المعتمدة (تعليق الاعتماد)' : 'اقتراح مسودة شروط الاتفاق'}
                </h3>
              </div>
              <button onClick={() => toggleProposeTermsModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti-silent modification warning if editing approved terms */}
            {isTermsApproved && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>تنبيه حوكمة صارم (منع التعديل الصامت):</span>
                </div>
                <p>
                  نظراً لأن الشروط السابقة كانت معتمدة صراحة، فإن تقديم أي تعديل جديد سيعلق الاعتماد المسبق فوراً ويتطلب موافقة صريحة من الطرف الآخر.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitProposeTerms} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">السعر المقترح: <span className="text-rose-500">*</span></label>
                    {booking?.listingPrice ? (
                      <button
                        type="button"
                        onClick={() => setTermsFormPrice(String(booking.listingPrice))}
                        className="text-[10px] text-[#12A889] hover:underline cursor-pointer font-bold"
                      >
                        سعر الإعلان ({booking.listingPrice.toLocaleString()} {booking.listingCurrency || termsFormCurrency})
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={termsFormPrice}
                    onChange={e => setTermsFormPrice(sanitizeNumericInput(e.target.value))}
                    placeholder="مثال: 50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none text-right transition-colors"
                    required
                  />
                  {termsFormPrice && !isNaN(parseFloat(sanitizeNumericInput(termsFormPrice))) && parseFloat(sanitizeNumericInput(termsFormPrice)) > 0 ? (
                    <div className="text-[10px] text-slate-500 mt-1 font-mono text-left" dir="ltr">
                      = {parseFloat(sanitizeNumericInput(termsFormPrice)).toLocaleString()} {termsFormCurrency}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">العملة:</label>
                  <select
                    value={termsFormCurrency}
                    onChange={e => setTermsFormCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  >
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">طريقة السداد:</label>
                  <select
                    value={termsFormPaymentMethod}
                    onChange={e => setTermsFormPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  >
                    <option value="certified_check">شيك مصرفي مصدق</option>
                    <option value="cash">نقداً بالكامل</option>
                    <option value="installments">أقساط ودفعات مرحلية</option>
                    <option value="bank_finance">تسهيل وتمويل بنكي</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">مبلغ العربون المبدئي:</label>
                    {termsFormPrice && !isNaN(parseFloat(sanitizeNumericInput(termsFormPrice))) && parseFloat(sanitizeNumericInput(termsFormPrice)) > 0 ? (
                      <button
                        type="button"
                        onClick={() => setTermsFormDeposit(String(Math.round(parseFloat(sanitizeNumericInput(termsFormPrice)) * 0.05)))}
                        className="text-[10px] text-slate-500 hover:text-[#12A889] hover:underline cursor-pointer font-bold"
                      >
                        احتساب 5% تلقائياً
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={termsFormDeposit}
                    onChange={e => setTermsFormDeposit(sanitizeNumericInput(e.target.value))}
                    placeholder="مثال: 5000 (اختياري)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none text-right transition-colors"
                  />
                  {termsFormDeposit && !isNaN(parseFloat(sanitizeNumericInput(termsFormDeposit))) && parseFloat(sanitizeNumericInput(termsFormDeposit)) > 0 ? (
                    <div className="text-[10px] text-slate-500 mt-1 font-mono text-left" dir="ltr">
                      = {parseFloat(sanitizeNumericInput(termsFormDeposit)).toLocaleString()} {termsFormCurrency}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">موعد الإفراغ / استلام المفاتيح:</label>
                  <input
                    type="date"
                    value={termsFormHandoverDate}
                    onChange={e => setTermsFormHandoverDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تحمل رسوم السعاية والتوثيق:</label>
                  <select
                    value={termsFormFeeBy}
                    onChange={e => setTermsFormFeeBy(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  >
                    <option value="shared_equally">مناصفة بين الطرفين</option>
                    <option value="buyer_only">على المشتري / المستأجر بالكامل</option>
                    <option value="seller_only">على المالك / المعلن بالكامل</option>
                  </select>
                </div>
              </div>

              {/* Special Conditions List Builder */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">بنود وشروط خاصة إضافية:</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newConditionInput}
                    onChange={e => setNewConditionInput(e.target.value)}
                    placeholder="أضف بنداً مثل: سداد فواتير الكهرباء، تسليم البصيرة الأصلية..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCondition();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    إضافة بند
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {termsFormSpecialConditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span>{cond}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات توضيحية:</label>
                <textarea
                  value={termsFormNotes}
                  onChange={e => setTermsFormNotes(e.target.value)}
                  placeholder="أي تفاصيل أو اشتراطات إضافية ترغب بمشاركتها مع الطرف الآخر..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleProposeTermsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTerms}
                  className="px-5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSubmittingTerms ? 'جاري الإرسال...' : 'إرسال الشروط المقترحة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RESPOND TO TERMS MODAL */}
      {respondModalRevision && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {respondAction === 'accept' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <X className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-extrabold text-slate-900 text-base">
                  {respondAction === 'accept' ? 'تأكيد اعتماد الشروط النهائية' : 'رفض مسودة الشروط'}
                </h3>
              </div>
              <button onClick={() => setRespondModalRevision(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {respondAction === 'accept'
                ? `هل أنت متأكد من اعتماد الشروط المقترحة في الإصدار #${respondModalRevision.version} بسعر [${respondModalRevision.terms.price.toLocaleString()} ${respondModalRevision.terms.currency}]؟ هذا القرار ملزم مبدئياً لكلا الطرفين.`
                : `يرجى كتابة سبب رفض الشروط لمساعدة الطرف الآخر في تقديم مقترح ملائم.`}
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">ملاحظاتك المسجلة:</label>
              <textarea
                value={respondNotes}
                onChange={e => setRespondNotes(e.target.value)}
                placeholder={respondAction === 'accept' ? 'تمت الموافقة بدون تعديل...' : 'سبب الرفض والمطلوب تعديله...'}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRespondModalRevision(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmRespondTerms}
                disabled={isRespondingTerms}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs cursor-pointer ${
                  respondAction === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isRespondingTerms ? 'جاري الحفظ...' : respondAction === 'accept' ? 'اعتماد الشروط رسمياً' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INSPECTION SCHEDULE / RESULT MODAL */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {inspectionAction === 'complete' ? 'تسجيل نتيجة المعاينة الميدانية' : inspectionAction === 'confirm' ? 'تأكيد موعد المعاينة' : 'تحديد موعد معاينة ميدانية'}
                </h3>
              </div>
              <button onClick={() => toggleInspectionModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
              {inspectionAction !== 'complete' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">تاريخ المعاينة:</label>
                      <input
                        type="date"
                        value={inspectionDate}
                        onChange={e => setInspectionDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">وقت الزيارة:</label>
                      <input
                        type="time"
                        value={inspectionTime}
                        onChange={e => setInspectionTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">مكان ونقطة اللقاء وملاحظات التنسيق:</label>
                    <textarea
                      value={inspectionLocationNotes}
                      onChange={e => setInspectionLocationNotes(e.target.value)}
                      placeholder="أمام البوابة الرئيسية للعقار، التنسيق مع الحارس..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">نتيجة المعاينة:</label>
                    <select
                      value={inspectionResult}
                      onChange={e => setInspectionResult(e.target.value as InspectionResult)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                    >
                      <option value="satisfied">✅ معاينة ناجحة ومطابقة للمواصفات وصك البصيرة</option>
                      <option value="needs_negotiation">⚠️ توجد ملاحظات تستدعي تعديل السعر أو الشروط</option>
                      <option value="not_interested">❌ عدم الرغبة بعد المعاينة الميدانية</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ملاحظات وتقرير المعاينة:</label>
                    <textarea
                      value={inspectionResultNotes}
                      onChange={e => setInspectionResultNotes(e.target.value)}
                      placeholder="تفاصيل حالة العقار، مطابقة أوراق البصيرة، أطوال الحدود..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleInspectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInspection}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSubmittingInspection ? 'جاري الحفظ...' : 'حفظ بيانات المعاينة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. COMPLETE DEAL MODAL (Requirement 4, 5, 6, 7) */}
      {showCompleteDealModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">إتمام الصفقة العقارية نهائياً وإصدار المحضر</h3>
              </div>
              <button onClick={() => toggleCompleteDealModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Prerequisites are NOT satisfied, show strict alert */}
            {!prereqsData?.canComplete && !forceAdminOverride ? (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تنبيه: لا يمكن إتمام العملية قبل استيفاء المتطلبات المحددة (المتطلب 4):</span>
                </div>
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  بموجب ضوابط المنصة: لا يعتبر الضغط على زر الموافقة الأولية إتماماً للصفقة. يجب استيفاء كافة المتطلبات الخمسة:
                </p>
                <ul className="list-disc list-inside space-y-1 text-rose-900 pr-1 text-[11px]">
                  {(prereqsData?.requirements || []).filter((r: any) => !r.satisfied).map((r: any, idx: number) => (
                    <li key={idx}><span className="font-bold">{r.label}:</span> {r.details}</li>
                  ))}
                </ul>

                {isSysAdmin && (
                  <label className="flex items-center gap-2 pt-2 border-t border-rose-200 mt-2 text-rose-950 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceAdminOverride}
                      onChange={e => setForceAdminOverride(e.target.checked)}
                      className="rounded text-rose-600"
                    />
                    <span>تمكين التجاوز الإداري الاستثنائي (صلاحية مدير النظام فقط مع التوثيق في سجل التدقيق)</span>
                  </label>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <p className="font-bold">استوفيت كافة المتطلبات! سيؤدي تأكيد هذا الإجراء إلى:</p>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-900 pr-1">
                  <li>إغلاق العملية بحالة نهائية واضحة (مكتمل ومؤرشف).</li>
                  <li>تحديث حالة العقار والإعلان إلى ({isSale ? 'مباع' : 'مؤجر'}) وحجبه نهائياً ومنع إعادته للوفرة تلقائياً.</li>
                  <li>إصدار محضر الإغلاق النهائي وتوثيق كافة العقود والرسائل وسجل الإجراءات في الأرشيف الدائم.</li>
                  <li>إرسال إشعارات الإتمام الرسمية للطرفين.</li>
                </ul>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">ملاحظات إتمام الصفقة (رقم السجل / الصك / المحضر):</label>
              <textarea
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
                placeholder="تم تحرير عقد البيع/الإيجار واعتماد الصك الشرعي واستلام كامل القيمة وتسليم الحيازة..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => toggleCompleteDealModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteDeal}
                disabled={isCompleting || (!prereqsData?.canComplete && !(isSysAdmin && forceAdminOverride))}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isCompleting ? 'جاري الإتمام...' : 'تأكيد إتمام الصفقة وإغلاق الإعلان'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.1 FINANCIAL CLEARANCE MODAL (المخالصة المالية وسند القبض) */}
      {showFinancialClearanceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">تسجيل سند المخالصة المالية المعتمد</h3>
              </div>
              <button onClick={() => toggleFinancialClearanceModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFinancialClearance} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المبلغ الإجمالي للصفقة:</label>
                  <input
                    type="number"
                    value={fcTotalAmount}
                    onChange={e => setFcTotalAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المبلغ المسدد فعلياً:</label>
                  <input
                    type="number"
                    value={fcPaidAmount}
                    onChange={e => setFcPaidAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">العملة المعتمدة:</label>
                  <select
                    value={fcCurrency}
                    onChange={e => setFcCurrency(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none"
                  >
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="YER">ريال يمني (YER)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم سند القبض / الإشعار البنكي: <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={fcReceiptVoucherNumber}
                    onChange={e => setFcReceiptVoucherNumber(e.target.value)}
                    placeholder="مثال: VOU-2026-89410"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">طريقة السداد والوفاء:</label>
                  <select
                    value={fcPaymentMethod}
                    onChange={e => setFcPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none"
                  >
                    <option value="سند إيداع بنكي معتمد">إيداع / تحويل بنكي معتمد</option>
                    <option value="شيك مصرفي مصدق">شيك مصرفي مصدق</option>
                    <option value="نقداً بسند قبض رسمي">نقداً بموجب سند قبض رسمي</option>
                    <option value="حوالة صرافة معتمدة">حوالة عبر شبكة صرافة يمنية معتمدة</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ المخالصة المالية:</label>
                  <input
                    type="date"
                    value={fcClearanceDate}
                    onChange={e => setFcClearanceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات المخالصة والبنك:</label>
                <textarea
                  value={fcNotes}
                  onChange={e => setFcNotes(e.target.value)}
                  placeholder="اسم البنك، رقم الحساب المحول منه، أو شروط الدفعات المتبقية إن وجدت..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleFinancialClearanceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingFinancial || !fcReceiptVoucherNumber.trim() || !fcPaidAmount}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSavingFinancial ? 'جاري الحفظ...' : 'اعتماد المخالصة المالية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4.2 HANDOVER PROTOCOL MODAL (محضر تسليم واستلام العقار) */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isSale ? 'محضر استلام العقار وتدقيق صك البصيرة الشرعية' : 'محضر تسليم مفاتيح العقار وقراءة العدادات'}
                </h3>
              </div>
              <button onClick={() => toggleHandoverModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHandoverProtocol} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ التسليم الفعلي:</label>
                  <input
                    type="date"
                    value={hpHandoverDate}
                    onChange={e => setHpHandoverDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المسلّم (طرف المعلن/المالك):</label>
                  <input
                    type="text"
                    value={hpHandedOverBy}
                    onChange={e => setHpHandedOverBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">المستلم (طرف المشتري/المستأجر):</label>
                <input
                  type="text"
                  value={hpReceivedBy}
                  onChange={e => setHpReceivedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none"
                  required
                />
              </div>

              {/* Sale specific: Deed Verification */}
              {isSale ? (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-900 block text-xs">تحقق وثائق الملكية والبصيرة الشرعية:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hpDeedVerified}
                        onChange={e => setHpDeedVerified(e.target.checked)}
                        className="rounded text-[#12A889] w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">مطابقة وتدقيق صك البصيرة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hpOriginalDeedHandedOver}
                        onChange={e => setHpOriginalDeedHandedOver(e.target.checked)}
                        className="rounded text-[#12A889] w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">تسليم أصل البصيرة / الإفراغ</span>
                    </label>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">رقم صك الملكية / السجل العقاري:</label>
                    <input
                      type="text"
                      value={hpDeedNumber}
                      onChange={e => setHpDeedNumber(e.target.value)}
                      placeholder="رقم البصيرة وسجل المحكمة المختصة..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:border-[#12A889] outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* Rent specific: Keys and Meter Readings */
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-900 block text-xs">تسليم مفاتيح العين المؤجرة وقراءة العدادات:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hpKeysHandedOver}
                        onChange={e => setHpKeysHandedOver(e.target.checked)}
                        className="rounded text-[#12A889] w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">تسليم مفاتيح العقار كاملة</span>
                    </label>
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={hpNumberOfKeys}
                        onChange={e => setHpNumberOfKeys(Number(e.target.value))}
                        placeholder="عدد المفاتيح"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:border-[#12A889] outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">قراءة عداد الكهرباء:</label>
                      <input
                        type="text"
                        value={hpElectricityMeter}
                        onChange={e => setHpElectricityMeter(e.target.value)}
                        placeholder="مثال: 41209 ك.و"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:border-[#12A889] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">قراءة عداد المياه:</label>
                      <input
                        type="text"
                        value={hpWaterMeter}
                        onChange={e => setHpWaterMeter(e.target.value)}
                        placeholder="مثال: 1530 م3"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:border-[#12A889] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={hpPremisesSatisfied}
                  onChange={e => setHpPremisesSatisfied(e.target.checked)}
                  className="rounded text-[#12A889] w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-800">إقرار بمعاينة العقار واستلامه بالحالة المرضية المتفق عليها</span>
              </label>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات التسليم:</label>
                <textarea
                  value={hpNotes}
                  onChange={e => setHpNotes(e.target.value)}
                  placeholder="أي ملاحظات فنية أو متعلقات إضافية..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleHandoverModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingHandover}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSavingHandover ? 'جاري الحفظ...' : 'اعتماد محضر الاستلام والتسليم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4.3 RAISE DISPUTE MODAL (تقديم اعتراض أو نزاع قانوني) */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">تقديم طلب نزاع أو اعتراض قانوني</h3>
              </div>
              <button onClick={() => toggleDisputeModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
              <p className="font-bold">تنبيه حوكمة:</p>
              <p className="text-[11px] leading-relaxed">
                سيؤدي تسجيل النزاع إلى تجميد مسار إتمام المعاملة فوراً، وإشعار الطرف المقابل، وإحالة القضية إلى المشرفين والإدارة القانونية للفحص والبت.
              </p>
            </div>

            <form onSubmit={handleRaiseDispute} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">تصنيف النزاع أو الاعتراض:</label>
                <select
                  value={disputeClaimType}
                  onChange={e => setDisputeClaimType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none"
                >
                  <option value="breach_of_terms">إخلال ببنود وشروط الاتفاق المعتمدة</option>
                  <option value="misrepresentation">تضليل في مواصفات أو وثائق العقار</option>
                  <option value="payment_default">تعذر أو تأخر السداد المالي المتفق عليه</option>
                  <option value="document_defect">نزاع على صك الملكية والبصيرة الشرعية</option>
                  <option value="other">اعتراض أو نزاع عام آخر</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تفاصيل النزاع والبيان: <span className="text-rose-500">*</span></label>
                <textarea
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                  placeholder="اشرح بدقة أسباب النزاع، الشروط المخل بها، والوثائق المؤيدة..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleDisputeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || !disputeDescription.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSubmittingDispute ? 'جاري التسجيل...' : 'تسجيل وتجميد المعاملة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4.4 RESOLVE DISPUTE MODAL (فض النزاع من الإدارة) */}
      {showResolveDisputeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-base">فض النزاع والبت الإداري</h3>
              </div>
              <button onClick={() => toggleResolveDisputeModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveDispute} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">القرار الإداري المعتمد:</label>
                <select
                  value={disputeResolution}
                  onChange={e => setDisputeResolution(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none"
                >
                  <option value="resolved">تسوية النزاع واستئناف مسار الصفقة</option>
                  <option value="dismissed">رد دعوى النزاع لعدم الثبوت ومتابعة الصفقة</option>
                  <option value="cancel_deal">فسخ وإلغاء المعاملة وفك حجز العقار</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تسبيب وملاحظات القرار:</label>
                <textarea
                  value={disputeResolutionNotes}
                  onChange={e => setDisputeResolutionNotes(e.target.value)}
                  placeholder="موجبات القرار الإداري وسند التسوية..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleResolveDisputeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isResolvingDispute}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isResolvingDispute ? 'جاري الحفظ...' : 'اعتماد القرار الإداري'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CANCEL BOOKING MODAL (Requirement 10) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">إلغاء الحجز والعملية</h3>
              </div>
              <button onClick={() => toggleCancelModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              سيؤدي إلغاء الحجز إلى فك القفل الحصري فوراً وإعادة إتاحة العقار في البحث وقوائم العرض العامة لجميع الباحثين.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">سبب الإلغاء (إلزامي):</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="عدم الاتفاق على السعر، تعذر مطابقة الوثائق، أو رغبة أحد الطرفين..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => toggleCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelBooking}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                {isCancelling ? 'جاري الإلغاء...' : 'تأكيد إلغاء الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONTRACT DOCUMENT & PRINT MODAL */}
      {showContractDocumentModal && (
        <ContractDocumentModal
          bookingId={booking?.id}
          contractId={currentContract?.id || booking?.contractId}
          isOpen={showContractDocumentModal}
          onClose={() => {
            toggleContractModal(false);
            loadData();
          }}
          onSelectListing={onSelectListing}
        />
      )}
    </div>
  );
};
