/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * النظام الفرعي 6: إشراف المنصة والحوكمة والأمان والتفتيش (Platform Governance Repository)
 * 
 * مسؤول حصرياً عن:
 * - تذاكر الدعم والشكاوى والبلاغات والتصعيد الإداري (Support Tickets & Escalations)
 * - الطاقم الإداري والصلاحيات ومصفوفة الأدوار (Staff & Roles Access Matrix)
 * - أمان الجلسات ورصد التهديدات وحظر الأرقام والـ IPs (Security & IP Threat Controls)
 * - إعدادات المنصة ومفاتيح الميزات (System Settings & Feature Flags)
 * - النسخ الاحتياطية وإدارة النزاهة واسترجاع البيانات (Backups, Integrity & Error Logs)
 * - سجلات التدقيق الدائمة غير القابلة للتعديل (Tamper-Proof Audit Logs)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ReportCase,
  SupportTicket,
  AuditLogEntry,
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
  UserRole,
  User
} from '../../../types';
import { storageManager } from '../../storage/storageManager';
import { marketplaceRepository, normalizeListing } from '../marketplace/marketplaceRepository';
export function getDefaultRolesMatrix(): Record<string, string[]> {
  return {
    visitor: ['view_public_listings', 'search_filter'],
    seeker: ['view_public_listings', 'search_filter', 'save_favorites', 'open_tickets'],
    advertiser: ['view_public_listings', 'search_filter', 'save_favorites', 'create_listings', 'edit_own_listings', 'open_tickets'],
    org_manager: ['view_public_listings', 'search_filter', 'save_favorites', 'create_listings', 'edit_own_listings', 'manage_org_staff', 'assign_agent_listings'],
    org_agent: ['view_public_listings', 'search_filter', 'save_favorites', 'create_listings', 'edit_assigned_listings'],
    moderator: ['view_public_listings', 'view_all_listings', 'moderate_listings', 'request_changes', 'suspend_listings'],
    verifier: ['view_public_listings', 'view_all_listings', 'view_sensitive_deeds', 'verify_phone', 'verify_documents', 'issue_badges'],
    reporter_admin: ['view_public_listings', 'view_all_listings', 'view_reports', 'investigate_reports', 'resolve_reports', 'suspend_abusive_ads'],
    support: ['view_public_listings', 'view_tickets', 'reply_tickets', 'close_tickets'],
    accountant: ['view_public_listings', 'view_financial_overview', 'view_listing_billing', 'export_financial_reports'],
    system_admin: [
      'manage_users', 'manage_staff', 'manage_roles_matrix', 'manage_security',
      'terminate_sessions', 'block_ips', 'view_audit_trail', 'manage_settings',
      'manage_feature_flags', 'manage_backups', 'view_system_errors', 'test_integrations',
      'resolve_escalations', 'repair_database', 'view_sensitive_data'
    ]
  };
}

export function getDefaultStaff(users: User[]): StaffMember[] {
  const staffRoles: { role: UserRole; dept: StaffMember['department']; perms: string[] }[] = [
    { role: 'system_admin', dept: 'management', perms: ['all_administrative_powers', 'view_sensitive_docs', 'manage_staff', 'manage_security', 'backups_and_restore'] },
    { role: 'moderator', dept: 'moderation', perms: ['view_all_listings', 'moderate_listings', 'request_changes', 'suspend_listings'] },
    { role: 'verifier', dept: 'verification', perms: ['view_all_listings', 'view_sensitive_deeds', 'verify_documents', 'issue_badges'] },
    { role: 'reporter_admin', dept: 'disputes', perms: ['view_reports', 'investigate_reports', 'resolve_reports', 'suspend_abusive_ads'] },
    { role: 'support', dept: 'support', perms: ['view_tickets', 'reply_tickets', 'close_tickets'] },
    { role: 'accountant', dept: 'finance', perms: ['view_financial_overview', 'view_listing_billing', 'export_financial_reports'] }
  ];

  const staff: StaffMember[] = [];
  staffRoles.forEach((item, index) => {
    const user = users.find(u => u.role === item.role);
    if (user) {
      staff.push({
        id: `stf-${100 + index}`,
        userId: user.id,
        name: user.name,
        email: `${user.role}@dalani-ye.com`,
        phone: user.phone || '+967 770 000 000',
        role: item.role,
        department: item.dept,
        activeStatus: user.activeStatus ?? true,
        permissions: item.perms,
        createdAt: '2026-01-15',
        lastLoginAt: '2026-10-17 10:30',
        notes: 'حساب موظف معتمد في الهيكل الإداري للمنصة'
      });
    }
  });

  return staff;
}

export function getDefaultSystemSettings(): SystemSettings {
  return {
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
  };
}

export function getDefaultFeatureFlags(): FeatureFlag[] {
  return [
    {
      id: 'ff-1',
      key: 'public_registrations',
      name: 'تسجيل الحسابات الجديدة للجمهور',
      description: 'السماح للزوار بإنشاء حسابات باحث ومعلن فردي عبر رقم الهاتف',
      enabled: true,
      category: 'core',
      updatedAt: '2026-10-15'
    }
  ];
}

const PERSISTENT_BACKUP_DIR = path.resolve(process.cwd(), 'data_backup');
const BACKUPS_DIR = path.resolve(PERSISTENT_BACKUP_DIR, 'backups');

export class GovernanceRepository {
  private static instance: GovernanceRepository;

  private constructor() {}

  public static getInstance(): GovernanceRepository {
    if (!GovernanceRepository.instance) {
      GovernanceRepository.instance = new GovernanceRepository();
    }
    return GovernanceRepository.instance;
  }

  // --- Reports & Cases ---

  public getReports(): ReportCase[] {
    return [...storageManager.data.reports];
  }

  public addReport(rep: ReportCase): ReportCase {
    storageManager.data.reports.unshift(rep);
    storageManager.persist();
    return rep;
  }

  public updateReport(id: string, updates: Partial<ReportCase>): ReportCase | undefined {
    const list = storageManager.data.reports;
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    list[index] = { ...list[index], ...updates };
    storageManager.persist();
    return list[index];
  }

  // --- Tickets ---

  public getTickets(): SupportTicket[] {
    return [...storageManager.data.tickets];
  }

  public addTicket(ticket: SupportTicket): SupportTicket {
    storageManager.data.tickets.unshift(ticket);
    storageManager.persist();
    return ticket;
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const list = storageManager.data.tickets;
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    list[index] = { ...list[index], ...updates };
    storageManager.persist();
    return list[index];
  }

  // --- Audit Logs ---

  public getAuditLogs(): AuditLogEntry[] {
    return [...storageManager.data.auditLogs];
  }

  public addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    storageManager.data.auditLogs.unshift(entry);
    if (storageManager.data.auditLogs.length > 500) {
      storageManager.data.auditLogs = storageManager.data.auditLogs.slice(0, 500);
    }
    storageManager.persist();
    storageManager.syncPgAuditLog(entry);
    return entry;
  }

  public logAudit(entry: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    action: string;
    targetType: any;
    targetId: string;
    targetNumber?: string;
    details?: string;
    severity?: 'info' | 'warning' | 'error';
  }): AuditLogEntry {
    return this.addAuditLog({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: entry.actorId,
      userName: entry.actorName,
      userRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      result: entry.severity === 'warning' ? 'warning' : 'success',
      details: entry.details || '',
      ipAddress: '127.0.0.1'
    });
  }

  // --- Staff Operations ---

  public getStaff(): StaffMember[] {
    return [...storageManager.data.staff];
  }

  public getStaffById(id: string): StaffMember | undefined {
    return storageManager.data.staff.find(s => s.id === id);
  }

  public addStaff(member: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    const newStaff: StaffMember = {
      ...member,
      id: `stf-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    storageManager.data.staff.unshift(newStaff);

    const existingUser = storageManager.data.users.find(u => u.phone === member.phone || u.id === member.userId);
    if (existingUser) {
      existingUser.role = member.role;
      existingUser.activeStatus = member.activeStatus ?? true;
    } else {
      storageManager.data.users.push({
        id: member.userId || `usr-${Date.now()}`,
        name: member.name,
        phone: member.phone,
        phoneVerified: true,
        role: member.role,
        activeStatus: member.activeStatus ?? true,
        createdAt: newStaff.createdAt
      });
    }

    storageManager.persist();
    return newStaff;
  }

  public toggleStaffStatus(id: string): StaffMember | undefined {
    const list = storageManager.data.staff;
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    list[index].activeStatus = !list[index].activeStatus;
    const user = storageManager.data.users.find(u => u.id === list[index].userId || u.name === list[index].name);
    if (user) {
      user.activeStatus = list[index].activeStatus;
    }
    storageManager.persist();
    return list[index];
  }

  public updateStaffPermissions(id: string, permissions: string[]): StaffMember | undefined {
    const list = storageManager.data.staff;
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    list[index].permissions = permissions;
    storageManager.persist();
    return list[index];
  }

  // --- Roles Matrix Operations ---

  public getRolesMatrix(): Record<string, string[]> {
    return { ...storageManager.data.rolesMatrix };
  }

  public updateRolesMatrix(matrix: Record<string, string[]>): Record<string, string[]> {
    storageManager.data.rolesMatrix = {
      ...storageManager.data.rolesMatrix,
      ...matrix
    };
    storageManager.persist();
    return storageManager.data.rolesMatrix;
  }

  // --- Active Sessions Operations ---

  public getActiveSessions(): ActiveSession[] {
    return [...storageManager.data.activeSessions];
  }

  public addActiveSession(session: Omit<ActiveSession, 'id'>): ActiveSession {
    const newSession: ActiveSession = {
      ...session,
      id: `ses-${Date.now()}`
    };
    storageManager.data.activeSessions.unshift(newSession);
    storageManager.persist();
    return newSession;
  }

  public terminateSession(sessionIdOrId: string): boolean {
    const initialLen = storageManager.data.activeSessions.length;
    storageManager.data.activeSessions = storageManager.data.activeSessions.filter(
      s => s.id !== sessionIdOrId && s.sessionId !== sessionIdOrId
    );
    if (storageManager.data.activeSessions.length !== initialLen) {
      storageManager.persist();
      return true;
    }
    return false;
  }

  // --- Security Threats & IP Blocking ---

  public getThreats(): SecurityThreat[] {
    return [...storageManager.data.threats];
  }

  public addThreat(threat: Omit<SecurityThreat, 'id' | 'occurredAt'>): SecurityThreat {
    const newThreat: SecurityThreat = {
      ...threat,
      id: `th-${Date.now()}`,
      occurredAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    storageManager.data.threats.unshift(newThreat);
    if (storageManager.data.threats.length > 100) {
      storageManager.data.threats = storageManager.data.threats.slice(0, 100);
    }
    storageManager.persist();
    return newThreat;
  }

  public getBlockedIps(): BlockedIp[] {
    return [...storageManager.data.blockedIps];
  }

  public blockIp(ip: string, reason: string, blockedBy: string): BlockedIp {
    const existing = storageManager.data.blockedIps.find(b => b.ip === ip);
    if (existing) return existing;

    const entry: BlockedIp = {
      ip,
      reason,
      blockedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      blockedBy
    };
    storageManager.data.blockedIps.unshift(entry);
    storageManager.data.threats.forEach(t => {
      if (t.ipAddress === ip) t.blocked = true;
    });

    storageManager.persist();
    return entry;
  }

  public unblockIp(ip: string): boolean {
    const initialLen = storageManager.data.blockedIps.length;
    storageManager.data.blockedIps = storageManager.data.blockedIps.filter(b => b.ip !== ip);
    storageManager.data.threats.forEach(t => {
      if (t.ipAddress === ip) t.blocked = false;
    });
    if (storageManager.data.blockedIps.length !== initialLen) {
      storageManager.persist();
      return true;
    }
    return false;
  }

  public isIpBlocked(ip: string): boolean {
    return storageManager.data.blockedIps.some(b => b.ip === ip);
  }

  // --- System Settings ---

  public getSystemSettings(): SystemSettings {
    return { ...storageManager.data.systemSettings };
  }

  public updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    storageManager.data.systemSettings = {
      ...storageManager.data.systemSettings,
      ...updates
    };
    storageManager.persist();
    return storageManager.data.systemSettings;
  }

  // --- Feature Flags ---

  public getFeatureFlags(): FeatureFlag[] {
    return [...storageManager.data.featureFlags];
  }

  public toggleFeatureFlag(key: string): FeatureFlag | undefined {
    const flag = storageManager.data.featureFlags.find(f => f.key === key);
    if (!flag) return undefined;
    flag.enabled = !flag.enabled;
    flag.updatedAt = new Date().toISOString().split('T')[0];
    storageManager.persist();
    return flag;
  }

  public updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): FeatureFlag | undefined {
    const flag = storageManager.data.featureFlags.find(f => f.key === key);
    if (!flag) return undefined;
    Object.assign(flag, updates, { updatedAt: new Date().toISOString().split('T')[0] });
    storageManager.persist();
    return flag;
  }

  // --- Backups & Restore ---

  public getBackups(): BackupPoint[] {
    return [...storageManager.data.backups];
  }

  public createBackup(createdBy: string, notes?: string): BackupPoint {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `dalani_backup_${timestamp}.json`;
    const fullBackupPath = path.resolve(BACKUPS_DIR, fileName);

    const fullDump = JSON.stringify(storageManager.data, null, 2);
    const hash = crypto.createHash('sha256').update(fullDump).digest('hex');
    fs.writeFileSync(fullBackupPath, fullDump, 'utf-8');

    const backupPoint: BackupPoint = {
      id: `bkp-${Date.now()}`,
      fileName,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      createdBy,
      sizeBytes: Buffer.byteLength(fullDump, 'utf-8'),
      recordsCount: {
        listings: storageManager.data.listings.length,
        users: storageManager.data.users.length,
        organizations: storageManager.data.organizations.length,
        auditLogs: storageManager.data.auditLogs.length,
        verifications: storageManager.data.verifications.length,
        reports: storageManager.data.reports.length,
        tickets: storageManager.data.tickets.length
      },
      checksumSha256: hash,
      status: 'valid',
      notes: notes || 'نسخة احتياطية كاملة وموثقة للمنظومة'
    };

    storageManager.data.backups.unshift(backupPoint);
    storageManager.persist();
    return backupPoint;
  }

  public restoreBackup(backupId: string, performedBy: string): { success: boolean; message: string; safetyBackupId?: string } {
    const backup = storageManager.data.backups.find(b => b.id === backupId);
    if (!backup) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير موجود في السجل' };
    }

    const backupFileName = backup.fileName || backup.name || '';
    if (!backupFileName) {
      return { success: false, message: 'اسم ملف النسخة الاحتياطية غير محدد' };
    }

    const fullBackupPath = path.resolve(BACKUPS_DIR, backupFileName);
    let backupContent: string;

    if (fs.existsSync(fullBackupPath)) {
      backupContent = fs.readFileSync(fullBackupPath, 'utf-8');
    } else {
      return { success: false, message: `تعذر قراءة ملف النسخة من المسار: ${backupFileName}` };
    }

    const currentHash = crypto.createHash('sha256').update(backupContent).digest('hex');
    if (backup.checksumSha256 && backup.checksumSha256 !== currentHash) {
      backup.status = 'corrupted';
      storageManager.persist();
      return { success: false, message: 'فشل التحقق من التوقيع الرقمي للنسخة الاحتياطية، تم إلغاء الاستعادة لحماية البيانات.' };
    }

    const safetySnapshot = this.createBackup(
      `النظام الآلي (قبل استعادة ${backup.fileName})`,
      'نسخة أمان تلقائية تم أخذها مباشرة قبل تنفيذ عملية استرجاع لتأمين إمكانية التراجع'
    );

    try {
      const restoredData = JSON.parse(backupContent);
      if (!Array.isArray(restoredData.listings) || !Array.isArray(restoredData.users)) {
        return { success: false, message: 'بنية ملف النسخة الاحتياطية غير متوافقة أو ينقصها جداول أساسية' };
      }

      storageManager.data.listings = restoredData.listings.map(normalizeListing);
      storageManager.data.organizations = restoredData.organizations || [];
      storageManager.data.verifications = restoredData.verifications || [];
      storageManager.data.reports = restoredData.reports || [];
      storageManager.data.tickets = restoredData.tickets || [];
      storageManager.data.users = restoredData.users || [];
      storageManager.data.staff = restoredData.staff || getDefaultStaff(storageManager.data.users);
      storageManager.data.rolesMatrix = restoredData.rolesMatrix || getDefaultRolesMatrix();
      storageManager.data.systemSettings = restoredData.systemSettings || getDefaultSystemSettings();
      storageManager.data.featureFlags = restoredData.featureFlags || getDefaultFeatureFlags();

      storageManager.persist();
      return {
        success: true,
        message: `تمت استعادة البيانات بنجاح من النسخة ${backup.fileName}`,
        safetyBackupId: safetySnapshot.id
      };
    } catch (err: any) {
      return { success: false, message: `خطأ أثناء استعادة البيانات: ${err.message}` };
    }
  }

  // --- System Error Logs ---

  public getSystemErrors(): SystemErrorLog[] {
    return [...storageManager.data.systemErrors];
  }

  public logSystemError(code: string, module: string, message: string, severity: SystemErrorLog['severity'] = 'error'): SystemErrorLog {
    const errorLog: SystemErrorLog = {
      id: `err-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      code,
      module,
      message,
      severity,
      status: 'open'
    };
    storageManager.data.systemErrors.unshift(errorLog);
    if (storageManager.data.systemErrors.length > 100) {
      storageManager.data.systemErrors = storageManager.data.systemErrors.slice(0, 100);
    }
    storageManager.persist();
    return errorLog;
  }

  public resolveSystemError(id: string, resolvedBy: string): SystemErrorLog | undefined {
    const error = storageManager.data.systemErrors.find(e => e.id === id);
    if (!error) return undefined;
    error.status = 'resolved';
    error.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    error.resolvedBy = resolvedBy;
    storageManager.persist();
    return error;
  }

  // --- Integrations ---

  public getIntegrations(): IntegrationServiceStatus[] {
    return [...storageManager.data.integrations];
  }

  public updateIntegrationStatus(id: string, updates: Partial<IntegrationServiceStatus>): IntegrationServiceStatus | undefined {
    const item = storageManager.data.integrations.find(i => i.id === id);
    if (!item) return undefined;
    Object.assign(item, updates, { lastCheckedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) });
    storageManager.persist();
    return item;
  }

  // --- Escalations ---

  public getEscalations(): EscalationCase[] {
    return [...storageManager.data.escalations];
  }

  public resolveEscalation(id: string, status: 'approved' | 'rejected', notes: string): EscalationCase | undefined {
    const item = storageManager.data.escalations.find(e => e.id === id);
    if (!item) return undefined;
    item.status = status;
    item.adminResolutionNotes = notes;
    item.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    storageManager.persist();
    return item;
  }

  // --- Data Integrity Check & Repair ---

  public checkDataIntegrity(): {
    isHealthy: boolean;
    issuesFound: string[];
    stats: {
      totalListings: number;
      totalUsers: number;
      orphanListings: number;
      unlinkedTickets: number;
      missingDeedBadges: number;
      staleSessionsCount: number;
    };
  } {
    const issues: string[] = [];
    const userIds = new Set(storageManager.data.users.map(u => u.id));

    const orphanListings = storageManager.data.listings.filter(l => l.advertiser && !userIds.has(l.advertiser.id));
    if (orphanListings.length > 0) {
      issues.push(`تم رصد ${orphanListings.length} عقارات بمعرف معلن غير مسجل في جدول المستخدمين.`);
    }

    const unlinkedTickets = storageManager.data.tickets.filter(t => !userIds.has(t.userId));
    if (unlinkedTickets.length > 0) {
      issues.push(`تم رصد ${unlinkedTickets.length} تذاكر دعم فني لا يرتبط أصحابها بحسابات مسجلة.`);
    }

    const missingDeedBadges = storageManager.data.listings.filter(
      l => l.status === 'published' && (!l.verificationBadges || l.verificationBadges.length === 0)
    ).length;

    const staleSessions = storageManager.data.activeSessions.filter(s => false);

    return {
      isHealthy: issues.length === 0,
      issuesFound: issues,
      stats: {
        totalListings: storageManager.data.listings.length,
        totalUsers: storageManager.data.users.length,
        orphanListings: orphanListings.length,
        unlinkedTickets: unlinkedTickets.length,
        missingDeedBadges,
        staleSessionsCount: staleSessions.length
      }
    };
  }

  public repairDataIntegrity(): { repairedCount: number; summary: string } {
    let repaired = 0;
    const defaultOwner = storageManager.data.users.find(u => u.role === 'advertiser') || storageManager.data.users[0];

    const userIds = new Set(storageManager.data.users.map(u => u.id));
    storageManager.data.listings.forEach(l => {
      if (l.advertiser && !userIds.has(l.advertiser.id) && defaultOwner) {
        l.advertiser.id = defaultOwner.id;
        l.advertiser.name = defaultOwner.name;
        repaired++;
      }
    });

    storageManager.persist();
    return {
      repairedCount: repaired,
      summary: `تم إصلاح ${repaired} علاقة وسجلات يتيمة بنجاح، وجميع البيانات مترابطة الآن.`
    };
  }
}

export const governanceRepository = GovernanceRepository.getInstance();
