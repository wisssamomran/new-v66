import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db as pgDb, schema, checkPostgresConnection } from '../db';
import { eq } from 'drizzle-orm';
import { identityRepository } from './modules/identity/identityRepository';
import { propertyAssetsRepository } from './modules/propertyAssets/propertyAssetsRepository';
import { marketplaceRepository } from './modules/marketplace/marketplaceRepository';
import { operationsRepository } from './modules/operations/operationsRepository';
import { contractsRepository } from './modules/contracts/contractsRepository';
import { governanceRepository } from './modules/governance/governanceRepository';
import {
  Listing,
  Organization,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  User,
  ListingStatus,
  UserRole,
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
  PropertyRequest,
  PropertyBooking,
  DealMessage,
  InspectionVisit,
  DealTerms,
  TermsRevision,
  DealStage,
  TermsStatus,
  PropertyContract,
  ContractClause,
  ContractVersion,
  ContractParty,
  ContractStatus,
  ContractType,
  FinancialClearance,
  HandoverProtocol,
  StatusTimelineEntry,
  DealDispute,
  ElectronicSignatureRecord
} from '../types';
import {
  INITIAL_LISTINGS,
  INITIAL_ORGANIZATIONS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_REPORTS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  MOCK_USERS
} from '../data/yemenData';

export interface DatabaseSchema {
  listings: Listing[];
  organizations: Organization[];
  verifications: VerificationRequest[];
  reports: ReportCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
  users: User[];
  staff: StaffMember[];
  rolesMatrix: Record<string, string[]>;
  activeSessions: ActiveSession[];
  threats: SecurityThreat[];
  blockedIps: BlockedIp[];
  systemSettings: SystemSettings;
  featureFlags: FeatureFlag[];
  backups: BackupPoint[];
  systemErrors: SystemErrorLog[];
  integrations: IntegrationServiceStatus[];
  escalations: EscalationCase[];
  requests: PropertyRequest[];
  bookings: PropertyBooking[];
  contracts: PropertyContract[];
  meta: {
    lastUpdated: string;
    version: string;
  };
}

// Live database storage placed inside node_modules to guarantee NO watcher (node --watch, nodemon, vite) ever restarts
const DB_STORE_DIR = path.resolve(process.cwd(), 'node_modules', '.dalani_cache');
const DB_FILE_PATH = path.resolve(DB_STORE_DIR, 'dalani_database.json');
const PERSISTENT_BACKUP_DIR = path.resolve(process.cwd(), '_dalani_store_');
const PERSISTENT_BACKUP_FILE = path.resolve(PERSISTENT_BACKUP_DIR, 'dalani_database.json');
const BACKUPS_DIR = path.resolve(PERSISTENT_BACKUP_DIR, 'backups');

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

export function normalizeBooking(b: any): PropertyBooking {
  const isSale = b.listingPurpose === 'sale' || (b.listingPrice > 20000 && !b.rentalUsageType);
  const defaultPrice = typeof b.listingPrice === 'number' ? b.listingPrice : 100000;
  const defaultCurrency = b.listingCurrency || 'USD';

  const defaultTerms: DealTerms = b.currentTerms || {
    price: defaultPrice,
    currency: defaultCurrency,
    paymentMethod: b.paymentMethod || (isSale ? 'certified_check' : 'cash'),
    depositAmount: Math.round(defaultPrice * 0.05),
    depositCurrency: defaultCurrency,
    handoverDate: '2026-11-01',
    feeResponsibility: 'shared_equally',
    specialConditions: [
      'فحص وثائق الملكية والبصيرة الشرعية قبل سداد الدفعة النهائية',
      'سداد كافة فواتير الخدمات السابقة حتى تاريخ استلام العقار'
    ],
    notes: b.notes || 'الشروط المتفق عليها مبدئياً'
  };

  const defaultMessages: DealMessage[] = Array.isArray(b.messages) && b.messages.length > 0 ? b.messages : [
    {
      id: `msg-${b.id}-1`,
      bookingId: b.id,
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `تم تفعيل الحجز المؤقت برقم ${b.bookingNumber} وتفعيل الحصرية وقفل العقار عن الجمهور.`,
      timestamp: b.createdAt || '2026-10-17 08:30'
    },
    {
      id: `msg-${b.id}-2`,
      bookingId: b.id,
      senderId: b.seekerId,
      senderName: b.seekerName,
      senderRole: 'seeker',
      type: 'chat',
      text: 'مرحباً، أرجو التنسيق لتحديد موعد للمعاينة الميدانية ومطابقة وثائق العقار.',
      timestamp: b.createdAt || '2026-10-17 09:15'
    },
    {
      id: `msg-${b.id}-3`,
      bookingId: b.id,
      senderId: b.advertiserId,
      senderName: b.advertiserName,
      senderRole: 'advertiser',
      type: 'chat',
      text: 'أهلاً بك، تم تحديد موعد المعاينة وأوراق الملكية جاهزة للاطلاع.',
      timestamp: b.createdAt || '2026-10-17 10:00'
    }
  ];

  const defaultRevisions: TermsRevision[] = Array.isArray(b.termsHistory) && b.termsHistory.length > 0 ? b.termsHistory : [
    {
      id: `rev-${b.id}-1`,
      version: 1,
      proposedBy: {
        id: b.seekerId,
        name: b.seekerName,
        role: 'seeker'
      },
      proposedAt: b.createdAt || '2026-10-17 09:30',
      terms: defaultTerms,
      status: (b.id === 'bkg-201' || b.status === 'completed') ? 'accepted' : (b.termsStatus || 'pending_approval'),
      responseBy: (b.id === 'bkg-201' || b.status === 'completed') ? {
        id: b.advertiserId,
        name: b.advertiserName,
        role: 'advertiser'
      } : undefined,
      responseAt: (b.id === 'bkg-201' || b.status === 'completed') ? (b.agreedTermsApprovedAt || b.createdAt) : undefined,
      responseNotes: (b.id === 'bkg-201' || b.status === 'completed') ? 'موافقة على مسودة الشروط' : undefined
    }
  ];

  return {
    ...b,
    dealStage: b.dealStage || (b.status === 'completed' ? 'contract_completed' : (b.agreedTerms || b.id === 'bkg-201') ? 'terms_negotiation' : 'booking_exclusive'),
    messages: defaultMessages,
    inspectionVisit: b.inspectionVisit || {
      status: (b.id === 'bkg-201' || b.status === 'completed') ? 'completed' : 'confirmed',
      requestedDate: '2026-10-21',
      requestedTime: '16:00',
      locationNotes: 'المعاينة أمام مدخل العقار - التنسيق المسبق مع المالك',
      scheduledBy: b.seekerName,
      confirmedAt: '2026-10-17 11:00',
      completedAt: (b.id === 'bkg-201' || b.status === 'completed') ? '2026-10-18 17:00' : undefined,
      result: (b.id === 'bkg-201' || b.status === 'completed') ? 'satisfied' : 'pending',
      resultNotes: (b.id === 'bkg-201' || b.status === 'completed') ? 'معاينة ناجحة ومطابقة للوصف والصك الشرعي' : undefined
    },
    currentTerms: defaultTerms,
    agreedTerms: b.agreedTerms || ((b.id === 'bkg-201' || b.status === 'completed') ? defaultTerms : undefined),
    agreedTermsApprovedAt: b.agreedTermsApprovedAt || ((b.id === 'bkg-201' || b.status === 'completed') ? '2026-10-18 18:00' : undefined),
    termsStatus: b.termsStatus || ((b.id === 'bkg-201' || b.status === 'completed') ? 'accepted' : 'pending_approval'),
    termsHistory: defaultRevisions,
    contractId: b.contractId || (b.id === 'bkg-201' ? 'cnt-301' : undefined),
    contractNumber: b.contractNumber || (b.id === 'bkg-201' ? 'CNT-2026-3001' : undefined)
  };
}

export function generateStandardContractClauses(
  contractType: ContractType,
  booking: PropertyBooking,
  listing?: Listing,
  terms?: DealTerms
): ContractClause[] {
  const currentTerms = terms || booking.agreedTerms || booking.currentTerms;
  const isSale = contractType === 'sale';
  const price = currentTerms?.price || booking.listingPrice || 0;
  const currency = currentTerms?.currency || booking.listingCurrency || 'USD';
  const currencyLabel = currency === 'USD' ? 'دولار أمريكي' : currency === 'SAR' ? 'ريال سعودي' : 'ريال يمني';
  const deposit = currentTerms?.depositAmount || Math.round(price * 0.05);
  const paymentMethodLabel = currentTerms?.paymentMethod === 'certified_check'
    ? 'شيك مصرفي مصدق'
    : currentTerms?.paymentMethod === 'bank_transfer'
    ? 'حوالة مصرفية رسمية'
    : currentTerms?.paymentMethod === 'installments'
    ? 'أقساط متفق عليها'
    : 'نقداً بالعملة المحددة';
  const handoverDate = currentTerms?.handoverDate || 'خلال أسبوعين من إتمام السداد وتعميد الوثائق';
  const feeText = currentTerms?.feeResponsibility === 'buyer_only'
    ? 'يتحملها المشتري كاملاً'
    : currentTerms?.feeResponsibility === 'seller_only'
    ? 'يتحملها البائع كاملاً'
    : currentTerms?.feeResponsibility === 'tenant_only'
    ? 'يتحملها المستأجر كاملاً'
    : 'تتحملها الأطراف مناصفة وفق العرف التجاري والقانون';

  const clauses: ContractClause[] = [];

  if (isSale) {
    clauses.push(
      {
        id: 'cls-1',
        number: 1,
        title: 'التمهيد وأهلية التعاقد الشرعية والقانونية',
        isMandatory: true,
        content: 'يقر الطرفان (البائع والمشتري) بأهليتهما الشرعية والقانونية المعتبرة شرعاً للتعاقد والتصرف النافي للجهالة، وخلوهما من أي مانع نظامي أو قضائي، وتوافق إرادتهما الحرة على إبرام هذا العقد لبيع وشراء العقار الموصوف ببنوده.'
      },
      {
        id: 'cls-2',
        number: 2,
        title: 'محل العقد ومواصفات المبيع وصك البصيرة',
        isMandatory: true,
        content: `محل هذا البيع هو العقار المسمى [${listing?.title || booking.listingTitle}]، الكائن في [${listing?.location?.governorate || booking.listingGovernorate} - ${listing?.location?.city || 'صنعاء'} - ${listing?.location?.district || ''}]، والبالغ مساحته الإجمالية [${listing?.area || 0}] ${listing?.areaUnit || 'م²'}، والمقيد بصك الملكية الشرعية/البصيرة برقم [${listing?.deedNumber || 'مقيد بالسجل العقاري المعتمد'}].`
      },
      {
        id: 'cls-3',
        number: 3,
        title: 'الثمن الإجمالي وجدول الوفاء والعربون',
        isMandatory: true,
        content: `اتفق الطرفان على أن الثمن الإجمالي المقطوع للعقار هو [${price.toLocaleString()} ${currencyLabel}]، سدد المشتري منه عربون حجز والتزام قدره [${deposit.toLocaleString()} ${currencyLabel}]، ويلتزم المشتري بسداد باقي الثمن وقدره [${(price - deposit).toLocaleString()} ${currencyLabel}] بموجب [${paymentMethodLabel}] عند تحرير وثيقة الإفراغ والتسليم.`
      },
      {
        id: 'cls-4',
        number: 4,
        title: 'المعاينة النافية للجهالة وضمان خلو العقار من النزاع',
        isMandatory: true,
        content: 'يقر المشتري بأنه عاين العقار المبيع المعاينة الشرعية التامة النافية للجهالة وقبله بحالته الراهنة وموقعه وحدوده. كما يقر البائع ويضمن شرعاً وقانوناً خلو المبيع من أي رهن أو حكر أو اختصاص أو حيازة للغير أو أي نزاع قضائي قائم.'
      },
      {
        id: 'cls-5',
        number: 5,
        title: 'التسليم والإفراغ ونقل الملكية والتعميد الشرعي',
        isMandatory: true,
        content: `يلتزم البائع بتسليم العقار المبيع للمشتري خالياً من أي شواغل وتسليم كافة أصول الوثائق والبصائر المعمدة وتعميد وثيقة التنازل لدى الأمين الشرعي المعتمد والسجل العقاري فور استلام كامل الثمن في موعد أقصاه [${handoverDate}].`
      },
      {
        id: 'cls-6',
        number: 6,
        title: 'الرسوم والضرائب وأتعاب الوساطة العقارية',
        isMandatory: false,
        content: `اتفق الطرفان على أن رسوم التوثيق وتعميد الأمين الشرعي وضريبة التصرفات العقارية وأتعاب منصة دلنّي العقارية [${feeText}].`
      },
      {
        id: 'cls-7',
        number: 7,
        title: 'الشرط الجزائي ونكول الأطراف عن الإتمام',
        isMandatory: true,
        content: 'في حال نكول أحد الطرفين أو رجوعه عن إتمام البيع دون مسوغ شرعي أو قانوني قاهر، يلتزم الطرف الناكل بتعويض الطرف الآخر بما يعادل قيمة العربون المتفق عليه كشرط جزائي ملزم قضائياً.'
      },
      {
        id: 'cls-8',
        number: 8,
        title: 'القانون الواجب التطبيق والمحاكم المختصة',
        isMandatory: true,
        content: 'يخضع هذا العقد لأحكام الشريعة الإسلامية والقانون المدني وقوانين التوثيق والتسجيل العقاري السارية في الجمهورية اليمنية، وتختص المحكمة الابتدائية الواقع في دائرتها العقار بنظر أي نزاع قد ينشأ لا قدر الله.'
      }
    );
  } else {
    // Lease Contract
    clauses.push(
      {
        id: 'cls-1',
        number: 1,
        title: 'أطراف العقد وصفاتهم القانونية والأهلية',
        isMandatory: true,
        content: 'أجر الطرف الأول (المؤجر) بموجب هذا العقد بكامل الأهلية الشرعية والقانونية للطرف الثاني (المستأجر) القابل لذلك، كامل العين المؤجرة المبينة أدناه لاستخدامها للغرض المحدد في هذا العقد.'
      },
      {
        id: 'cls-2',
        number: 2,
        title: 'مواصفات العين المؤجرة والغرض من التأجير',
        isMandatory: true,
        content: `العين المؤجرة هي [${listing?.title || booking.listingTitle}]، الواقعة في [${listing?.location?.governorate || booking.listingGovernorate} - ${listing?.location?.city || 'صنعاء'}]، ومخصصة للاستخدام [${listing?.propertyType === 'commercial' ? 'التجاري' : 'السكني العائلي'}] فقط، ولا يحق للمستأجر تغيير الغرض إلا بموافقة خطية مسبقة من المؤجر.`
      },
      {
        id: 'cls-3',
        number: 3,
        title: 'مدة الإيجار وبدء السريان وإشعار التجديد',
        isMandatory: true,
        content: `مدة الإيجار محددة بسنة تعاقدية واحدة (12 شهراً) تبدأ من تاريخ استلام العين المؤجرة في [${handoverDate}]، ولا يجدد العقد تلقائياً بل يستلزم إشعاراً خطياً متبادلاً قبل 60 يوماً من انتهاء المدة في حال رغبة الطرفين بالتجديد.`
      },
      {
        id: 'cls-4',
        number: 4,
        title: 'قيمة الأجرة ومواعيد وطريقة السداد',
        isMandatory: true,
        content: `تم الاتفاق على الأجرة بمبلغ [${price.toLocaleString()} ${currencyLabel}] تُسدد بموجب [${paymentMethodLabel}] مقدماً في بداية كل فترة تعاقدية متفق عليها، بموجب سند قبض رسمي موقع من المؤجر.`
      },
      {
        id: 'cls-5',
        number: 5,
        title: 'مبلغ التأمين والضمانة وشروط الاسترداد',
        isMandatory: true,
        content: `أودع المستأجر لدى المؤجر تأميناً نقدياً قدره [${deposit.toLocaleString()} ${currencyLabel}] كضمان لسلامة العين المؤجرة وسداد فواتير الخدمات، ويسترد كاملاً عند نهاية العقد والإخلاء وتسليم العين بالحالة التي استلمت بها بعد تقديم مخالصات الفواتير.`
      },
      {
        id: 'cls-6',
        number: 6,
        title: 'فواتير الخدمات والاستهلاك والصيانة الدورية',
        isMandatory: true,
        content: 'يلتزم المستأجر بسداد فواتير استهلاك الكهرباء، والمياه، ورسوم النظافة والحراسة بشكل دوري منتظم. وتكون الصيانة الاستهلاكية الدورية على عاتق المستأجر، بينما يتحمل المؤجر الصيانة الإنشائية الهيكلية الناتجة عن العيوب الخفية أو القدم.'
      },
      {
        id: 'cls-7',
        number: 7,
        title: 'حظر التنازل والتأجير من الباطن والتعديل المعماري',
        isMandatory: true,
        content: 'يحظر تماماً على المستأجر التنازل عن هذا العقد أو تأجير العين المؤجرة من الباطن للغير كلياً أو جزئياً، أو إجراء أي تعديلات إنشائية أو إزالة جدران إلا بموافقة خطية صريحة مسبقة من المؤجر.'
      },
      {
        id: 'cls-8',
        number: 8,
        title: 'إنهاء العقد والإخلاء والاختصاص القضائي',
        isMandatory: true,
        content: 'يلتزم المستأجر بإخلاء العين المؤجرة فور انتهاء مدة العقد أو فسخه وتسليم المفاتيح، وفي حال التأخر يلتزم بدفع أجرة مثل مضاعفة عن كل يوم تأخير. ويخضع هذا العقد لقانون تنظيم العلاقة بين المؤجر والمستأجر الساري في الجمهورية اليمنية والمحاكم المختصة.'
      }
    );
  }

  // Append any special conditions from agreed terms as dedicated legal clauses
  if (Array.isArray(currentTerms?.specialConditions) && currentTerms.specialConditions.length > 0) {
    currentTerms.specialConditions.forEach((cond, idx) => {
      clauses.push({
        id: `cls-special-${idx + 1}`,
        number: clauses.length + 1,
        title: `شرط خاص متفق عليه بين الطرفين (${idx + 1})`,
        isMandatory: false,
        content: cond
      });
    });
  }

  return clauses;
}

export function normalizeContract(c: any): PropertyContract {
  const contractType: ContractType = c.contractType === 'lease' ? 'lease' : 'sale';
  const status: ContractStatus = c.status || 'under_review';
  const currentVersion = typeof c.currentVersion === 'number' ? c.currentVersion : 1;
  const clauses: ContractClause[] = Array.isArray(c.clauses) && c.clauses.length > 0 ? c.clauses : [];

  return {
    ...c,
    id: c.id || `cnt-${Date.now()}`,
    contractNumber: c.contractNumber || `CNT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    bookingId: c.bookingId || '',
    bookingNumber: c.bookingNumber || '',
    requestId: c.requestId || '',
    listingId: c.listingId || '',
    listingNumber: c.listingNumber || '',
    listingTitle: c.listingTitle || 'عقار متعاقد عليه',
    contractType,
    status,
    propertySnapshot: c.propertySnapshot || {
      title: c.listingTitle || '',
      propertyType: 'apartment',
      purpose: contractType === 'sale' ? 'sale' : 'rent',
      governorate: 'صنعاء (أمانة العاصمة)',
      city: 'صنعاء',
      district: 'حدة',
      street: 'الشارع الرئيسي',
      area: 200,
      areaUnit: 'م²',
      deedNumber: 'بصيرة شرعية مقيدة برقم 2026/881',
      boundaries: {
        north: 'شارع 14 متر',
        south: 'ملك ورثة فلان',
        east: 'شارع فرعي 10 متر',
        west: 'ملك الجار فلان'
      }
    },
    firstParty: c.firstParty || {
      id: 'adv-1',
      name: 'هشام عبد الرحمن القدسي',
      phone: '+967 777 012 345',
      role: contractType === 'sale' ? 'seller' : 'lessor',
      nationalIdOrPassport: 'بطاقة شخصية رقم 01010049281',
      address: 'صنعاء - حدة',
      signatureStatus: c.firstParty?.signatureStatus || 'unsigned'
    },
    secondParty: c.secondParty || {
      id: 'usr-seeker-1',
      name: 'أحمد العولقي',
      phone: '+967 778 990 011',
      role: contractType === 'sale' ? 'buyer' : 'lessee',
      nationalIdOrPassport: 'بطاقة شخصية رقم 01020081734',
      address: 'صنعاء - بيت بوس',
      signatureStatus: c.secondParty?.signatureStatus || 'unsigned'
    },
    witnesses: Array.isArray(c.witnesses) ? c.witnesses : [
      {
        id: 'wit-1',
        name: 'القاضي / عبد الله محمد الصنعاني (الأمين الشرعي المعتمد)',
        phone: '+967 771 223 344',
        role: 'witness',
        nationalIdOrPassport: 'ترخيص أمين شرعي رقم 1447/04 صادر من وزارة العدل',
        signatureStatus: 'signed',
        signedAt: '2026-10-18 11:00'
      },
      {
        id: 'wit-2',
        name: 'م. فؤاد مسعد العنسي (شاهد إثبات)',
        phone: '+967 773 445 566',
        role: 'witness',
        nationalIdOrPassport: 'بطاقة شخصية رقم 01010033221',
        signatureStatus: 'unsigned'
      }
    ],
    brokerOrAgent: c.brokerOrAgent || {
      id: 'org-1',
      name: 'شركة الوسيط العقاري اليمني',
      phone: '+967 1 445 566',
      commissionAmount: 3200,
      commissionPayer: 'shared_equally'
    },
    financialTerms: c.financialTerms || {
      totalAmount: 320000,
      currency: 'USD',
      depositAmount: 16000,
      depositCurrency: 'USD',
      paymentSchedule: 'عربون حجز عند التوقيع، وسداد الباقي بشيك مصرفي مصدق عند تعميد البصيرة والتسليم',
      advancePaymentMonths: contractType === 'lease' ? 3 : undefined,
      securityDeposit: contractType === 'lease' ? 500 : undefined
    },
    durationTerms: c.durationTerms || {
      startDate: '2026-10-18',
      endDate: contractType === 'lease' ? '2027-10-17' : undefined,
      durationMonths: contractType === 'lease' ? 12 : undefined,
      renewalTerms: contractType === 'lease' ? 'إشعار خطي قبل 60 يوماً من الانتهاء' : undefined,
      handoverDate: '2026-11-01'
    },
    clauses: clauses,
    currentVersion,
    versionHistory: Array.isArray(c.versionHistory) && c.versionHistory.length > 0
      ? c.versionHistory
      : Array.isArray(c.versions) && c.versions.length > 0
      ? c.versions
      : [
          {
            version: 1,
            createdAt: c.createdAt || '2026-10-18 10:00',
            createdBy: {
              id: c.firstParty?.id || 'adv-1',
              name: c.firstParty?.name || 'هشام عبد الرحمن القدسي',
              role: 'advertiser'
            },
            summaryOfChanges: 'مسودة العقد الأولية المنشأة تلقائياً بناءً على بيانات الحجز والشروط المتفق عليها',
            clauses: clauses,
            financialTerms: c.financialTerms || {
              totalAmount: 320000,
              currency: 'USD',
              depositAmount: 16000,
              paymentSchedule: 'شيك مصرفي مصدق عند الإفراغ والتسليم'
            },
            status: status
          }
        ],
    versions: Array.isArray(c.versionHistory) && c.versionHistory.length > 0
      ? c.versionHistory
      : Array.isArray(c.versions) && c.versions.length > 0
      ? c.versions
      : [
          {
            version: 1,
            createdAt: c.createdAt || '2026-10-18 10:00',
            createdBy: {
              id: c.firstParty?.id || 'adv-1',
              name: c.firstParty?.name || 'هشام عبد الرحمن القدسي',
              role: 'advertiser'
            },
            summaryOfChanges: 'مسودة العقد الأولية المنشأة تلقائياً بناءً على بيانات الحجز والشروط المتفق عليها',
            clauses: clauses,
            financialTerms: c.financialTerms || {
              totalAmount: 320000,
              currency: 'USD',
              depositAmount: 16000,
              paymentSchedule: 'شيك مصرفي مصدق عند الإفراغ والتسليم'
            },
            status: status
          }
        ],
    firstPartyApprovedAt: c.firstPartyApprovedAt,
    secondPartyApprovedAt: c.secondPartyApprovedAt,
    approvedBy: c.approvedBy,
    approvedAt: c.approvedAt,
    isModificationPendingApproval: Boolean(c.isModificationPendingApproval),
    modificationRequestedBy: c.modificationRequestedBy,
    modificationReason: c.modificationReason,
    notes: c.notes || '',
    createdAt: c.createdAt || '2026-10-18',
    updatedAt: c.updatedAt || '2026-10-18'
  };
}

function getDefaultContracts(
  bookings: PropertyBooking[],
  listings: Listing[],
  users: User[]
): PropertyContract[] {
  const bkg201 = bookings.find(b => b.id === 'bkg-201');
  const listing102 = listings.find(l => l.id === (bkg201?.listingId || 'list-102'));
  const seekerUser = users.find(u => u.id === (bkg201?.seekerId || 'usr-seeker'));
  const advUser = users.find(u => u.id === (bkg201?.advertiserId || 'adv-1'));

  const clauses = generateStandardContractClauses('sale', bkg201 || ({} as any), listing102, bkg201?.agreedTerms);

  const initialContract: PropertyContract = {
    id: 'cnt-301',
    contractNumber: 'CNT-2026-3001',
    bookingId: 'bkg-201',
    bookingNumber: 'BKG-2026-2001',
    requestId: 'req-102',
    listingId: 'list-102',
    listingNumber: 'YEM-2026-102',
    listingTitle: 'فيلا ملكية للبيع - بيت بوس حي الشباب',
    contractType: 'sale',
    status: 'under_review',
    propertySnapshot: {
      title: 'فيلا ملكية للبيع - بيت بوس حي الشباب',
      propertyType: 'villa',
      purpose: 'sale',
      governorate: 'صنعاء (أمانة العاصمة)',
      city: 'صنعاء',
      district: 'بيت بوس',
      street: 'حي الشباب - شارع 14 متر متفرع من شارع الخمسين',
      area: 450,
      areaUnit: 'م²',
      deedNumber: 'بصيرة شرعية رقم 1445/728 مقيدة بالمحكمة وسجل الأراضي',
      boundaries: {
        north: 'شارع معبد نافذ بعرض 14 متر',
        south: 'ملك الأخ محمد ناصر القحطاني بطول 25 متر',
        east: 'شارع فرعي بعرض 10 متر بطول 18 متر',
        west: 'ملك ورثة الحاج عبد الله العواضي بطول 18 متر'
      }
    },
    firstParty: {
      id: advUser?.id || 'adv-1',
      name: advUser?.name || 'هشام عبد الرحمن القدسي',
      phone: advUser?.phone || '+967 777 012 345',
      role: 'seller',
      nationalIdOrPassport: 'بطاقة شخصية رقم 01010049281 صادرة من أمانة العاصمة',
      address: 'صنعاء - حي حدة السكني',
      signatureStatus: 'signed',
      signedAt: '2026-10-18 10:30'
    },
    secondParty: {
      id: seekerUser?.id || 'usr-seeker-1',
      name: seekerUser?.name || 'أحمد العولقي',
      phone: seekerUser?.phone || '+967 778 990 011',
      role: 'buyer',
      nationalIdOrPassport: 'بطاقة شخصية رقم 01020081734 صادرة من أمانة العاصمة',
      address: 'صنعاء - حي بيت بوس',
      signatureStatus: 'unsigned'
    },
    witnesses: [
      {
        id: 'wit-1',
        name: 'فضيلة الشيخ / عبد الرحمن العنسي (الأمين الشرعي المعتمد)',
        phone: '+967 771 998 877',
        role: 'witness',
        nationalIdOrPassport: 'ترخيص توثيق شرعي رقم 1447/08 صادر عن وزارة العدل',
        signatureStatus: 'signed',
        signedAt: '2026-10-18 11:00'
      },
      {
        id: 'wit-2',
        name: 'م. فؤاد مسعد العنسي (شاهد إثبات)',
        phone: '+967 773 445 566',
        role: 'witness',
        nationalIdOrPassport: 'بطاقة شخصية رقم 01010033221',
        signatureStatus: 'unsigned'
      }
    ],
    brokerOrAgent: {
      id: 'org-1',
      name: 'شركة الوسيط العقاري اليمني',
      phone: '+967 1 445 566',
      commissionAmount: 3200,
      commissionPayer: 'shared_equally'
    },
    financialTerms: {
      totalAmount: 320000,
      currency: 'USD',
      depositAmount: 16000,
      depositCurrency: 'USD',
      paymentSchedule: 'تم سداد 16,000 دولار كعربون حجز وضمان التزام عبر منصة دلنّي، ويلتزم المشتري بسداد باقي الثمن البالغ 304,000 دولار أمريكي بشيك مصرفي مصدق عند الإفراغ والتسليم.',
      advancePaymentMonths: undefined,
      securityDeposit: undefined
    },
    durationTerms: {
      startDate: '2026-10-18',
      handoverDate: '2026-11-01'
    },
    clauses: clauses,
    currentVersion: 1,
    versionHistory: [
      {
        version: 1,
        createdAt: '2026-10-18 10:00',
        createdBy: {
          id: 'adv-1',
          name: 'هشام عبد الرحمن القدسي',
          role: 'advertiser'
        },
        summaryOfChanges: 'مسودة العقد الأولى مستوردة تلقائياً من بيانات الحجز والشروط المعتمدة ومواصفات العقار بالبصيرة الشرعية',
        clauses: clauses,
        financialTerms: {
          totalAmount: 320000,
          currency: 'USD',
          depositAmount: 16000,
          paymentSchedule: 'شيك مصرفي مصدق عند الإفراغ والتسليم'
        },
        status: 'under_review'
      }
    ],
    firstPartyApprovedAt: '2026-10-18 10:30',
    notes: 'تمت مطابقة أصل البصيرة الشرعية وصك الملكية، ومراجعة المسودة تمهيداً لاعتماد الطرف الثاني (المشتري).',
    createdAt: '2026-10-18',
    updatedAt: '2026-10-18'
  };

  return [initialContract];
}

function getDefaultRolesMatrix(): Record<string, string[]> {
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

function getDefaultStaff(users: User[]): StaffMember[] {
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

function getDefaultSystemSettings(): SystemSettings {
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

function getDefaultFeatureFlags(): FeatureFlag[] {
  return [
    {
      id: 'ff-1',
      key: 'public_registrations',
      name: 'تسجيل الحسابات الجديدة للجمهور',
      description: 'السماح للزوار بإنشاء حسابات باحث ومعلن فردي عبر رقم الهاتف',
      enabled: true,
      category: 'core',
      updatedAt: '2026-10-15'
    },
    {
      id: 'ff-2',
      key: 'strict_sms_otp',
      name: 'إلزامية التحقق بـ SMS OTP',
      description: 'إرسال رمز تحقق صالح لمرة واحدة عند كل تسجيل دخول أو نشر إعلان',
      enabled: true,
      category: 'security',
      updatedAt: '2026-10-16'
    },
    {
      id: 'ff-3',
      key: 'direct_broker_chat',
      name: 'المحادثات المباشرة بين الباحث والمعلن',
      description: 'تفعيل المحادثات الفورية عبر الموقع الداخلي إلى جانب الواتساب والاتصال',
      enabled: true,
      category: 'commercial',
      updatedAt: '2026-10-12'
    },
    {
      id: 'ff-4',
      key: 'ai_listing_enhancer',
      name: 'مساعد الذكاء الاصطناعي لصياغة الإعلانات',
      description: 'توليد تفاصيل المواصفات العقارية وتنسيق وصف العقار آلياً',
      enabled: true,
      category: 'experimental',
      updatedAt: '2026-10-10'
    },
    {
      id: 'ff-5',
      key: 'watermark_uploaded_images',
      name: 'إضافة علامة مائية تلقائية للصور',
      description: 'دمج شعار دلالي على كافة صور العقارات لمنع سرقتها وإعادة نشرها',
      enabled: true,
      category: 'core',
      updatedAt: '2026-10-08'
    },
    {
      id: 'ff-6',
      key: 'mandatory_deed_check_over_50m',
      name: 'الفحص الإلزامي للبصيرة للعقارات الكبيرة',
      description: 'إلزام فحص وثيقة الملكية والبصيرة لأي عقار تتجاوز قيمته 50 مليون ريال',
      enabled: false,
      category: 'security',
      updatedAt: '2026-10-17'
    }
  ];
}

function getDefaultActiveSessions(): ActiveSession[] {
  return [
    {
      id: 'ses-101',
      sessionId: 'sess_live_admin_9921',
      userId: 'usr-admin-01',
      userName: 'أ. د. خالد الرياشي',
      userRole: 'system_admin',
      ipAddress: '185.190.22.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0',
      deviceType: 'desktop',
      location: 'صنعاء، اليمن',
      startedAt: '2026-10-17 07:15',
      lastActiveAt: 'الآن',
      isCurrentSession: true
    },
    {
      id: 'ses-102',
      sessionId: 'ses_mod_8471',
      userId: 'usr-mod-01',
      userName: 'م. مروان القدسي',
      userRole: 'moderator',
      ipAddress: '82.114.160.18',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      deviceType: 'desktop',
      location: 'تعز، اليمن',
      startedAt: '2026-10-17 08:00',
      lastActiveAt: 'منذ 5 دقائق'
    },
    {
      id: 'ses-103',
      sessionId: 'ses_ver_5219',
      userId: 'usr-ver-01',
      userName: 'د. سمير الذماري',
      userRole: 'verifier',
      ipAddress: '134.35.12.90',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      deviceType: 'desktop',
      location: 'ذمار، اليمن',
      startedAt: '2026-10-17 08:20',
      lastActiveAt: 'منذ 12 دقيقة'
    },
    {
      id: 'ses-104',
      sessionId: 'ses_adv_3910',
      userId: 'usr-adv-01',
      userName: 'الشيخ محمد الجوفي',
      userRole: 'advertiser',
      ipAddress: '178.130.40.11',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
      deviceType: 'mobile',
      location: 'إب، اليمن',
      startedAt: '2026-10-17 08:35',
      lastActiveAt: 'منذ دقيقة'
    }
  ];
}

function getDefaultThreats(): SecurityThreat[] {
  return [
    {
      id: 'th-1',
      ipAddress: '91.240.118.82',
      attemptType: 'brute_force',
      targetUsername: 'admin@dalani-ye.com',
      occurredAt: '2026-10-17 04:12',
      country: 'مجهول',
      city: 'مجهول',
      severity: 'high',
      blocked: true,
      details: 'تجاوز حد المحاولات الفاشلة (8 محاولات متتالية لتخمين كلمة المرور)'
    },
    {
      id: 'th-2',
      ipAddress: '194.26.29.112',
      attemptType: 'unauthorized_role_elevation',
      targetUsername: 'usr-visitor-guest',
      occurredAt: '2026-10-17 06:45',
      country: 'روسيا',
      city: 'موسكو',
      severity: 'critical',
      blocked: true,
      details: 'محاولة إرسال ترويسة x-user-role: system_admin من مصدر غير موثق'
    },
    {
      id: 'th-3',
      ipAddress: '185.220.101.5',
      attemptType: 'suspicious_headers',
      targetUsername: 'غير محدد',
      occurredAt: '2026-10-17 07:05',
      country: 'ألمانيا',
      city: 'فرانكفورت',
      severity: 'medium',
      blocked: false,
      details: 'مسح آلي لمسارات الخادم عبر روبوت فحص أمني غير مصرح'
    }
  ];
}

function getDefaultBackups(): BackupPoint[] {
  return [
    {
      id: 'bkp-1',
      fileName: 'dalani_backup_2026_10_16_daily.json',
      createdAt: '2026-10-16 23:59',
      createdBy: 'النظام (نسخ تلقائي مجدول)',
      sizeBytes: 428512,
      recordsCount: {
        listings: 8,
        users: 10,
        organizations: 2,
        auditLogs: 15,
        verifications: 3,
        reports: 3,
        tickets: 3
      },
      checksumSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      status: 'valid',
      notes: 'نسخة احتياطية مكتملة ومفحوصة لجميع الكيانات والعلاقات'
    }
  ];
}

function getDefaultSystemErrors(): SystemErrorLog[] {
  return [
    {
      id: 'err-1',
      timestamp: '2026-10-17 06:12',
      code: 'SMS_GATEWAY_TIMEOUT',
      module: 'YemenMobileGateway',
      message: 'تأخر استجابة بوابة الرسائل القصيرة لرمز التحقق (أكثر من 5 ثوانٍ)',
      severity: 'warning',
      status: 'resolved',
      resolvedAt: '2026-10-17 06:15',
      resolvedBy: 'النظام (إعادة المحاولة التلقائية)'
    },
    {
      id: 'err-2',
      timestamp: '2026-10-17 07:30',
      code: 'STORAGE_QUOTA_WARN',
      module: 'MediaCloudStorage',
      message: 'استهلاك التخزين وصل إلى 68% من السعة المحددة للوسائط والصور',
      severity: 'warning',
      status: 'open'
    }
  ];
}

function getDefaultIntegrations(): IntegrationServiceStatus[] {
  return [
    {
      id: 'int-1',
      name: 'بوابة رسائل يمن موبايل (Yemen Mobile SMS Gateway)',
      type: 'sms_gateway',
      endpoint: 'https://sms.yemenmobile.com.ye/api/v2/send',
      status: 'online',
      latencyMs: 142,
      lastCheckedAt: '2026-10-17 08:15'
    },
    {
      id: 'int-2',
      name: 'بوابة رسائل سبأفون (Sabafon SMS API)',
      type: 'sms_gateway',
      endpoint: 'https://bulksms.sabafon.com/api/send',
      status: 'online',
      latencyMs: 168,
      lastCheckedAt: '2026-10-17 08:15'
    },
    {
      id: 'int-3',
      name: 'خادم تخزين الوثائق والصور (Private Cloud S3)',
      type: 'cloud_storage',
      endpoint: 'https://storage.dalani-ye.com/vault',
      status: 'online',
      latencyMs: 45,
      lastCheckedAt: '2026-10-17 08:20'
    },
    {
      id: 'int-4',
      name: 'خادم البريد الإلكتروني الحكومي والمهني (SMTP)',
      type: 'email_smtp',
      endpoint: 'smtp.dalani-ye.com:587',
      status: 'online',
      latencyMs: 82,
      lastCheckedAt: '2026-10-17 08:10'
    }
  ];
}

function getDefaultEscalations(): EscalationCase[] {
  return [
    {
      id: 'esc-1',
      caseNumber: 'ESC-2026-004',
      title: 'نزاع ملكية عقار تجاري في شارع الزبيري (مبلغ نزاع > 100 مليون)',
      sourceType: 'report',
      sourceId: 'rep-002',
      submittedBy: 'مسؤول البلاغات (أ. عادل النجار)',
      priority: 'critical',
      status: 'pending_admin',
      description: 'قام معلنان مختلفان برفع إعلانات بيع لنفس العقار التجاري بوثائق متضاربة تتطلب قرار الإدارة العليا لإيقاف كلا الإعلانين لحين استكمال التحري القضائي.',
      createdAt: '2026-10-17 07:45'
    },
    {
      id: 'esc-2',
      caseNumber: 'ESC-2026-005',
      title: 'طلب استثناء نشر إعلان لمكتب عقاري معلق ترخيصه مؤقتاً',
      sourceType: 'staff_override',
      sourceId: 'org-2',
      submittedBy: 'مسؤول التحقق (د. سمير الذماري)',
      priority: 'medium',
      status: 'pending_admin',
      description: 'المكتب قدم إفادة تجديد من وزارة الصناعة وقيد مراجعة الغرفة التجارية، ويطلب الإذن المؤقت لمدة 14 يوماً.',
      createdAt: '2026-10-17 08:10'
    }
  ];
}

function getDefaultRequests(): PropertyRequest[] {
  return [
    {
      id: 'req-101',
      requestNumber: 'REQ-2026-1001',
      listingId: 'list-101',
      listingTitle: 'شقة فاخرة للإيجار السنوي - حدة الحي الدبلوماسي',
      listingNumber: 'YEM-2026-101',
      listingPrice: 800,
      listingCurrency: 'USD',
      listingImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      listingGovernorate: 'صنعاء (أمانة العاصمة)',
      seekerId: 'usr-seeker',
      seekerName: 'أصيل محمد الحكيمي',
      seekerPhone: '+967 778 990 011',
      advertiserId: 'adv-1',
      advertiserName: 'هشام عبد الرحمن القدسي',
      advertiserPhone: '+967 777 012 345',
      requestType: 'booking_intent',
      status: 'pending',
      notes: 'أرغب بحجز الشقة ومراجعة العقد مع المالك غداً صباحاً، جاهز لتسليم شيك الضمان.',
      offeredPrice: 750,
      preferredDate: '2026-10-20',
      requestedDurationHours: 48,
      createdAt: '2026-10-18',
      updatedAt: '2026-10-18'
    },
    {
      id: 'req-102',
      requestNumber: 'REQ-2026-1002',
      listingId: 'list-102',
      listingTitle: 'فيلا ملكية للبيع - بيت بوس حي الشباب',
      listingNumber: 'YEM-2026-102',
      listingPrice: 320000,
      listingCurrency: 'USD',
      listingImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      listingGovernorate: 'صنعاء (أمانة العاصمة)',
      seekerId: 'usr-seeker',
      seekerName: 'أصيل محمد الحكيمي',
      seekerPhone: '+967 778 990 011',
      advertiserId: 'adv-1',
      advertiserName: 'هشام عبد الرحمن القدسي',
      advertiserPhone: '+967 777 012 345',
      requestType: 'booking_intent',
      status: 'accepted',
      bookingId: 'bkg-201',
      notes: 'طلب حجز مؤقت لمدة 48 ساعة لفحص البصيرة الشرعية مع الأمين المعتمد.',
      requestedDurationHours: 48,
      createdAt: '2026-10-17',
      updatedAt: '2026-10-17'
    }
  ];
}

function getDefaultBookings(): PropertyBooking[] {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
  return [
    {
      id: 'bkg-201',
      bookingNumber: 'BKG-2026-2001',
      requestId: 'req-102',
      listingId: 'list-102',
      listingTitle: 'فيلا ملكية للبيع - بيت بوس حي الشباب',
      listingNumber: 'YEM-2026-102',
      listingImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      listingGovernorate: 'صنعاء (أمانة العاصمة)',
      listingPrice: 320000,
      listingCurrency: 'USD',
      seekerId: 'usr-seeker',
      seekerName: 'أصيل محمد الحكيمي',
      seekerPhone: '+967 778 990 011',
      advertiserId: 'adv-1',
      advertiserName: 'هشام عبد الرحمن القدسي',
      advertiserPhone: '+967 777 012 345',
      status: 'active',
      durationHours: 48,
      startDate: now.toISOString(),
      expiresAt: expiresAt,
      confirmedBy: 'هشام عبد الرحمن القدسي (المعلن المعتمد)',
      notes: 'تم قبول طلب الحجز المؤقت لمطابقة صك الملكية والبصيرة.',
      createdAt: '2026-10-17',
      updatedAt: '2026-10-17'
    }
  ];
}

class LocalDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = this.loadOrSeed();
    this.syncListingsReservationStatus();
    this.isInitialized = true;
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      // Ensure storage directories exist
      if (!fs.existsSync(DB_STORE_DIR)) {
        fs.mkdirSync(DB_STORE_DIR, { recursive: true });
      }
      if (!fs.existsSync(PERSISTENT_BACKUP_DIR)) {
        fs.mkdirSync(PERSISTENT_BACKUP_DIR, { recursive: true });
      }

      // 1. Try reading from live cache first
      let fileToRead = '';
      if (fs.existsSync(DB_FILE_PATH)) {
        fileToRead = DB_FILE_PATH;
      } else if (fs.existsSync(PERSISTENT_BACKUP_FILE)) {
        fileToRead = PERSISTENT_BACKUP_FILE;
      }

      if (fileToRead) {
        const fileContent = fs.readFileSync(fileToRead, 'utf-8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          if (parsed && Array.isArray(parsed.listings)) {
            parsed.listings = parsed.listings.map(normalizeListing);
            const defaultUsers = Object.values(MOCK_USERS);
            if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
              parsed.users = defaultUsers;
            } else {
              for (const defU of defaultUsers) {
                const idx = parsed.users.findIndex((u: any) => u.id === defU.id || (u.email && defU.email && u.email.toLowerCase() === defU.email.toLowerCase()));
                if (idx === -1) {
                  parsed.users.push(defU);
                } else {
                  parsed.users[idx] = { ...defU, ...parsed.users[idx], supabaseUserId: defU.supabaseUserId || parsed.users[idx].supabaseUserId };
                }
              }
            }

            // Ensure enterprise governance schema extensions
            if (!Array.isArray(parsed.staff)) { parsed.staff = getDefaultStaff(parsed.users); }
            if (!parsed.rolesMatrix) { parsed.rolesMatrix = getDefaultRolesMatrix(); }
            if (!Array.isArray(parsed.activeSessions)) { parsed.activeSessions = getDefaultActiveSessions(); }
            if (!Array.isArray(parsed.threats)) { parsed.threats = getDefaultThreats(); }
            if (!Array.isArray(parsed.blockedIps)) {
              parsed.blockedIps = [
                { ip: '91.240.118.82', reason: 'محاولات تخمين متكررة', blockedAt: '2026-10-17 04:12', blockedBy: 'النظام الآلي' },
                { ip: '194.26.29.112', reason: 'محاولة تزوير ترويسات الصلاحية', blockedAt: '2026-10-17 06:45', blockedBy: 'النظام الآلي' }
              ];
            }
            if (!parsed.systemSettings) { parsed.systemSettings = getDefaultSystemSettings(); }
            if (!Array.isArray(parsed.featureFlags)) { parsed.featureFlags = getDefaultFeatureFlags(); }
            if (!Array.isArray(parsed.backups)) { parsed.backups = getDefaultBackups(); }
            if (!Array.isArray(parsed.systemErrors)) { parsed.systemErrors = getDefaultSystemErrors(); }
            if (!Array.isArray(parsed.integrations)) { parsed.integrations = getDefaultIntegrations(); }
            if (!Array.isArray(parsed.escalations)) { parsed.escalations = getDefaultEscalations(); }
            if (!Array.isArray(parsed.requests)) { parsed.requests = getDefaultRequests(); }
            if (!Array.isArray(parsed.bookings)) {
              parsed.bookings = getDefaultBookings().map(normalizeBooking);
            } else {
              parsed.bookings = parsed.bookings.map(normalizeBooking);
            }
            if (!Array.isArray(parsed.contracts)) {
              parsed.contracts = getDefaultContracts(parsed.bookings, parsed.listings, parsed.users);
            } else {
              parsed.contracts = parsed.contracts.map(normalizeContract);
            }

            this.data = parsed;
            this.persist(parsed, true);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[Dalani DB] Failed to read existing db file, re-seeding default data:', err);
    }

    const defaultUsers = Object.values(MOCK_USERS);
    const defaultBookings = getDefaultBookings().map(normalizeBooking);
    const initialData: DatabaseSchema = {
      listings: INITIAL_LISTINGS,
      organizations: INITIAL_ORGANIZATIONS,
      verifications: INITIAL_VERIFICATION_REQUESTS,
      reports: INITIAL_REPORTS,
      tickets: INITIAL_TICKETS,
      auditLogs: INITIAL_AUDIT_LOGS,
      users: defaultUsers,
      staff: getDefaultStaff(defaultUsers),
      rolesMatrix: getDefaultRolesMatrix(),
      activeSessions: getDefaultActiveSessions(),
      threats: getDefaultThreats(),
      blockedIps: [
        { ip: '91.240.118.82', reason: 'محاولات تخمين متكررة', blockedAt: '2026-10-17 04:12', blockedBy: 'النظام الآلي' },
        { ip: '194.26.29.112', reason: 'محاولة تزوير ترويسات الصلاحية', blockedAt: '2026-10-17 06:45', blockedBy: 'النظام الآلي' }
      ],
      systemSettings: getDefaultSystemSettings(),
      featureFlags: getDefaultFeatureFlags(),
      backups: getDefaultBackups(),
      systemErrors: getDefaultSystemErrors(),
      integrations: getDefaultIntegrations(),
      escalations: getDefaultEscalations(),
      requests: getDefaultRequests(),
      bookings: defaultBookings,
      contracts: getDefaultContracts(defaultBookings, INITIAL_LISTINGS, defaultUsers),
      meta: {
        lastUpdated: new Date().toISOString(),
        version: '2.2.0-contracts'
      }
    };

    this.data = initialData;
    this.persist(initialData, true);
    return initialData;
  }

  private persistTimeout: NodeJS.Timeout | null = null;
  private backupSyncTimeout: NodeJS.Timeout | null = null;

  public flushToBackupSync() {
    try {
      if (!this.data) return;
      const serialized = JSON.stringify(this.data, null, 2);
      if (!serialized) return;
      if (!fs.existsSync(PERSISTENT_BACKUP_DIR)) {
        fs.mkdirSync(PERSISTENT_BACKUP_DIR, { recursive: true });
      }
      fs.writeFileSync(PERSISTENT_BACKUP_FILE, serialized, 'utf-8');
    } catch (err) {
      console.error('[Dalani DB] Error flushing backup to persistent file:', err);
    }
  }

  public persist(dataToSave: DatabaseSchema = this.data, immediate: boolean = false) {
    try {
      if (!dataToSave) {
        if (this.data) {
          dataToSave = this.data;
        } else {
          return;
        }
      }
      if (this.data !== dataToSave) {
        this.data = dataToSave;
      }
      if (dataToSave && dataToSave.meta) {
        dataToSave.meta.lastUpdated = new Date().toISOString();
      }

      const doWrite = () => {
        try {
          if (!this.data) return;
          const serialized = JSON.stringify(this.data, null, 2);
          if (!serialized) return;
          if (!fs.existsSync(DB_STORE_DIR)) {
            fs.mkdirSync(DB_STORE_DIR, { recursive: true });
          }
          // Write to live cache inside node_modules (immune to all watchers)
          fs.writeFileSync(DB_FILE_PATH, serialized, 'utf-8');
        } catch (err) {
          console.error('[Dalani DB] Error persisting database to disk:', err);
        }
      };

      if (immediate) {
        if (this.persistTimeout) {
          clearTimeout(this.persistTimeout);
          this.persistTimeout = null;
        }
        doWrite();
      } else {
        if (this.persistTimeout) {
          clearTimeout(this.persistTimeout);
        }
        this.persistTimeout = setTimeout(doWrite, 400);
      }

      // Schedule periodic background flush to persistent file (every 2 minutes)
      if (!this.backupSyncTimeout) {
        this.backupSyncTimeout = setTimeout(() => {
          this.flushToBackupSync();
          this.backupSyncTimeout = null;
        }, 120000);
      }
    } catch (err) {
      console.error('[Dalani DB] Error scheduling persist:', err);
    }
  }

  // --- PostgreSQL Data Loading & Syncing ---
  public async loadFromPostgres(): Promise<boolean> {
    if (!pgDb) return false;
    try {
      const isConnected = await checkPostgresConnection();
      if (!isConnected) return false;

      console.log('[Dalani DB] Loading state from Supabase PostgreSQL via Drizzle ORM...');
      const users = await pgDb.select().from(schema.usersTable);
      if (users.length > 0) {
        this.data.users = users.map(u => ({
          id: u.id,
          name: u.name,
          role: u.role as UserRole,
          email: u.email || undefined,
          phone: u.phone || '+967 770 000 000',
          phoneVerified: u.phoneVerified ?? true,
          avatarUrl: u.avatarUrl || undefined,
          orgId: u.orgId || undefined,
          orgName: u.orgName || undefined,
          activeStatus: u.activeStatus ?? true,
          createdAt: u.createdAt || new Date().toISOString()
        }));
      }

      const listings = await pgDb.select().from(schema.listingsTable);
      if (listings.length > 0) {
        this.data.listings = listings.map(l => normalizeListing({
          ...l,
          isNegotiable: Boolean(l.isNegotiable),
          isReserved: Boolean(l.isReserved)
        }));
      }

      const requests = await pgDb.select().from(schema.propertyRequestsTable);
      if (requests.length > 0) {
        this.data.requests = requests as any;
      }

      const bookings = await pgDb.select().from(schema.propertyBookingsTable);
      if (bookings.length > 0) {
        this.data.bookings = bookings.map(b => normalizeBooking(b as any));
      }

      const contracts = await pgDb.select().from(schema.propertyContractsTable);
      if (contracts.length > 0) {
        this.data.contracts = contracts.map(c => normalizeContract(c as any));
      }

      const verifications = await pgDb.select().from(schema.verificationRequestsTable);
      if (verifications.length > 0) {
        this.data.verifications = verifications as any;
      }

      const reports = await pgDb.select().from(schema.reportsTable);
      if (reports.length > 0) {
        this.data.reports = reports as any;
      }

      const tickets = await pgDb.select().from(schema.supportTicketsTable);
      if (tickets.length > 0) {
        this.data.tickets = tickets as any;
      }

      const auditLogs = await pgDb.select().from(schema.auditLogsTable);
      if (auditLogs.length > 0) {
        this.data.auditLogs = auditLogs as any;
      }

      this.syncListingsReservationStatus();
      console.log('[Dalani DB] Synchronized in-memory store with PostgreSQL database state.');
      return true;
    } catch (err) {
      console.warn('[Dalani DB] Failed to load data from PostgreSQL:', err);
      return false;
    }
  }

  private syncPgListing(listing: Listing) {
    if (!pgDb) return;
    pgDb.insert(schema.listingsTable).values({
      id: listing.id,
      listingNumber: listing.listingNumber || `YEM-${listing.id}`,
      title: listing.title,
      description: listing.description || '',
      propertyType: listing.propertyType,
      purpose: listing.purpose,
      status: listing.status,
      price: listing.price || 0,
      currency: listing.currency || 'YER',
      isNegotiable: Boolean(listing.isNegotiable),
      area: listing.area || 0,
      areaUnit: listing.areaUnit || 'م²',
      isReserved: Boolean(listing.isReserved),
      viewsCount: listing.viewsCount || 0,
      favoritesCount: listing.favoritesCount || 0,
      location: listing.location || null,
      attributes: listing.attributes || null,
      advertiser: listing.advertiser || null,
      verificationBadges: listing.verificationBadges || [],
      statusTimeline: listing.statusTimeline || [],
      createdAt: listing.createdAt || new Date().toISOString(),
      updatedAt: listing.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.listingsTable.id,
      set: {
        title: listing.title,
        description: listing.description || '',
        status: listing.status,
        price: listing.price || 0,
        currency: listing.currency || 'YER',
        isNegotiable: Boolean(listing.isNegotiable),
        area: listing.area || 0,
        isReserved: Boolean(listing.isReserved),
        viewsCount: listing.viewsCount || 0,
        favoritesCount: listing.favoritesCount || 0,
        location: listing.location || null,
        attributes: listing.attributes || null,
        verificationBadges: listing.verificationBadges || [],
        statusTimeline: listing.statusTimeline || [],
        updatedAt: listing.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Listing sync error:', err?.message || err));
  }

  private deletePgListing(id: string) {
    if (!pgDb) return;
    pgDb.delete(schema.listingsTable).where(eq(schema.listingsTable.id, id)).catch(err => console.error('[PostgreSQL Sync] Delete listing error:', err?.message || err));
  }

  private syncPgUser(user: User) {
    if (!pgDb) return;
    pgDb.insert(schema.usersTable).values({
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email || null,
      phone: user.phone || null,
      phoneVerified: user.phoneVerified ?? true,
      avatarUrl: user.avatarUrl || null,
      orgId: user.orgId || null,
      orgName: user.orgName || null,
      activeStatus: user.activeStatus ?? true,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.usersTable.id,
      set: {
        name: user.name,
        role: user.role,
        email: user.email || null,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        orgId: user.orgId || null,
        orgName: user.orgName || null,
        activeStatus: user.activeStatus ?? true,
        updatedAt: new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] User sync error:', err?.message || err));
  }

  private syncPgRequest(req: PropertyRequest) {
    if (!pgDb) return;
    pgDb.insert(schema.propertyRequestsTable).values({
      id: req.id,
      requestNumber: req.requestNumber,
      listingId: req.listingId,
      listingTitle: req.listingTitle || null,
      listingNumber: req.listingNumber || null,
      listingPrice: req.listingPrice || null,
      listingCurrency: req.listingCurrency || null,
      listingImage: req.listingImage || null,
      listingGovernorate: req.listingGovernorate || null,
      seekerId: req.seekerId,
      seekerName: req.seekerName || null,
      seekerPhone: req.seekerPhone || null,
      advertiserId: req.advertiserId,
      advertiserName: req.advertiserName || null,
      advertiserPhone: req.advertiserPhone || null,
      requestType: req.requestType,
      status: req.status,
      notes: req.notes || null,
      offeredPrice: req.offeredPrice || null,
      preferredDate: req.preferredDate || null,
      requestedDurationHours: req.requestedDurationHours || 48,
      bookingId: req.bookingId || null,
      paymentMethod: req.paymentMethod || null,
      rentalUsageType: req.rentalUsageType || null,
      leaseDurationMonths: req.leaseDurationMonths || null,
      paymentFrequency: req.paymentFrequency || null,
      createdAt: req.createdAt || new Date().toISOString(),
      updatedAt: req.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.propertyRequestsTable.id,
      set: {
        status: req.status,
        bookingId: req.bookingId || null,
        notes: req.notes || null,
        updatedAt: req.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Request sync error:', err?.message || err));
  }

  private syncPgBooking(bkg: PropertyBooking) {
    if (!pgDb) return;
    pgDb.insert(schema.propertyBookingsTable).values({
      id: bkg.id,
      bookingNumber: bkg.bookingNumber,
      requestId: bkg.requestId,
      listingId: bkg.listingId,
      listingTitle: bkg.listingTitle || null,
      listingNumber: bkg.listingNumber || null,
      listingImage: bkg.listingImage || null,
      listingGovernorate: bkg.listingGovernorate || null,
      listingPrice: bkg.listingPrice || null,
      listingCurrency: bkg.listingCurrency || null,
      seekerId: bkg.seekerId,
      seekerName: bkg.seekerName || null,
      seekerPhone: bkg.seekerPhone || null,
      advertiserId: bkg.advertiserId,
      advertiserName: bkg.advertiserName || null,
      advertiserPhone: bkg.advertiserPhone || null,
      status: bkg.status,
      durationHours: bkg.durationHours || 48,
      startDate: bkg.startDate || null,
      expiresAt: bkg.expiresAt || null,
      confirmedBy: bkg.confirmedBy || null,
      dealStage: bkg.dealStage || null,
      contractId: bkg.contractId || null,
      contractNumber: bkg.contractNumber || null,
      notes: bkg.notes || null,
      paymentMethod: bkg.paymentMethod || null,
      rentalUsageType: bkg.rentalUsageType || null,
      inspectionVisit: bkg.inspectionVisit || null,
      currentTerms: bkg.currentTerms || null,
      agreedTerms: bkg.agreedTerms || null,
      messages: bkg.messages || [],
      createdAt: bkg.createdAt || new Date().toISOString(),
      updatedAt: bkg.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.propertyBookingsTable.id,
      set: {
        status: bkg.status,
        dealStage: bkg.dealStage || null,
        contractId: bkg.contractId || null,
        contractNumber: bkg.contractNumber || null,
        inspectionVisit: bkg.inspectionVisit || null,
        currentTerms: bkg.currentTerms || null,
        agreedTerms: bkg.agreedTerms || null,
        messages: bkg.messages || [],
        updatedAt: bkg.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Booking sync error:', err?.message || err));
  }

  private syncPgContract(cnt: PropertyContract) {
    if (!pgDb) return;
    pgDb.insert(schema.propertyContractsTable).values({
      id: cnt.id,
      contractNumber: cnt.contractNumber,
      bookingId: cnt.bookingId,
      bookingNumber: cnt.bookingNumber || null,
      listingId: cnt.listingId,
      listingNumber: cnt.listingNumber || null,
      listingTitle: cnt.listingTitle || null,
      contractType: cnt.contractType,
      status: cnt.status,
      currentVersion: cnt.currentVersion || 1,
      firstParty: cnt.firstParty || null,
      secondParty: cnt.secondParty || null,
      propertySnapshot: cnt.propertySnapshot || null,
      financialTerms: cnt.financialTerms || null,
      clauses: cnt.clauses || [],
      versionHistory: cnt.versionHistory || [],
      createdAt: cnt.createdAt || new Date().toISOString(),
      updatedAt: cnt.updatedAt || new Date().toISOString()
    }).onConflictDoUpdate({
      target: schema.propertyContractsTable.id,
      set: {
        status: cnt.status,
        currentVersion: cnt.currentVersion || 1,
        firstParty: cnt.firstParty || null,
        secondParty: cnt.secondParty || null,
        financialTerms: cnt.financialTerms || null,
        clauses: cnt.clauses || [],
        versionHistory: cnt.versionHistory || [],
        updatedAt: cnt.updatedAt || new Date().toISOString()
      }
    }).catch(err => console.error('[PostgreSQL Sync] Contract sync error:', err?.message || err));
  }

  private syncPgAuditLog(entry: AuditLogEntry) {
    if (!pgDb) return;
    pgDb.insert(schema.auditLogsTable).values({
      id: entry.id,
      userId: entry.userId,
      userName: entry.userName || null,
      userRole: entry.userRole || null,
      action: entry.action,
      category: entry.targetType || null,
      targetId: entry.targetId || null,
      status: entry.result || null,
      details: entry.details || null,
      ipAddress: entry.ipAddress || null,
      createdAt: entry.timestamp || new Date().toISOString()
    }).catch(err => console.error('[PostgreSQL Sync] Audit log sync error:', err?.message || err));
  }

  // --- Listings Operations (Delegated to Subsystem 3: Marketplace Repository) ---
  public getListings(): Listing[] {
    return marketplaceRepository.getListings();
  }

  public getListingById(id: string): Listing | undefined {
    return marketplaceRepository.getListingById(id);
  }

  public addListing(listing: Listing): Listing {
    return marketplaceRepository.addListing(listing);
  }

  public updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    return marketplaceRepository.updateListing(id, updates);
  }

  public deleteListing(id: string): boolean {
    return marketplaceRepository.deleteListing(id);
  }

  // --- Organizations Operations (Delegated to IdentityRepository) ---
  public getOrganizations(): Organization[] {
    return identityRepository.getOrganizations();
  }

  public getOrganizationById(id: string): Organization | undefined {
    return identityRepository.getOrganizationById(id);
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    return identityRepository.updateOrganization(id, updates);
  }

  // --- Verifications Operations (Delegated to Subsystem 2: Property Assets Repository) ---
  public getVerifications(): VerificationRequest[] {
    return propertyAssetsRepository.getVerifications();
  }

  public addVerification(req: VerificationRequest): VerificationRequest {
    return propertyAssetsRepository.addVerification(req);
  }

  public updateVerification(id: string, updates: Partial<VerificationRequest>): VerificationRequest | undefined {
    return propertyAssetsRepository.updateVerification(id, updates);
  }

  // --- Reports Operations (Subsystem 6: Governance Repository) ---
  public getReports(): ReportCase[] {
    return governanceRepository.getReports();
  }

  public addReport(rep: ReportCase): ReportCase {
    return governanceRepository.addReport(rep);
  }

  public updateReport(id: string, updates: Partial<ReportCase>): ReportCase | undefined {
    return governanceRepository.updateReport(id, updates);
  }

  // --- Tickets Operations (Subsystem 6: Governance Repository) ---
  public getTickets(): SupportTicket[] {
    return governanceRepository.getTickets();
  }

  public addTicket(ticket: SupportTicket): SupportTicket {
    return governanceRepository.addTicket(ticket);
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    return governanceRepository.updateTicket(id, updates);
  }

  // --- Audit Logs (Subsystem 6: Governance Repository) ---
  public getAuditLogs(): AuditLogEntry[] {
    return governanceRepository.getAuditLogs();
  }

  public addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    return governanceRepository.addAuditLog(entry);
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
    return governanceRepository.logAudit(entry);
  }

  // --- Users Operations (Delegated to IdentityRepository) ---
  public getUsers(): User[] {
    return identityRepository.getUsers();
  }

  public getUserById(id: string): User | undefined {
    return identityRepository.getUserById(id);
  }

  public getUserBySupabaseId(supabaseUserId: string): User | undefined {
    return identityRepository.getUserBySupabaseId(supabaseUserId);
  }

  public getUserByEmailOrPhone(identifier: string): User | undefined {
    return identityRepository.getUserByEmailOrPhone(identifier);
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    return identityRepository.updateUser(id, updates);
  }

  public toggleUserStatus(id: string): User | undefined {
    return identityRepository.toggleUserStatus(id);
  }

  // --- Staff Operations (Subsystem 6: Governance Repository) ---
  public getStaff(): StaffMember[] {
    return governanceRepository.getStaff();
  }

  public getStaffById(id: string): StaffMember | undefined {
    return governanceRepository.getStaffById(id);
  }

  public addStaff(member: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    return governanceRepository.addStaff(member);
  }

  public toggleStaffStatus(id: string): StaffMember | undefined {
    return governanceRepository.toggleStaffStatus(id);
  }

  public updateStaffPermissions(id: string, permissions: string[]): StaffMember | undefined {
    return governanceRepository.updateStaffPermissions(id, permissions);
  }

  // --- Roles Matrix Operations (Subsystem 6: Governance Repository) ---
  public getRolesMatrix(): Record<string, string[]> {
    return governanceRepository.getRolesMatrix();
  }

  public updateRolesMatrix(matrix: Record<string, string[]>): Record<string, string[]> {
    return governanceRepository.updateRolesMatrix(matrix);
  }

  // --- Active Sessions Operations (Subsystem 6: Governance Repository) ---
  public getActiveSessions(): ActiveSession[] {
    return governanceRepository.getActiveSessions();
  }

  public addActiveSession(session: Omit<ActiveSession, 'id'>): ActiveSession {
    return governanceRepository.addActiveSession(session);
  }

  public terminateSession(sessionIdOrId: string): boolean {
    return governanceRepository.terminateSession(sessionIdOrId);
  }

  // --- Security Threats & IP Blocking (Subsystem 6: Governance Repository) ---
  public getThreats(): SecurityThreat[] {
    return governanceRepository.getThreats();
  }

  public addThreat(threat: Omit<SecurityThreat, 'id' | 'occurredAt'>): SecurityThreat {
    return governanceRepository.addThreat(threat);
  }

  public getBlockedIps(): BlockedIp[] {
    return governanceRepository.getBlockedIps();
  }

  public blockIp(ip: string, reason: string, blockedBy: string): BlockedIp {
    return governanceRepository.blockIp(ip, reason, blockedBy);
  }

  public unblockIp(ip: string): boolean {
    return governanceRepository.unblockIp(ip);
  }

  public isIpBlocked(ip: string): boolean {
    return governanceRepository.isIpBlocked(ip);
  }

  // --- System Settings (Subsystem 6: Governance Repository) ---
  public getSystemSettings(): SystemSettings {
    return governanceRepository.getSystemSettings();
  }

  public updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    return governanceRepository.updateSystemSettings(updates);
  }

  // --- Feature Flags (Subsystem 6: Governance Repository) ---
  public getFeatureFlags(): FeatureFlag[] {
    return governanceRepository.getFeatureFlags();
  }

  public toggleFeatureFlag(key: string): FeatureFlag | undefined {
    return governanceRepository.toggleFeatureFlag(key);
  }

  public updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): FeatureFlag | undefined {
    return governanceRepository.updateFeatureFlag(key, updates);
  }

  // --- Backups & Restore (Subsystem 6: Governance Repository) ---
  public getBackups(): BackupPoint[] {
    return governanceRepository.getBackups();
  }

  public createBackup(createdBy: string, notes?: string): BackupPoint {
    return governanceRepository.createBackup(createdBy, notes);
  }

  public restoreBackup(backupId: string, performedBy: string): { success: boolean; message: string; safetyBackupId?: string } {
    return governanceRepository.restoreBackup(backupId, performedBy);
  }

  // --- System Error Logs (Subsystem 6: Governance Repository) ---
  public getSystemErrors(): SystemErrorLog[] {
    return governanceRepository.getSystemErrors();
  }

  public logSystemError(code: string, module: string, message: string, severity: SystemErrorLog['severity'] = 'error'): SystemErrorLog {
    return governanceRepository.logSystemError(code, module, message, severity);
  }

  public resolveSystemError(id: string, resolvedBy: string): SystemErrorLog | undefined {
    return governanceRepository.resolveSystemError(id, resolvedBy);
  }

  // --- Integrations (Subsystem 6: Governance Repository) ---
  public getIntegrations(): IntegrationServiceStatus[] {
    return governanceRepository.getIntegrations();
  }

  public updateIntegrationStatus(id: string, updates: Partial<IntegrationServiceStatus>): IntegrationServiceStatus | undefined {
    return governanceRepository.updateIntegrationStatus(id, updates);
  }

  // --- Escalations (Subsystem 6: Governance Repository) ---
  public getEscalations(): EscalationCase[] {
    return governanceRepository.getEscalations();
  }

  public resolveEscalation(id: string, status: 'approved' | 'rejected', notes: string): EscalationCase | undefined {
    return governanceRepository.resolveEscalation(id, status, notes);
  }

  // --- Data Integrity Check & Repair (Subsystem 6: Governance Repository) ---
  public checkDataIntegrity() {
    return governanceRepository.checkDataIntegrity();
  }

  public repairDataIntegrity() {
    return governanceRepository.repairDataIntegrity();
  }

  // ==========================================
  // PROPERTY REQUESTS & TEMPORARY BOOKINGS OPS
  // ==========================================

  public getRequests(): PropertyRequest[] {
    return operationsRepository.getRequests();
  }

  public getRequestById(id: string): PropertyRequest | undefined {
    return operationsRepository.getRequestById(id);
  }

  public addRequest(req: PropertyRequest): PropertyRequest {
    return operationsRepository.addRequest(req);
  }

  public updateRequest(id: string, updates: Partial<PropertyRequest>): PropertyRequest | undefined {
    return operationsRepository.updateRequest(id, updates);
  }

  public deleteRequest(id: string): boolean {
    return operationsRepository.deleteRequest(id);
  }

  public getBookings(): PropertyBooking[] {
    return operationsRepository.getBookings();
  }

  public getBookingById(id: string): PropertyBooking | undefined {
    return operationsRepository.getBookingById(id);
  }

  public getActiveBookingForListing(listingId: string): PropertyBooking | undefined {
    return operationsRepository.getActiveBookingForListing(listingId);
  }

  public addBooking(booking: PropertyBooking): PropertyBooking {
    return operationsRepository.addBooking(booking);
  }

  public updateBooking(id: string, updates: Partial<PropertyBooking>): PropertyBooking | undefined {
    return operationsRepository.updateBooking(id, updates);
  }

  public validateDealCompletionPrerequisites(bookingId: string): {
    canComplete: boolean;
    requirements: Array<{
      key: 'contract_approval' | 'contract_signature' | 'financial_clearance' | 'handover_protocol' | 'dispute_free';
      label: string;
      satisfied: boolean;
      details: string;
    }>;
    contract?: PropertyContract;
    booking?: PropertyBooking;
    listing?: Listing;
  } {
    const booking = this.getBookingById(bookingId);
    if (!booking) {
      return { canComplete: false, requirements: [] };
    }

    const listing = this.getListingById(booking.listingId);
    const contract = this.getContractByBookingId(booking.id);
    const isSale = listing?.purpose === 'sale';

    // 1. Contract Approval Check
    const currVer = contract?.currentVersion || 1;
    const isContractApproved = Boolean(
      contract &&
      contract.firstPartyApproval &&
      contract.secondPartyApproval &&
      contract.firstPartyApprovedVersion === currVer &&
      contract.secondPartyApprovedVersion === currVer
    );

    // 2. Electronic Signatures Check
    const isContractSigned = Boolean(
      contract &&
      contract.status === 'signed' &&
      contract.firstPartySignedVersion === currVer &&
      contract.secondPartySignedVersion === currVer &&
      contract.electronicSignatures &&
      contract.electronicSignatures.some(s => s.partyRole === 'firstParty') &&
      contract.electronicSignatures.some(s => s.partyRole === 'secondParty')
    );

    // 3. Financial Clearance Check
    const fc = booking.financialClearance;
    const isFinancialCleared = Boolean(fc && fc.status === 'cleared' && fc.paidAmount > 0 && fc.receiptVoucherNumber);

    // 4. Handover Protocol Check
    const hp = booking.handoverProtocol;
    const isHandoverCompleted = Boolean(
      hp &&
      hp.status === 'completed' &&
      (isSale ? (hp.deedVerified || hp.originalDeedHandedOver) : (hp.keysHandedOver ?? true))
    );

    // 5. Dispute Free Check
    const isDisputeFree = Boolean(!booking.isDisputed && (!booking.dispute || booking.dispute.status !== 'active'));

    const requirements = [
      {
        key: 'contract_approval' as const,
        label: 'مراجعة واعتماد بنود العقد من الطرفين',
        satisfied: isContractApproved,
        details: isContractApproved
          ? `تم اعتماد الإصدار الحالي (v${currVer}) رسمياً من الطرف الأول والطرف الثاني بالتراضي.`
          : contract
          ? `العقد بالإصدار (v${currVer}) بانتظار اعتماد ${!contract.firstPartyApproval ? 'الطرف الأول (البائع/المؤجر)' : ''} ${!contract.secondPartyApproval ? 'الطرف الثاني (المشتري/المستأجر)' : ''}.`
          : 'لم يتم إنشاء مسودة العقد بعد لهذه الصفقة.'
      },
      {
        key: 'contract_signature' as const,
        label: 'التوقيع الإلكتروني الموثق لكلا الطرفين',
        satisfied: isContractSigned,
        details: isContractSigned
          ? `تم توقيع العقد إلكترونياً وتوثيق البصمة الرقمية والهوية للطرفين (v${currVer}).`
          : 'يلزم توقيع الطرفين إلكترونياً مع إدخال رقم الهوية والإقرار القانوني.'
      },
      {
        key: 'financial_clearance' as const,
        label: isSale ? 'المخالصة المالية وسند القبض للبيع' : 'سند استلام الإيجار والضمان التأميني',
        satisfied: isFinancialCleared,
        details: isFinancialCleared
          ? `تم توثيق سند القبض المالي برقم [${fc?.receiptVoucherNumber}] بقيمة ${fc?.paidAmount.toLocaleString()} ${fc?.currency}.`
          : 'يلزم تسجيل بيانات المخالصة المالية وإرفاق رقم سند القبض أو الإشعار البنكي.'
      },
      {
        key: 'handover_protocol' as const,
        label: isSale ? 'محضر استلام العقار وتدقيق البصيرة الشرعية' : 'محضر تسليم مفاتيح العقار وقراءة العدادات',
        satisfied: isHandoverCompleted,
        details: isHandoverCompleted
          ? `تم استكمال محضر التسليم والاستلام الرسمي بتاريخ [${hp?.handoverDate}].`
          : isSale
          ? 'يلزم توثيق تسليم البصيرة الشرعية ومحضر حيازة العقار.'
          : 'يلزم توثيق تسليم مفاتيح العقار وإثبات قراءة العدادات.'
      },
      {
        key: 'dispute_free' as const,
        label: 'خلو الصفقة من أي نزاع أو اعتراض قانوني',
        satisfied: isDisputeFree,
        details: isDisputeFree
          ? 'الصفقة خالية من أي نزاع نشط أو شكوى معلقة.'
          : `توجد قضية نزاع معلقة [${booking.dispute?.claimType}] مرفوعة من [${booking.dispute?.raisedBy?.name}]. يلزم فض النزاع أولاً.`
      }
    ];

    const canComplete = requirements.every(r => r.satisfied);
    return { canComplete, requirements, contract, booking, listing };
  }

  public updateBookingFinancialClearance(
    bookingId: string,
    fc: FinancialClearance,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; error?: string } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return { error: 'الحجز غير موجود' };

    booking.financialClearance = {
      ...fc,
      status: 'cleared',
      clearanceDate: fc.clearanceDate || new Date().toISOString().split('T')[0],
      clearedBy: fc.clearedBy || actor.name
    };
    booking.updatedAt = new Date().toISOString().split('T')[0];

    this.addDealMessage(booking.id, {
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      type: 'system',
      text: `💳 تم تسجيل سند المخالصة المالية برقم [${fc.receiptVoucherNumber}] بقيمة ${fc.paidAmount.toLocaleString()} ${fc.currency} بواسطة [${actor.name}].`
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'update',
      targetType: 'booking',
      targetId: booking.id,
      targetNumber: booking.bookingNumber,
      details: `تسجيل المخالصة المالية وسند القبض [${fc.receiptVoucherNumber}] للصفقة [${booking.bookingNumber}]`,
      severity: 'info'
    });

    this.persist();
    return { booking };
  }

  public updateBookingHandoverProtocol(
    bookingId: string,
    hp: HandoverProtocol,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; error?: string } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return { error: 'الحجز غير موجود' };

    booking.handoverProtocol = {
      ...hp,
      status: 'completed',
      handoverDate: hp.handoverDate || new Date().toISOString().split('T')[0],
      handedOverBy: hp.handedOverBy || actor.name
    };
    booking.updatedAt = new Date().toISOString().split('T')[0];

    this.addDealMessage(booking.id, {
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      type: 'system',
      text: `🔑 تم توثيق محضر تسليم واستلام العقار رسمياً بتاريخ [${booking.handoverProtocol.handoverDate}] بواسطة [${actor.name}].`
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'update',
      targetType: 'booking',
      targetId: booking.id,
      targetNumber: booking.bookingNumber,
      details: `توثيق محضر استلام وتسليم العقار للصفقة [${booking.bookingNumber}]`,
      severity: 'info'
    });

    this.persist();
    return { booking };
  }

  public completeBooking(
    id: string,
    completedBy: string,
    options?: {
      notes?: string;
      financialClearance?: FinancialClearance;
      handoverProtocol?: HandoverProtocol;
      forceAdminOverride?: boolean;
    }
  ): {
    booking?: PropertyBooking;
    listing?: Listing;
    contract?: PropertyContract;
    error?: string;
    missingRequirements?: any[];
  } {
    const booking = this.getBookingById(id);
    if (!booking) return { error: 'الحجز غير موجود' };

    // Update in-memory draft of financial clearance & handover protocol if supplied in options
    if (options?.financialClearance) {
      booking.financialClearance = { ...options.financialClearance, status: 'cleared' };
    }
    if (options?.handoverProtocol) {
      booking.handoverProtocol = { ...options.handoverProtocol, status: 'completed' };
    }

    // REQUIREMENT 4: Verify all prerequisites before completing!
    const prereqs = this.validateDealCompletionPrerequisites(id);
    if (!prereqs.canComplete && !options?.forceAdminOverride) {
      const missing = prereqs.requirements.filter(r => !r.satisfied);
      return {
        error: 'لا يمكن إتمام الصفقة قبل استيفاء جميع المتطلبات المحددة لنوع المعاملة وفق الضوابط.',
        missingRequirements: missing,
        booking,
        contract: prereqs.contract
      };
    }

    const listing = this.getListingById(booking.listingId);
    if (!listing) return { error: 'العقار المرتبط غير موجود' };

    const nowStr = new Date().toISOString();
    const dateOnly = nowStr.split('T')[0];
    const timeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
    const isSale = listing.purpose === 'sale';
    const dealOutcome: 'sold' | 'rented' = isSale ? 'sold' : 'rented';
    const dossierNumber = booking.finalDossierNumber || `DOS-2026-${Math.floor(2000 + Math.random() * 8000)}`;

    // 1. Finalize Booking (Requirement 5 & 8: Keep permanent records)
    booking.status = 'completed';
    booking.dealOutcome = dealOutcome;
    booking.completedAt = nowStr;
    booking.completedBy = completedBy;
    booking.finalDossierNumber = dossierNumber;
    booking.dealStage = 'contract_completed';
    booking.notes = options?.notes || booking.notes || `تم إتمام الصفقة العقارية وتوثيق المحضر النهائي [${dossierNumber}] بنجاح.`;
    booking.updatedAt = dateOnly;

    // 2. Finalize Listing (Requirement 6 & 7: Prevent auto-return of sold/rented property)
    listing.status = 'completed';
    listing.dealOutcome = dealOutcome;
    listing.finalDealNumber = dossierNumber;
    listing.closedAt = nowStr;
    listing.closedBy = completedBy;
    listing.isReserved = false;
    listing.reservedUntil = undefined;
    listing.activeBookingId = undefined;

    const timelineEntry: StatusTimelineEntry = {
      status: 'completed',
      timestamp: timeStr,
      changedBy: completedBy,
      userRole: 'advertiser',
      notes: `تم إتمام الصفقة العقارية رسمياً (${isSale ? 'بيع عقاري ناقل للملكية' : 'إيجار عقاري رسمي'}) وإغلاق الإعلان نهائياً بموجب المحضر [${dossierNumber}] والعقد [${booking.contractNumber || 'موثق'}]. يمنع إعادة العقار لقوائم التوفر تلقائياً.`
    };
    listing.statusTimeline = [timelineEntry, ...(listing.statusTimeline || [])];
    listing.updatedAt = dateOnly;

    // 3. Finalize Contract
    let contract = this.getContractByBookingId(booking.id);
    if (contract) {
      contract.status = 'signed';
      contract.signedAt = contract.signedAt || nowStr;
      contract.approvedAt = contract.approvedAt || nowStr;
      contract.approvedBy = contract.approvedBy || completedBy;
      contract.updatedAt = dateOnly;
    }

    // 4. Send Completion Notification Message (Requirement 9)
    this.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `🎉 تهانينا! تم إتمام المعاملة العقارية رسمياً وتوثيق محضر الإغلاق النهائي برقم [${dossierNumber}] بواسطة [${completedBy}]. العقار أصبح (${isSale ? 'مباعاً نهائياً' : 'مؤجراً رسمياً'}) وتم إغلاق الإعلان وأرشفة كافة العقود والمراسلات في السجل الدائم.`
    });

    // 5. Log Official Audit Log
    this.logAudit({
      actorId: 'system',
      actorName: completedBy,
      actorRole: 'advertiser',
      action: 'complete',
      targetType: 'booking',
      targetId: booking.id,
      targetNumber: booking.bookingNumber,
      details: `إتمام الصفقة العقارية وإصدار محضر الإغلاق [${dossierNumber}] للعقار [${listing.listingNumber}] (${dealOutcome}). استوفيت جميع المتطلبات (العقد، التوقيع، المخالصة، التسليم).`,
      severity: 'info'
    });

    this.syncListingsReservationStatus();
    this.persist();

    return { booking, listing, contract };
  }

  public cancelBookingWithCategory(
    bookingId: string,
    category: 'buyer_retracted' | 'seller_retracted' | 'inspection_unsatisfactory' | 'deed_issue' | 'price_disagreement' | 'mutual_cancellation' | 'dispute_cancelled',
    reason: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; listing?: Listing; contract?: PropertyContract } {
    return operationsRepository.cancelBookingWithCategory(bookingId, category, reason, actor);
  }

  public raiseDealDispute(
    bookingId: string,
    claimType: 'breach_of_terms' | 'misrepresentation' | 'payment_default' | 'document_defect' | 'other',
    claimDescription: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; dispute?: DealDispute } {
    return operationsRepository.raiseDealDispute(bookingId, claimType, claimDescription, actor);
  }

  public resolveDealDispute(
    bookingId: string,
    resolution: 'dismissed' | 'resolved' | 'cancel_deal',
    resolutionNotes: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; dispute?: DealDispute } {
    return operationsRepository.resolveDealDispute(bookingId, resolution, resolutionNotes, actor);
  }

  public checkBookingsExpiration(): boolean {
    const now = new Date().getTime();
    let changed = false;
    for (const b of this.data.bookings) {
      // REQUIREMENT 7: If the booking is already completed or its listing is completed, NEVER touch it!
      if (b.status === 'completed') {
        continue;
      }
      const listing = this.data.listings.find(l => l.id === b.listingId);
      if (listing?.status === 'completed' || listing?.dealOutcome) {
        continue;
      }

      if (b.status === 'active' && new Date(b.expiresAt).getTime() <= now) {
        b.status = 'expired';
        b.updatedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }
    if (changed) {
      this.syncListingsReservationStatus();
      this.persist();
    }
    return changed;
  }

  public syncListingsReservationStatus(): void {
    const now = new Date().getTime();
    const activeMap = new Map<string, PropertyBooking>();

    for (const b of this.data.bookings) {
      if (b.status === 'active' && new Date(b.expiresAt).getTime() > now) {
        activeMap.set(b.listingId, b);
      }
    }

    for (const listing of this.data.listings) {
      // REQUIREMENT 7: Sold or rented listings must NEVER be reset to active or available!
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

  public addDealMessage(
    bookingId: string,
    message: { senderId: string; senderName: string; senderRole: UserRole; text: string; type?: DealMessage['type'] }
  ): DealMessage | undefined {
    return operationsRepository.addDealMessage(bookingId, message);
  }

  public proposeDealTerms(
    bookingId: string,
    terms: DealTerms,
    proposer: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; revision?: TermsRevision; wasApprovedModified: boolean } {
    return operationsRepository.proposeDealTerms(bookingId, terms, proposer);
  }

  public respondToDealTerms(
    bookingId: string,
    revisionId: string,
    action: 'accept' | 'reject',
    responder: { id: string; name: string; role: UserRole },
    responseNotes?: string
  ): { booking?: PropertyBooking; revision?: TermsRevision; error?: string } {
    return operationsRepository.respondToDealTerms(bookingId, revisionId, action, responder, responseNotes);
  }

  public updateInspectionVisit(
    bookingId: string,
    visit: Partial<InspectionVisit>,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; visit?: InspectionVisit } {
    return operationsRepository.updateInspectionVisit(bookingId, visit, actor);
  }

  public updateDealStage(
    bookingId: string,
    stage: DealStage,
    actor: { id: string; name: string; role: UserRole }
  ): PropertyBooking | undefined {
    return operationsRepository.updateDealStage(bookingId, stage, actor);
  }

  // ==========================================
  // ==========================================
  // CONTRACT METHODS (Subsystem 5: Contracts Repository)
  // ==========================================

  public getContracts(filters?: { bookingId?: string; listingId?: string; status?: ContractStatus }): PropertyContract[] {
    return contractsRepository.getContracts(filters);
  }

  public getContractById(contractId: string): PropertyContract | undefined {
    return contractsRepository.getContractById(contractId);
  }

  public getContractByBookingId(bookingId: string): PropertyContract | undefined {
    return contractsRepository.getContractByBookingId(bookingId);
  }

  public createContractFromBooking(
    bookingId: string,
    actorOrOptions?: { id?: string; name?: string; role?: UserRole } | { customType?: 'sale' | 'lease'; contractType?: 'sale' | 'lease'; customClauses?: ContractClause[] },
    optionsParam?: { customType?: 'sale' | 'lease'; contractType?: 'sale' | 'lease'; customClauses?: ContractClause[] }
  ): PropertyContract {
    return contractsRepository.createContractFromBooking(bookingId, actorOrOptions, optionsParam);
  }

  public updateContractDraft(
    contractId: string,
    updates: {
      clauses?: ContractClause[];
      financialTerms?: any;
      durationTerms?: any;
      notes?: string;
      summaryOfChanges?: string;
      witnesses?: ContractParty[];
    },
    actor: { id: string; name: string; role: UserRole }
  ): { contract: PropertyContract; wasApprovedModified: boolean } {
    return contractsRepository.updateContractDraft(contractId, updates, actor);
  }

  public approveContract(
    contractId: string,
    partyType: 'firstParty' | 'secondParty' | 'admin',
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    return contractsRepository.approveContract(contractId, partyType, actor);
  }

  public signContract(
    contractId: string,
    partyRole: 'firstParty' | 'secondParty' | 'witness',
    actor: { id: string; name: string; role: UserRole },
    options?: {
      nationalId?: string;
      idGovernorate?: string;
      verificationCode?: string;
      signerPhone?: string;
      legalDisclaimerAcknowledged?: boolean;
    } | string
  ): PropertyContract {
    return contractsRepository.signContract(contractId, partyRole, actor, options);
  }

  public proposeContractAmendment(
    contractId: string,
    amendment: { summaryOfChanges: string; clauses?: ContractClause[]; financialTerms?: any },
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    return contractsRepository.proposeContractAmendment(contractId, amendment, actor);
  }

  public respondToContractAmendment(
    contractId: string,
    accept: boolean,
    actor: { id: string; name: string; role: UserRole },
    reason?: string
  ): PropertyContract {
    return contractsRepository.respondToContractAmendment(contractId, accept, actor, reason);
  }

  public cancelContract(
    contractId: string,
    reason: string,
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    return contractsRepository.cancelContract(contractId, reason, actor);
  }
}

export const db = new LocalDatabase();

// Cleanly flush in-memory data to persistent storage on process exit or termination
try {
  process.on('SIGINT', () => {
    db.flushToBackupSync();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    db.flushToBackupSync();
    process.exit(0);
  });
  process.on('beforeExit', () => {
    db.flushToBackupSync();
  });
} catch {}
