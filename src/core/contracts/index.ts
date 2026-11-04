/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * العقود البرمجية العامة للأنظمة الستة (Subsystems Public Contracts)
 */

import {
  User,
  UserRole,
  Listing,
  PropertyRequest,
  PropertyBooking,
  PropertyContract,
  AuditLogEntry,
  Organization,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  SystemSettings
} from '../../types';

// 1. عقد نظام الحسابات وإدارة الأطراف (Identity & Parties)
export interface IIdentityPartiesSubsystem {
  getCurrentUser(): User;
  login(credentials: { identifier: string; password?: string; role?: UserRole }): Promise<{ success: boolean; user?: User; message: string }>;
  logout(): Promise<void>;
  updateProfile(updates: { name?: string; email?: string; avatarUrl?: string }): Promise<{ success: boolean; user?: User; message?: string }>;
  switchRole(role: UserRole): Promise<void>;
  getOrganizations(): Promise<Organization[]>;
}

// 2. عقد نظام إدارة الأصول العقارية (Property Assets)
export interface IPropertyAssetsSubsystem {
  verifyAssetDeed(listingId: string, deedNumber: string): Promise<boolean>;
  getAssetHistory(assetId: string): Promise<any>;
  submitVerification(request: Partial<VerificationRequest>): Promise<{ success: boolean; id: string }>;
}

// 3. عقد نظام السوق العقاري (Real Estate Marketplace)
export interface IMarketplaceSubsystem {
  getListings(filters?: any): Promise<Listing[]>;
  getListingById(id: string): Promise<Listing | null>;
  createListing(data: any): Promise<Listing | null>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing | null>;
  deleteListing(id: string): Promise<boolean>;
  toggleFavorite(userId: string, listingId: string): Promise<boolean>;
}

// 4. عقد نظام العمليات والمعاملات العقارية (Real Estate Operations & Transactions)
export interface IRealEstateOperationsSubsystem {
  getRequests(userId: string): Promise<PropertyRequest[]>;
  submitRequest(data: any): Promise<{ success: boolean; request?: PropertyRequest; message: string }>;
  acceptRequest(requestId: string, durationHours: number): Promise<{ success: boolean; booking?: PropertyBooking; message: string }>;
  rejectRequest(requestId: string, reason: string): Promise<{ success: boolean; message: string }>;
  getBookings(userId: string): Promise<PropertyBooking[]>;
  updateDealStage(bookingId: string, stage: any): Promise<boolean>;
}

// 5. عقد نظام العقود والماليات (Contracts & Financial Transactions)
export interface IContractsFinanceSubsystem {
  getContracts(userId: string): Promise<PropertyContract[]>;
  getContractByBookingId(bookingId: string): Promise<PropertyContract | null>;
  generateContract(bookingId: string, options?: any): Promise<{ success: boolean; contract?: PropertyContract; message: string }>;
  approveContract(contractId: string, partyType: 'firstParty' | 'secondParty' | 'admin'): Promise<{ success: boolean; contract?: PropertyContract }>;
  signContract(contractId: string, signatureData: any): Promise<{ success: boolean; contract?: PropertyContract }>;
}

// 6. عقد نظام إدارة المنصة والحوكمة (Platform Administration & Governance)
export interface IPlatformGovernanceSubsystem {
  getAuditLogs(limit?: number): Promise<AuditLogEntry[]>;
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getBlockedIps(): Promise<any[]>;
  blockIp(ip: string, reason: string): Promise<boolean>;
  unblockIp(ip: string): Promise<boolean>;
  getSystemSettings(): Promise<SystemSettings | null>;
  updateSystemSettings(settings: Partial<SystemSettings>): Promise<boolean>;
  getReports(): Promise<ReportCase[]>;
  getSupportTickets(): Promise<SupportTicket[]>;
}
