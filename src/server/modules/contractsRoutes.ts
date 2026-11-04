import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contractsRepository } from './contracts/contractsRepository';
import { PropertyContract, ContractStatus } from '../../types';
import { checkDealAuthorization } from './operationsRoutes';
import { eventBus, DALANI_EVENTS } from '../../core/events/eventBus';

export const contractsRouter = Router();

// ==========================================
// REAL ESTATE CONTRACTS & DOCUMENTATION APIS
// ==========================================

export function checkContractAuthorization(req: Request, contract: PropertyContract) {
  const currentUserId = req.currentUser.id;
  const currentUserRole = req.currentUser.role;
  const booking = db.getBookingById(contract.bookingId);
  const listing = db.getListingById(contract.listingId);

  const isFirstParty = contract.firstParty?.id === currentUserId || booking?.advertiserId === currentUserId;
  const isSecondParty = contract.secondParty?.id === currentUserId || booking?.seekerId === currentUserId;
  const isWitness = Boolean(contract.witnesses?.some(w => w.id === currentUserId));
  const isOrgManager = currentUserRole === 'org_manager' && Boolean(req.currentUser.orgId && listing && listing.advertiser?.orgId === req.currentUser.orgId);
  const isAssignedAgent = Boolean(listing && listing.assignedAgentId === currentUserId);
  const isSysAdmin = currentUserRole === 'system_admin';

  let roleInContract: 'firstParty' | 'secondParty' | 'witness' | 'org_manager' | 'org_agent' | 'system_admin' | 'none' = 'none';
  if (isSysAdmin) roleInContract = 'system_admin';
  else if (isFirstParty) roleInContract = 'firstParty';
  else if (isSecondParty) roleInContract = 'secondParty';
  else if (isWitness) roleInContract = 'witness';
  else if (isOrgManager) roleInContract = 'org_manager';
  else if (isAssignedAgent) roleInContract = 'org_agent';

  const canView = isFirstParty || isSecondParty || isWitness || isOrgManager || isAssignedAgent || isSysAdmin;
  const canEditDraft = (isFirstParty || isSecondParty || isOrgManager || isSysAdmin) && (contract.status === 'draft' || contract.status === 'under_review' || contract.status === 'pending_approval');
  const canApprove = (isFirstParty || isSecondParty || isSysAdmin) && contract.status !== 'cancelled';
  const canSign = (isFirstParty || isSecondParty || isWitness || isSysAdmin) && (contract.status === 'approved' || contract.status === 'pending_approval');
  const canAmend = (isFirstParty || isSecondParty || isOrgManager || isSysAdmin);
  const canCancel = (isFirstParty || isSecondParty || isOrgManager || isSysAdmin) && contract.status !== 'signed';

  return {
    canView,
    canEditDraft,
    canApprove,
    canSign,
    canAmend,
    canCancel,
    roleInContract,
    isFirstParty,
    isSecondParty,
    isWitness,
    isSysAdmin
  };
}

// 1. Get Contracts (Role-filtered)
contractsRouter.get('/api/contracts', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لاستعراض العقود' });
  }

  const { bookingId, listingId, status } = req.query;
  let allContracts = db.getContracts({
    bookingId: bookingId ? String(bookingId) : undefined,
    listingId: listingId ? String(listingId) : undefined,
    status: status ? (String(status) as ContractStatus) : undefined
  });

  const currentUserId = req.currentUser.id;
  const currentUserRole = req.currentUser.role;

  if (currentUserRole !== 'system_admin') {
    allContracts = allContracts.filter(c => {
      const isFirst = c.firstParty?.id === currentUserId;
      const isSecond = c.secondParty?.id === currentUserId;
      const isWit = c.witnesses?.some(w => w.id === currentUserId);
      const listing = db.getListingById(c.listingId);
      const isAdv = listing?.advertiser?.id === currentUserId;
      const isOrg = currentUserRole === 'org_manager' && req.currentUser.orgId && listing?.advertiser?.orgId === req.currentUser.orgId;
      const isAgent = listing?.assignedAgentId === currentUserId;
      return isFirst || isSecond || isWit || isAdv || isOrg || isAgent;
    });
  }

  return res.json({ contracts: allContracts, count: allContracts.length });
});

// 2. Get Single Contract By ID
contractsRouter.get('/api/contracts/:id', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canView) {
    return res.status(403).json({ error: 'غير مصرح لك بالاطلاع على هذا العقد' });
  }

  return res.json({ contract, permissions: auth });
});

// 3. Get Contract By Booking ID
contractsRouter.get('/api/bookings/:id/contract', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const dealAuth = checkDealAuthorization(req, booking);
  if (!dealAuth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بالوصول لبيانات هذا الحجز' });
  }

  const contract = db.getContractByBookingId(booking.id);
  return res.json({ contract: contract || null, hasContract: Boolean(contract) });
});

// 4. Generate Contract Draft From Booking
contractsRouter.post('/api/bookings/:id/contract/generate', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لإنشاء مسودة العقد' });
  }

  const booking = db.getBookingById(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'الحجز غير موجود' });
  }

  const dealAuth = checkDealAuthorization(req, booking);
  if (!dealAuth.authorized) {
    return res.status(403).json({ error: 'غير مصرح لك بإنشاء عقد لهذا الحجز' });
  }

  const canGenerate = booking.status === 'active' || booking.status === 'completed' || Boolean(booking.agreedTerms);
  if (!canGenerate && req.currentUser.role !== 'system_admin') {
    return res.status(400).json({ error: 'لا يمكن إنشاء عقد لحجز غير فعال أو ملغي' });
  }

  try {
    const { customType, customClauses } = req.body || {};
    const contract = db.createContractFromBooking(
      booking.id,
      {
        id: req.currentUser.id,
        name: req.currentUser.name,
        role: req.currentUser.role
      },
      { customType, customClauses }
    );

    eventBus.emit(DALANI_EVENTS.CONTRACT_GENERATED, { contract, bookingId: booking.id });

    return res.json({
      message: 'تم إنشاء مسودة العقد الرسمي بنجاح واستيراد كافة بيانات العقار والأطراف والشروط',
      contract,
      booking: db.getBookingById(booking.id)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل إنشاء مسودة العقد' });
  }
});

// 5. Update Contract Draft
contractsRouter.put('/api/contracts/:id', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتعديل العقد' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canEditDraft && !auth.canAmend) {
    return res.status(403).json({ error: 'غير مصرح لك بتعديل هذا العقد' });
  }

  const { clauses, financialTerms, durationTerms, notes, summaryOfChanges, witnesses } = req.body;

  try {
    const result = db.updateContractDraft(
      contract.id,
      {
        clauses,
        financialTerms,
        durationTerms,
        notes,
        summaryOfChanges: summaryOfChanges || 'تعديل بنود وشروط المسودة',
        witnesses
      },
      {
        id: req.currentUser.id,
        name: req.currentUser.name,
        role: req.currentUser.role
      }
    );

    return res.json({
      message: result.wasApprovedModified
        ? 'تم تسجيل التعديل كإصدار جديد مع تعليق الاعتماد لحين موافقة الطرفين منعاً للتعديل الصامت'
        : 'تم حفظ تعديلات العقد وتوثيق الإصدار الجديد بنجاح',
      contract: result.contract,
      wasApprovedModified: result.wasApprovedModified
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل تحديث العقد' });
  }
});

// 6. Approve Contract
contractsRouter.post('/api/contracts/:id/approve', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لاعتماد العقد' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canApprove) {
    return res.status(403).json({ error: 'غير مصرح لك باعتماد هذا العقد' });
  }

  let partyType: 'firstParty' | 'secondParty' | 'admin' = 'admin';
  if (req.currentUser.role === 'system_admin') {
    partyType = req.body?.asParty || 'admin';
  } else if (auth.isFirstParty) {
    if (req.body?.asParty && req.body.asParty !== 'firstParty') {
      return res.status(403).json({ error: 'غير مصرح لك باعتماد العقد بصفة الطرف الآخر' });
    }
    partyType = 'firstParty';
  } else if (auth.isSecondParty) {
    if (req.body?.asParty && req.body.asParty !== 'secondParty') {
      return res.status(403).json({ error: 'غير مصرح لك باعتماد العقد بصفة الطرف الأول' });
    }
    partyType = 'secondParty';
  } else {
    return res.status(403).json({ error: 'غير مصرح لك باعتماد هذا العقد' });
  }

  try {
    const updated = db.approveContract(contract.id, partyType, {
      id: req.currentUser.id,
      name: req.currentUser.name,
      role: req.currentUser.role
    });

    eventBus.emit(DALANI_EVENTS.CONTRACT_APPROVED, { contract: updated, partyType });

    return res.json({
      message: 'تم تسجيل اعتمادك للعقد بنجاح',
      contract: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل اعتماد العقد' });
  }
});

// 7. Electronic Signature on Contract
contractsRouter.post('/api/contracts/:id/sign', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتوقيع العقد' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canSign) {
    return res.status(403).json({ error: 'غير مصرح لك بالتوقيع على هذا العقد' });
  }

  const { partyRole, nationalId, idGovernorate, verificationCode, signerPhone, legalDisclaimerAcknowledged } = req.body;
  let determinedRole: 'firstParty' | 'secondParty' | 'witness';

  if (req.currentUser.role === 'system_admin') {
    determinedRole = partyRole || (auth.isFirstParty ? 'firstParty' : auth.isSecondParty ? 'secondParty' : 'witness');
  } else if (auth.isFirstParty) {
    if (partyRole && partyRole !== 'firstParty') {
      return res.status(403).json({ error: 'غير مصرح لك بالتوقيع بصفة الطرف الآخر (المشتري/المستأجر)' });
    }
    determinedRole = 'firstParty';
  } else if (auth.isSecondParty) {
    if (partyRole && partyRole !== 'secondParty') {
      return res.status(403).json({ error: 'غير مصرح لك بالتوقيع بصفة الطرف الأول (البائع/المؤجر)' });
    }
    determinedRole = 'secondParty';
  } else if (auth.isWitness) {
    determinedRole = 'witness';
  } else {
    return res.status(403).json({ error: 'غير مصرح لك بالتوقيع على هذا العقد' });
  }

  try {
    const updated = db.signContract(
      contract.id,
      determinedRole,
      {
        id: req.currentUser.id,
        name: req.currentUser.name,
        role: req.currentUser.role
      },
      {
        nationalId,
        idGovernorate,
        verificationCode,
        signerPhone,
        legalDisclaimerAcknowledged
      }
    );

    eventBus.emit(DALANI_EVENTS.CONTRACT_SIGNED, { contract: updated, signerRole: determinedRole });

    return res.json({
      message: 'تم تسجيل التوقيع الإلكتروني وتوثيقه في سجل العقد بنجاح',
      contract: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل توقيع العقد' });
  }
});

// 8. Propose Contract Amendment
contractsRouter.post('/api/contracts/:id/amend', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لتقديم طلب تعديل' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canAmend) {
    return res.status(403).json({ error: 'غير مصرح لك باقتراح تعديل على هذا العقد' });
  }

  const { summaryOfChanges, clauses, financialTerms } = req.body;
  if (!summaryOfChanges || !summaryOfChanges.trim()) {
    return res.status(400).json({ error: 'يرجى تقديم ملخص وسبب التعديل المقترح' });
  }

  try {
    const updated = db.proposeContractAmendment(
      contract.id,
      {
        summaryOfChanges: summaryOfChanges.trim(),
        clauses,
        financialTerms
      },
      {
        id: req.currentUser.id,
        name: req.currentUser.name,
        role: req.currentUser.role
      }
    );

    return res.json({
      message: 'تم تسجيل مقترح التعديل وإرسال إشعار للأطراف لإعادة الاعتماد',
      contract: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل تسجيل مقترح التعديل' });
  }
});

// 9. Respond to Contract Amendment (Accept / Reject)
contractsRouter.post('/api/contracts/:id/respond-amendment', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canApprove) {
    return res.status(403).json({ error: 'غير مصرح لك بالرد على هذا التعديل' });
  }

  const { accept, reason } = req.body;

  try {
    const updated = db.respondToContractAmendment(
      contract.id,
      Boolean(accept),
      {
        id: req.currentUser.id,
        name: req.currentUser.name,
        role: req.currentUser.role
      },
      reason
    );

    return res.json({
      message: accept ? 'تم قبول التعديل واعتماد العقد رسمياً' : 'تم رفض التعديل وإشعار الأطراف',
      contract: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل معالجة الرد' });
  }
});

// 10. Cancel Contract
contractsRouter.post('/api/contracts/:id/cancel', (req: Request, res: Response) => {
  if (req.currentUser.role === 'visitor') {
    return res.status(401).json({ error: 'يجب تسجيل الدخول لإلغاء العقد' });
  }

  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'العقد غير موجود' });
  }

  const auth = checkContractAuthorization(req, contract);
  if (!auth.canCancel) {
    return res.status(403).json({ error: 'غير مصرح لك بإلغاء هذا العقد' });
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'يرجى تقديم سبب إلغاء العقد' });
  }

  try {
    const updated = db.cancelContract(contract.id, reason.trim(), {
      id: req.currentUser.id,
      name: req.currentUser.name,
      role: req.currentUser.role
    });

    return res.json({
      message: 'تم إلغاء العقد وتوثيق ذلك في سجل التدقيق والمحادثة',
      contract: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل إلغاء العقد' });
  }
});
