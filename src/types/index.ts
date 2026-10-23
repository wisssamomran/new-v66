export type UserRole =
  | 'visitor'         // زائر غير مسجل
  | 'seeker'          // باحث مسجل عن عقار
  | 'advertiser'      // معلن فرد موثق
  | 'org_manager'     // مدير منشأة عقارية
  | 'org_agent'       // موظف إعلانات منشأة
  | 'moderator'       // مسؤول مراجعة المحتوى
  | 'verifier'        // مسؤول التحقق والمستندات
  | 'reporter_admin'  // مسؤول البلاغات والقضايا
  | 'support'         // مسؤول الدعم الفني
  | 'accountant'      // المحاسب والإدارة المالية
  | 'system_admin';   // مدير النظام

export type PropertyType =
  | 'apartment'    // شقة
  | 'villa'        // فيلا / دار
  | 'land'         // أرض / لبن
  | 'building'     // عمارة / برج
  | 'commercial'   // محل / معرض تجاري
  | 'office'       // مكتب إداري
  | 'chalet';      // استراحة / مزرعة

export type ListingPurpose =
  | 'sale'         // للبيع
  | 'rent'         // للإيجار
  | 'investment';  // للاستثمار / تشغيل

export type Currency = 'YER' | 'USD' | 'SAR';

export type AreaUnit = 'م²' | 'لبنة عشاري' | 'قصبة' | 'هكتار';

export type ListingStatus =
  | 'draft'                 // مسودة
  | 'pending_completion'    // بانتظار الاستكمال
  | 'under_review'          // قيد المراجعة
  | 'pending_verification'  // بانتظار التحقق
  | 'needs_changes'         // مطلوب تعديله
  | 'published'             // منشور ونشط
  | 'suspended'             // موقوف مؤقتاً
  | 'expired'               // منتهٍ
  | 'rejected'              // مرفوض
  | 'cancelled'             // ملغى
  | 'completed';            // تم إتمام الصفقة (بيع / تأجير) ونقل الملكية

export interface VerificationBadge {
  type: 'phone_verified' | 'advertiser_reviewed' | 'org_reviewed' | 'deed_reviewed';
  label: string;
  description: string;
  verifiedAt: string;
  verifiedBy: string;
  validityNote: string;
  disclaimer: string;
}

export interface PrivateDocument {
  id: string;
  title: string;
  type: 'identity' | 'ownership' | 'authorization' | 'cr';
  url: string;
  uploadedAt: string;
  sizeMb: number;
}

export interface StatusTimelineEntry {
  status: ListingStatus;
  timestamp: string;
  changedBy: string;
  userRole: UserRole;
  reason?: string;
  notes?: string;
  missingFields?: string[];
}

export interface AdvertiserInfo {
  id: string;
  name: string;
  type: 'individual' | 'organization';
  phone: string;
  phoneVerified: boolean;
  allowWhatsapp: boolean;
  allowCall: boolean;
  orgId?: string;
  orgName?: string;
  licenseNumber?: string; // فقط إذا كان موثقاً فعلياً
  reputationYears?: number;
  avatarUrl?: string;
}

export interface Listing {
  id: string;
  listingNumber: string; // e.g. YEM-2026-1042
  title: string;
  description: string;
  propertyType: PropertyType;
  purpose: ListingPurpose;
  status: ListingStatus;
  
  price: number;
  currency: Currency;
  isNegotiable: boolean;
  
  area: number;
  areaUnit: AreaUnit;
  
  // الموقع
  location: {
    governorate: string; // صنعاء، عدن، تعز، ...
    city: string;
    district: string;
    street?: string;
    lat: number;
    lng: number;
    isApproximate: boolean; // حماية الخصوصية
  };
  
  // الخصائص بحسب النوع
  attributes: {
    rooms?: number;
    bathrooms?: number;
    livingRooms?: number;
    floorNumber?: number;
    totalFloors?: number;
    parkingSpaces?: number;
    buildingAgeYears?: number;
    streetWidthMeters?: number;
    streetDirection?: 'شمالي' | 'جنوبي' | 'شرقي' | 'غربي' | 'رأسي على شارعين';
    hasElevator?: boolean;
    hasWaterNetwork?: boolean;
    hasElectricity?: boolean;
    hasSolarSystem?: boolean; // شائع جداً وضروري في اليمن
    isFurnished?: boolean;
    zoningType?: 'سكني' | 'تجاري' | 'صناعي' | 'زراعي';
  };
  
  images: string[];
  privateDocuments?: PrivateDocument[]; // لا تظهر للعامة
  
  advertiser: AdvertiserInfo;
  assignedAgentId?: string;
  assignedAgentName?: string;
  
  verificationBadges: VerificationBadge[];
  statusTimeline: StatusTimelineEntry[];
  
  viewsCount: number;
  favoritesCount: number;
  featuredOrder?: number;
  isFeatured?: boolean;
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  subscriptionPackage?: 'standard' | 'featured' | 'premium';
  
  // نظام الحجوزات المؤقتة
  isReserved?: boolean;
  reservedUntil?: string;
  activeBookingId?: string;
  
  // صك الملكية والبصيرة الشرعية
  deedNumber?: string;

  // نتيجة إتمام الصفقة وإغلاق العقار (بيع أو تأجير نهائي)
  dealOutcome?: 'sold' | 'rented';
  finalDealNumber?: string;
  closedAt?: string;
  closedBy?: string;

  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  email?: string;
  role: UserRole;
  orgId?: string;
  orgName?: string;
  isOrgAdmin?: boolean;
  activeStatus: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  userId: string;
  name: string;
  phone: string;
  roleInOrg: 'manager' | 'agent' | 'assistant';
  isActive: boolean;
  assignedListingCount: number;
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  commercialRegNo: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  isVerified: boolean;
  verifiedAt?: string;
  managerId: string;
  managerName: string;
  members: OrgMember[];
  logoUrl?: string;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  requestType: 'individual_advertiser' | 'organization' | 'property_deed';
  targetId: string;
  targetName: string;
  submittedBy: string;
  submittedByPhone: string;
  status: 'pending' | 'under_review' | 'needs_info' | 'approved' | 'rejected';
  documents: PrivateDocument[];
  moderatorNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ReportCase {
  id: string;
  caseNumber: string;
  listingId: string;
  listingTitle: string;
  listingSnapshotPrice: string;
  listingSnapshotAdvertiser: string;
  
  // سرية هوية المبلغ - لا تكشف للمعلن
  reporterName: string;
  reporterPhone: string;
  reporterConfidentialNotes?: string;
  
  reason: 'false_information' | 'duplicate_listing' | 'price_fraud' | 'unauthorized_seller' | 'offensive_content' | 'already_sold';
  details: string;
  evidenceUrls?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'advertiser_contacted' | 'resolved_ad_suspended' | 'dismissed';
  resolutionReason?: string;
  assignedOfficer?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  subject: string;
  category: 'account' | 'listing_issue' | 'verification' | 'technical' | 'inquiry';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'support';
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export type PropertyRequestType = 'booking_intent' | 'visit_inquiry' | 'price_offer';
export type PropertyRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface PropertyRequest {
  id: string;
  requestNumber: string; // e.g. REQ-2026-1001
  listingId: string;
  listingTitle: string;
  listingNumber: string;
  listingPrice: number;
  listingCurrency: Currency;
  listingImage?: string;
  listingGovernorate?: string;
  seekerId: string;
  seekerName: string;
  seekerPhone: string;
  advertiserId: string;
  advertiserName: string;
  advertiserPhone: string;
  requestType: PropertyRequestType;
  status: PropertyRequestStatus;
  notes: string;
  offeredPrice?: number;
  preferredDate?: string;
  requestedDurationHours: number; // default 48
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  bookingId?: string; // ID of booking created upon acceptance
  listingPurpose?: ListingPurpose;
  paymentMethod?: string;
  rentalUsageType?: string;
  leaseDurationMonths?: number;
  paymentFrequency?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyBookingStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export type DealStage = 'request_submitted' | 'booking_exclusive' | 'inspection_deed' | 'terms_negotiation' | 'contract_completed';

export interface DealMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  type?: 'chat' | 'system' | 'terms_proposal' | 'terms_accepted' | 'terms_modified' | 'inspection_update';
  timestamp: string;
}

export type InspectionStatus = 'not_scheduled' | 'requested' | 'confirmed' | 'completed' | 'cancelled';
export type InspectionResult = 'pending' | 'satisfied' | 'needs_negotiation' | 'not_interested';

export interface InspectionVisit {
  status: InspectionStatus;
  requestedDate?: string;
  requestedTime?: string;
  locationNotes?: string;
  scheduledBy?: string;
  confirmedAt?: string;
  completedAt?: string;
  result?: InspectionResult;
  resultNotes?: string;
}

export interface DealTerms {
  price: number;
  currency: Currency;
  paymentMethod: string; // 'cash' | 'certified_check' | 'installments' | 'bank_finance'
  depositAmount?: number;
  depositCurrency?: Currency;
  handoverDate?: string;
  leaseDurationMonths?: number;
  paymentFrequency?: string;
  feeResponsibility?: 'shared_equally' | 'buyer_only' | 'seller_only' | 'tenant_only';
  specialConditions: string[];
  notes?: string;
}

export type TermsStatus = 'draft' | 'pending_approval' | 'accepted' | 'rejected' | 'superseded' | 'pending_reapproval';

export interface TermsRevision {
  id: string;
  version: number;
  proposedBy: {
    id: string;
    name: string;
    role: UserRole;
  };
  proposedAt: string;
  terms: DealTerms;
  status: TermsStatus;
  responseBy?: {
    id: string;
    name: string;
    role: UserRole;
  };
  responseAt?: string;
  responseNotes?: string;
}

export interface ElectronicSignatureRecord {
  id: string;
  partyRole: 'firstParty' | 'secondParty' | 'witness';
  signerId: string;
  signerName: string;
  signerPhone: string;
  nationalIdOrPassport: string;
  idGovernorate?: string;
  contractVersion: number;
  signedAt: string;
  verificationCode: string;
  digitalFingerprint: string;
  legalDisclaimerAcknowledged: boolean;
  ipAddress?: string;
}

export interface FinancialClearance {
  status: 'pending' | 'cleared';
  totalAmount: number;
  currency: Currency;
  paidAmount: number;
  receiptVoucherNumber: string; // رقم سند القبض / الإشعار البنكي
  paymentMethod: string;
  clearanceDate: string;
  clearedBy: string;
  notes?: string;
  evidenceUrl?: string;
}

export interface HandoverProtocol {
  status: 'pending' | 'completed';
  handoverDate: string;
  handedOverBy: string;
  receivedBy: string;
  // للمبيعات: صك الملكية والبصيرة والتسليم
  deedVerified?: boolean;
  originalDeedHandedOver?: boolean;
  deedNumber?: string;
  courtOrRegistrarNotaryNotes?: string;
  // للإيجار: مفاتيح العقار وقراءة العدادات
  keysHandedOver?: boolean;
  numberOfKeys?: number;
  electricityMeterReading?: string;
  waterMeterReading?: string;
  premisesConditionSatisfied?: boolean;
  notes?: string;
}

export interface DealDispute {
  id: string;
  bookingId: string;
  raisedBy: { id: string; name: string; role: UserRole };
  raisedAt: string;
  claimType: 'breach_of_terms' | 'misrepresentation' | 'payment_default' | 'document_defect' | 'other';
  claimDescription: string;
  status: 'active' | 'under_review' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PropertyBooking {
  id: string;
  bookingNumber: string; // e.g. BKG-2026-2001
  requestId: string;
  listingId: string;
  listingTitle: string;
  listingNumber: string;
  listingImage?: string;
  listingGovernorate?: string;
  listingPrice: number;
  listingCurrency: Currency;
  listingPurpose?: ListingPurpose;
  seekerId: string;
  seekerName: string;
  seekerPhone: string;
  advertiserId: string;
  advertiserName: string;
  advertiserPhone: string;
  status: PropertyBookingStatus;
  durationHours: number; // Default 48 hours, configurable
  startDate: string; // ISO string
  expiresAt: string; // ISO string
  confirmedBy: string;
  notes?: string;
  paymentMethod?: string;
  rentalUsageType?: string;
  cancellationReason?: string;
  cancellationCategory?: 'buyer_retracted' | 'seller_retracted' | 'inspection_unsatisfactory' | 'deed_issue' | 'price_disagreement' | 'mutual_cancellation' | 'dispute_cancelled';
  cancelledBy?: string;
  cancelledAt?: string;
  dealStage?: DealStage;
  messages?: DealMessage[];
  inspectionVisit?: InspectionVisit;
  currentTerms?: DealTerms;
  agreedTerms?: DealTerms;
  agreedTermsApprovedAt?: string;
  termsStatus?: TermsStatus;
  termsHistory?: TermsRevision[];
  contractId?: string;
  contractNumber?: string;

  // إتمام الصفقة والمخالصة النهائية (المرحلة النهائية)
  dealOutcome?: 'sold' | 'rented';
  completedAt?: string;
  completedBy?: string;
  finalDossierNumber?: string; // DOS-2026-XXXX
  financialClearance?: FinancialClearance;
  handoverProtocol?: HandoverProtocol;

  // إدارة النزاعات
  isDisputed?: boolean;
  dispute?: DealDispute;

  createdAt: string;
  updatedAt: string;
}

export type ContractType = 'sale' | 'lease';
export type ContractStatus = 'draft' | 'under_review' | 'pending_approval' | 'approved' | 'signed' | 'cancelled';

export interface ContractParty {
  id: string;
  name: string;
  nationalIdOrPassport?: string;
  phone: string;
  role: 'seller' | 'buyer' | 'lessor' | 'lessee' | 'witness' | 'agent';
  address?: string;
  signedAt?: string;
  signatureStatus?: 'unsigned' | 'pending' | 'signed' | 'rejected';
}

export interface ContractClause {
  id: string;
  number: number;
  title: string;
  content: string;
  isMandatory?: boolean;
}

export interface ContractVersion {
  version: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    role: UserRole;
  };
  summaryOfChanges?: string;
  clauses: ContractClause[];
  financialTerms: {
    totalAmount: number;
    currency: Currency;
    depositAmount?: number;
    paymentSchedule: string;
    lateFeeTerms?: string;
  };
  status: ContractStatus;
}

export interface PropertyContract {
  id: string;
  contractNumber: string; // e.g. CNT-2026-3001
  bookingId: string;
  bookingNumber: string;
  requestId?: string;
  listingId: string;
  listingNumber: string;
  listingTitle: string;
  contractType: ContractType; // 'sale' or 'lease'
  status: ContractStatus;

  // Property Details Snapshot
  propertySnapshot: {
    title: string;
    propertyType: string;
    purpose: string;
    governorate: string;
    city: string;
    district: string;
    street?: string;
    area: number;
    areaUnit: string;
    deedNumber?: string;
    boundaries?: {
      north?: string;
      south?: string;
      east?: string;
      west?: string;
    };
  };

  // Parties
  firstParty: ContractParty; // Seller / Lessor (المؤجر / البائع)
  secondParty: ContractParty; // Buyer / Lessee (المستأجر / المشتري)
  witnesses?: ContractParty[];
  brokerOrAgent?: {
    id: string;
    name: string;
    phone: string;
    commissionAmount?: number;
    commissionPayer?: string;
  };

  // Financial & Duration Terms
  financialTerms: {
    totalAmount: number;
    currency: Currency;
    depositAmount?: number;
    depositCurrency?: Currency;
    paymentSchedule: string;
    advancePaymentMonths?: number;
    securityDeposit?: number;
  };

  durationTerms?: {
    startDate: string;
    endDate?: string;
    durationMonths?: number;
    renewalTerms?: string;
    handoverDate?: string;
  };

  // Clauses (Articles)
  clauses: ContractClause[];

  // Revisions & Versioning (Requirement 5)
  currentVersion: number;
  versionHistory: ContractVersion[];
  versions?: ContractVersion[];

  // Approvals & Signatures (Requirement 2, 6, 8, 10)
  firstPartyApprovedAt?: string;
  firstPartyApprovedVersion?: number;
  secondPartyApprovedAt?: string;
  secondPartyApprovedVersion?: number;
  firstPartyApproval?: boolean;
  secondPartyApproval?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  signedAt?: string;
  firstPartySignedVersion?: number;
  secondPartySignedVersion?: number;
  electronicSignatures?: ElectronicSignatureRecord[];

  // Anti-Silent Modification tracking:
  isModificationPendingApproval?: boolean;
  modificationRequestedBy?: string;
  modificationReason?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: 'listing' | 'user' | 'organization' | 'verification' | 'report' | 'ticket' | 'system_setting' | 'staff' | 'security' | 'backup' | 'feature_flag' | 'permission' | 'request' | 'booking' | 'contract';
  targetId: string;
  result: 'success' | 'warning' | 'denied';
  details: string;
  ipAddress?: string;
}

export interface GovernorateData {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  cities: {
    name: string;
    districts: string[];
  }[];
}

// ==========================================
// ENTERPRISE ADMIN & GOVERNANCE TYPES
// ==========================================

export interface StaffMember {
  id: string;
  userId?: string;
  employeeCode?: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  department: 'management' | 'moderation' | 'verification' | 'disputes' | 'support' | 'finance' | 'it' | string;
  activeStatus?: boolean;
  status?: 'active' | 'disabled' | 'suspended';
  permissions?: string[];
  customPermissions?: string[];
  twoFactorEnabled?: boolean;
  lastLoginIp?: string;
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface StaffPermission {
  id: string;
  code?: string;
  name?: string;
  label?: string;
  category: 'general' | 'content' | 'verification' | 'security' | 'financial' | 'sensitive' | 'visibility' | 'execution' | 'sensitive_data' | 'system_override' | string;
  description: string;
  isSensitive?: boolean;
}

export type PermissionDefinition = StaffPermission;

export interface ActiveSession {
  id: string;
  sessionId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  ipAddress: string;
  userAgent?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  location: string;
  startedAt: string;
  lastActiveAt?: string;
  lastActivityAt?: string;
  isCurrentSession?: boolean;
  isCurrent?: boolean;
}

export interface SecurityThreat {
  id: string;
  ipAddress: string;
  attemptedIdentifier?: string;
  attemptType: 'failed_login' | 'unauthorized_role_elevation' | 'sql_injection_attempt' | 'brute_force' | 'suspicious_headers' | string;
  targetUsername?: string;
  occurredAt?: string;
  timestamp?: string;
  country?: string;
  city?: string;
  location?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  details?: string;
  resolvedReason?: string;
}

export type SuspiciousLogin = SecurityThreat;

export interface BlockedIp {
  ip: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

export interface SystemSettings {
  platformName: string;
  platformTagline?: string;
  officialEmail?: string;
  supportPhone?: string;
  maintenanceMode: boolean;
  defaultCurrency: Currency;
  allowNewRegistrations?: boolean;
  registrationOpen?: boolean;
  allowPublicListingPublish?: boolean;
  allowPublicAdSubmissions?: boolean;
  enforce2FAForStaff?: boolean;
  requirePhoneOtp?: boolean;
  requireIdentityVerificationForAd?: boolean;
  strictKycForHighValue?: boolean;
  requireSmsOtpVerification?: boolean;
  autoBackupIntervalHours?: number;
  maxUploadSizeMb?: number;
  maxDailyListingsPerUser?: number;
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts?: number;
  maxFailedLoginsBeforeLock?: number;
  contactEmail?: string;
  contactPhone?: string;
  smsNotificationEnabled?: boolean;
  emailNotificationEnabled?: boolean;
  adminAlertsPhone?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'security' | 'commercial' | 'experimental' | 'user_ops' | 'content' | string;
  lastModifiedBy?: string;
  updatedAt: string;
}

export interface BackupPoint {
  id: string;
  fileName?: string;
  name?: string;
  type?: 'auto' | 'manual';
  sizeMb?: number;
  createdAt: string;
  createdBy?: string;
  sizeBytes?: number;
  recordsCount?: number | {
    listings: number;
    users: number;
    organizations: number;
    auditLogs: number;
    verifications: number;
    reports: number;
    tickets: number;
  };
  checksum?: string;
  checksumSha256?: string;
  status: 'valid' | 'corrupted' | 'restoring' | 'verified' | 'ready' | string;
  notes?: string;
}

export type BackupSnapshot = BackupPoint;

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  code: string;
  module: string;
  message: string;
  stack?: string;
  severity: 'warning' | 'error' | 'fatal' | 'info';
  status?: 'open' | 'investigating' | 'resolved';
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface IntegrationServiceStatus {
  id: string;
  name: string;
  type?: 'sms_gateway' | 'cloud_storage' | 'email_smtp' | 'maps_service' | 'payment_switch' | string;
  category?: 'sms' | 'storage' | 'email' | 'backup' | string;
  provider?: string;
  endpoint?: string;
  status: 'online' | 'degraded' | 'offline' | 'untested' | 'connected' | string;
  latencyMs?: number;
  lastPingAt?: string;
  lastCheckedAt?: string;
  remainingCredits?: number;
  healthNote?: string;
  errorMessage?: string;
}

export type IntegrationService = IntegrationServiceStatus;

export interface EscalationCase {
  id: string;
  caseNumber: string;
  title: string;
  sourceType?: 'report' | 'verification' | 'staff_override' | 'security_alert' | string;
  category?: string;
  sourceId?: string;
  submittedBy?: string;
  requesterName?: string;
  requesterRole?: string;
  priority?: 'medium' | 'high' | 'critical';
  status: 'pending_admin' | 'approved' | 'rejected' | 'pending' | string;
  description?: string;
  details?: string;
  adminResolutionNotes?: string;
  decisionBy?: string;
  decisionNotes?: string;
  resolvedAt?: string;
  createdAt?: string;
  submittedAt?: string;
}

export type AdminEscalation = EscalationCase;


