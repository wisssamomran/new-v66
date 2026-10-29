import { embeddedStore } from './localDatabase';
import { User, UserRole, Listing, PropertyRequest, PropertyBooking, PropertyContract, AuditLogEntry } from '../types';
import { generateClientAiResponse } from '../utils/clientAiEngine';
import { SupabaseAdapter } from './supabaseAdapter';

export async function handleLocalApiCall(
  url: string,
  options: RequestInit = {},
  currentUser: User
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const path = url.split('?')[0];
  const queryStr = url.includes('?') ? url.split('?')[1] : '';
  const query = new URLSearchParams(queryStr);

  let bodyData: any = {};
  if (options.body && typeof options.body === 'string') {
    try {
      bodyData = JSON.parse(options.body);
    } catch {}
  }

  const makeResponse = (status: number, data: any): Response => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  // Log Audit Entry
  const logAudit = (action: string, targetType: any, targetId: string, result: 'success' | 'warning' | 'denied', details: string) => {
    const auditEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId,
      result,
      details,
      ipAddress: '127.0.0.1 (Offline App)'
    };
    embeddedStore.addAuditLog(auditEntry);
    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.logAudit(auditEntry).catch(e => console.warn('[Supabase Sync Audit]:', e));
    }
  };

  // Ensure current user is synced to Supabase when active
  if (SupabaseAdapter.isConfigured() && currentUser.role !== 'visitor') {
    SupabaseAdapter.ensureUserExists(currentUser).catch(() => {});
  }

  // 1. Auth Endpoints
  if (path === '/api/auth/me') {
    return makeResponse(200, { user: currentUser, role: currentUser.role, authenticated: currentUser.role !== 'visitor' });
  }

  if (path === '/api/auth/switch-role') {
    const { role } = bodyData;
    const allUsers = embeddedStore.getUsers();
    const target = allUsers.find(u => u.role === role) || { ...currentUser, role };
    return makeResponse(200, { message: 'تم تبديل الدور بنجاح', user: target });
  }

  if (path === '/api/auth/login') {
    const { phone, role = 'seeker', name } = bodyData;
    const allUsers = embeddedStore.getUsers();
    let user = allUsers.find(u => u.role === role);
    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        name: name || 'مستخدم مسجل',
        phone: phone || '+967 770 000 000',
        phoneVerified: true,
        role: role as UserRole,
        activeStatus: true,
        createdAt: new Date().toISOString().split('T')[0]
      };
    }
    return makeResponse(200, { message: 'تم تسجيل الدخول بنجاح', user });
  }

  // 2. User Profile
  if (path === '/api/user/profile' && method === 'PUT') {
    const updated = embeddedStore.updateUser(currentUser.id, bodyData);
    return makeResponse(200, { message: 'تم تحديث الملف الشخصي بنجاح', user: updated || currentUser });
  }

  // 3. Listings Endpoints
  if (path === '/api/listings' && method === 'GET') {
    let listings = embeddedStore.getListings();
    if (currentUser.role === 'advertiser') {
      listings = listings.filter(l => l.advertiser?.id === currentUser.id);
    } else if (currentUser.role === 'seeker' || currentUser.role === 'visitor') {
      listings = listings.filter(l => l.status === 'published' && !l.isReserved);
    }
    return makeResponse(200, { listings, count: listings.length });
  }

  if (path === '/api/listings' && method === 'POST') {
    const listingData = bodyData;
    const nextSeq = embeddedStore.getListings().length + 101;
    const newListing = embeddedStore.addListing({
      ...listingData,
      id: `list-${Date.now()}`,
      listingNumber: `YEM-2026-${nextSeq}`,
      status: currentUser.role === 'system_admin' ? 'published' : 'under_review',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    });
    logAudit('إنشاء إعلان عقاري محلي', 'listing', newListing.id, 'success', `تم إنشاء الإعلان برقم ${newListing.listingNumber}`);
    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.saveListing(newListing).catch(e => console.warn('[Supabase Sync Listing]:', e));
    }
    return makeResponse(201, { message: 'تم إنشاء الإعلان بنجاح', listing: newListing });
  }

  if (path.startsWith('/api/listings/') && method === 'GET') {
    const id = path.replace('/api/listings/', '');
    const listing = embeddedStore.getListingById(id);
    if (!listing) return makeResponse(404, { error: 'العقار غير موجود' });
    return makeResponse(200, { listing });
  }

  if (path.startsWith('/api/listings/') && method === 'PUT') {
    const id = path.replace('/api/listings/', '');
    const updated = embeddedStore.updateListing(id, bodyData);
    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateListing(id, bodyData).catch(e => console.warn('[Supabase Sync Update Listing]:', e));
    }
    return makeResponse(200, { message: 'تم تحديث الإعلان بنجاح', listing: updated });
  }

  if (path.startsWith('/api/listings/') && method === 'DELETE') {
    const id = path.replace('/api/listings/', '');
    embeddedStore.deleteListing(id);
    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.deleteListing(id).catch(e => console.warn('[Supabase Sync Delete Listing]:', e));
    }
    return makeResponse(200, { message: 'تم حذف الإعلان بنجاح' });
  }

  // 4. Requests Endpoints
  if (path === '/api/requests' && method === 'GET') {
    const requests = embeddedStore.getRequests();
    return makeResponse(200, { requests, count: requests.length });
  }

  if (path === '/api/requests' && method === 'POST') {
    const { listingId, notes, requestedDurationHours = 48 } = bodyData;
    const listing = embeddedStore.getListingById(listingId);
    if (!listing) return makeResponse(404, { error: 'العقار غير موجود' });

    if (listing.isReserved) {
      return makeResponse(409, { error: 'العقار محجوز حالياً بحجز مؤقت فعال لضمان الحصرية.' });
    }

    const reqSeq = embeddedStore.getRequests().length + 1001;
    const newRequest: PropertyRequest = {
      id: `req-${Date.now()}`,
      requestNumber: `REQ-2026-${reqSeq}`,
      listingId: listing.id,
      listingTitle: listing.title,
      listingNumber: listing.listingNumber,
      listingPrice: listing.price,
      listingCurrency: listing.currency,
      seekerId: currentUser.id,
      seekerName: currentUser.name,
      seekerPhone: currentUser.phone || '+967 778 990 011',
      advertiserId: listing.advertiser.id,
      advertiserName: listing.advertiser.name,
      advertiserPhone: listing.advertiser.phone,
      requestType: 'booking_intent',
      status: 'pending',
      notes: notes || 'طلب حجز مؤقت',
      requestedDurationHours: Number(requestedDurationHours) || 48,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    embeddedStore.addRequest(newRequest);
    logAudit('إرسال طلب حجز عقار', 'request', newRequest.id, 'success', `طلب حجز على الإعلان ${listing.listingNumber}`);
    if (SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.saveRequest(newRequest).catch(e => console.warn('[Supabase Sync Request]:', e));
    }
    return makeResponse(201, { message: 'تم تقديم طلب الحجز بنجاح', request: newRequest });
  }

  if (path.endsWith('/accept') && path.startsWith('/api/requests/')) {
    const reqId = path.replace('/api/requests/', '').replace('/accept', '');
    const reqItem = embeddedStore.getRequestById(reqId);
    if (!reqItem) return makeResponse(404, { error: 'الطلب غير موجود' });

    const activeB = embeddedStore.getActiveBookingForListing(reqItem.listingId);
    if (activeB) {
      return makeResponse(409, { error: 'تعذر تأكيد الحجز: يوجد حجز مؤقت فعال على هذا العقار حالياً لضمان الحصرية بموجب قيد المنظومة.' });
    }

    const durationHours = bodyData.durationHours || 48;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();
    const bookingSeq = embeddedStore.getBookings().length + 2001;

    const newBooking: PropertyBooking = {
      id: `bkg-${Date.now()}`,
      bookingNumber: `BKG-2026-${bookingSeq}`,
      requestId: reqItem.id,
      listingId: reqItem.listingId,
      listingTitle: reqItem.listingTitle,
      listingNumber: reqItem.listingNumber,
      listingPrice: reqItem.listingPrice,
      listingCurrency: reqItem.listingCurrency,
      seekerId: reqItem.seekerId,
      seekerName: reqItem.seekerName,
      seekerPhone: reqItem.seekerPhone,
      advertiserId: reqItem.advertiserId,
      advertiserName: reqItem.advertiserName,
      advertiserPhone: reqItem.advertiserPhone,
      status: 'active',
      durationHours,
      startDate: now.toISOString(),
      expiresAt,
      confirmedBy: currentUser.name,
      createdAt: now.toISOString().split('T')[0],
      updatedAt: now.toISOString().split('T')[0]
    };

    if (SupabaseAdapter.isConfigured()) {
      const syncResult = await SupabaseAdapter.saveBooking(newBooking);
      if (!syncResult.success && syncResult.isConflict) {
        return makeResponse(409, { error: syncResult.error || 'تعذر تأكيد الحجز: هذا العقار محجوز حالياً بحجز مؤقت فعال في قاعدة البيانات.' });
      }
      if (syncResult.success) {
        SupabaseAdapter.updateRequest(reqItem.id, { status: 'accepted', bookingId: newBooking.id }).catch(e => console.warn('[Supabase Sync Request Update]:', e));
      }
    }

    embeddedStore.addBooking(newBooking);
    embeddedStore.updateRequest(reqItem.id, { status: 'accepted', bookingId: newBooking.id });
    logAudit('تأكيد الحجز المؤقت', 'booking', newBooking.id, 'success', `حجز مؤقت برقم ${newBooking.bookingNumber}`);
    return makeResponse(201, { message: 'تم تأكيد الحجز المؤقت بنجاح', booking: newBooking });
  }

  // 5. Contracts Endpoints (منظومة العقود والتوثيق القانوني المعتمد)
  if (path === '/api/contracts' && method === 'GET') {
    const contracts = embeddedStore.getContracts();
    return makeResponse(200, { contracts, count: contracts.length });
  }

  // Get contract by ID
  if (path.startsWith('/api/contracts/') && !path.includes('/approve') && !path.includes('/sign') && !path.includes('/amend') && !path.includes('/respond-amendment') && !path.includes('/cancel') && method === 'GET') {
    const cid = path.replace('/api/contracts/', '');
    const contract = embeddedStore.getContractById(cid);
    if (!contract) return makeResponse(404, { error: 'العقد غير موجود' });
    return makeResponse(200, { contract });
  }

  // Get contract by booking ID
  if (path.startsWith('/api/bookings/') && path.endsWith('/contract') && method === 'GET') {
    const bid = path.replace('/api/bookings/', '').replace('/contract', '');
    const contract = embeddedStore.getContractByBookingId(bid);
    return makeResponse(200, { contract: contract || null, hasContract: Boolean(contract) });
  }

  // Generate contract from booking
  if ((path.startsWith('/api/bookings/') && path.endsWith('/contract/generate')) || path === '/api/contracts/from-booking') {
    const bookingId = path.startsWith('/api/bookings/')
      ? path.replace('/api/bookings/', '').replace('/contract/generate', '')
      : bodyData.bookingId;

    const booking = embeddedStore.getBookingById(bookingId);
    if (!booking) return makeResponse(404, { error: 'الحجز غير موجود' });

    let contract = embeddedStore.getContractByBookingId(bookingId);
    if (!contract) {
      const nowStr = new Date().toISOString();
      const dateStr = nowStr.split('T')[0];
      const listing = embeddedStore.getListingById(booking.listingId);
      const contractType = (bodyData.customType || (listing?.purpose === 'sale' ? 'sale' : 'lease')) as 'sale' | 'lease';
      const price = booking.listingPrice || 0;
      const currency = booking.listingCurrency || 'YER';
      const deposit = Math.round(price * 0.05);

      contract = embeddedStore.addContract({
        id: `cnt-${Date.now()}`,
        contractNumber: `CNT-2026-${Math.floor(2000 + Math.random() * 8000)}`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        requestId: booking.requestId,
        listingId: booking.listingId,
        listingNumber: booking.listingNumber,
        listingTitle: booking.listingTitle,
        contractType,
        status: 'draft',
        propertySnapshot: {
          title: listing?.title || booking.listingTitle,
          propertyType: listing?.propertyType || 'apartment',
          purpose: listing?.purpose || (contractType === 'sale' ? 'sale' : 'rent'),
          governorate: listing?.location?.governorate || 'صنعاء',
          city: listing?.location?.city || 'صنعاء',
          district: listing?.location?.district || 'حدة',
          street: listing?.location?.street || 'الشارع الرئيسي',
          area: listing?.area || 180,
          areaUnit: listing?.areaUnit || 'م²',
          deedNumber: listing?.deedNumber || 'بصيرة شرعية مقيدة بالسجل العقاري المعتمد'
        },
        firstParty: {
          id: booking.advertiserId,
          name: booking.advertiserName,
          phone: booking.advertiserPhone,
          role: contractType === 'sale' ? 'seller' : 'lessor',
          nationalIdOrPassport: 'بطاقة شخصية صادرة من الجمهورية اليمنية',
          signatureStatus: 'unsigned'
        },
        secondParty: {
          id: booking.seekerId,
          name: booking.seekerName,
          phone: booking.seekerPhone,
          role: contractType === 'sale' ? 'buyer' : 'lessee',
          nationalIdOrPassport: 'بطاقة شخصية صادرة من الجمهورية اليمنية',
          signatureStatus: 'unsigned'
        },
        witnesses: [
          {
            id: 'wit-1',
            name: 'فضيلة الشيخ / القاضي الأمين الشرعي المعتمد',
            phone: '+967 771 000 111',
            role: 'witness',
            nationalIdOrPassport: 'ترخيص توثيق شرعي صادر عن وزارة العدل',
            signatureStatus: 'unsigned'
          },
          {
            id: 'wit-2',
            name: 'شاهد إثبات ثانٍ',
            phone: '+967 772 000 222',
            role: 'witness',
            nationalIdOrPassport: 'بطاقة شخصية سارية',
            signatureStatus: 'unsigned'
          }
        ],
        financialTerms: {
          totalAmount: price,
          currency,
          depositAmount: deposit,
          depositCurrency: currency,
          paymentSchedule: contractType === 'lease'
            ? 'سداد مبلغ التأمين والضمانة، وتسليم الأجرة مقدماً بموجب سند قبض رسمي'
            : 'سداد العربون، وتسليم المتبقي بشيك مصرفي مصدق عند الإفراغ والتسليم'
        },
        clauses: [
          { id: 'cls-1', number: 1, title: 'التمهيد وأهلية التعاقد', content: 'يقر الطرفان بأهليتهما الشرعية والقانونية المعتبرة شرعاً للتعاقد والتصرف النافي للجهالة.', isMandatory: true },
          { id: 'cls-2', number: 2, title: 'محل العقد والمعاينة النافية للجهالة', content: 'عاين الطرف الثاني العقار المعاينة الشرعية التامة النافية للجهالة وقبله بحالته الراهنة.', isMandatory: true },
          { id: 'cls-3', number: 3, title: 'الثمن وطريقة السداد والمخالصة', content: `اتفق الطرفان على القيمة الإجمالية وقدرها [${price.toLocaleString()} ${currency}] تسدد وفق جدول الدفعات المتفق عليه.`, isMandatory: true },
          { id: 'cls-4', number: 4, title: 'التسليم والمسؤولية القانونية والتوثيق', content: 'يلتزم الطرف الأول بتسليم العقار خالياً من أي شواغل أو حقوق عينية للغير، مع تسليم أصول وثائق الملكية.', isMandatory: true }
        ],
        currentVersion: 1,
        versionHistory: [
          {
            version: 1,
            createdAt: nowStr,
            createdBy: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
            summaryOfChanges: 'إنشاء مسودة العقد واستيراد كافة بيانات الحجز والشروط ومواصفات العقار',
            clauses: [
              { id: 'cls-1', number: 1, title: 'التمهيد وأهلية التعاقد', content: 'يقر الطرفان بأهليتهما الشرعية والقانونية المعتبرة شرعاً للتعاقد والتصرف النافي للجهالة.', isMandatory: true },
              { id: 'cls-2', number: 2, title: 'محل العقد والمعاينة النافية للجهالة', content: 'عاين الطرف الثاني العقار المعاينة الشرعية التامة النافية للجهالة وقبله بحالته الراهنة.', isMandatory: true },
              { id: 'cls-3', number: 3, title: 'الثمن وطريقة السداد والمخالصة', content: `اتفق الطرفان على القيمة الإجمالية وقدرها [${price.toLocaleString()} ${currency}] تسدد وفق جدول الدفعات المتفق عليه.`, isMandatory: true },
              { id: 'cls-4', number: 4, title: 'التسليم والمسؤولية القانونية والتوثيق', content: 'يلتزم الطرف الأول بتسليم العقار خالياً من أي شواغل أو حقوق عينية للغير، مع تسليم أصول وثائق الملكية.', isMandatory: true }
            ],
            financialTerms: {
              totalAmount: price,
              currency,
              depositAmount: deposit,
              paymentSchedule: contractType === 'lease'
                ? 'سداد مبلغ التأمين والضمانة، وتسليم الأجرة مقدماً بموجب سند قبض رسمي'
                : 'سداد العربون، وتسليم المتبقي بشيك مصرفي مصدق عند الإفراغ والتسليم'
            },
            status: 'draft'
          }
        ],
        createdAt: dateStr,
        updatedAt: dateStr
      });

      embeddedStore.updateBooking(booking.id, { contractId: contract.id, contractNumber: contract.contractNumber, dealStage: 'contract_completed' });

      if (SupabaseAdapter.isConfigured()) {
        SupabaseAdapter.saveContract(contract).catch(e => console.warn('[Supabase Sync Contract]:', e));
      }
      logAudit('إنشاء مسودة العقد', 'contract', contract.id, 'success', `إنشاء مسودة العقد ${contract.contractNumber}`);
    }

    return makeResponse(201, { message: 'تم إنشاء مسودة العقد بنجاح', contract });
  }

  // Update contract draft
  if (path.startsWith('/api/contracts/') && !path.includes('/approve') && !path.includes('/sign') && !path.includes('/amend') && !path.includes('/respond-amendment') && !path.includes('/cancel') && method === 'PUT') {
    const cid = path.replace('/api/contracts/', '');
    const contract = embeddedStore.getContractById(cid);
    if (!contract) return makeResponse(404, { error: 'العقد غير موجود' });

    const wasApproved = contract.status === 'approved' || contract.status === 'signed';
    const newVersion = (contract.currentVersion || 1) + 1;

    const updates: Partial<PropertyContract> = {
      ...bodyData,
      currentVersion: newVersion,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (wasApproved) {
      updates.status = 'pending_approval';
      updates.firstPartyApproval = false;
      updates.secondPartyApproval = false;
      updates.isModificationPendingApproval = true;
      updates.modificationRequestedBy = currentUser.name;
      updates.modificationReason = bodyData.summaryOfChanges || 'تعديل بنود العقد المعتمد';
    }

    const updated = embeddedStore.updateContract(cid, updates);
    if (updated && SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateContract(cid, updated).catch(e => console.warn('[Supabase Sync Update Contract]:', e));
    }
    logAudit('تحديث بنود العقد', 'contract', cid, 'success', `تحديث العقد إلى الإصدار ${newVersion}`);
    return makeResponse(200, { message: 'تم تحديث العقد بنجاح', contract: updated, wasApprovedModified: wasApproved });
  }

  // Approve contract (اعتماد العقد الرسمي)
  if (path.startsWith('/api/contracts/') && path.endsWith('/approve') && method === 'POST') {
    const cid = path.replace('/api/contracts/', '').replace('/approve', '');
    const contract = embeddedStore.getContractById(cid);
    if (!contract) return makeResponse(404, { error: 'العقد غير موجود' });

    const nowStr = new Date().toISOString();
    const currVer = contract.currentVersion || 1;
    const asParty = bodyData.asParty;

    const isFirst = asParty === 'firstParty' || currentUser.id === contract.firstParty?.id || currentUser.role === 'advertiser';
    const isSecond = asParty === 'secondParty' || currentUser.id === contract.secondParty?.id || currentUser.role === 'seeker';
    const isAdmin = currentUser.role === 'system_admin' || asParty === 'admin';

    let firstApproval = contract.firstPartyApproval;
    let secondApproval = contract.secondPartyApproval;
    let firstApprovedAt = contract.firstPartyApprovedAt;
    let secondApprovedAt = contract.secondPartyApprovedAt;

    if (isFirst || isAdmin) {
      firstApproval = true;
      firstApprovedAt = nowStr;
    }
    if (isSecond || isAdmin) {
      secondApproval = true;
      secondApprovedAt = nowStr;
    }

    const bothApproved = (firstApproval && secondApproval) || isAdmin;
    const newStatus = bothApproved ? 'approved' : 'pending_approval';

    const updated = embeddedStore.updateContract(cid, {
      firstPartyApproval: firstApproval,
      firstPartyApprovedAt: firstApprovedAt,
      firstPartyApprovedVersion: currVer,
      secondPartyApproval: secondApproval,
      secondPartyApprovedAt: secondApprovedAt,
      secondPartyApprovedVersion: currVer,
      status: newStatus,
      approvedAt: bothApproved ? nowStr : contract.approvedAt,
      approvedBy: bothApproved ? currentUser.name : contract.approvedBy,
      isModificationPendingApproval: false
    });

    if (updated && SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateContract(cid, updated).catch(e => console.warn('[Supabase Sync Approve Contract]:', e));
    }

    logAudit('اعتماد العقد', 'contract', cid, 'success', `اعتماد العقد ${contract.contractNumber} - الحالة: ${newStatus}`);
    return makeResponse(200, {
      message: bothApproved ? 'تم اعتماد العقد رسمياً من الطرفين وبات جاهزاً للتوقيع والتوثيق' : 'تم تسجيل اعتمادك للعقد بنجاح',
      contract: updated
    });
  }

  // Sign contract (التوقيع الإلكتروني المعتمد برقم الهوية)
  if (path.startsWith('/api/contracts/') && path.endsWith('/sign') && method === 'POST') {
    const cid = path.replace('/api/contracts/', '').replace('/sign', '');
    const contract = embeddedStore.getContractById(cid);
    if (!contract) return makeResponse(404, { error: 'العقد غير موجود' });

    const nowStr = new Date().toISOString();
    const currVer = contract.currentVersion || 1;
    const { partyRole = 'firstParty', nationalId = '', idGovernorate = 'صنعاء', signerPhone = '' } = bodyData;
    const digitalFingerprint = `SIG-YE-v${currVer}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const sigRecord = {
      id: `sig-${Date.now()}`,
      partyRole,
      signerId: currentUser.id,
      signerName: currentUser.name,
      signerPhone: signerPhone || currentUser.phone || '+967 770 000 000',
      nationalIdOrPassport: nationalId || '1010049281',
      idGovernorate,
      contractVersion: currVer,
      signedAt: nowStr,
      verificationCode: `OTP-${Math.floor(100000 + Math.random() * 900000)}`,
      digitalFingerprint,
      legalDisclaimerAcknowledged: true,
      ipAddress: '127.0.0.1'
    };

    const existingSignatures = Array.isArray(contract.electronicSignatures) ? contract.electronicSignatures : [];
    const signatures = [...existingSignatures.filter(s => s.partyRole !== partyRole), sigRecord];

    const updatedFirstParty = { ...contract.firstParty };
    const updatedSecondParty = { ...contract.secondParty };

    if (partyRole === 'firstParty' || currentUser.id === contract.firstParty?.id || currentUser.role === 'advertiser') {
      updatedFirstParty.signatureStatus = 'signed';
      updatedFirstParty.signedAt = nowStr;
      if (nationalId) updatedFirstParty.nationalIdOrPassport = nationalId;
    }
    if (partyRole === 'secondParty' || currentUser.id === contract.secondParty?.id || currentUser.role === 'seeker') {
      updatedSecondParty.signatureStatus = 'signed';
      updatedSecondParty.signedAt = nowStr;
      if (nationalId) updatedSecondParty.nationalIdOrPassport = nationalId;
    }

    const bothSigned = (updatedFirstParty.signatureStatus === 'signed' && updatedSecondParty.signatureStatus === 'signed') || currentUser.role === 'system_admin';
    const newStatus = bothSigned ? 'signed' : contract.status;

    const updated = embeddedStore.updateContract(cid, {
      firstParty: updatedFirstParty,
      secondParty: updatedSecondParty,
      electronicSignatures: signatures,
      status: newStatus,
      signedAt: bothSigned ? nowStr : contract.signedAt,
      firstPartySignedVersion: currVer,
      secondPartySignedVersion: currVer
    });

    if (bothSigned && contract.bookingId) {
      embeddedStore.updateBooking(contract.bookingId, { dealStage: 'contract_completed' });
    }

    if (updated && SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateContract(cid, updated).catch(e => console.warn('[Supabase Sync Sign Contract]:', e));
    }

    logAudit('توقيع العقد إلكترونياً', 'contract', cid, 'success', `توقيع إلكتروني موثق على العقد ${contract.contractNumber}`);
    return makeResponse(200, {
      message: bothSigned ? 'اكتمل توقيع الطرفين على العقد رسمياً وأصبح جاهزاً للطباعة والتوثيق النهائي' : 'تم تسجيل التوقيع وتوثيقه بنجاح',
      contract: updated
    });
  }

  // Amend contract
  if (path.startsWith('/api/contracts/') && path.endsWith('/amend') && method === 'POST') {
    const cid = path.replace('/api/contracts/', '').replace('/amend', '');
    const contract = embeddedStore.getContractById(cid);
    if (!contract) return makeResponse(404, { error: 'العقد غير موجود' });

    const newVer = (contract.currentVersion || 1) + 1;
    const updated = embeddedStore.updateContract(cid, {
      currentVersion: newVer,
      status: 'pending_approval',
      firstPartyApproval: false,
      secondPartyApproval: false,
      isModificationPendingApproval: true,
      modificationRequestedBy: currentUser.name,
      modificationReason: bodyData.summaryOfChanges || 'طلب تعديل بنود العقد',
      clauses: bodyData.clauses || contract.clauses,
      financialTerms: bodyData.financialTerms || contract.financialTerms
    });

    if (updated && SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateContract(cid, updated).catch(e => console.warn('[Supabase Sync Amend Contract]:', e));
    }
    return makeResponse(200, { message: 'تم تقديم طلب التعديل بنجاح', contract: updated });
  }

  // Respond to amendment
  if (path.startsWith('/api/contracts/') && path.endsWith('/respond-amendment') && method === 'POST') {
    const cid = path.replace('/api/contracts/', '').replace('/respond-amendment', '');
    const contract = embeddedStore.getContractById(cid);
    if (!contract) return makeResponse(404, { error: 'العقد غير موجود' });

    const { accept } = bodyData;
    const updated = embeddedStore.updateContract(cid, {
      isModificationPendingApproval: false,
      status: accept ? 'approved' : 'pending_approval'
    });

    if (updated && SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateContract(cid, updated).catch(e => console.warn('[Supabase Sync Respond Amendment]:', e));
    }
    return makeResponse(200, { message: accept ? 'تم قبول التعديل واعتماد العقد' : 'تم رفض التعديل', contract: updated });
  }

  // Cancel contract
  if (path.startsWith('/api/contracts/') && path.endsWith('/cancel') && method === 'POST') {
    const cid = path.replace('/api/contracts/', '').replace('/cancel', '');
    const updated = embeddedStore.updateContract(cid, { status: 'cancelled' });
    if (updated && SupabaseAdapter.isConfigured()) {
      SupabaseAdapter.updateContract(cid, updated).catch(e => console.warn('[Supabase Sync Cancel Contract]:', e));
    }
    return makeResponse(200, { message: 'تم إلغاء العقد بنجاح', contract: updated });
  }

  // 6. Local Admin Endpoints
  if (path === '/api/admin/users') {
    const users = embeddedStore.getUsers();
    return makeResponse(200, { users, count: users.length });
  }

  if (path === '/api/admin/staff' && method === 'GET') {
    const staff = embeddedStore.getStaff();
    return makeResponse(200, { staff, count: staff.length });
  }

  if (path === '/api/admin/staff' && method === 'POST') {
    const newStaff = embeddedStore.addStaff(bodyData);
    logAudit('إنشاء موظف محلياً', 'staff', newStaff.id, 'success', `إنشاء موظف ${newStaff.name}`);
    return makeResponse(201, { message: 'تم إنشاء الموظف بنجاح', staff: newStaff });
  }

  if (path.includes('/api/admin/staff/') && path.endsWith('/status')) {
    const id = path.replace('/api/admin/staff/', '').replace('/status', '');
    const updated = embeddedStore.toggleStaffStatus(id);
    return makeResponse(200, { message: 'تم تحديث حالة الموظف بنجاح', staff: updated });
  }

  if (path.includes('/api/admin/staff/') && path.endsWith('/permissions')) {
    const id = path.replace('/api/admin/staff/', '').replace('/permissions', '');
    const updated = embeddedStore.updateStaffPermissions(id, bodyData.permissions || []);
    return makeResponse(200, { message: 'تم تحديث الصلاحيات بنجاح', staff: updated });
  }

  if (path === '/api/admin/roles-matrix' && method === 'GET') {
    return makeResponse(200, { rolesMatrix: embeddedStore.getRolesMatrix() });
  }

  if (path === '/api/admin/roles-matrix' && method === 'PUT') {
    const matrix = embeddedStore.updateRolesMatrix(bodyData.rolesMatrix || bodyData);
    return makeResponse(200, { message: 'تم حفظ مصفوفة الصلاحيات', rolesMatrix: matrix });
  }

  if (path === '/api/admin/sessions') {
    const sessions = embeddedStore.getActiveSessions();
    return makeResponse(200, { sessions, count: sessions.length });
  }

  if (path.startsWith('/api/admin/sessions/') && method === 'DELETE') {
    const sid = path.replace('/api/admin/sessions/', '');
    embeddedStore.terminateSession(sid);
    return makeResponse(200, { message: 'تم إنهاء الجلسة بنجاح' });
  }

  if (path === '/api/admin/security/threats') {
    const threats = embeddedStore.getThreats();
    return makeResponse(200, { threats, count: threats.length });
  }

  if (path === '/api/admin/security/blocked-ips') {
    const blockedIps = embeddedStore.getBlockedIps();
    return makeResponse(200, { blockedIps, count: blockedIps.length });
  }

  if (path === '/api/admin/security/block-ip') {
    const blocked = embeddedStore.blockIp(bodyData.ip, bodyData.reason, currentUser.name);
    return makeResponse(200, { message: 'تم حظر الـ IP بنجاح', blocked });
  }

  if (path === '/api/admin/security/unblock-ip') {
    embeddedStore.unblockIp(bodyData.ip);
    return makeResponse(200, { message: 'تم فك الحظر بنجاح' });
  }

  if (path === '/api/admin/settings' && method === 'GET') {
    return makeResponse(200, { settings: embeddedStore.getSystemSettings() });
  }

  if (path === '/api/admin/settings' && method === 'PUT') {
    const settings = embeddedStore.updateSystemSettings(bodyData);
    return makeResponse(200, { message: 'تم حفظ الإعدادات', settings });
  }

  if (path === '/api/admin/feature-flags') {
    return makeResponse(200, { featureFlags: embeddedStore.getFeatureFlags() });
  }

  if (path.includes('/api/admin/feature-flags/') && path.endsWith('/toggle')) {
    const key = path.replace('/api/admin/feature-flags/', '').replace('/toggle', '');
    const flag = embeddedStore.toggleFeatureFlag(key);
    return makeResponse(200, { message: 'تم تغيير حالة الميزة', flag });
  }

  if (path === '/api/admin/backups') {
    return makeResponse(200, { backups: embeddedStore.getBackups() });
  }

  if (path === '/api/admin/backups/create') {
    const backup = embeddedStore.createBackup(currentUser.name, bodyData.notes);
    return makeResponse(201, { message: 'تم إنشاء النسخة الاحتياطية', backup });
  }

  if (path === '/api/admin/backups/restore') {
    const res = embeddedStore.restoreBackup(bodyData.backupId, currentUser.name);
    return makeResponse(200, res);
  }

  if (path === '/api/admin/system/errors') {
    return makeResponse(200, { errors: embeddedStore.getSystemErrors() });
  }

  if (path.includes('/api/admin/system/errors/') && path.endsWith('/resolve')) {
    const id = path.replace('/api/admin/system/errors/', '').replace('/resolve', '');
    const err = embeddedStore.resolveSystemError(id, currentUser.name);
    return makeResponse(200, { message: 'تم معالجة الخطأ', error: err });
  }

  if (path === '/api/admin/database/integrity-check') {
    return makeResponse(200, { report: embeddedStore.checkDataIntegrity() });
  }

  if (path === '/api/admin/database/repair') {
    const result = embeddedStore.repairDataIntegrity();
    return makeResponse(200, { message: 'تم إصلاح قاعدة البيانات', result });
  }

  if (path === '/api/admin/integrations') {
    return makeResponse(200, { integrations: embeddedStore.getIntegrations() });
  }

  if (path.includes('/api/admin/integrations/') && path.endsWith('/ping')) {
    const id = path.replace('/api/admin/integrations/', '').replace('/ping', '');
    const updated = embeddedStore.updateIntegrationStatus(id, { status: 'online', latencyMs: 45 });
    return makeResponse(200, { message: 'تم فحص الاتصال بنجاح', integration: updated });
  }

  if (path === '/api/admin/escalations') {
    return makeResponse(200, { escalations: embeddedStore.getEscalations() });
  }

  if (path.includes('/api/admin/escalations/') && path.endsWith('/resolve')) {
    const id = path.replace('/api/admin/escalations/', '').replace('/resolve', '');
    const resolved = embeddedStore.resolveEscalation(id, bodyData.status, bodyData.notes);
    return makeResponse(200, { message: 'تم تسجيل القرار الإداري', escalation: resolved });
  }

  if (path === '/api/admin/reports/summary') {
    return makeResponse(200, {
      summary: {
        totalListings: embeddedStore.getListings().length,
        publishedListings: embeddedStore.getListings().filter(l => l.status === 'published').length,
        totalUsers: embeddedStore.getUsers().length,
        activeStaff: embeddedStore.getStaff().filter(s => s.activeStatus).length,
        totalStaff: embeddedStore.getStaff().length,
        totalOrganizations: embeddedStore.getOrganizations().length,
        openReports: embeddedStore.getReports().filter(r => r.status === 'new').length,
        openTickets: embeddedStore.getTickets().filter(t => t.status === 'open').length,
        blockedIpsCount: embeddedStore.getBlockedIps().length,
        activeSessionsCount: embeddedStore.getActiveSessions().length,
        securityThreatsCount: embeddedStore.getThreats().length,
        systemHealth: '100% Operational',
        lastBackupAt: embeddedStore.getBackups()[0]?.createdAt || '2026-10-28 02:00'
      }
    });
  }

  // 7. Local Offline AI Assistant Endpoint
  if (path === '/api/ai/chat' && method === 'POST') {
    const { message, currentView } = bodyData;
    const aiResponse = generateClientAiResponse(currentUser, message || '', currentView || 'home');
    return makeResponse(200, {
      success: true,
      response: aiResponse.text,
      modelUsed: aiResponse.modelUsed,
      navigationSuggestions: aiResponse.navigationSuggestions
    });
  }

  // 8. Fallback for any other API route
  return makeResponse(200, { success: true, message: 'عملية أوفلاين مكتملة محلياً' });
}
