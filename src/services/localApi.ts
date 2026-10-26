import { embeddedStore } from './localDatabase';
import { User, UserRole, Listing, PropertyRequest, PropertyBooking, PropertyContract } from '../types';
import { generateClientAiResponse } from '../utils/clientAiEngine';

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
    embeddedStore.addAuditLog({
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
    });
  };

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
    return makeResponse(200, { message: 'تم تحديث الإعلان بنجاح', listing: updated });
  }

  if (path.startsWith('/api/listings/') && method === 'DELETE') {
    const id = path.replace('/api/listings/', '');
    embeddedStore.deleteListing(id);
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
    return makeResponse(201, { message: 'تم تقديم طلب الحجز بنجاح', request: newRequest });
  }

  if (path.endsWith('/accept') && path.startsWith('/api/requests/')) {
    const reqId = path.replace('/api/requests/', '').replace('/accept', '');
    const reqItem = embeddedStore.getRequestById(reqId);
    if (!reqItem) return makeResponse(404, { error: 'الطلب غير موجود' });

    const activeB = embeddedStore.getActiveBookingForListing(reqItem.listingId);
    if (activeB) {
      return makeResponse(409, { error: 'يوجد حجز مؤقت فعال على هذا العقار حالياً.' });
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

    embeddedStore.addBooking(newBooking);
    embeddedStore.updateRequest(reqItem.id, { status: 'accepted', bookingId: newBooking.id });
    logAudit('تأكيد الحجز المؤقت', 'booking', newBooking.id, 'success', `حجز مؤقت برقم ${newBooking.bookingNumber}`);
    return makeResponse(201, { message: 'تم تأكيد الحجز المؤقت بنجاح', booking: newBooking });
  }

  // 5. Contracts Endpoints
  if (path === '/api/contracts' && method === 'GET') {
    const contracts = embeddedStore.getContracts();
    return makeResponse(200, { contracts });
  }

  if (path === '/api/contracts/from-booking' && method === 'POST') {
    const { bookingId } = bodyData;
    const booking = embeddedStore.getBookingById(bookingId);
    if (!booking) return makeResponse(404, { error: 'الحجز غير موجود' });

    let contract = embeddedStore.getContractByBookingId(bookingId);
    if (!contract) {
      const nowStr = new Date().toISOString();
      const dateStr = nowStr.split('T')[0];
      contract = embeddedStore.addContract({
        id: `cnt-${Date.now()}`,
        contractNumber: `CNT-2026-${Math.floor(2000 + Math.random() * 8000)}`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        requestId: booking.requestId,
        listingId: booking.listingId,
        listingNumber: booking.listingNumber,
        listingTitle: booking.listingTitle,
        contractType: 'sale',
        status: 'draft',
        propertySnapshot: {
          title: booking.listingTitle,
          propertyType: 'apartment',
          purpose: 'sale',
          governorate: 'صنعاء',
          city: 'صنعاء',
          district: 'حدة',
          area: 200,
          areaUnit: 'م²'
        },
        firstParty: {
          id: booking.advertiserId,
          name: booking.advertiserName,
          phone: booking.advertiserPhone,
          role: 'seller',
          signatureStatus: 'unsigned'
        },
        secondParty: {
          id: booking.seekerId,
          name: booking.seekerName,
          phone: booking.seekerPhone,
          role: 'buyer',
          signatureStatus: 'unsigned'
        },
        financialTerms: {
          totalAmount: booking.listingPrice,
          currency: booking.listingCurrency,
          depositAmount: Math.round(booking.listingPrice * 0.05),
          paymentSchedule: 'دفعة نقداً والباقي بشيك مصدق عند الإفراغ والتسليم'
        },
        clauses: [
          { id: 'cls-1', number: 1, title: 'التمهيد وأهلية التعاقد', content: 'يقر الطرفان بأهليتهما الشرعية والقانونية المعتبرة شرعاً للتعاقد والتصرف النافي للجهالة.', isMandatory: true },
          { id: 'cls-2', number: 2, title: 'محل العقد والمعاينة', content: 'عاين المشتري العقار المبيع المعاينة الشرعية النافية للجهالة وقبله بحالته الراهنة.', isMandatory: true }
        ],
        currentVersion: 1,
        versionHistory: [],
        createdAt: dateStr,
        updatedAt: dateStr
      });
    }

    return makeResponse(201, { message: 'تم إنشاء مسودة العقد بنجاح', contract });
  }

  // 6. Local Offline AI Assistant Endpoint
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

  // 7. Fallback for any other API route
  return makeResponse(200, { success: true, message: 'عملية أوفلاين مكتملة محلياً' });
}
