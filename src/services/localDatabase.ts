import {
  Listing,
  Organization,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  User,
  UserRole,
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
  PropertyBooking,
  DealMessage,
  InspectionVisit,
  DealTerms,
  TermsRevision,
  DealStage,
  TermsStatus,
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
  MOCK_USERS
} from '../data/yemenData';

export interface LocalDatabaseSchema {
  listings: Listing[];
  organizations: Organization[];
  verifications: VerificationRequest[];
  reports: ReportCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
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
  requests: PropertyRequest[];
  bookings: PropertyBooking[];
  contracts: PropertyContract[];
}

const STORAGE_KEY = 'dalani_standalone_database_v1';

export function normalizeListing(l: any): Listing {
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
    isReserved: Boolean(l.isReserved),
    reservedUntil: l.reservedUntil,
    activeBookingId: l.activeBookingId,
    createdAt: l.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: l.updatedAt || new Date().toISOString().split('T')[0]
  };
}

export function normalizeBooking(b: any): PropertyBooking {
  const isSale = b.listingPurpose === 'sale' || (b.listingPrice > 20000 && !b.rentalUsageType);
  const defaultPrice = typeof b.listingPrice === 'number' ? b.listingPrice : 100000;
  const defaultCurrency = b.listingCurrency || 'USD';

  const defaultTerms: DealTerms = b.currentTerms || {
    price: defaultPrice,
    currency: defaultCurrency,
    paymentMethod: b.paymentMethod || (isSale ? 'certified_check' : 'cash'),
    depositAmount: Math.round(defaultPrice * 0.05),
    depositCurrency: defaultCurrency,
    handoverDate: '2026-11-01',
    feeResponsibility: 'shared_equally',
    specialConditions: [
      'فحص وثائق الملكية والبصيرة الشرعية قبل سداد الدفعة النهائية',
      'سداد كافة فواتير الخدمات السابقة حتى تاريخ استلام العقار'
    ],
    notes: b.notes || 'الشروط المتفق عليها مبدئياً'
  };

  return {
    ...b,
    dealStage: b.dealStage || (b.status === 'completed' ? 'contract_completed' : (b.agreedTerms || b.id === 'bkg-201') ? 'terms_negotiation' : 'booking_exclusive'),
    messages: Array.isArray(b.messages) && b.messages.length > 0 ? b.messages : [],
    inspectionVisit: b.inspectionVisit || {
      status: (b.id === 'bkg-201' || b.status === 'completed') ? 'completed' : 'confirmed',
      requestedDate: '2026-10-21',
      requestedTime: '16:00',
      locationNotes: 'المعاينة أمام مدخل العقار - التنسيق المسبق مع المالك',
      scheduledBy: b.seekerName,
      confirmedAt: '2026-10-17 11:00',
      completedAt: (b.id === 'bkg-201' || b.status === 'completed') ? '2026-10-18 17:00' : undefined,
      result: (b.id === 'bkg-201' || b.status === 'completed') ? 'satisfied' : 'pending'
    },
    currentTerms: defaultTerms,
    agreedTerms: b.agreedTerms || ((b.id === 'bkg-201' || b.status === 'completed') ? defaultTerms : undefined),
    agreedTermsApprovedAt: b.agreedTermsApprovedAt || ((b.id === 'bkg-201' || b.status === 'completed') ? '2026-10-18 18:00' : undefined),
    termsStatus: b.termsStatus || ((b.id === 'bkg-201' || b.status === 'completed') ? 'accepted' : 'pending_approval'),
    contractId: b.contractId || (b.id === 'bkg-201' ? 'cnt-301' : undefined),
    contractNumber: b.contractNumber || (b.id === 'bkg-201' ? 'CNT-2026-3001' : undefined)
  };
}

class EmbeddedLocalStore {
  private data: LocalDatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
    this.syncListingsReservationStatus();
  }

  private loadOrSeed(): LocalDatabaseSchema {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.listings)) {
          parsed.listings = parsed.listings.map(normalizeListing);
          parsed.bookings = (parsed.bookings || []).map(normalizeBooking);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Dalani Standalone Store] Error reading local store, seeding initial data:', e);
    }

    const defaultUsers = Object.values(MOCK_USERS);
    const initialData: LocalDatabaseSchema = {
      listings: INITIAL_LISTINGS.map(normalizeListing),
      organizations: INITIAL_ORGANIZATIONS,
      verifications: INITIAL_VERIFICATION_REQUESTS,
      reports: INITIAL_REPORTS,
      tickets: INITIAL_TICKETS,
      auditLogs: INITIAL_AUDIT_LOGS,
      users: defaultUsers,
      staff: [],
      rolesMatrix: {},
      activeSessions: [],
      threats: [],
      blockedIps: [],
      systemSettings: {
        platformName: 'منصة دلالي العقارية اليمنية',
        platformTagline: 'تطبيق عقاري مستقل يمني يعمل أوفلاين على الهاتف',
        maintenanceMode: false,
        defaultCurrency: 'YER',
        allowNewRegistrations: true,
        allowPublicListingPublish: true,
        sessionTimeoutMinutes: 60
      },
      featureFlags: [],
      backups: [],
      systemErrors: [],
      integrations: [],
      escalations: [],
      requests: INITIAL_PROPERTY_REQUESTS,
      bookings: INITIAL_PROPERTY_BOOKINGS.map(normalizeBooking),
      contracts: INITIAL_PROPERTY_CONTRACTS
    };

    this.save(initialData);
    return initialData;
  }

  private save(dataToSave: LocalDatabaseSchema = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('[Dalani Standalone Store] Error saving state:', e);
    }
  }

  public syncListingsReservationStatus(): void {
    const now = new Date().getTime();
    const activeMap = new Map<string, PropertyBooking>();

    for (const b of this.data.bookings) {
      if (b.status === 'active' && new Date(b.expiresAt).getTime() > now) {
        activeMap.set(b.listingId, b);
      }
    }

    for (const listing of this.data.listings) {
      if (listing.status === 'completed' || listing.dealOutcome) {
        listing.isReserved = false;
        listing.reservedUntil = undefined;
        listing.activeBookingId = undefined;
        continue;
      }

      const activeB = activeMap.get(listing.id);
      if (activeB) {
        listing.isReserved = true;
        listing.reservedUntil = activeB.expiresAt;
        listing.activeBookingId = activeB.id;
      } else {
        listing.isReserved = false;
        listing.reservedUntil = undefined;
        listing.activeBookingId = undefined;
      }
    }
  }

  // --- Collection Getters & Setters ---
  public getListings(): Listing[] {
    this.syncListingsReservationStatus();
    return [...this.data.listings];
  }

  public getListingById(id: string): Listing | undefined {
    this.syncListingsReservationStatus();
    return this.data.listings.find(l => l.id === id);
  }

  public addListing(listing: Listing): Listing {
    const normalized = normalizeListing(listing);
    this.data.listings.unshift(normalized);
    this.save();
    return normalized;
  }

  public updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const index = this.data.listings.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    const existing = this.data.listings[index];

    if ((existing.status === 'completed' || existing.dealOutcome) && updates.status && updates.status !== 'completed') {
      delete updates.status;
    }

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.data.listings[index] = normalizeListing(merged);
    this.save();
    return this.data.listings[index];
  }

  public deleteListing(id: string): boolean {
    const prev = this.data.listings.length;
    this.data.listings = this.data.listings.filter(l => l.id !== id);
    if (this.data.listings.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }

  public getUsers(): User[] {
    return [...this.data.users];
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  public getRequests(): PropertyRequest[] {
    return [...this.data.requests];
  }

  public getRequestById(id: string): PropertyRequest | undefined {
    return this.data.requests.find(r => r.id === id);
  }

  public addRequest(req: PropertyRequest): PropertyRequest {
    this.data.requests.unshift(req);
    this.save();
    return req;
  }

  public updateRequest(id: string, updates: Partial<PropertyRequest>): PropertyRequest | undefined {
    const index = this.data.requests.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.data.requests[index] = { ...this.data.requests[index], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
    this.save();
    return this.data.requests[index];
  }

  public getBookings(): PropertyBooking[] {
    this.syncListingsReservationStatus();
    return [...this.data.bookings];
  }

  public getBookingById(id: string): PropertyBooking | undefined {
    this.syncListingsReservationStatus();
    return this.data.bookings.find(b => b.id === id);
  }

  public getActiveBookingForListing(listingId: string): PropertyBooking | undefined {
    this.syncListingsReservationStatus();
    const now = new Date().getTime();
    return this.data.bookings.find(
      b => b.listingId === listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > now
    );
  }

  public addBooking(bkg: PropertyBooking): PropertyBooking {
    this.data.bookings.unshift(bkg);
    this.syncListingsReservationStatus();
    this.save();
    return bkg;
  }

  public updateBooking(id: string, updates: Partial<PropertyBooking>): PropertyBooking | undefined {
    const index = this.data.bookings.findIndex(b => b.id === id);
    if (index === -1) return undefined;
    this.data.bookings[index] = { ...this.data.bookings[index], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
    this.syncListingsReservationStatus();
    this.save();
    return this.data.bookings[index];
  }

  public getContracts(): PropertyContract[] {
    return [...this.data.contracts];
  }

  public getContractById(id: string): PropertyContract | undefined {
    return this.data.contracts.find(c => c.id === id);
  }

  public getContractByBookingId(bookingId: string): PropertyContract | undefined {
    return this.data.contracts.find(c => c.bookingId === bookingId);
  }

  public addContract(cnt: PropertyContract): PropertyContract {
    this.data.contracts.unshift(cnt);
    this.save();
    return cnt;
  }

  public updateContract(id: string, updates: Partial<PropertyContract>): PropertyContract | undefined {
    const index = this.data.contracts.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    this.data.contracts[index] = { ...this.data.contracts[index], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
    this.save();
    return this.data.contracts[index];
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.data.auditLogs];
  }

  public addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 300) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 300);
    }
    this.save();
    return entry;
  }

  public getOrganizations(): Organization[] {
    return [...this.data.organizations];
  }

  public getVerifications(): VerificationRequest[] {
    return [...this.data.verifications];
  }

  public addVerification(v: VerificationRequest): VerificationRequest {
    this.data.verifications.unshift(v);
    this.save();
    return v;
  }

  public getReports(): ReportCase[] {
    return [...this.data.reports];
  }

  public addReport(r: ReportCase): ReportCase {
    this.data.reports.unshift(r);
    this.save();
    return r;
  }

  public getTickets(): SupportTicket[] {
    return [...this.data.tickets];
  }

  public addTicket(t: SupportTicket): SupportTicket {
    this.data.tickets.unshift(t);
    this.save();
    return t;
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const index = this.data.tickets.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    this.data.tickets[index] = { ...this.data.tickets[index], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
    this.save();
    return this.data.tickets[index];
  }
}

export const embeddedStore = new EmbeddedLocalStore();
