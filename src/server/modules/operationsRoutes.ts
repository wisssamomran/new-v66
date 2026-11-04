import { Router, Request, Response } from 'express';
import { db } from '../db';
import { operationsRepository } from './operations/operationsRepository';
import { marketplaceRepository } from './marketplace/marketplaceRepository';
import { recordAuditLog, validateYemeniPhone } from '../rbac';
import {
  PropertyRequest,
  PropertyBooking,
  DealTerms,
  InspectionVisit,
  InspectionStatus,
  DealStage
} from '../../types';
import { eventBus, DALANI_EVENTS } from '../../core/events/eventBus';

export const operationsRouter = Router();

// ==========================================
// PROPERTY REQUESTS & TEMPORARY BOOKINGS APIS
// ==========================================

// Get User's Property Requests (Role Filtered)
operationsRouter.get('/api/requests', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لاستعراض الطلبات العقارية' });
  }

  const allRequests = db.getRequests();
  const user = req.currentUser;

  let filtered: PropertyRequest[];

  if (user.role === 'system_admin') {
    filtered = allRequests;
  } else if (user.role === 'org_manager') {
    filtered = allRequests.filter(r => {
      const listing = db.getListingById(r.listingId);
      const isOrgListing = listing && user.orgId && listing.advertiser.orgId === user.orgId;
      return r.advertiserId === user.id || r.seekerId === user.id || isOrgListing;
    });
  } else if (user.role === 'org_agent') {
    filtered = allRequests.filter(r => {
      const listing = db.getListingById(r.listingId);
      const isAssigned = listing && listing.assignedAgentId === user.id;
      return r.advertiserId === user.id || r.seekerId === user.id || isAssigned;
    });
  } else if (user.role === 'advertiser') {
    filtered = allRequests.filter(r => r.advertiserId === user.id || r.seekerId === user.id);
  } else {
    filtered = allRequests.filter(r => r.seekerId === user.id);
  }

  return res.json({ requests: filtered, count: filtered.length });
});

// Submit New Property Request / Booking Inquiry
operationsRouter.post('/api/requests', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتقديم طلب على العقار' });
  }

  const {
    listingId,
    requestType = 'booking_intent',
    notes,
    offeredPrice,
    preferredDate,
    requestedDurationHours = 48,
    seekerPhone
  } = req.body;

  if (!listingId) {
    return res.status(400).json({ error: 'معرف العقار مطلوب لتقديم الطلب' });
  }

  const listing = db.getListingById(listingId);
  if (!listing) {
    return res.status(404).json({ error: 'العقار المحدد غير موجود' });
  }

  if (listing.advertiser.id === req.currentUser.id) {
    return res.status(400).json({ error: 'لا يمكنك تقديم طلب حجز على عقارك الخاص المعروض باسمك' });
  }

  if (listing.status === 'completed' || listing.dealOutcome) {
    return res.status(400).json({
      error: `العقار مكتمل الصفقة (${listing.dealOutcome === 'sold' ? 'مباع نهائياً' : 'مؤجر رسمياً'}) ومغلق نهائياً، لا يمكن تقديم طلبات عليه.`
    });
  }

  const activeBooking = db.getActiveBookingForListing(listingId);
  if (listing.isReserved || activeBooking) {
    return res.status(409).json({
      error: 'العقار محجوز حالياً بحجز مؤقت فعال، يمنع الحجز المتزامن لضمان الحصرية التامة.',
      isReserved: true,
      expiresAt: listing.reservedUntil || activeBooking?.expiresAt
    });
  }

  const rawPhone = seekerPhone || req.currentUser.phone;
  const phoneCheck = validateYemeniPhone(rawPhone);
  if (!phoneCheck.isValid) {
    return res.status(422).json({ error: phoneCheck.error || 'رقم هاتف الباحث غير صالح' });
  }

  const safeDuration = Math.min(Math.max(Number(requestedDurationHours) || 48, 12), 168);
  const now = new Date().toISOString().split('T')[0];
  const reqSeq = db.getRequests().length + 1001;
  const requestNumber = `REQ-2026-${reqSeq}`;

  const newRequest: PropertyRequest = {
    id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestNumber,
    listingId: listing.id,
    listingTitle: listing.title,
    listingNumber: listing.listingNumber,
    listingPrice: listing.price,
    listingCurrency: listing.currency,
    listingImage: listing.images?.[0],
    listingGovernorate: listing.location?.governorate,
    seekerId: req.currentUser.id,
    seekerName: req.currentUser.name,
    seekerPhone: phoneCheck.normalized,
    advertiserId: listing.advertiser.id,
    advertiserName: listing.advertiser.name,
    advertiserPhone: listing.advertiser.phone,
    requestType,
    status: 'pending',
    notes: notes || 'طلب اهتمام وحجز مؤقت للعقار',
    offeredPrice: typeof offeredPrice === 'number' ? offeredPrice : undefined,
    preferredDate: preferredDate || undefined,
    requestedDurationHours: safeDuration,
    listingPurpose: listing.purpose,
    paymentMethod: req.body.paymentMethod || undefined,
    rentalUsageType: req.body.rentalUsageType || undefined,
    leaseDurationMonths: req.body.leaseDurationMonths ? Number(req.body.leaseDurationMonths) : undefined,
    paymentFrequency: req.body.paymentFrequency || undefined,
    createdAt: now,
    updatedAt: now
  };

  db.addRequest(newRequest);

  recordAuditLog(
    req.currentUser,
    'إرسال طلب عقار / حجز مؤقت',
    'request',
    newRequest.id,
    'success',
    `قام الباحث [${req.currentUser.name}] بإرسال طلب نوع [${requestType}] على العقار [${listing.listingNumber}] برقم هاتف [${phoneCheck.normalized}]`
  );

  eventBus.emit(DALANI_EVENTS.REQUEST_CREATED, { request: newRequest });

  return res.status(201).json({
    message: 'تم إرسال طلبك إلى المعلن المسؤول بنجاح وسيتواصل معك قريباً',
    request: newRequest
  });
});

// Cancel Property Request
operationsRouter.patch('/api/requests/:id/cancel', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لإلغاء الطلب' });
  }

  const request = db.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'الطلب غير موجود' });
  }

  const isSeeker = request.seekerId === req.currentUser.id;
  const isSysAdmin = req.currentUser.role === 'system_admin';

  if (!isSeeker && !isSysAdmin) {
    return res.status(403).json({ error: 'غير مصرح لك بإلغاء هذا الطلب' });
  }

  if (request.status === 'cancelled') {
    return res.status(400).json({ error: 'الطلب ملغى بالفعل' });
  }

  const { reason = 'إلغاء بناءً على رغبة الباحث' } = req.body;

  if (request.bookingId) {
    const booking = db.getBookingById(request.bookingId);
    if (booking && booking.status === 'active') {
      db.updateBooking(booking.id, {
        status: 'cancelled',
        cancelledBy: req.currentUser.name,
        cancelledAt: new Date().toISOString(),
        cancellationReason: `تم إلغاء الحجز تلقائياً لإلغاء الطلب الأصلي: ${reason}`
      });
    }
  }

  const updated = db.updateRequest(request.id, {
    status: 'cancelled',
    cancelledBy: req.currentUser.name,
    cancellationReason: reason
  });

  recordAuditLog(
    req.currentUser,
    'إلغاء طلب عقار',
    'request',
    request.id,
    'warning',
    `تم إلغاء الطلب [${request.requestNumber}] على العقار [${request.listingNumber}]. السبب: ${reason}`
  );

  return res.json({
    message: 'تم إلغاء الطلب بنجاح',
    request: updated
  });
});

// Accept Property Request & Generate Temporary Booking
operationsRouter.post('/api/requests/:id/accept', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const request = db.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'الطلب غير موجود' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: `لا يمكن قبول هذا الطلب لأنه بحالة [${request.status}] حالياً` });
  }

  const listing = db.getListingById(request.listingId);
  if (!listing) {
    return res.status(404).json({ error: 'العقار المرتبط بهذا الطلب لم يعد متوفراً' });
  }

  const isOwner = listing.advertiser.id === req.currentUser.id;
  const isOrgManager = req.currentUser.role === 'org_manager' && req.currentUser.orgId && listing.advertiser.orgId === req.currentUser.orgId;
  const isAssignedAgent = listing.assignedAgentId === req.currentUser.id;
  const isSysAdmin = req.currentUser.role === 'system_admin';

  if (!isOwner && !isOrgManager && !isAssignedAgent && !isSysAdmin) {
    return res.status(403).json({ error: 'غير مصرح لك بقبول هذا الطلب، لست المعلن المسؤول عن هذا العقار' });
  }

  if (listing.status === 'completed' || listing.dealOutcome) {
    return res.status(400).json({
      error: `تعذر تأكيد الحجز: هذا العقار تمت صفقته (${listing.dealOutcome === 'sold' ? 'مباع نهائياً' : 'مؤجر رسمياً'}) ولا يمكن إعادة حجزه مجدداً بموجب ضوابط المنصة.`
    });
  }

  const activeBooking = db.getActiveBookingForListing(request.listingId);
  if (activeBooking) {
    const expDateStr = new Date(activeBooking.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
    return res.status(409).json({
      error: `تعذر تأكيد الحجز: يوجد حجز مؤقت فعال على هذا العقار حالياً برقم [${activeBooking.bookingNumber}] ينتهي في [${expDateStr}]. لا يمكن تأكيد حجز متعارض حتى انتهاء الحجز القائم أو إلغائه.`,
      conflictBooking: activeBooking
    });
  }

  const requestedHours = typeof req.body.durationHours === 'number'
    ? req.body.durationHours
    : (request.requestedDurationHours || 48);
  const durationHours = Math.min(Math.max(requestedHours, 1), 168);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();
  const bookingSeq = db.getBookings().length + 2001;
  const bookingNumber = `BKG-2026-${bookingSeq}`;

  const newBooking: PropertyBooking = {
    id: `bkg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingNumber,
    requestId: request.id,
    listingId: request.listingId,
    listingTitle: request.listingTitle,
    listingNumber: request.listingNumber,
    listingImage: request.listingImage,
    listingGovernorate: request.listingGovernorate,
    listingPrice: request.listingPrice,
    listingCurrency: request.listingCurrency,
    seekerId: request.seekerId,
    seekerName: request.seekerName,
    seekerPhone: request.seekerPhone,
    advertiserId: request.advertiserId,
    advertiserName: request.advertiserName,
    advertiserPhone: request.advertiserPhone,
    status: 'active',
    durationHours,
    startDate: now.toISOString(),
    expiresAt,
    confirmedBy: req.currentUser.name,
    notes: req.body.notes || 'تم قبول الطلب وتأكيد الحجز المؤقت لحين مراجعة وثائق وصكوك العقار',
    createdAt: now.toISOString().split('T')[0],
    updatedAt: now.toISOString().split('T')[0]
  };

  db.addBooking(newBooking);

  const updatedRequest = db.updateRequest(request.id, {
    status: 'accepted',
    bookingId: newBooking.id
  });

  recordAuditLog(
    req.currentUser,
    'قبول الطلب وتأكيد الحجز المؤقت',
    'booking',
    newBooking.id,
    'success',
    `تم تأكيد حجز مؤقت برقم [${bookingNumber}] على العقار [${listing.listingNumber}] لمدة [${durationHours}] ساعة لصالح الباحث [${request.seekerName}]`
  );

  eventBus.emit(DALANI_EVENTS.BOOKING_CONFIRMED, { booking: newBooking, request: updatedRequest });

  return res.status(201).json({
    message: `تم قبول الطلب وتأكيد الحجز المؤقت بنجاح لمدة ${durationHours} ساعة برقم ${bookingNumber}`,
    request: updatedRequest,
    booking: newBooking
  });
});

// Reject Property Request
operationsRouter.post('/api/requests/:id/reject', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const request = db.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'الطلب غير موجود' });
  }

  const listing = db.getListingById(request.listingId);
  const isOwner = listing && listing.advertiser.id === req.currentUser.id;
  const isOrgManager = req.currentUser.role === 'org_manager' && listing && req.currentUser.orgId && listing.advertiser.orgId === req.currentUser.orgId;
  const isAssignedAgent = listing && listing.assignedAgentId === req.currentUser.id;
  const isSysAdmin = req.currentUser.role === 'system_admin';

  if (!isOwner && !isOrgManager && !isAssignedAgent && !isSysAdmin) {
    return res.status(403).json({ error: 'غير مصرح لك برفض هذا الطلب' });
  }

  const { reason = 'اعتذار المعلن لعدم ملاءمة الشروط أو وجود اتفاق مسبق' } = req.body;

  const updated = db.updateRequest(request.id, {
    status: 'rejected',
    rejectionReason: reason
  });

  recordAuditLog(
    req.currentUser,
    'رفض طلب عقار',
    'request',
    request.id,
    'warning',
    `قام المعلن برفض الطلب [${request.requestNumber}] على العقار [${request.listingNumber}]. السبب: ${reason}`
  );

  return res.json({
    message: 'تم تسجيل رفض الطلب وإشعار الباحث',
    request: updated
  });
});

// Get User's Bookings (Role Filtered)
operationsRouter.get('/api/bookings', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لاستعراض الحجوزات' });
  }

  const allBookings = db.getBookings();
  const user = req.currentUser;

  let filtered: PropertyBooking[];

  if (user.role === 'system_admin') {
    filtered = allBookings;
  } else if (user.role === 'org_manager') {
    filtered = allBookings.filter(b => {
      const listing = db.getListingById(b.listingId);
      const isOrgListing = listing && user.orgId && listing.advertiser.orgId === user.orgId;
      return b.advertiserId === user.id || b.seekerId === user.id || isOrgListing;
    });
  } else if (user.role === 'org_agent') {
    filtered = allBookings.filter(b => {
      const listing = db.getListingById(b.listingId);
      const isAssigned = listing && listing.assignedAgentId === user.id;
      return b.advertiserId === user.id || b.seekerId === user.id || isAssigned;
    });
  } else if (user.role === 'advertiser') {
    filtered = allBookings.filter(b => b.advertiserId === user.id || b.seekerId === user.id);
  } else {
    filtered = allBookings.filter(b => b.seekerId === user.id);
  }

  return res.json({ bookings: filtered, count: filtered.length });
});

// Get Active Booking Status For Single Listing
operationsRouter.get('/api/bookings/listing/:listingId', (req: Request, res: Response) => {
  const listingId = req.params.listingId;
  const activeBooking = db.getActiveBookingForListing(listingId);

  if (!activeBooking) {
    return res.json({ hasActiveBooking: false, isReserved: false });
  }

  const isOwner = activeBooking.advertiserId === req.currentUser.id;
  const isSeeker = activeBooking.seekerId === req.currentUser.id;
  const isPrivileged = ['system_admin', 'moderator', 'verifier'].includes(req.currentUser.role);

  if (isOwner || isSeeker || isPrivileged) {
    return res.json({
      hasActiveBooking: true,
      isReserved: true,
      booking: activeBooking
    });
  }

  return res.json({
    hasActiveBooking: true,
    isReserved: true,
    booking: {
      bookingNumber: activeBooking.bookingNumber,
      status: activeBooking.status,
      expiresAt: activeBooking.expiresAt,
      durationHours: activeBooking.durationHours
    }
  });
});

// Cancel Temporary Booking (Seeker, Advertiser, or Admin)
const handleCancelBooking = (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لإلغاء الحجز' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  if (booking.status !== 'active') {
    return res.status(400).json({ error: `لا يمكن إلغاء الحجز لأنه بحالة [${booking.status}] حالياً` });
  }

  const listing = db.getListingById(booking.listingId);
  const isSeeker = booking.seekerId === req.currentUser.id;
  const isOwner = booking.advertiserId === req.currentUser.id || (listing && listing.advertiser.id === req.currentUser.id);
  const isOrgManager = req.currentUser.role === 'org_manager' && listing && req.currentUser.orgId && listing.advertiser.orgId === req.currentUser.orgId;
  const isAssignedAgent = listing && listing.assignedAgentId === req.currentUser.id;
  const isSysAdmin = req.currentUser.role === 'system_admin';

  if (!isSeeker && !isOwner && !isOrgManager && !isAssignedAgent && !isSysAdmin) {
    return res.status(403).json({ error: 'غير مصرح لك بإلغاء هذا الحجز' });
  }

  const { reason = 'إلغاء الحجز باتفاق الطرفين أو انتهاء الاهتمام', category = 'mutual_cancellation' } = req.body;
  const result = db.cancelBookingWithCategory(
    booking.id,
    category,
    reason,
    { id: req.currentUser.id, name: req.currentUser.name, role: req.currentUser.role }
  );

  return res.json({
    message: 'تم إلغاء الحجز المؤقت وتوثيق سبب الإلغاء بنجاح، وأصبح العقار متاحاً للبحث',
    booking: result.booking,
    listing: result.listing,
    contract: result.contract
  });
};

operationsRouter.patch('/api/bookings/:id/cancel', handleCancelBooking);
operationsRouter.post('/api/bookings/:id/cancel', handleCancelBooking);

// Extend Temporary Booking Duration
operationsRouter.patch('/api/bookings/:id/extend', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  if (booking.status !== 'active') {
    return res.status(400).json({ error: 'لا يمكن تمديد حجز غير فعال' });
  }

  const listing = db.getListingById(booking.listingId);
  const isOwner = booking.advertiserId === req.currentUser.id || (listing && listing.advertiser.id === req.currentUser.id);
  const isOrgManager = req.currentUser.role === 'org_manager' && listing && req.currentUser.orgId && listing.advertiser.orgId === req.currentUser.orgId;
  const isSysAdmin = req.currentUser.role === 'system_admin';

  if (!isOwner && !isOrgManager && !isSysAdmin) {
    return res.status(403).json({ error: 'فقط المعلن المسؤول أو مدير النظام يمكنهما تمديد الحجز' });
  }

  const additionalHours = Number(req.body.additionalHours) || 24;
  const newTotalDuration = (booking.durationHours || 48) + additionalHours;

  if (newTotalDuration > 168) {
    return res.status(422).json({ error: 'الحد الأقصى الإجمالي للحجز المؤقت هو 7 أيام (168 ساعة) حفاظاً على سيولة السوق العقاري' });
  }

  const currentExpires = new Date(booking.expiresAt).getTime();
  const newExpiresAt = new Date(currentExpires + additionalHours * 3600 * 1000).toISOString();

  const updatedBooking = db.updateBooking(booking.id, {
    durationHours: newTotalDuration,
    expiresAt: newExpiresAt
  });

  recordAuditLog(
    req.currentUser,
    'تمديد مدة الحجز المؤقت',
    'booking',
    booking.id,
    'success',
    `تم تمديد الحجز [${booking.bookingNumber}] بإضافة [${additionalHours}] ساعة ليصبح الإجمالي [${newTotalDuration}] ساعة حتى [${newExpiresAt}]`
  );

  return res.json({
    message: `تم تمديد الحجز بنجاح لمدة ${additionalHours} ساعة إضافية`,
    booking: updatedBooking
  });
});

// ==========================================
// DEAL FOLLOW-UP WORKSPACE APIS
// ==========================================

export function checkDealAuthorization(req: Request, booking: PropertyBooking) {
  const currentUserId = req.currentUser.id;
  const currentUserRole = req.currentUser.role;
  const listing = db.getListingById(booking.listingId);

  const isSeeker = booking.seekerId === currentUserId;
  const isAdvertiser = booking.advertiserId === currentUserId || Boolean(listing && listing.advertiser?.id === currentUserId);
  const isOrgManager = currentUserRole === 'org_manager' && Boolean(req.currentUser.orgId && listing && listing.advertiser?.orgId === req.currentUser.orgId);
  const isAssignedAgent = Boolean(listing && listing.assignedAgentId === currentUserId);
  const isSysAdmin = currentUserRole === 'system_admin';

  let roleInDeal: 'seeker' | 'advertiser' | 'org_manager' | 'org_agent' | 'system_admin' | 'none' = 'none';
  if (isSysAdmin) roleInDeal = 'system_admin';
  else if (isSeeker) roleInDeal = 'seeker';
  else if (isAdvertiser) roleInDeal = 'advertiser';
  else if (isOrgManager) roleInDeal = 'org_manager';
  else if (isAssignedAgent) roleInDeal = 'org_agent';

  const authorized = isSeeker || isAdvertiser || isOrgManager || isAssignedAgent || isSysAdmin;
  return { authorized, roleInDeal, isSeeker, isAdvertiser, isOrgManager, isAssignedAgent, isSysAdmin, listing };
}

// Get Deal Completion Prerequisites
operationsRouter.get('/api/bookings/:id/completion-prerequisites', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const prereqs = db.validateDealCompletionPrerequisites(booking.id);
  return res.json(prereqs);
});

// Update Financial Clearance
operationsRouter.post('/api/bookings/:id/financial-clearance', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتسجيل المخالصة المالية' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بتسجيل المخالصة لهذه الصفقة' });
  }

  const { totalAmount, paidAmount, currency, receiptVoucherNumber, paymentMethod, clearanceDate, notes } = req.body;
  if (!paidAmount || !receiptVoucherNumber) {
    return res.status(400).json({ error: 'يلزم تحديد المبلغ المدفوع ورقم سند القبض أو الإشعار البنكي' });
  }

  const result = db.updateBookingFinancialClearance(
    booking.id,
    {
      status: 'cleared',
      totalAmount: totalAmount || paidAmount,
      paidAmount,
      currency: currency || booking.listingCurrency || 'YER',
      receiptVoucherNumber,
      paymentMethod: paymentMethod || 'سند قبض معتمد',
      clearanceDate: clearanceDate || new Date().toISOString().split('T')[0],
      clearedBy: req.currentUser.name,
      notes
    },
    { id: req.currentUser.id, name: req.currentUser.name, role: req.currentUser.role }
  );

  return res.json({
    message: 'تم تسجيل سند المخالصة المالية بنجاح',
    booking: result.booking
  });
});

// Update Handover Protocol
operationsRouter.post('/api/bookings/:id/handover-protocol', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتوثيق محضر الاستلام' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بتوثيق محضر التسليم لهذه الصفقة' });
  }

  const {
    handoverDate,
    handedOverBy,
    receivedBy,
    deedVerified,
    originalDeedHandedOver,
    deedNumber,
    courtOrRegistrarNotaryNotes,
    keysHandedOver,
    numberOfKeys,
    electricityMeterReading,
    waterMeterReading,
    premisesConditionSatisfied,
    notes
  } = req.body;

  const result = db.updateBookingHandoverProtocol(
    booking.id,
    {
      status: 'completed',
      handoverDate: handoverDate || new Date().toISOString().split('T')[0],
      handedOverBy: handedOverBy || req.currentUser.name,
      receivedBy: receivedBy || booking.seekerName,
      deedVerified: Boolean(deedVerified),
      originalDeedHandedOver: Boolean(originalDeedHandedOver),
      deedNumber,
      courtOrRegistrarNotaryNotes,
      keysHandedOver: Boolean(keysHandedOver),
      numberOfKeys: numberOfKeys ? Number(numberOfKeys) : undefined,
      electricityMeterReading,
      waterMeterReading,
      premisesConditionSatisfied: Boolean(premisesConditionSatisfied),
      notes
    },
    { id: req.currentUser.id, name: req.currentUser.name, role: req.currentUser.role }
  );

  return res.json({
    message: 'تم توثيق محضر تسليم العقار واستلامه بنجاح',
    booking: result.booking
  });
});

// Complete Temporary Booking & Finalize Deal
operationsRouter.post('/api/bookings/:id/complete', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لإتمام الصفقة' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  if (booking.status !== 'active' && booking.status !== 'completed') {
    return res.status(400).json({ error: `لا يمكن إتمام الصفقة لحجز بحالة [${booking.status}]` });
  }

  const listing = db.getListingById(booking.listingId);
  const isOwner = booking.advertiserId === req.currentUser.id || (listing && listing.advertiser?.id === req.currentUser.id);
  const isOrgManager = req.currentUser.role === 'org_manager' && listing && req.currentUser.orgId && listing.advertiser?.orgId === req.currentUser.orgId;
  const isAssignedAgent = listing && listing.assignedAgentId === req.currentUser.id;
  const isSysAdmin = req.currentUser.role === 'system_admin';

  if (!isOwner && !isOrgManager && !isAssignedAgent && !isSysAdmin) {
    return res.status(403).json({ error: 'غير مصرح لك بإتمام الصفقة لهذا العقار' });
  }

  const { notes, financialClearance, handoverProtocol, forceAdminOverride } = req.body;
  const result = db.completeBooking(booking.id, req.currentUser.name, {
    notes,
    financialClearance,
    handoverProtocol,
    forceAdminOverride: isSysAdmin && Boolean(forceAdminOverride)
  });

  if (result.error) {
    return res.status(422).json({
      error: result.error,
      missingRequirements: result.missingRequirements,
      booking: result.booking,
      contract: result.contract
    });
  }

  eventBus.emit(DALANI_EVENTS.DEAL_COMPLETED, { booking: result.booking, listing: result.listing });

  return res.json({
    message: 'تهانينا! تم استيفاء جميع المتطلبات والمخالصة وإتمام المعاملة العقارية رسمياً، وتصنيف العقار نهائياً.',
    booking: result.booking,
    listing: result.listing,
    contract: result.contract
  });
});

// Raise Deal Dispute
operationsRouter.post('/api/bookings/:id/dispute', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتقديم طلب نزاع' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بتقديم نزاع على هذه الصفقة' });
  }

  const { claimType = 'other', claimDescription } = req.body;
  if (!claimDescription || !claimDescription.trim()) {
    return res.status(400).json({ error: 'يرجى كتابة أسباب وتفاصيل النزاع' });
  }

  const result = db.raiseDealDispute(
    booking.id,
    claimType,
    claimDescription.trim(),
    { id: req.currentUser.id, name: req.currentUser.name, role: req.currentUser.role }
  );

  return res.json({
    message: 'تم تسجيل النزاع وتجميد مسار إتمام الصفقة مؤقتاً لحين مراجعة المشرفين والإدارة',
    booking: result.booking,
    dispute: result.dispute
  });
});

// Resolve Deal Dispute
operationsRouter.post('/api/bookings/:id/dispute/resolve', (req: Request, res: Response) => {
  if (req.currentUser.role !== 'system_admin' && req.currentUser.role !== 'reporter_admin') {
    return res.status(403).json({ error: 'فقط إدارة النظام أو مسؤول البلاغات والنزاعات مخول بفض النزاع' });
  }

  const { resolution, resolutionNotes } = req.body;
  if (!resolution || !['dismissed', 'resolved', 'cancel_deal'].includes(resolution)) {
    return res.status(400).json({ error: 'نوع القرار غير صالح (تسوية، رد الدعوى، أو إلغاء الصفقة)' });
  }

  const result = db.resolveDealDispute(
    req.params.id,
    resolution,
    resolutionNotes || 'تم البت في النزاع من الإدارة المختصة',
    { id: req.currentUser.id, name: req.currentUser.name, role: req.currentUser.role }
  );

  return res.json({
    message: 'تم تسجيل القرار الإداري بفض النزاع بنجاح وتحديث مسار الصفقة',
    booking: result.booking,
    dispute: result.dispute
  });
});

// Get Deal Workspace Data
operationsRouter.get('/api/bookings/:id/deal', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى غرفة متابعة الصفقة' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    recordAuditLog(
      req.currentUser,
      'محاولة وصول غير مصرح لغرفة متابعة حجز',
      'booking',
      booking.id,
      'denied',
      `محاولة وصول من مستخدم غير ذي صفة [${req.currentUser.name} - ${req.currentUser.role}] للحجز [${booking.bookingNumber}].`
    );
    return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى بيانات هذه الصفقة، لست طرفاً معتمداً فيها' });
  }

  const listing = auth.listing || db.getListingById(booking.listingId);
  const linkedRequest = booking.requestId ? db.getRequestById(booking.requestId) : undefined;

  let nextStepTitle = '';
  let nextStepActionFor: 'seeker' | 'advertiser' | 'both' | 'none' = 'none';
  let nextStepDescription = '';

  if (booking.status === 'completed') {
    nextStepTitle = 'الصفقة مكتملة بنجاح';
    nextStepActionFor = 'none';
    nextStepDescription = 'تم إتمام نقل الملكية أو توقيع عقد الإيجار وإغلاق الإعلان رسمياً.';
  } else if (booking.status === 'cancelled' || booking.status === 'expired') {
    nextStepTitle = 'العملية مغلقة أو ملغاة';
    nextStepActionFor = 'none';
    nextStepDescription = 'تم إلغاء الحجز وإعادة إتاحة العقار للجمهور.';
  } else if (!booking.inspectionVisit || booking.inspectionVisit.status === 'not_scheduled') {
    nextStepTitle = 'المعاينة الميدانية ومطابقة الوثائق';
    nextStepActionFor = auth.isSeeker ? 'seeker' : 'advertiser';
    nextStepDescription = 'يُوصى بتحديد موعد لمعاينة العقار على الطبيعة وفحص أصل البصيرة الشرعية.';
  } else if (booking.inspectionVisit.status === 'requested') {
    nextStepTitle = 'تأكيد موعد المعاينة من المعلن';
    nextStepActionFor = 'advertiser';
    nextStepDescription = `مطلوب من المعلن تأكيد موعد المعاينة المقترح (${booking.inspectionVisit.requestedDate} ${booking.inspectionVisit.requestedTime || ''}).`;
  } else if (booking.inspectionVisit.status === 'confirmed') {
    nextStepTitle = 'إجراء المعاينة وتسجيل النتيجة';
    nextStepActionFor = 'both';
    nextStepDescription = 'الموعد مؤكد، بعد الزيارة يُسجل أحد الطرفين النتيجة لمواصلة التفاوض.';
  } else if (booking.termsStatus === 'pending_approval') {
    const latestRev = booking.termsHistory?.[0];
    const isProposer = latestRev?.proposedBy.id === req.currentUser.id;
    nextStepTitle = 'مراجعة مسودة شروط الاتفاق';
    nextStepActionFor = isProposer ? (auth.isSeeker ? 'advertiser' : 'seeker') : (auth.isSeeker ? 'seeker' : 'advertiser');
    nextStepDescription = isProposer
      ? 'في انتظار رد الطرف الآخر بقبول أو تعديل الشروط المقترحة.'
      : 'مطلوب منك مراجعة مسودة الشروط المقترحة واعتمادها أو تعديلها.';
  } else if (booking.termsStatus === 'pending_reapproval') {
    nextStepTitle = 'إعادة اعتماد الشروط المعدلة (منع التعديل الصامت)';
    nextStepActionFor = 'both';
    nextStepDescription = 'تم تعديل شروط معتمدة سابقاً، ويلزم قبول الطرف الآخر لإعادة سريان الاتفاق.';
  } else if (booking.termsStatus === 'accepted') {
    nextStepTitle = 'جاهز لإنشاء وثيقة العقد الرسمي';
    nextStepActionFor = 'both';
    nextStepDescription = 'كافة الشروط المالية والزمنية معتمدة، يمكنك الآن إنشاء مسودة العقد واستيراد كافة بيانات الصفقة والشروط.';
  } else {
    nextStepTitle = 'التفاوض واعتماد الشروط';
    nextStepActionFor = 'both';
    nextStepDescription = 'يرجى تقديم مقترح شروط البيع أو الإيجار للوصول إلى اتفاق نهائي.';
  }

  const contract = db.getContractByBookingId(booking.id);

  if (contract) {
    if (contract.status === 'draft') {
      nextStepTitle = 'مراجعة وتدقيق مسودة العقد الرسمي';
      nextStepActionFor = 'both';
      nextStepDescription = `تم إنشاء مسودة العقد رقم [${contract.contractNumber}] وهي بانتظار المراجعة والتدقيق وتحديد البنود.`;
    } else if (contract.status === 'pending_approval' || contract.status === 'under_review') {
      nextStepTitle = 'اعتماد وثيقة العقد من الطرفين';
      nextStepActionFor = 'both';
      nextStepDescription = `العقد رقم [${contract.contractNumber}] جاهز للاعتماد الصريح من الطرف الأول والطرف الثاني.`;
    } else if (contract.status === 'approved') {
      nextStepTitle = 'التوقيع الإلكتروني على العقد المعتمد';
      nextStepActionFor = 'both';
      nextStepDescription = `تم اعتماد العقد رقم [${contract.contractNumber}] من الطرفين وهو جاهز للتوقيع الرسمي والطباعة.`;
    } else if (contract.status === 'signed') {
      nextStepTitle = 'عقد رسمي موقع ومكتمل التوثيق';
      nextStepActionFor = 'none';
      nextStepDescription = `تم توقيع العقد رقم [${contract.contractNumber}] رسمياً وحفظ كافة نسخه في السجل الدائم.`;
    }
  }

  return res.json({
    booking,
    listing,
    linkedRequest,
    contract: contract || null,
    hasContract: Boolean(contract),
    userRoleInDeal: auth.roleInDeal,
    permissions: {
      canProposeTerms: booking.status === 'active',
      canRespondTerms: booking.status === 'active' && Boolean(booking.termsHistory?.[0] && booking.termsHistory[0].proposedBy.id !== req.currentUser.id),
      canScheduleInspection: booking.status === 'active',
      canCompleteDeal: (auth.isAdvertiser || auth.isOrgManager || auth.isSysAdmin) && booking.status === 'active',
      canCancelBooking: booking.status === 'active',
      canGenerateContract: booking.status === 'active' || booking.status === 'completed' || Boolean(booking.agreedTerms),
      canViewContract: true
    },
    nextStep: {
      title: nextStepTitle,
      actionFor: nextStepActionFor,
      description: nextStepDescription
    }
  });
});

// Post In-Deal Message
operationsRouter.post('/api/bookings/:id/messages', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لإرسال رسالة' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بإرسال رسائل في هذه الصفقة' });
  }

  const text = req.body.text || req.body.message;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'نص الرسالة مطلوب' });
  }

  const newMsg = db.addDealMessage(booking.id, {
    senderId: req.currentUser.id,
    senderName: req.currentUser.name,
    senderRole: req.currentUser.role,
    text: text.trim(),
    type: 'chat'
  });

  return res.status(201).json({
    message: 'تم إرسال الرسالة بنجاح',
    dealMessage: newMsg,
    booking: db.getBookingById(booking.id)
  });
});

// Propose Deal Terms
operationsRouter.post('/api/bookings/:id/terms/propose', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتقديم شروط' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك باقتراح شروط لهذه الصفقة' });
  }

  if (booking.status !== 'active') {
    return res.status(400).json({ error: 'لا يمكن تعديل شروط حجز غير فعال' });
  }

  const {
    price,
    currency = 'USD',
    paymentMethod = 'cash',
    depositAmount,
    depositCurrency,
    handoverDate,
    leaseDurationMonths,
    paymentFrequency,
    feeResponsibility = 'shared_equally',
    specialConditions = [],
    notes
  } = req.body;

  if (typeof price !== 'number' || price <= 0) {
    return res.status(422).json({ error: 'السعر المقترح يجب أن يكون رقماً صحيحاً موجباً' });
  }

  const terms: DealTerms = {
    price,
    currency,
    paymentMethod,
    depositAmount: typeof depositAmount === 'number' ? depositAmount : undefined,
    depositCurrency: depositCurrency || currency,
    handoverDate,
    leaseDurationMonths: typeof leaseDurationMonths === 'number' ? leaseDurationMonths : undefined,
    paymentFrequency,
    feeResponsibility,
    specialConditions: Array.isArray(specialConditions) ? specialConditions : [],
    notes: notes || undefined
  };

  const result = db.proposeDealTerms(booking.id, terms, {
    id: req.currentUser.id,
    name: req.currentUser.name,
    role: req.currentUser.role
  });

  recordAuditLog(
    req.currentUser,
    result.wasApprovedModified ? 'طلب تعديل شروط معتمدة مسبقاً (تعليق الاعتماد)' : 'تقديم مقترح شروط للصفقة',
    'booking',
    booking.id,
    result.wasApprovedModified ? 'warning' : 'success',
    result.wasApprovedModified
      ? `طلب [${req.currentUser.name}] تعديل الشروط المعتمدة للحجز [${booking.bookingNumber}]. تم تعليق الاعتماد التلقائي لحين موافقة الطرف الآخر (منع التعديل الصامت).`
      : `قدم [${req.currentUser.name}] مسودة شروط جديدة بقيمة ${price} ${currency} للحجز [${booking.bookingNumber}].`
  );

  return res.json({
    message: result.wasApprovedModified
      ? 'تم تسجيل مقترح التعديل. نظراً لأن الشروط السابقة كانت معتمدة، تم تعليق الاعتماد تلقائياً لحين موافقة الطرف الآخر الصريحة (بموجب ضابط منع التعديل الصامت).'
      : 'تم إرسال مسودة الشروط للطرف الآخر بنجاح للمراجعة والاعتماد.',
    booking: result.booking,
    revision: result.revision,
    wasApprovedModified: result.wasApprovedModified
  });
});

// Respond to Proposed Deal Terms (Accept / Reject)
operationsRouter.post('/api/bookings/:id/terms/respond', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بالرد على شروط هذه الصفقة' });
  }

  if (booking.status !== 'active') {
    return res.status(400).json({ error: 'لا يمكن معالجة شروط حجز غير فعال' });
  }

  const { revisionId, action, responseNotes } = req.body;
  if (!action || !['accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'القرار مطلوب (قبول أو رفض)' });
  }

  const targetRevision = revisionId
    ? booking.termsHistory?.find(r => r.id === revisionId)
    : booking.termsHistory?.[0];

  if (!targetRevision) {
    return res.status(404).json({ error: 'مسودة الشروط غير موجودة' });
  }

  if (targetRevision.proposedBy.id === req.currentUser.id && req.currentUser.role !== 'system_admin') {
    return res.status(400).json({ error: 'لا يمكنك اعتماد الشروط المقترحة من قبلك ذاتياً، يجب أن يعتمدها الطرف الآخر في الصفقة' });
  }

  const result = db.respondToDealTerms(
    booking.id,
    targetRevision.id,
    action as 'accept' | 'reject',
    {
      id: req.currentUser.id,
      name: req.currentUser.name,
      role: req.currentUser.role
    },
    responseNotes
  );

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  recordAuditLog(
    req.currentUser,
    action === 'accept' ? 'اعتماد الشروط النهائية للاتفاق العقاري' : 'رفض مسودة الشروط العقارية',
    'booking',
    booking.id,
    action === 'accept' ? 'success' : 'warning',
    `قرار [${action === 'accept' ? 'اعتماد' : 'رفض'}] من [${req.currentUser.name}] للمسودة #${targetRevision.version} في الحجز [${booking.bookingNumber}].`
  );

  return res.json({
    message: action === 'accept'
      ? 'تم اعتماد الشروط النهائية بنجاح! الشروط الآن موثقة وملزمة مبدئياً لكلا الطرفين.'
      : 'تم تسجيل رفض مسودة الشروط وإشعار الطرف الآخر.',
    booking: result.booking,
    revision: result.revision
  });
});

// Update / Schedule Inspection Visit
operationsRouter.post('/api/bookings/:id/inspection', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بإدارة المعاينة لهذه الصفقة' });
  }

  const { action, requestedDate, requestedTime, locationNotes, result, resultNotes } = req.body;

  let newStatus: InspectionStatus = 'not_scheduled';
  if (action === 'request') newStatus = 'requested';
  else if (action === 'confirm') newStatus = 'confirmed';
  else if (action === 'complete') newStatus = 'completed';
  else if (action === 'cancel') newStatus = 'cancelled';
  else {
    return res.status(400).json({ error: 'نوع إجراء المعاينة غير صالح' });
  }

  const partialVisit: Partial<InspectionVisit> = {
    status: newStatus,
    requestedDate: requestedDate || booking.inspectionVisit?.requestedDate,
    requestedTime: requestedTime || booking.inspectionVisit?.requestedTime,
    locationNotes: locationNotes || booking.inspectionVisit?.locationNotes,
    scheduledBy: action === 'request' ? req.currentUser.name : booking.inspectionVisit?.scheduledBy,
    result: result || booking.inspectionVisit?.result,
    resultNotes: resultNotes || booking.inspectionVisit?.resultNotes
  };

  const updateRes = db.updateInspectionVisit(booking.id, partialVisit, {
    id: req.currentUser.id,
    name: req.currentUser.name,
    role: req.currentUser.role
  });

  recordAuditLog(
    req.currentUser,
    `تحديث المعاينة الميدانية [${action}]`,
    'booking',
    booking.id,
    'success',
    `تم تسجيل إجراء المعاينة [${action}] للحجز [${booking.bookingNumber}] بواسطة [${req.currentUser.name}].`
  );

  return res.json({
    message: action === 'confirm'
      ? 'تم تأكيد موعد المعاينة الميدانية بنجاح'
      : action === 'complete'
      ? 'تم تسجيل نتيجة المعاينة الميدانية بنجاح'
      : 'تم تحديث بيانات المعاينة بنجاح',
    booking: updateRes.booking,
    inspectionVisit: updateRes.visit
  });
});

// Update Deal Stage
operationsRouter.post('/api/bookings/:id/deal-stage', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const auth = checkDealAuthorization(req, booking);
  if (!auth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بتغيير مرحلة هذه الصفقة' });
  }

  const { stage } = req.body;
  const allowedStages: DealStage[] = [
    'request_submitted',
    'booking_exclusive',
    'inspection_deed',
    'terms_negotiation',
    'contract_completed'
  ];

  if (!stage || !allowedStages.includes(stage)) {
    return res.status(400).json({ error: 'المرحلة المحددة غير صالحة' });
  }

  const updatedBooking = db.updateDealStage(booking.id, stage, {
    id: req.currentUser.id,
    name: req.currentUser.name,
    role: req.currentUser.role
  });

  return res.json({
    message: 'تم تحديث مرحلة الصفقة بنجاح',
    booking: updatedBooking
  });
});
