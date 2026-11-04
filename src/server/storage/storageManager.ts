import fs from 'fs';
import path from 'path';
import { db as pgDb, schema, checkPostgresConnection } from '../../db';
import { eq } from 'drizzle-orm';
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
  PropertyContract
} from '../../types';
import {
  INITIAL_LISTINGS,
  INITIAL_ORGANIZATIONS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_REPORTS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  MOCK_USERS
} from '../../data/yemenData';

export interface DatabaseSchema {
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
  meta: {
    lastUpdated: string;
    version: string;
  };
}

const DB_STORE_DIR = path.resolve(process.cwd(), 'node_modules', '.dalani_cache');
const DB_FILE_PATH = path.resolve(DB_STORE_DIR, 'dalani_database.json');
const PERSISTENT_BACKUP_DIR = path.resolve(process.cwd(), '_dalani_store_');
const PERSISTENT_BACKUP_FILE = path.resolve(PERSISTENT_BACKUP_DIR, 'dalani_database.json');
const BACKUPS_DIR = path.resolve(PERSISTENT_BACKUP_DIR, 'backups');

export class StorageManager {
  private static instance: StorageManager;
  public data: DatabaseSchema;
  private persistTimeout: any = null;
  private backupSyncTimeout: any = null;

  private constructor() {
    this.data = this.loadOrSeed();
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_STORE_DIR)) {
        fs.mkdirSync(DB_STORE_DIR, { recursive: true });
      }
      if (!fs.existsSync(PERSISTENT_BACKUP_DIR)) {
        fs.mkdirSync(PERSISTENT_BACKUP_DIR, { recursive: true });
      }

      let fileToRead = '';
      if (fs.existsSync(DB_FILE_PATH)) {
        fileToRead = DB_FILE_PATH;
      } else if (fs.existsSync(PERSISTENT_BACKUP_FILE)) {
        fileToRead = PERSISTENT_BACKUP_FILE;
      }

      if (fileToRead) {
        const fileContent = fs.readFileSync(fileToRead, 'utf-8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          if (parsed && Array.isArray(parsed.listings)) {
            const defaultUsers = Object.values(MOCK_USERS);
            if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
              parsed.users = defaultUsers;
            } else {
              for (const defU of defaultUsers) {
                const idx = parsed.users.findIndex((u: any) => u.id === defU.id || (u.email && defU.email && u.email.toLowerCase() === defU.email.toLowerCase()));
                if (idx === -1) {
                  parsed.users.push(defU);
                } else {
                  parsed.users[idx] = { ...defU, ...parsed.users[idx], supabaseUserId: defU.supabaseUserId || parsed.users[idx].supabaseUserId };
                }
              }
            }

            if (!Array.isArray(parsed.organizations)) parsed.organizations = INITIAL_ORGANIZATIONS;
            if (!Array.isArray(parsed.verifications)) parsed.verifications = INITIAL_VERIFICATION_REQUESTS;
            if (!Array.isArray(parsed.reports)) parsed.reports = INITIAL_REPORTS;
            if (!Array.isArray(parsed.tickets)) parsed.tickets = INITIAL_TICKETS;
            if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = INITIAL_AUDIT_LOGS;
            if (!Array.isArray(parsed.requests)) parsed.requests = [];
            if (!Array.isArray(parsed.bookings)) parsed.bookings = [];
            if (!Array.isArray(parsed.contracts)) parsed.contracts = [];

            this.data = parsed;
            this.persist(parsed, true);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[Dalani StorageManager] Failed to read existing db file, using seed data:', err);
    }

    const defaultUsers = Object.values(MOCK_USERS);
    const initialData: DatabaseSchema = {
      listings: INITIAL_LISTINGS,
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
      systemSettings: {} as any,
      featureFlags: [],
      backups: [],
      systemErrors: [],
      integrations: [],
      escalations: [],
      requests: [],
      bookings: [],
      contracts: [],
      meta: {
        lastUpdated: new Date().toISOString(),
        version: '2026.10-modular'
      }
    };

    this.persist(initialData, true);
    return initialData;
  }

  public persist(dataToSave: DatabaseSchema = this.data, immediate: boolean = false) {
    try {
      if (!dataToSave) {
        if (this.data) {
          dataToSave = this.data;
        } else {
          return;
        }
      }
      if (this.data !== dataToSave) {
        this.data = dataToSave;
      }
      if (dataToSave && dataToSave.meta) {
        dataToSave.meta.lastUpdated = new Date().toISOString();
      }

      const doWrite = () => {
        try {
          if (!this.data) return;
          const serialized = JSON.stringify(this.data, null, 2);
          if (!serialized) return;
          if (!fs.existsSync(DB_STORE_DIR)) {
            fs.mkdirSync(DB_STORE_DIR, { recursive: true });
          }
          fs.writeFileSync(DB_FILE_PATH, serialized, 'utf-8');
        } catch (err) {
          console.error('[Dalani StorageManager] Error persisting to disk:', err);
        }
      };

      if (immediate) {
        if (this.persistTimeout) {
          clearTimeout(this.persistTimeout);
          this.persistTimeout = null;
        }
        doWrite();
      } else {
        if (this.persistTimeout) {
          clearTimeout(this.persistTimeout);
        }
        this.persistTimeout = setTimeout(doWrite, 400);
      }

      if (!this.backupSyncTimeout) {
        this.backupSyncTimeout = setTimeout(() => {
          this.flushToBackupSync();
          this.backupSyncTimeout = null;
        }, 120000);
      }
    } catch (err) {
      console.error('[Dalani StorageManager] Error scheduling persist:', err);
    }
  }

  public flushToBackupSync() {
    try {
      if (!this.data) return;
      if (!fs.existsSync(PERSISTENT_BACKUP_DIR)) {
        fs.mkdirSync(PERSISTENT_BACKUP_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(PERSISTENT_BACKUP_FILE, serialized, 'utf-8');
    } catch (err) {
      console.error('[Dalani StorageManager] Error flushing backup to disk:', err);
    }
  }

  // --- PostgreSQL Helpers ---
  public syncPgUser(user: User) {
    if (!pgDb) return;
    pgDb.insert(schema.usersTable).values({
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email || null,
      phone: user.phone || null,
      phoneVerified: user.phoneVerified ?? true,
      avatarUrl: user.avatarUrl || null,
      orgId: user.orgId || null,
      orgName: user.orgName || null,
      activeStatus: user.activeStatus ?? true,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.usersTable.id,
      set: {
        name: user.name,
        role: user.role,
        email: user.email || null,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        orgId: user.orgId || null,
        orgName: user.orgName || null,
        activeStatus: user.activeStatus ?? true,
        updatedAt: new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] User sync error:', err?.message || err));
  }

  public syncPgListing(listing: Listing) {
    if (!pgDb) return;
    pgDb.insert(schema.listingsTable).values({
      id: listing.id,
      listingNumber: listing.listingNumber,
      title: listing.title,
      description: listing.description || '',
      propertyType: listing.propertyType,
      purpose: listing.purpose,
      status: listing.status,
      price: listing.price || 0,
      currency: listing.currency || 'YER',
      isNegotiable: Boolean(listing.isNegotiable),
      area: listing.area || 0,
      areaUnit: listing.areaUnit || 'م²',
      isReserved: Boolean(listing.isReserved),
      viewsCount: listing.viewsCount || 0,
      favoritesCount: listing.favoritesCount || 0,
      location: listing.location || null,
      attributes: listing.attributes || null,
      advertiser: listing.advertiser || null,
      verificationBadges: listing.verificationBadges || [],
      statusTimeline: listing.statusTimeline || [],
      createdAt: listing.createdAt || new Date().toISOString(),
      updatedAt: listing.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.listingsTable.id,
      set: {
        title: listing.title,
        description: listing.description || '',
        status: listing.status,
        price: listing.price || 0,
        currency: listing.currency || 'YER',
        isNegotiable: Boolean(listing.isNegotiable),
        area: listing.area || 0,
        isReserved: Boolean(listing.isReserved),
        viewsCount: listing.viewsCount || 0,
        favoritesCount: listing.favoritesCount || 0,
        location: listing.location || null,
        attributes: listing.attributes || null,
        verificationBadges: listing.verificationBadges || [],
        statusTimeline: listing.statusTimeline || [],
        updatedAt: listing.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Listing sync error:', err?.message || err));
  }

  public deletePgListing(id: string) {
    if (!pgDb) return;
    pgDb.delete(schema.listingsTable).where(eq(schema.listingsTable.id, id)).catch(err => console.error('[PostgreSQL Sync] Delete listing error:', err?.message || err));
  }

  public syncPgRequest(req: PropertyRequest) {
    if (!pgDb) return;
    pgDb.insert(schema.propertyRequestsTable).values({
      id: req.id,
      requestNumber: req.requestNumber,
      listingId: req.listingId,
      listingTitle: req.listingTitle || null,
      listingNumber: req.listingNumber || null,
      listingPrice: req.listingPrice || null,
      listingCurrency: req.listingCurrency || null,
      listingImage: req.listingImage || null,
      listingGovernorate: req.listingGovernorate || null,
      seekerId: req.seekerId,
      seekerName: req.seekerName || null,
      seekerPhone: req.seekerPhone || null,
      advertiserId: req.advertiserId,
      advertiserName: req.advertiserName || null,
      advertiserPhone: req.advertiserPhone || null,
      requestType: req.requestType,
      status: req.status,
      notes: req.notes || null,
      offeredPrice: req.offeredPrice || null,
      preferredDate: req.preferredDate || null,
      requestedDurationHours: req.requestedDurationHours || 48,
      bookingId: req.bookingId || null,
      paymentMethod: req.paymentMethod || null,
      rentalUsageType: req.rentalUsageType || null,
      leaseDurationMonths: req.leaseDurationMonths || null,
      paymentFrequency: req.paymentFrequency || null,
      createdAt: req.createdAt || new Date().toISOString(),
      updatedAt: req.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.propertyRequestsTable.id,
      set: {
        status: req.status,
        bookingId: req.bookingId || null,
        notes: req.notes || null,
        updatedAt: req.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Request sync error:', err?.message || err));
  }

  public syncPgBooking(bkg: PropertyBooking) {
    if (!pgDb) return;
    pgDb.insert(schema.propertyBookingsTable).values({
      id: bkg.id,
      bookingNumber: bkg.bookingNumber,
      requestId: bkg.requestId,
      listingId: bkg.listingId,
      listingTitle: bkg.listingTitle || null,
      listingNumber: bkg.listingNumber || null,
      listingImage: bkg.listingImage || null,
      listingGovernorate: bkg.listingGovernorate || null,
      listingPrice: bkg.listingPrice || null,
      listingCurrency: bkg.listingCurrency || null,
      seekerId: bkg.seekerId,
      seekerName: bkg.seekerName || null,
      seekerPhone: bkg.seekerPhone || null,
      advertiserId: bkg.advertiserId,
      advertiserName: bkg.advertiserName || null,
      advertiserPhone: bkg.advertiserPhone || null,
      status: bkg.status,
      durationHours: bkg.durationHours || 48,
      startDate: bkg.startDate || null,
      expiresAt: bkg.expiresAt || null,
      confirmedBy: bkg.confirmedBy || null,
      dealStage: bkg.dealStage || null,
      contractId: bkg.contractId || null,
      contractNumber: bkg.contractNumber || null,
      notes: bkg.notes || null,
      paymentMethod: bkg.paymentMethod || null,
      rentalUsageType: bkg.rentalUsageType || null,
      inspectionVisit: bkg.inspectionVisit || null,
      currentTerms: bkg.currentTerms || null,
      agreedTerms: bkg.agreedTerms || null,
      messages: bkg.messages || [],
      createdAt: bkg.createdAt || new Date().toISOString(),
      updatedAt: bkg.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.propertyBookingsTable.id,
      set: {
        status: bkg.status,
        dealStage: bkg.dealStage || null,
        contractId: bkg.contractId || null,
        contractNumber: bkg.contractNumber || null,
        updatedAt: bkg.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Booking sync error:', err?.message || err));
  }

  public syncPgContract(cnt: PropertyContract) {
    if (!pgDb) return;
    pgDb.insert(schema.propertyContractsTable).values({
      id: cnt.id,
      contractNumber: cnt.contractNumber,
      bookingId: cnt.bookingId,
      bookingNumber: cnt.bookingNumber || null,
      listingId: cnt.listingId,
      listingNumber: cnt.listingNumber || null,
      listingTitle: cnt.listingTitle || null,
      contractType: cnt.contractType,
      status: cnt.status,
      currentVersion: cnt.currentVersion || 1,
      firstParty: cnt.firstParty || null,
      secondParty: cnt.secondParty || null,
      propertySnapshot: cnt.propertySnapshot || null,
      financialTerms: cnt.financialTerms || null,
      clauses: cnt.clauses || [],
      versionHistory: cnt.versionHistory || [],
      createdAt: cnt.createdAt || new Date().toISOString(),
      updatedAt: cnt.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.propertyContractsTable.id,
      set: {
        status: cnt.status,
        currentVersion: cnt.currentVersion || 1,
        firstParty: cnt.firstParty || null,
        secondParty: cnt.secondParty || null,
        financialTerms: cnt.financialTerms || null,
        clauses: cnt.clauses || [],
        versionHistory: cnt.versionHistory || [],
        updatedAt: cnt.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Contract sync error:', err?.message || err));
  }

  public syncPgAuditLog(entry: AuditLogEntry) {
    if (!pgDb) return;
    pgDb.insert(schema.auditLogsTable).values({
      id: entry.id,
      userId: entry.userId,
      userName: entry.userName || null,
      userRole: entry.userRole || null,
      action: entry.action,
      category: entry.targetType || null,
      targetId: entry.targetId || null,
      status: entry.result || null,
      details: entry.details || null,
      ipAddress: entry.ipAddress || null,
      createdAt: entry.timestamp || new Date().toISOString()
    }).catch(err => console.error('[PostgreSQL Sync] Audit log sync error:', err?.message || err));
  }
}

export const storageManager = StorageManager.getInstance();
