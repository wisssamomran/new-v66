/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * النظام الفرعي 3: السوق العقاري والعروض والتسويق (Real Estate Marketplace Repository)
 * 
 * مسؤول حصرياً عن:
 * - إدارة بيانات الإعلانات والعروض العقارية والبحث والفلترة
 * - تطبيع بيانات العروض العقارية (normalizeListing)
 * - تحديث حالات العروض (مسودة، قيد المراجعة، منشور، محجوز، مكتمل/مباع/مؤجر)
 * - مزامنة توفر العقارات وفك الحجوزات المنتهية
 * - المزامنة مع طبقة التخزين الدائم وقاعدة بيانات PostgreSQL
 */

import { Listing, PropertyBooking } from '../../../types';
import { storageManager } from '../../storage/storageManager';

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

export class MarketplaceRepository {
  private static instance: MarketplaceRepository;

  private constructor() {}

  public static getInstance(): MarketplaceRepository {
    if (!MarketplaceRepository.instance) {
      MarketplaceRepository.instance = new MarketplaceRepository();
    }
    return MarketplaceRepository.instance;
  }

  /**
   * فحص انتهاء صلاحية الحجوزات ومزامنة توفر العقارات المعروضة
   */
  public checkAndSyncReservations(): void {
    const now = new Date().getTime();
    let changed = false;

    for (const b of storageManager.data.bookings) {
      // إذا كان الحجز أو العقار مكتملاً (تم البيع أو التأجير النهائي)، يمنع لمسه نهائياً
      if (b.status === 'completed') continue;
      const listing = storageManager.data.listings.find((l: Listing) => l.id === b.listingId);
      if (listing?.status === 'completed' || listing?.dealOutcome) continue;

      if (b.status === 'active' && new Date(b.expiresAt).getTime() <= now) {
        b.status = 'expired';
        b.updatedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }

    if (changed) {
      this.syncListingsReservationStatus();
      storageManager.persist();
    }
  }

  /**
   * مزامنة حالة حجز العقارات مع الحجوزات النشطة
   */
  public syncListingsReservationStatus(): void {
    const now = new Date().getTime();
    const activeMap = new Map<string, PropertyBooking>();

    for (const b of storageManager.data.bookings) {
      if (b.status === 'active' && new Date(b.expiresAt).getTime() > now) {
        activeMap.set(b.listingId, b);
      }
    }

    for (const listing of storageManager.data.listings) {
      // العقارات المباعة أو المؤجرة نهائياً لا تعاد للوفرة أبداً
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

  /**
   * استرجاع جميع العروض العقارية مع فحص الحجوزات
   */
  public getListings(): Listing[] {
    this.checkAndSyncReservations();
    return [...storageManager.data.listings];
  }

  /**
   * استرجاع عقار محدد بواسطة المعرف
   */
  public getListingById(id: string): Listing | undefined {
    this.checkAndSyncReservations();
    return storageManager.data.listings.find((l: Listing) => l.id === id);
  }

  /**
   * إضافة عقار جديد إلى السوق
   */
  public addListing(listing: Listing): Listing {
    const normalized = normalizeListing(listing);
    storageManager.data.listings.unshift(normalized);
    storageManager.persist();
    storageManager.syncPgListing(normalized);
    return normalized;
  }

  /**
   * تحديث بيانات العقار مع حماية العقارات المباعة أو المؤجرة نهائياً
   */
  public updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const list = storageManager.data.listings;
    const index = list.findIndex((l: Listing) => l.id === id);
    if (index === -1) return undefined;
    const existing = list[index];

    // حماية أمنية: يمنع إعادة فتح العقارات المباعة أو المؤجرة نهائياً
    if ((existing.status === 'completed' || existing.dealOutcome) && updates.status && updates.status !== 'completed') {
      console.warn(`[Dalani Security] Prevented reopening completed/sold/rented listing ${existing.listingNumber}`);
      delete updates.status;
    }

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    list[index] = normalizeListing(merged);
    storageManager.persist();
    storageManager.syncPgListing(list[index]);
    return list[index];
  }

  /**
   * حذف عقار من السوق
   */
  public deleteListing(id: string): boolean {
    const prevLength = storageManager.data.listings.length;
    storageManager.data.listings = storageManager.data.listings.filter((l: Listing) => l.id !== id);
    if (storageManager.data.listings.length !== prevLength) {
      storageManager.persist();
      storageManager.deletePgListing(id);
      return true;
    }
    return false;
  }
}

export const marketplaceRepository = MarketplaceRepository.getInstance();
