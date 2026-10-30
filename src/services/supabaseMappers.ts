/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * طبقة تحويل البيانات (Data Mappers & Adapters Layer)
 * 
 * تحويل ثنائي الاتجاه بين نماذج TypeScript (camelCase)
 * ومخطط جداول Supabase / PostgreSQL الفعلي (snake_case + JSONB)
 * المعرّف في database/supabase/schema.sql
 */

import {
  User,
  Listing,
  PropertyRequest,
  PropertyBooking,
  PropertyContract,
  AuditLogEntry,
  Organization,
  VerificationRequest,
  ReportCase,
  SupportTicket
} from '../types';

// ==========================================
// 1. تحويل المستخدمين (Users)
// ==========================================
export function mapUserToSupabase(user: User): Record<string, any> {
  return {
    id: user.id,
    supabase_user_id: user.supabaseUserId || null,
    name: user.name,
    role: user.role,
    email: user.email || null,
    phone: user.phone || null,
    phone_verified: Boolean(user.phoneVerified),
    avatar_url: user.avatarUrl || null,
    org_id: user.orgId || null,
    org_name: user.orgName || null,
    is_org_admin: Boolean(user.isOrgAdmin),
    active_status: user.activeStatus ?? true,
    updated_at: new Date().toISOString()
  };
}

export function mapUserFromSupabase(row: any): User {
  return {
    id: row.id,
    supabaseUserId: row.supabase_user_id || undefined,
    name: row.name || 'مستخدم غير معروف',
    role: row.role || 'seeker',
    email: row.email || undefined,
    phone: row.phone || '',
    phoneVerified: Boolean(row.phone_verified),
    avatarUrl: row.avatar_url || undefined,
    orgId: row.org_id || undefined,
    orgName: row.org_name || undefined,
    isOrgAdmin: Boolean(row.is_org_admin),
    activeStatus: row.active_status ?? true,
    createdAt: row.created_at || new Date().toISOString()
  };
}

// ==========================================
// 2. تحويل العقارات والإعلانات (Listings)
// ==========================================
export function mapListingToSupabase(listing: Listing): Record<string, any> {
  return {
    id: listing.id,
    listing_number: listing.listingNumber,
    title: listing.title,
    description: listing.description || '',
    property_type: listing.propertyType,
    purpose: listing.purpose,
    status: listing.status,
    price: Number(listing.price) || 0,
    currency: listing.currency || 'YER',
    is_negotiable: Boolean(listing.isNegotiable),
    area: Number(listing.area) || 0,
    area_unit: listing.areaUnit || 'م²',
    
    // الحجز المؤقت وحماية الحصرية
    is_reserved: Boolean(listing.isReserved),
    reserved_until: listing.reservedUntil || null,
    active_booking_id: listing.activeBookingId || null,
    
    // إتمام الصفقة
    deal_outcome: listing.dealOutcome || null,
    final_deal_number: listing.finalDealNumber || null,
    closed_at: listing.closedAt || null,
    closed_by: listing.closedBy || null,
    
    deed_number: listing.deedNumber || null,
    views_count: listing.viewsCount || 0,
    favorites_count: listing.favoritesCount || 0,
    is_featured: Boolean(listing.isFeatured),
    featured_order: listing.featuredOrder || 0,
    
    // أعمدة JSONB
    location: listing.location || {},
    attributes: listing.attributes || {},
    advertiser: listing.advertiser || {},
    assigned_agent_id: listing.assignedAgentId || null,
    assigned_agent_name: listing.assignedAgentName || null,
    images: listing.images || [],
    private_documents: listing.privateDocuments || [],
    verification_badges: listing.verificationBadges || [],
    status_timeline: listing.statusTimeline || [],
    
    updated_at: new Date().toISOString()
  };
}

export function mapListingFromSupabase(row: any): Listing {
  return {
    id: row.id,
    listingNumber: row.listing_number || `YEM-2026-${row.id}`,
    title: row.title || 'عقار معروض',
    description: row.description || '',
    propertyType: row.property_type || 'apartment',
    purpose: row.purpose || 'sale',
    status: row.status || 'under_review',
    price: Number(row.price) || 0,
    currency: row.currency || 'YER',
    isNegotiable: Boolean(row.is_negotiable),
    area: Number(row.area) || 0,
    areaUnit: row.area_unit || 'م²',
    
    isReserved: Boolean(row.is_reserved),
    reservedUntil: row.reserved_until || undefined,
    activeBookingId: row.active_booking_id || undefined,
    
    dealOutcome: row.deal_outcome || undefined,
    finalDealNumber: row.final_deal_number || undefined,
    closedAt: row.closed_at || undefined,
    closedBy: row.closed_by || undefined,
    
    deedNumber: row.deed_number || undefined,
    viewsCount: Number(row.views_count) || 0,
    favoritesCount: Number(row.favorites_count) || 0,
    isFeatured: Boolean(row.is_featured),
    featuredOrder: Number(row.featured_order) || 0,
    
    location: row.location || {
      governorate: 'صنعاء',
      city: 'صنعاء',
      district: 'حدة',
      lat: 15.3694,
      lng: 44.1910,
      isApproximate: true
    },
    attributes: row.attributes || {},
    advertiser: row.advertiser || {
      id: row.assigned_agent_id || 'adv-unknown',
      name: 'معلن دلنّي',
      type: 'individual',
      phone: '777000000',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true
    },
    assignedAgentId: row.assigned_agent_id || undefined,
    assignedAgentName: row.assigned_agent_name || undefined,
    images: Array.isArray(row.images) ? row.images : [],
    privateDocuments: Array.isArray(row.private_documents) ? row.private_documents : [],
    verificationBadges: Array.isArray(row.verification_badges) ? row.verification_badges : [],
    statusTimeline: Array.isArray(row.status_timeline) ? row.status_timeline : [],
    
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 3. تحويل طلبات الباحثين (Property Requests)
// ==========================================
export function mapRequestToSupabase(req: PropertyRequest): Record<string, any> {
  return {
    id: req.id,
    request_number: req.requestNumber,
    listing_id: req.listingId,
    listing_title: req.listingTitle || null,
    listing_number: req.listingNumber || null,
    listing_price: req.listingPrice ? Number(req.listingPrice) : null,
    listing_currency: req.listingCurrency || 'YER',
    listing_image: req.listingImage || null,
    listing_governorate: req.listingGovernorate || null,
    listing_purpose: req.listingPurpose || null,
    
    seeker_id: req.seekerId,
    seeker_name: req.seekerName || null,
    seeker_phone: req.seekerPhone || null,
    
    advertiser_id: req.advertiserId,
    advertiser_name: req.advertiserName || null,
    advertiser_phone: req.advertiserPhone || null,
    
    request_type: req.requestType || 'booking_intent',
    status: req.status || 'pending',
    notes: req.notes || '',
    offered_price: req.offeredPrice ? Number(req.offeredPrice) : null,
    preferred_date: req.preferredDate || null,
    requested_duration_hours: Number(req.requestedDurationHours) || 48,
    booking_id: req.bookingId || null,
    
    payment_method: req.paymentMethod || null,
    rental_usage_type: req.rentalUsageType || null,
    lease_duration_months: req.leaseDurationMonths ? Number(req.leaseDurationMonths) : null,
    payment_frequency: req.paymentFrequency || null,
    
    rejection_reason: req.rejectionReason || null,
    cancellation_reason: req.cancellationReason || null,
    cancelled_by: req.cancelledBy || null,
    
    updated_at: new Date().toISOString()
  };
}

export function mapRequestFromSupabase(row: any): PropertyRequest {
  return {
    id: row.id,
    requestNumber: row.request_number || `REQ-2026-${row.id}`,
    listingId: row.listing_id,
    listingTitle: row.listing_title || 'عقار دلنّي',
    listingNumber: row.listing_number || '',
    listingPrice: Number(row.listing_price) || 0,
    listingCurrency: row.listing_currency || 'YER',
    listingImage: row.listing_image || undefined,
    listingGovernorate: row.listing_governorate || undefined,
    listingPurpose: row.listing_purpose || undefined,
    
    seekerId: row.seeker_id,
    seekerName: row.seeker_name || 'باحث عن عقار',
    seekerPhone: row.seeker_phone || '',
    
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser_name || 'معلن العقار',
    advertiserPhone: row.advertiser_phone || '',
    
    requestType: row.request_type || 'booking_intent',
    status: row.status || 'pending',
    notes: row.notes || '',
    offeredPrice: row.offered_price ? Number(row.offered_price) : undefined,
    preferredDate: row.preferred_date || undefined,
    requestedDurationHours: Number(row.requested_duration_hours) || 48,
    bookingId: row.booking_id || undefined,
    
    paymentMethod: row.payment_method || undefined,
    rentalUsageType: row.rental_usage_type || undefined,
    leaseDurationMonths: row.lease_duration_months ? Number(row.lease_duration_months) : undefined,
    paymentFrequency: row.payment_frequency || undefined,
    
    rejectionReason: row.rejection_reason || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    cancelledBy: row.cancelled_by || undefined,
    
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 4. تحويل الحجوزات المؤقتة (Property Bookings)
// ==========================================
export function mapBookingToSupabase(booking: PropertyBooking): Record<string, any> {
  return {
    id: booking.id,
    booking_number: booking.bookingNumber,
    request_id: booking.requestId,
    listing_id: booking.listingId,
    listing_title: booking.listingTitle || null,
    listing_number: booking.listingNumber || null,
    listing_image: booking.listingImage || null,
    listing_governorate: booking.listingGovernorate || null,
    listing_price: booking.listingPrice ? Number(booking.listingPrice) : null,
    listing_currency: booking.listingCurrency || 'YER',
    listing_purpose: booking.listingPurpose || null,
    
    seeker_id: booking.seekerId,
    seeker_name: booking.seekerName || null,
    seeker_phone: booking.seekerPhone || null,
    
    advertiser_id: booking.advertiserId,
    advertiser_name: booking.advertiserName || null,
    advertiser_phone: booking.advertiserPhone || null,
    
    status: booking.status || 'active',
    duration_hours: Number(booking.durationHours) || 48,
    start_date: booking.startDate || new Date().toISOString(),
    expires_at: booking.expiresAt,
    confirmed_by: booking.confirmedBy || null,
    deal_stage: booking.dealStage || 'booking_exclusive',
    contract_id: booking.contractId || null,
    contract_number: booking.contractNumber || null,
    notes: booking.notes || null,
    payment_method: booking.paymentMethod || null,
    rental_usage_type: booking.rentalUsageType || null,
    
    // JSONB fields
    inspection_visit: booking.inspectionVisit || { status: 'not_scheduled' },
    current_terms: booking.currentTerms || null,
    agreed_terms: booking.agreedTerms || null,
    agreed_terms_approved_at: booking.agreedTermsApprovedAt || null,
    terms_status: booking.termsStatus || 'draft',
    terms_history: booking.termsHistory || [],
    messages: booking.messages || [],
    
    deal_outcome: booking.dealOutcome || null,
    completed_at: booking.completedAt || null,
    completed_by: booking.completedBy || null,
    final_dossier_number: booking.finalDossierNumber || null,
    financial_clearance: booking.financialClearance || null,
    handover_protocol: booking.handoverProtocol || null,
    
    is_disputed: Boolean(booking.isDisputed),
    dispute: booking.dispute || null,
    
    cancellation_reason: booking.cancellationReason || null,
    cancellation_category: booking.cancellationCategory || null,
    cancelled_by: booking.cancelledBy || null,
    cancelled_at: booking.cancelledAt || null,
    
    updated_at: new Date().toISOString()
  };
}

export function mapBookingFromSupabase(row: any): PropertyBooking {
  return {
    id: row.id,
    bookingNumber: row.booking_number || `BKG-2026-${row.id}`,
    requestId: row.request_id,
    listingId: row.listing_id,
    listingTitle: row.listing_title || 'عقار دلنّي',
    listingNumber: row.listing_number || '',
    listingImage: row.listing_image || undefined,
    listingGovernorate: row.listing_governorate || undefined,
    listingPrice: Number(row.listing_price) || 0,
    listingCurrency: row.listing_currency || 'YER',
    listingPurpose: row.listing_purpose || undefined,
    
    seekerId: row.seeker_id,
    seekerName: row.seeker_name || 'باحث عن عقار',
    seekerPhone: row.seeker_phone || '',
    
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser_name || 'معلن العقار',
    advertiserPhone: row.advertiser_phone || '',
    
    status: row.status || 'active',
    durationHours: Number(row.duration_hours) || 48,
    startDate: row.start_date || new Date().toISOString(),
    expiresAt: row.expires_at || new Date().toISOString(),
    confirmedBy: row.confirmed_by || '',
    dealStage: row.deal_stage || 'booking_exclusive',
    contractId: row.contract_id || undefined,
    contractNumber: row.contract_number || undefined,
    notes: row.notes || undefined,
    paymentMethod: row.payment_method || undefined,
    rentalUsageType: row.rental_usage_type || undefined,
    
    inspectionVisit: row.inspection_visit || { status: 'not_scheduled' },
    currentTerms: row.current_terms || undefined,
    agreedTerms: row.agreed_terms || undefined,
    agreedTermsApprovedAt: row.agreed_terms_approved_at || undefined,
    termsStatus: row.terms_status || 'draft',
    termsHistory: Array.isArray(row.terms_history) ? row.terms_history : [],
    messages: Array.isArray(row.messages) ? row.messages : [],
    
    dealOutcome: row.deal_outcome || undefined,
    completedAt: row.completed_at || undefined,
    completedBy: row.completed_by || undefined,
    finalDossierNumber: row.final_dossier_number || undefined,
    financialClearance: row.financial_clearance || undefined,
    handoverProtocol: row.handover_protocol || undefined,
    
    isDisputed: Boolean(row.is_disputed),
    dispute: row.dispute || undefined,
    
    cancellationReason: row.cancellation_reason || undefined,
    cancellationCategory: row.cancellation_category || undefined,
    cancelledBy: row.cancelled_by || undefined,
    cancelledAt: row.cancelled_at || undefined,
    
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 5. تحويل العقود والتواقيع (Property Contracts)
// ==========================================
export function mapContractToSupabase(contract: PropertyContract): Record<string, any> {
  return {
    id: contract.id,
    contract_number: contract.contractNumber,
    booking_id: contract.bookingId,
    booking_number: contract.bookingNumber || null,
    request_id: contract.requestId || null,
    listing_id: contract.listingId,
    listing_number: contract.listingNumber || null,
    listing_title: contract.listingTitle || null,
    contract_type: contract.contractType || 'sale',
    status: contract.status || 'draft',
    current_version: Number(contract.currentVersion) || 1,
    
    // JSONB fields
    property_snapshot: contract.propertySnapshot || {},
    first_party: contract.firstParty || {},
    second_party: contract.secondParty || {},
    witnesses: contract.witnesses || [],
    broker_or_agent: contract.brokerOrAgent || null,
    
    financial_terms: contract.financialTerms || {},
    duration_terms: contract.durationTerms || null,
    clauses: contract.clauses || [],
    version_history: contract.versionHistory || [],
    
    first_party_approval: Boolean(contract.firstPartyApproval),
    first_party_approved_at: contract.firstPartyApprovedAt || null,
    first_party_approved_version: contract.firstPartyApprovedVersion ? Number(contract.firstPartyApprovedVersion) : null,
    second_party_approval: Boolean(contract.secondPartyApproval),
    second_party_approved_at: contract.secondPartyApprovedAt || null,
    second_party_approved_version: contract.secondPartyApprovedVersion ? Number(contract.secondPartyApprovedVersion) : null,
    approved_by: contract.approvedBy || null,
    approved_at: contract.approvedAt || null,
    
    signed_at: contract.signedAt || null,
    first_party_signed_version: contract.firstPartySignedVersion ? Number(contract.firstPartySignedVersion) : null,
    second_party_signed_version: contract.secondPartySignedVersion ? Number(contract.secondPartySignedVersion) : null,
    electronic_signatures: contract.electronicSignatures || [],
    
    is_modification_pending_approval: Boolean(contract.isModificationPendingApproval),
    modification_requested_by: contract.modificationRequestedBy || null,
    modification_reason: contract.modificationReason || null,
    notes: contract.notes || null,
    
    updated_at: new Date().toISOString()
  };
}

export function mapContractFromSupabase(row: any): PropertyContract {
  return {
    id: row.id,
    contractNumber: row.contract_number || `CNT-2026-${row.id}`,
    bookingId: row.booking_id,
    bookingNumber: row.booking_number || '',
    requestId: row.request_id || undefined,
    listingId: row.listing_id,
    listingNumber: row.listing_number || '',
    listingTitle: row.listing_title || 'عقار دلنّي',
    contractType: row.contract_type || 'sale',
    status: row.status || 'draft',
    currentVersion: Number(row.current_version) || 1,
    
    propertySnapshot: row.property_snapshot || {
      title: 'عقار موثق',
      propertyType: 'apartment',
      purpose: 'sale',
      governorate: 'صنعاء',
      city: 'صنعاء',
      district: 'حدة',
      area: 200,
      areaUnit: 'م²'
    },
    firstParty: row.first_party || {
      id: 'usr-adv',
      name: 'الطرف الأول',
      phone: '',
      role: 'seller'
    },
    secondParty: row.second_party || {
      id: 'usr-skr',
      name: 'الطرف الثاني',
      phone: '',
      role: 'buyer'
    },
    witnesses: Array.isArray(row.witnesses) ? row.witnesses : [],
    brokerOrAgent: row.broker_or_agent || undefined,
    
    financialTerms: row.financial_terms || {
      totalAmount: 0,
      currency: 'YER',
      paymentSchedule: 'نقداً'
    },
    durationTerms: row.duration_terms || undefined,
    clauses: Array.isArray(row.clauses) ? row.clauses : [],
    versionHistory: Array.isArray(row.version_history) ? row.version_history : [],
    
    firstPartyApproval: Boolean(row.first_party_approval),
    firstPartyApprovedAt: row.first_party_approved_at || undefined,
    firstPartyApprovedVersion: row.first_party_approved_version ? Number(row.first_party_approved_version) : undefined,
    secondPartyApproval: Boolean(row.second_party_approval),
    secondPartyApprovedAt: row.second_party_approved_at || undefined,
    secondPartyApprovedVersion: row.second_party_approved_version ? Number(row.second_party_approved_version) : undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    
    signedAt: row.signed_at || undefined,
    firstPartySignedVersion: row.first_party_signed_version ? Number(row.first_party_signed_version) : undefined,
    secondPartySignedVersion: row.second_party_signed_version ? Number(row.second_party_signed_version) : undefined,
    electronicSignatures: Array.isArray(row.electronic_signatures) ? row.electronic_signatures : [],
    
    isModificationPendingApproval: Boolean(row.is_modification_pending_approval),
    modificationRequestedBy: row.modification_requested_by || undefined,
    modificationReason: row.modification_reason || undefined,
    notes: row.notes || undefined,
    
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 6. تحويل سجل التدقيق (Audit Logs)
// ==========================================
export function mapAuditLogToSupabase(log: AuditLogEntry): Record<string, any> {
  return {
    id: log.id,
    user_id: log.userId,
    user_name: log.userName || null,
    user_role: log.userRole || null,
    action: log.action,
    target_type: log.targetType || null,
    target_id: log.targetId || null,
    result: log.result || 'success',
    details: log.details || '',
    ip_address: log.ipAddress || null,
    created_at: log.timestamp || new Date().toISOString()
  };
}

export function mapAuditLogFromSupabase(row: any): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.created_at || new Date().toISOString(),
    userId: row.user_id,
    userName: row.user_name || 'مستخدم',
    userRole: row.user_role || 'seeker',
    action: row.action,
    targetType: row.target_type || 'listing',
    targetId: row.target_id || '',
    result: row.result || 'success',
    details: row.details || '',
    ipAddress: row.ip_address || undefined
  };
}
