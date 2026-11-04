/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * خادم النظام الفرعي 1: الحسابات وإدارة الأطراف (Identity & Parties Server Routes)
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { identityRepository } from './identity/identityRepository';
import { requireRoles, validateYemeniPhone, recordAuditLog } from '../rbac';
import { findUserInDatabase, updateUserInDatabase, getSupabaseServer } from '../supabaseServer';
import { User, UserRole } from '../../types';

export const identityRouter = Router();

// 1. Get Current User Profile & Authenticated Role
identityRouter.get('/api/auth/me', (req: Request, res: Response) => {
  return res.json({
    user: req.currentUser,
    role: req.currentUser.role,
    authenticated: req.currentUser.role !== 'visitor'
  });
});

// 2. Switch Role Simulator Endpoint
identityRouter.post('/api/auth/switch-role', requireRoles('system_admin'), (req: Request, res: Response) => {
  const { role, userId, targetIdentifier } = req.body;
  const targetId = (userId || targetIdentifier || '').trim();

  if (!targetId) {
    return res.status(400).json({ error: 'معرّف الحساب الفعلي (userId) مطلوب لتبديل الجلسة لمنع انتحال الشخصيات' });
  }

  const allUsers = identityRepository.getUsers();
  const cleanId = targetId.toLowerCase();

  const targetUser = allUsers.find(u =>
    u.id === targetId ||
    u.supabaseUserId === targetId ||
    (u.email && u.email.toLowerCase() === cleanId) ||
    (u.phone && u.phone.includes(targetId))
  );

  if (!targetUser) {
    return res.status(404).json({ error: 'لم يتم العثور على الحساب المحدد في سجلات النظام' });
  }

  recordAuditLog(
    targetUser,
    'تبديل دور الجلسة عبر المحاكي الإداري',
    'user',
    targetUser.id,
    'success',
    `تم اختيار الحساب المحدد بنجاح: [${targetUser.name}] - (${targetUser.email || targetUser.phone})`
  );

  return res.json({
    message: 'تم اختيار الحساب المحدد بنجاح',
    user: targetUser
  });
});

// 3. Admin Safe Provisioner Endpoint for Supabase Auth Seekers
identityRouter.post('/api/admin/supabase/provision-seekers', requireRoles('system_admin'), async (req: Request, res: Response) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xoqfdzemtcpxqracygnb.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({
      error: 'مفتاح SUPABASE_SERVICE_ROLE_KEY غير موفر في بيئة الخادم. يرجى إضافته في متغيرات بيئة التشغيل للإنشاء الآمن.'
    });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const seekersToProvision = [
      { id: 'new-seeker-001', name: 'محمد أحمد العريقي', email: 'seeker1@dalani.ye', phone: '770123001' },
      { id: 'new-seeker-002', name: 'عبدالله محمد اليافعي', email: 'seeker2@dalani.ye', phone: '770123002' },
      { id: 'new-seeker-003', name: 'خالد علي الحضرمي', email: 'seeker3@dalani.ye', phone: '770123003' },
      { id: 'new-seeker-004', name: 'أحمد صالح الشامي', email: 'seeker4@dalani.ye', phone: '770123004' },
      { id: 'new-seeker-005', name: 'ياسر عبدالرحمن', email: 'seeker5@dalani.ye', phone: '770123005' }
    ];

    const results = [];

    for (const seeker of seekersToProvision) {
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
      let existingAuthUser = existingList?.users?.find(u => u.email?.toLowerCase() === seeker.email.toLowerCase());
      let authUid = existingAuthUser?.id;

      if (!authUid) {
        const defaultPassword = req.body.defaultPassword || 'Dalani2026!Seeker';
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: seeker.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { name: seeker.name, role: 'seeker', phone: seeker.phone }
        });

        if (createErr || !created.user) {
          results.push({ email: seeker.email, status: 'error', error: createErr?.message || 'تعذر إنشاء حساب Auth' });
          continue;
        }
        authUid = created.user.id;
      }

      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({
          supabase_user_id: authUid,
          email: seeker.email,
          phone: seeker.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', seeker.id);

      if (updateErr) {
        results.push({ email: seeker.email, authUid, status: 'db_link_error', error: updateErr.message });
      } else {
        identityRepository.updateUser(seeker.id, { supabaseUserId: authUid, email: seeker.email, phone: seeker.phone });
        results.push({ email: seeker.email, name: seeker.name, authUid, status: 'linked_successfully' });
      }
    }

    recordAuditLog(
      req.currentUser,
      'توليد وتأكيد حسابات الباحثين في Supabase Auth',
      'security',
      'batch-provisioning',
      'success',
      `تمت معالجة الحسابات بنجاح. النتائج: ${JSON.stringify(results)}`
    );

    return res.json({
      message: 'تمت معالجة وتأكيد حسابات الباحثين في Supabase Auth بنجاح',
      results
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء الاتصال بـ Supabase Admin API' });
  }
});

// 4. User Login / Authentication
identityRouter.post('/api/auth/login', async (req: Request, res: Response) => {
  const { phone, email, identifier, role = 'seeker', name, supabaseUserId } = req.body;
  const loginTarget = (identifier || email || phone || supabaseUserId || '').trim();
  const cleanEmail = loginTarget.toLowerCase();
  const cleanPhone = loginTarget.replace(/[\s\-\(\)\+]/g, '');

  let user: User | undefined;

  // 1. Check Supabase database first
  const dbUser = await findUserInDatabase(loginTarget);
  if (dbUser) {
    user = dbUser;
    identityRepository.updateUser(user.id, user);
  }

  // 2. Search memory cache
  if (!user && loginTarget) {
    const allUsers = identityRepository.getUsers();
    user = allUsers.find(u => {
      if (u.email && u.email.toLowerCase() === cleanEmail) return true;
      if (u.id === loginTarget) return true;
      if (u.supabaseUserId && u.supabaseUserId === loginTarget) return true;
      if (u.phone && cleanPhone.length >= 7) {
        const uPhone = u.phone.replace(/[\s\-\(\)\+]/g, '');
        if (uPhone.includes(cleanPhone) || cleanPhone.includes(uPhone)) return true;
      }
      return false;
    });
  }

  // 3. New user registration
  if (!user && loginTarget) {
    const newId = `usr-${Date.now()}`;
    user = {
      id: newId,
      supabaseUserId: supabaseUserId || undefined,
      name: name || (loginTarget.includes('@') ? loginTarget.split('@')[0] : 'مستخدم مسجل'),
      phone: phone || '+967 770 000 000',
      phoneVerified: true,
      email: email || (loginTarget.includes('@') ? loginTarget : undefined),
      role: (role as UserRole) || 'seeker',
      activeStatus: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    identityRepository.updateUser(user.id, user);

    try {
      const client = getSupabaseServer();
      await client.from('users').upsert({
        id: user.id,
        supabase_user_id: user.supabaseUserId || null,
        name: user.name,
        role: user.role,
        email: user.email || null,
        phone: user.phone || null,
        phone_verified: user.phoneVerified,
        active_status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (dbErr) {
      console.warn('[Supabase Server] Error creating new user in DB:', dbErr);
    }
  }

  if (!user) {
    return res.status(400).json({ error: 'بيانات الدخول غير صحيحة أو الحساب غير موجود' });
  }

  recordAuditLog(
    user,
    'تسجيل الدخول للمنصة',
    'user',
    user.id,
    'success',
    `تسجيل دخول ناجح للمستخدم [${user.name}] (${user.email || user.phone})`
  );

  return res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user
  });
});

// 5. Update User Profile
identityRouter.put('/api/user/profile', async (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتحديث الملف الشخصي' });
  }

  const { name, email, avatarUrl } = req.body;
  const updates: Partial<User> = {};

  if (typeof name === 'string' && name.trim()) {
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(422).json({ error: 'الاسم يجب أن يتراوح بين حرفين و100 حرف' });
    }
    updates.name = name.trim();
  }

  if (typeof email === 'string') {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(422).json({ error: 'البريد الإلكتروني المدخل غير صالح' });
    }
    updates.email = trimmedEmail;
  }

  if (typeof avatarUrl === 'string') {
    updates.avatarUrl = avatarUrl.trim();
  }

  const dbUpdated = await updateUserInDatabase(req.currentUser.id, updates);
  const updated = identityRepository.updateUser(req.currentUser.id, updates);
  const finalUser = dbUpdated || updated;

  if (!finalUser) {
    return res.status(404).json({ error: 'تعذر العثور على سجل المستخدم في قاعدة البيانات' });
  }

  recordAuditLog(
    req.currentUser,
    'تحديث الملف الشخصي',
    'user',
    req.currentUser.id,
    'success',
    `تم تحديث بيانات الملف الشخصي للمستخدم [${finalUser.name}] في قاعدة البيانات`
  );

  return res.json({
    message: 'تم تحديث الملف الشخصي بنجاح',
    user: finalUser
  });
});

// 6. User Activity Logs
identityRouter.get('/api/user/activity', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لاستعراض سجل النشاط' });
  }

  const allLogs = db.getAuditLogs();
  const userLogs = allLogs.filter(log => log.userId === req.currentUser.id);

  return res.json({
    logs: userLogs,
    count: userLogs.length
  });
});

// 7. User Active Sessions
identityRouter.get('/api/user/sessions', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لاستعراض الجلسات' });
  }

  const allSessions = db.getActiveSessions();
  const userSessions = allSessions.filter(s => s.userId === req.currentUser.id);

  return res.json({
    sessions: userSessions,
    count: userSessions.length
  });
});

// 8. Terminate Session
identityRouter.delete('/api/user/sessions/:id', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const sessionId = req.params.id;
  const session = db.getActiveSessions().find(s => (s.id === sessionId || s.sessionId === sessionId));

  if (!session || session.userId !== req.currentUser.id) {
    return res.status(404).json({ error: 'الجلسة غير موجودة أو غير تابعة لهذا الحساب' });
  }

  const targetSessionId = session.id || session.sessionId;
  if (targetSessionId) {
    db.terminateSession(targetSessionId);
  }

  recordAuditLog(
    req.currentUser,
    'إنهاء جلسة من قبل المستخدم',
    'security',
    sessionId,
    'success',
    `قام المستخدم بإنهاء جلسته النشطة على الجهاز [${session.userAgent || session.deviceType}]`
  );

  return res.json({ message: 'تم إنهاء الجلسة بنجاح' });
});

// 9. Export User Data
identityRouter.get('/api/user/export-data', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتصدير البيانات' });
  }

  const currentUserId = req.currentUser.id;
  const userListings = db.getListings().filter(l => l.advertiser?.id === currentUserId);
  const userTickets = db.getTickets().filter(t => t.userId === currentUserId);
  const userReports = db.getReports().filter(r => r.reporterPhone === req.currentUser.phone);
  const userLogs = db.getAuditLogs().filter(l => l.userId === currentUserId);

  const exportPayload = {
    metadata: {
      platform: 'دلنّي - المنصة العقارية اليمنية',
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0-YEM',
      disclaimer: 'هذا الملف يحتوي على نسختك من البيانات الشخصية المحفوظة لدى منصة دلنّي العقارية وفق سياسات الخصوصية وحماية البيانات.'
    },
    userProfile: {
      id: req.currentUser.id,
      name: req.currentUser.name,
      phone: req.currentUser.phone,
      phoneVerified: req.currentUser.phoneVerified,
      email: req.currentUser.email || null,
      role: req.currentUser.role,
      activeStatus: req.currentUser.activeStatus,
      createdAt: req.currentUser.createdAt,
      avatarUrl: req.currentUser.avatarUrl || null,
      orgId: req.currentUser.orgId || null,
      orgName: req.currentUser.orgName || null
    },
    listingsCount: userListings.length,
    listings: userListings.map(l => ({
      id: l.id,
      listingNumber: l.listingNumber,
      title: l.title,
      propertyType: l.propertyType,
      purpose: l.purpose,
      status: l.status,
      price: l.price,
      currency: l.currency,
      area: l.area,
      areaUnit: l.areaUnit,
      location: l.location,
      createdAt: l.createdAt
    })),
    supportTickets: userTickets,
    submittedReportsCount: userReports.length,
    submittedReports: userReports.map(r => ({
      id: r.id,
      caseNumber: r.caseNumber,
      listingTitle: r.listingTitle,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt
    })),
    activityLogsCount: userLogs.length,
    activityLogs: userLogs.map(log => ({
      timestamp: log.timestamp,
      action: log.action,
      targetType: log.targetType,
      result: log.result,
      details: log.details
    }))
  };

  recordAuditLog(
    req.currentUser,
    'تصدير البيانات الشخصية',
    'user',
    req.currentUser.id,
    'success',
    `قام المستخدم ${req.currentUser.name} بتصدير أرشيف بياناته كملف JSON`
  );

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="dalani-user-data.json"');
  return res.send(JSON.stringify(exportPayload, null, 2));
});

// 10. Deactivate Account
identityRouter.post('/api/user/deactivate', async (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتعطيل الحساب' });
  }

  if (req.currentUser.role === 'system_admin') {
    const activeAdmins = identityRepository.getUsers().filter(u => u.role === 'system_admin' && u.activeStatus !== false);
    if (activeAdmins.length <= 1) {
      return res.status(400).json({ error: 'لا يمكن لمدير النظام الوحيد تعطيل حسابه لمنع قفل النظام' });
    }
  }

  await updateUserInDatabase(req.currentUser.id, { activeStatus: false });
  const updated = identityRepository.updateUser(req.currentUser.id, { activeStatus: false });

  const userSessions = db.getActiveSessions().filter(s => s.userId === req.currentUser.id);
  userSessions.forEach(s => {
    const sid = s.id || s.sessionId;
    if (sid) db.terminateSession(sid);
  });

  recordAuditLog(
    req.currentUser,
    'تعطيل الحساب الشخصي',
    'user',
    req.currentUser.id,
    'warning',
    `تم تعطيل حساب المستخدم [${req.currentUser.name}] بناءً على طلبه الشخصي في قاعدة البيانات`
  );

  return res.json({
    message: 'تم تعطيل الحساب بنجاح وتم إنهاء جميع الجلسات النشطة',
    user: updated
  });
});

// 11. Reactivate Account
identityRouter.post('/api/user/reactivate', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'رقم الهاتف مطلوب لإعادة التنشيط' });
  }

  const phoneCheck = validateYemeniPhone(phone);
  if (!phoneCheck.isValid) {
    return res.status(422).json({ error: phoneCheck.error });
  }

  const targetPhone = phoneCheck.normalized || phone;
  let user = await findUserInDatabase(targetPhone);
  if (!user) {
    user = identityRepository.getUsers().find(u => u.phone === phoneCheck.normalized || u.phone === phone) || null;
  }

  if (!user) {
    return res.status(404).json({ error: 'لم يتم العثور على حساب مرتبط بهذا الرقم' });
  }

  await updateUserInDatabase(user.id, { activeStatus: true });
  const reactivated = identityRepository.updateUser(user.id, { activeStatus: true });

  recordAuditLog(
    reactivated || user,
    'إعادة تنشيط الحساب',
    'user',
    user.id,
    'success',
    `تمت إعادة تفعيل حساب المستخدم [${user.name}] بنجاح في قاعدة البيانات`
  );

  return res.json({
    message: 'تمت إعادة تنشيط الحساب بنجاح، يمكنك الآن تسجيل الدخول',
    user: reactivated
  });
});

// 12. Organizations Management
identityRouter.get('/api/organizations', (req: Request, res: Response) => {
  return res.json({ organizations: identityRepository.getOrganizations() });
});

identityRouter.put(
  '/api/organizations/:id',
  requireRoles('org_manager', 'system_admin'),
  (req: Request, res: Response) => {
    const org = identityRepository.getOrganizationById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'المنشأة غير موجودة' });
    }

    if (req.currentUser.role !== 'system_admin' && org.managerId !== req.currentUser.id) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل بيانات هذه المنشأة' });
    }

    const updated = identityRepository.updateOrganization(org.id, req.body);
    recordAuditLog(
      req.currentUser,
      'تحديث بيانات المنشأة العقارية',
      'organization',
      org.id,
      'success',
      `تحديث ملف المنشأة ${org.name}`
    );

    return res.json({ message: 'تم تحديث بيانات المنشأة بنجاح', organization: updated });
  }
);
