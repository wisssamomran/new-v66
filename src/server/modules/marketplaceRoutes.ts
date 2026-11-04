/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * خادم النظام الفرعي 3: السوق العقاري والعروض والتسويق (Real Estate Marketplace Server Routes)
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { marketplaceRepository } from './marketplace/marketplaceRepository';
import { requireRoles, validateYemeniPhone, sanitizeListingForUser, recordAuditLog } from '../rbac';
import { Listing, ListingStatus } from '../../types';

export const marketplaceRouter = Router();

// 1. Get All Public / Role-Filtered Listings
marketplaceRouter.get('/api/listings', (req: Request, res: Response) => {
  const {
    purpose,
    propertyType,
    governorate,
    city,
    district,
    status,
    search,
    scope,
    adminMap,
    agentId,
    minPrice,
    maxPrice,
    currency
  } = req.query;

  const listings = marketplaceRepository.getListings();
  let filtered = listings;
  const userRole = req.currentUser.role;
  const userId = req.currentUser.id;
  const isAdminView = adminMap === 'true' || scope === 'my_ads' || scope === 'org_ads' || scope === 'assigned';
  const isPrivilegedOrStaff = ['moderator', 'verifier', 'reporter_admin', 'support', 'accountant', 'operations_manager', 'system_admin'].includes(userRole);
  const isManagingParty = ['advertiser', 'org_manager', 'org_agent'].includes(userRole);
  const effectiveAdminView = Boolean(isAdminView && (isPrivilegedOrStaff || isManagingParty));

  // 1. Role Scopes & Authorization Rules:
  if (!effectiveAdminView) {
    filtered = filtered.filter(l => l.status === 'published' && !l.isReserved);
  } else if (userRole === 'advertiser') {
    filtered = filtered.filter(l => l.advertiser?.id === userId);
    if (status && status !== 'all') {
      if (status === 'unpublished') {
        filtered = filtered.filter(l => l.status !== 'published');
      } else if (status === 'reserved') {
        filtered = filtered.filter(l => l.isReserved === true);
      } else {
        filtered = filtered.filter(l => l.status === status);
      }
    }
  } else if (userRole === 'org_manager') {
    filtered = filtered.filter(l =>
      l.advertiser?.id === userId ||
      (req.currentUser.orgId && l.advertiser?.orgId === req.currentUser.orgId)
    );
    if (agentId && agentId !== 'all') {
      filtered = filtered.filter(l => l.assignedAgentId === agentId || l.advertiser?.id === agentId);
    }
    if (status && status !== 'all') {
      if (status === 'unpublished') {
        filtered = filtered.filter(l => l.status !== 'published');
      } else {
        filtered = filtered.filter(l => l.status === status);
      }
    }
  } else if (userRole === 'org_agent') {
    filtered = filtered.filter(l => l.assignedAgentId === userId || l.advertiser?.id === userId);
    if (status && status !== 'all') {
      filtered = filtered.filter(l => l.status === status);
    }
  } else if (['moderator', 'verifier', 'reporter_admin', 'support', 'accountant', 'operations_manager', 'system_admin'].includes(userRole)) {
    if (status && status !== 'all') {
      filtered = filtered.filter(l => l.status === status);
    }
  } else {
    filtered = filtered.filter(l => l.status === 'published');
  }

  // 2. Common Filter Conditions
  if (purpose && purpose !== 'all') {
    filtered = filtered.filter(l => l.purpose === purpose);
  }

  if (propertyType && propertyType !== 'all') {
    filtered = filtered.filter(l => l.propertyType === propertyType);
  }

  if (governorate && governorate !== 'all') {
    const govStr = String(governorate).trim();
    filtered = filtered.filter(l => {
      const g = l.location.governorate;
      if (govStr.includes('صنعاء')) return g.includes('صنعاء');
      if (govStr.includes('إب') || govStr.includes('اب')) return g.includes('إب') || g.includes('اب');
      if (govStr.includes('ذمار')) return g.includes('ذمار');
      if (govStr.includes('عدن')) return g.includes('عدن');
      if (govStr.includes('تعز')) return g.includes('تعز');
      if (govStr.includes('حضرموت')) return g.includes('حضرموت');
      if (govStr.includes('مأرب') || govStr.includes('مارب')) return g.includes('مأرب') || g.includes('مارب');
      return g.includes(govStr);
    });
  }

  if (city && city !== 'all') {
    const cStr = String(city).trim().toLowerCase();
    filtered = filtered.filter(l => l.location.city.toLowerCase().includes(cStr));
  }

  if (district && district !== 'all') {
    const dStr = String(district).trim().toLowerCase();
    filtered = filtered.filter(l => l.location.district.toLowerCase().includes(dStr));
  }

  if (currency && currency !== 'all') {
    filtered = filtered.filter(l => l.currency === currency);
  }

  if (minPrice) {
    const minP = Number(minPrice);
    if (!isNaN(minP)) {
      filtered = filtered.filter(l => l.price >= minP);
    }
  }

  if (maxPrice) {
    const maxP = Number(maxPrice);
    if (!isNaN(maxP)) {
      filtered = filtered.filter(l => l.price <= maxP);
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(l =>
      l.title.toLowerCase().includes(s) ||
      l.description.toLowerCase().includes(s) ||
      l.location.district.toLowerCase().includes(s) ||
      l.location.city.toLowerCase().includes(s) ||
      l.listingNumber.toLowerCase().includes(s)
    );
  }

  const sanitized = filtered.map(l => sanitizeListingForUser(l, req.currentUser));
  return res.json({ listings: sanitized, count: sanitized.length });
});

// 2. Get My Ads
marketplaceRouter.get(
  '/api/listings/my-ads',
  requireRoles('advertiser', 'org_manager', 'org_agent', 'system_admin'),
  (req: Request, res: Response) => {
    const allListings = marketplaceRepository.getListings();
    let myListings: Listing[];

    if (req.currentUser.role === 'system_admin') {
      myListings = allListings;
    } else if (req.currentUser.role === 'org_manager') {
      myListings = allListings.filter(
        l => l.advertiser.id === req.currentUser.id || (req.currentUser.orgId && l.advertiser.orgId === req.currentUser.orgId)
      );
    } else if (req.currentUser.role === 'org_agent') {
      myListings = allListings.filter(
        l => l.assignedAgentId === req.currentUser.id || l.advertiser.id === req.currentUser.id
      );
    } else {
      myListings = allListings.filter(l => l.advertiser.id === req.currentUser.id);
    }

    return res.json({ listings: myListings });
  }
);

// 3. Get Single Listing By ID
marketplaceRouter.get('/api/listings/:id', (req: Request, res: Response) => {
  const listing = marketplaceRepository.getListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'العقار غير موجود' });
  }

  // قاعدة حصرية العقار المحجوز
  if (listing.isReserved) {
    const isOwner = listing.advertiser?.id === req.currentUser.id;
    const isOrgManager = req.currentUser.role === 'org_manager' && req.currentUser.orgId && listing.advertiser?.orgId === req.currentUser.orgId;
    const isAssignedAgent = listing.assignedAgentId === req.currentUser.id;
    const isStaff = ['system_admin', 'moderator', 'verifier', 'reporter_admin', 'support', 'accountant', 'operations_manager'].includes(req.currentUser.role);
    const activeB = listing.activeBookingId ? db.getBookingById(listing.activeBookingId) : db.getActiveBookingForListing(listing.id);
    const isReservingSeeker = activeB ? activeB.seekerId === req.currentUser.id : false;

    if (!isOwner && !isOrgManager && !isAssignedAgent && !isStaff && !isReservingSeeker) {
      recordAuditLog(
        req.currentUser,
        'محاولة وصول لعقار محجوز حصرياً',
        'listing',
        listing.id,
        'denied',
        `تم حظر المستخدم [${req.currentUser.name} - ${req.currentUser.role}] من الوصول المباشر للعقار المحجوز [${listing.listingNumber}] بموجب قاعدة الحصرية.`
      );

      return res.status(403).json({
        error: 'هذا العقار محجوز حصرياً وغير متاح للعرض حالياً بموجب سياسة حصرية الحجز المؤقت في منصة دلنّي.',
        isReserved: true,
        reservedUntil: listing.reservedUntil
      });
    }
  }

  // Record view count
  marketplaceRepository.updateListing(listing.id, { viewsCount: (listing.viewsCount || 0) + 1 });

  const sanitized = sanitizeListingForUser(listing, req.currentUser);
  return res.json({ listing: sanitized });
});

// 4. Create New Listing
marketplaceRouter.post(
  '/api/listings',
  requireRoles('advertiser', 'org_manager', 'org_agent', 'seeker', 'system_admin'),
  (req: Request, res: Response) => {
    const data = req.body;

    const advertiserPhone = data.advertiser?.phone || req.currentUser.phone;
    const phoneCheck = validateYemeniPhone(advertiserPhone);
    if (!phoneCheck.isValid) {
      return res.status(422).json({
        error: phoneCheck.error,
        field: 'phone'
      });
    }

    let targetStatus: ListingStatus = 'under_review';
    if (data.status === 'draft') {
      targetStatus = 'draft';
    } else if (data.status === 'published') {
      if (req.currentUser.role !== 'system_admin' && req.currentUser.role !== 'moderator') {
        recordAuditLog(
          req.currentUser,
          'محاولة اعتماد ذاتي للإعلان',
          'listing',
          'new',
          'denied',
          'المعلن حاول نشر الإعلان ذاتياً مباشرة دون مراجعة المشرف، تم تحويله قسراً للمراجعة.'
        );
        targetStatus = 'under_review';
      } else {
        targetStatus = 'published';
      }
    }

    const nextSeq = marketplaceRepository.getListings().length + 101;
    const listingNumber = `YEM-2026-${nextSeq}`;
    const now = new Date().toISOString().split('T')[0];

    const newListing: Listing = {
      propertyType: data.propertyType || 'apartment',
      purpose: data.purpose || 'sale',
      currency: data.currency || 'YER',
      price: typeof data.price === 'number' ? data.price : 0,
      area: typeof data.area === 'number' ? data.area : 0,
      areaUnit: data.areaUnit || 'م²',
      isNegotiable: Boolean(data.isNegotiable),
      title: data.title || 'عقار جديد',
      description: data.description || '',
      attributes: data.attributes || {},
      verificationBadges: Array.isArray(data.verificationBadges) ? data.verificationBadges : [],
      privateDocuments: Array.isArray(data.privateDocuments) ? data.privateDocuments : undefined,
      ...data,
      id: `list-${Date.now()}`,
      listingNumber,
      status: targetStatus,
      images: (Array.isArray(data.images) && data.images.length > 0)
        ? data.images
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
      location: {
        governorate: data.location?.governorate || 'صنعاء (أمانة العاصمة)',
        city: data.location?.city || 'صنعاء',
        district: data.location?.district || 'الأمانة',
        street: data.location?.street || '',
        lat: typeof data.location?.lat === 'number' ? data.location.lat : 15.312,
        lng: typeof data.location?.lng === 'number' ? data.location.lng : 44.187,
        isApproximate: data.location?.isApproximate ?? true
      },
      advertiser: {
        ...data.advertiser,
        id: req.currentUser.id,
        name: req.currentUser.name,
        phone: phoneCheck.normalized,
        phoneVerified: true,
        type: req.currentUser.role === 'org_manager' || req.currentUser.role === 'org_agent' ? 'organization' : 'individual',
        orgId: req.currentUser.orgId,
        orgName: req.currentUser.orgName
      },
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: now,
      updatedAt: now,
      statusTimeline: [
        {
          status: targetStatus,
          timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
          changedBy: req.currentUser.name,
          userRole: req.currentUser.role,
          notes: targetStatus === 'draft' ? 'حفظ كمسودة' : 'إنشاء الإعلان وإرساله لطابور المراجعة والاعتماد'
        }
      ]
    };

    marketplaceRepository.addListing(newListing);

    recordAuditLog(
      req.currentUser,
      'إنشاء إعلان عقاري جديد',
      'listing',
      newListing.id,
      'success',
      `تم إنشاء الإعلان ${listingNumber} بحالة [${targetStatus}] برقم هاتف موثق: ${phoneCheck.normalized}`
    );

    return res.status(201).json({
      message: `تم إنشاء الإعلان بنجاح برقم ${listingNumber}`,
      listing: newListing
    });
  }
);

// 5. Update Listing
marketplaceRouter.put(
  '/api/listings/:id',
  requireRoles('advertiser', 'org_manager', 'org_agent', 'system_admin'),
  (req: Request, res: Response) => {
    const existing = marketplaceRepository.getListingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'العقار غير موجود' });
    }

    const isOwner = existing.advertiser.id === req.currentUser.id;
    const isOrgManager = req.currentUser.role === 'org_manager' && existing.advertiser.orgId === req.currentUser.orgId;
    const isSysAdmin = req.currentUser.role === 'system_admin';

    if (!isOwner && !isOrgManager && !isSysAdmin) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل هذا الإعلان' });
    }

    const updates = req.body;

    if (updates.advertiser?.phone) {
      const phoneCheck = validateYemeniPhone(updates.advertiser.phone);
      if (!phoneCheck.isValid) {
        return res.status(422).json({ error: phoneCheck.error });
      }
      updates.advertiser.phone = phoneCheck.normalized;
    }

    if ((existing.status === 'completed' || existing.dealOutcome) && updates.status && updates.status !== 'completed') {
      return res.status(400).json({ error: 'العقار مكتمل الصفقة (مباع أو مؤجر) ومغلق نهائياً، يمنع إعادته لقوائم التوفر والعرض' });
    }

    let newStatus = existing.status;
    if (existing.status === 'needs_changes' && req.currentUser.role !== 'system_admin') {
      newStatus = 'under_review';
    }

    if (updates.status === 'published' && req.currentUser.role !== 'system_admin' && req.currentUser.role !== 'moderator') {
      delete updates.status;
    }

    const updated = marketplaceRepository.updateListing(existing.id, {
      ...updates,
      status: newStatus
    });

    recordAuditLog(
      req.currentUser,
      'تعديل بيانات إعلان عقاري',
      'listing',
      existing.id,
      'success',
      `تم تحديث بيانات الإعلان ${existing.listingNumber}`
    );

    return res.json({ message: 'تم تحديث الإعلان بنجاح', listing: updated });
  }
);

// 6. Delete Listing
marketplaceRouter.delete(
  '/api/listings/:id',
  requireRoles('advertiser', 'org_manager', 'system_admin'),
  (req: Request, res: Response) => {
    const existing = marketplaceRepository.getListingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'العقار غير موجود' });
    }

    const isOwner = existing.advertiser.id === req.currentUser.id;
    const isSysAdmin = req.currentUser.role === 'system_admin';

    if (!isOwner && !isSysAdmin) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف هذا الإعلان' });
    }

    marketplaceRepository.deleteListing(existing.id);

    recordAuditLog(
      req.currentUser,
      'حذف إعلان عقاري',
      'listing',
      existing.id,
      'warning',
      `تم حذف الإعلان ${existing.listingNumber} - ${existing.title}`
    );

    return res.json({ message: 'تم حذف الإعلان بنجاح' });
  }
);
