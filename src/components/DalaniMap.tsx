import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Listing,
  ListingStatus,
  PropertyType,
  ListingPurpose,
  Currency,
  UserRole,
  User,
  ReportCase,
  SupportTicket
} from '../types';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import { useApp } from '../context/AppContext';
import {
  Layers,
  MapPin,
  Navigation,
  Eye,
  AlertCircle,
  Key,
  CheckCircle,
  List,
  Compass,
  Crosshair,
  Loader2,
  Check,
  LocateFixed,
  Sparkles,
  ShieldAlert,
  Clock,
  Map
} from 'lucide-react';

export interface MapSearchParams {
  purpose?: ListingPurpose | 'all';
  propertyType?: PropertyType | 'all';
  governorate?: string;
  city?: string;
  district?: string;
  keyword?: string;
  search?: string;
  currency?: Currency | 'all';
  minPrice?: number | string;
  maxPrice?: number | string;
  hasSolarOnly?: boolean;
  status?: ListingStatus | 'all' | string;
  scope?: 'public' | 'all' | 'my_ads' | 'org_ads' | 'assigned' | 'review' | 'verification' | 'reports' | 'operations' | 'finance' | 'admin';
  role?: UserRole;
  user?: User;
  currentUser?: User;
  isAdminMapMode?: boolean;

  // Role-specific filter states
  advStatusFilter?: 'all' | 'published' | 'unpublished' | 'draft' | 'under_review' | 'needs_changes' | 'suspended_expired';
  orgStatusFilter?: 'all' | 'published' | 'unpublished' | 'under_review' | 'needs_changes' | 'suspended';
  orgAgentFilter?: string;
  agentStatusFilter?: 'all' | 'published' | 'under_review' | 'draft';
  modQueueFilter?: 'all' | 'under_review' | 'pending_completion' | 'needs_changes' | 'published' | 'suspended';
  verStatusFilter?: 'all' | 'pending_verification' | 'needs_info' | 'verified_only';
  reportStatusFilter?: 'all' | 'new' | 'investigating' | 'suspended' | 'resolved';
  reportSeverityFilter?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  showNonReported?: boolean;
  adminUserTypeFilter?: 'all' | 'individual' | 'organization' | 'agent';
  adminStatusFilter?: 'all' | ListingStatus;
  adminOrgFilter?: string;
  adminHasReportsFilter?: boolean;
  supportSearchQuery?: string;
  supportOnlyWithTickets?: boolean;
  supportStatusFilter?: 'all' | ListingStatus;
  financeFilter?: 'all' | 'featured_paid' | 'pending_payment' | 'expired_subscription';
  financePackage?: 'all' | 'standard' | 'featured' | 'premium';
}

/**
 * دالة تطبيق شروط الصلاحيات وفلاتر البحث على مصفوفة العقارات (Client-side / Fallback filtering)
 * تضمن:
 * 1. عدم ظهور أي عقار غير منشور للعامة والزوار.
 * 2. تمكين المعلن الفردي من استعراض إعلاناته ومسوداته في خريطته الإدارية دون كشفها للآخرين.
 * 3. حصر عقارات المكتب على مدير المكتب، والإعلانات المسندة على الوسطاء.
 * 4. تطبيق معايير المراجعة، التحقق، والبلاغات حسب الدور المصرح به.
 */
export function filterListingsByRoleAndParams(
  listings: Listing[],
  searchParams?: MapSearchParams,
  activeUser?: User,
  reportsList: ReportCase[] = [],
  ticketsList: SupportTicket[] = []
): Listing[] {
  if (!listings || !Array.isArray(listings)) return [];
  if (!searchParams) return listings;

  const user = searchParams.currentUser || searchParams.user || activeUser;
  const role = searchParams.role || user?.role || 'visitor';
  const isPublic = role === 'visitor' || role === 'seeker';
  const isAdminMode = searchParams.isAdminMapMode ?? !isPublic;

  let pool = [...listings];

  // 1. تطبيق شروط الصلاحيات وقاعدة حصرية العقار المحجوز
  if (isPublic || !isAdminMode) {
    // الزائر والباحث والوضع العام: العقارات المنشورة وغير المحجوزة فقط (الحصرية التامة)
    pool = pool.filter(l => l.status === 'published' && !l.isReserved);
  } else {
    switch (role) {
      case 'advertiser': {
        // المعلن الفردي: إعلاناته الخاصة فقط
        if (user?.id) {
          pool = pool.filter(l => l.advertiser?.id === user.id);
        }
        const filter = searchParams.advStatusFilter;
        if (filter === 'published') {
          pool = pool.filter(l => l.status === 'published');
        } else if (filter === 'unpublished') {
          pool = pool.filter(l => l.status !== 'published');
        } else if (filter === 'draft') {
          pool = pool.filter(l => l.status === 'draft');
        } else if (filter === 'under_review') {
          pool = pool.filter(l => l.status === 'under_review');
        } else if (filter === 'needs_changes') {
          pool = pool.filter(l => l.status === 'needs_changes');
        } else if (filter === 'suspended_expired') {
          pool = pool.filter(l => l.status === 'suspended' || l.status === 'expired' || l.status === 'cancelled');
        }
        break;
      }

      case 'org_manager': {
        // مدير المكتب: عقارات مكتبه فقط
        pool = pool.filter(l => {
          if (!user) return false;
          const isCreator = l.advertiser?.id === user.id;
          const isSameOrg = Boolean(user.orgId && l.advertiser?.orgId === user.orgId);
          return isCreator || isSameOrg;
        });

        if (searchParams.orgAgentFilter && searchParams.orgAgentFilter !== 'all') {
          pool = pool.filter(l =>
            l.assignedAgentId === searchParams.orgAgentFilter ||
            l.advertiser?.id === searchParams.orgAgentFilter
          );
        }

        const filter = searchParams.orgStatusFilter;
        if (filter === 'published') {
          pool = pool.filter(l => l.status === 'published');
        } else if (filter === 'unpublished') {
          pool = pool.filter(l => l.status !== 'published');
        } else if (filter && filter !== 'all') {
          pool = pool.filter(l => l.status === filter);
        }
        break;
      }

      case 'org_agent': {
        // الوسيط أو موظف الإعلان: الإعلانات المسندة إليه أو المنشأة بواسطته فقط
        pool = pool.filter(l => {
          if (!user) return false;
          return l.assignedAgentId === user.id || l.advertiser?.id === user.id;
        });

        const filter = searchParams.agentStatusFilter;
        if (filter && filter !== 'all') {
          pool = pool.filter(l => l.status === filter);
        }
        break;
      }

      case 'moderator': {
        // مراجع الإعلانات
        pool = pool.filter(l =>
          ['under_review', 'pending_completion', 'needs_changes', 'published', 'suspended'].includes(l.status)
        );
        const filter = searchParams.modQueueFilter;
        if (filter && filter !== 'all') {
          pool = pool.filter(l => l.status === filter);
        }
        break;
      }

      case 'verifier': {
        // مسؤول التحقق
        pool = pool.filter(l =>
          l.status === 'pending_verification' ||
          (l.verificationBadges && l.verificationBadges.length > 0) ||
          Boolean(l.privateDocuments && l.privateDocuments.length > 0)
        );
        const filter = searchParams.verStatusFilter;
        if (filter === 'pending_verification') {
          pool = pool.filter(l => l.status === 'pending_verification');
        } else if (filter === 'needs_info') {
          pool = pool.filter(l => l.status === 'needs_changes');
        } else if (filter === 'verified_only') {
          pool = pool.filter(l => l.verificationBadges && l.verificationBadges.length > 0);
        }
        break;
      }

      case 'reporter_admin': {
        // مسؤول البلاغات
        const repMap: Record<string, ReportCase> = {};
        reportsList.forEach(r => {
          repMap[r.listingId] = r;
        });

        if (!searchParams.showNonReported) {
          pool = pool.filter(l => Boolean(repMap[l.id]));
        }

        const statusFilter = searchParams.reportStatusFilter;
        if (statusFilter && statusFilter !== 'all') {
          pool = pool.filter(l => {
            const rep = repMap[l.id];
            if (!rep) return false;
            if (statusFilter === 'new') return rep.status === 'new';
            if (statusFilter === 'investigating') return rep.status === 'investigating';
            if (statusFilter === 'suspended') return rep.status === 'resolved_ad_suspended' || l.status === 'suspended';
            if (statusFilter === 'resolved') return rep.status === 'dismissed' || rep.status === 'resolved_ad_suspended';
            return true;
          });
        }

        const sevFilter = searchParams.reportSeverityFilter;
        if (sevFilter && sevFilter !== 'all') {
          pool = pool.filter(l => {
            const rep = repMap[l.id];
            return rep && rep.priority === sevFilter;
          });
        }
        break;
      }

      case 'support': {
        // الدعم الفني
        if (searchParams.supportOnlyWithTickets) {
          const ticketPhones = new Set(ticketsList.map(t => t.userPhone));
          pool = pool.filter(l => ticketPhones.has(l.advertiser?.phone));
        }
        if (searchParams.supportStatusFilter && searchParams.supportStatusFilter !== 'all') {
          pool = pool.filter(l => l.status === searchParams.supportStatusFilter);
        }
        if (searchParams.supportSearchQuery?.trim()) {
          const q = searchParams.supportSearchQuery.trim().toLowerCase();
          pool = pool.filter(l =>
            l.id.toLowerCase().includes(q) ||
            l.listingNumber.toLowerCase().includes(q) ||
            l.advertiser?.phone?.includes(q) ||
            l.advertiser?.name?.toLowerCase().includes(q)
          );
        }
        break;
      }

      case 'accountant': {
        // مسؤول المالية
        const fFilter = searchParams.financeFilter;
        if (fFilter === 'featured_paid') {
          pool = pool.filter(l => Boolean(l.isFeatured || (l.featuredOrder && l.featuredOrder > 0)));
        } else if (fFilter === 'pending_payment') {
          pool = pool.filter(l => l.paymentStatus === 'pending');
        } else if (fFilter === 'expired_subscription') {
          pool = pool.filter(l => l.status === 'expired' || l.paymentStatus === 'overdue');
        }
        if (searchParams.financePackage && searchParams.financePackage !== 'all') {
          pool = pool.filter(l => l.subscriptionPackage === searchParams.financePackage);
        }
        break;
      }

      case 'system_admin': {
        // مدير النظام
        if (searchParams.adminStatusFilter && searchParams.adminStatusFilter !== 'all') {
          pool = pool.filter(l => l.status === searchParams.adminStatusFilter);
        }
        if (searchParams.adminUserTypeFilter === 'organization') {
          pool = pool.filter(l => Boolean(l.advertiser?.orgId));
        } else if (searchParams.adminUserTypeFilter === 'individual') {
          pool = pool.filter(l => !l.advertiser?.orgId);
        }
        if (searchParams.adminOrgFilter && searchParams.adminOrgFilter !== 'all') {
          pool = pool.filter(l => l.advertiser?.orgId === searchParams.adminOrgFilter);
        }
        if (searchParams.adminHasReportsFilter) {
          const repIds = new Set(reportsList.map(r => r.listingId));
          pool = pool.filter(l => repIds.has(l.id));
        }
        break;
      }

      default: {
        pool = pool.filter(l => l.status === 'published');
        break;
      }
    }
  }

  // 2. تطبيق فلاتر البحث المشتركة
  return pool.filter(l => {
    if (searchParams.purpose && searchParams.purpose !== 'all' && l.purpose !== searchParams.purpose) {
      return false;
    }
    if (searchParams.propertyType && searchParams.propertyType !== 'all' && l.propertyType !== searchParams.propertyType) {
      return false;
    }
    if (searchParams.governorate && searchParams.governorate !== 'all') {
      const g = l.location?.governorate || '';
      const targetGov = searchParams.governorate;
      const matches =
        g === targetGov ||
        g.includes(targetGov) ||
        targetGov.includes(g) ||
        (targetGov.includes('صنعاء') && g.includes('صنعاء')) ||
        (targetGov.includes('إب') && (g.includes('إب') || g.includes('اب'))) ||
        (targetGov.includes('ذمار') && g.includes('ذمار')) ||
        (targetGov.includes('عدن') && g.includes('عدن'));
      if (!matches) return false;
    }
    if (searchParams.city && searchParams.city !== 'all') {
      if (!l.location?.city?.toLowerCase().includes(searchParams.city.toLowerCase())) {
        return false;
      }
    }
    if (searchParams.district && searchParams.district !== 'all') {
      if (!l.location?.district?.toLowerCase().includes(searchParams.district.toLowerCase())) {
        return false;
      }
    }
    if (searchParams.currency && searchParams.currency !== 'all' && l.currency !== searchParams.currency) {
      return false;
    }
    if (searchParams.minPrice && l.price < Number(searchParams.minPrice)) {
      return false;
    }
    if (searchParams.maxPrice && l.price > Number(searchParams.maxPrice)) {
      return false;
    }
    if (searchParams.hasSolarOnly && !l.attributes?.hasSolarSystem) {
      return false;
    }

    const rawSearch = searchParams.keyword || searchParams.search;
    if (rawSearch && rawSearch.trim()) {
      const q = rawSearch.trim().toLowerCase();
      const matchTitle = l.title?.toLowerCase().includes(q);
      const matchCity = l.location?.city?.toLowerCase().includes(q);
      const matchDistrict = l.location?.district?.toLowerCase().includes(q);
      const matchListingNum = l.listingNumber?.toLowerCase().includes(q);
      const matchDesc = l.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCity && !matchDistrict && !matchListingNum && !matchDesc) {
        return false;
      }
    }

    return true;
  });
}

/**
 * دالة جلب بيانات الخريطة المحدثة وفق searchParams والصلاحيات
 */
export async function fetchMapListings(
  searchParams?: MapSearchParams,
  options?: {
    fallbackListings?: Listing[];
    user?: User;
    reports?: ReportCase[];
    tickets?: SupportTicket[];
    apiEndpoint?: string;
  }
): Promise<Listing[]> {
  const activeUser = searchParams?.currentUser || searchParams?.user || options?.user;
  const reports = options?.reports || [];
  const tickets = options?.tickets || [];
  const fallback = options?.fallbackListings || [];

  const queryParams = new URLSearchParams();
  if (searchParams?.purpose && searchParams.purpose !== 'all') queryParams.set('purpose', searchParams.purpose);
  if (searchParams?.propertyType && searchParams.propertyType !== 'all') queryParams.set('propertyType', searchParams.propertyType);
  if (searchParams?.governorate && searchParams.governorate !== 'all') queryParams.set('governorate', searchParams.governorate);
  if (searchParams?.city && searchParams.city !== 'all') queryParams.set('city', searchParams.city);
  if (searchParams?.district && searchParams.district !== 'all') queryParams.set('district', searchParams.district);
  if (searchParams?.keyword?.trim()) queryParams.set('search', searchParams.keyword.trim());
  if (searchParams?.status && searchParams.status !== 'all') queryParams.set('status', searchParams.status);
  if (searchParams?.scope) queryParams.set('scope', searchParams.scope);
  if (searchParams?.isAdminMapMode) queryParams.set('adminMap', 'true');
  if (searchParams?.minPrice) queryParams.set('minPrice', String(searchParams.minPrice));
  if (searchParams?.maxPrice) queryParams.set('maxPrice', String(searchParams.maxPrice));
  if (searchParams?.currency && searchParams.currency !== 'all') queryParams.set('currency', searchParams.currency);

  const endpoint = `${options?.apiEndpoint || '/api/listings'}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (activeUser?.role) {
      headers['x-user-role'] = activeUser.role;
    }
    if (activeUser?.id) {
      headers['Authorization'] = `Bearer ${activeUser.id}`;
    }

    const response = await fetch(endpoint, { headers });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.listings)) {
        return filterListingsByRoleAndParams(data.listings, searchParams, activeUser, reports, tickets);
      }
    }
  } catch (err) {
    console.warn('[MapComponent] API fetch fallback to local listings:', err);
  }

  return filterListingsByRoleAndParams(fallback, searchParams, activeUser, reports, tickets);
}

export interface DalaniMapProps {
  listings?: Listing[];
  searchParams?: MapSearchParams;
  onDataFetched?: (listings: Listing[]) => void;
  selectedListingId?: string;
  onSelectListing?: (listing: Listing) => void;
  className?: string;
  height?: string;
  showFilters?: boolean;
  selectedGovernorate?: string;
  allowAllStatuses?: boolean;
  enableLocationPicker?: boolean;
  selectedCoords?: { lat: number; lng: number };
  onLocationSelected?: (coords: { lat: number; lng: number }) => void;
  mapTitle?: string;
}

export const DalaniMap: React.FC<DalaniMapProps> = ({
  listings = [],
  searchParams,
  onDataFetched,
  selectedListingId,
  onSelectListing,
  className = '',
  height = '580px',
  showFilters = true,
  selectedGovernorate,
  allowAllStatuses = false,
  enableLocationPicker = false,
  selectedCoords,
  onLocationSelected,
  mapTitle
}) => {
  const { googleMapsApiKey, setGoogleMapsApiKey, showToast, currentUser, reports, tickets } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const baseTilesGroupRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  // Dynamic Data Fetching State for searchParams
  const [fetchedListings, setFetchedListings] = useState<Listing[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    if (searchParams) {
      setIsLoadingData(true);
      fetchMapListings(searchParams, {
        fallbackListings: listings,
        user: currentUser,
        reports,
        tickets
      })
        .then(results => {
          if (!isCancelled) {
            setFetchedListings(results);
            setIsLoadingData(false);
            onDataFetched?.(results);
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.warn('[MapComponent] Error in fetchMapListings:', err);
            setIsLoadingData(false);
          }
        });
    } else {
      setFetchedListings(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [searchParams, listings, currentUser, reports, tickets]);

  // The active listings pool to render
  const effectiveListings = useMemo(() => {
    if (searchParams) {
      return fetchedListings ?? filterListingsByRoleAndParams(listings, searchParams, currentUser, reports, tickets);
    }
    return listings;
  }, [searchParams, fetchedListings, listings, currentUser, reports, tickets]);

  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'satellite' | 'google_hybrid'>('google_hybrid');
  const [activeGovernorate, setActiveGovernorate] = useState<string>('صنعاء (أمانة العاصمة)');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInputValue, setKeyInputValue] = useState<string>(googleMapsApiKey || '');
  const [viewMode, setViewMode] = useState<'map' | 'text_fallback'>('map');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocationAccuracy, setUserLocationAccuracy] = useState<number | null>(null);

  // Current picker coordinates (controlled or internal)
  const [currentPickerCoords, setCurrentPickerCoords] = useState<{ lat: number; lng: number }>(
    selectedCoords || { lat: 15.3694, lng: 44.1910 }
  );

  // Sync internal picker coords with external props if provided
  useEffect(() => {
    if (selectedCoords && (selectedCoords.lat !== currentPickerCoords.lat || selectedCoords.lng !== currentPickerCoords.lng)) {
      setCurrentPickerCoords(selectedCoords);
      if (pickerMarkerRef.current && mapInstanceRef.current) {
        pickerMarkerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
        mapInstanceRef.current.panTo([selectedCoords.lat, selectedCoords.lng]);
      }
    }
  }, [selectedCoords]);

  // Automatically fly to selected governorate when changed from external dropdown
  useEffect(() => {
    if (!selectedGovernorate || !mapInstanceRef.current) return;
    if (selectedGovernorate === 'all') {
      mapInstanceRef.current.flyTo([15.3694, 44.1910], 7, { duration: 1.2 });
      return;
    }
    const gov = YEMEN_GOVERNORATES.find(g =>
      g.name === selectedGovernorate ||
      g.name.includes(selectedGovernorate) ||
      selectedGovernorate.includes(g.name)
    );
    if (gov) {
      mapInstanceRef.current.flyTo([gov.lat, gov.lng], gov.zoom, { duration: 1.2 });
      setActiveGovernorate(gov.name);
    }
  }, [selectedGovernorate]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (viewMode === 'text_fallback' || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        // Center on Yemen (Sana'a / center of Yemen: 15.3694, 44.1910)
        const map = L.map(mapContainerRef.current, {
          center: [15.3694, 44.1910],
          zoom: 12,
          zoomControl: false,
          attributionControl: true
        });

        // Custom Zoom Control at bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Create base tiles group for safe layer switching
        const baseTilesGroup = L.layerGroup().addTo(map);
        baseTilesGroupRef.current = baseTilesGroup;

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        setMapLoaded(true);
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError(true);
    }

    return () => {
      // Keep instance alive during state re-renders, destroyed on unmount
    };
  }, [viewMode]);

  // Handle Tile Layer switch cleanly without interfering with markers or beacons
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTilesGroupRef.current) return;
    const tileGroup = baseTilesGroupRef.current;
    tileGroup.clearLayers();

    if (activeTileLayer === 'streets') {
      // High-reliability graphical roadmap with full Arabic labels & street networks
      const roadMapLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps | خريطة دلنّي الرسومية'
      });
      tileGroup.addLayer(roadMapLayer);
    } else {
      // Satellite Mode: Ultra-crisp Google Hybrid satellite with Arabic street overlays
      const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Hybrid Imagery | دلنّي'
      });
      tileGroup.addLayer(googleHybrid);
    }
  }, [activeTileLayer]);

  // Update Markers when listings or picker mode change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // If Location Picker Mode is enabled
    if (enableLocationPicker) {
      const pickerPinHtml = `
        <div class="relative flex flex-col items-center cursor-grab active:cursor-grabbing transform -translate-y-2">
          <div class="px-3 py-1.5 bg-[#12A889] text-white text-xs font-bold rounded-full shadow-2xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
            <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>📍 موقع العقار المحدد</span>
          </div>
          <div class="w-3.5 h-3.5 bg-[#12A889] transform rotate-45 -mt-1.5 border-r border-b border-white shadow-md"></div>
          <div class="w-8 h-8 rounded-full bg-[#12A889]/30 -mt-3 animate-pulse pointer-events-none"></div>
        </div>
      `;

      const pickerIcon = L.divIcon({
        className: 'dalani-picker-pin',
        html: pickerPinHtml,
        iconSize: [140, 50],
        iconAnchor: [70, 48]
      });

      const pickerMarker = L.marker([currentPickerCoords.lat, currentPickerCoords.lng], {
        icon: pickerIcon,
        draggable: true,
        zIndexOffset: 2000
      });

      pickerMarker.on('dragend', () => {
        const pos = pickerMarker.getLatLng();
        const coords = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
        setCurrentPickerCoords(coords);
        if (onLocationSelected) {
          onLocationSelected(coords);
        }
      });

      pickerMarker.bindPopup(`
        <div style="text-align: right; font-family: sans-serif; direction: rtl; padding: 4px;">
          <div style="font-weight: bold; color: #16324F; font-size: 12px; margin-bottom: 4px;">🎯 إحداثيات العقار المحددة</div>
          <div style="font-size: 11px; color: #475569; font-family: monospace;">
            العرض: ${currentPickerCoords.lat.toFixed(5)}°<br/>
            الطول: ${currentPickerCoords.lng.toFixed(5)}°
          </div>
          <div style="font-size: 10px; color: #12A889; margin-top: 4px; font-weight: bold;">
            يمكنك سحب العلامة أو النقر على الخريطة لتعديل الموقع
          </div>
        </div>
      `);

      markersLayer.addLayer(pickerMarker);
      pickerMarkerRef.current = pickerMarker;

      // Handle map click to reposition picker
      const handleMapClick = (e: L.LeafletMouseEvent) => {
        const newCoords = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) };
        setCurrentPickerCoords(newCoords);
        pickerMarker.setLatLng(e.latlng);
        if (onLocationSelected) {
          onLocationSelected(newCoords);
        }
      };

      map.on('click', handleMapClick);

      return () => {
        map.off('click', handleMapClick);
      };
    }

    // Standard Listings View (Filtered or All Statuses according to permissions)
    const canShowAllStatuses =
      allowAllStatuses ||
      (Boolean(searchParams?.isAdminMapMode) && currentUser.role !== 'visitor' && currentUser.role !== 'seeker');
    const targetListings = canShowAllStatuses
      ? effectiveListings
      : effectiveListings.filter(l => l.status === 'published');

    const statusMeta: Record<string, { label: string; bg: string; border: string; text: string; badgeClass: string }> = {
      published: { label: 'منشور', bg: '#16324F', border: '#12A889', text: '#ffffff', badgeClass: 'bg-emerald-600 text-white' },
      under_review: { label: 'قيد المراجعة', bg: '#78350F', border: '#F59E0B', text: '#ffffff', badgeClass: 'bg-amber-600 text-white' },
      draft: { label: 'مسودة', bg: '#334155', border: '#94A3B8', text: '#ffffff', badgeClass: 'bg-slate-600 text-white' },
      needs_changes: { label: 'مطلوب تعديله', bg: '#7C2D12', border: '#EA580C', text: '#ffffff', badgeClass: 'bg-orange-600 text-white' },
      pending_verification: { label: 'بانتظار التحقق', bg: '#1E3A8A', border: '#3B82F6', text: '#ffffff', badgeClass: 'bg-blue-600 text-white' },
      pending_completion: { label: 'غير مكتمل', bg: '#9A3412', border: '#FB923C', text: '#ffffff', badgeClass: 'bg-orange-600 text-white' },
      suspended: { label: 'موقوف', bg: '#881337', border: '#F43F5E', text: '#ffffff', badgeClass: 'bg-rose-600 text-white' },
      rejected: { label: 'مرفوض', bg: '#7F1D1D', border: '#EF4444', text: '#ffffff', badgeClass: 'bg-red-600 text-white' },
      cancelled: { label: 'ملغى', bg: '#334155', border: '#64748B', text: '#ffffff', badgeClass: 'bg-slate-500 text-white' },
      expired: { label: 'منتهٍ', bg: '#475569', border: '#94A3B8', text: '#ffffff', badgeClass: 'bg-slate-500 text-white' }
    };

    targetListings.forEach(listing => {
      const lat = listing.location?.lat ?? (listing.location as any)?.latitude;
      const lng = listing.location?.lng ?? (listing.location as any)?.longitude;
      if (!lat || !lng) return;

      const formattedPrice =
        listing.currency === 'USD'
          ? `$${(listing.price || 0).toLocaleString()}`
          : listing.currency === 'SAR'
          ? `${(listing.price || 0).toLocaleString()} ر.س`
          : `${((listing.price || 0) / 1000000).toFixed(1)}M ر.ي`;

      const isSelected = listing.id === selectedListingId;
      const statusInfo = statusMeta[listing.status] || statusMeta.published;
      const showStatusTag = canShowAllStatuses && listing.status !== 'published';

      // Custom HTML Pin with Dalani colors and optional role-specific status styling
      const pinHtml = `
        <div class="cursor-pointer transition-all duration-300 transform hover:scale-110 ${isSelected ? 'scale-115 z-50' : ''}">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs border-2 ${
            isSelected
              ? 'bg-[#12A889] text-white border-white ring-4 ring-[#12A889]/30'
              : ''
          }" style="${!isSelected ? `background-color: ${statusInfo.bg}; color: ${statusInfo.text}; border-color: ${statusInfo.border};` : ''}">
            <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-white' : ''}" style="${!isSelected ? `background-color: ${statusInfo.border};` : ''} animate-pulse"></span>
            <span>${formattedPrice}</span>
            ${showStatusTag ? `<span class="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30 font-medium">${statusInfo.label}</span>` : ''}
          </div>
          <div class="w-2.5 h-2.5 mx-auto transform rotate-45 -mt-1.5 border-r border-b" style="background-color: ${isSelected ? '#12A889' : statusInfo.bg}; border-color: ${isSelected ? '#ffffff' : statusInfo.border};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'dalani-custom-pin',
        html: pinHtml,
        iconSize: [showStatusTag ? 120 : 85, 34],
        iconAnchor: [showStatusTag ? 60 : 42, 34]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Rich Yemen Property Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 max-w-[280px] text-right font-sans';
      const mainImg = (listing.images && listing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
      const locationText = `${listing.location?.city || ''} ${listing.location?.district ? `- ${listing.location.district}` : ''}`.trim() || 'اليمن';
      popupContent.innerHTML = `
        <div class="relative overflow-hidden rounded-lg mb-2">
          <img src="${mainImg}" alt="${listing.title}" class="w-full h-28 object-cover rounded-md" />
          <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
            <span class="bg-[#12A889] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
              ${listing.purpose === 'sale' ? 'للبيع' : listing.purpose === 'rent' ? 'للإيجار' : 'استثمار'}
            </span>
            ${listing.status !== 'published' ? `
              <span class="${statusInfo.badgeClass} text-[10px] font-bold px-2 py-0.5 rounded shadow">
                ${statusInfo.label}
              </span>
            ` : ''}
          </div>
          <span class="absolute bottom-2 left-2 bg-[#16324F]/90 text-white text-[11px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
            ${formattedPrice}
          </span>
        </div>
        <h4 class="font-bold text-sm text-[#16324F] mb-1 line-clamp-1 leading-snug">${listing.title}</h4>
        <div class="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          <span>📍</span>
          <span>${locationText}</span>
        </div>
        ${listing.location?.isApproximate ? `
          <div class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mb-2 font-medium">
            🛡️ موقع تقريبي لحماية الخصوصية
          </div>
        ` : ''}
        <div class="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mb-2 text-slate-600 font-medium">
          <span>المساحة: ${listing.area || 0} ${listing.areaUnit || 'م²'}</span>
          ${listing.attributes?.rooms ? `<span>${listing.attributes.rooms} غرف</span>` : ''}
        </div>
        <button id="view-listing-${listing.id}" class="w-full py-1.5 px-3 bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
          <span>معاينة وتفاصيل العقار</span>
          <span>←</span>
        </button>
      `;

      // Bind click inside popup
      popupContent.querySelector(`#view-listing-${listing.id}`)?.addEventListener('click', () => {
        if (onSelectListing) {
          onSelectListing(listing);
        }
      });

      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.on('click', () => {
        if (onSelectListing) {
          onSelectListing(listing);
        }
      });

      markersLayer.addLayer(marker);
    });
  }, [effectiveListings, selectedListingId, onSelectListing, allowAllStatuses, enableLocationPicker, currentPickerCoords, searchParams, currentUser.role]);

  // Quick Fly to Governorate
  const handleFlyToGov = (govName: string) => {
    setActiveGovernorate(govName);
    const gov = YEMEN_GOVERNORATES.find(g => g.name === govName);
    if (gov && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([gov.lat, gov.lng], gov.zoom, {
        duration: 1.2
      });
    }
  };

  // Locate User's Position with interactive high-precision GPS beacon & accuracy radius
  const handleLocateMe = () => {
    if (!mapInstanceRef.current) return;

    setIsLocating(true);

    const setUserMapPosition = (
      lat: number,
      lng: number,
      accuracy: number = 20,
      label: string = 'موقعك الحالي بدقة',
      isHighPrecision: boolean = true
    ) => {
      if (!mapInstanceRef.current) return;
      const currentMap = mapInstanceRef.current;

      // Clean up previous user markers
      if (userMarkerRef.current) {
        currentMap.removeLayer(userMarkerRef.current);
      }
      if (userCircleRef.current) {
        currentMap.removeLayer(userCircleRef.current);
      }

      // High-precision pulsating radar beacon icon
      const beaconIcon = L.divIcon({
        className: 'user-beacon-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(18, 168, 137, 0.35); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 9999px; background: rgba(22, 50, 79, 0.85); box-shadow: 0 0 14px rgba(18, 168, 137, 0.9);"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: #ffffff; border: 3px solid #12A889; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      // Accuracy radius circle
      const circle = L.circle([lat, lng], {
        radius: Math.max(accuracy, 40),
        color: '#12A889',
        fillColor: '#12A889',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(currentMap);

      // Marker
      const marker = L.marker([lat, lng], {
        icon: beaconIcon,
        zIndexOffset: 3000
      }).addTo(currentMap);

      // Count nearby listings within ~5km
      const nearbyCount = effectiveListings.filter(l => {
        const itemLat = l.location?.lat ?? (l.location as any)?.latitude;
        const itemLng = l.location?.lng ?? (l.location as any)?.longitude;
        if (!itemLat || !itemLng) return false;
        const dLat = (itemLat - lat) * 111;
        const dLng = (itemLng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng) <= 5;
      }).length;

      marker.bindPopup(`
        <div style="text-align: right; font-family: 'Tajawal', sans-serif; direction: rtl; padding: 6px 8px; min-width: 190px;">
          <div style="font-weight: 900; font-size: 13px; color: #16324F; display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span>📍 ${label}</span>
            <span style="font-size: 10px; background: #12A889; color: white; padding: 2px 6px; border-radius: 9999px; font-weight: bold;">GPS</span>
          </div>
          <div style="font-size: 11px; color: #475569; font-family: monospace; direction: ltr; text-align: right; margin-bottom: 5px;">
            ${lat.toFixed(5)}°, ${lng.toFixed(5)}°
          </div>
          <div style="font-size: 10px; color: #0d9488; font-weight: bold; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 4px 6px; border-radius: 8px; margin-bottom: 5px;">
            🎯 دقة الإشارة: ±${Math.round(accuracy)} متر ${isHighPrecision ? '(دقة عالية)' : '(تقديري)'}
          </div>
          <div style="font-size: 10px; color: #64748b;">
            عقارات متوفرة حولك: <strong style="color: #16324F;">${nearbyCount}</strong> عقار
          </div>
        </div>
      `, { offset: [0, -14] });

      userMarkerRef.current = marker;
      userCircleRef.current = circle;
      setUserLocation({ lat, lng });
      setUserLocationAccuracy(Math.round(accuracy));

      currentMap.flyTo([lat, lng], 16, { duration: 1.2 });
      setTimeout(() => {
        marker.openPopup();
      }, 1250);
    };

    if (navigator.geolocation) {
      // Step 1: Query location with high accuracy and sensible cache allowance
      navigator.geolocation.getCurrentPosition(
        pos => {
          setIsLocating(false);
          const { latitude, longitude, accuracy } = pos.coords;
          setUserMapPosition(latitude, longitude, accuracy, 'موقعك الحالي', true);
          showToast(`تم تحديد موقعك بدقة 🎯`, 'success');
        },
        geoErr => {
          // If high accuracy failed or timed out, attempt standard network geolocation directly
          navigator.geolocation.getCurrentPosition(
            normalPos => {
              setIsLocating(false);
              const { latitude, longitude, accuracy } = normalPos.coords;
              setUserMapPosition(latitude, longitude, accuracy || 50, 'موقعك الحالي', false);
              showToast(`تم تحديد موقعك الجغرافي 🎯`, 'success');
            },
            finalErr => {
              setIsLocating(false);
              if (finalErr.code === 1) { // PERMISSION_DENIED
                showToast('يرجى السماح بصلاحية الوصول للموقع الجغرافي من إعدادات المتصفح 📍', 'warning');
              } else if (finalErr.code === 2) { // POSITION_UNAVAILABLE
                showToast('خدمة تحديد الموقع الجغرافي غير متوفرة حالياً على جهازك 📍', 'warning');
              } else {
                showToast('تعذر جلب موقعك الحالي. تأكد من تفعيل الـ GPS في جهازك 📍', 'warning');
              }
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setIsLocating(false);
      showToast('المتصفح لا يدعم تحديد الموقع الجغرافي المباشر 📍', 'warning');
    }
  };

  const handleSaveApiKey = () => {
    setGoogleMapsApiKey(keyInputValue.trim());
    setShowKeyModal(false);
  };

  return (
    <div className={`relative bg-white ${showFilters ? 'rounded-2xl shadow-sm border border-slate-200' : ''} overflow-hidden flex flex-col h-full w-full ${className}`}>
      {/* Top Map Control Bar (Only when showFilters is true, e.g. on SearchPage) */}
      {showFilters && (
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#12A889]/20 flex items-center justify-center text-[#12A889]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{mapTitle || 'خريطة عقارات اليمن التفاعلية'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </h3>
              <p className="text-xs text-slate-400">
                {isLoadingData ? (
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري تحديث وتصفية العلامات العقارية...</span>
                  </span>
                ) : (allowAllStatuses || (Boolean(searchParams?.isAdminMapMode) && currentUser.role !== 'visitor' && currentUser.role !== 'seeker'))
                  ? `${effectiveListings.length} عقاراً متوفراً حسب صلاحيات العرض والحالة`
                  : `${effectiveListings.filter(l => l.status === 'published').length} عقاراً منشوراً ومطابقاً للشروط العامة`}
              </p>
            </div>
          </div>

          {/* View Mode & Layer Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-[#12A889] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>الخريطة الحية</span>
              </button>
              <button
                onClick={() => setViewMode('text_fallback')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'text_fallback' ? 'bg-[#12A889] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>البديل النصي</span>
              </button>
            </div>

            {viewMode === 'map' && (
              <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700 text-xs">
                <button
                  onClick={() => setActiveTileLayer('google_hybrid')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    activeTileLayer === 'google_hybrid' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="أقمار صناعية هجينة من قوقل"
                >
                  قمر صناعي هجين
                </button>
                <button
                  onClick={() => setActiveTileLayer('streets')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    activeTileLayer === 'streets' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="خريطة الشوارع التخطيطية"
                >
                  شوارع
                </button>
              </div>
            )}

            <button
              onClick={() => setShowKeyModal(true)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                googleMapsApiKey
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{googleMapsApiKey ? 'مفتاح Google مفعل' : 'تخصيص Google Key'}</span>
            </button>
          </div>
        </div>
      )}



      {/* Main Map Viewport */}
      {viewMode === 'map' ? (
        <div className="relative w-full h-full flex-1" style={{ minHeight: height === '100%' ? '100%' : height }}>
          {mapError ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
              <h4 className="font-bold text-slate-800 text-base mb-1">تعذر تحميل بيانات الخريطة</h4>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                قد يكون السبب انقطاعاً في شبكة الإنترنت، يمكنك تفعيل البديل النصي فوراً.
              </p>
              <button
                onClick={() => setViewMode('text_fallback')}
                className="px-4 py-2 bg-[#12A889] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#0f8d73]"
              >
                فتح البديل النصي للقائمة
              </button>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full z-10" />
          )}

          {/* Location Picker Overlay Bar (When enableLocationPicker is true) */}
          {enableLocationPicker && (
            <div className="absolute top-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:left-6 z-25 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-slate-200/90 pointer-events-auto flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#12A889]/15 flex items-center justify-center text-[#12A889] flex-shrink-0">
                  <MapPin className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-[#16324F]">تحديد موقع العقار على الخريطة</span>
                    {currentPickerCoords.lat >= 12 && currentPickerCoords.lat <= 19.5 && currentPickerCoords.lng >= 41 && currentPickerCoords.lng <= 55 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>ضمن الجمهورية اليمنية</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>تحقق من الإحداثيات</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                    <span>خط العرض: <strong className="text-slate-800">{currentPickerCoords.lat.toFixed(5)}°</strong></span>
                    <span>•</span>
                    <span>خط الطول: <strong className="text-slate-800">{currentPickerCoords.lng.toFixed(5)}°</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="استخدام موقعي الحالي"
                >
                  {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#12A889]" /> : <LocateFixed className="w-3.5 h-3.5 text-[#12A889]" />}
                  <span>موقعي الحالي (GPS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onLocationSelected) {
                      onLocationSelected(currentPickerCoords);
                    }
                    showToast('تم تأكيد وحفظ الإحداثيات المحددة بنجاح 🎯', 'success');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تأكيد الموقع</span>
                </button>
              </div>
            </div>
          )}

          {/* Floating Controls for Clean Fullscreen Mode (Clean round icon buttons positioned at bottom of map) */}
          {!showFilters && (
            <div className="absolute bottom-5 sm:bottom-6 left-3 sm:left-4 z-25 flex flex-col gap-2.5 pointer-events-auto">
              {/* Tile Layer Toggle: Round Icon Button */}
              <button
                type="button"
                onClick={() => {
                  const nextLayer = activeTileLayer === 'streets' ? 'google_hybrid' : 'streets';
                  setActiveTileLayer(nextLayer);
                  showToast(
                    nextLayer === 'streets'
                      ? 'تم التبديل إلى الخريطة الرسومية 🗺️'
                      : 'تم التبديل إلى وضع القمر الصناعي 🛰️',
                    'info'
                  );
                }}
                className={`w-11 h-11 rounded-full shadow-lg border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                  activeTileLayer === 'streets'
                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-[#12A889]'
                    : 'bg-[#12A889] text-white border-emerald-500 shadow-emerald-900/20'
                }`}
                title={activeTileLayer === 'streets' ? 'التبديل إلى وضع القمر الصناعي' : 'التبديل إلى الخريطة الرسومية'}
              >
                {activeTileLayer === 'streets' ? (
                  <Layers className="w-5 h-5 text-slate-700" />
                ) : (
                  <Map className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Locate Me: Round Icon Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className={`w-11 h-11 rounded-full shadow-lg border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                  isLocating
                    ? 'bg-white border-[#12A889] text-[#12A889]'
                    : userLocation
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-400/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-[#12A889] hover:bg-slate-50'
                }`}
                title="تحديد موقعي الحالي بدقة"
              >
                {isLocating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#12A889]" />
                ) : (
                  <div className="relative flex items-center justify-center">
                    <Crosshair className={`w-5 h-5 ${userLocation ? 'text-emerald-600' : 'text-slate-700'}`} />
                    {userLocation && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    )}
                  </div>
                )}
              </button>

              {/* Discrete Map Config Icon Button */}
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="w-9 h-9 self-center rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105"
                title="إعدادات مفتاح Google Maps"
              >
                <Key className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          )}

          {/* Floating Map Legend (Compact - Positioned at bottom right) */}
          <div className="absolute bottom-6 right-16 sm:right-20 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-sm text-[10px] pointer-events-auto hidden md:block">
            <div className="font-bold text-[#16324F] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#12A889]"></span>
              <span>عقارات دلنّي باليمن</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#16324F] inline-block"></span>
                <span>منشور</span>
              </div>
              {allowAllStatuses && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block"></span>
                    <span>قيد المراجعة</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#64748B] inline-block"></span>
                    <span>مسودة</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#12A889] inline-block"></span>
                <span>المحدد</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Text Fallback View (Mandatory in requirements for resilience and accessibility) */
        <div className="p-4 overflow-y-auto bg-slate-50" style={{ height }}>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">البديل النصي التفاعلي مفعل:</span> يعرض جميع إحداثيات ومواقع العقارات المتاحة
              بالمدن والأحياء لسهولة التصفح في حال بطء الاتصال أو ضعف تحميل طبقات الخرائط.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {effectiveListings
              .filter(l => (allowAllStatuses || (Boolean(searchParams?.isAdminMapMode) && currentUser.role !== 'visitor' && currentUser.role !== 'seeker')) ? true : l.status === 'published')
              .map(listing => (
                <div
                  key={listing.id}
                  onClick={() => onSelectListing && onSelectListing(listing)}
                  className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                    selectedListingId === listing.id ? 'border-[#12A889] ring-2 ring-[#12A889]/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#16324F]/10 text-[#16324F]">
                      {listing.location.governorate}
                    </span>
                    <span className="font-black text-sm text-[#12A889]">
                      {listing.currency === 'USD' ? `$${listing.price.toLocaleString()}` : `${listing.price.toLocaleString()} ${listing.currency}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1 mb-1">{listing.title}</h4>
                  <p className="text-xs text-slate-500 mb-2">
                    {listing.location.city} - {listing.location.district} {listing.location.street ? `(${listing.location.street})` : ''}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 font-mono">
                    <span>خط العرض: {listing.location.lat.toFixed(4)}°</span>
                    <span>خط الطول: {listing.location.lng.toFixed(4)}°</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Google Maps Custom Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#16324F]/10 flex items-center justify-center text-[#16324F]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#16324F]">إعداد مفتاح Google Maps API</h3>
                <p className="text-xs text-slate-500">تمكين وتفعيل خدمات Google Maps الحية الخاصة بك</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              الخريطة تعمل حالياً بنظام الخرائط الهجينة الحية والأقمار الصناعية (Google Satellite / Hybrid). إذا كان لديك مفتاح
              رسمي من Google Cloud وترغب في ربطه، يمكنك إدخاله هنا:
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مفتاح API Key الخاص بقوقل:</label>
                <input
                  type="text"
                  value={keyInputValue}
                  onChange={e => setKeyInputValue(e.target.value)}
                  placeholder="AIzaSy..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#12A889] text-left"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>الخرائط تعمل فورياً بدون توقف</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  حتى بدون مفتاح، نوفر تلقائياً طبقات صور الأقمار الصناعية وشبكة شوارع اليمن مع إحداثيات دقيقة لكل المحافظات.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-5 py-2 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                حفظ التفعيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MapComponent = DalaniMap;
export default DalaniMap;
