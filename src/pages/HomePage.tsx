import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Listing, PropertyType, ListingPurpose, ListingStatus, UserRole } from '../types';
import { DalaniMap, MapSearchParams } from '../components/DalaniMap';
import { ListingCard } from '../components/ListingCard';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import {
  Search,
  SlidersHorizontal,
  Key,
  DoorOpen,
  MapPin,
  Building,
  Home,
  Layers,
  Store,
  Briefcase,
  Compass,
  X,
  RotateCcw,
  Sun,
  ShieldCheck,
  Map,
  ListFilter,
  ChevronDown,
  Check,
  Users,
  Shield,
  FileCheck,
  Flag,
  Headphones,
  Settings,
  AlertCircle,
  Clock,
  Eye,
  AlertTriangle,
  CreditCard,
  Sparkles,
  Filter,
  CheckCircle2,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
  onSelectListing: (listing: Listing) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectListing }) => {
  const { currentUser, listings, organizations, reports, tickets } = useApp();

  // Floating Filter States (Matching Screenshot)
  const [purpose, setPurpose] = useState<ListingPurpose>('sale');
  const [propertyType, setPropertyType] = useState<PropertyType | 'all'>('all');
  const [governorate, setGovernorate] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');

  // Dropdown list state for Cities (صنعاء، إب، ذمار، عدن...)
  const [cityDropdownOpen, setCityDropdownOpen] = useState<boolean>(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown list state for Role filters (قائمة منسدلة بجانب فلاتر المدن تتغير حسب الدور والوظيفة)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<boolean>(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'verified' | 'featured'>('all');

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cityOptions = [
    { id: 'all', label: 'كل المدن', fullGov: 'all' },
    { id: 'sanaa', label: 'صنعاء', fullGov: 'صنعاء (أمانة العاصمة)' },
    { id: 'ibb', label: 'إب', fullGov: 'إب' },
    { id: 'dhamar', label: 'ذمار', fullGov: 'ذمار' },
    { id: 'aden', label: 'عدن', fullGov: 'عدن' },
    { id: 'taiz', label: 'تعز', fullGov: 'تعز' },
    { id: 'hadramout', label: 'حضرموت', fullGov: 'حضرموت' },
    { id: 'hodeidah', label: 'الحديدة', fullGov: 'الحديدة' },
    { id: 'marib', label: 'مأرب', fullGov: 'مأرب' },
  ];

  const handleCitySelect = (gov: string) => {
    setGovernorate(gov);
    setSelectedListing(null);
    setCityDropdownOpen(false);
  };

  // View Mode: 'map' (default clean full map) or 'list'
  const [homeViewMode, setHomeViewMode] = useState<'map' | 'list'>('map');

  // Detailed Filter Modal State
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'all' | 'USD' | 'YER' | 'SAR'>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [hasSolarOnly, setHasSolarOnly] = useState<boolean>(false);

  // Selected Pin Preview Card (Floating at bottom above nav bar)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showOrgCard, setShowOrgCard] = useState<boolean>(true);

  // Featured Yemeni Organization (matching screenshot layout)
  const featuredOrg = organizations[0];

  // -------------------------------------------------------------
  // Role-Aware Map Mode & Role-Specific Filter States (10 Roles)
  // -------------------------------------------------------------
  const isPublicRole = currentUser.role === 'visitor' || currentUser.role === 'seeker';
  const [isAdminMapMode, setIsAdminMapMode] = useState<boolean>(!isPublicRole);

  // When role changes, default admin map mode to true for management/staff roles
  useEffect(() => {
    setIsAdminMapMode(!isPublicRole);
    setSelectedListing(null);
  }, [currentUser.role]);

  // 3. Advertiser Filter State
  const [advStatusFilter, setAdvStatusFilter] = useState<'all' | 'published' | 'unpublished' | 'draft' | 'under_review' | 'needs_changes' | 'suspended_expired'>('all');

  // 4. Org Manager Filter State
  const [orgStatusFilter, setOrgStatusFilter] = useState<'all' | 'published' | 'unpublished' | 'under_review' | 'needs_changes' | 'suspended'>('all');
  const [orgAgentFilter, setOrgAgentFilter] = useState<string>('all');

  // 5. Org Agent Filter State
  const [agentStatusFilter, setAgentStatusFilter] = useState<'all' | 'published' | 'under_review' | 'draft'>('all');

  // 6. Moderator Filter State
  const [modQueueFilter, setModQueueFilter] = useState<'all' | 'under_review' | 'pending_completion' | 'needs_changes' | 'published' | 'suspended'>('under_review');

  // 7. Verifier Filter State
  const [verStatusFilter, setVerStatusFilter] = useState<'all' | 'pending_verification' | 'needs_info' | 'verified_only'>('pending_verification');

  // 8. Reporter Admin Filter State
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'new' | 'investigating' | 'suspended' | 'resolved'>('all');
  const [reportSeverityFilter, setReportSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [showNonReported, setShowNonReported] = useState<boolean>(false);

  // 9. System Admin Filter State
  const [adminUserTypeFilter, setAdminUserTypeFilter] = useState<'all' | 'individual' | 'organization' | 'agent'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | ListingStatus>('all');
  const [adminOrgFilter, setAdminOrgFilter] = useState<string>('all');
  const [adminHasReportsFilter, setAdminHasReportsFilter] = useState<boolean>(false);

  // 10. Support Filter State
  const [supportSearchQuery, setSupportSearchQuery] = useState<string>('');
  const [supportOnlyWithTickets, setSupportOnlyWithTickets] = useState<boolean>(false);
  const [supportStatusFilter, setSupportStatusFilter] = useState<'all' | ListingStatus>('all');

  // 11. Accountant / Financial Filter State
  const [financeFilter, setFinanceFilter] = useState<'all' | 'featured_paid' | 'pending_payment' | 'expired_subscription'>('all');
  const [financePackage, setFinancePackage] = useState<'all' | 'standard' | 'featured' | 'premium'>('all');

  // Active Role Map Title
  const roleMapTitle = useMemo(() => {
    if (!isAdminMapMode || isPublicRole) return 'خريطة عقارات اليمن التفاعلية';
    switch (currentUser.role) {
      case 'advertiser':
        return 'خريطة إعلاناتي العقارية (المعلن الفردي)';
      case 'org_manager':
        return `خريطة عقارات المنشأة (${currentUser.orgName || 'المكتب العقاري'})`;
      case 'org_agent':
        return 'خريطة إعلانات الوسيط ومسؤول التسويق';
      case 'moderator':
        return 'خريطة طابور الفحص والتدقيق الجغرافي';
      case 'verifier':
        return 'خريطة التحقق الميداني والوثائق العقارية';
      case 'reporter_admin':
        return 'خريطة متابعة البلاغات والنزاعات الجغرافية';
      case 'system_admin':
        return 'خريطة الإدارة العامة والرقابة الشاملة';
      case 'support':
        return 'خريطة الدعم الفني وتتبع استفسارات العملاء';
      case 'accountant':
        return 'خريطة الاشتراكات والعمليات المالية';
      default:
        return 'خريطة عقارات اليمن التفاعلية';
    }
  }, [isAdminMapMode, isPublicRole, currentUser]);

  // Active Short Filter Summary Label for the Dropdown Trigger Button
  const currentRoleFilterSummary = useMemo(() => {
    if (!isAdminMapMode || isPublicRole) {
      if (visitorFilter === 'verified') return 'العامة: موثقة';
      if (visitorFilter === 'featured') return 'العامة: مميزة';
      return isPublicRole ? 'العامة: كل المنشور' : 'معاينة كزائر';
    }
    switch (currentUser.role) {
      case 'advertiser': {
        const map: Record<string, string> = {
          all: 'إعلاناتي: الكل',
          published: 'إعلاناتي: المنشورة',
          unpublished: 'إعلاناتي: غير منشورة',
          draft: 'إعلاناتي: المسودات',
          under_review: 'إعلاناتي: مراجعة',
          needs_changes: 'إعلاناتي: تحتاج تعديل',
          suspended_expired: 'إعلاناتي: موقوفة'
        };
        return map[advStatusFilter] || 'إعلاناتي';
      }
      case 'org_manager': {
        const map: Record<string, string> = {
          all: 'المكتب: الكل',
          published: 'المكتب: المنشورة',
          unpublished: 'المكتب: غير منشورة',
          under_review: 'المكتب: مراجعة',
          needs_changes: 'المكتب: تحتاج تعديل',
          suspended: 'المكتب: موقوفة'
        };
        return map[orgStatusFilter] || 'عقارات المكتب';
      }
      case 'org_agent': {
        const map: Record<string, string> = {
          all: 'الوسيط: الكل',
          published: 'الوسيط: المنشورة',
          under_review: 'الوسيط: مراجعة',
          draft: 'الوسيط: مسودات'
        };
        return map[agentStatusFilter] || 'إعلانات الوسيط';
      }
      case 'moderator': {
        const map: Record<string, string> = {
          under_review: 'الفحص: تنتظر المراجعة',
          pending_completion: 'الفحص: استكمال بيانات',
          needs_changes: 'الفحص: أُعيدت للتعديل',
          published: 'الفحص: منشورة',
          suspended: 'الفحص: موقوفة',
          all: 'الفحص: كافة الحالات'
        };
        return map[modQueueFilter] || 'طابور الفحص';
      }
      case 'verifier': {
        const map: Record<string, string> = {
          pending_verification: 'التحقق: بانتظار التحقق',
          needs_info: 'التحقق: تحتاج وثائق',
          verified_only: 'التحقق: موثقة ومكتملة',
          all: 'التحقق: كل المعاملات'
        };
        return map[verStatusFilter] || 'التحقق';
      }
      case 'reporter_admin': {
        const map: Record<string, string> = {
          all: 'البلاغات: كل البلاغات',
          new: 'البلاغات: جديدة',
          investigating: 'البلاغات: قيد التحقيق',
          suspended: 'البلاغات: موقوفة',
          resolved: 'البلاغات: مغلقة'
        };
        return map[reportStatusFilter] || 'البلاغات';
      }
      case 'accountant': {
        const map: Record<string, string> = {
          all: 'المالية: كافة العمليات',
          featured_paid: 'المالية: مدفوعة ومميزة',
          pending_payment: 'المالية: بانتظار الدفع',
          expired_subscription: 'المالية: منتهية'
        };
        return map[financeFilter] || 'المالية';
      }
      case 'support': {
        if (supportOnlyWithTickets) return 'الدعم: تذاكر فقط';
        return supportStatusFilter === 'all' ? 'الدعم: كل الحالات' : `الدعم: ${supportStatusFilter}`;
      }
      case 'system_admin': {
        if (adminStatusFilter !== 'all') return `الإدارة: ${adminStatusFilter}`;
        if (adminUserTypeFilter !== 'all') return `الإدارة: ${adminUserTypeFilter === 'individual' ? 'أفراد' : 'مكاتب'}`;
        return 'الإدارة: كافة العقارات';
      }
      default:
        return 'خريطة الدور';
    }
  }, [
    isAdminMapMode,
    isPublicRole,
    currentUser.role,
    visitorFilter,
    advStatusFilter,
    orgStatusFilter,
    agentStatusFilter,
    modQueueFilter,
    verStatusFilter,
    reportStatusFilter,
    financeFilter,
    supportOnlyWithTickets,
    supportStatusFilter,
    adminStatusFilter,
    adminUserTypeFilter
  ]);

  // Consolidated Map Search & Role Authorization Parameters
  const mapSearchParams: MapSearchParams = useMemo(() => ({
    purpose,
    propertyType,
    governorate,
    keyword,
    currency,
    minPrice,
    maxPrice,
    hasSolarOnly,
    role: currentUser.role,
    currentUser,
    isAdminMapMode,
    advStatusFilter,
    orgStatusFilter,
    orgAgentFilter,
    agentStatusFilter,
    modQueueFilter,
    verStatusFilter,
    reportStatusFilter,
    reportSeverityFilter,
    showNonReported,
    adminUserTypeFilter,
    adminStatusFilter,
    adminOrgFilter,
    adminHasReportsFilter,
    supportSearchQuery,
    supportOnlyWithTickets,
    supportStatusFilter,
    financeFilter,
    financePackage
  }), [
    purpose,
    propertyType,
    governorate,
    keyword,
    currency,
    minPrice,
    maxPrice,
    hasSolarOnly,
    currentUser,
    isAdminMapMode,
    advStatusFilter,
    orgStatusFilter,
    orgAgentFilter,
    agentStatusFilter,
    modQueueFilter,
    verStatusFilter,
    reportStatusFilter,
    reportSeverityFilter,
    showNonReported,
    adminUserTypeFilter,
    adminStatusFilter,
    adminOrgFilter,
    adminHasReportsFilter,
    supportSearchQuery,
    supportOnlyWithTickets,
    supportStatusFilter,
    financeFilter,
    financePackage
  ]);

  // Filter listings strictly according to user role and active filters
  const displayedListings = useMemo(() => {
    let pool: Listing[] = [];

    // CASE A: Visitor / Seeker / or Admin in "Public Visitor Mode"
    // قاعدة حصرية العقار المحجوز: يختفي فوراً من جميع القوائم والخرائط للعامة
    if (!isAdminMapMode || isPublicRole) {
      pool = listings.filter(l => l.status === 'published' && !l.isReserved);
      if (visitorFilter === 'verified') {
        pool = pool.filter(l => Boolean(l.verificationBadges && l.verificationBadges.length > 0));
      } else if (visitorFilter === 'featured') {
        pool = pool.filter(l => Boolean(l.isFeatured || (l.featuredOrder && l.featuredOrder > 0)));
      }
    } else {
      // CASE B: Role-Specific Management Map Mode
      switch (currentUser.role) {
        // 3. المعلن الفردي
        case 'advertiser': {
          pool = listings.filter(l => l.advertiser.id === currentUser.id);
          if (advStatusFilter === 'published') {
            pool = pool.filter(l => l.status === 'published');
          } else if (advStatusFilter === 'unpublished') {
            pool = pool.filter(l => l.status !== 'published');
          } else if (advStatusFilter === 'draft') {
            pool = pool.filter(l => l.status === 'draft');
          } else if (advStatusFilter === 'under_review') {
            pool = pool.filter(l => l.status === 'under_review');
          } else if (advStatusFilter === 'needs_changes') {
            pool = pool.filter(l => l.status === 'needs_changes');
          } else if (advStatusFilter === 'suspended_expired') {
            pool = pool.filter(l => l.status === 'suspended' || l.status === 'expired');
          }
          break;
        }

        // 4. مدير المكتب العقاري
        case 'org_manager': {
          pool = listings.filter(l => l.advertiser.orgId && l.advertiser.orgId === currentUser.orgId);
          if (orgStatusFilter === 'published') {
            pool = pool.filter(l => l.status === 'published');
          } else if (orgStatusFilter === 'unpublished') {
            pool = pool.filter(l => l.status !== 'published');
          } else if (orgStatusFilter === 'under_review') {
            pool = pool.filter(l => l.status === 'under_review');
          } else if (orgStatusFilter === 'needs_changes') {
            pool = pool.filter(l => l.status === 'needs_changes');
          } else if (orgStatusFilter === 'suspended') {
            pool = pool.filter(l => l.status === 'suspended');
          }
          if (orgAgentFilter !== 'all') {
            pool = pool.filter(l => l.assignedAgentId === orgAgentFilter || l.assignedAgentName?.includes(orgAgentFilter));
          }
          break;
        }

        // 5. الوسيط أو موظف الإعلان
        case 'org_agent': {
          pool = listings.filter(l =>
            (l.advertiser.orgId === currentUser.orgId) &&
            (l.assignedAgentId === currentUser.id || l.advertiser.id === currentUser.id)
          );
          if (agentStatusFilter !== 'all') {
            pool = pool.filter(l => l.status === agentStatusFilter);
          }
          break;
        }

        // 6. مراجع الإعلانات
        case 'moderator': {
          pool = listings.filter(l => ['under_review', 'pending_completion', 'needs_changes', 'published', 'suspended'].includes(l.status));
          if (modQueueFilter !== 'all') {
            pool = pool.filter(l => l.status === modQueueFilter);
          }
          break;
        }

        // 7. مسؤول التحقق
        case 'verifier': {
          pool = listings.filter(l =>
            l.status === 'pending_verification' ||
            (l.verificationBadges && l.verificationBadges.length > 0) ||
            Boolean(l.privateDocuments && l.privateDocuments.length > 0)
          );
          if (verStatusFilter === 'pending_verification') {
            pool = pool.filter(l => l.status === 'pending_verification');
          } else if (verStatusFilter === 'needs_info') {
            pool = pool.filter(l => l.status === 'needs_changes');
          } else if (verStatusFilter === 'verified_only') {
            pool = pool.filter(l => l.verificationBadges && l.verificationBadges.length > 0);
          }
          break;
        }

        // 8. مسؤول البلاغات
        case 'reporter_admin': {
          const reportListingMap: Record<string, typeof reports[0]> = {};
          reports.forEach(r => {
            reportListingMap[r.listingId] = r;
          });

          if (showNonReported) {
            pool = listings;
          } else {
            pool = listings.filter(l => Boolean(reportListingMap[l.id]));
          }

          if (reportStatusFilter !== 'all') {
            pool = pool.filter(l => {
              const rep = reportListingMap[l.id];
              if (!rep) return false;
              if (reportStatusFilter === 'new') return rep.status === 'new';
              if (reportStatusFilter === 'investigating') return rep.status === 'investigating';
              if (reportStatusFilter === 'suspended') return rep.status === 'resolved_ad_suspended' || l.status === 'suspended';
              if (reportStatusFilter === 'resolved') return rep.status === 'dismissed' || rep.status === 'resolved_ad_suspended';
              return true;
            });
          }

          if (reportSeverityFilter !== 'all') {
            pool = pool.filter(l => {
              const rep = reportListingMap[l.id];
              return rep && rep.priority === reportSeverityFilter;
            });
          }
          break;
        }

        // 9. مدير النظام / الأدمن العام
        case 'system_admin': {
          pool = listings;
          if (adminStatusFilter !== 'all') {
            pool = pool.filter(l => l.status === adminStatusFilter);
          }
          if (adminUserTypeFilter === 'organization') {
            pool = pool.filter(l => Boolean(l.advertiser.orgId));
          } else if (adminUserTypeFilter === 'individual') {
            pool = pool.filter(l => !l.advertiser.orgId);
          }
          if (adminOrgFilter !== 'all') {
            pool = pool.filter(l => l.advertiser.orgId === adminOrgFilter);
          }
          if (adminHasReportsFilter) {
            const reportedIds = new Set(reports.map(r => r.listingId));
            pool = pool.filter(l => reportedIds.has(l.id));
          }
          break;
        }

        // 10. الدعم الفني
        case 'support': {
          pool = listings;
          if (supportOnlyWithTickets) {
            const ticketUserPhones = new Set(tickets.map(t => t.userPhone));
            pool = pool.filter(l => ticketUserPhones.has(l.advertiser.phone));
          }
          if (supportStatusFilter !== 'all') {
            pool = pool.filter(l => l.status === supportStatusFilter);
          }
          if (supportSearchQuery.trim()) {
            const q = supportSearchQuery.trim().toLowerCase();
            pool = pool.filter(l =>
              l.id.toLowerCase().includes(q) ||
              l.listingNumber.toLowerCase().includes(q) ||
              l.advertiser.phone.includes(q) ||
              l.advertiser.name.toLowerCase().includes(q)
            );
          }
          break;
        }

        // 11. المحاسب والإدارة المالية
        case 'accountant': {
          pool = listings;
          if (financeFilter === 'featured_paid') {
            pool = pool.filter(l => Boolean(l.isFeatured || (l.featuredOrder && l.featuredOrder > 0)));
          } else if (financeFilter === 'pending_payment') {
            pool = pool.filter(l => l.paymentStatus === 'pending');
          } else if (financeFilter === 'expired_subscription') {
            pool = pool.filter(l => l.status === 'expired' || l.paymentStatus === 'overdue');
          }
          if (financePackage !== 'all') {
            pool = pool.filter(l => l.subscriptionPackage === financePackage);
          }
          break;
        }

        default:
          pool = listings.filter(l => l.status === 'published' && !l.isReserved);
          break;
      }
    }

    // Common search filters applied across all roles
    return pool.filter(l => {
      // Purpose (sale/rent)
      if (l.purpose !== purpose) return false;

      // Property type
      if (propertyType !== 'all' && l.propertyType !== propertyType) return false;

      // Governorate & City
      if (governorate !== 'all') {
        const g = l.location.governorate;
        const matches =
          g === governorate ||
          g.includes(governorate) ||
          governorate.includes(g) ||
          (governorate.includes('صنعاء') && g.includes('صنعاء')) ||
          (governorate.includes('إب') && (g.includes('إب') || g.includes('اب'))) ||
          (governorate.includes('ذمار') && g.includes('ذمار'));
        if (!matches) return false;
      }

      // Currency
      if (currency !== 'all' && l.currency !== currency) return false;

      // Price range
      if (minPrice && l.price < Number(minPrice)) return false;
      if (maxPrice && l.price > Number(maxPrice)) return false;

      // Solar system
      if (hasSolarOnly && !l.attributes.hasSolarSystem) return false;

      // Keyword search
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchTitle = l.title.toLowerCase().includes(q);
        const matchCity = l.location.city.toLowerCase().includes(q);
        const matchDistrict = l.location.district.toLowerCase().includes(q);
        const matchListingNum = l.listingNumber.toLowerCase().includes(q);
        if (!matchTitle && !matchCity && !matchDistrict && !matchListingNum) return false;
      }

      return true;
    });
  }, [
    listings,
    reports,
    tickets,
    currentUser,
    isAdminMapMode,
    isPublicRole,
    purpose,
    propertyType,
    governorate,
    currency,
    minPrice,
    maxPrice,
    hasSolarOnly,
    keyword,
    advStatusFilter,
    orgStatusFilter,
    orgAgentFilter,
    agentStatusFilter,
    modQueueFilter,
    verStatusFilter,
    reportStatusFilter,
    reportSeverityFilter,
    showNonReported,
    adminUserTypeFilter,
    adminStatusFilter,
    adminOrgFilter,
    adminHasReportsFilter,
    supportSearchQuery,
    supportOnlyWithTickets,
    supportStatusFilter,
    financeFilter,
    financePackage,
    visitorFilter
  ]);

  const categoryChips = [
    { type: 'all', label: 'الكل' },
    { type: 'apartment', label: 'شقة' },
    { type: 'villa', label: 'فيلا' },
    { type: 'land', label: 'أرض' },
    { type: 'building', label: 'عمارة' },
    { type: 'commercial', label: 'محل' },
    { type: 'office', label: 'مكتب' },
    { type: 'chalet', label: 'استراحة' }
  ];

  const handleResetFilters = () => {
    setPropertyType('all');
    setGovernorate('all');
    setVisitorFilter('all');
    setCurrency('all');
    setMinPrice('');
    setMaxPrice('');
    setHasSolarOnly(false);
    setKeyword('');
    setAdvStatusFilter('all');
    setOrgStatusFilter('all');
    setOrgAgentFilter('all');
    setAgentStatusFilter('all');
    setModQueueFilter('all');
    setVerStatusFilter('all');
    setReportStatusFilter('all');
    setReportSeverityFilter('all');
    setShowNonReported(false);
    setAdminUserTypeFilter('all');
    setAdminStatusFilter('all');
    setAdminOrgFilter('all');
    setAdminHasReportsFilter(false);
    setSupportSearchQuery('');
    setSupportOnlyWithTickets(false);
    setSupportStatusFilter('all');
    setFinanceFilter('all');
    setFinancePackage('all');
  };

  const activeFiltersCount =
    (propertyType !== 'all' ? 1 : 0) +
    (governorate !== 'all' ? 1 : 0) +
    (currency !== 'all' ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (hasSolarOnly ? 1 : 0) +
    (keyword ? 1 : 0);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden select-none bg-slate-100 flex flex-col">
      {/* 1. TOP FLOATING SEARCH & PURPOSE BAR (Exact arrangement from screenshot) */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-25 max-w-2xl mx-auto space-y-2 pointer-events-auto">
        {/* Main Bar: [ تصفية ] + [ قائمة منسدلة للمدن ] + [ قائمة منسدلة لفلاتر الدور ] + [ للبيع 🔑 | للإيجار 🚪 ] */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-lg border border-slate-200/90 flex items-center gap-1.5">
          {/* 1. Blue Filter Button */}
          <button
            onClick={() => setFilterModalOpen(true)}
            className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
            title="تصفية متقدمة"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">تصفية</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#0284c7] text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* 2. City Dropdown Menu (صنعاء، إب، ذمار، عدن، تعز، حضرموت...) */}
          <div className="relative flex-1 min-w-[105px] sm:min-w-[125px]" ref={cityDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setCityDropdownOpen(!cityDropdownOpen);
                setRoleDropdownOpen(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl border text-xs font-black flex items-center justify-between gap-1 transition-all ${
                governorate !== 'all'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/40 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-[#16324F] border-slate-200'
              }`}
              title="اختر المدينة"
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${governorate !== 'all' ? 'text-emerald-600' : 'text-[#12A889]'}`} />
                <span className="truncate">
                  {cityOptions.find(c => c.fullGov === governorate || (governorate.includes('صنعاء') && c.id === 'sanaa') || (governorate.includes('إب') && c.id === 'ibb') || (governorate.includes('ذمار') && c.id === 'dhamar'))?.label || 'كل المدن'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''} ${governorate !== 'all' ? 'text-emerald-700' : 'text-slate-500'}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {cityDropdownOpen && (
              <div className="absolute top-full mt-1.5 right-0 w-48 sm:w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span>المدن والمحافظات</span>
                  {governorate !== 'all' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCitySelect('all');
                      }}
                      className="text-[#12A889] hover:underline font-bold"
                    >
                      عرض الكل
                    </button>
                  )}
                </div>
                {cityOptions.map(city => {
                  const isSelected =
                    governorate === city.fullGov ||
                    (city.id === 'all' && governorate === 'all') ||
                    (city.id === 'sanaa' && governorate.includes('صنعاء')) ||
                    (city.id === 'ibb' && (governorate.includes('إب') || governorate.includes('اب'))) ||
                    (city.id === 'dhamar' && governorate.includes('ذمار'));

                  const count = listings.filter(l =>
                    l.status === 'published' &&
                    l.purpose === purpose &&
                    (city.id === 'all' || l.location.governorate.includes(city.label) || l.location.city.includes(city.label))
                  ).length;

                  return (
                    <button
                      key={city.id}
                      onClick={() => handleCitySelect(city.fullGov)}
                      className={`w-full text-right px-3 py-2 flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-black'
                          : 'text-slate-700 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{city.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          {count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Role-Based Filter Dropdown Menu (قائمة منسدلة بجانب فلاتر المدن تتغير حسب الدور والوظيفة) */}
          <div className="relative flex-1 min-w-[110px] sm:min-w-[140px]" ref={roleDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setCityDropdownOpen(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl border text-xs font-black flex items-center justify-between gap-1 transition-all ${
                !isPublicRole && isAdminMapMode
                  ? 'bg-amber-50/90 text-amber-900 border-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-[#16324F] border-slate-200'
              }`}
              title="فلاتر الدور والوظيفة"
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                {currentUser.role === 'advertiser' && <UserCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                {currentUser.role === 'org_manager' && <Building className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                {currentUser.role === 'org_agent' && <Users className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                {currentUser.role === 'moderator' && <FileCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                {currentUser.role === 'verifier' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                {currentUser.role === 'reporter_admin' && <Flag className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                {currentUser.role === 'accountant' && <CreditCard className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                {currentUser.role === 'support' && <Headphones className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                {currentUser.role === 'system_admin' && <Shield className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                {isPublicRole && <Eye className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                
                <span className="truncate">
                  {currentRoleFilterSummary}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 text-slate-700 font-bold border border-slate-200">
                  {displayedListings.length}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''} ${!isPublicRole && isAdminMapMode ? 'text-amber-700' : 'text-slate-500'}`} />
              </div>
            </button>

            {/* Dropdown Menu Popup (Customized Per User Role) */}
            {roleDropdownOpen && (
              <div className="absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 w-72 sm:w-84 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/95 py-2.5 px-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto text-right">
                {/* Header: Role Title & Count & Close Button */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <Shield className="w-3.5 h-3.5 text-[#12A889] flex-shrink-0" />
                    <span className="font-black text-slate-900 text-xs truncate">{roleMapTitle}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {displayedListings.length} عقار ظاهر
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDropdownOpen(false);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="إغلاق القائمة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Switch between Role Admin Mode & Public Visitor Preview (For Non-Public Roles) */}
                {!isPublicRole && (
                  <div className="mb-2 p-1 bg-slate-100 rounded-xl flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminMapMode(true);
                        setSelectedListing(null);
                        setRoleDropdownOpen(false);
                      }}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        isAdminMapMode
                          ? 'bg-[#16324F] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Shield className="w-3 h-3 text-[#12A889]" />
                      <span>وضع إدارة الدور</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminMapMode(false);
                        setSelectedListing(null);
                        setRoleDropdownOpen(false);
                      }}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        !isAdminMapMode
                          ? 'bg-[#16324F] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-slate-400" />
                      <span>معاينة كزائر (عام)</span>
                    </button>
                  </div>
                )}

                {/* Case 1: When switched to Visitor Preview Mode */}
                {!isPublicRole && !isAdminMapMode && (
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">أنت الآن تعاين الخريطة كما تظهر للجمهور العام:</p>
                    <p>تظهر فقط العقارات المنشورة والمصرح بها، ولا تظهر المسودات أو الإعلانات قيد المراجعة والتدقيق.</p>
                  </div>
                )}

                {/* Case 2: Role-Specific Filter Controls (When Admin Mode is Active or for Public Roles) */}
                {(isPublicRole || isAdminMapMode) && (
                  <div className="space-y-2">
                    {/* 1 & 2. الزائر والباحث عن العقارات (visitor / seeker) */}
                    {isPublicRole && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                          خيارات عرض الجمهور العام
                        </div>
                        {[
                          { id: 'all', label: 'كل العقارات المنشورة والمعتمدة', desc: 'جميع الإعلانات المصرح بها للعامة' },
                          { id: 'verified', label: 'العقارات الموثقة رسمياً فقط', desc: 'صكوك ملكية مفحوصة وميدانية' },
                          { id: 'featured', label: 'العقارات المميزة فقط (VIP)', desc: 'إعلانات ذات أولوية وعروض حصرية' }
                        ].map(opt => {
                          const isSelected = visitorFilter === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setVisitorFilter(opt.id as any);
                                setSelectedListing(null);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-colors border ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
                                  : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{opt.label}</div>
                                <div className="text-[10px] text-slate-500">{opt.desc}</div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                        <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-[10px] text-emerald-800 mt-2">
                          لا تظهر للزائر إلا العقارات المنشورة والمسموح بعرضها للعامة وفق شروط البحث الحالية.
                        </div>
                      </div>
                    )}

                    {/* 3. المعلن الفردي (advertiser) */}
                    {currentUser.role === 'advertiser' && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                          حالة إعلاناتي على الخريطة
                        </div>
                        {[
                          { id: 'all', label: 'جميع إعلاناتي', desc: 'المنشورة وغير المنشورة والمسودات' },
                          { id: 'published', label: 'العقارات المنشورة', desc: 'الظاهرة للعامة على الخريطة' },
                          { id: 'unpublished', label: 'العقارات غير المنشورة', desc: 'تظهر لك فقط لتمييز موقعها' },
                          { id: 'draft', label: 'المسودات', desc: 'إعلانات غير مكتملة قيد الإعداد' },
                          { id: 'under_review', label: 'قيد المراجعة', desc: 'بانتظار موافقة فريق التدقيق' },
                          { id: 'needs_changes', label: 'تحتاج إلى تعديل', desc: 'تتطلب تصحيح الملاحظات' },
                          { id: 'suspended_expired', label: 'الموقوفة أو المنتهية', desc: 'أرشيف وسجلات سابقة' }
                        ].map(tab => {
                          const isSelected = advStatusFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setAdvStatusFilter(tab.id as any);
                                setSelectedListing(null);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-colors border ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
                                  : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{tab.label}</div>
                                <div className="text-[10px] text-slate-500">{tab.desc}</div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                        <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-[10px] text-emerald-800 mt-2 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>إعلاناتك غير المنشورة والمسودات تظهر على خريطتك لتمييز موقعها ولا تظهر للعامة.</span>
                        </div>
                      </div>
                    )}

                    {/* 4. مدير المكتب العقاري (org_manager) */}
                    {currentUser.role === 'org_manager' && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          عقارات المنشأة حسب الحالة
                        </div>
                        <div className="space-y-1">
                          {[
                            { id: 'all', label: 'جميع عقارات المكتب', desc: 'كافة عقارات المنشأة' },
                            { id: 'published', label: 'عقارات المكتب المنشورة', desc: 'المتاحة للجمهور' },
                            { id: 'unpublished', label: 'العقارات غير المنشورة', desc: 'إداري داخلي فقط' },
                            { id: 'under_review', label: 'قيد المراجعة', desc: 'بانتظار الاعتماد' },
                            { id: 'needs_changes', label: 'تحتاج تعديل', desc: 'ملاحظات فريق التدقيق' },
                            { id: 'suspended', label: 'الموقوفة', desc: 'إعلانات تم إيقافها مؤقتاً' }
                          ].map(tab => {
                            const isSelected = orgStatusFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setOrgStatusFilter(tab.id as any);
                                  setSelectedListing(null);
                                  setRoleDropdownOpen(false);
                                }}
                                className={`w-full text-right p-1.5 rounded-xl flex items-center justify-between transition-colors border ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-900 border-blue-300 font-black'
                                    : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-xs">{tab.label}</div>
                                  <div className="text-[10px] text-slate-500">{tab.desc}</div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            تصفية حسب وسيط / موظف المكتب
                          </div>
                          <select
                            value={orgAgentFilter}
                            onChange={e => {
                              setOrgAgentFilter(e.target.value);
                              setSelectedListing(null);
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                          >
                            <option value="all">جميع وسطاء وموظفي المنشأة</option>
                            <option value="هشام القدسي">الوسيط: هشام القدسي</option>
                            <option value="سمير الصلوي">الوسيط: سمير الصلوي</option>
                          </select>
                        </div>

                        <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-200/60 text-[10px] text-blue-800">
                          تقتصر الخريطة على عقارات منشأتك المعتمدة ولا تظهر إعلانات المكاتب الأخرى.
                        </div>
                      </div>
                    )}

                    {/* 5. الوسيط أو موظف الإعلان (org_agent) */}
                    {currentUser.role === 'org_agent' && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                          نطاق إعلانات الوسيط
                        </div>
                        {[
                          { id: 'all', label: 'إعلاناتي أو الإعلانات المسندة إليّ', desc: 'كل ما يقع تحت مسؤوليتي' },
                          { id: 'published', label: 'المنشورة', desc: 'المتاحة للجمهور' },
                          { id: 'under_review', label: 'قيد المراجعة', desc: 'بانتظار تدقيق المنصة' },
                          { id: 'draft', label: 'المسودات', desc: 'قيد التحضير والتجهيز' }
                        ].map(tab => {
                          const isSelected = agentStatusFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setAgentStatusFilter(tab.id as any);
                                setSelectedListing(null);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-colors border ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-black'
                                  : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{tab.label}</div>
                                <div className="text-[10px] text-slate-500">{tab.desc}</div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                        <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/60 text-[10px] text-indigo-800 mt-2">
                          لا تظهر العلامات الخاصة بإعلانات خارج نطاق صلاحياتك وتكليفاتك.
                        </div>
                      </div>
                    )}

                    {/* 6. مراجع الإعلانات (moderator) */}
                    {currentUser.role === 'moderator' && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                          طابور الفحص والتدقيق الجغرافي
                        </div>
                        {[
                          { id: 'under_review', label: 'الإعلانات التي تنتظر المراجعة', desc: 'إعلانات جديدة بانتظار الفحص' },
                          { id: 'pending_completion', label: 'إعلانات تحتاج استكمال البيانات', desc: 'بيانات وصفية أو إحداثيات ناقصة' },
                          { id: 'needs_changes', label: 'إعلانات أُعيدت للتعديل', desc: 'تم إرجاعها للمعلن لتصحيحها' },
                          { id: 'published', label: 'الإعلانات المنشورة', desc: 'مراجعة وتدقيق لاحق' },
                          { id: 'suspended', label: 'الإعلانات الموقوفة', desc: 'إعلانات تم تعليقها لمخالفة' },
                          { id: 'all', label: 'كافة الحالات', desc: 'عرض كل السجلات بنطاق المراجعة' }
                        ].map(tab => {
                          const isSelected = modQueueFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setModQueueFilter(tab.id as any);
                                setSelectedListing(null);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-colors border ${
                                isSelected
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-black'
                                  : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{tab.label}</div>
                                <div className="text-[10px] text-slate-500">{tab.desc}</div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                        <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[10px] text-amber-800 mt-2">
                          تعرض الخريطة الإعلانات الواقعة ضمن نطاق المراجعة مع الالتزام بصلاحيات الدور.
                        </div>
                      </div>
                    )}

                    {/* 7. مسؤول التحقق (verifier) */}
                    {currentUser.role === 'verifier' && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                          حالة مهام التحقق والوثائق
                        </div>
                        {[
                          { id: 'pending_verification', label: 'الإعلانات التي تنتظر التحقق', desc: 'طلبات توثيق صكوك وفحص ميداني' },
                          { id: 'needs_info', label: 'تحتاج مراجعة أو وثائق إضافية', desc: 'نقص في مستندات الملكية' },
                          { id: 'verified_only', label: 'الإعلانات التي اكتمل التحقق منها', desc: 'موثقة رسمياً ومعتمدة' },
                          { id: 'all', label: 'كل المعاملات', desc: 'سجل التحقق الشامل' }
                        ].map(tab => {
                          const isSelected = verStatusFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setVerStatusFilter(tab.id as any);
                                setSelectedListing(null);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-colors border ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-900 border-blue-300 font-black'
                                  : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{tab.label}</div>
                                <div className="text-[10px] text-slate-500">{tab.desc}</div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                        <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-[10px] text-blue-900 mt-2 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>تنبيه نظامي: لا يُعد ظهور العقار على الخريطة دليلاً على ملكيته أو صحة حدوده القانونية.</span>
                        </div>
                      </div>
                    )}

                    {/* 8. مسؤول البلاغات (reporter_admin) */}
                    {currentUser.role === 'reporter_admin' && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          العقارات المرتبطة بالبلاغات
                        </div>
                        <div className="space-y-1">
                          {[
                            { id: 'all', label: 'كل العقارات المرتبطة ببلاغات', desc: 'كافة البلاغات الجغرافية' },
                            { id: 'new', label: 'العقارات المرتبطة ببلاغات جديدة', desc: 'بانتظار الفرز والتدقيق' },
                            { id: 'investigating', label: 'مرتبطة ببلاغات قيد المعالجة', desc: 'قيد التحقيق الميداني' },
                            { id: 'suspended', label: 'موقوفة بسبب بلاغ', desc: 'تم تعليق الإعلان احترازياً' },
                            { id: 'resolved', label: 'مرتبطة ببلاغات مغلقة', desc: 'تم حل النزاع والمراجعة' }
                          ].map(tab => {
                            const isSelected = reportStatusFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setReportStatusFilter(tab.id as any);
                                  setSelectedListing(null);
                                  setRoleDropdownOpen(false);
                                }}
                                className={`w-full text-right p-1.5 rounded-xl flex items-center justify-between transition-colors border ${
                                  isSelected
                                    ? 'bg-rose-50 text-rose-900 border-rose-300 font-black'
                                    : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-xs">{tab.label}</div>
                                  <div className="text-[10px] text-slate-500">{tab.desc}</div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            مستوى الخطورة والمقارنة
                          </div>
                          <select
                            value={reportSeverityFilter}
                            onChange={e => {
                              setReportSeverityFilter(e.target.value as any);
                              setSelectedListing(null);
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            <option value="all">كل مستويات الخطورة</option>
                            <option value="critical">حرجة (نزاع ملكية / تكرار احتيالي)</option>
                            <option value="high">عالية</option>
                            <option value="medium">متوسطة</option>
                            <option value="low">منخفضة</option>
                          </select>

                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                            <input
                              type="checkbox"
                              checked={showNonReported}
                              onChange={e => setShowNonReported(e.target.checked)}
                              className="w-3.5 h-3.5 text-rose-600 rounded"
                            />
                            <span>مقارنة مع كافة العقارات على الخريطة</span>
                          </label>
                        </div>

                        <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-200/60 text-[10px] text-rose-800">
                          لا يؤدي اختيار فلتر البلاغات لإيقاف الإعلان تلقائياً ولا تُكشف تفاصيل البلاغات الخاصة على الخريطة العامة.
                        </div>
                      </div>
                    )}

                    {/* 9. مسؤول المالية (accountant) */}
                    {currentUser.role === 'accountant' && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          العمليات والاشتراكات المالية
                        </div>
                        <div className="space-y-1">
                          {[
                            { id: 'all', label: 'كافة العمليات المالية', desc: 'سجل العقارات المشتركة' },
                            { id: 'featured_paid', label: 'العقارات المميزة والمدفوعة', desc: 'إعلانات مفعلة باشتراك مدفوع' },
                            { id: 'pending_payment', label: 'بانتظار الدفع أو التفعيل', desc: 'فواتير تحت التسديد' },
                            { id: 'expired_subscription', label: 'اشتراكات منتهية أو متأخرة', desc: 'تتطلب تجديد الباقة' }
                          ].map(tab => {
                            const isSelected = financeFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setFinanceFilter(tab.id as any);
                                  setSelectedListing(null);
                                  setRoleDropdownOpen(false);
                                }}
                                className={`w-full text-right p-1.5 rounded-xl flex items-center justify-between transition-colors border ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
                                    : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-xs">{tab.label}</div>
                                  <div className="text-[10px] text-slate-500">{tab.desc}</div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            نوع باقة الإعلان
                          </div>
                          <select
                            value={financePackage}
                            onChange={e => {
                              setFinancePackage(e.target.value as any);
                              setSelectedListing(null);
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            <option value="all">جميع الباقات والاشتراكات</option>
                            <option value="standard">باقة عادية</option>
                            <option value="featured">باقة مميزة</option>
                            <option value="premium">باقة بريميوم VIP</option>
                          </select>
                        </div>

                        <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-[10px] text-emerald-800">
                          تقتصر الفلاتر على العقارات المرتبطة بالعمليات المالية التي يحق للمسؤول الاطلاع عليها دون كشف أسرار غير لازمة.
                        </div>
                      </div>
                    )}

                    {/* 10. مسؤول الدعم الفني (support) */}
                    {currentUser.role === 'support' && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          استعراض ومتابعة استفسارات العملاء
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={supportSearchQuery}
                            onChange={e => setSupportSearchQuery(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setRoleDropdownOpen(false);
                              }
                            }}
                            placeholder="بحث برقم الإعلان أو هاتف المعلن (اضغط Enter للبحث)..."
                            className="w-full pl-2 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                        </div>

                        <div className="space-y-1">
                          {[
                            { id: 'all', label: 'كل الحالات' },
                            { id: 'published', label: 'المنشورة' },
                            { id: 'under_review', label: 'قيد المراجعة' },
                            { id: 'suspended', label: 'الموقوفة' }
                          ].map(tab => {
                            const isSelected = supportStatusFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setSupportStatusFilter(tab.id as any);
                                  setSelectedListing(null);
                                  setRoleDropdownOpen(false);
                                }}
                                className={`w-full text-right p-1.5 rounded-xl flex items-center justify-between transition-colors border ${
                                  isSelected
                                    ? 'bg-teal-50 text-teal-900 border-teal-300 font-black'
                                    : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                                }`}
                              >
                                <span className="font-bold text-xs">{tab.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                          <input
                            type="checkbox"
                            checked={supportOnlyWithTickets}
                            onChange={e => {
                              setSupportOnlyWithTickets(e.target.checked);
                              setRoleDropdownOpen(false);
                            }}
                            className="w-3.5 h-3.5 text-teal-600 rounded"
                          />
                          <span>عقارات مرتبطة بتذاكر دعم مفتوحة فقط</span>
                        </label>

                        <div className="p-1.5 rounded-lg bg-teal-50/70 border border-teal-200/60 text-[10px] text-teal-800">
                          وضع استعراض وقراءة فقط لمساعدة العملاء، دون صلاحيات تعديل مباشر على العقارات.
                        </div>
                      </div>
                    )}

                    {/* 11. مدير النظام (system_admin) */}
                    {currentUser.role === 'system_admin' && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          الرقابة الشاملة وإدارة النظام
                        </div>
                        <div className="space-y-1">
                          {[
                            { id: 'all', label: 'كافة الحالات' },
                            { id: 'published', label: 'المنشورة' },
                            { id: 'under_review', label: 'قيد المراجعة' },
                            { id: 'draft', label: 'المسودات' },
                            { id: 'pending_verification', label: 'بانتظار التحقق' },
                            { id: 'needs_changes', label: 'تحتاج تعديل' },
                            { id: 'suspended', label: 'الموقوفة' }
                          ].map(tab => {
                            const isSelected = adminStatusFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setAdminStatusFilter(tab.id as any);
                                  setSelectedListing(null);
                                  setRoleDropdownOpen(false);
                                }}
                                className={`w-full text-right p-1.5 rounded-xl flex items-center justify-between transition-colors border ${
                                  isSelected
                                    ? 'bg-purple-50 text-purple-900 border-purple-300 font-black'
                                    : 'text-slate-700 hover:bg-slate-50 border-transparent font-medium'
                                }`}
                              >
                                <span className="font-bold text-xs">{tab.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-slate-100 pt-2 space-y-1.5">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            نوع المعلن
                          </div>
                          <select
                            value={adminUserTypeFilter}
                            onChange={e => {
                              setAdminUserTypeFilter(e.target.value as any);
                              setSelectedListing(null);
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            <option value="all">كل أنواع المعلنين</option>
                            <option value="individual">أفراد فقط</option>
                            <option value="organization">مكاتب ومنشآت عقارية</option>
                          </select>

                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                            <input
                              type="checkbox"
                              checked={adminHasReportsFilter}
                              onChange={e => {
                                setAdminHasReportsFilter(e.target.checked);
                                setRoleDropdownOpen(false);
                              }}
                              className="w-3.5 h-3.5 text-purple-600 rounded"
                            />
                            <span>عليها بلاغات أو تتطلب إجراءً إدارياً</span>
                          </label>
                        </div>

                        <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-200/60 text-[10px] text-purple-800">
                          خريطة رقابية شاملة لكافة إعلانات الجمهورية اليمنية مع بقاء صلاحيات إدارة النظام منفصلة عن عرض العلامات.
                        </div>
                      </div>
                    )}

                    {/* Quick Apply / Close Button at bottom */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setRoleDropdownOpen(false)}
                        className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تطبيق وإغلاق القائمة</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Segmented Purpose Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black flex-shrink-0">
            <button
              onClick={() => {
                setPurpose('sale');
                setSelectedListing(null);
              }}
              className={`py-1.5 px-2.5 sm:px-3 rounded-lg flex items-center justify-center gap-1 transition-all ${
                purpose === 'sale'
                  ? 'bg-white text-[#16324F] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>للبيع</span>
              <Key className="w-3 h-3 text-emerald-600" />
            </button>

            <button
              onClick={() => {
                setPurpose('rent');
                setSelectedListing(null);
              }}
              className={`py-1.5 px-2.5 sm:px-3 rounded-lg flex items-center justify-center gap-1 transition-all ${
                purpose === 'rent'
                  ? 'bg-white text-[#16324F] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>للإيجار</span>
              <DoorOpen className="w-3 h-3 text-[#16324F]" />
            </button>
          </div>
        </div>

        {/* 2. HORIZONTAL SCROLLABLE CATEGORY CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-0.5">
          {categoryChips.map(chip => {
            const isSelected = propertyType === chip.type;
            return (
              <button
                key={chip.type}
                onClick={() => {
                  setPropertyType(chip.type as any);
                  setSelectedListing(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs border ${
                  isSelected
                    ? 'bg-white text-emerald-700 border-emerald-600 ring-2 ring-emerald-600/30 font-black'
                    : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. FLOATING VERIFIED ORGANIZATION CARD (Top Right) */}
      {showOrgCard && homeViewMode === 'map' && (
        <div className="absolute top-36 right-3 sm:right-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 max-w-[240px] text-right pointer-events-auto animate-in fade-in duration-300 hidden sm:block">
          <button
            onClick={() => setShowOrgCard(false)}
            className="absolute top-2 left-2 text-slate-400 hover:text-slate-600 text-xs w-4 h-4 flex items-center justify-center"
          >
            ✕
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
              <img src={featuredOrg.logoUrl} alt={featuredOrg.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>منشأة معتمدة</span>
              </div>
              <h4 className="font-bold text-xs text-[#16324F] leading-tight line-clamp-1">{featuredOrg.name}</h4>
              <span className="text-[10px] text-slate-500 font-medium">عقارات معتمدة في صنعاء وعدن</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. MAIN VIEWPORT (Map Mode vs List Mode) */}
      {homeViewMode === 'map' ? (
        <div className="relative flex-1 w-full h-full z-0">
          <DalaniMap
            searchParams={mapSearchParams}
            listings={displayedListings}
            selectedListingId={selectedListing?.id}
            onSelectListing={listing => setSelectedListing(listing)}
            height="100%"
            showFilters={false}
            selectedGovernorate={governorate}
            allowAllStatuses={isAdminMapMode && !isPublicRole}
          />
        </div>
      ) : (
        /* Alternate Clean List View (No bulky drawer underneath) */
        <div className="flex-1 overflow-y-auto pt-36 pb-8 px-4 sm:px-6 max-w-6xl mx-auto w-full z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm text-[#16324F]">
              العقارات المتاحة {purpose === 'sale' ? 'للبيع' : 'للإيجار'} ({displayedListings.length})
            </h3>
            <button
              onClick={() => setHomeViewMode('map')}
              className="px-3 py-1.5 bg-[#16324F] text-white text-xs font-bold rounded-xl flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5 text-[#12A889]" />
              <span>العودة للخريطة</span>
            </button>
          </div>

          {displayedListings.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <p className="text-xs text-slate-500">لا توجد عقارات مطابقة لمعايير البحث الحالية.</p>
              <button
                onClick={handleResetFilters}
                className="mt-3 px-4 py-1.5 bg-[#12A889] text-white text-xs font-bold rounded-xl"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onSelect={onSelectListing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. FLOATING VIEW MODE TOGGLE PILL (At Bottom of Map) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-25 pointer-events-auto">
        <button
          onClick={() => setHomeViewMode(homeViewMode === 'map' ? 'list' : 'map')}
          className="px-4 py-2 rounded-full bg-[#16324F]/95 hover:bg-[#16324F] text-white text-xs font-black shadow-xl border border-slate-600/80 flex items-center gap-2 backdrop-blur-md transition-all transform hover:scale-105"
        >
          {homeViewMode === 'map' ? (
            <>
              <ListFilter className="w-4 h-4 text-[#12A889]" />
              <span>قائمة العقارات ({displayedListings.length})</span>
            </>
          ) : (
            <>
              <Map className="w-4 h-4 text-[#12A889]" />
              <span>عرض الخريطة الحية</span>
            </>
          )}
        </button>
      </div>

      {/* 6. FLOATING PROPERTY PREVIEW CARD (When a Pin is Tapped) */}
      {selectedListing && homeViewMode === 'map' && (
        <div className="absolute bottom-16 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-30 pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl p-3 shadow-2xl border border-slate-200/90 animate-in slide-in-from-bottom-4 duration-200">
          <div className="relative flex items-center gap-3">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
              <img
                src={(selectedListing.images && selectedListing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}
                alt={selectedListing.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-[#12A889] text-white text-[9px] font-bold">
                {selectedListing.purpose === 'sale' ? 'للبيع' : 'للإيجار'}
              </span>
            </div>

            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-sm text-[#12A889]">
                  {selectedListing.currency === 'USD'
                    ? `$${(selectedListing.price || 0).toLocaleString()}`
                    : `${(selectedListing.price || 0).toLocaleString()} ${selectedListing.currency || 'YER'}`}
                </span>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <h4 className="font-bold text-xs text-[#16324F] truncate mb-1">{selectedListing.title}</h4>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2 truncate">
                <MapPin className="w-3 h-3 text-[#12A889] flex-shrink-0" />
                <span>{selectedListing.location?.city || ''} {selectedListing.location?.district ? `- ${selectedListing.location.district}` : ''}</span>
              </div>

              {/* Role Context & Status Indicator in Admin Map Mode */}
              {isAdminMapMode && !isPublicRole && (
                <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedListing.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedListing.status === 'under_review'
                      ? 'bg-amber-100 text-amber-800'
                      : selectedListing.status === 'draft'
                      ? 'bg-slate-200 text-slate-800'
                      : selectedListing.status === 'needs_changes'
                      ? 'bg-orange-100 text-orange-800'
                      : selectedListing.status === 'pending_verification'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedListing.status === 'published' && 'منشور'}
                    {selectedListing.status === 'under_review' && 'قيد المراجعة'}
                    {selectedListing.status === 'draft' && 'مسودة'}
                    {selectedListing.status === 'needs_changes' && 'يحتاج تعديل'}
                    {selectedListing.status === 'pending_verification' && 'بانتظار التحقق'}
                    {selectedListing.status === 'suspended' && 'موقوف'}
                    {selectedListing.status === 'expired' && 'منتهٍ'}
                  </span>

                  {currentUser.role === 'reporter_admin' && reports.some(r => r.listingId === selectedListing.id) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 flex items-center gap-1">
                      <Flag className="w-2.5 h-2.5 text-rose-600" />
                      <span>بلاغ نشط</span>
                    </span>
                  )}

                  {currentUser.role === 'accountant' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {selectedListing.paymentStatus === 'paid' ? 'مدفوع' : 'معلق الدفع'}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold">{selectedListing.area || 0} {selectedListing.areaUnit || 'م²'}</span>
                
                <div className="flex items-center gap-1.5">
                  {/* Role-specific direct navigation action */}
                  {currentUser.role === 'moderator' && selectedListing.status === 'under_review' && (
                    <button
                      onClick={() => onNavigate('moderation', { listingId: selectedListing.id })}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <FileCheck className="w-3 h-3" />
                      <span>فحص</span>
                    </button>
                  )}

                  {currentUser.role === 'verifier' && (
                    <button
                      onClick={() => onNavigate('verification', { listingId: selectedListing.id })}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>تحقق</span>
                    </button>
                  )}

                  {currentUser.role === 'reporter_admin' && reports.some(r => r.listingId === selectedListing.id) && (
                    <button
                      onClick={() => onNavigate('reports', { listingId: selectedListing.id })}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Flag className="w-3 h-3" />
                      <span>متابعة البلاغ</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectListing(selectedListing)}
                    className="px-3 py-1 bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span>التفاصيل</span>
                    <span>←</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. ADVANCED FILTERS MODAL (Triggered by [ تصفية ]) */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0284c7]" />
                <span>تصفية عقارات اليمن المتقدمة</span>
              </h3>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Keyword */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">الكلمة المفتاحية أو الحي:</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="مثال: حدة، خورمكسر، بيت بوس..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Governorate */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">المحافظة:</label>
                <select
                  value={governorate}
                  onChange={e => setGovernorate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="all">جميع المحافظات اليمنية</option>
                  {YEMEN_GOVERNORATES.map(gov => (
                    <option key={gov.name} value={gov.name}>
                      {gov.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency & Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العملة:</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">كل العملات</option>
                    <option value="USD">دولار أمريكي ($)</option>
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نطاق السعر:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      placeholder="من"
                      className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      placeholder="إلى"
                      className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Solar check */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-bold text-amber-800">
                <input
                  type="checkbox"
                  checked={hasSolarOnly}
                  onChange={e => setHasSolarOnly(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>عقارات مزودة بمنظومة طاقة شمسية فقط</span>
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين</span>
              </button>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                تطبيق الفلاتر ({displayedListings.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
