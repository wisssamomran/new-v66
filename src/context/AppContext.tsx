import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { handleLocalApiCall } from '../services/localApi';
import { SupabaseAdapter } from '../services/supabaseAdapter';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  mapListingFromSupabase,
  mapBookingFromSupabase,
  mapRequestFromSupabase,
  mapContractFromSupabase,
  mapUserFromSupabase
} from '../services/supabaseMappers';
import {
  Listing,
  User,
  UserRole,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  Organization,
  ListingStatus,
  StaffMember,
  ActiveSession,
  SecurityThreat,
  BlockedIp,
  SystemSettings,
  FeatureFlag,
  BackupPoint,
  SystemErrorLog,
  IntegrationServiceStatus,
  EscalationCase,
  PropertyRequest,
  PropertyRequestType,
  PropertyBooking,
  DealTerms,
  DealMessage,
  InspectionVisit,
  InspectionResult,
  DealStage,
  PropertyContract,
  ContractClause,
  ContractVersion,
  ContractParty,
  ContractStatus,
  ContractType,
  FinancialClearance,
  HandoverProtocol
} from '../types';
import {
  INITIAL_LISTINGS,
  INITIAL_ORGANIZATIONS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_REPORTS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PROPERTY_REQUESTS,
  INITIAL_PROPERTY_BOOKINGS,
  INITIAL_PROPERTY_CONTRACTS,
  MOCK_USERS,
  NEW_SEEKERS
} from '../data/yemenData';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType {
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  loginUser: (credentials: { identifier: string; password?: string; role?: UserRole }) => Promise<{ success: boolean; message: string; user?: User }>;
  updateUserProfile: (updates: { name?: string; email?: string; avatarUrl?: string }) => Promise<{ success: boolean; message?: string }>;
  deactivateAccount: () => Promise<{ success: boolean; message?: string }>;
  reactivateAccount: (phone: string) => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => void;
  listings: Listing[];
  organizations: Organization[];
  verificationRequests: VerificationRequest[];
  reports: ReportCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
  favorites: string[];
  googleMapsApiKey: string;
  setGoogleMapsApiKey: (key: string) => void;

  // Real Estate Requests & Temporary Bookings System
  requests: PropertyRequest[];
  bookings: PropertyBooking[];
  fetchRequestsAndBookings: () => Promise<void>;
  submitPropertyRequest: (data: {
    listingId: string;
    requestType?: PropertyRequestType;
    notes?: string;
    offeredPrice?: number;
    preferredDate?: string;
    requestedDurationHours?: number;
    seekerPhone?: string;
    paymentMethod?: string;
    rentalUsageType?: string;
    leaseDurationMonths?: number;
    paymentFrequency?: string;
  }) => Promise<{ success: boolean; message: string; request?: PropertyRequest }>;
  cancelPropertyRequest: (requestId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  acceptPropertyRequest: (requestId: string, durationHours?: number, notes?: string) => Promise<{ success: boolean; message: string; booking?: PropertyBooking }>;
  rejectPropertyRequest: (requestId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  cancelBookingWithCategory: (bookingId: string, category: string, reason: string) => Promise<{ success: boolean; message: string; booking?: PropertyBooking }>;
  extendBooking: (bookingId: string, additionalHours: number) => Promise<{ success: boolean; message: string }>;
  fetchCompletionPrerequisites: (bookingId: string) => Promise<{ canComplete: boolean; requirements: any[]; contract?: PropertyContract; booking?: PropertyBooking; listing?: Listing }>;
  updateBookingFinancialClearance: (bookingId: string, fc: Partial<FinancialClearance>) => Promise<{ success: boolean; message: string; booking?: PropertyBooking }>;
  updateBookingHandoverProtocol: (bookingId: string, hp: Partial<HandoverProtocol>) => Promise<{ success: boolean; message: string; booking?: PropertyBooking }>;
  completeBooking: (
    bookingId: string,
    options?: {
      notes?: string;
      financialClearance?: FinancialClearance;
      handoverProtocol?: HandoverProtocol;
      forceAdminOverride?: boolean;
    } | string
  ) => Promise<{ success: boolean; message: string; listing?: Listing; missingRequirements?: any[]; contract?: PropertyContract; booking?: PropertyBooking }>;
  raiseDealDispute: (bookingId: string, claimType: string, claimDescription: string) => Promise<{ success: boolean; message: string; dispute?: any; booking?: PropertyBooking }>;
  resolveDealDispute: (bookingId: string, resolution: 'dismissed' | 'resolved' | 'cancel_deal', resolutionNotes?: string) => Promise<{ success: boolean; message: string; dispute?: any; booking?: PropertyBooking }>;
  getActiveBookingForListing: (listingId: string) => PropertyBooking | undefined;
  
  // Deal Follow-up Workspace Actions
  fetchDealWorkspace: (bookingId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  sendDealMessage: (bookingId: string, text: string) => Promise<{ success: boolean; message?: string; dealMessage?: DealMessage }>;
  proposeDealTerms: (bookingId: string, terms: DealTerms) => Promise<{ success: boolean; message?: string; wasApprovedModified?: boolean; booking?: PropertyBooking }>;
  respondToDealTerms: (bookingId: string, revisionId: string, action: 'accept' | 'reject', responseNotes?: string) => Promise<{ success: boolean; message?: string; booking?: PropertyBooking }>;
  updateDealInspection: (bookingId: string, data: { action: 'request' | 'confirm' | 'complete' | 'cancel'; requestedDate?: string; requestedTime?: string; locationNotes?: string; result?: InspectionResult; resultNotes?: string }) => Promise<{ success: boolean; message?: string; booking?: PropertyBooking; visit?: InspectionVisit }>;
  updateDealStage: (bookingId: string, stage: DealStage) => Promise<{ success: boolean; message?: string; booking?: PropertyBooking }>;

  // Contracts & Official Real Estate Documentation
  contracts: PropertyContract[];
  fetchContracts: (filters?: { bookingId?: string; listingId?: string; status?: ContractStatus }) => Promise<PropertyContract[]>;
  fetchContractById: (contractId: string) => Promise<PropertyContract | null>;
  fetchContractByBookingId: (bookingId: string) => Promise<PropertyContract | null>;
  generateContractFromBooking: (bookingId: string, customOptions?: { customType?: ContractType; customClauses?: ContractClause[] }) => Promise<{ success: boolean; message: string; contract?: PropertyContract }>;
  updateContractDraft: (contractId: string, updates: { clauses?: ContractClause[]; financialTerms?: any; durationTerms?: any; notes?: string; summaryOfChanges?: string; witnesses?: ContractParty[] }) => Promise<{ success: boolean; message: string; contract?: PropertyContract; wasApprovedModified?: boolean }>;
  approveContract: (contractId: string, partyType?: 'firstParty' | 'secondParty' | 'admin') => Promise<{ success: boolean; message: string; contract?: PropertyContract }>;
  signContract: (
    contractId: string,
    partyRole?: 'firstParty' | 'secondParty' | 'witness',
    options?: {
      nationalId?: string;
      idGovernorate?: string;
      verificationCode?: string;
      signerPhone?: string;
      legalDisclaimerAcknowledged?: boolean;
    } | string
  ) => Promise<{ success: boolean; message: string; contract?: PropertyContract }>;
  proposeContractAmendment: (contractId: string, summaryOfChanges: string, clauses?: ContractClause[], financialTerms?: any) => Promise<{ success: boolean; message: string; contract?: PropertyContract }>;
  respondToContractAmendment: (contractId: string, accept: boolean, reason?: string) => Promise<{ success: boolean; message: string; contract?: PropertyContract }>;
  cancelContract: (contractId: string, reason: string) => Promise<{ success: boolean; message: string; contract?: PropertyContract }>;
  
  // Listings CRUD & Transitions
  createListing: (listingData: Omit<Listing, 'id' | 'listingNumber' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'favoritesCount' | 'statusTimeline'>) => Promise<Listing | null>;
  updateListing: (id: string, updates: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  changeListingStatus: (id: string, newStatus: ListingStatus, reason?: string, notes?: string, missingFields?: string[]) => Promise<void>;
  toggleFavorite: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
  
  // Organization actions
  addOrgMember: (orgId: string, name: string, phone: string, roleInOrg: 'manager' | 'agent' | 'assistant') => void;
  toggleOrgMemberStatus: (orgId: string, memberId: string) => void;
  assignListingToAgent: (listingId: string, agentId: string, agentName: string) => void;
  
  // Verification actions
  submitVerificationRequest: (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  reviewVerificationRequest: (id: string, status: 'approved' | 'rejected' | 'needs_info', notes: string) => Promise<void>;
  
  // Reports actions
  submitReport: (report: Omit<ReportCase, 'id' | 'caseNumber' | 'createdAt' | 'status'>) => Promise<void>;
  resolveReport: (id: string, status: 'resolved_ad_suspended' | 'dismissed', resolutionReason: string) => Promise<void>;
  
  // Support actions
  createTicket: (subject: string, category: SupportTicket['category'], priority: SupportTicket['priority'], initialMessage: string) => Promise<void>;
  replyToTicket: (ticketId: string, text: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status']) => void;
  
  // Audit logger
  logAction: (action: string, targetType: AuditLogEntry['targetType'], targetId: string, result: 'success' | 'warning' | 'denied', details: string) => void;
  
  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Enterprise Admin & Governance State
  users: User[];
  staff: StaffMember[];
  rolesMatrix: Record<string, string[]>;
  activeSessions: ActiveSession[];
  threats: SecurityThreat[];
  blockedIps: BlockedIp[];
  systemSettings: SystemSettings;
  featureFlags: FeatureFlag[];
  backups: BackupPoint[];
  systemErrors: SystemErrorLog[];
  integrations: IntegrationServiceStatus[];
  escalations: EscalationCase[];
  reportsSummary: any;
  adminLoading: boolean;

  // Enterprise Admin Actions
  fetchAdminData: () => Promise<void>;
  updateUserAdmin: (id: string, updates: Partial<User>) => Promise<boolean>;
  toggleUserStatusAdmin: (id: string) => Promise<boolean>;
  addStaffAdmin: (staffData: any) => Promise<boolean>;
  toggleStaffStatusAdmin: (id: string) => Promise<boolean>;
  updateStaffPermissionsAdmin: (id: string, permissions: string[]) => Promise<boolean>;
  updateRolesMatrixAdmin: (matrix: Record<string, string[]>) => Promise<boolean>;
  terminateSessionAdmin: (sessionId: string) => Promise<boolean>;
  blockIpAdmin: (ip: string, reason: string) => Promise<boolean>;
  unblockIpAdmin: (ip: string) => Promise<boolean>;
  updateSecurityPoliciesAdmin: (policies: any) => Promise<boolean>;
  updateSystemSettingsAdmin: (settings: Partial<SystemSettings>) => Promise<boolean>;
  toggleFeatureFlagAdmin: (key: string) => Promise<boolean>;
  createBackupAdmin: (notes?: string) => Promise<BackupPoint | null>;
  restoreBackupAdmin: (backupId: string) => Promise<{ success: boolean; message: string }>;
  resolveSystemErrorAdmin: (id: string) => Promise<boolean>;
  checkDataIntegrityAdmin: () => Promise<any>;
  repairDataIntegrityAdmin: () => Promise<{ repairedCount: number; summary: string } | null>;
  pingIntegrationAdmin: (id: string) => Promise<IntegrationServiceStatus | null>;
  resolveEscalationAdmin: (id: string, status: 'approved' | 'rejected', notes: string) => Promise<boolean>;

  // Refresh & Reset
  refreshData: () => Promise<void>;
  resetToInitialData: () => void;
}

export const normalizeListing = (l: any): Listing => {
  return {
    ...l,
    id: l.id || `list-${Date.now()}`,
    listingNumber: l.listingNumber || 'YEM-2026-000',
    title: l.title || 'عقار معروض',
    description: l.description || '',
    propertyType: l.propertyType || 'apartment',
    purpose: l.purpose || 'sale',
    status: l.status || 'under_review',
    price: typeof l.price === 'number' ? l.price : 0,
    currency: l.currency || 'YER',
    isNegotiable: Boolean(l.isNegotiable),
    area: typeof l.area === 'number' ? l.area : 0,
    areaUnit: l.areaUnit || 'م²',
    images: (Array.isArray(l.images) && l.images.length > 0)
      ? l.images
      : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
    location: {
      governorate: l.location?.governorate || 'صنعاء (أمانة العاصمة)',
      city: l.location?.city || 'صنعاء',
      district: l.location?.district || 'الأمانة',
      street: l.location?.street || '',
      lat: typeof l.location?.lat === 'number' ? l.location.lat : 15.312,
      lng: typeof l.location?.lng === 'number' ? l.location.lng : 44.187,
      isApproximate: l.location?.isApproximate ?? true
    },
    attributes: l.attributes || {},
    advertiser: {
      id: l.advertiser?.id || 'adv-unknown',
      name: l.advertiser?.name || 'معلن دلنّي',
      type: l.advertiser?.type || 'individual',
      phone: l.advertiser?.phone || '777000000',
      phoneVerified: l.advertiser?.phoneVerified ?? true,
      allowWhatsapp: l.advertiser?.allowWhatsapp ?? true,
      allowCall: l.advertiser?.allowCall ?? true,
      orgId: l.advertiser?.orgId,
      orgName: l.advertiser?.orgName
    },
    verificationBadges: Array.isArray(l.verificationBadges) ? l.verificationBadges : [],
    statusTimeline: Array.isArray(l.statusTimeline) ? l.statusTimeline : [],
    viewsCount: typeof l.viewsCount === 'number' ? l.viewsCount : 0,
    favoritesCount: typeof l.favoritesCount === 'number' ? l.favoritesCount : 0,
    createdAt: l.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: l.updatedAt || new Date().toISOString().split('T')[0]
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current active user / role
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('dalani_current_user');
    return saved ? JSON.parse(saved) : MOCK_USERS['visitor'];
  });

  // Main collections
  const [listings, setListings] = useState<Listing[]>(() => {
    try {
      const saved = localStorage.getItem('dalani_listings');
      const raw = saved ? JSON.parse(saved) : INITIAL_LISTINGS;
      return Array.isArray(raw) ? raw.map(normalizeListing) : INITIAL_LISTINGS.map(normalizeListing);
    } catch {
      return INITIAL_LISTINGS.map(normalizeListing);
    }
  });

  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('dalani_orgs');
    return saved ? JSON.parse(saved) : INITIAL_ORGANIZATIONS;
  });

  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(() => {
    const saved = localStorage.getItem('dalani_verifications');
    return saved ? JSON.parse(saved) : INITIAL_VERIFICATION_REQUESTS;
  });

  const [reports, setReports] = useState<ReportCase[]>(() => {
    const saved = localStorage.getItem('dalani_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('dalani_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('dalani_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('dalani_favorites');
    return saved ? JSON.parse(saved) : ['list-101', 'list-103'];
  });

  // Real Estate Requests & Temporary Bookings State (Local Storage Persistent)
  const [requests, setRequests] = useState<PropertyRequest[]>(() => {
    try {
      const saved = localStorage.getItem('dalani_requests');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTY_REQUESTS;
    } catch {
      return INITIAL_PROPERTY_REQUESTS;
    }
  });

  const [bookings, setBookings] = useState<PropertyBooking[]>(() => {
    try {
      const saved = localStorage.getItem('dalani_bookings');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTY_BOOKINGS;
    } catch {
      return INITIAL_PROPERTY_BOOKINGS;
    }
  });

  const [contracts, setContracts] = useState<PropertyContract[]>(() => {
    try {
      const saved = localStorage.getItem('dalani_contracts');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTY_CONTRACTS;
    } catch {
      return INITIAL_PROPERTY_CONTRACTS;
    }
  });

  // Persistent LocalStorage Synchronization Effects
  useEffect(() => {
    try { localStorage.setItem('dalani_current_user', JSON.stringify(currentUser)); } catch (e) { console.warn(e); }
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem('dalani_listings', JSON.stringify(listings)); } catch (e) { console.warn(e); }
  }, [listings]);

  useEffect(() => {
    try { localStorage.setItem('dalani_requests', JSON.stringify(requests)); } catch (e) { console.warn(e); }
  }, [requests]);

  useEffect(() => {
    try { localStorage.setItem('dalani_bookings', JSON.stringify(bookings)); } catch (e) { console.warn(e); }
  }, [bookings]);

  useEffect(() => {
    try { localStorage.setItem('dalani_contracts', JSON.stringify(contracts)); } catch (e) { console.warn(e); }
  }, [contracts]);

  useEffect(() => {
    try { localStorage.setItem('dalani_orgs', JSON.stringify(organizations)); } catch (e) { console.warn(e); }
  }, [organizations]);

  useEffect(() => {
    try { localStorage.setItem('dalani_verifications', JSON.stringify(verificationRequests)); } catch (e) { console.warn(e); }
  }, [verificationRequests]);

  useEffect(() => {
    try { localStorage.setItem('dalani_reports', JSON.stringify(reports)); } catch (e) { console.warn(e); }
  }, [reports]);

  useEffect(() => {
    try { localStorage.setItem('dalani_tickets', JSON.stringify(tickets)); } catch (e) { console.warn(e); }
  }, [tickets]);

  useEffect(() => {
    try { localStorage.setItem('dalani_favorites', JSON.stringify(favorites)); } catch (e) { console.warn(e); }
  }, [favorites]);

  const [googleMapsApiKey, setGoogleMapsApiKeyState] = useState<string>(() => {
    return localStorage.getItem('dalani_gmaps_key') || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Enterprise Admin & Governance State
  const [users, setUsers] = useState<User[]>(() => Object.values(MOCK_USERS));
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rolesMatrix, setRolesMatrix] = useState<Record<string, string[]>>({});
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    platformName: 'منصة دلالي العقارية اليمنية',
    platformTagline: 'المنظومة الوطنية الموثوقة للتسويق والرقابة العقارية',
    maintenanceMode: false,
    defaultCurrency: 'YER',
    allowNewRegistrations: true,
    allowPublicListingPublish: true,
    requirePhoneOtp: true,
    requireIdentityVerificationForAd: false,
    maxDailyListingsPerUser: 10,
    sessionTimeoutMinutes: 60,
    maxFailedLoginAttempts: 5,
    contactEmail: 'admin@dalani-ye.com',
    contactPhone: '+967 1 200300',
    smsNotificationEnabled: true,
    emailNotificationEnabled: true,
    adminAlertsPhone: '+967 777 000 111'
  });
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [backups, setBackups] = useState<BackupPoint[]>([]);
  const [systemErrors, setSystemErrors] = useState<SystemErrorLog[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationServiceStatus[]>([]);
  const [escalations, setEscalations] = useState<EscalationCase[]>([]);
  const [reportsSummary, setReportsSummary] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  // Helper for authenticated standalone/network requests
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-role': currentUser.role,
      'x-user-id': currentUser.id,
      'x-user-name': encodeURIComponent(currentUser.name),
      'Authorization': `Bearer ${currentUser.id}`,
      ...(options.headers || {})
    };
    try {
      // First attempt real network fetch from backend server
      const res = await fetch(url, { ...options, headers });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) {
        return handleLocalApiCall(url, { ...options, headers }, currentUser);
      }
      return res;
    } catch {
      // Fall back to local in-app handler for offline standalone operation
      return handleLocalApiCall(url, { ...options, headers }, currentUser);
    }
  }, [currentUser]);

  // Fetch all admin data
  const fetchAdminData = useCallback(async () => {
    if (currentUser.role !== 'system_admin') return;
    setAdminLoading(true);
    try {
      const [
        usersRes, staffRes, rolesRes, sessionsRes, threatsRes, blockedRes,
        settingsRes, flagsRes, backupsRes, errorsRes, integrationsRes,
        escalationsRes, summaryRes, auditRes
      ] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/staff'),
        apiFetch('/api/admin/roles-matrix'),
        apiFetch('/api/admin/sessions'),
        apiFetch('/api/admin/security/threats'),
        apiFetch('/api/admin/security/blocked-ips'),
        apiFetch('/api/admin/settings'),
        apiFetch('/api/admin/feature-flags'),
        apiFetch('/api/admin/backups'),
        apiFetch('/api/admin/system/errors'),
        apiFetch('/api/admin/integrations'),
        apiFetch('/api/admin/escalations'),
        apiFetch('/api/admin/reports/summary'),
        apiFetch('/api/audit-logs')
      ]);

      if (usersRes?.ok) { const d = await usersRes.json(); setUsers(d.users || []); }
      if (staffRes?.ok) { const d = await staffRes.json(); setStaff(d.staff || []); }
      if (rolesRes?.ok) { const d = await rolesRes.json(); setRolesMatrix(d.rolesMatrix || {}); }
      if (sessionsRes?.ok) { const d = await sessionsRes.json(); setActiveSessions(d.sessions || []); }
      if (threatsRes?.ok) { const d = await threatsRes.json(); setThreats(d.threats || []); }
      if (blockedRes?.ok) { const d = await blockedRes.json(); setBlockedIps(d.blockedIps || []); }
      if (settingsRes?.ok) { const d = await settingsRes.json(); setSystemSettings(d.settings); }
      if (flagsRes?.ok) { const d = await flagsRes.json(); setFeatureFlags(d.featureFlags || []); }
      if (backupsRes?.ok) { const d = await backupsRes.json(); setBackups(d.backups || []); }
      if (errorsRes?.ok) { const d = await errorsRes.json(); setSystemErrors(d.errors || []); }
      if (integrationsRes?.ok) { const d = await integrationsRes.json(); setIntegrations(d.integrations || []); }
      if (escalationsRes?.ok) { const d = await escalationsRes.json(); setEscalations(d.escalations || []); }
      if (summaryRes?.ok) { const d = await summaryRes.json(); setReportsSummary(d.summary); }
      if (auditRes?.ok) { const d = await auditRes.json(); setAuditLogs(d.logs || []); }
    } catch (e) {
      console.warn('[Dalani Admin] Error fetching admin data:', e);
    } finally {
      setAdminLoading(false);
    }
  }, [apiFetch, currentUser.role]);

  // Admin Action Handlers
  const updateUserAdmin = async (id: string, updates: Partial<User>): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      if (res && res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => (u.id === id ? data.user : u)));
        showToast('تم تحديث بيانات المستخدم بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تحديث بيانات المستخدم', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const toggleUserStatusAdmin = async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/users/${id}/toggle-status`, { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => (u.id === id ? data.user : u)));
        showToast(data.message, 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تغيير حالة الحساب', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const addStaffAdmin = async (staffData: any): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(staffData)
      });
      if (res && res.ok) {
        const data = await res.json();
        setStaff(prev => [data.staff, ...prev]);
        showToast('تم إنشاء حساب الموظف بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل إنشاء حساب الموظف', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const toggleStaffStatusAdmin = async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/staff/${id}/status`, { method: 'PATCH' });
      if (res && res.ok) {
        const data = await res.json();
        setStaff(prev => prev.map(s => (s.id === id ? data.staff : s)));
        showToast(data.message, 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تعديل حالة الموظف', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const updateStaffPermissionsAdmin = async (id: string, permissions: string[]): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/staff/${id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions })
      });
      if (res && res.ok) {
        const data = await res.json();
        setStaff(prev => prev.map(s => (s.id === id ? data.staff : s)));
        showToast('تم حفظ صلاحيات الموظف بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تحديث الصلاحيات', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const updateRolesMatrixAdmin = async (matrix: Record<string, string[]>): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/admin/roles-matrix', {
        method: 'PUT',
        body: JSON.stringify({ rolesMatrix: matrix })
      });
      if (res && res.ok) {
        const data = await res.json();
        setRolesMatrix(data.rolesMatrix);
        showToast('تم حفظ مصفوفة الصلاحيات بالخادم بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل حفظ المصفوفة', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const terminateSessionAdmin = async (sessionId: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' });
      if (res && res.ok) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId && s.sessionId !== sessionId));
        showToast('تم إنهاء الجلسة وإبطالها فعلياً من الخادم', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل إنهاء الجلسة', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const blockIpAdmin = async (ip: string, reason: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/admin/security/block-ip', {
        method: 'POST',
        body: JSON.stringify({ ip, reason })
      });
      if (res && res.ok) {
        const data = await res.json();
        setBlockedIps(prev => [data.blocked, ...prev]);
        setThreats(prev => prev.map(t => (t.ipAddress === ip ? { ...t, blocked: true } : t)));
        showToast('تم حظر عنوان الـ IP بنجاح في طبقة الخادم', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل حظر العنوان', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const unblockIpAdmin = async (ip: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/admin/security/unblock-ip', {
        method: 'POST',
        body: JSON.stringify({ ip })
      });
      if (res && res.ok) {
        setBlockedIps(prev => prev.filter(b => b.ip !== ip));
        setThreats(prev => prev.map(t => (t.ipAddress === ip ? { ...t, blocked: false } : t)));
        showToast('تم رفع الحظر عن عنوان الـ IP بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل فك الحظر', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const updateSecurityPoliciesAdmin = async (policies: any): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/admin/security/policies', {
        method: 'PUT',
        body: JSON.stringify(policies)
      });
      if (res && res.ok) {
        const data = await res.json();
        setSystemSettings(data.settings);
        showToast('تم تحديث سياسات الأمان بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تحديث سياسات الأمان', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const updateSystemSettingsAdmin = async (settings: Partial<SystemSettings>): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      if (res && res.ok) {
        const data = await res.json();
        setSystemSettings(data.settings);
        showToast('تم حفظ إعدادات المنظومة بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تحديث الإعدادات', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const toggleFeatureFlagAdmin = async (key: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/feature-flags/${key}/toggle`, { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        setFeatureFlags(prev => prev.map(f => (f.key === key ? data.flag : f)));
        showToast(data.message, 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تبديل الميزة', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const createBackupAdmin = async (notes?: string): Promise<BackupPoint | null> => {
    try {
      const res = await apiFetch('/api/admin/backups/create', {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
      if (res && res.ok) {
        const data = await res.json();
        setBackups(prev => [data.backup, ...prev]);
        showToast('تم إنشاء نسخة احتياطية جديدة موثقة بنجاح', 'success');
        fetchAdminData();
        return data.backup;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل إنشاء النسخة الاحتياطية', 'error');
        return null;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return null;
    }
  };

  const restoreBackupAdmin = async (backupId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch('/api/admin/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ backupId })
      });
      if (res && res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        await refreshData();
        await fetchAdminData();
        return { success: true, message: data.message };
      } else {
        const err = await res?.json();
        const msg = err?.error || 'فشلت عملية الاسترجاع';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }
    } catch {
      const msg = 'خطأ أثناء الاتصال بالخادم';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const resolveSystemErrorAdmin = async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/system/errors/${id}/resolve`, { method: 'PATCH' });
      if (res && res.ok) {
        const data = await res.json();
        setSystemErrors(prev => prev.map(e => (e.id === id ? data.error : e)));
        showToast('تم إغلاق الخطأ وتحديث حالته بنجاح', 'success');
        fetchAdminData();
        return true;
      } else {
        showToast('فشل تحديث حالة الخطأ', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  const checkDataIntegrityAdmin = async (): Promise<any> => {
    try {
      const res = await apiFetch('/api/admin/database/integrity-check');
      if (res && res.ok) {
        const data = await res.json();
        return data.report;
      }
      return null;
    } catch {
      return null;
    }
  };

  const repairDataIntegrityAdmin = async (): Promise<{ repairedCount: number; summary: string } | null> => {
    try {
      const res = await apiFetch('/api/admin/database/repair', { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        showToast(data.result?.summary || 'تم فحص وإصلاح العلاقات بنجاح', 'success');
        fetchAdminData();
        return data.result;
      }
      return null;
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return null;
    }
  };

  const pingIntegrationAdmin = async (id: string): Promise<IntegrationServiceStatus | null> => {
    try {
      const res = await apiFetch(`/api/admin/integrations/${id}/ping`, { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        setIntegrations(prev => prev.map(i => (i.id === id ? data.integration : i)));
        showToast(data.message, 'success');
        return data.integration;
      } else {
        const err = await res?.json();
        showToast(err?.message || 'فشل فحص الاتصال', 'error');
        return null;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return null;
    }
  };

  const resolveEscalationAdmin = async (id: string, status: 'approved' | 'rejected', notes: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/admin/escalations/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status, notes })
      });
      if (res && res.ok) {
        const data = await res.json();
        setEscalations(prev => prev.map(e => (e.id === id ? data.escalation : e)));
        showToast(data.message, 'success');
        fetchAdminData();
        return true;
      } else {
        const err = await res?.json();
        showToast(err?.error || 'فشل تسجيل القرار', 'error');
        return false;
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return false;
    }
  };

  // Fetch real estate requests, temporary bookings, and contracts
  const fetchRequestsAndBookings = useCallback(async () => {
    if (currentUser.role === 'visitor') {
      setRequests([]);
      setBookings([]);
      setContracts([]);
      return;
    }
    try {
      // 1. If Supabase is connected, attempt direct cloud sync
      if (SupabaseAdapter.isConfigured()) {
        const [cloudReq, cloudBkg, cloudCnt] = await Promise.all([
          SupabaseAdapter.fetchRequests(),
          SupabaseAdapter.fetchBookings(),
          SupabaseAdapter.fetchContracts()
        ]);
        if (cloudReq.success && cloudReq.data && cloudReq.data.length > 0) {
          setRequests(cloudReq.data);
          try { localStorage.setItem('dalani_requests', JSON.stringify(cloudReq.data)); } catch {}
        }
        if (cloudBkg.success && cloudBkg.data && cloudBkg.data.length > 0) {
          setBookings(cloudBkg.data);
          try { localStorage.setItem('dalani_bookings', JSON.stringify(cloudBkg.data)); } catch {}
        }
        if (cloudCnt.success && cloudCnt.data && cloudCnt.data.length > 0) {
          setContracts(cloudCnt.data);
          try { localStorage.setItem('dalani_contracts', JSON.stringify(cloudCnt.data)); } catch {}
        }
      }

      // 2. Fetch standard local in-app or proxy endpoints
      const [reqRes, bkgRes, cntRes] = await Promise.all([
        apiFetch('/api/requests'),
        apiFetch('/api/bookings'),
        apiFetch('/api/contracts')
      ]);
      if (reqRes && reqRes.ok) {
        const json = await reqRes.json();
        if (Array.isArray(json.requests)) {
          setRequests(json.requests);
        }
      }
      if (bkgRes && bkgRes.ok) {
        const json = await bkgRes.json();
        if (Array.isArray(json.bookings)) {
          setBookings(json.bookings);
        }
      }
      if (cntRes && cntRes.ok) {
        const json = await cntRes.json();
        if (Array.isArray(json.contracts)) {
          setContracts(json.contracts);
        }
      }
    } catch (e) {
      console.warn('[Dalani Client] Error fetching requests/bookings/contracts:', e);
    }
  }, [apiFetch, currentUser.role]);

  // Sync data from Server API & Supabase Cloud
  const refreshData = useCallback(async () => {
    try {
      // 1. Cloud Supabase Sync if configured
      if (SupabaseAdapter.isConfigured()) {
        const [
          cloudListings,
          cloudOrgs,
          cloudVerifs,
          cloudReports,
          cloudTickets,
          cloudSettings
        ] = await Promise.all([
          SupabaseAdapter.fetchListings(),
          SupabaseAdapter.fetchOrganizations(),
          SupabaseAdapter.fetchVerificationRequests(),
          SupabaseAdapter.fetchReports(),
          SupabaseAdapter.fetchTickets(),
          SupabaseAdapter.fetchSystemSettingsInDb()
        ]);

        if (cloudListings.success && cloudListings.data && cloudListings.data.length > 0) {
          const normalized = cloudListings.data.map(normalizeListing);
          setListings(normalized);
          try { localStorage.setItem('dalani_listings', JSON.stringify(normalized)); } catch {}
        }
        if (cloudOrgs.success && cloudOrgs.data && cloudOrgs.data.length > 0) {
          setOrganizations(cloudOrgs.data);
          try { localStorage.setItem('dalani_orgs', JSON.stringify(cloudOrgs.data)); } catch {}
        }
        if (cloudVerifs.success && cloudVerifs.data && cloudVerifs.data.length > 0) {
          setVerificationRequests(cloudVerifs.data);
          try { localStorage.setItem('dalani_verifications', JSON.stringify(cloudVerifs.data)); } catch {}
        }
        if (cloudReports.success && cloudReports.data && cloudReports.data.length > 0) {
          setReports(cloudReports.data);
          try { localStorage.setItem('dalani_reports', JSON.stringify(cloudReports.data)); } catch {}
        }
        if (cloudTickets.success && cloudTickets.data && cloudTickets.data.length > 0) {
          setTickets(cloudTickets.data);
          try { localStorage.setItem('dalani_tickets', JSON.stringify(cloudTickets.data)); } catch {}
        }
        if (cloudSettings.success && cloudSettings.data) {
          setSystemSettings(cloudSettings.data);
        }
        if (currentUser.id && currentUser.role !== 'visitor') {
          const cloudFavs = await SupabaseAdapter.fetchFavorites(currentUser.id);
          if (cloudFavs.success && Array.isArray(cloudFavs.data)) {
            setFavorites(cloudFavs.data);
          }
        }
      }

      // 2. Local / Standard API sync
      const res = await apiFetch('/api/listings');
      if (res && res.ok) {
        const data = await res.json();
        if (data.listings && Array.isArray(data.listings)) {
          const normalized = data.listings.map(normalizeListing);
          setListings(normalized);
          localStorage.setItem('dalani_listings', JSON.stringify(normalized));
        }
      }

      await fetchRequestsAndBookings();

      // If privileged role, load audit logs and admin governance suite
      if (currentUser.role === 'system_admin') {
        fetchAdminData();
      }
    } catch (e) {
      console.warn('[Dalani Client] Server sync fallback to local cache:', e);
    }
  }, [apiFetch, currentUser.role, currentUser.id, fetchAdminData, fetchRequestsAndBookings]);

  // Initial load and whenever role changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ==========================================
  // Realtime Supabase Subscription (الاتصال الفوري المباشر بقاعدة البيانات)
  // لا حاجة لأزرار تحديث يدوي - تتزامن الواجهة تلقائياً في أجزاء من الثانية
  // ==========================================
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const channel = client
        .channel('dalani_instant_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'listings' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newListing = normalizeListing(mapListingFromSupabase(payload.new));
              setListings(prev => {
                if (prev.some(l => l.id === newListing.id)) {
                  return prev.map(l => (l.id === newListing.id ? newListing : l));
                }
                return [newListing, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = normalizeListing(mapListingFromSupabase(payload.new));
              setListings(prev => prev.map(l => (l.id === updated.id ? updated : l)));
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setListings(prev => prev.filter(l => l.id !== deletedId));
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'property_bookings' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newBkg = mapBookingFromSupabase(payload.new);
              setBookings(prev => {
                if (prev.some(b => b.id === newBkg.id)) {
                  return prev.map(b => (b.id === newBkg.id ? newBkg : b));
                }
                return [newBkg, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapBookingFromSupabase(payload.new);
              setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setBookings(prev => prev.filter(b => b.id !== deletedId));
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'property_requests' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newReq = mapRequestFromSupabase(payload.new);
              setRequests(prev => {
                if (prev.some(r => r.id === newReq.id)) {
                  return prev.map(r => (r.id === newReq.id ? newReq : r));
                }
                return [newReq, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapRequestFromSupabase(payload.new);
              setRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)));
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setRequests(prev => prev.filter(r => r.id !== deletedId));
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'property_contracts' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newCnt = mapContractFromSupabase(payload.new);
              setContracts(prev => {
                if (prev.some(c => c.id === newCnt.id)) {
                  return prev.map(c => (c.id === newCnt.id ? newCnt : c));
                }
                return [newCnt, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapContractFromSupabase(payload.new);
              setContracts(prev => prev.map(c => (c.id === updated.id ? updated : c)));
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setContracts(prev => prev.filter(c => c.id !== deletedId));
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_favorites' },
          (payload) => {
            if (currentUser.id) {
              SupabaseAdapter.fetchFavorites(currentUser.id).then(res => {
                if (res.success && res.data) {
                  setFavorites(res.data);
                }
              });
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[Dalani Realtime] Error setting up realtime subscriptions:', e);
    }
  }, []);

  // Local storage backup sync
  useEffect(() => {
    localStorage.setItem('dalani_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Supabase Auth State Change Listener (Session restoration & UID change)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
          const authUid = session.user.id;
          const { data: profile } = await client
            .from('users')
            .select('*')
            .eq('supabase_user_id', authUid)
            .maybeSingle();

          if (profile) {
            const mapped = mapUserFromSupabase(profile);
            setCurrentUser(mapped);
            localStorage.setItem('dalani_current_user', JSON.stringify(mapped));
          }
        } else if (event === 'SIGNED_OUT') {
          const guest = MOCK_USERS['visitor'];
          setCurrentUser(guest);
          localStorage.removeItem('dalani_current_user');
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } catch (e) {
      console.warn('[Dalani Auth Listener] Warning:', e);
    }
  }, []);

  // Local storage backup sync
  useEffect(() => {
    localStorage.setItem('dalani_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('dalani_listings', JSON.stringify(listings));
  }, [listings]);

  // Per-user isolated favorites
  useEffect(() => {
    if (currentUser.id && currentUser.role !== 'visitor') {
      localStorage.setItem(`dalani_favorites_${currentUser.id}`, JSON.stringify(favorites));
    } else {
      localStorage.setItem('dalani_favorites', JSON.stringify(favorites));
    }
  }, [favorites, currentUser.id, currentUser.role]);

  // Restore user-specific favorites on user switch or login
  useEffect(() => {
    let active = true;
    if (currentUser.id && currentUser.role !== 'visitor') {
      if (SupabaseAdapter.isConfigured()) {
        SupabaseAdapter.fetchFavorites(currentUser.id).then(res => {
          if (active && res.success && Array.isArray(res.data)) {
            setFavorites(res.data);
            return;
          }
          // Fallback to localStorage if offline/unconfigured
          const saved = localStorage.getItem(`dalani_favorites_${currentUser.id}`);
          if (saved) {
            try { setFavorites(JSON.parse(saved)); } catch { setFavorites([]); }
          } else {
            setFavorites([]);
          }
        });
      } else {
        const saved = localStorage.getItem(`dalani_favorites_${currentUser.id}`);
        if (saved) {
          try { setFavorites(JSON.parse(saved)); } catch { setFavorites([]); }
        } else {
          setFavorites([]);
        }
      }
    }
    return () => { active = false; };
  }, [currentUser.id, currentUser.role]);


  const setGoogleMapsApiKey = (key: string) => {
    setGoogleMapsApiKeyState(key);
    localStorage.setItem('dalani_gmaps_key', key);
    showToast('تم تحديث مفتاح Google Maps API بنجاح', 'success');
  };

  /**
   * تسجيل الدخول الموحد والمستقل للمستخدم
   * المسار: Supabase Auth UID -> public.users.supabase_user_id -> بيانات المستخدم الفعلية
   */
  const loginUser = async (credentials: {
    identifier: string;
    password?: string;
    role?: UserRole;
  }): Promise<{ success: boolean; message: string; user?: User }> => {
    const cleanId = credentials.identifier.trim();
    if (!cleanId) {
      showToast('يرجى إدخال اسم المستخدم أو البريد أو الهاتف', 'warning');
      return { success: false, message: 'بيانات الدخول مطلوبة' };
    }

    try {
      // 1. محاولة المصادقة المباشرة عبر Supabase Auth وقراءة public.users بـ supabase_user_id = auth.uid()
      if (SupabaseAdapter.isConfigured()) {
        const supabaseRes = await SupabaseAdapter.signInWithSupabase(cleanId, credentials.password);
        if (supabaseRes.success && supabaseRes.user) {
          const user = supabaseRes.user;
          setCurrentUser(user);
          localStorage.setItem('dalani_current_user', JSON.stringify(user));

          // استعادة مفضلة المستخدم الخاصة به فقط
          const userFavKey = `dalani_favorites_${user.id}`;
          const savedFavs = localStorage.getItem(userFavKey);
          setFavorites(savedFavs ? JSON.parse(savedFavs) : []);

          logAction('تسجيل الدخول للمنصة', 'user', user.id, 'success', `تم تسجيل الدخول بنجاح عبر Supabase للمستخدم: ${user.name}`);
          showToast(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${user.name}`, 'success');
          await fetchRequestsAndBookings();
          return { success: true, message: 'تم تسجيل الدخول بنجاح', user };
        }
      }

      // 2. المصادقة عبر API /api/auth/login للبحث بالبريد أو المعرف أو رقم الهاتف بدقة
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: cleanId,
          email: cleanId.includes('@') ? cleanId : undefined,
          phone: !cleanId.includes('@') ? cleanId : undefined,
          password: credentials.password,
          role: credentials.role
        })
      });

      if (res && res.ok) {
        const data = await res.json();
        const user = data.user as User;
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('dalani_current_user', JSON.stringify(user));

          const userFavKey = `dalani_favorites_${user.id}`;
          const savedFavs = localStorage.getItem(userFavKey);
          setFavorites(savedFavs ? JSON.parse(savedFavs) : []);

          logAction('تسجيل الدخول للمنصة', 'user', user.id, 'success', `تسجيل دخول ناجح للمستخدم: ${user.name} (${user.email || user.phone})`);
          showToast(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${user.name}`, 'success');
          await fetchRequestsAndBookings();
          return { success: true, message: data.message || 'تم تسجيل الدخول بنجاح', user };
        }
      }

      // 3. التحقق المباشر من مصفوفة المستخدمين المعرفين في الذاكرة (بما في ذلك الحسابات الخمسة الجديدة)
      const allKnownUsers = [
        ...Object.values(MOCK_USERS),
        ...NEW_SEEKERS
      ];
      const cleanEmail = cleanId.toLowerCase();
      const cleanPhone = cleanId.replace(/[\s\-\(\)\+]/g, '');

      const matched = allKnownUsers.find(u => {
        if (u.email && u.email.toLowerCase() === cleanEmail) return true;
        if (u.id === cleanId) return true;
        if (u.supabaseUserId && u.supabaseUserId === cleanId) return true;
        if (u.phone && cleanPhone.length >= 7) {
          const uP = u.phone.replace(/[\s\-\(\)\+]/g, '');
          if (uP.includes(cleanPhone) || cleanPhone.includes(uP)) return true;
        }
        return false;
      });

      if (matched) {
        setCurrentUser(matched);
        localStorage.setItem('dalani_current_user', JSON.stringify(matched));
        const userFavKey = `dalani_favorites_${matched.id}`;
        const savedFavs = localStorage.getItem(userFavKey);
        setFavorites(savedFavs ? JSON.parse(savedFavs) : []);

        logAction('تسجيل الدخول للمنصة', 'user', matched.id, 'success', `تسجيل دخول ناجح للمستخدم: ${matched.name}`);
        showToast(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${matched.name}`, 'success');
        await fetchRequestsAndBookings();
        return { success: true, message: 'تم تسجيل الدخول بنجاح', user: matched };
      }

      showToast('لم يتم العثور على حساب مطابق لبيانات الدخول', 'error');
      return { success: false, message: 'بيانات الدخول غير صحيحة' };
    } catch (err: any) {
      showToast(err?.message || 'تعذر إتمام تسجيل الدخول', 'error');
      return { success: false, message: err?.message || 'خطأ أثناء تسجيل الدخول' };
    }
  };

  // Switch role simulator
  const setCurrentUserRole = async (role: UserRole) => {
    // If current user is already an authenticated specific seeker or user with this role, keep their account!
    if (currentUser.role === role && currentUser.role !== 'visitor') {
      showToast(`أنت مسجل حالياً بدور: ${currentUser.name}`, 'info');
      return;
    }

    const user = MOCK_USERS[role] || {
      id: `usr-${role}-${Date.now()}`,
      name: `مستخدم تجريبي (${role})`,
      phone: '+967 770 000 000',
      phoneVerified: true,
      role: role,
      activeStatus: true,
      createdAt: new Date().toISOString()
    };

    setCurrentUser(user);

    // Notify backend
    try {
      await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
    } catch (e) {
      // offline fallback
    }

    logAction('تبديل دور المستخدم', 'user', user.id, 'success', `تم التبديل إلى دور: [${role}]`);
    showToast(`تم التبديل إلى دور: ${user.name}`, 'info');
  };

  const logoutUser = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut().catch(() => {});
      }
    } catch {}

    const visitorUser: User = MOCK_USERS['visitor'] || {
      id: 'usr-visitor-guest',
      name: 'زائر المنصة',
      phone: '',
      phoneVerified: false,
      role: 'visitor',
      activeStatus: true,
      createdAt: '2026-01-01'
    };
    setCurrentUser(visitorUser);
    localStorage.removeItem('dalani_current_user');
    setFavorites([]);
    showToast('تم تسجيل الخروج بنجاح ومسح بيانات الجلسة', 'info');
  };

  const updateUserProfile = async (updates: { name?: string; email?: string; avatarUrl?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (res && res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setUsers(prev => prev.map(u => (u.id === data.user.id ? data.user : u)));
        showToast(data.message || 'تم تحديث الملف الشخصي بنجاح', 'success');
        return { success: true, message: data.message };
      } else {
        const err = await res?.json();
        const msg = err?.error || 'فشل تحديث البيانات';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
  };

  const deactivateAccount = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiFetch('/api/user/deactivate', { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        showToast(data.message || 'تم تعطيل الحساب بنجاح', 'warning');
        logoutUser();
        return { success: true, message: data.message };
      } else {
        const err = await res?.json();
        const msg = err?.error || 'تعذر تعطيل الحساب';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
  };

  const reactivateAccount = async (phone: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiFetch('/api/user/reactivate', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });
      if (res && res.ok) {
        const data = await res.json();
        showToast(data.message || 'تمت إعادة تنشيط الحساب بنجاح', 'success');
        return { success: true, message: data.message };
      } else {
        const err = await res?.json();
        const msg = err?.error || 'تعذر إعادة تنشيط الحساب';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
      return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
  };

  const logAction = (
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    result: 'success' | 'warning' | 'denied',
    details: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId,
      result,
      details
    };
    setAuditLogs(prev => [newEntry, ...prev]);

    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.logAuditActionInDb(newEntry).catch(e => console.warn('[Supabase Sync logAction]:', e));
    }
  };


  // --- Listings Operations ---
  const createListing = async (
    data: Omit<Listing, 'id' | 'listingNumber' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'favoritesCount' | 'statusTimeline'>
  ): Promise<Listing | null> => {
    const nextSeq = listings.length + 101;
    const listingNumber = `YEM-2026-${nextSeq}`;
    const now = new Date().toISOString().split('T')[0];
    const initialStatus: ListingStatus = data.status || 'under_review';

    const fullListing: Listing = normalizeListing({
      ...data,
      id: 'list-' + Date.now(),
      listingNumber,
      status: initialStatus,
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: now,
      updatedAt: now,
      statusTimeline: [
        {
          status: initialStatus,
          timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
          changedBy: currentUser.name,
          userRole: currentUser.role,
          notes: 'إنشاء الإعلان وإرساله للمراجعة'
        }
      ]
    });

    if (SupabaseAdapter.isConfigured()) {
      const res = await SupabaseAdapter.saveListing(fullListing);
      if (!res.success) {
        showToast(res.error || 'تعذر إنشاء الإعلان في قاعدة البيانات', 'error');
        return null;
      }
      setListings(prev => [fullListing, ...prev]);
      logAction('إنشاء إعلان جديد', 'listing', fullListing.id, 'success', `تم نشر الإعلان في قاعدة البيانات: ${fullListing.title}`);
      showToast(`تم حفظ الإعلان بنجاح في قاعدة البيانات برقم: ${fullListing.listingNumber}`, 'success');
      return fullListing;
    }

    try {
      const res = await apiFetch('/api/listings', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (res) {
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'تعذر إنشاء الإعلان', 'error');
          return null;
        }

        const newListing: Listing = normalizeListing(json.listing);
        setListings(prev => [newListing, ...prev]);
        showToast(json.message || `تم حفظ الإعلان بنجاح برقم: ${newListing.listingNumber}`, 'success');
        return newListing;
      }
    } catch (err) {
      console.warn('API error during createListing, fallback to local creation:', err);
    }

    setListings(prev => [fullListing, ...prev]);
    showToast(`تم حفظ الإعلان بنجاح برقم: ${listingNumber}`, 'success');
    return fullListing;
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    if (SupabaseAdapter.isConfigured()) {
      const res = await SupabaseAdapter.updateListing(id, updates);
      if (!res.success) {
        showToast(res.error || 'تعذر تحديث الإعلان في قاعدة البيانات', 'error');
        return;
      }
      setListings(prev =>
        prev.map(l => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : l))
      );
      showToast('تم تحديث بيانات الإعلان في قاعدة البيانات بنجاح', 'success');
      return;
    }

    try {
      const res = await apiFetch(`/api/listings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (res && !res.ok) {
        const json = await res.json();
        showToast(json.error || 'تعذر تحديث الإعلان', 'error');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : l))
    );
    showToast('تم تحديث بيانات الإعلان بنجاح', 'success');
  };

  const deleteListing = async (id: string) => {
    if (SupabaseAdapter.isConfigured()) {
      const res = await SupabaseAdapter.deleteListing(id);
      if (!res.success) {
        showToast(res.error || 'تعذر حذف الإعلان من قاعدة البيانات', 'error');
        return;
      }
      const listing = listings.find(l => l.id === id);
      setListings(prev => prev.filter(l => l.id !== id));
      logAction('حذف إعلان', 'listing', id, 'warning', `تم حذف الإعلان من قاعدة البيانات: ${listing?.title || id}`);
      showToast('تم حذف الإعلان من قاعدة البيانات', 'info');
      return;
    }

    try {
      await apiFetch(`/api/listings/${id}`, { method: 'DELETE' });
    } catch (e) {
      // offline fallback
    }

    const listing = listings.find(l => l.id === id);
    setListings(prev => prev.filter(l => l.id !== id));
    logAction('حذف إعلان', 'listing', id, 'warning', `تم حذف الإعلان: ${listing?.title || id}`);
    showToast('تم حذف الإعلان', 'info');
  };

  const changeListingStatus = async (
    id: string,
    newStatus: ListingStatus,
    reason?: string,
    notes?: string,
    missingFields?: string[]
  ) => {
    // Client-side guard check
    if (currentUser.role === 'advertiser' && newStatus === 'published') {
      logAction('محاولة غير مصرح بها', 'listing', id, 'denied', 'المعلن لا يملك صلاحية اعتماد إعلانه بنفسه');
      showToast('غير مصرح للمعلن باعتماد الإعلان بنفسه، يتطلب مراجعة المشرف', 'error');
      return;
    }

    const timelineEntry = {
      status: newStatus,
      timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
      changedBy: currentUser.name,
      userRole: currentUser.role,
      reason,
      notes,
      missingFields
    };

    if (SupabaseAdapter.isConfigured()) {
      const target = listings.find(l => l.id === id);
      const updatedTimeline = target ? [timelineEntry, ...target.statusTimeline] : [timelineEntry];
      const res = await SupabaseAdapter.updateListing(id, {
        status: newStatus,
        statusTimeline: updatedTimeline
      });
      if (!res.success) {
        showToast(res.error || 'تعذر تغيير حالة الإعلان في قاعدة البيانات', 'error');
        return;
      }
      setListings(prev =>
        prev.map(l => {
          if (l.id === id) {
            return {
              ...l,
              status: newStatus,
              updatedAt: new Date().toISOString().split('T')[0],
              statusTimeline: updatedTimeline
            };
          }
          return l;
        })
      );
      logAction(
        `تغيير حالة إعلان إلى ${newStatus}`,
        'listing',
        id,
        'success',
        reason ? `السبب: ${reason}` : `تم التحويل بواسطة ${currentUser.name}`
      );
      showToast(`تم تحديث حالة الإعلان في قاعدة البيانات إلى: ${newStatus}`, 'success');
      return;
    }

    try {
      const res = await apiFetch(`/api/listings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason, notes, missingFields })
      });

      if (res && !res.ok) {
        const json = await res.json();
        showToast(json.error || 'تعذر تغيير حالة الإعلان', 'error');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    setListings(prev =>
      prev.map(l => {
        if (l.id === id) {
          return {
            ...l,
            status: newStatus,
            updatedAt: new Date().toISOString().split('T')[0],
            statusTimeline: [timelineEntry, ...l.statusTimeline]
          };
        }
        return l;
      })
    );

    logAction(
      `تغيير حالة إعلان إلى ${newStatus}`,
      'listing',
      id,
      'success',
      reason ? `السبب: ${reason}` : `تم التحويل بواسطة ${currentUser.name}`
    );
    showToast(`تم تحديث حالة الإعلان إلى: ${newStatus}`, 'success');
  };

  const toggleFavorite = async (listingId: string) => {
    if (currentUser.role === 'visitor') {
      showToast('يجب تسجيل الدخول أو إنشاء حساب لحفظ العقارات في مفضلتك', 'warning');
      return;
    }

    if (SupabaseAdapter.isConfigured() && currentUser.id) {
      try {
        const res = await SupabaseAdapter.toggleFavoriteInDb(currentUser.id, listingId);
        if (res.success) {
          setFavorites(prev => {
            const exists = prev.includes(listingId);
            const updated = res.isFavorite
              ? (exists ? prev : [...prev, listingId])
              : prev.filter(id => id !== listingId);
            return updated;
          });
          showToast(res.isFavorite ? 'تمت إضافة العقار إلى المفضلة في قاعدة البيانات' : 'تمت إزالة العقار من المفضلة', 'info');
          return;
        } else {
          showToast(res.error || 'فشل تحديث المفضلة في قاعدة البيانات', 'error');
          return;
        }
      } catch (e: any) {
        showToast(e?.message || 'خطأ أثناء الاتصال بقاعدة البيانات', 'error');
        return;
      }
    }

    // Fallback if not configured
    setFavorites(prev => {
      const exists = prev.includes(listingId);
      const updated = exists ? prev.filter(id => id !== listingId) : [...prev, listingId];
      showToast(exists ? 'تمت إزالة العقار من المفضلة' : 'تمت إضافة العقار إلى المفضلة', 'info');
      return updated;
    });
  };

  const isFavorite = (listingId: string) => favorites.includes(listingId);

  // --- Organization Actions ---
  const addOrgMember = async (orgId: string, name: string, phone: string, roleInOrg: 'manager' | 'agent' | 'assistant') => {
    const memberId = 'mem-' + Date.now();
    const newMember = {
      id: memberId,
      userId: 'usr-agent-' + Date.now(),
      name,
      phone,
      roleInOrg,
      isActive: true,
      assignedListingCount: 0,
      joinedAt: new Date().toISOString().split('T')[0]
    };

    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.addOrgMemberInDb({
        id: memberId,
        organization_id: orgId,
        member_name: name,
        member_phone: phone,
        role_in_org: roleInOrg,
        is_active: true
      });
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل حفظ العضو في قاعدة بيانات المنظومة', 'error');
        return;
      }
    }

    setOrganizations(prev =>
      prev.map(org => {
        if (org.id === orgId) {
          return { ...org, members: [...org.members, newMember] };
        }
        return org;
      })
    );

    logAction('إضافة عضو منشأة', 'organization', orgId, 'success', `تمت إضافة العضو ${name} بدور ${roleInOrg}`);
    showToast(`تمت إضافة العضو ${name} بنجاح لقاعدة بيانات المنشأة`, 'success');
  };

  const toggleOrgMemberStatus = async (orgId: string, memberId: string) => {
    const org = organizations.find(o => o.id === orgId);
    const member = org?.members.find(m => m.id === memberId);
    const targetStatus = member ? !member.isActive : false;

    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.toggleOrgMemberStatusInDb(memberId, targetStatus);
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل تعديل حالة العضو في قاعدة البيانات', 'error');
        return;
      }
    }

    setOrganizations(prev =>
      prev.map(org => {
        if (org.id === orgId) {
          return {
            ...org,
            members: org.members.map(m => {
              if (m.id === memberId) {
                return { ...m, isActive: targetStatus };
              }
              return m;
            })
          };
        }
        return org;
      })
    );

    showToast('تم تعديل حالة تفعيل العضو بنجاح في قاعدة البيانات', 'info');
  };

  const assignListingToAgent = async (listingId: string, agentId: string, agentName: string) => {
    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.assignListingAgentInDb(listingId, agentId, agentName);
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل إسناد الإعلان في قاعدة البيانات', 'error');
        return;
      }
    }

    setListings(prev =>
      prev.map(l => (l.id === listingId ? { ...l, assignedAgentId: agentId, assignedAgentName: agentName } : l))
    );

    logAction('إسناد إعلان إلى موظف', 'listing', listingId, 'success', `تم إسناد الإعلان إلى: ${agentName}`);
    showToast(`تم إسناد الإعلان إلى ${agentName} وتثبيته في قاعدة البيانات`, 'success');
  };

  // --- Verification Actions ---
  const submitVerificationRequest = async (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReqId = 'ver-' + Date.now();
    const newReq: VerificationRequest = {
      ...req,
      id: newReqId,
      status: 'under_review',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.saveVerificationRequest(newReq);
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل تقديم طلب التحقق في قاعدة البيانات', 'error');
        return;
      }
    } else {
      try {
        await apiFetch('/api/verifications', {
          method: 'POST',
          body: JSON.stringify(req)
        });
      } catch (e) {
        // offline fallback
      }
    }

    setVerificationRequests(prev => [newReq, ...prev]);
    showToast('تم حفظ طلب التحقق في قاعدة البيانات وسيقوم الفريق بمراجعته قريباً', 'success');
  };

  const reviewVerificationRequest = async (id: string, status: 'approved' | 'rejected' | 'needs_info', notes: string) => {
    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.updateVerificationRequest(id, {
        status,
        moderatorNotes: notes,
        reviewedBy: currentUser.name,
        reviewedAt: new Date().toISOString().split('T')[0]
      });
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل تحديث قرار التحقق في قاعدة البيانات', 'error');
        return;
      }
    } else {
      try {
        await apiFetch(`/api/verifications/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status, notes, badgeType: 'deed_reviewed', validityNote: notes })
        });
      } catch (e) {
        // offline fallback
      }
    }

    setVerificationRequests(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              status,
              moderatorNotes: notes,
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString().split('T')[0]
            }
          : v
      )
    );

    const targetReq = verificationRequests.find(v => v.id === id);
    if (status === 'approved' && targetReq?.requestType === 'property_deed') {
      setListings(prev =>
        prev.map(l => {
          if (l.id === targetReq.targetId) {
            const hasDeedBadge = l.verificationBadges.some(b => b.type === 'deed_reviewed');
            if (!hasDeedBadge) {
              return {
                ...l,
                verificationBadges: [
                  ...l.verificationBadges,
                  {
                    type: 'deed_reviewed',
                    label: 'وثيقة البصيرة راجعها الفريق',
                    description: 'تمت مراجعة الوثيقة الثبوتية للبصيرة الشرعية للأرض أو العقار.',
                    verifiedAt: new Date().toISOString().split('T')[0],
                    verifiedBy: currentUser.name,
                    validityNote: 'مراجعة سارية ومطابقة',
                    disclaimer: 'المراجعة لا تُغني عن التحري الميداني في المحكمة وسؤال الجيران.'
                  }
                ]
              };
            }
          }
          return l;
        })
      );
    }

    showToast(`تم تسجيل قرار التحقق في قاعدة البيانات: ${status}`, 'success');
  };

  // --- Reports Actions ---
  const submitReport = async (report: Omit<ReportCase, 'id' | 'caseNumber' | 'createdAt' | 'status'>) => {
    const nextCaseNo = `REP-2026-00${reports.length + 50}`;
    const newReport: ReportCase = {
      ...report,
      id: 'rep-' + Date.now(),
      caseNumber: nextCaseNo,
      status: 'new',
      createdAt: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
    };

    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.saveReport(newReport);
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل حفظ البلاغ في قاعدة البيانات', 'error');
        return;
      }
    } else {
      try {
        await apiFetch('/api/reports', {
          method: 'POST',
          body: JSON.stringify(report)
        });
      } catch (e) {
        // offline fallback
      }
    }

    setReports(prev => [newReport, ...prev]);
    showToast('تم تسجيل بلاغك في قاعدة البيانات وسيقوم فريق النزاعات بالتحقق الفوري', 'info');
  };

  const resolveReport = async (id: string, status: 'resolved_ad_suspended' | 'dismissed', resolutionReason: string) => {
    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.updateReport(id, {
        status,
        resolutionReason,
        resolvedAt: new Date().toISOString().split('T')[0]
      });
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل تحديث البلاغ في قاعدة البيانات', 'error');
        return;
      }
    } else {
      try {
        await apiFetch(`/api/reports/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: status === 'resolved_ad_suspended' ? 'action_taken' : 'dismissed', resolutionNotes: resolutionReason })
        });
      } catch (e) {
        // offline fallback
      }
    }

    setReports(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status,
              resolutionReason,
              resolvedAt: new Date().toISOString().split('T')[0],
              resolvedBy: currentUser.name
            }
          : r
      )
    );

    if (status === 'resolved_ad_suspended') {
      const rep = reports.find(r => r.id === id);
      if (rep) {
        changeListingStatus(rep.listingId, 'suspended', `إيقاف بموجب البلاغ ${rep.caseNumber}: ${resolutionReason}`);
      }
    }

    showToast('تمت معالجة البلاغ وتحديثه في قاعدة البيانات بنجاح', 'success');
  };

  // --- Support Actions ---
  const createTicket = async (
    subject: string,
    category: SupportTicket['category'],
    priority: SupportTicket['priority'],
    initialMessage: string
  ) => {
    const nextTktNo = `TKT-2026-${tickets.length + 101}`;
    const now = new Date().toISOString().split('T')[0];
    const isSupport = currentUser.role === 'support' || currentUser.role === 'system_admin';
    const senderRole: 'user' | 'support' = isSupport ? 'support' : 'user';

    const newTicket: SupportTicket = {
      id: 'tkt-' + Date.now(),
      ticketNumber: nextTktNo,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      category,
      subject,
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: 'msg-1',
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole,
          text: initialMessage,
          timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.saveTicket(newTicket);
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل حفظ التذكرة في قاعدة البيانات', 'error');
        return;
      }
    } else {
      try {
        const res = await apiFetch('/api/support/tickets', {
          method: 'POST',
          body: JSON.stringify({ subject, category, priority, message: initialMessage })
        });
        if (res && res.ok) {
          const json = await res.json();
          if (json.ticket) {
            setTickets(prev => [json.ticket, ...prev]);
            showToast('تم إرسال تذكرتك بنجاح، وسيقوم ممثل الدعم بالرد قريباً', 'success');
            return;
          }
        }
      } catch (e) {
        // offline fallback
      }
    }

    setTickets(prev => [newTicket, ...prev]);
    showToast('تم إرسال تذكرتك وحفظها في قاعدة البيانات بنجاح', 'success');
  };

  const replyToTicket = async (ticketId: string, text: string) => {
    const isSupport = currentUser.role === 'support' || currentUser.role === 'system_admin';
    const senderRole: 'user' | 'support' = isSupport ? 'support' : 'user';

    const newMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole,
      text,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
    };

    if (SupabaseAdapter.isConfigured()) {
      const dbRes = await SupabaseAdapter.addTicketMessage(ticketId, newMessage);
      if (!dbRes.success) {
        showToast(dbRes.error || 'فشل إرسال الرد في قاعدة البيانات', 'error');
        return;
      }
    } else {
      try {
        await apiFetch(`/api/support/tickets/${ticketId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ message: text })
        });
      } catch (e) {
        // offline fallback
      }
    }

    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              updatedAt: new Date().toISOString().split('T')[0],
              messages: [...t.messages, newMessage]
            }
          : t
      )
    );
    showToast('تم إرسال الرد وتثبيته في قاعدة البيانات بنجاح', 'success');
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket['status']) => {
    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateTicketStatusInDb(ticketId, status).catch(e => console.warn('[Supabase Sync TicketStatus]:', e));
    }
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status, lastUpdate: new Date().toISOString().split('T')[0] } : t))
    );
    showToast(`تم تغيير حالة التذكرة إلى: ${status}`, 'info');
  };

  const resetToInitialData = () => {
    localStorage.removeItem('dalani_listings');
    localStorage.removeItem('dalani_orgs');
    localStorage.removeItem('dalani_verifications');
    localStorage.removeItem('dalani_reports');
    localStorage.removeItem('dalani_tickets');
    localStorage.removeItem('dalani_audit_logs');
    localStorage.removeItem('dalani_favorites');

    setListings(INITIAL_LISTINGS);
    setOrganizations(INITIAL_ORGANIZATIONS);
    setVerificationRequests(INITIAL_VERIFICATION_REQUESTS);
    setReports(INITIAL_REPORTS);
    setTickets(INITIAL_TICKETS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setFavorites(['list-101', 'list-103']);

    showToast('تمت إعادة ضبط البيانات الأولية بنجاح', 'info');
  };

  // ==========================================
  // PROPERTY REQUESTS & TEMPORARY BOOKINGS ACTIONS
  // ==========================================

  const submitPropertyRequest = async (data: {
    listingId: string;
    requestType?: PropertyRequestType;
    notes?: string;
    offeredPrice?: number;
    preferredDate?: string;
    requestedDurationHours?: number;
    seekerPhone?: string;
    paymentMethod?: string;
    rentalUsageType?: string;
    leaseDurationMonths?: number;
    paymentFrequency?: string;
  }) => {
    if (currentUser.role === 'visitor') {
      showToast('يجب تسجيل الدخول لإرسال طلب حجز أو استفسار على العقار', 'warning');
      return { success: false, message: 'يجب تسجيل الدخول' };
    }
    let json: any = null;
    let isSuccess = false;

    try {
      const res = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const contentType = res?.headers.get('content-type') || '';
      if (res && res.ok && contentType.includes('application/json')) {
        json = await res.json();
        isSuccess = true;
      }
    } catch (e) {
      console.warn('[Dalani AppContext] Backend request failed, utilizing local standalone fallback:', e);
    }

    if (isSuccess && json) {
      showToast(json.message || 'تم إرسال طلبك بنجاح', 'success');
      await Promise.all([fetchRequestsAndBookings(), refreshData()]);
      return { success: true, message: json.message, request: json.request };
    }

    // Client Standalone Fallback for Mobile APK & Offline Execution
    const targetListing = listings.find(l => l.id === data.listingId);
    const reqNum = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    const newRequest: PropertyRequest = {
      id: `req-${Date.now()}`,
      requestNumber: reqNum,
      listingId: data.listingId,
      listingTitle: targetListing?.title || 'عقار عقاري',
      listingNumber: `YEM-${data.listingId.slice(-4)}`,
      listingPrice: targetListing?.price || data.offeredPrice || 0,
      listingCurrency: (targetListing?.currency as any) || 'YER',
      listingImage: targetListing?.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
      listingGovernorate: (targetListing as any)?.governorate || 'صنعاء',
      seekerId: currentUser.id,
      seekerName: currentUser.name,
      seekerPhone: data.seekerPhone || currentUser.phone || '778990011',
      advertiserId: targetListing?.advertiser?.id || 'usr-advertiser-1',
      advertiserName: targetListing?.advertiser?.name || 'المعلن العقاري',
      advertiserPhone: targetListing?.advertiser?.phone || '777111222',
      requestType: (data.requestType as any) || 'booking',
      notes: data.notes || '',
      offeredPrice: data.offeredPrice || targetListing?.price || 0,
      preferredDate: data.preferredDate || nowIso.split('T')[0],
      requestedDurationHours: data.requestedDurationHours || 48,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      paymentMethod: data.paymentMethod,
      rentalUsageType: data.rentalUsageType,
      leaseDurationMonths: data.leaseDurationMonths,
      paymentFrequency: data.paymentFrequency
    };

    setRequests(prev => [newRequest, ...prev]);
    showToast('تم إرسال طلب الحجز بنجاح', 'success');
    return { success: true, message: 'تم إرسال طلبك بنجاح', request: newRequest };
  };

  const cancelPropertyRequest = async (requestId: string, reason?: string) => {
    try {
      const res = await apiFetch(`/api/requests/${requestId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      const contentType = res?.headers.get('content-type') || '';
      if (res && res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        showToast(json.message || 'تم إلغاء الطلب بنجاح', 'info');
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return { success: true, message: json.message };
      }
    } catch (err: any) {
      console.warn('[Dalani AppContext] cancelPropertyRequest network fallback:', err);
    }
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'cancelled' } : r));
    showToast('تم إلغاء الطلب بنجاح', 'info');
    return { success: true, message: 'تم إلغاء الطلب بنجاح' };
  };

  const acceptPropertyRequest = async (requestId: string, durationHours?: number, notes?: string) => {
    try {
      const res = await apiFetch(`/api/requests/${requestId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ durationHours, notes })
      });
      const contentType = res?.headers.get('content-type') || '';
      if (res && contentType.includes('application/json')) {
        const json = await res.json();
        if (res.ok) {
          showToast(json.message || 'تم تأكيد الحجز المؤقت بنجاح', 'success');
          await Promise.all([fetchRequestsAndBookings(), refreshData()]);
          return { success: true, message: json.message, booking: json.booking };
        } else {
          // خطأ من الخادم أو تعارض حجز نشط (409)
          const errorMsg = json.error || 'تعذر تأكيد الحجز';
          showToast(errorMsg, 'error');
          return { success: false, message: errorMsg };
        }
      }
    } catch (err: any) {
      console.warn('[Dalani AppContext] acceptPropertyRequest network fallback:', err);
    }

    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) {
      showToast('الطلب غير موجود', 'error');
      return { success: false, message: 'الطلب غير موجود' };
    }

    // التحقق المحلي من عدم وجود حجز نشط سابق على العقار ذاته
    const existingActive = bookings.find(b => b.listingId === targetReq.listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > Date.now());
    if (existingActive) {
      const conflictMsg = 'تعذر تأكيد الحجز: هذا العقار محجوز حالياً بحجز مؤقت فعال لضمان الحصرية ولا يمكن حجز عقار محجوز بالتوازي.';
      showToast(conflictMsg, 'error');
      return { success: false, message: conflictMsg };
    }

    const bkgNum = `BKG-2026-${Math.floor(2000 + Math.random() * 8000)}`;
    const newBooking: PropertyBooking = {
      id: `bk-${Date.now()}`,
      bookingNumber: bkgNum,
      requestId: requestId,
      listingId: targetReq.listingId,
      listingTitle: targetReq.listingTitle || 'عقار محجوز',
      listingNumber: targetReq.listingNumber || 'YEM-111',
      listingImage: targetReq.listingImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
      listingGovernorate: targetReq.listingGovernorate || 'صنعاء',
      listingPrice: targetReq.listingPrice || 45000,
      listingCurrency: targetReq.listingCurrency || 'YER',
      seekerId: targetReq.seekerId || currentUser.id,
      seekerName: targetReq.seekerName || currentUser.name,
      seekerPhone: targetReq.seekerPhone || '778990011',
      advertiserId: targetReq.advertiserId || currentUser.id,
      advertiserName: targetReq.advertiserName || currentUser.name,
      advertiserPhone: targetReq.advertiserPhone || '777111222',
      durationHours: durationHours || targetReq.requestedDurationHours || 48,
      status: 'active',
      startDate: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (durationHours || 48) * 3600 * 1000).toISOString(),
      confirmedBy: currentUser.id,
      notes: notes || targetReq.notes,
      paymentMethod: targetReq.paymentMethod,
      rentalUsageType: targetReq.rentalUsageType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r));
    setBookings(prev => [newBooking, ...prev]);
    showToast('تم تأكيد الحجز المؤقت بنجاح', 'success');
    return { success: true, message: 'تم تأكيد الحجز بنجاح', booking: newBooking };
  };

  const rejectPropertyRequest = async (requestId: string, reason?: string) => {
    try {
      const res = await apiFetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      const contentType = res?.headers.get('content-type') || '';
      if (res && res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        showToast(json.message || 'تم رفض الطلب', 'info');
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return { success: true, message: json.message };
      }
    } catch (err: any) {
      console.warn('[Dalani AppContext] rejectPropertyRequest network fallback:', err);
    }
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    showToast('تم رفض الطلب', 'info');
    return { success: true, message: 'تم رفض الطلب' };
  };

  const cancelBooking = async (bookingId: string, reason?: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم إلغاء الحجز المؤقت', 'info');
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return { success: true, message: json.message };
      } else {
        showToast(json?.error || 'تعذر إلغاء الحجز', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const extendBooking = async (bookingId: string, additionalHours: number) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({ additionalHours })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تمديد مدة الحجز', 'success');
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return { success: true, message: json.message };
      } else {
        showToast(json?.error || 'تعذر تمديد الحجز', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const cancelBookingWithCategory = async (bookingId: string, category: string, reason: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ category, reason })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم إلغاء الحجز وتوثيق السبب', 'info');
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return { success: true, message: json.message, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر إلغاء الحجز', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const fetchCompletionPrerequisites = async (bookingId: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/completion-prerequisites`);
      const json = await res?.json();
      if (res && res.ok) {
        return json;
      }
      return { canComplete: false, requirements: [] };
    } catch (err: any) {
      return { canComplete: false, requirements: [] };
    }
  };

  const updateBookingFinancialClearance = async (bookingId: string, fc: Partial<FinancialClearance>) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/financial-clearance`, {
        method: 'POST',
        body: JSON.stringify(fc)
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تسجيل المخالصة المالية', 'success');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر تسجيل المخالصة المالية', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateBookingHandoverProtocol = async (bookingId: string, hp: Partial<HandoverProtocol>) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/handover-protocol`, {
        method: 'POST',
        body: JSON.stringify(hp)
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم توثيق محضر التسليم والاستلام', 'success');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر توثيق محضر التسليم', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const completeBooking = async (
    bookingId: string,
    options?: {
      notes?: string;
      financialClearance?: FinancialClearance;
      handoverProtocol?: HandoverProtocol;
      forceAdminOverride?: boolean;
    } | string
  ) => {
    try {
      const bodyPayload = typeof options === 'string' ? { notes: options } : (options || {});
      const res = await apiFetch(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        body: JSON.stringify(bodyPayload)
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تهانينا! تم إتمام المعاملة العقارية رسمياً وتوثيق محضر الإغلاق', 'success');
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return {
          success: true,
          message: json.message,
          listing: json.listing,
          booking: json.booking,
          contract: json.contract
        };
      } else {
        showToast(json?.error || 'تعذر إتمام الصفقة، يلزم استيفاء كافة المتطلبات المحددة', 'error');
        return {
          success: false,
          message: json?.error,
          missingRequirements: json?.missingRequirements,
          booking: json?.booking,
          contract: json?.contract
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const raiseDealDispute = async (bookingId: string, claimType: string, claimDescription: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ claimType, claimDescription })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تسجيل النزاع وتجميد إتمام الصفقة مؤقتاً', 'warning');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, dispute: json.dispute, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر تسجيل النزاع', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const resolveDealDispute = async (bookingId: string, resolution: 'dismissed' | 'resolved' | 'cancel_deal', resolutionNotes?: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/dispute/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution, resolutionNotes })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تسجيل قرار فض النزاع وتحديث المعاملة', 'success');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await Promise.all([fetchRequestsAndBookings(), refreshData()]);
        return { success: true, message: json.message, dispute: json.dispute, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر فض النزاع', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const getActiveBookingForListing = useCallback((listingId: string): PropertyBooking | undefined => {
    const now = new Date().getTime();
    return bookings.find(
      b => b.listingId === listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > now
    );
  }, [bookings]);

  const fetchDealWorkspace = async (bookingId: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/deal`);
      const json = await res?.json();
      if (res && res.ok) {
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        return { success: true, data: json };
      } else {
        return { success: false, error: json?.error || 'تعذر تحميل بيانات الصفقة' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'خطأ في الاتصال' };
    }
  };

  const sendDealMessage = async (bookingId: string, text: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      const json = await res?.json();
      if (res && res.ok) {
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        return { success: true, message: json.message, dealMessage: json.dealMessage };
      } else {
        showToast(json?.error || 'فشل إرسال الرسالة', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const proposeDealTerms = async (bookingId: string, terms: DealTerms) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/terms/propose`, {
        method: 'POST',
        body: JSON.stringify(terms)
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم إرسال مسودة الشروط بنجاح', json.wasApprovedModified ? 'warning' : 'success');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, wasApprovedModified: json.wasApprovedModified, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر إرسال الشروط', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const respondToDealTerms = async (bookingId: string, revisionId: string, action: 'accept' | 'reject', responseNotes?: string) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/terms/respond`, {
        method: 'POST',
        body: JSON.stringify({ revisionId, action, responseNotes })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تسجيل قرارك بنجاح', action === 'accept' ? 'success' : 'info');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر معالجة القرار', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateDealInspection = async (bookingId: string, data: { action: 'request' | 'confirm' | 'complete' | 'cancel'; requestedDate?: string; requestedTime?: string; locationNotes?: string; result?: InspectionResult; resultNotes?: string }) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/inspection`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تحديث بيانات المعاينة', 'success');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, booking: json.booking, visit: json.inspectionVisit };
      } else {
        showToast(json?.error || 'تعذر تحديث المعاينة', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateDealStage = async (bookingId: string, stage: DealStage) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/deal-stage`, {
        method: 'POST',
        body: JSON.stringify({ stage })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تحديث مرحلة الصفقة', 'success');
        if (json.booking) {
          setBookings(prev => prev.map(b => (b.id === json.booking.id ? json.booking : b)));
        }
        return { success: true, message: json.message, booking: json.booking };
      } else {
        showToast(json?.error || 'تعذر تحديث المرحلة', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // ==========================================
  // Contracts & Documentation Functions
  // ==========================================

  const fetchContracts = useCallback(async (filters?: { bookingId?: string; listingId?: string; status?: ContractStatus }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.bookingId) params.append('bookingId', filters.bookingId);
      if (filters?.listingId) params.append('listingId', filters.listingId);
      if (filters?.status) params.append('status', filters.status);
      const res = await apiFetch(`/api/contracts?${params.toString()}`);
      if (res && res.ok) {
        const json = await res.json();
        if (Array.isArray(json.contracts)) {
          setContracts(json.contracts);
          return json.contracts;
        }
      }
      return [];
    } catch {
      return [];
    }
  }, [apiFetch]);

  const fetchContractById = useCallback(async (contractId: string): Promise<PropertyContract | null> => {
    try {
      const res = await apiFetch(`/api/contracts/${contractId}`);
      if (res && res.ok) {
        const json = await res.json();
        return json.contract || null;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiFetch]);

  const fetchContractByBookingId = useCallback(async (bookingId: string): Promise<PropertyContract | null> => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/contract`);
      if (res && res.ok) {
        const json = await res.json();
        return json.contract || null;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiFetch]);

  const generateContractFromBooking = async (
    bookingId: string,
    customOptions?: { customType?: ContractType; customClauses?: ContractClause[] }
  ) => {
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/contract/generate`, {
        method: 'POST',
        body: JSON.stringify(customOptions || {})
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم إنشاء مسودة العقد بنجاح', 'success');
        if (json.contract) {
          setContracts(prev => {
            const filtered = prev.filter(c => c.id !== json.contract.id);
            return [json.contract, ...filtered];
          });
          if (SupabaseAdapter.isConfigured()) {
            SupabaseAdapter.saveContract(json.contract).catch(e => console.warn('[Supabase Sync]:', e));
          }
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract };
      } else {
        showToast(json?.error || 'تعذر إنشاء مسودة العقد', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateContractDraft = async (
    contractId: string,
    updates: {
      clauses?: ContractClause[];
      financialTerms?: any;
      durationTerms?: any;
      notes?: string;
      summaryOfChanges?: string;
      witnesses?: ContractParty[];
    }
  ) => {
    try {
      const res = await apiFetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تحديث العقد بنجاح', json.wasApprovedModified ? 'warning' : 'success');
        if (json.contract) {
          setContracts(prev => prev.map(c => (c.id === json.contract.id ? json.contract : c)));
          if (SupabaseAdapter.isConfigured()) {
            SupabaseAdapter.updateContract(contractId, json.contract).catch(e => console.warn('[Supabase Sync]:', e));
          }
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract, wasApprovedModified: json.wasApprovedModified };
      } else {
        showToast(json?.error || 'تعذر تحديث العقد', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const approveContract = async (contractId: string, partyType?: 'firstParty' | 'secondParty' | 'admin') => {
    try {
      const res = await apiFetch(`/api/contracts/${contractId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ asParty: partyType })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تسجيل الاعتماد بنجاح', 'success');
        if (json.contract) {
          setContracts(prev => prev.map(c => (c.id === json.contract.id ? json.contract : c)));
          if (SupabaseAdapter.isConfigured()) {
            SupabaseAdapter.updateContract(contractId, json.contract).catch(e => console.warn('[Supabase Sync]:', e));
          }
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract };
      } else {
        showToast(json?.error || 'تعذر اعتماد العقد', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const signContract = async (
    contractId: string,
    partyRole?: 'firstParty' | 'secondParty' | 'witness',
    options?: {
      nationalId?: string;
      idGovernorate?: string;
      verificationCode?: string;
      signerPhone?: string;
      legalDisclaimerAcknowledged?: boolean;
    } | string
  ) => {
    try {
      const parsed = typeof options === 'string' ? { nationalId: options } : (options || {});
      const res = await apiFetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        body: JSON.stringify({
          partyRole,
          ...parsed
        })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تسجيل التوقيع وتوثيقه بنجاح', 'success');
        if (json.contract) {
          setContracts(prev => prev.map(c => (c.id === json.contract.id ? json.contract : c)));
          if (SupabaseAdapter.isConfigured()) {
            SupabaseAdapter.updateContract(contractId, json.contract).catch(e => console.warn('[Supabase Sync]:', e));
          }
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract };
      } else {
        showToast(json?.error || 'تعذر توقيع العقد', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const proposeContractAmendment = async (contractId: string, summaryOfChanges: string, clauses?: ContractClause[], financialTerms?: any) => {
    try {
      const res = await apiFetch(`/api/contracts/${contractId}/amend`, {
        method: 'POST',
        body: JSON.stringify({ summaryOfChanges, clauses, financialTerms })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم تقديم طلب التعديل بنجاح', 'warning');
        if (json.contract) {
          setContracts(prev => prev.map(c => (c.id === json.contract.id ? json.contract : c)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract };
      } else {
        showToast(json?.error || 'تعذر تسجيل التعديل', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const respondToContractAmendment = async (contractId: string, accept: boolean, reason?: string) => {
    try {
      const res = await apiFetch(`/api/contracts/${contractId}/respond-amendment`, {
        method: 'POST',
        body: JSON.stringify({ accept, reason })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم معالجة الرد بنجاح', accept ? 'success' : 'info');
        if (json.contract) {
          setContracts(prev => prev.map(c => (c.id === json.contract.id ? json.contract : c)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract };
      } else {
        showToast(json?.error || 'تعذر معالجة الرد', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const cancelContract = async (contractId: string, reason: string) => {
    try {
      const res = await apiFetch(`/api/contracts/${contractId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      const json = await res?.json();
      if (res && res.ok) {
        showToast(json.message || 'تم إلغاء العقد', 'info');
        if (json.contract) {
          setContracts(prev => prev.map(c => (c.id === json.contract.id ? json.contract : c)));
        }
        await fetchRequestsAndBookings();
        return { success: true, message: json.message, contract: json.contract };
      } else {
        showToast(json?.error || 'تعذر إلغاء العقد', 'error');
        return { success: false, message: json?.error };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUserRole,
        loginUser,
        updateUserProfile,
        deactivateAccount,
        reactivateAccount,
        logoutUser,
        listings,
        organizations,
        verificationRequests,
        reports,
        tickets,
        auditLogs,
        favorites,
        googleMapsApiKey,
        setGoogleMapsApiKey,

        // Requests & Bookings System
        requests,
        bookings,
        fetchRequestsAndBookings,
        submitPropertyRequest,
        cancelPropertyRequest,
        acceptPropertyRequest,
        rejectPropertyRequest,
        cancelBooking,
        cancelBookingWithCategory,
        extendBooking,
        fetchCompletionPrerequisites,
        updateBookingFinancialClearance,
        updateBookingHandoverProtocol,
        completeBooking,
        raiseDealDispute,
        resolveDealDispute,
        getActiveBookingForListing,
        fetchDealWorkspace,
        sendDealMessage,
        proposeDealTerms,
        respondToDealTerms,
        updateDealInspection,
        updateDealStage,

        // Contracts & Documentation
        contracts,
        fetchContracts,
        fetchContractById,
        fetchContractByBookingId,
        generateContractFromBooking,
        updateContractDraft,
        approveContract,
        signContract,
        proposeContractAmendment,
        respondToContractAmendment,
        cancelContract,
        createListing,
        updateListing,
        deleteListing,
        changeListingStatus,
        toggleFavorite,
        isFavorite,
        addOrgMember,
        toggleOrgMemberStatus,
        assignListingToAgent,
        submitVerificationRequest,
        reviewVerificationRequest,
        submitReport,
        resolveReport,
        createTicket,
        replyToTicket,
        updateTicketStatus,
        logAction,
        toasts,
        showToast,
        removeToast,
        refreshData,
        resetToInitialData,

        // Enterprise Admin & Governance
        users,
        staff,
        rolesMatrix,
        activeSessions,
        threats,
        blockedIps,
        systemSettings,
        featureFlags,
        backups,
        systemErrors,
        integrations,
        escalations,
        reportsSummary,
        adminLoading,
        fetchAdminData,
        updateUserAdmin,
        toggleUserStatusAdmin,
        addStaffAdmin,
        toggleStaffStatusAdmin,
        updateStaffPermissionsAdmin,
        updateRolesMatrixAdmin,
        terminateSessionAdmin,
        blockIpAdmin,
        unblockIpAdmin,
        updateSecurityPoliciesAdmin,
        updateSystemSettingsAdmin,
        toggleFeatureFlagAdmin,
        createBackupAdmin,
        restoreBackupAdmin,
        resolveSystemErrorAdmin,
        checkDataIntegrityAdmin,
        repairDataIntegrityAdmin,
        pingIntegrationAdmin,
        resolveEscalationAdmin
      }}
    >
      {children}

      {/* Global Toast Notifications Banner */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-800'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-800'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white text-base leading-none p-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
