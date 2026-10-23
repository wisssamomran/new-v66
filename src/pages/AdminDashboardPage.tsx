import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, StaffMember, ActiveSession, SecurityThreat, BackupPoint, SystemErrorLog, FeatureFlag } from '../types';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import {
  Settings,
  Shield,
  Users,
  Database,
  History,
  CheckCircle,
  AlertTriangle,
  Search,
  Lock,
  RotateCcw,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Activity,
  Server,
  Zap,
  Globe,
  RefreshCw,
  FileText,
  Key,
  Download,
  Upload,
  AlertOctagon,
  Eye,
  Sliders,
  Bell,
  Check,
  X,
  Smartphone,
  Laptop
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const {
    currentUser,
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
    auditLogs,
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
    resolveEscalationAdmin,
    showToast
  } = useApp();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'staff' | 'permissions' | 'security' | 'audit' | 'settings' | 'backups' | 'integrations' | 'escalations' | 'dictionary'
  >('overview');

  // Search & Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Modals state
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [editPermissionsModalOpen, setEditPermissionsModalOpen] = useState(false);
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<StaffMember | null>(null);
  const [selectedPermissionsList, setSelectedPermissionsList] = useState<string[]>([]);
  const [confirmActionModal, setConfirmActionModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    actionType: 'terminate_session' | 'block_ip' | 'toggle_staff' | 'restore_backup' | 'repair_db';
    targetId: string;
    extraData?: any;
  }>({
    open: false,
    title: '',
    message: '',
    actionType: 'terminate_session',
    targetId: ''
  });

  // New staff form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('moderator');
  const [newStaffDept, setNewStaffDept] = useState<StaffMember['department']>('moderation');
  const [newStaffNotes, setNewStaffNotes] = useState('');

  // IP Block Form state
  const [newBlockIp, setNewBlockIp] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // Settings form state (synced with systemSettings)
  const [settingsForm, setSettingsForm] = useState(systemSettings);
  useEffect(() => {
    setSettingsForm(systemSettings);
  }, [systemSettings]);

  // Data Integrity state
  const [integrityReport, setIntegrityReport] = useState<any>(null);
  const [integrityChecking, setIntegrityChecking] = useState(false);

  // Initial load
  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Available permission definitions
  const ALL_PERMISSIONS = [
    { code: 'view_public_listings', label: 'استعراض العقارات المنشورة', dept: 'عام' },
    { code: 'view_all_listings', label: 'استعراض كافة مسودات وقيد مراجعة العقارات', dept: 'مراجعة' },
    { code: 'moderate_listings', label: 'قبول ورفض وتعديل حالة الإعلانات', dept: 'مراجعة' },
    { code: 'request_changes', label: 'طلب تعديلات ونواقص من المعلن', dept: 'مراجعة' },
    { code: 'suspend_listings', label: 'إيقاف وتعطيل الإعلانات المخالفة', dept: 'رقابة' },
    { code: 'view_sensitive_deeds', label: 'الاطلاع على وثائق البصائر والملكية الحساسة', dept: 'توثيق' },
    { code: 'verify_documents', label: 'اعتماد ومطابقة المستندات والوثائق', dept: 'توثيق' },
    { code: 'issue_badges', label: 'منح شارات التوثيق المعتمدة', dept: 'توثيق' },
    { code: 'view_reports', label: 'استعراض بلاغات النزاع والاحتيال', dept: 'نزاعات' },
    { code: 'investigate_reports', label: 'التحقيق في البلاغات والاتصال بالأطراف', dept: 'نزاعات' },
    { code: 'resolve_reports', label: 'إغلاق البلاغات واتخاذ الإجراءات الإدارية', dept: 'نزاعات' },
    { code: 'view_tickets', label: 'استعراض تذاكر الدعم الفني', dept: 'دعم' },
    { code: 'reply_tickets', label: 'الرد على استفسارات المستخدمين', dept: 'دعم' },
    { code: 'close_tickets', label: 'إغلاق وحل تذاكر الدعم', dept: 'دعم' },
    { code: 'view_financial_overview', label: 'استعراض المؤشرات المالية وفواتير الباقات', dept: 'مالية' },
    { code: 'export_financial_reports', label: 'تصدير التقارير المالية المعتمدة', dept: 'مالية' },
    { code: 'manage_staff', label: 'إنشاء وتعديل حسابات الموظفين', dept: 'إدارة' },
    { code: 'manage_security', label: 'إدارة الجلسات وحظر عناوين الـ IP', dept: 'أمان' },
    { code: 'backups_and_restore', label: 'إنشاء واستعادة النسخ الاحتياطية', dept: 'إدارة' }
  ];

  // Filtered Audit Logs
  const filteredLogs = auditLogs.filter(log => {
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase().trim();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchDetails) return false;
    }
    if (auditTargetFilter !== 'all' && log.targetType !== auditTargetFilter) return false;
    return true;
  });

  // Filtered Staff
  const filteredStaff = staff.filter(s => {
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      if (!matchName && !matchPhone) return false;
    }
    if (staffRoleFilter !== 'all' && s.role !== staffRoleFilter) return false;
    return true;
  });

  // Filtered Users
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase().trim();
    return u.name.toLowerCase().includes(q) || u.phone.includes(q) || u.role.toLowerCase().includes(q);
  });

  // Handle Add Staff Submit
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPhone) {
      showToast('يرجى إدخال الاسم ورقم الهاتف', 'warning');
      return;
    }
    const success = await addStaffAdmin({
      name: newStaffName,
      phone: newStaffPhone,
      email: newStaffEmail || `${newStaffRole}@dalani-ye.com`,
      role: newStaffRole,
      department: newStaffDept,
      notes: newStaffNotes
    });
    if (success) {
      setAddStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffEmail('');
      setNewStaffNotes('');
    }
  };

  // Open Edit Permissions Modal
  const handleOpenPermsModal = (member: StaffMember) => {
    setSelectedStaffForPerms(member);
    setSelectedPermissionsList(member.permissions || []);
    setEditPermissionsModalOpen(true);
  };

  const handleSaveStaffPermissions = async () => {
    if (!selectedStaffForPerms) return;
    const ok = await updateStaffPermissionsAdmin(selectedStaffForPerms.id, selectedPermissionsList);
    if (ok) {
      setEditPermissionsModalOpen(false);
    }
  };

  // Trigger Confirmation Modal for Critical Action
  const triggerConfirmModal = (
    actionType: 'terminate_session' | 'block_ip' | 'toggle_staff' | 'restore_backup' | 'repair_db',
    targetId: string,
    title: string,
    message: string,
    extraData?: any
  ) => {
    setConfirmActionModal({
      open: true,
      actionType,
      targetId,
      title,
      message,
      extraData
    });
  };

  // Execute Confirmed Critical Action
  const executeConfirmedAction = async () => {
    const { actionType, targetId, extraData } = confirmActionModal;
    setConfirmActionModal(prev => ({ ...prev, open: false }));

    if (actionType === 'terminate_session') {
      await terminateSessionAdmin(targetId);
    } else if (actionType === 'block_ip') {
      await blockIpAdmin(targetId, extraData?.reason || 'حظر يدوي من مدير النظام');
    } else if (actionType === 'toggle_staff') {
      await toggleStaffStatusAdmin(targetId);
    } else if (actionType === 'restore_backup') {
      await restoreBackupAdmin(targetId);
    } else if (actionType === 'repair_db') {
      await repairDataIntegrityAdmin();
      setIntegrityReport(null);
    }
  };

  // Handle Run Integrity Check
  const handleRunIntegrityCheck = async () => {
    setIntegrityChecking(true);
    const report = await checkDataIntegrityAdmin();
    setIntegrityReport(report);
    setIntegrityChecking(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header / Breadcrumb & Status */}
      <div className="bg-[#16324F] text-white border-b border-slate-700/60 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md bg-[#12A889] text-[#16324F] text-xs font-black tracking-wide">
                  SYSTEM GOVERNANCE
                </span>
                <span className="text-xs text-slate-300 font-medium">الرقابة الإدارية والأمنية العليا · إصدار 2026</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#12A889]" />
                مركز القيادة والحوكمة المؤسسية
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                إدارة مركزية لحسابات الموظفين والمستخدمين، ضبط الصلاحيات الدقيقة، مراقبة الجلسات والأمان، وسجل التدقيق والنسخ الاحتياطي المتصل بقاعدة البيانات.
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => fetchAdminData()}
                disabled={adminLoading}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                title="تحديث البيانات من الخادم"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#12A889] ${adminLoading ? 'animate-spin' : ''}`} />
                <span>مزامنة فورية</span>
              </button>

              <button
                onClick={() => setAddStaffModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء حساب موظف</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-5 border-t border-slate-700/60 mt-5 scrollbar-none text-xs font-bold">
            {[
              { id: 'overview', label: 'مؤشرات القيادة', icon: Activity },
              { id: 'staff', label: 'الموظفين والمستخدمين', icon: Users },
              { id: 'permissions', label: 'مصفوفة الصلاحيات', icon: Key },
              { id: 'security', label: 'الأمان والجلسات', icon: Lock },
              { id: 'audit', label: 'سجل التدقيق الرقابي', icon: History },
              { id: 'settings', label: 'إعدادات المنظومة والميزات', icon: Sliders },
              { id: 'backups', label: 'النسخ الاحتياطي والسلامة', icon: Database },
              { id: 'integrations', label: 'فحص التكاملات والشبكات', icon: Globe },
              { id: 'escalations', label: 'مكتب قرارات المدير', icon: AlertOctagon },
              { id: 'dictionary', label: 'بيانات وقواميس اليمن', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-[#16324F] shadow-sm font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#12A889]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ======================================================== */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 font-bold block mb-1">الموظفين الإداريين</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#16324F] font-mono tabular-nums">
                    {staff.filter(s => s.activeStatus).length}
                    <span className="text-xs text-slate-400 font-normal mr-1">/ {staff.length}</span>
                  </span>
                  <span className="text-[11px] text-[#12A889] font-bold">نشط في المنظومة</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 font-bold block mb-1">الجلسات النشطة الحالية</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-indigo-900 font-mono tabular-nums">
                    {activeSessions.length}
                  </span>
                  <span className="text-[11px] text-indigo-600 font-bold">جلسات متصلة بالخادم</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 font-bold block mb-1">التهديدات ومحاولات التسلل</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">
                    {threats.length}
                  </span>
                  <span className="text-[11px] text-rose-600 font-bold">
                    {blockedIps.length} عناوين IP محظورة
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 font-bold block mb-1">سجل العمليات الرقابية</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#12A889] font-mono tabular-nums">
                    {auditLogs.length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold">محفوظ بصورة دائمة</span>
                </div>
              </div>
            </div>

            {/* Middle Grid: Live Security Watch + System Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Sessions Quick Preview */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#16324F]" />
                    <h3 className="font-black text-sm text-[#16324F]">الجلسات المفتوحة للموظفين والمستخدمين</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('security')}
                    className="text-xs font-bold text-[#12A889] hover:underline"
                  >
                    عرض الكل ({activeSessions.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeSessions.slice(0, 4).map(session => (
                    <div
                      key={session.id}
                      className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100"
                    >
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span>{session.userName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                            {session.userRole}
                          </span>
                          {session.isCurrentSession && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              جلستك الحالية
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {session.ipAddress} · {session.location} · بدأ {session.startedAt}
                        </div>
                      </div>

                      {!session.isCurrentSession && (
                        <button
                          onClick={() =>
                            triggerConfirmModal(
                              'terminate_session',
                              session.id,
                              'إنهاء الجلسة فورياً من الخادم',
                              `هل أنت متأكد من إنهاء جلسة [${session.userName}] على عنوان IP [${session.ipAddress}]؟ سيتم إبطال صلاحية الجلسة فوراً.`
                            )
                          }
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          إنهاء الجلسة
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* High-Risk Escalations */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <h3 className="font-black text-sm text-[#16324F]">مشكلات ونزاعات تتطلب صلاحيات المدير العليا</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('escalations')}
                    className="text-xs font-bold text-[#12A889] hover:underline"
                  >
                    مكتب القرارات ({escalations.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {escalations.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">لا توجد قضايا مصعدة حالياً</div>
                  ) : (
                    escalations.map(esc => (
                      <div
                        key={esc.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{esc.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              esc.priority === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {esc.priority === 'critical' ? 'حرج' : 'متوسط'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{esc.description}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-400 font-mono">رقم القضية: {esc.caseNumber}</span>
                          <button
                            onClick={() => setActiveTab('escalations')}
                            className="text-[11px] font-bold text-[#16324F] hover:text-[#12A889]"
                          >
                            اتخاذ القرار الإداري ←
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* System Status & Services Banner */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs border border-slate-800">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-[#12A889] shrink-0" />
                <div>
                  <span className="font-bold text-white">حالة المنظومة المركزية: </span>
                  <span className="text-emerald-400 font-bold">نشطة ومستقرة (100% Operational)</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    جميع قواعد الأمان والتحقق من الصلاحيات مشددة في الخادم لمنع أي تجاوزات برمجية.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('backups')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
                >
                  النسخ الاحتياطي
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-3 py-1.5 rounded-lg bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] text-xs font-bold"
                >
                  مفاتيح الخصائص
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: STAFF & USER ACCOUNTS HUB */}
        {/* ======================================================== */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Top Bar Filter */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="بحث في الموظفين بالاسم أو الهاتف..."
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>

                <select
                  value={staffRoleFilter}
                  onChange={e => setStaffRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="all">كل الأدوار</option>
                  <option value="moderator">مسؤول المراجعة</option>
                  <option value="verifier">مسؤول التحقق</option>
                  <option value="reporter_admin">مسؤول النزاعات</option>
                  <option value="support">الدعم الفني</option>
                  <option value="accountant">المحاسب</option>
                  <option value="system_admin">مدير النظام</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setAddStaffModalOpen(true)}
                  className="px-4 py-2 bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة موظف جديد</span>
                </button>
              </div>
            </div>

            {/* Staff Accounts Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#16324F]">سجل حسابات الإدارة والموظفين المعتمدين</h3>
                  <p className="text-xs text-slate-500">
                    إنشاء حسابات الموظفين وتعطيلها وضبط أذونات كل قسم لحماية الصلاحيات الحساسة
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {filteredStaff.length} موظف مسجل
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3.5">اسم الموظف</th>
                      <th className="p-3.5">الدور والقسم</th>
                      <th className="p-3.5">رقم الهاتف والبريد</th>
                      <th className="p-3.5">الصلاحيات الدقيقة</th>
                      <th className="p-3.5">حالة الحساب</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStaff.map(member => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-[#16324F]">
                          {member.name}
                          <span className="block text-[11px] text-slate-400 font-mono font-normal">
                            معرف: {member.id}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] inline-block mb-1">
                            {member.role}
                          </span>
                          <span className="block text-[10px] text-slate-500">قسم: {member.department}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          <div>{member.phone}</div>
                          <div className="text-[10px] text-slate-400">{member.email}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold font-mono text-[11px]">
                              {member.permissions?.length || 0} أذونات
                            </span>
                            <button
                              onClick={() => handleOpenPermsModal(member)}
                              className="text-[11px] font-bold text-[#12A889] hover:underline"
                            >
                              تعديل الأذونات
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              member.activeStatus
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {member.activeStatus ? 'نشط ومفعل' : 'معطل وموقوف'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {member.role !== 'system_admin' && (
                              <button
                                onClick={() =>
                                  triggerConfirmModal(
                                    'toggle_staff',
                                    member.id,
                                    member.activeStatus ? 'تعطيل حساب موظف' : 'تفعيل حساب موظف',
                                    `هل أنت متأكد من ${member.activeStatus ? 'تعطيل' : 'تفعيل'} حساب الموظف [${member.name}]؟ سيتم تحديث حالة حسابه وسجل التدقيق فوراً.`
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                  member.activeStatus
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {member.activeStatus ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General Users Table (Seekers, Advertisers, Organizations) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#16324F]">إدارة حسابات المستخدمين والمعلنين (عامة المنصة)</h3>
                  <p className="text-xs text-slate-500">
                    متابعة وتعديل بيانات مستخدمي المنصة وتعطيل الحسابات المخالفة أو المشبوهة
                  </p>
                </div>

                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="بحث في المستخدمين..."
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3.5">اسم المستخدم</th>
                      <th className="p-3.5">الدور المسجل</th>
                      <th className="p-3.5">الهاتف وتاريخ التسجيل</th>
                      <th className="p-3.5">حالة الحساب</th>
                      <th className="p-3.5 text-center">الإجراء الإداري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredUsers.slice(0, 10).map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{u.name}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {u.phone || 'غير مسجل'} · {u.createdAt}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.activeStatus !== false
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {u.activeStatus !== false ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {u.role !== 'system_admin' && (
                            <button
                              onClick={() => toggleUserStatusAdmin(u.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                u.activeStatus !== false
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.activeStatus !== false ? 'تعطيل الحساب' : 'إعادة التنشيط'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: GRANULAR ROLES & PERMISSIONS MATRIX */}
        {/* ======================================================== */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-[#16324F]">
                    مصفوفة الأدوار والصلاحيات (Granular RBAC Engine)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تحديد ما يستطيع كل دور رؤيته وتنفيذه، وضمان عدم تجاوز الموظفين لصلاحياتهم
                  </p>
                </div>

                <button
                  onClick={() => updateRolesMatrixAdmin(rolesMatrix)}
                  className="px-4 py-2 bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] font-black text-xs rounded-xl shadow-xs transition-colors"
                >
                  حفظ التعديلات في الخادم
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">رمز الصلاحية والوصف</th>
                      <th className="p-3 text-center">المشرف</th>
                      <th className="p-3 text-center">المحقق</th>
                      <th className="p-3 text-center">النزاعات</th>
                      <th className="p-3 text-center">الدعم</th>
                      <th className="p-3 text-center">المحاسب</th>
                      <th className="p-3 text-center">المدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ALL_PERMISSIONS.map(perm => (
                      <tr key={perm.code} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-800">
                          {perm.label}
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            {perm.code} · [{perm.dept}]
                          </span>
                        </td>
                        {(['moderator', 'verifier', 'reporter_admin', 'support', 'accountant', 'system_admin'] as UserRole[]).map(r => {
                          const hasPerm = rolesMatrix[r]?.includes(perm.code) || r === 'system_admin';
                          return (
                            <td key={r} className="p-3 text-center">
                              <input
                                type="checkbox"
                                disabled={r === 'system_admin'}
                                checked={hasPerm}
                                onChange={e => {
                                  const updatedRolePerms = e.target.checked
                                    ? [...(rolesMatrix[r] || []), perm.code]
                                    : (rolesMatrix[r] || []).filter(c => c !== perm.code);
                                  updateRolesMatrixAdmin({
                                    ...rolesMatrix,
                                    [r]: updatedRolePerms
                                  });
                                }}
                                className="w-4 h-4 text-[#12A889] rounded border-slate-300 focus:ring-[#12A889]"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SECURITY, SESSIONS & THREATS WATCH */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Active Sessions Grid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-[#16324F]">إدارة الجلسات النشطة (Active Sessions)</h3>
                  <p className="text-xs text-slate-500">
                    مراقبة اتصالات الموظفين الحالية وإنهاء أي جلسة مشبوهة أو منتهية فعلياً من الخادم
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs font-mono">
                  {activeSessions.length} جلسات نشطة
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSessions.map(session => (
                  <div
                    key={session.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{session.userName}</span>
                      <span className="px-2 py-0.5 rounded bg-white text-slate-700 font-bold border border-slate-200 font-mono text-[10px]">
                        {session.userRole}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                      <div>IP: {session.ipAddress} · الموقع: {session.location}</div>
                      <div className="text-slate-400 truncate">المتصفح: {session.userAgent}</div>
                      <div>بدء الجلسة: {session.startedAt} · آخر نشاط: {session.lastActiveAt}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      {session.isCurrentSession ? (
                        <span className="text-[11px] text-emerald-700 font-bold">جلسة الإدارة الحالية (محمية)</span>
                      ) : (
                        <button
                          onClick={() =>
                            triggerConfirmModal(
                              'terminate_session',
                              session.id,
                              'إنهاء الجلسة فورياً من الخادم',
                              `هل أنت متأكد من إنهاء جلسة [${session.userName}] على عنوان [${session.ipAddress}]؟ سيتم حظر الجلسة وإبطالها في الخادم فوراً.`
                            )
                          }
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition-colors"
                        >
                          إنهاء الجلسة فورياً
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suspicious Threats & IP Blocking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Suspicious Attempts */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-black text-sm text-[#16324F]">متابعة محاولات الدخول المشبوهة</h3>
                  <p className="text-xs text-slate-500">
                    رصد محاولات التسلل، وتزوير الترويسات، وتخطي الصلاحيات
                  </p>
                </div>

                <div className="space-y-2.5">
                  {threats.map(threat => (
                    <div
                      key={threat.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 font-mono">{threat.ipAddress}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            threat.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : threat.severity === 'high'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {threat.attemptType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{threat.details}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-400">
                        <span>{threat.country} · {threat.occurredAt}</span>
                        {threat.blocked ? (
                          <span className="text-rose-700 font-bold">محظور في الخادم</span>
                        ) : (
                          <button
                            onClick={() => blockIpAdmin(threat.ipAddress, threat.details || 'تهديد أمني مشبوه')}
                            className="text-rose-700 hover:underline font-bold"
                          >
                            حظر هذا العنوان
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blocked IPs & Manual Block */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-black text-sm text-[#16324F]">قائمة عناوين IP المحظورة بالخادم</h3>
                  <p className="text-xs text-slate-500">
                    حجب الوصول الإلزامي لأي مصدر يهدد سلامة وبيانات المنصة
                  </p>
                </div>

                {/* Quick Block Input */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">إضافة عنوان IP للحظر الفوري:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBlockIp}
                      onChange={e => setNewBlockIp(e.target.value)}
                      placeholder="مثال: 198.51.100.22"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      onClick={async () => {
                        if (!newBlockIp) return;
                        await blockIpAdmin(newBlockIp, newBlockReason || 'حظر يدوي');
                        setNewBlockIp('');
                        setNewBlockReason('');
                      }}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
                    >
                      حظر
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {blockedIps.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">لا توجد عناوين محظورة حالياً</div>
                  ) : (
                    blockedIps.map(b => (
                      <div
                        key={b.ip}
                        className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-rose-900 font-mono block">{b.ip}</span>
                          <span className="text-[11px] text-rose-700">
                            السبب: {b.reason} · حظره {b.blockedBy} في {b.blockedAt}
                          </span>
                        </div>
                        <button
                          onClick={() => unblockIpAdmin(b.ip)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200"
                        >
                          فك الحظر
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: AUDIT LOG TRAIL */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="بحث في سجل العمليات والتغييرات..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2 text-xs w-full md:w-auto">
                <span className="text-slate-500 font-bold">تصفية بنوع الهدف:</span>
                <select
                  value={auditTargetFilter}
                  onChange={e => setAuditTargetFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  <option value="all">كل الأهداف</option>
                  <option value="staff">الموظفين</option>
                  <option value="security">الأمان والجلسات</option>
                  <option value="permission">الصلاحيات</option>
                  <option value="system_setting">إعدادات النظام</option>
                  <option value="backup">النسخ الاحتياطي</option>
                  <option value="listing">الإعلانات والعقارات</option>
                  <option value="report">البلاغات والنزاعات</option>
                  <option value="verification">طلبات التحقق</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#16324F]">سجل التدقيق الرقابي غير القابل للتلاعب (Append-Only)</h3>
                  <p className="text-xs text-slate-500">
                    تسجيل محمي في الخادم لكافة الإجراءات الحساسة بدون إتاحة أي واجهة للتعديل أو الحذف
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {filteredLogs.length} سجلات مطابقة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3.5">الوقت والتاريخ</th>
                      <th className="p-3.5">المنفذ والصفة</th>
                      <th className="p-3.5">العملية الإدارية</th>
                      <th className="p-3.5">النوع والمعرف</th>
                      <th className="p-3.5">النتيجة</th>
                      <th className="p-3.5">التفاصيل والأثر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-3.5 font-bold text-[#16324F]">
                          {log.userName}
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">({log.userRole})</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">{log.action}</td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {log.targetType} <span className="text-[10px]">({log.targetId})</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.result === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.result === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.result === 'success' ? 'نجاح' : log.result === 'warning' ? 'تنبيه' : 'مرفوض'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-sm">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: SETTINGS & FEATURE FLAGS */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Feature Flags Grid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-[#16324F]">مفاتيح الخصائص الحية (Feature Flags)</h3>
                <p className="text-xs text-slate-500">
                  تفعيل أو تعطيل ميزات المنصة العامة دون الحاجة إلى إعادة نشر الكود البرمجي
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featureFlags.map(flag => (
                  <div
                    key={flag.key}
                    className={`p-4 rounded-xl border transition-all ${
                      flag.enabled
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs text-slate-900">{flag.name}</span>
                      <button
                        onClick={() => toggleFeatureFlagAdmin(flag.key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          flag.enabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {flag.enabled ? 'مفعلة' : 'معطلة'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{flag.description}</p>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>مفتاح: {flag.key}</span>
                      <span>آخر تعديل: {flag.updatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General System Settings Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-[#16324F]">إعدادات المنظومة العامة والأمان والتسجيل</h3>
                <p className="text-xs text-slate-500">
                  ضبط سياسات مهلة الجلسات، التحقق، وقنوات الإشعارات
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المنصة الرسمي</label>
                  <input
                    type="text"
                    value={settingsForm.platformName}
                    onChange={e => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">العملة الافتراضية</label>
                  <select
                    value={settingsForm.defaultCurrency}
                    onChange={e => setSettingsForm({ ...settingsForm, defaultCurrency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">مهلة انتهاء الجلسة (بالدقائق)</label>
                  <input
                    type="number"
                    value={settingsForm.sessionTimeoutMinutes}
                    onChange={e => setSettingsForm({ ...settingsForm, sessionTimeoutMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الحد الأقصى لمحاولات الدخول الفاشلة</label>
                  <input
                    type="number"
                    value={settingsForm.maxFailedLoginAttempts}
                    onChange={e => setSettingsForm({ ...settingsForm, maxFailedLoginAttempts: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">هاتف التنبيهات الإدارية الطارئة</label>
                  <input
                    type="text"
                    value={settingsForm.adminAlertsPhone}
                    onChange={e => setSettingsForm({ ...settingsForm, adminAlertsPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني للدعم</label>
                  <input
                    type="email"
                    value={settingsForm.contactEmail}
                    onChange={e => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.requirePhoneOtp}
                    onChange={e => setSettingsForm({ ...settingsForm, requirePhoneOtp: e.target.checked })}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">إلزامية التحقق عبر رمز OTP</span>
                    <span className="text-[11px] text-slate-500">إرسال رمز تحقق للرقم اليمني عند التسجيل</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.maintenanceMode}
                    onChange={e => setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 text-[#12A889] rounded"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">نمط الصيانة الإدارية</span>
                    <span className="text-[11px] text-slate-500">إغلاق الواجهات العامة للجمهور مؤقتاً</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => updateSystemSettingsAdmin(settingsForm)}
                  className="px-6 py-2.5 bg-[#16324F] hover:bg-[#122438] text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  حفظ إعدادات المنظومة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: BACKUPS & DATA INTEGRITY */}
        {/* ======================================================== */}
        {activeTab === 'backups' && (
          <div className="space-y-6">
            {/* Integrity Checker Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-[#16324F]">فحص سلامة وترابط البيانات (Data Integrity Checker)</h3>
                  <p className="text-xs text-slate-500">
                    تشخيص تلقائي للسجلات اليتيمة والعلاقات غير المتطابقة وإصلاحها لضمان استقرار النظام
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunIntegrityCheck}
                    disabled={integrityChecking}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${integrityChecking ? 'animate-spin' : ''}`} />
                    <span>تشغيل الفحص الآن</span>
                  </button>

                  {integrityReport && !integrityReport.isHealthy && (
                    <button
                      onClick={() =>
                        triggerConfirmModal(
                          'repair_db',
                          'database',
                          'إصلاح علاقات البيانات تلقائياً',
                          'سيقوم النظام بربط السجلات اليتيمة بحسابات معتمدة ومطابقة سلامة الجداول في الخادم.'
                        )
                      }
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
                    >
                      إصلاح السجلات
                    </button>
                  )}
                </div>
              </div>

              {integrityReport ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    {integrityReport.isHealthy ? (
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> جميع بيانات المنظومة مترابطة وسليمة بنسبة 100%
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> تم رصد بعض الملاحظات البسيطة في تكامل العلاقات
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      إجمالي الإعلانات: <strong>{integrityReport.stats.totalListings}</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      إجمالي المستخدمين: <strong>{integrityReport.stats.totalUsers}</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      السجلات اليتيمة: <strong>{integrityReport.stats.orphanListings}</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      تذاكر غير مرتبطة: <strong>{integrityReport.stats.unlinkedTickets}</strong>
                    </div>
                  </div>

                  {integrityReport.issuesFound?.length > 0 && (
                    <ul className="list-disc list-inside text-slate-600 space-y-1">
                      {integrityReport.issuesFound.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  انقر على زر "تشغيل الفحص الآن" للتحقق من سلامة الجداول والعلاقات في الخادم.
                </div>
              )}
            </div>

            {/* Backups Management */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-[#16324F]">إدارة النسخ الاحتياطي واستعادة البيانات</h3>
                  <p className="text-xs text-slate-500">
                    إنشاء نسخ احتياطية كاملة وموثقة بتوقيع SHA256، مع أخذ نسخة أمان احترازية قبل أي استرجاع
                  </p>
                </div>

                <button
                  onClick={() => createBackupAdmin('نسخة احتياطية يدوية بطلب من مدير النظام')}
                  className="px-4 py-2 bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>إنشاء نسخة احتياطية فورية</span>
                </button>
              </div>

              <div className="space-y-3">
                {backups.map(bkp => (
                  <div
                    key={bkp.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">{bkp.fileName}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {bkp.status === 'valid' ? 'سليمة وموثقة' : 'تالفة'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        الحجم: {(((bkp.sizeBytes || 0)) / 1024).toFixed(1)} KB · التاريخ: {bkp.createdAt} · المنشئ: {bkp.createdBy}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-md mt-0.5">
                        SHA256: {bkp.checksumSha256}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          triggerConfirmModal(
                            'restore_backup',
                            bkp.id,
                            'تأكيد استرجاع قاعدة البيانات',
                            `تنبيه أمني عالي الحساسية: سيتم استرجاع كافة بيانات المنظومة من النسخة [${bkp.fileName}]. سيقوم الخادم تلقائياً بأخذ نسخة أمان للحالة الراهنة قبل التنفيذ لتأمين إمكانية التراجع.`
                          )
                        }
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-xs border border-amber-200"
                      >
                        استرجاع النسخة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Error Logs */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-[#16324F]">سجل أخطاء النظام والتشخيص</h3>
                <p className="text-xs text-slate-500">
                  مراقبة الأخطاء التقنية وحالات معالجتها لضمان استمرارية التشغيل
                </p>
              </div>

              <div className="space-y-2">
                {systemErrors.map(err => (
                  <div
                    key={err.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">[{err.code}]</span>
                        <span className="text-slate-600 font-bold">{err.message}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            err.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {err.status === 'resolved' ? 'تم الحل' : 'قيد المتابعة'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        الوحدة: {err.module} · الوقت: {err.timestamp}
                      </span>
                    </div>

                    {err.status !== 'resolved' && (
                      <button
                        onClick={() => resolveSystemErrorAdmin(err.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200 text-xs"
                      >
                        إغلاق الخطأ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: INTEGRATIONS LIVE PING */}
        {/* ======================================================== */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-[#16324F]">متابعة التكاملات والخدمات المرتبطة (Live Connectivity)</h3>
                <p className="text-xs text-slate-500">
                  فحص اتصال حقيقي (Real Ping) ببوابات الرسائل اليمنية والتخزين السحابي وخوادم البريد
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map(service => (
                  <div
                    key={service.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-sm">{service.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          service.status === 'online'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {service.status === 'online' ? 'متصل وجاهز' : 'غير متصل'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                      <div className="truncate">نقطة الاتصال: {service.endpoint}</div>
                      <div>
                        زمن الاستجابة (Latency):{' '}
                        <strong className="text-slate-800 font-bold">{service.latencyMs || 0} ms</strong>
                      </div>
                      <div>آخر فحص: {service.lastCheckedAt}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => pingIntegrationAdmin(service.id)}
                        className="px-3.5 py-1.5 bg-[#16324F] hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#12A889]" />
                        <span>فحص الاتصال الحي</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 9: MANAGEMENT ESCALATIONS */}
        {/* ======================================================== */}
        {activeTab === 'escalations' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-[#16324F]">مكتب معالجة المشكلات والقرارات المصعدة للإدارة</h3>
                <p className="text-xs text-slate-500">
                  حل القضايا والنزاعات عالية القيمة وطلبات الاستثناء التي تتطلب اعتماد مدير النظام حصراً
                </p>
              </div>

              <div className="space-y-4">
                {escalations.map(esc => (
                  <div
                    key={esc.id}
                    className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400">رقم القضية: {esc.caseNumber}</span>
                        <h4 className="font-black text-sm text-slate-900 mt-0.5">{esc.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                          {esc.priority === 'critical' ? 'أولوية قصوى' : 'أولوية متوسطة'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">{esc.createdAt}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{esc.description}</p>
                    <div className="text-[11px] text-slate-500">مرفوعة من قبل: <strong>{esc.submittedBy}</strong></div>

                    {esc.status === 'pending_admin' ? (
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => resolveEscalationAdmin(esc.id, 'rejected', 'تم رفض الطلب لعدم اكتمال المسوغات')}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors"
                        >
                          رفض الطلب
                        </button>
                        <button
                          onClick={() => resolveEscalationAdmin(esc.id, 'approved', 'تم اعتماد الإجراء بقرار المدير العام')}
                          className="px-4 py-1.5 bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] font-black rounded-lg transition-colors"
                        >
                          اعتماد وتنفيذ القرار
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800">قرار المدير: </span>
                        <span className={esc.status === 'approved' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {esc.status === 'approved' ? 'معتمد' : 'مرفوض'}
                        </span>
                        <p className="text-slate-600 text-[11px] mt-0.5">{esc.adminResolutionNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 10: YEMEN DICTIONARY */}
        {/* ======================================================== */}
        {activeTab === 'dictionary' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div>
              <h3 className="font-bold text-base text-[#16324F] mb-1">قاموس التقسيم الإداري والجغرافي المعتمد لليمن</h3>
              <p className="text-xs text-slate-500">
                المحافظات والمدن والأحياء اليمنية المعتمدة في خيارات البحث ومعالج إضافة العقار
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {YEMEN_GOVERNORATES.map(gov => (
                <div key={gov.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-sm text-[#16324F]">{gov.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {gov.lat.toFixed(2)}°, {gov.lng.toFixed(2)}°
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {gov.cities.map(c => (
                      <div key={c.name} className="space-y-1">
                        <span className="font-bold text-slate-800 block text-xs">مدينة {c.name}:</span>
                        <div className="flex flex-wrap gap-1">
                          {c.districts.map(d => (
                            <span key={d} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD NEW STAFF MEMBER */}
      {/* ======================================================== */}
      {addStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#12A889]" />
                إنشاء حساب موظف جديد
              </h3>
              <button
                onClick={() => setAddStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم الموظف الكامل *</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  placeholder="مثال: م. علي صالح الحكيمي"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم الهاتف اليمني *</label>
                  <input
                    type="text"
                    required
                    value={newStaffPhone}
                    onChange={e => setNewStaffPhone(e.target.value)}
                    placeholder="770000000 أو 710000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني المهني</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={e => setNewStaffEmail(e.target.value)}
                    placeholder="staff@dalani-ye.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الدور الإداري *</label>
                  <select
                    value={newStaffRole}
                    onChange={e => setNewStaffRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="moderator">مسؤول مراجعة المحتوى</option>
                    <option value="verifier">مسؤول التحقق والمستندات</option>
                    <option value="reporter_admin">مسؤول النزاعات والقضايا</option>
                    <option value="support">مسؤول الدعم الفني</option>
                    <option value="accountant">المحاسب المالي</option>
                    <option value="system_admin">مدير نظام مشارك</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">القسم المؤسسي *</label>
                  <select
                    value={newStaffDept}
                    onChange={e => setNewStaffDept(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="moderation">قسم المراجعة والتدقيق</option>
                    <option value="verification">قسم التوثيق والتراخيص</option>
                    <option value="disputes">قسم النزاعات والبلاغات</option>
                    <option value="support">قسم الدعم الفني</option>
                    <option value="finance">الإدارة المالية</option>
                    <option value="management">الإدارة العليا</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات وقرار التعيين</label>
                <textarea
                  rows={2}
                  value={newStaffNotes}
                  onChange={e => setNewStaffNotes(e.target.value)}
                  placeholder="ملاحظات مرجعية إدارية حول الموظف..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddStaffModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] font-black rounded-xl shadow-xs"
                >
                  إنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT GRANULAR PERMISSIONS */}
      {/* ======================================================== */}
      {editPermissionsModalOpen && selectedStaffForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#12A889]" />
                  تخصيص صلاحيات الموظف: {selectedStaffForPerms.name}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  الدور: {selectedStaffForPerms.role} · القسم: {selectedStaffForPerms.department}
                </span>
              </div>
              <button
                onClick={() => setEditPermissionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                حدد ما يستطيع هذا الموظف رؤيته وتنفيذه بدقة:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(p => {
                  const checked = selectedPermissionsList.includes(p.code);
                  return (
                    <label
                      key={p.code}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedPermissionsList([...selectedPermissionsList, p.code]);
                          } else {
                            setSelectedPermissionsList(selectedPermissionsList.filter(c => c !== p.code));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 text-[#12A889] rounded"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">{p.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-mono">
                {selectedPermissionsList.length} صلاحيات محددة
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditPermissionsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveStaffPermissions}
                  className="px-5 py-2 bg-[#12A889] hover:bg-[#0e8a70] text-[#16324F] font-black rounded-xl text-xs shadow-xs"
                >
                  حفظ الصلاحيات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CONFIRM CRITICAL ACTION */}
      {/* ======================================================== */}
      {confirmActionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertOctagon className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-base text-[#16324F]">{confirmActionModal.title}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{confirmActionModal.message}</p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setConfirmActionModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                تراجع
              </button>
              <button
                onClick={executeConfirmedAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                تأكيد التنفيذ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
