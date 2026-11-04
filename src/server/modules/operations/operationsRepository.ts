/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * النظام الفرعي 4: العمليات والصفقات العقارية والحجوزات المؤقتة (Real Estate Operations Repository)
 * 
 * مسؤول حصرياً عن:
 * - طلبات الشراء والاستئجار واستفسارات العقارات (Property Requests)
 * - الحجوزات المؤقتة وقواعد الحصرية الزمنية (Property Bookings)
 * - المعاينات الميدانية وفحص العقار وتنسيق الزيارات (Inspection Visits)
 * - جولات التفاوض واعتماد الشروط ومنع التعديل الصامت (Deal Terms Negotiations)
 * - إدارة النزاعات العقارية ورفعها وفضها إدارياً (Deal Disputes)
 * - رسائل ومحادثات ومراحل مسار الصفقة العقارية (Deal Messages & Deal Stages)
 */

import {
  PropertyRequest,
  PropertyBooking,
  DealTerms,
  TermsRevision,
  DealMessage,
  InspectionVisit,
  DealStage,
  TermsStatus,
  DealDispute,
  Listing,
  UserRole
} from '../../../types';
import { storageManager } from '../../storage/storageManager';
import { marketplaceRepository } from '../marketplace/marketplaceRepository';

export function normalizeBooking(b: any): PropertyBooking {
  const isSale = b.listingPurpose === 'sale' || (b.listingPrice > 20000 && !b.rentalUsageType);
  const defaultPrice = typeof b.listingPrice === 'number' ? b.listingPrice : 100000;
  const defaultCurrency = b.listingCurrency || 'USD';

  const defaultTerms: DealTerms = b.currentTerms || {
    price: defaultPrice,
    currency: defaultCurrency,
    paymentMethod: isSale ? 'certified_check' : 'cash',
    paymentFrequency: isSale ? undefined : 'monthly',
    depositAmount: Math.round(defaultPrice * 0.05),
    feeResponsibility: 'shared_equally'
  };

  const defaultInspection: InspectionVisit = b.inspectionVisit || {
    status: 'not_scheduled'
  };

  return {
    ...b,
    id: b.id || `bkg-${Date.now()}`,
    bookingNumber: b.bookingNumber || `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    requestId: b.requestId || 'req-unknown',
    listingId: b.listingId || 'list-unknown',
    listingTitle: b.listingTitle || 'عقار محجوز',
    listingNumber: b.listingNumber || 'YEM-2026-000',
    listingPrice: typeof b.listingPrice === 'number' ? b.listingPrice : defaultPrice,
    listingCurrency: b.listingCurrency || defaultCurrency,
    listingGovernorate: b.listingGovernorate || 'صنعاء',
    seekerId: b.seekerId || 'usr-unknown',
    seekerName: b.seekerName || 'طالب الحجز',
    seekerPhone: b.seekerPhone || '777000000',
    advertiserId: b.advertiserId || 'adv-unknown',
    advertiserName: b.advertiserName || 'معلن العقار',
    advertiserPhone: b.advertiserPhone || '777000000',
    durationHours: typeof b.durationHours === 'number' ? b.durationHours : 48,
    status: b.status || 'active',
    dealStage: b.dealStage || 'booking_exclusive',
    termsStatus: b.termsStatus || (b.agreedTerms ? 'accepted' : 'not_started'),
    currentTerms: defaultTerms,
    termsHistory: Array.isArray(b.termsHistory) ? b.termsHistory : [],
    agreedTerms: b.agreedTerms,
    inspectionVisit: defaultInspection,
    messages: Array.isArray(b.messages) ? b.messages : [],
    createdAt: b.createdAt || new Date().toISOString(),
    expiresAt: b.expiresAt || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    updatedAt: b.updatedAt || new Date().toISOString().split('T')[0]
  };
}

export class OperationsRepository {
  private static instance: OperationsRepository;

  private constructor() {}

  public static getInstance(): OperationsRepository {
    if (!OperationsRepository.instance) {
      OperationsRepository.instance = new OperationsRepository();
    }
    return OperationsRepository.instance;
  }

  // --- Requests Operations ---

  public getRequests(): PropertyRequest[] {
    return [...storageManager.data.requests];
  }

  public getRequestById(id: string): PropertyRequest | undefined {
    return storageManager.data.requests.find((r: PropertyRequest) => r.id === id);
  }

  public addRequest(req: PropertyRequest): PropertyRequest {
    storageManager.data.requests.unshift(req);
    storageManager.persist();
    storageManager.syncPgRequest(req);
    return req;
  }

  public updateRequest(id: string, updates: Partial<PropertyRequest>): PropertyRequest | undefined {
    const list = storageManager.data.requests;
    const index = list.findIndex((r: PropertyRequest) => r.id === id);
    if (index === -1) return undefined;
    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    storageManager.persist();
    storageManager.syncPgRequest(list[index]);
    return list[index];
  }

  public deleteRequest(id: string): boolean {
    const prevLen = storageManager.data.requests.length;
    storageManager.data.requests = storageManager.data.requests.filter((r: PropertyRequest) => r.id !== id);
    if (storageManager.data.requests.length !== prevLen) {
      storageManager.persist();
      return true;
    }
    return false;
  }

  // --- Bookings Operations ---

  public getBookings(): PropertyBooking[] {
    marketplaceRepository.checkAndSyncReservations();
    return [...storageManager.data.bookings];
  }

  public getBookingById(id: string): PropertyBooking | undefined {
    marketplaceRepository.checkAndSyncReservations();
    return storageManager.data.bookings.find((b: PropertyBooking) => b.id === id);
  }

  public getActiveBookingForListing(listingId: string): PropertyBooking | undefined {
    marketplaceRepository.checkAndSyncReservations();
    const now = new Date().getTime();
    return storageManager.data.bookings.find(
      (b: PropertyBooking) => b.listingId === listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > now
    );
  }

  public addBooking(booking: PropertyBooking): PropertyBooking {
    const normalized = normalizeBooking(booking);
    storageManager.data.bookings.unshift(normalized);
    marketplaceRepository.syncListingsReservationStatus();
    storageManager.persist();
    storageManager.syncPgBooking(normalized);
    return normalized;
  }

  public updateBooking(id: string, updates: Partial<PropertyBooking>): PropertyBooking | undefined {
    const list = storageManager.data.bookings;
    const index = list.findIndex((b: PropertyBooking) => b.id === id);
    if (index === -1) return undefined;
    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    marketplaceRepository.syncListingsReservationStatus();
    storageManager.persist();
    storageManager.syncPgBooking(list[index]);
    return list[index];
  }

  public addDealMessage(
    bookingId: string,
    message: { senderId: string; senderName: string; senderRole: UserRole; text: string; type?: DealMessage['type'] }
  ): DealMessage | undefined {
    const booking = this.getBookingById(bookingId);
    if (!booking) return undefined;

    if (!Array.isArray(booking.messages)) {
      booking.messages = [];
    }

    const newMsg: DealMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      text: message.text,
      type: message.type || 'chat',
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
    };

    booking.messages.push(newMsg);
    booking.updatedAt = new Date().toISOString().split('T')[0];
    storageManager.persist();
    return newMsg;
  }

  public proposeDealTerms(
    bookingId: string,
    terms: DealTerms,
    proposer: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; revision?: TermsRevision; wasApprovedModified: boolean } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return { wasApprovedModified: false };

    if (!Array.isArray(booking.termsHistory)) {
      booking.termsHistory = [];
    }

    const wasApproved = Boolean(booking.termsStatus === 'accepted' || booking.agreedTerms);
    const newVersion = (booking.termsHistory.length || 0) + 1;
    const nowTimeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });

    let newStatus: TermsStatus = 'pending_approval';

    if (wasApproved) {
      newStatus = 'pending_reapproval';
      booking.termsStatus = 'pending_reapproval';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'terms_modified',
        text: `⚠️ تنبيه حوكمة: قام [${proposer.name}] بطلب تعديل على الشروط المعتمدة مسبقاً (الإصدار #${newVersion}). تم تعليق الاعتماد المسبق تلقائياً ويتطلب موافقة الطرف الآخر الصريحة لمنع التعديل الصامت.`
      });
    } else {
      booking.termsHistory.forEach(r => {
        if (r.status === 'pending_approval') {
          r.status = 'superseded';
        }
      });
      booking.termsStatus = 'pending_approval';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'terms_proposal',
        text: `📄 قدم [${proposer.name}] مقترح شروط جديد (الإصدار #${newVersion}) بقيمة [${terms.price.toLocaleString()} ${terms.currency}]. قيد مراجعة الطرف الآخر.`
      });
    }

    const revision: TermsRevision = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      version: newVersion,
      proposedBy: proposer,
      proposedAt: nowTimeStr,
      terms,
      status: newStatus
    };

    booking.currentTerms = terms;
    booking.termsHistory.unshift(revision);
    booking.dealStage = 'terms_negotiation';
    booking.updatedAt = new Date().toISOString().split('T')[0];
    storageManager.persist();

    return { booking, revision, wasApprovedModified: wasApproved };
  }

  public respondToDealTerms(
    bookingId: string,
    revisionId: string,
    action: 'accept' | 'reject',
    responder: { id: string; name: string; role: UserRole },
    responseNotes?: string
  ): { booking?: PropertyBooking; revision?: TermsRevision; error?: string } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return { error: 'الحجز غير موجود' };

    if (!Array.isArray(booking.termsHistory)) {
      return { error: 'لا توجد مسودات شروط سابقة' };
    }

    const revision = booking.termsHistory.find(r => r.id === revisionId) || booking.termsHistory[0];
    if (!revision) {
      return { error: 'المسودة المحددة غير موجودة' };
    }

    if (revision.status !== 'pending_approval' && revision.status !== 'pending_reapproval') {
      return { error: `هذه المسودة تمت معالجتها مسبقاً وحالتها [${revision.status}]` };
    }

    const nowTimeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });

    if (action === 'accept') {
      revision.status = 'accepted';
      revision.responseBy = responder;
      revision.responseAt = nowTimeStr;
      revision.responseNotes = responseNotes || 'تمت الموافقة واعتماد الشروط';

      booking.termsStatus = 'accepted';
      booking.agreedTerms = { ...revision.terms };
      booking.agreedTermsApprovedAt = new Date().toISOString();
      booking.dealStage = 'terms_negotiation';

      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'terms_accepted',
        text: `✅ تم اعتماد الشروط النهائية رسمياً من قبل [${responder.name}]. الشروط المعتمدة أصبحت ملزمة مبدئياً ولا يمكن تعديلها بصمت.`
      });
    } else {
      revision.status = 'rejected';
      revision.responseBy = responder;
      revision.responseAt = nowTimeStr;
      revision.responseNotes = responseNotes || 'تم رفض مسودة الشروط';

      booking.termsStatus = 'rejected';

      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'chat',
        text: `❌ اعتذر [${responder.name}] عن مسودة الشروط (الإصدار #${revision.version}). ملاحظات: ${responseNotes || 'يرجى مراجعة وتعديل البنود'}.`
      });
    }

    booking.updatedAt = new Date().toISOString().split('T')[0];
    storageManager.persist();

    return { booking, revision };
  }

  public updateInspectionVisit(
    bookingId: string,
    visit: Partial<InspectionVisit>,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; visit?: InspectionVisit } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return {};

    const prevStatus = booking.inspectionVisit?.status || 'not_scheduled';
    const updatedVisit: InspectionVisit = {
      ...(booking.inspectionVisit || { status: 'not_scheduled' }),
      ...visit
    };

    if (visit.status === 'confirmed' && prevStatus !== 'confirmed') {
      updatedVisit.confirmedAt = new Date().toISOString();
      booking.dealStage = 'inspection_deed';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'inspection_update',
        text: `📅 تم تأكيد موعد المعاينة الميدانية بتاريخ [${updatedVisit.requestedDate || ''} ${updatedVisit.requestedTime || ''}] من قبل [${actor.name}]. ملاحظات الموقع: ${updatedVisit.locationNotes || 'الموقع محدد'}.`
      });
    } else if (visit.status === 'completed' && prevStatus !== 'completed') {
      updatedVisit.completedAt = new Date().toISOString();
      const resultText = updatedVisit.result === 'satisfied' ? 'معاينة ناجحة ومطابقة للوصف' : updatedVisit.result === 'needs_negotiation' ? 'ملاحظات تستدعي التفاوض' : 'عدم الرغبة بعد المعاينة';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'inspection_update',
        text: `🏁 تم تسجيل نتيجة المعاينة الميدانية: [${resultText}] بواسطة [${actor.name}]. ملاحظات: ${updatedVisit.resultNotes || 'لا توجد'}.`
      });
    } else if (visit.status === 'requested' && prevStatus !== 'requested') {
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'inspection_update',
        text: `📍 طلب [${actor.name}] موعد معاينة ميدانية للعقار في [${updatedVisit.requestedDate} ${updatedVisit.requestedTime || ''}]. قيد تأكيد المعلن.`
      });
    }

    booking.inspectionVisit = updatedVisit;
    booking.updatedAt = new Date().toISOString().split('T')[0];
    storageManager.persist();

    return { booking, visit: updatedVisit };
  }

  public updateDealStage(
    bookingId: string,
    stage: DealStage,
    actor: { id: string; name: string; role: UserRole }
  ): PropertyBooking | undefined {
    const booking = this.getBookingById(bookingId);
    if (!booking) return undefined;

    booking.dealStage = stage;
    booking.updatedAt = new Date().toISOString().split('T')[0];

    const stageNames: Record<DealStage, string> = {
      request_submitted: 'تقديم الطلب ومراجعة المعلن',
      booking_exclusive: 'تأكيد الحجز المؤقت وحصرية العقار',
      inspection_deed: 'المعاينة الميدانية وفحص الوثائق',
      terms_negotiation: 'التفاوض واعتماد الشروط النهائية',
      contract_completed: 'إبرام العقد وإتمام الصفقة'
    };

    this.addDealMessage(bookingId, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `🔄 تم نقل مرحلة الصفقة إلى: [${stageNames[stage]}] بواسطة [${actor.name}].`
    });

    storageManager.persist();
    return booking;
  }

  public raiseDealDispute(
    bookingId: string,
    claimType: 'breach_of_terms' | 'misrepresentation' | 'payment_default' | 'document_defect' | 'other',
    claimDescription: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; dispute?: DealDispute } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return {};

    const nowStr = new Date().toISOString();
    const disputeId = `dsp-${Date.now()}`;

    const dispute: DealDispute = {
      id: disputeId,
      bookingId,
      raisedBy: { id: actor.id, name: actor.name, role: actor.role },
      raisedAt: nowStr,
      claimType,
      claimDescription,
      status: 'active'
    };

    booking.isDisputed = true;
    booking.dispute = dispute;
    booking.updatedAt = nowStr.split('T')[0];

    const escId = `esc-${Date.now()}`;
    const claimLabels: Record<string, string> = {
      breach_of_terms: 'إخلال بالشروط المتفق عليها',
      misrepresentation: 'تضليل في مواصفات أو وثائق العقار',
      payment_default: 'تعذر أو تأخر السداد المالي',
      document_defect: 'نزاع على صك الملكية والبصيرة الشرعية',
      other: 'نزاع عام'
    };

    storageManager.data.escalations.unshift({
      id: escId,
      caseNumber: `DISP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `نزاع صفقة عقارية [${booking.bookingNumber}] - ${claimLabels[claimType] || claimType}`,
      sourceType: 'report',
      sourceId: booking.id,
      submittedBy: `${actor.name} (${actor.role})`,
      priority: 'high',
      status: 'pending_admin',
      description: `تم تجميد الصفقة بسبب نزاع: ${claimDescription}. العقار: [${booking.listingTitle}].`,
      createdAt: nowStr.split('T')[0]
    });

    this.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `⚠️ تنبيه نزاع قانوني: قام [${actor.name}] برفع طلب نزاع رسمي حول هذه الصفقة (${claimLabels[claimType]}). تم تجميد إجراءات إتمام المعاملة مؤقتاً وإحالتها للمشرفين وإدارة النظام للفحص والمصادقة.`
    });

    storageManager.persist();
    return { booking, dispute };
  }

  public resolveDealDispute(
    bookingId: string,
    resolution: 'dismissed' | 'resolved' | 'cancel_deal',
    resolutionNotes: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; dispute?: DealDispute } {
    const booking = this.getBookingById(bookingId);
    if (!booking || !booking.dispute) return {};

    const nowStr = new Date().toISOString();

    if (resolution === 'cancel_deal') {
      booking.dispute.status = 'resolved';
      booking.dispute.resolutionNotes = resolutionNotes;
      booking.dispute.resolvedAt = nowStr;
      booking.dispute.resolvedBy = actor.name;
      booking.isDisputed = false;
      this.cancelBookingWithCategory(booking.id, 'dispute_cancelled', resolutionNotes, actor);
    } else {
      booking.dispute.status = resolution;
      booking.dispute.resolutionNotes = resolutionNotes;
      booking.dispute.resolvedAt = nowStr;
      booking.dispute.resolvedBy = actor.name;
      booking.isDisputed = false;

      this.addDealMessage(booking.id, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `⚖️ قرار إداري: تم فض النزاع المعلق من قبل الإدارة [${actor.name}] (${resolution === 'resolved' ? 'تمت التسوية' : 'رد الدعوى'}). ملاحظات القرار: ${resolutionNotes}. تم استئناف مسار الصفقة.`
      });
    }

    storageManager.persist();
    return { booking, dispute: booking.dispute };
  }

  public cancelBookingWithCategory(
    bookingId: string,
    category: 'buyer_retracted' | 'seller_retracted' | 'inspection_unsatisfactory' | 'deed_issue' | 'price_disagreement' | 'mutual_cancellation' | 'dispute_cancelled',
    reason: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; listing?: Listing } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return {};

    const nowStr = new Date().toISOString();
    const dateOnly = nowStr.split('T')[0];

    const categoryNames: Record<string, string> = {
      buyer_retracted: 'انسحاب المشتري / المستأجر',
      seller_retracted: 'انسحاب البائع / المؤجر',
      inspection_unsatisfactory: 'عدم الرضا بعد المعاينة الميدانية',
      deed_issue: 'ملاحظات على صك الملكية والبصيرة الشرعية',
      price_disagreement: 'عدم الاتفاق النهائي على الشروط والسعر',
      mutual_cancellation: 'إلغاء وفسخ الاتفاق بالتراضي',
      dispute_cancelled: 'إلغاء المعاملة بقرار إداري نتيجة نزاع'
    };

    booking.status = 'cancelled';
    booking.cancellationCategory = category;
    booking.cancellationReason = `${categoryNames[category] || category}: ${reason}`;
    booking.cancelledBy = actor.name;
    booking.cancelledAt = nowStr;
    booking.updatedAt = dateOnly;

    // Release reservation on listing
    const listing = marketplaceRepository.getListingById(booking.listingId);
    if (listing && listing.status !== 'completed') {
      listing.isReserved = false;
      listing.reservedUntil = undefined;
      listing.activeBookingId = undefined;
      listing.updatedAt = dateOnly;
      marketplaceRepository.updateListing(listing.id, {
        isReserved: false,
        reservedUntil: undefined,
        activeBookingId: undefined
      });
    }

    // Cancel associated contract if exists and not signed
    const contract = storageManager.data.contracts.find((c: any) => c.bookingId === booking.id);
    if (contract && contract.status !== 'signed') {
      contract.status = 'cancelled';
      contract.notes = `${contract.notes ? contract.notes + '\n' : ''}تم إلغاء العقد تبعاً لإلغاء الحجز بواسطة [${actor.name}]. السبب: ${reason}`;
      contract.updatedAt = dateOnly;
    }

    this.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `❌ تم إلغاء الحجز والمعاملة بواسطة [${actor.name}]. التصنيف: [${categoryNames[category]}]. البيان: ${reason}. تم فك حجز العقار وإعادته للوفرة.`
    });

    marketplaceRepository.syncListingsReservationStatus();
    storageManager.persist();

    return { booking, listing };
  }
}

export const operationsRepository = OperationsRepository.getInstance();
