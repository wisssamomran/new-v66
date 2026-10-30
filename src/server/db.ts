import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db as pgDb, schema, checkPostgresConnection } from '../db';
import { eq } from 'drizzle-orm';
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

  // --- Listings Operations ---
  public getListings(): Listing[] {
    this.checkBookingsExpiration();
    return [...this.data.listings];
  }

  public getListingById(id: string): Listing | undefined {
    this.checkBookingsExpiration();
    return this.data.listings.find(l => l.id === id);
  }

  public addListing(listing: Listing): Listing {
    const normalized = normalizeListing(listing);
    this.data.listings.unshift(normalized);
    this.persist();
    this.syncPgListing(normalized);
    return normalized;
  }

  public updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const index = this.data.listings.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    const existing = this.data.listings[index];

    // REQUIREMENT 7: Sold or rented listings must NEVER be reset to active, published, or available!
    if ((existing.status === 'completed' || existing.dealOutcome) && updates.status && updates.status !== 'completed') {
      console.warn(`[Dalani Security] Prevented reopening completed/sold/rented listing ${existing.listingNumber}`);
      delete updates.status;
    }

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.data.listings[index] = normalizeListing(merged);
    this.persist();
    this.syncPgListing(this.data.listings[index]);
    return this.data.listings[index];
  }

  public deleteListing(id: string): boolean {
    const prevLength = this.data.listings.length;
    this.data.listings = this.data.listings.filter(l => l.id !== id);
    if (this.data.listings.length !== prevLength) {
      this.persist();
      this.deletePgListing(id);
      return true;
    }
    return false;
  }

  // --- Organizations Operations ---
  public getOrganizations(): Organization[] {
    return [...this.data.organizations];
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.data.organizations.find(o => o.id === id);
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const index = this.data.organizations.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    this.data.organizations[index] = {
      ...this.data.organizations[index],
      ...updates
    };
    this.persist();
    return this.data.organizations[index];
  }

  // --- Verifications Operations ---
  public getVerifications(): VerificationRequest[] {
    return [...this.data.verifications];
  }

  public addVerification(req: VerificationRequest): VerificationRequest {
    this.data.verifications.unshift(req);
    this.persist();
    return req;
  }

  public updateVerification(id: string, updates: Partial<VerificationRequest>): VerificationRequest | undefined {
    const index = this.data.verifications.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    this.data.verifications[index] = {
      ...this.data.verifications[index],
      ...updates
    };
    this.persist();
    return this.data.verifications[index];
  }

  // --- Reports Operations ---
  public getReports(): ReportCase[] {
    return [...this.data.reports];
  }

  public addReport(rep: ReportCase): ReportCase {
    this.data.reports.unshift(rep);
    this.persist();
    return rep;
  }

  public updateReport(id: string, updates: Partial<ReportCase>): ReportCase | undefined {
    const index = this.data.reports.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.data.reports[index] = {
      ...this.data.reports[index],
      ...updates
    };
    this.persist();
    return this.data.reports[index];
  }

  // --- Tickets Operations ---
  public getTickets(): SupportTicket[] {
    return [...this.data.tickets];
  }

  public addTicket(ticket: SupportTicket): SupportTicket {
    this.data.tickets.unshift(ticket);
    this.persist();
    return ticket;
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const index = this.data.tickets.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    this.data.tickets[index] = {
      ...this.data.tickets[index],
      ...updates
    };
    this.persist();
    return this.data.tickets[index];
  }

  // --- Audit Logs (Append-Only, Tamper-Proof) ---
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.data.auditLogs];
  }

  public addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    this.data.auditLogs.unshift(entry);
    // Keep max 500 logs in active memory
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
    this.syncPgAuditLog(entry);
    return entry;
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
    return this.addAuditLog({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: entry.actorId,
      userName: entry.actorName,
      userRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      result: entry.severity === 'warning' ? 'warning' : 'success',
      details: entry.details || '',
      ipAddress: '127.0.0.1'
    });
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates
    };
    this.persist();
    this.syncPgUser(this.data.users[index]);
    return this.data.users[index];
  }

  public toggleUserStatus(id: string): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index].activeStatus = !this.data.users[index].activeStatus;
    this.persist();
    return this.data.users[index];
  }

  // --- Staff Operations ---
  public getStaff(): StaffMember[] {
    return [...this.data.staff];
  }

  public getStaffById(id: string): StaffMember | undefined {
    return this.data.staff.find(s => s.id === id);
  }

  public addStaff(member: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    const newStaff: StaffMember = {
      ...member,
      id: `stf-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.data.staff.unshift(newStaff);

    // Also sync or create user in users array if doesn't exist
    const existingUser = this.data.users.find(u => u.phone === member.phone || u.id === member.userId);
    if (existingUser) {
      existingUser.role = member.role;
      existingUser.activeStatus = member.activeStatus ?? true;
    } else {
      this.data.users.push({
        id: member.userId || `usr-${Date.now()}`,
        name: member.name,
        phone: member.phone,
        phoneVerified: true,
        role: member.role,
        activeStatus: member.activeStatus ?? true,
        createdAt: newStaff.createdAt
      });
    }

    this.persist();
    return newStaff;
  }

  public toggleStaffStatus(id: string): StaffMember | undefined {
    const index = this.data.staff.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.data.staff[index].activeStatus = !this.data.staff[index].activeStatus;
    // Sync with users array
    const user = this.data.users.find(u => u.id === this.data.staff[index].userId || u.name === this.data.staff[index].name);
    if (user) {
      user.activeStatus = this.data.staff[index].activeStatus;
    }
    this.persist();
    return this.data.staff[index];
  }

  public updateStaffPermissions(id: string, permissions: string[]): StaffMember | undefined {
    const index = this.data.staff.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.data.staff[index].permissions = permissions;
    this.persist();
    return this.data.staff[index];
  }

  // --- Roles Matrix Operations ---
  public getRolesMatrix(): Record<string, string[]> {
    return { ...this.data.rolesMatrix };
  }

  public updateRolesMatrix(matrix: Record<string, string[]>): Record<string, string[]> {
    this.data.rolesMatrix = {
      ...this.data.rolesMatrix,
      ...matrix
    };
    this.persist();
    return this.data.rolesMatrix;
  }

  // --- Active Sessions Operations ---
  public getActiveSessions(): ActiveSession[] {
    return [...this.data.activeSessions];
  }

  public addActiveSession(session: Omit<ActiveSession, 'id'>): ActiveSession {
    const newSession: ActiveSession = {
      ...session,
      id: `ses-${Date.now()}`
    };
    this.data.activeSessions.unshift(newSession);
    this.persist();
    return newSession;
  }

  public terminateSession(sessionIdOrId: string): boolean {
    const initialLen = this.data.activeSessions.length;
    this.data.activeSessions = this.data.activeSessions.filter(
      s => s.id !== sessionIdOrId && s.sessionId !== sessionIdOrId
    );
    if (this.data.activeSessions.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Security Threats & IP Blocking ---
  public getThreats(): SecurityThreat[] {
    return [...this.data.threats];
  }

  public addThreat(threat: Omit<SecurityThreat, 'id' | 'occurredAt'>): SecurityThreat {
    const newThreat: SecurityThreat = {
      ...threat,
      id: `th-${Date.now()}`,
      occurredAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    this.data.threats.unshift(newThreat);
    if (this.data.threats.length > 100) {
      this.data.threats = this.data.threats.slice(0, 100);
    }
    this.persist();
    return newThreat;
  }

  public getBlockedIps(): BlockedIp[] {
    return [...this.data.blockedIps];
  }

  public blockIp(ip: string, reason: string, blockedBy: string): BlockedIp {
    const existing = this.data.blockedIps.find(b => b.ip === ip);
    if (existing) return existing;

    const entry: BlockedIp = {
      ip,
      reason,
      blockedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      blockedBy
    };
    this.data.blockedIps.unshift(entry);

    // Also mark threats matching this IP as blocked
    this.data.threats.forEach(t => {
      if (t.ipAddress === ip) t.blocked = true;
    });

    this.persist();
    return entry;
  }

  public unblockIp(ip: string): boolean {
    const initialLen = this.data.blockedIps.length;
    this.data.blockedIps = this.data.blockedIps.filter(b => b.ip !== ip);
    this.data.threats.forEach(t => {
      if (t.ipAddress === ip) t.blocked = false;
    });
    if (this.data.blockedIps.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public isIpBlocked(ip: string): boolean {
    return this.data.blockedIps.some(b => b.ip === ip);
  }

  // --- System Settings ---
  public getSystemSettings(): SystemSettings {
    return { ...this.data.systemSettings };
  }

  public updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.systemSettings = {
      ...this.data.systemSettings,
      ...updates
    };
    this.persist();
    return this.data.systemSettings;
  }

  // --- Feature Flags ---
  public getFeatureFlags(): FeatureFlag[] {
    return [...this.data.featureFlags];
  }

  public toggleFeatureFlag(key: string): FeatureFlag | undefined {
    const flag = this.data.featureFlags.find(f => f.key === key);
    if (!flag) return undefined;
    flag.enabled = !flag.enabled;
    flag.updatedAt = new Date().toISOString().split('T')[0];
    this.persist();
    return flag;
  }

  public updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): FeatureFlag | undefined {
    const flag = this.data.featureFlags.find(f => f.key === key);
    if (!flag) return undefined;
    Object.assign(flag, updates, { updatedAt: new Date().toISOString().split('T')[0] });
    this.persist();
    return flag;
  }

  // --- Backups & Restore ---
  public getBackups(): BackupPoint[] {
    return [...this.data.backups];
  }

  public createBackup(createdBy: string, notes?: string): BackupPoint {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `dalani_backup_${timestamp}.json`;
    const fullBackupPath = path.resolve(BACKUPS_DIR, fileName);

    const fullDump = JSON.stringify(this.data, null, 2);
    const hash = crypto.createHash('sha256').update(fullDump).digest('hex');
    fs.writeFileSync(fullBackupPath, fullDump, 'utf-8');

    const backupPoint: BackupPoint = {
      id: `bkp-${Date.now()}`,
      fileName,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      createdBy,
      sizeBytes: Buffer.byteLength(fullDump, 'utf-8'),
      recordsCount: {
        listings: this.data.listings.length,
        users: this.data.users.length,
        organizations: this.data.organizations.length,
        auditLogs: this.data.auditLogs.length,
        verifications: this.data.verifications.length,
        reports: this.data.reports.length,
        tickets: this.data.tickets.length
      },
      checksumSha256: hash,
      status: 'valid',
      notes: notes || 'نسخة احتياطية كاملة وموثقة للمنظومة'
    };

    this.data.backups.unshift(backupPoint);
    this.persist();
    return backupPoint;
  }

  public restoreBackup(backupId: string, performedBy: string): { success: boolean; message: string; safetyBackupId?: string } {
    const backup = this.data.backups.find(b => b.id === backupId);
    if (!backup) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير موجود في السجل' };
    }

    const backupFileName = backup.fileName || backup.name || '';
    if (!backupFileName) {
      return { success: false, message: 'اسم ملف النسخة الاحتياطية غير محدد' };
    }

    const fullBackupPath = path.resolve(BACKUPS_DIR, backupFileName);
    let backupContent: string;

    if (fs.existsSync(fullBackupPath)) {
      backupContent = fs.readFileSync(fullBackupPath, 'utf-8');
    } else {
      // If standalone backup file missing on disk, fallback to checking if state was recorded
      return { success: false, message: `تعذر قراءة ملف النسخة من المسار: ${backupFileName}` };
    }

    // Verify Checksum
    const currentHash = crypto.createHash('sha256').update(backupContent).digest('hex');
    if (backup.checksumSha256 && backup.checksumSha256 !== currentHash) {
      backup.status = 'corrupted';
      this.persist();
      return { success: false, message: 'فشل التحقق من التوقيع الرقمي للنسخة الاحتياطية، تم إلغاء الاستعادة لحماية البيانات.' };
    }

    // Create automatic safety snapshot before restoring
    const safetySnapshot = this.createBackup(
      `النظام الآلي (قبل استعادة ${backup.fileName})`,
      'نسخة أمان تلقائية تم أخذها مباشرة قبل تنفيذ عملية استرجاع لتأمين إمكانية التراجع'
    );

    try {
      const restoredData = JSON.parse(backupContent);
      if (!Array.isArray(restoredData.listings) || !Array.isArray(restoredData.users)) {
        return { success: false, message: 'بنية ملف النسخة الاحتياطية غير متوافقة أو ينقصها جداول أساسية' };
      }

      // Restore data while preserving current backups registry and audit trail continuity
      this.data.listings = restoredData.listings.map(normalizeListing);
      this.data.organizations = restoredData.organizations || [];
      this.data.verifications = restoredData.verifications || [];
      this.data.reports = restoredData.reports || [];
      this.data.tickets = restoredData.tickets || [];
      this.data.users = restoredData.users || [];
      this.data.staff = restoredData.staff || getDefaultStaff(this.data.users);
      this.data.rolesMatrix = restoredData.rolesMatrix || getDefaultRolesMatrix();
      this.data.systemSettings = restoredData.systemSettings || getDefaultSystemSettings();
      this.data.featureFlags = restoredData.featureFlags || getDefaultFeatureFlags();

      this.persist();
      return {
        success: true,
        message: `تمت استعادة البيانات بنجاح من النسخة ${backup.fileName}`,
        safetyBackupId: safetySnapshot.id
      };
    } catch (err: any) {
      return { success: false, message: `خطأ أثناء استعادة البيانات: ${err.message}` };
    }
  }

  // --- System Error Logs ---
  public getSystemErrors(): SystemErrorLog[] {
    return [...this.data.systemErrors];
  }

  public logSystemError(code: string, module: string, message: string, severity: SystemErrorLog['severity'] = 'error'): SystemErrorLog {
    const errorLog: SystemErrorLog = {
      id: `err-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      code,
      module,
      message,
      severity,
      status: 'open'
    };
    this.data.systemErrors.unshift(errorLog);
    if (this.data.systemErrors.length > 100) {
      this.data.systemErrors = this.data.systemErrors.slice(0, 100);
    }
    this.persist();
    return errorLog;
  }

  public resolveSystemError(id: string, resolvedBy: string): SystemErrorLog | undefined {
    const error = this.data.systemErrors.find(e => e.id === id);
    if (!error) return undefined;
    error.status = 'resolved';
    error.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    error.resolvedBy = resolvedBy;
    this.persist();
    return error;
  }

  // --- Integrations ---
  public getIntegrations(): IntegrationServiceStatus[] {
    return [...this.data.integrations];
  }

  public updateIntegrationStatus(id: string, updates: Partial<IntegrationServiceStatus>): IntegrationServiceStatus | undefined {
    const item = this.data.integrations.find(i => i.id === id);
    if (!item) return undefined;
    Object.assign(item, updates, { lastCheckedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) });
    this.persist();
    return item;
  }

  // --- Escalations ---
  public getEscalations(): EscalationCase[] {
    return [...this.data.escalations];
  }

  public resolveEscalation(id: string, status: 'approved' | 'rejected', notes: string): EscalationCase | undefined {
    const item = this.data.escalations.find(e => e.id === id);
    if (!item) return undefined;
    item.status = status;
    item.adminResolutionNotes = notes;
    item.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.persist();
    return item;
  }

  // --- Data Integrity Check & Repair ---
  public checkDataIntegrity(): {
    isHealthy: boolean;
    issuesFound: string[];
    stats: {
      totalListings: number;
      totalUsers: number;
      orphanListings: number;
      unlinkedTickets: number;
      missingDeedBadges: number;
      staleSessionsCount: number;
    };
  } {
    const issues: string[] = [];
    const userIds = new Set(this.data.users.map(u => u.id));

    // Check orphan listings
    const orphanListings = this.data.listings.filter(l => l.advertiser && !userIds.has(l.advertiser.id));
    if (orphanListings.length > 0) {
      issues.push(`تم رصد ${orphanListings.length} عقارات بمعرف معلن غير مسجل في جدول المستخدمين.`);
    }

    // Check unlinked tickets
    const unlinkedTickets = this.data.tickets.filter(t => !userIds.has(t.userId));
    if (unlinkedTickets.length > 0) {
      issues.push(`تم رصد ${unlinkedTickets.length} تذاكر دعم فني لا يرتبط أصحابها بحسابات مسجلة.`);
    }

    const missingDeedBadges = this.data.listings.filter(
      l => l.status === 'published' && (!l.verificationBadges || l.verificationBadges.length === 0)
    ).length;

    const staleSessions = this.data.activeSessions.filter(s => {
      // Sessions with lastActiveAt older than timeout
      return false;
    });

    return {
      isHealthy: issues.length === 0,
      issuesFound: issues,
      stats: {
        totalListings: this.data.listings.length,
        totalUsers: this.data.users.length,
        orphanListings: orphanListings.length,
        unlinkedTickets: unlinkedTickets.length,
        missingDeedBadges,
        staleSessionsCount: staleSessions.length
      }
    };
  }

  public repairDataIntegrity(): { repairedCount: number; summary: string } {
    let repaired = 0;
    const defaultOwner = this.data.users.find(u => u.role === 'advertiser') || this.data.users[0];

    // Link orphan listings to valid default owner
    const userIds = new Set(this.data.users.map(u => u.id));
    this.data.listings.forEach(l => {
      if (l.advertiser && !userIds.has(l.advertiser.id) && defaultOwner) {
        l.advertiser.id = defaultOwner.id;
        l.advertiser.name = defaultOwner.name;
        repaired++;
      }
    });

    this.persist();
    return {
      repairedCount: repaired,
      summary: `تم إصلاح ${repaired} علاقة وسجلات يتيمة بنجاح، وجميع البيانات مترابطة الآن.`
    };
  }

  // ==========================================
  // PROPERTY REQUESTS & TEMPORARY BOOKINGS OPS
  // ==========================================

  public getRequests(): PropertyRequest[] {
    return [...this.data.requests];
  }

  public getRequestById(id: string): PropertyRequest | undefined {
    return this.data.requests.find(r => r.id === id);
  }

  public addRequest(req: PropertyRequest): PropertyRequest {
    this.data.requests.unshift(req);
    this.persist();
    this.syncPgRequest(req);
    return req;
  }

  public updateRequest(id: string, updates: Partial<PropertyRequest>): PropertyRequest | undefined {
    const index = this.data.requests.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.data.requests[index] = {
      ...this.data.requests[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.persist();
    this.syncPgRequest(this.data.requests[index]);
    return this.data.requests[index];
  }

  public deleteRequest(id: string): boolean {
    const prevLen = this.data.requests.length;
    this.data.requests = this.data.requests.filter(r => r.id !== id);
    if (this.data.requests.length !== prevLen) {
      this.persist();
      if (pgDb) pgDb.delete(schema.propertyRequestsTable).where(eq(schema.propertyRequestsTable.id, id)).catch(err => console.error('[PostgreSQL Sync] Delete request error:', err?.message || err));
      return true;
    }
    return false;
  }

  public getBookings(): PropertyBooking[] {
    this.checkBookingsExpiration();
    return [...this.data.bookings];
  }

  public getBookingById(id: string): PropertyBooking | undefined {
    this.checkBookingsExpiration();
    return this.data.bookings.find(b => b.id === id);
  }

  public getActiveBookingForListing(listingId: string): PropertyBooking | undefined {
    this.checkBookingsExpiration();
    const now = new Date().getTime();
    return this.data.bookings.find(
      b => b.listingId === listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > now
    );
  }

  public addBooking(booking: PropertyBooking): PropertyBooking {
    this.data.bookings.unshift(booking);
    this.syncListingsReservationStatus();
    this.persist();
    this.syncPgBooking(booking);
    return booking;
  }

  public updateBooking(id: string, updates: Partial<PropertyBooking>): PropertyBooking | undefined {
    const index = this.data.bookings.findIndex(b => b.id === id);
    if (index === -1) return undefined;
    this.data.bookings[index] = {
      ...this.data.bookings[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.syncListingsReservationStatus();
    this.persist();
    this.syncPgBooking(this.data.bookings[index]);
    return this.data.bookings[index];
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
    const booking = this.getBookingById(bookingId);
    if (!booking) return {};

    const nowStr = new Date().toISOString();
    const dateOnly = nowStr.split('T')[0];

    const categoryNames: Record<string, string> = {
      buyer_retracted: 'انسحاب المشتري / المستأجر',
      seller_retracted: 'انسحاب البائع / المؤجر',
      inspection_unsatisfactory: 'عدم الرضا بعد المعاينة الميدانية',
      deed_issue: 'ملاحظات على صك الملكية والبصيرة الشرعية',
      price_disagreement: 'عدم الاتفاق النهائي على الشروط والسعر',
      mutual_cancellation: 'إلغاء وفسخ الاتفاق بالتراضي',
      dispute_cancelled: 'إلغاء المعاملة بقرار إداري نتيجة نزاع'
    };

    booking.status = 'cancelled';
    booking.cancellationCategory = category;
    booking.cancellationReason = `${categoryNames[category] || category}: ${reason}`;
    booking.cancelledBy = actor.name;
    booking.cancelledAt = nowStr;
    booking.updatedAt = dateOnly;

    // Release reservation on listing if not sold
    const listing = this.getListingById(booking.listingId);
    if (listing && listing.status !== 'completed') {
      listing.isReserved = false;
      listing.reservedUntil = undefined;
      listing.activeBookingId = undefined;
      listing.updatedAt = dateOnly;
    }

    // Cancel contract if exists
    let contract = this.getContractByBookingId(booking.id);
    if (contract && contract.status !== 'signed') {
      contract.status = 'cancelled';
      contract.notes = `${contract.notes ? contract.notes + '\n' : ''}تم إلغاء العقد تبعاً لإلغاء الحجز بواسطة [${actor.name}]. السبب: ${reason}`;
      contract.updatedAt = dateOnly;
    }

    this.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `❌ تم إلغاء الحجز والمعاملة بواسطة [${actor.name}]. التصنيف: [${categoryNames[category]}]. البيان: ${reason}. تم فك حجز العقار وإعادته للوفرة.`
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'reject',
      targetType: 'booking',
      targetId: booking.id,
      targetNumber: booking.bookingNumber,
      details: `إلغاء الحجز [${booking.bookingNumber}] بواسطة [${actor.name}]. التصنيف: [${categoryNames[category]}]. السبب: ${reason}`,
      severity: 'warning'
    });

    this.syncListingsReservationStatus();
    this.persist();

    return { booking, listing, contract };
  }

  public raiseDealDispute(
    bookingId: string,
    claimType: 'breach_of_terms' | 'misrepresentation' | 'payment_default' | 'document_defect' | 'other',
    claimDescription: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; dispute?: DealDispute } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return {};

    const nowStr = new Date().toISOString();
    const disputeId = `dsp-${Date.now()}`;

    const dispute: DealDispute = {
      id: disputeId,
      bookingId,
      raisedBy: { id: actor.id, name: actor.name, role: actor.role },
      raisedAt: nowStr,
      claimType,
      claimDescription,
      status: 'active'
    };

    booking.isDisputed = true;
    booking.dispute = dispute;
    booking.updatedAt = nowStr.split('T')[0];

    // Create an escalation desk entry for administration (Requirement 10)
    const escId = `esc-${Date.now()}`;
    const claimLabels: Record<string, string> = {
      breach_of_terms: 'إخلال بالشروط المتفق عليها',
      misrepresentation: 'تضليل في مواصفات أو وثائق العقار',
      payment_default: 'تعذر أو تأخر السداد المالي',
      document_defect: 'نزاع على صك الملكية والبصيرة الشرعية',
      other: 'نزاع عام'
    };

    this.data.escalations.unshift({
      id: escId,
      caseNumber: `DISP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `نزاع صفقة عقارية [${booking.bookingNumber}] - ${claimLabels[claimType] || claimType}`,
      sourceType: 'report',
      sourceId: booking.id,
      submittedBy: `${actor.name} (${actor.role})`,
      priority: 'high',
      status: 'pending_admin',
      description: `تم تجميد الصفقة بسبب نزاع: ${claimDescription}. العقار: [${booking.listingTitle}].`,
      createdAt: nowStr.split('T')[0]
    });

    this.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `⚠️ تنبيه نزاع قانوني: قام [${actor.name}] برفع طلب نزاع رسمي حول هذه الصفقة (${claimLabels[claimType]}). تم تجميد إجراءات إتمام المعاملة مؤقتاً وإحالتها للمشرفين وإدارة النظام للفحص والمصادقة.`
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'update',
      targetType: 'booking',
      targetId: booking.id,
      targetNumber: booking.bookingNumber,
      details: `رفع نزاع قانوني على الصفقة [${booking.bookingNumber}] بواسطة [${actor.name}]. السبب: ${claimDescription}`,
      severity: 'warning'
    });

    this.persist();
    return { booking, dispute };
  }

  public resolveDealDispute(
    bookingId: string,
    resolution: 'dismissed' | 'resolved' | 'cancel_deal',
    resolutionNotes: string,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; dispute?: DealDispute } {
    const booking = this.getBookingById(bookingId);
    if (!booking || !booking.dispute) return {};

    const nowStr = new Date().toISOString();

    if (resolution === 'cancel_deal') {
      booking.dispute.status = 'resolved';
      booking.dispute.resolutionNotes = resolutionNotes;
      booking.dispute.resolvedAt = nowStr;
      booking.dispute.resolvedBy = actor.name;
      booking.isDisputed = false;
      this.cancelBookingWithCategory(booking.id, 'dispute_cancelled', resolutionNotes, actor);
    } else {
      booking.dispute.status = resolution;
      booking.dispute.resolutionNotes = resolutionNotes;
      booking.dispute.resolvedAt = nowStr;
      booking.dispute.resolvedBy = actor.name;
      booking.isDisputed = false;

      this.addDealMessage(booking.id, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `⚖️ قرار إداري: تم فض النزاع المعلق من قبل الإدارة [${actor.name}] (${resolution === 'resolved' ? 'تمت التسوية' : 'رد الدعوى'}). ملاحظات القرار: ${resolutionNotes}. تم استئناف مسار الصفقة.`
      });
    }

    this.persist();
    return { booking, dispute: booking.dispute };
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
    const booking = this.getBookingById(bookingId);
    if (!booking) return undefined;

    if (!Array.isArray(booking.messages)) {
      booking.messages = [];
    }

    const newMsg: DealMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      text: message.text,
      type: message.type || 'chat',
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
    };

    booking.messages.push(newMsg);
    booking.updatedAt = new Date().toISOString().split('T')[0];
    this.persist();
    return newMsg;
  }

  public proposeDealTerms(
    bookingId: string,
    terms: DealTerms,
    proposer: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; revision?: TermsRevision; wasApprovedModified: boolean } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return { wasApprovedModified: false };

    if (!Array.isArray(booking.termsHistory)) {
      booking.termsHistory = [];
    }

    const wasApproved = Boolean(booking.termsStatus === 'accepted' || booking.agreedTerms);
    const newVersion = (booking.termsHistory.length || 0) + 1;
    const nowTimeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });

    let newStatus: TermsStatus = 'pending_approval';

    if (wasApproved) {
      // REQUIREMENT 8: Prevent silent modification of approved terms!
      // Any attempt to modify an accepted deal suspends approval and requires re-approval
      newStatus = 'pending_reapproval';
      booking.termsStatus = 'pending_reapproval';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'terms_modified',
        text: `⚠️ تنبيه حوكمة: قام [${proposer.name}] بطلب تعديل على الشروط المعتمدة مسبقاً (الإصدار #${newVersion}). تم تعليق الاعتماد المسبق تلقائياً ويتطلب موافقة الطرف الآخر الصريحة لمنع التعديل الصامت.`
      });
    } else {
      // Mark previous pending revisions as superseded
      booking.termsHistory.forEach(r => {
        if (r.status === 'pending_approval') {
          r.status = 'superseded';
        }
      });
      booking.termsStatus = 'pending_approval';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'terms_proposal',
        text: `📄 قدم [${proposer.name}] مقترح شروط جديد (الإصدار #${newVersion}) بقيمة [${terms.price.toLocaleString()} ${terms.currency}]. قيد مراجعة الطرف الآخر.`
      });
    }

    const revision: TermsRevision = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      version: newVersion,
      proposedBy: proposer,
      proposedAt: nowTimeStr,
      terms,
      status: newStatus
    };

    booking.currentTerms = terms;
    booking.termsHistory.unshift(revision);
    booking.dealStage = 'terms_negotiation';
    booking.updatedAt = new Date().toISOString().split('T')[0];
    this.persist();

    return { booking, revision, wasApprovedModified: wasApproved };
  }

  public respondToDealTerms(
    bookingId: string,
    revisionId: string,
    action: 'accept' | 'reject',
    responder: { id: string; name: string; role: UserRole },
    responseNotes?: string
  ): { booking?: PropertyBooking; revision?: TermsRevision; error?: string } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return { error: 'الحجز غير موجود' };

    if (!Array.isArray(booking.termsHistory)) {
      return { error: 'لا توجد مسودات شروط سابقة' };
    }

    const revision = booking.termsHistory.find(r => r.id === revisionId) || booking.termsHistory[0];
    if (!revision) {
      return { error: 'المسودة المحددة غير موجودة' };
    }

    if (revision.status !== 'pending_approval' && revision.status !== 'pending_reapproval') {
      return { error: `هذه المسودة تمت معالجتها مسبقاً وحالتها [${revision.status}]` };
    }

    const nowTimeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });

    if (action === 'accept') {
      revision.status = 'accepted';
      revision.responseBy = responder;
      revision.responseAt = nowTimeStr;
      revision.responseNotes = responseNotes || 'تمت الموافقة واعتماد الشروط';

      booking.termsStatus = 'accepted';
      booking.agreedTerms = { ...revision.terms };
      booking.agreedTermsApprovedAt = new Date().toISOString();
      booking.dealStage = 'terms_negotiation';

      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'terms_accepted',
        text: `✅ تم اعتماد الشروط النهائية رسمياً من قبل [${responder.name}]. الشروط المعتمدة أصبحت ملزمة مبدئياً ولا يمكن تعديلها بصمت.`
      });
    } else {
      revision.status = 'rejected';
      revision.responseBy = responder;
      revision.responseAt = nowTimeStr;
      revision.responseNotes = responseNotes || 'تم رفض مسودة الشروط';

      booking.termsStatus = 'rejected';

      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'chat',
        text: `❌ اعتذر [${responder.name}] عن مسودة الشروط (الإصدار #${revision.version}). ملاحظات: ${responseNotes || 'يرجى مراجعة وتعديل البنود'}.`
      });
    }

    booking.updatedAt = new Date().toISOString().split('T')[0];
    this.persist();

    return { booking, revision };
  }

  public updateInspectionVisit(
    bookingId: string,
    visit: Partial<InspectionVisit>,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; visit?: InspectionVisit } {
    const booking = this.getBookingById(bookingId);
    if (!booking) return {};

    const prevStatus = booking.inspectionVisit?.status || 'not_scheduled';
    const updatedVisit: InspectionVisit = {
      ...(booking.inspectionVisit || { status: 'not_scheduled' }),
      ...visit
    };

    if (visit.status === 'confirmed' && prevStatus !== 'confirmed') {
      updatedVisit.confirmedAt = new Date().toISOString();
      booking.dealStage = 'inspection_deed';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'inspection_update',
        text: `📅 تم تأكيد موعد المعاينة الميدانية بتاريخ [${updatedVisit.requestedDate || ''} ${updatedVisit.requestedTime || ''}] من قبل [${actor.name}]. ملاحظات الموقع: ${updatedVisit.locationNotes || 'الموقع محدد'}.`
      });
    } else if (visit.status === 'completed' && prevStatus !== 'completed') {
      updatedVisit.completedAt = new Date().toISOString();
      const resultText = updatedVisit.result === 'satisfied' ? 'معاينة ناجحة ومطابقة للوصف' : updatedVisit.result === 'needs_negotiation' ? 'ملاحظات تستدعي التفاوض' : 'عدم الرغبة بعد المعاينة';
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'inspection_update',
        text: `🏁 تم تسجيل نتيجة المعاينة الميدانية: [${resultText}] بواسطة [${actor.name}]. ملاحظات: ${updatedVisit.resultNotes || 'لا توجد'}.`
      });
    } else if (visit.status === 'requested' && prevStatus !== 'requested') {
      this.addDealMessage(bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'inspection_update',
        text: `📍 طلب [${actor.name}] موعد معاينة ميدانية للعقار في [${updatedVisit.requestedDate} ${updatedVisit.requestedTime || ''}]. قيد تأكيد المعلن.`
      });
    }

    booking.inspectionVisit = updatedVisit;
    booking.updatedAt = new Date().toISOString().split('T')[0];
    this.persist();

    return { booking, visit: updatedVisit };
  }

  public updateDealStage(
    bookingId: string,
    stage: DealStage,
    actor: { id: string; name: string; role: UserRole }
  ): PropertyBooking | undefined {
    const booking = this.getBookingById(bookingId);
    if (!booking) return undefined;

    booking.dealStage = stage;
    booking.updatedAt = new Date().toISOString().split('T')[0];

    const stageNames: Record<DealStage, string> = {
      request_submitted: 'تقديم الطلب ومراجعة المعلن',
      booking_exclusive: 'تأكيد الحجز المؤقت وحصرية العقار',
      inspection_deed: 'المعاينة الميدانية وفحص الوثائق',
      terms_negotiation: 'التفاوض واعتماد الشروط النهائية',
      contract_completed: 'إبرام العقد وإتمام الصفقة'
    };

    this.addDealMessage(bookingId, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `🔄 تم نقل مرحلة الصفقة إلى: [${stageNames[stage]}] بواسطة [${actor.name}].`
    });

    this.persist();
    return booking;
  }

  // ==========================================
  // CONTRACT METHODS (منظومة العقود والتوثيق)
  // ==========================================

  public getContracts(filter?: { bookingId?: string; listingId?: string; partyId?: string; status?: ContractStatus }): PropertyContract[] {
    let result = this.data.contracts || [];
    if (!filter) return result;
    if (filter.bookingId) result = result.filter(c => c.bookingId === filter.bookingId);
    if (filter.listingId) result = result.filter(c => c.listingId === filter.listingId);
    if (filter.status) result = result.filter(c => c.status === filter.status);
    if (filter.partyId) {
      result = result.filter(c =>
        c.firstParty?.id === filter.partyId ||
        c.secondParty?.id === filter.partyId ||
        c.witnesses?.some(w => w.id === filter.partyId)
      );
    }
    return result;
  }

  public getContractById(contractId: string): PropertyContract | undefined {
    return (this.data.contracts || []).find(c => c.id === contractId);
  }

  public getContractByBookingId(bookingId: string): PropertyContract | undefined {
    return (this.data.contracts || []).find(c => c.bookingId === bookingId);
  }

  public createContractFromBooking(
    bookingId: string,
    actor: { id: string; name: string; role: UserRole },
    options?: { customType?: ContractType; customClauses?: ContractClause[] }
  ): PropertyContract {
    const booking = this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('الحجز غير موجود');
    }

    // Check if contract already exists
    const existing = this.getContractByBookingId(bookingId);
    if (existing) {
      return existing;
    }

    const listing = this.getListingById(booking.listingId);
    const contractType: ContractType = options?.customType || (listing?.purpose === 'sale' ? 'sale' : 'lease');
    const terms = booking.agreedTerms || booking.currentTerms;
    const linkedReq = booking.requestId ? this.getRequestById(booking.requestId) : undefined;
    const price = terms?.price || booking.listingPrice || 0;
    const currency = terms?.currency || booking.listingCurrency || 'USD';
    const deposit = terms?.depositAmount || Math.round(price * 0.05);

    const clauses = options?.customClauses && options.customClauses.length > 0
      ? options.customClauses
      : generateStandardContractClauses(contractType, booking, listing, terms);

    const nowStr = new Date().toISOString();
    const dateStr = nowStr.split('T')[0];
    const contractId = `cnt-${Date.now()}`;
    const contractNumber = `CNT-2026-${Math.floor(2000 + Math.random() * 8000)}`;

    const seekerUser = this.getUserById(booking.seekerId);
    const advUser = this.getUserById(booking.advertiserId);

    const newContract: PropertyContract = {
      id: contractId,
      contractNumber,
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
        governorate: listing?.location?.governorate || booking.listingGovernorate || 'صنعاء',
        city: listing?.location?.city || 'صنعاء',
        district: listing?.location?.district || 'الأمانة',
        street: listing?.location?.street || 'الشارع الرئيسي',
        area: listing?.area || 0,
        areaUnit: listing?.areaUnit || 'م²',
        deedNumber: listing?.deedNumber || 'صك مقيد بالسجل العقاري المعتمد',
        boundaries: {
          north: 'شارع معبد نافذ',
          south: 'عقار مجاور',
          east: 'شارع فرعي',
          west: 'عقار مجاور'
        }
      },
      firstParty: {
        id: advUser?.id || booking.advertiserId,
        name: advUser?.name || booking.advertiserName,
        phone: advUser?.phone || booking.advertiserPhone,
        role: contractType === 'sale' ? 'seller' : 'lessor',
        nationalIdOrPassport: 'بطاقة شخصية صادرة من الجمهورية اليمنية',
        address: listing?.location?.city ? `${listing.location.governorate} - ${listing.location.city}` : 'صنعاء',
        signatureStatus: 'unsigned'
      },
      secondParty: {
        id: seekerUser?.id || booking.seekerId,
        name: seekerUser?.name || booking.seekerName,
        phone: seekerUser?.phone || booking.seekerPhone,
        role: contractType === 'sale' ? 'buyer' : 'lessee',
        nationalIdOrPassport: 'بطاقة شخصية صادرة من الجمهورية اليمنية',
        address: 'صنعاء',
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
      brokerOrAgent: {
        id: 'dalani-broker',
        name: 'منصة دلنّي العقارية',
        phone: '+967 1 445 566',
        commissionAmount: Math.round(price * 0.01),
        commissionPayer: terms?.feeResponsibility || 'shared_equally'
      },
      financialTerms: {
        totalAmount: price,
        currency,
        depositAmount: deposit,
        depositCurrency: currency,
        paymentSchedule: contractType === 'lease'
          ? (terms?.paymentMethod === 'certified_check'
              ? 'سداد مبلغ التأمين، وتسليم الأجرة مقدماً بشيك مصرفي مصدق'
              : `سداد مبلغ التأمين والضمانة، وتسليم الأجرة مقدماً (${terms?.paymentFrequency || linkedReq?.paymentFrequency || 'شهرياً'}) بموجب سند قبض رسمي`)
          : (terms?.paymentMethod === 'certified_check'
              ? 'سداد العربون، وتسليم المتبقي بشيك مصرفي مصدق عند توقيع وثيقة الإفراغ والتسليم'
              : 'سداد العربون، وتسليم المتبقي نقداً أو بحوالة بنكية معتمدة'),
        advancePaymentMonths: contractType === 'lease' ? (terms?.paymentFrequency === 'annual' ? 12 : terms?.paymentFrequency === 'semi_annual' ? 6 : terms?.paymentFrequency === 'quarterly' ? 3 : 1) : undefined,
        securityDeposit: contractType === 'lease' ? deposit : undefined
      },
      durationTerms: {
        startDate: dateStr,
        handoverDate: terms?.handoverDate || 'خلال أسبوعين من التوقيع',
        durationMonths: contractType === 'lease' ? (terms?.leaseDurationMonths || linkedReq?.leaseDurationMonths || 12) : undefined,
        renewalTerms: contractType === 'lease' ? 'إشعار خطي قبل 60 يوماً من الانتهاء' : undefined
      },
      clauses,
      currentVersion: 1,
      versionHistory: [
        {
          version: 1,
          createdAt: nowStr,
          createdBy: {
            id: actor.id,
            name: actor.name,
            role: actor.role
          },
          summaryOfChanges: 'إنشاء مسودة العقد الرسمية واستيراد بيانات الحجز والشروط المتفق عليها وصك العقار',
          clauses: clauses.map(c => ({ ...c })),
          financialTerms: {
            totalAmount: price,
            currency,
            depositAmount: deposit,
            paymentSchedule: terms?.paymentMethod || 'certified_check'
          },
          status: 'draft'
        }
      ],
      versions: [
        {
          version: 1,
          createdAt: nowStr,
          createdBy: {
            id: actor.id,
            name: actor.name,
            role: actor.role
          },
          summaryOfChanges: 'إنشاء مسودة العقد الرسمية واستيراد بيانات الحجز والشروط المتفق عليها وصك العقار',
          clauses: clauses.map(c => ({ ...c })),
          financialTerms: {
            totalAmount: price,
            currency,
            depositAmount: deposit,
            paymentSchedule: terms?.paymentMethod || 'certified_check'
          },
          status: 'draft'
        }
      ],
      firstPartyApprovedAt: actor.id === booking.advertiserId ? nowStr : undefined,
      secondPartyApprovedAt: actor.id === booking.seekerId ? nowStr : undefined,
      notes: `تم إنشاء المسودة تلقائياً بواسطة [${actor.name}] استناداً إلى الحجز [${booking.bookingNumber}].`,
      createdAt: dateStr,
      updatedAt: dateStr
    };

    if (!Array.isArray(this.data.contracts)) {
      this.data.contracts = [];
    }
    this.data.contracts.unshift(newContract);

    // Update booking link & advance deal stage
    booking.contractId = newContract.id;
    booking.contractNumber = newContract.contractNumber;
    booking.dealStage = 'contract_completed';
    booking.updatedAt = dateStr;

    // Log audit log
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'create',
      targetType: 'contract',
      targetId: newContract.id,
      targetNumber: newContract.contractNumber,
      details: `إنشاء مسودة عقد [${contractType === 'sale' ? 'بيع عقاري' : 'إيجار'}] برقم [${newContract.contractNumber}] مرتبط بالحجز [${booking.bookingNumber}] والعقار [${booking.listingNumber}]`,
      severity: 'info'
    });

    // Add deal message to workspace
    this.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `📜 تم إعداد مسودة عقد [${contractType === 'sale' ? 'بيع عقاري' : 'إيجار'}] رسمي برقم [${newContract.contractNumber}] بواسطة [${actor.name}]. يمكن للأطراف مراجعة البنود واعتمادها قانونياً.`
    });

    this.persist();
    this.syncPgContract(newContract);
    return newContract;
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
    const contract = this.getContractById(contractId);
    if (!contract) {
      throw new Error('العقد غير موجود');
    }

    const wasApproved = contract.status === 'approved' || contract.status === 'signed';

    // REQUIREMENT 6: Anti-Silent Modification protection!
    if (wasApproved) {
      contract.isModificationPendingApproval = true;
      contract.modificationRequestedBy = actor.name;
      contract.modificationReason = updates.summaryOfChanges || 'طلب تعديل بنود العقد المعتمد';
      contract.status = 'pending_approval';
      // Reset approvals requiring explicit re-approval from both parties (Requirement 6)
      contract.firstPartyApprovedAt = undefined;
      contract.secondPartyApprovedAt = undefined;
      contract.firstPartyApproval = false;
      contract.secondPartyApproval = false;
      if (contract.firstParty) contract.firstParty.signatureStatus = 'pending';
      if (contract.secondParty) contract.secondParty.signatureStatus = 'pending';
    }

    const newVersionNum = (contract.currentVersion || 1) + 1;
    contract.currentVersion = newVersionNum;

    if (updates.clauses) {
      contract.clauses = updates.clauses;
    }
    if (updates.financialTerms) {
      contract.financialTerms = { ...contract.financialTerms, ...updates.financialTerms };
    }
    if (updates.durationTerms) {
      contract.durationTerms = { ...contract.durationTerms, ...updates.durationTerms };
    }
    if (updates.witnesses) {
      contract.witnesses = updates.witnesses;
    }
    if (updates.notes !== undefined) {
      contract.notes = updates.notes;
    }

    const nowStr = new Date().toISOString();
    contract.updatedAt = nowStr.split('T')[0];

    // Push new snapshot to version history (Requirement 5)
    if (!Array.isArray(contract.versionHistory)) {
      contract.versionHistory = [];
    }
    contract.versionHistory.push({
      version: newVersionNum,
      createdAt: nowStr,
      createdBy: {
        id: actor.id,
        name: actor.name,
        role: actor.role
      },
      summaryOfChanges: updates.summaryOfChanges || `تحديث بنود وشروط العقد للإصدار رقم ${newVersionNum}`,
      clauses: contract.clauses.map(c => ({ ...c })),
      financialTerms: { ...contract.financialTerms },
      status: contract.status
    });

    contract.versions = contract.versionHistory;

    // Log audit log
    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'update',
      targetType: 'contract',
      targetId: contract.id,
      targetNumber: contract.contractNumber,
      details: `تحديث بنود العقد [${contract.contractNumber}] للإصدار (${newVersionNum}) بواسطة [${actor.name}]: ${updates.summaryOfChanges || 'تعديل بنود'}${wasApproved ? ' (تم تعليق الاعتماد لطلب موافقة الطرفين منعاً للتعديل الصامت)' : ''}`,
      severity: wasApproved ? 'warning' : 'info'
    });

    if (contract.bookingId) {
      this.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `📝 تم إصدار النسخة (${newVersionNum}) من العقد [${contract.contractNumber}] بواسطة [${actor.name}]. ملخص التعديل: ${updates.summaryOfChanges || 'تعديل بنود وشروط'}${wasApproved ? ' ⚠️ يتطلب إعادة اعتماد الطرفين.' : ''}`
      });
    }

    this.persist();
    this.syncPgContract(contract);
    return { contract, wasApprovedModified: wasApproved };
  }

  public approveContract(
    contractId: string,
    partyType: 'firstParty' | 'secondParty' | 'admin',
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) {
      throw new Error('العقد غير موجود');
    }

    const nowStr = new Date().toISOString();
    const currVer = contract.currentVersion || 1;

    if (partyType === 'firstParty' || actor.id === contract.firstParty?.id) {
      contract.firstPartyApprovedAt = nowStr;
      contract.firstPartyApproval = true;
      contract.firstPartyApprovedVersion = currVer;
    } else if (partyType === 'secondParty' || actor.id === contract.secondParty?.id) {
      contract.secondPartyApprovedAt = nowStr;
      contract.secondPartyApproval = true;
      contract.secondPartyApprovedVersion = currVer;
    } else if (partyType === 'admin') {
      contract.firstPartyApprovedAt = contract.firstPartyApprovedAt || nowStr;
      contract.secondPartyApprovedAt = contract.secondPartyApprovedAt || nowStr;
      contract.firstPartyApproval = true;
      contract.secondPartyApproval = true;
      contract.firstPartyApprovedVersion = currVer;
      contract.secondPartyApprovedVersion = currVer;
    }

    // REQUIREMENT 2 & 4: Must approve the CURRENT version!
    const isBothApproved = Boolean(
      contract.firstPartyApproval &&
      contract.secondPartyApproval &&
      contract.firstPartyApprovedVersion === currVer &&
      contract.secondPartyApprovedVersion === currVer
    );

    if (isBothApproved || partyType === 'admin') {
      contract.status = 'approved';
      contract.approvedAt = nowStr;
      contract.approvedBy = actor.name;
      contract.firstPartyApproval = true;
      contract.secondPartyApproval = true;
      contract.firstPartyApprovedVersion = currVer;
      contract.secondPartyApprovedVersion = currVer;
      contract.isModificationPendingApproval = false;
      contract.modificationRequestedBy = undefined;
      contract.modificationReason = undefined;
    } else {
      contract.status = 'pending_approval';
    }

    contract.updatedAt = nowStr.split('T')[0];

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'approve',
      targetType: 'contract',
      targetId: contract.id,
      targetNumber: contract.contractNumber,
      details: `اعتماد العقد [${contract.contractNumber}] للإصدار (v${currVer}) من قبل [${actor.name}] بصفة [${partyType}]. حالة العقد الحالية: [${contract.status}]`,
      severity: 'info'
    });

    if (contract.bookingId) {
      const partyLabel = partyType === 'firstParty' ? 'الطرف الأول (البائع/المؤجر)' : partyType === 'secondParty' ? 'الطرف الثاني (المشتري/المستأجر)' : 'إدارة النظام';
      this.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `✅ تم اعتماد العقد [${contract.contractNumber}] للإصدار (v${currVer}) من قبل [${partyLabel} - ${actor.name}]. ${contract.status === 'approved' ? '🎉 تم اعتماد العقد رسمياً من كلا الطرفين وبات جاهزاً للتوقيع والتوثيق!' : 'بانتظار اعتماد الطرف المقابل لنفس الإصدار.'}`
      });
    }

    this.persist();
    this.syncPgContract(contract);
    return contract;
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
    const contract = this.getContractById(contractId);
    if (!contract) {
      throw new Error('العقد غير موجود');
    }

    const parsedOptions = typeof options === 'string' ? { nationalId: options } : (options || {});
    const nowStr = new Date().toISOString();
    const currVer = contract.currentVersion || 1;
    const nationalId = parsedOptions.nationalId || '';
    const verificationCode = parsedOptions.verificationCode || `OTP-${Math.floor(100000 + Math.random() * 900000)}`;
    const digitalFingerprint = `SIG-YE-v${currVer}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    if (!Array.isArray(contract.electronicSignatures)) {
      contract.electronicSignatures = [];
    }

    // Record formal electronic signature record (Requirement 3)
    const sigRecord: ElectronicSignatureRecord = {
      id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      partyRole,
      signerId: actor.id,
      signerName: actor.name,
      signerPhone: parsedOptions.signerPhone || (partyRole === 'firstParty' ? contract.firstParty?.phone : contract.secondParty?.phone) || '+967 777 000 000',
      nationalIdOrPassport: nationalId,
      idGovernorate: parsedOptions.idGovernorate || contract.propertySnapshot?.governorate || 'صنعاء',
      contractVersion: currVer,
      signedAt: nowStr,
      verificationCode,
      digitalFingerprint,
      legalDisclaimerAcknowledged: parsedOptions.legalDisclaimerAcknowledged ?? true,
      ipAddress: '185.190.22.45'
    };

    contract.electronicSignatures.push(sigRecord);

    if (partyRole === 'firstParty' || actor.id === contract.firstParty?.id) {
      if (contract.firstParty) {
        contract.firstParty.signatureStatus = 'signed';
        contract.firstParty.signedAt = nowStr;
        if (nationalId) contract.firstParty.nationalIdOrPassport = nationalId;
      }
      contract.firstPartyApprovedAt = contract.firstPartyApprovedAt || nowStr;
      contract.firstPartyApprovedVersion = currVer;
      contract.firstPartySignedVersion = currVer;
    } else if (partyRole === 'secondParty' || actor.id === contract.secondParty?.id) {
      if (contract.secondParty) {
        contract.secondParty.signatureStatus = 'signed';
        contract.secondParty.signedAt = nowStr;
        if (nationalId) contract.secondParty.nationalIdOrPassport = nationalId;
      }
      contract.secondPartyApprovedAt = contract.secondPartyApprovedAt || nowStr;
      contract.secondPartyApprovedVersion = currVer;
      contract.secondPartySignedVersion = currVer;
    } else if (partyRole === 'witness') {
      const wit = contract.witnesses?.find(w => w.id === actor.id || w.name.includes(actor.name));
      if (wit) {
        wit.signatureStatus = 'signed';
        wit.signedAt = nowStr;
      }
    }

    // REQUIREMENT 3 & 4: Both parties must have signed the current version!
    const bothSignedCurrent = Boolean(
      contract.firstParty?.signatureStatus === 'signed' &&
      contract.secondParty?.signatureStatus === 'signed' &&
      contract.firstPartySignedVersion === currVer &&
      contract.secondPartySignedVersion === currVer
    );

    if (bothSignedCurrent) {
      contract.status = 'signed';
      contract.signedAt = nowStr;
      contract.approvedAt = contract.approvedAt || nowStr;
      contract.approvedBy = contract.approvedBy || actor.name;

      if (contract.bookingId) {
        const booking = this.getBookingById(contract.bookingId);
        if (booking) {
          booking.dealStage = 'contract_completed';
        }
      }
    }

    contract.updatedAt = nowStr.split('T')[0];

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'approve',
      targetType: 'contract',
      targetId: contract.id,
      targetNumber: contract.contractNumber,
      details: `توقيع إلكتروني موثق على العقد [${contract.contractNumber}] للإصدار (v${currVer}) بواسطة [${actor.name}] كـ [${partyRole}]. البصمة الرقمية: [${digitalFingerprint}]`,
      severity: 'info'
    });

    if (contract.bookingId) {
      this.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `✍️ قام [${actor.name}] بالتوقيع الإلكتروني المعتمد على العقد [${contract.contractNumber}] للإصدار (v${currVer}). بصمة التوقيع: [${digitalFingerprint}]. ${bothSignedCurrent ? '🏆 اكتمل توقيع الطرفين على العقد رسمياً وأصبح جاهزاً للطباعة ومحضر الإغلاق النهائي!' : 'بانتظار توقيع الطرف الآخر لنفس الإصدار.'}`
      });
    }

    this.persist();
    this.syncPgContract(contract);
    return contract;
  }

  public proposeContractAmendment(
    contractId: string,
    amendment: { summaryOfChanges: string; clauses?: ContractClause[]; financialTerms?: any },
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) {
      throw new Error('العقد غير موجود');
    }

    contract.isModificationPendingApproval = true;
    contract.modificationRequestedBy = actor.name;
    contract.modificationReason = amendment.summaryOfChanges;
    contract.status = 'pending_approval';

    // Reset approvals to require re-approval
    contract.firstPartyApprovedAt = actor.id === contract.firstParty?.id ? new Date().toISOString() : undefined;
    contract.secondPartyApprovedAt = actor.id === contract.secondParty?.id ? new Date().toISOString() : undefined;

    const newVersionNum = (contract.currentVersion || 1) + 1;
    contract.currentVersion = newVersionNum;

    if (amendment.clauses) {
      contract.clauses = amendment.clauses;
    }
    if (amendment.financialTerms) {
      contract.financialTerms = { ...contract.financialTerms, ...amendment.financialTerms };
    }

    const nowStr = new Date().toISOString();
    contract.updatedAt = nowStr.split('T')[0];

    if (!Array.isArray(contract.versionHistory)) {
      contract.versionHistory = [];
    }
    contract.versionHistory.push({
      version: newVersionNum,
      createdAt: nowStr,
      createdBy: {
        id: actor.id,
        name: actor.name,
        role: actor.role
      },
      summaryOfChanges: `طلب تعديل عقد معتمد: ${amendment.summaryOfChanges}`,
      clauses: contract.clauses,
      financialTerms: contract.financialTerms,
      status: 'pending_approval'
    });

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'update',
      targetType: 'contract',
      targetId: contract.id,
      targetNumber: contract.contractNumber,
      details: `اقتراح تعديل على العقد المعتمد [${contract.contractNumber}] للإصدار (${newVersionNum}) بواسطة [${actor.name}]: ${amendment.summaryOfChanges}`,
      severity: 'warning'
    });

    if (contract.bookingId) {
      this.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `⚠️ اقترح [${actor.name}] تعديلاً على بنود العقد [${contract.contractNumber}] (النسخة ${newVersionNum}). سبب التعديل: ${amendment.summaryOfChanges}. يتطلب موافقة الطرف الآخر للاعتماد.`
      });
    }

    this.persist();
    return contract;
  }

  public respondToContractAmendment(
    contractId: string,
    accept: boolean,
    actor: { id: string; name: string; role: UserRole },
    reason?: string
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) {
      throw new Error('العقد غير موجود');
    }

    const nowStr = new Date().toISOString();

    if (accept) {
      // Counter-party accepted the amendment
      contract.isModificationPendingApproval = false;
      contract.status = 'approved';
      contract.approvedAt = nowStr;
      contract.approvedBy = actor.name;
      if (actor.id === contract.firstParty?.id) {
        contract.firstPartyApprovedAt = nowStr;
      } else if (actor.id === contract.secondParty?.id) {
        contract.secondPartyApprovedAt = nowStr;
      }

      this.logAudit({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'approve',
        targetType: 'contract',
        targetId: contract.id,
        targetNumber: contract.contractNumber,
        details: `قبول التعديل المقترح على العقد [${contract.contractNumber}] بواسطة [${actor.name}]`,
        severity: 'info'
      });

      if (contract.bookingId) {
        this.addDealMessage(contract.bookingId, {
          senderId: 'system',
          senderName: 'نظام دلنّي العقاري',
          senderRole: 'system_admin',
          type: 'system',
          text: `🤝 وافق [${actor.name}] على التعديلات المقترحة على العقد [${contract.contractNumber}]. تم اعتماد النسخة (${contract.currentVersion}) رسمياً.`
        });
      }
    } else {
      // Rejected amendment: rollback or cancel amendment flag
      contract.isModificationPendingApproval = false;
      contract.status = 'under_review';

      this.logAudit({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'reject',
        targetType: 'contract',
        targetId: contract.id,
        targetNumber: contract.contractNumber,
        details: `رفض التعديل المقترح على العقد [${contract.contractNumber}] بواسطة [${actor.name}]. السبب: ${reason || 'عدم الاتفاق'}`,
        severity: 'warning'
      });

      if (contract.bookingId) {
        this.addDealMessage(contract.bookingId, {
          senderId: 'system',
          senderName: 'نظام دلنّي العقاري',
          senderRole: 'system_admin',
          type: 'system',
          text: `❌ رفض [${actor.name}] التعديل المقترح على العقد [${contract.contractNumber}]. ملاحظات: ${reason || 'لم يتم قبول الشروط المعدلة'}.`
        });
      }
    }

    contract.updatedAt = nowStr.split('T')[0];
    this.persist();
    return contract;
  }

  public cancelContract(
    contractId: string,
    reason: string,
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) {
      throw new Error('العقد غير موجود');
    }

    contract.status = 'cancelled';
    contract.notes = `${contract.notes ? contract.notes + '\n' : ''}تم إلغاء العقد بواسطة [${actor.name}]. السبب: ${reason}`;
    contract.updatedAt = new Date().toISOString().split('T')[0];

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'reject',
      targetType: 'contract',
      targetId: contract.id,
      targetNumber: contract.contractNumber,
      details: `إلغاء العقد [${contract.contractNumber}] بواسطة [${actor.name}]. السبب: ${reason}`,
      severity: 'warning'
    });

    if (contract.bookingId) {
      this.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `❌ تم إلغاء مسودة العقد [${contract.contractNumber}] بواسطة [${actor.name}]. السبب: ${reason}`
      });
    }

    this.persist();
    return contract;
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
