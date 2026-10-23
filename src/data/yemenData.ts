import {
  GovernorateData,
  Listing,
  Organization,
  User,
  UserRole,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  StaffMember,
  PermissionDefinition,
  ActiveSession,
  SuspiciousLogin,
  FeatureFlag,
  SystemSettings,
  IntegrationService,
  SystemErrorLog,
  BackupSnapshot,
  AdminEscalation
} from '../types';

export const YEMEN_GOVERNORATES: GovernorateData[] = [
  {
    name: 'صنعاء (أمانة العاصمة)',
    lat: 15.3694,
    lng: 44.1910,
    zoom: 12,
    cities: [
      {
        name: 'صنعاء',
        districts: ['حدة', 'السبعين', 'بيت بوس', 'الأصبحي', 'الصافية', 'عصر', 'شملان', 'الروضة', 'حي الجامعة', 'مذبح']
      }
    ]
  },
  {
    name: 'عدن',
    lat: 12.7855,
    lng: 45.0187,
    zoom: 12,
    cities: [
      {
        name: 'عدن',
        districts: ['خورمكسر', 'كريتر (صيرة)', 'المعلا', 'التواهي', 'المنصورة', 'الشيخ عثمان', 'مدينة الشعب', 'مدينة إنماء', 'دار سعد']
      }
    ]
  },
  {
    name: 'تعز',
    lat: 13.5795,
    lng: 44.0209,
    zoom: 12,
    cities: [
      {
        name: 'تعز',
        districts: ['المظفر', 'القاهرة', 'صالة', 'بئر باشا', 'صبر الموادم', 'الحوبان', 'الروضة', 'عصيفرة']
      }
    ]
  },
  {
    name: 'حضرموت',
    lat: 14.5425,
    lng: 49.1242,
    zoom: 11,
    cities: [
      {
        name: 'المكلا',
        districts: ['فوه', 'ديس المكلا', 'روكب', 'المكلا القديمة', 'خلف', 'جول مسحة']
      },
      {
        name: 'سيئون',
        districts: ['وسط المدينة', 'مريمة', 'الغرفة', 'تريم']
      }
    ]
  },
  {
    name: 'إب',
    lat: 13.9667,
    lng: 44.1833,
    zoom: 12,
    cities: [
      {
        name: 'إب',
        districts: ['الظهار', 'المشنة', 'جبلة', 'المعاين', 'الدائري الغربي', 'السبل']
      }
    ]
  },
  {
    name: 'الحديدة',
    lat: 14.7978,
    lng: 42.9545,
    zoom: 12,
    cities: [
      {
        name: 'الحديدة',
        districts: ['الميناء', 'الحوك', 'الحالي', 'شارع صنعاء', 'حي 7 يوليو']
      }
    ]
  },
  {
    name: 'مأرب',
    lat: 15.4608,
    lng: 45.3253,
    zoom: 12,
    cities: [
      {
        name: 'مأرب',
        districts: ['مدينة مأرب', 'مأرب الوادي', 'حي الروضة', 'شارع الجامعة', 'المجمع']
      }
    ]
  },
  {
    name: 'ذمار',
    lat: 14.5428,
    lng: 44.4051,
    zoom: 12,
    cities: [
      {
        name: 'ذمار',
        districts: ['وسط المدينة', 'الجامعة', 'الشرقية', 'الغربية']
      }
    ]
  }
];

export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-1',
    name: 'شركة الصرح العقارية الحديثة',
    commercialRegNo: 'CR-YE-40912',
    phone: '777123456',
    governorate: 'صنعاء (أمانة العاصمة)',
    city: 'صنعاء',
    address: 'شارع حدة - أمام بريد حدة',
    isVerified: true,
    verifiedAt: '2026-01-15',
    managerId: 'user-org-manager',
    managerName: 'م. نبيل الشامي',
    logoUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80',
    createdAt: '2025-06-10',
    members: [
      {
        id: 'mem-1',
        userId: 'user-org-manager',
        name: 'م. نبيل الشامي',
        phone: '777123456',
        roleInOrg: 'manager',
        isActive: true,
        assignedListingCount: 4,
        joinedAt: '2025-06-10'
      },
      {
        id: 'mem-2',
        userId: 'user-org-agent',
        name: 'طارق الأصبحي',
        phone: '771998877',
        roleInOrg: 'agent',
        isActive: true,
        assignedListingCount: 3,
        joinedAt: '2025-09-01'
      }
    ]
  },
  {
    id: 'org-2',
    name: 'مؤسسة عدن للوساطة والخدمات العقارية',
    commercialRegNo: 'CR-YE-20883',
    phone: '733445566',
    governorate: 'عدن',
    city: 'عدن',
    address: 'خورمكسر - حي السفارات',
    isVerified: true,
    verifiedAt: '2026-02-20',
    managerId: 'user-org-manager-2',
    managerName: 'فهد باعباد',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    createdAt: '2025-08-14',
    members: [
      {
        id: 'mem-3',
        userId: 'user-org-manager-2',
        name: 'فهد باعباد',
        phone: '733445566',
        roleInOrg: 'manager',
        isActive: true,
        assignedListingCount: 5,
        joinedAt: '2025-08-14'
      }
    ]
  }
];

export const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'list-101',
    listingNumber: 'YEM-2026-101',
    title: 'فيلا سوبر ديلوكس حديثة البناء في حدة',
    description: 'فيلا فاخرة بتشطيب ملكي حديث في أرقى أحياء حدة، تتكون من دورين وبدروم، وحوش واسع يتسع لثلاث سيارات، مع منظومة طاقة شمسية كاملة 10 كيلو وات وخزان ماء أرضي بسعة 30 متر مكعب. قريبة من جميع الخدمات والمدارس والمراكز الحيوية.',
    propertyType: 'villa',
    purpose: 'sale',
    status: 'published',
    price: 320000,
    currency: 'USD',
    isNegotiable: true,
    area: 9,
    areaUnit: 'لبنة عشاري',
    location: {
      governorate: 'صنعاء (أمانة العاصمة)',
      city: 'صنعاء',
      district: 'حدة',
      street: 'شارع 14 المتفرع من شارع الخمسين',
      lat: 15.3120,
      lng: 44.1870,
      isApproximate: false
    },
    attributes: {
      rooms: 7,
      bathrooms: 6,
      livingRooms: 3,
      totalFloors: 3,
      parkingSpaces: 3,
      buildingAgeYears: 1,
      streetWidthMeters: 16,
      streetDirection: 'شمالي',
      hasWaterNetwork: true,
      hasElectricity: true,
      hasSolarSystem: true,
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-1',
      name: 'هشام عبد الرحمن القدسي',
      type: 'individual',
      phone: '777012345',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      reputationYears: 8,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
    },
    verificationBadges: [
      {
        type: 'phone_verified',
        label: 'هاتف المعلن مؤكد',
        description: 'تم التحقق من رقم هاتف المعلن عبر رمز التحقق المباشر.',
        verifiedAt: '2026-02-10',
        verifiedBy: 'نظام دلنّي الآلي',
        validityNote: 'سارٍ ونشط',
        disclaimer: 'تأكيد الهاتف هو تحقق من وسيلة الاتصال فقط ولا يعني فحص ملكية العقار.'
      },
      {
        type: 'advertiser_reviewed',
        label: 'هوية المعلن مراجعة',
        description: 'قام فريق التحقق بمراجعة الوثيقة الثبوتية الشخصية للمعلن والتأكد من مطابقة الاسم.',
        verifiedAt: '2026-02-12',
        verifiedBy: 'مسؤول التحقق - دلنّي',
        validityNote: 'معتمد لعام 2026',
        disclaimer: 'مراجعة الهوية تثبت شخصية المعلن دون ضمان صحة كل بند تفصيلي في الإعلان.'
      }
    ],
    statusTimeline: [
      {
        status: 'draft',
        timestamp: '2026-02-08 10:15',
        changedBy: 'هشام القدسي',
        userRole: 'advertiser',
        notes: 'إنشاء المسودة الأولية'
      },
      {
        status: 'under_review',
        timestamp: '2026-02-09 14:20',
        changedBy: 'هشام القدسي',
        userRole: 'advertiser',
        notes: 'إرسال الإعلان للمراجعة'
      },
      {
        status: 'published',
        timestamp: '2026-02-12 11:00',
        changedBy: 'مراجع المحتوى',
        userRole: 'moderator',
        notes: 'تمت مراجعة الوصف والصور والموقع واعتماد النشر'
      }
    ],
    viewsCount: 1420,
    favoritesCount: 48,
    createdAt: '2026-02-09',
    updatedAt: '2026-02-12'
  },
  {
    id: 'list-102',
    listingNumber: 'YEM-2026-102',
    title: 'شقة مفروشة راقية للإيجار مطلة على كورنيش خورمكسر',
    description: 'شقة واسعة ومؤثثة بأثاث عصري مريح في حي خورمكسر الراقي بعدن، تتكون من ثلاث غرف نوم ومجلس واسع ومطبخ مجهز بالكامل، مكيفة بالكامل مع خط كهرباء تجاري وخزان مياه مستقل. قريبة من جامعة عدن والساحل ومطار عدن الدولي.',
    propertyType: 'apartment',
    purpose: 'rent',
    status: 'published',
    price: 450,
    currency: 'USD',
    isNegotiable: false,
    area: 165,
    areaUnit: 'م²',
    location: {
      governorate: 'عدن',
      city: 'عدن',
      district: 'خورمكسر',
      street: 'شارع ساحل أبين',
      lat: 12.8180,
      lng: 45.0440,
      isApproximate: false
    },
    attributes: {
      rooms: 3,
      bathrooms: 2,
      livingRooms: 1,
      floorNumber: 3,
      totalFloors: 5,
      parkingSpaces: 1,
      hasElevator: true,
      hasWaterNetwork: true,
      hasElectricity: true,
      isFurnished: true,
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-2',
      name: 'شركة الصرح العقارية الحديثة',
      type: 'organization',
      phone: '777123456',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      orgId: 'org-1',
      orgName: 'شركة الصرح العقارية الحديثة',
      licenseNumber: 'CR-YE-40912',
      avatarUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=150&q=80'
    },
    assignedAgentId: 'user-org-agent',
    assignedAgentName: 'طارق الأصبحي',
    verificationBadges: [
      {
        type: 'org_reviewed',
        label: 'ملف المنشأة مراجع',
        description: 'تمت مراجعة السجل التجاري والبيانات الرسمية للمنشأة العقارية من قبل إدارة المنصة.',
        verifiedAt: '2026-01-15',
        verifiedBy: 'مسؤول المنشآت - دلنّي',
        validityNote: 'سجل نشط لعام 2026',
        disclaimer: 'مراجعة بيانات المنشأة لا تعني بالضرورة ملكية المنشأة للعقار، بل تثبت صفتها التجارية.'
      },
      {
        type: 'phone_verified',
        label: 'رقم المنشأة مؤكد',
        description: 'تم التحقق من خط الاتصال الرسمي للمكتب.',
        verifiedAt: '2026-01-15',
        verifiedBy: 'نظام دلنّي الآلي',
        validityNote: 'سارٍ',
        disclaimer: 'التحقق يؤكد الاتصال بالمنشأة فقط.'
      }
    ],
    statusTimeline: [
      {
        status: 'published',
        timestamp: '2026-02-14 09:30',
        changedBy: 'مسؤول المراجعة',
        userRole: 'moderator',
        notes: 'إعلان مستوفٍ لشروط العرض العام'
      }
    ],
    viewsCount: 980,
    favoritesCount: 31,
    createdAt: '2026-02-13',
    updatedAt: '2026-02-14'
  },
  {
    id: 'list-103',
    listingNumber: 'YEM-2026-103',
    title: 'أرض سكنية تجارية ممتازة على شارعين في بيت بوس',
    description: 'أرض معتبرة على شارعين 14 و12 متر، موقع هادئ ومطل، قريبة من شارع الثلاثين في بيت بوس، المساحة الإجمالية 8 لبن عشاري حر مسجلة وموثقة بصيرة شرعية واضحة المعالم، صالحة لبناء برج سكني أو فيلا خاصة استثمارية.',
    propertyType: 'land',
    purpose: 'sale',
    status: 'published',
    price: 360000000,
    currency: 'YER',
    isNegotiable: true,
    area: 8,
    areaUnit: 'لبنة عشاري',
    location: {
      governorate: 'صنعاء (أمانة العاصمة)',
      city: 'صنعاء',
      district: 'بيت بوس',
      street: 'شارع بيت بوس خلف محطة التوفيق',
      lat: 15.2890,
      lng: 44.2050,
      isApproximate: false
    },
    attributes: {
      streetWidthMeters: 14,
      streetDirection: 'رأسي على شارعين',
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-3',
      name: 'عبد الملك سنان الغولي',
      type: 'individual',
      phone: '773556677',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
    },
    verificationBadges: [
      {
        type: 'phone_verified',
        label: 'هاتف المعلن مؤكد',
        description: 'رقم الاتصال المباشر مؤكد برمز التحقق.',
        verifiedAt: '2026-02-18',
        verifiedBy: 'نظام دلنّي',
        validityNote: 'سارٍ',
        disclaimer: 'تأكيد الهاتف لا يعد وثيقة إثبات ملكية.'
      },
      {
        type: 'deed_reviewed',
        label: 'وثيقة البصيرة راجعها الفريق',
        description: 'تم إرفاق نسخة البصيرة الشرعية وفحص مطابقتها للمساحة والحدود الأربعة بواسطة فريق التحقق.',
        verifiedAt: '2026-02-20',
        verifiedBy: 'مسؤول التحقق القانوني - دلنّي',
        validityNote: 'تمت المراجعة في 2026/02/20',
        disclaimer: 'مراجعة الوثيقة لا تُغني المشتري عن إجراءات المعاينة الميدانية والتحري الشرعي المعتاد في المحكمة المختصة.'
      }
    ],
    statusTimeline: [
      {
        status: 'published',
        timestamp: '2026-02-20 16:00',
        changedBy: 'مراجع المحتوى',
        userRole: 'moderator',
        notes: 'اعتمد الإعلان بعد مراجعة وثيقة البصيرة والبيانات'
      }
    ],
    viewsCount: 2150,
    favoritesCount: 79,
    createdAt: '2026-02-18',
    updatedAt: '2026-02-20'
  },
  {
    id: 'list-104',
    listingNumber: 'YEM-2026-104',
    title: 'عمارة استثمارية 5 أدوار دخل ممتاز في المظفر - تعز',
    description: 'عمارة تجارية وسكنية حديثة تقع في موقع نشط في مديرية المظفر بمدينة تعز، مكونة من 5 أدوار تحتوي على 8 شقق و3 محلات تجارية مؤجرة بالكامل بدخل شهري ثابت، مجهزة بخزان أرضي ومصعد راكب ومنظومة كاميرات مراقبة متكاملة.',
    propertyType: 'building',
    purpose: 'investment',
    status: 'published',
    price: 480000,
    currency: 'USD',
    isNegotiable: true,
    area: 420,
    areaUnit: 'م²',
    location: {
      governorate: 'تعز',
      city: 'تعز',
      district: 'المظفر',
      street: 'شارع 26 سبتمبر المتفرع إلى وادي القاضي',
      lat: 13.5820,
      lng: 44.0150,
      isApproximate: true
    },
    attributes: {
      totalFloors: 5,
      buildingAgeYears: 3,
      hasElevator: true,
      hasWaterNetwork: true,
      hasElectricity: true,
      hasSolarSystem: true,
      streetWidthMeters: 14,
      zoningType: 'تجاري'
    },
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-2',
      name: 'شركة الصرح العقارية الحديثة',
      type: 'organization',
      phone: '777123456',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      orgId: 'org-1',
      orgName: 'شركة الصرح العقارية الحديثة',
      avatarUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=150&q=80'
    },
    verificationBadges: [
      {
        type: 'org_reviewed',
        label: 'ملف المنشأة مراجع',
        description: 'معلن معتمد بموجب سجل تجاري رسمي لمكتب عقاري.',
        verifiedAt: '2026-01-15',
        verifiedBy: 'إدارة التحقق - دلنّي',
        validityNote: 'سارٍ',
        disclaimer: 'المراجعة تخص السجل التجاري فقط.'
      }
    ],
    statusTimeline: [
      {
        status: 'published',
        timestamp: '2026-02-15 11:30',
        changedBy: 'مسؤول المراجعة',
        userRole: 'moderator'
      }
    ],
    viewsCount: 1640,
    favoritesCount: 52,
    createdAt: '2026-02-14',
    updatedAt: '2026-02-15'
  },
  {
    id: 'list-105',
    listingNumber: 'YEM-2026-105',
    title: 'شقة واسعة للبيع في فوه - المكلا حضرموت',
    description: 'شقة بتشطيب ممتاز وإطلالة بحرية رائعة في مساكن فوه بمدينة المكلا، الدور الثاني، تتكون من 4 غرف وصالة وحمامين ومطبخ وبلكونة واسعة، عداد كهرباء وماء مستقل، والمنطقة هادئة ومأهولة وقريبة من المستشفى والمدارس.',
    propertyType: 'apartment',
    purpose: 'sale',
    status: 'published',
    price: 450000,
    currency: 'SAR',
    isNegotiable: true,
    area: 180,
    areaUnit: 'م²',
    location: {
      governorate: 'حضرموت',
      city: 'المكلا',
      district: 'فوه',
      street: 'حي فوه - مخطط الإنشاءات',
      lat: 14.5290,
      lng: 49.0820,
      isApproximate: false
    },
    attributes: {
      rooms: 4,
      bathrooms: 2,
      livingRooms: 1,
      floorNumber: 2,
      totalFloors: 4,
      hasWaterNetwork: true,
      hasElectricity: true,
      parkingSpaces: 1,
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502005229762-ee1b2da97ba5?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-4',
      name: 'صالح سالم باوزير',
      type: 'individual',
      phone: '772334411',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
    },
    verificationBadges: [
      {
        type: 'phone_verified',
        label: 'هاتف المعلن مؤكد',
        description: 'رقم التواصل مؤكد برمز التحقق الفوري.',
        verifiedAt: '2026-02-22',
        verifiedBy: 'نظام دلنّي',
        validityNote: 'سارٍ',
        disclaimer: 'تأكيد الهاتف لا يعد تحرياً عن العقار.'
      }
    ],
    statusTimeline: [
      {
        status: 'published',
        timestamp: '2026-02-23 14:00',
        changedBy: 'مسؤول المراجعة',
        userRole: 'moderator'
      }
    ],
    viewsCount: 890,
    favoritesCount: 22,
    createdAt: '2026-02-22',
    updatedAt: '2026-02-23'
  },
  {
    id: 'list-106',
    listingNumber: 'YEM-2026-106',
    title: 'محل تجاري فتحتين بموقع استراتيجي في الظهار - إب',
    description: 'محل تجاري بمساحة واسعة يتكون من فتحتين على الشارع العام في منطقة الظهار الحيوية بمدينة إب، مناسب لمعرض ملابس، صيدلية، أو مركز تجاري، مجهز بسقائف ديكور حديث، وإنارة متكاملة وواجهة زجاج سيكوريت.',
    propertyType: 'commercial',
    purpose: 'rent',
    status: 'published',
    price: 1800000,
    currency: 'YER',
    isNegotiable: true,
    area: 95,
    areaUnit: 'م²',
    location: {
      governorate: 'إب',
      city: 'إب',
      district: 'الظهار',
      street: 'الشارع العام أمام بنك الكريمي',
      lat: 13.9740,
      lng: 44.1780,
      isApproximate: false
    },
    attributes: {
      hasElectricity: true,
      hasWaterNetwork: true,
      streetWidthMeters: 20,
      zoningType: 'تجاري'
    },
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-5',
      name: 'معين عبد الله السقاف',
      type: 'individual',
      phone: '775667788',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80'
    },
    verificationBadges: [
      {
        type: 'phone_verified',
        label: 'هاتف المعلن مؤكد',
        description: 'رقم الهاتف مثبت ومؤكد لدى المنصة.',
        verifiedAt: '2026-02-25',
        verifiedBy: 'نظام دلنّي',
        validityNote: 'سارٍ',
        disclaimer: 'تأكيد الهاتف هو إثبات تواصل فقط.'
      }
    ],
    statusTimeline: [
      {
        status: 'published',
        timestamp: '2026-02-26 10:00',
        changedBy: 'مسؤول المراجعة',
        userRole: 'moderator'
      }
    ],
    viewsCount: 640,
    favoritesCount: 19,
    createdAt: '2026-02-25',
    updatedAt: '2026-02-26'
  },
  {
    id: 'list-107',
    listingNumber: 'YEM-2026-107',
    title: 'أرض سكنية 6 لبن معتمدة في حي المجمع - مأرب',
    description: 'أرض سكنية ممتازة في المجمع بمدينة مأرب، شوارع مخططة وواسعة، منسوبة ومحددة بدقة، قريبة من الطريق العام والمدارس، وثائق شراء مؤكدة وسليمة.',
    propertyType: 'land',
    purpose: 'sale',
    status: 'published',
    price: 180000,
    currency: 'SAR',
    isNegotiable: true,
    area: 6,
    areaUnit: 'لبنة عشاري',
    location: {
      governorate: 'مأرب',
      city: 'مأرب',
      district: 'المجمع',
      street: 'شارع 16 المتفرع من شارع الأربعين',
      lat: 15.4650,
      lng: 45.3350,
      isApproximate: false
    },
    attributes: {
      streetWidthMeters: 16,
      streetDirection: 'شرقي',
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
    ],
    advertiser: {
      id: 'adv-6',
      name: 'عمار ناصر المرادي',
      type: 'individual',
      phone: '711223344',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true
    },
    verificationBadges: [
      {
        type: 'phone_verified',
        label: 'هاتف المعلن مؤكد',
        description: 'رقم الهاتف مؤكد بنجاح.',
        verifiedAt: '2026-02-24',
        verifiedBy: 'نظام دلنّي',
        validityNote: 'سارٍ',
        disclaimer: 'تأكيد الهاتف لا يعد فحصاً لوثائق الملكية.'
      }
    ],
    statusTimeline: [
      {
        status: 'published',
        timestamp: '2026-02-25 15:30',
        changedBy: 'مسؤول المراجعة',
        userRole: 'moderator'
      }
    ],
    viewsCount: 1100,
    favoritesCount: 38,
    createdAt: '2026-02-24',
    updatedAt: '2026-02-25'
  },
  // إعلانات لا تظهر للعامة (مسودات، قيد المراجعة، مطلوب تعديلها، مرفوضة) للاختبار والتدقيق
  {
    id: 'list-108',
    listingNumber: 'YEM-2026-108',
    title: 'فيلا تحت التشطيب في حي الأصبحي (مسودة خاصة)',
    description: 'فيلا قيد التشطيب في حي الأصبحي، مسودة عمل قيد استكمال مواصفات الكهرباء والمياه وصور الواجهة.',
    propertyType: 'villa',
    purpose: 'sale',
    status: 'draft',
    price: 210000,
    currency: 'USD',
    isNegotiable: true,
    area: 7,
    areaUnit: 'لبنة عشاري',
    location: {
      governorate: 'صنعاء (أمانة العاصمة)',
      city: 'صنعاء',
      district: 'الأصبحي',
      lat: 15.3020,
      lng: 44.2180,
      isApproximate: true
    },
    attributes: {
      rooms: 6,
      bathrooms: 5,
      totalFloors: 2,
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-1',
      name: 'هشام عبد الرحمن القدسي',
      type: 'individual',
      phone: '777012345',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true
    },
    verificationBadges: [],
    statusTimeline: [
      {
        status: 'draft',
        timestamp: '2026-03-01 09:00',
        changedBy: 'هشام القدسي',
        userRole: 'advertiser',
        notes: 'مسودة لم تكتمل بعد'
      }
    ],
    viewsCount: 0,
    favoritesCount: 0,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  },
  {
    id: 'list-109',
    listingNumber: 'YEM-2026-109',
    title: 'مكتب تجاري في شارع الزبيري (قيد المراجعة)',
    description: 'مكتب إداري مجهز في برج تجاري بشارع الزبيري، الدور الثالث، مصعد وإنارة وتكييف مركزي، بانتظار اعتماد مسؤول المراجعة.',
    propertyType: 'office',
    purpose: 'rent',
    status: 'under_review',
    price: 350,
    currency: 'USD',
    isNegotiable: true,
    area: 110,
    areaUnit: 'م²',
    location: {
      governorate: 'صنعاء (أمانة العاصمة)',
      city: 'صنعاء',
      district: 'الصافية',
      street: 'شارع الزبيري تقاطع شارع بغداد',
      lat: 15.3480,
      lng: 44.2020,
      isApproximate: false
    },
    attributes: {
      rooms: 3,
      bathrooms: 1,
      floorNumber: 3,
      hasElevator: true,
      hasElectricity: true,
      zoningType: 'تجاري'
    },
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-1',
      name: 'هشام عبد الرحمن القدسي',
      type: 'individual',
      phone: '777012345',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true
    },
    verificationBadges: [],
    statusTimeline: [
      {
        status: 'draft',
        timestamp: '2026-03-02 11:00',
        changedBy: 'هشام القدسي',
        userRole: 'advertiser'
      },
      {
        status: 'under_review',
        timestamp: '2026-03-02 11:30',
        changedBy: 'هشام القدسي',
        userRole: 'advertiser',
        notes: 'تم إرساله لمسؤول المراجعة'
      }
    ],
    viewsCount: 0,
    favoritesCount: 0,
    createdAt: '2026-03-02',
    updatedAt: '2026-03-02'
  },
  {
    id: 'list-110',
    listingNumber: 'YEM-2026-110',
    title: 'شقة في المنصورة بعدن (مطلوب تعديل السعر والبيانات)',
    description: 'شقة للبيع في المنصورة بعدن، تم طلب تعديل السعر لعدم اتساقه مع العملة المحددة وتوضيح رقم الدور بدقة.',
    propertyType: 'apartment',
    purpose: 'sale',
    status: 'needs_changes',
    price: 15000,
    currency: 'USD',
    isNegotiable: true,
    area: 120,
    areaUnit: 'م²',
    location: {
      governorate: 'عدن',
      city: 'عدن',
      district: 'المنصورة',
      lat: 12.8600,
      lng: 44.9850,
      isApproximate: true
    },
    attributes: {
      rooms: 3,
      bathrooms: 2,
      zoningType: 'سكني'
    },
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80'
    ],
    advertiser: {
      id: 'adv-2',
      name: 'شركة الصرح العقارية الحديثة',
      type: 'organization',
      phone: '777123456',
      phoneVerified: true,
      allowWhatsapp: true,
      allowCall: true,
      orgId: 'org-1'
    },
    verificationBadges: [],
    statusTimeline: [
      {
        status: 'under_review',
        timestamp: '2026-03-03 10:00',
        changedBy: 'طارق الأصبحي',
        userRole: 'org_agent'
      },
      {
        status: 'needs_changes',
        timestamp: '2026-03-03 14:00',
        changedBy: 'مسؤول المراجعة',
        userRole: 'moderator',
        reason: 'عدم وضوح السعر والعملة',
        notes: 'يرجى مراجعة وتصحيح السعر الإجمالي وتحديد رقم الدور والمساحة الفعلية بالشكل الصحيح.',
        missingFields: ['السعر الدقيق', 'رقم الدور']
      }
    ],
    viewsCount: 0,
    favoritesCount: 0,
    createdAt: '2026-03-03',
    updatedAt: '2026-03-03'
  }
];

export const INITIAL_VERIFICATION_REQUESTS: VerificationRequest[] = [
  {
    id: 'ver-1',
    requestType: 'individual_advertiser',
    targetId: 'adv-1',
    targetName: 'هشام عبد الرحمن القدسي',
    submittedBy: 'هشام عبد الرحمن القدسي',
    submittedByPhone: '777012345',
    status: 'approved',
    documents: [
      {
        id: 'doc-1',
        title: 'بطاقة شخصية ذكية',
        type: 'identity',
        url: '/private-vault/doc-id-01.pdf',
        uploadedAt: '2026-02-10',
        sizeMb: 1.8
      }
    ],
    moderatorNotes: 'تمت مطابقة صورة البطاقة الشخصية مع الاسم ورقم الهاتف وتأكيد الهوية.',
    reviewedBy: 'مسؤول التحقق - دلنّي',
    reviewedAt: '2026-02-12',
    createdAt: '2026-02-10'
  },
  {
    id: 'ver-2',
    requestType: 'organization',
    targetId: 'org-1',
    targetName: 'شركة الصرح العقارية الحديثة',
    submittedBy: 'م. نبيل الشامي',
    submittedByPhone: '777123456',
    status: 'approved',
    documents: [
      {
        id: 'doc-2',
        title: 'سجل تجاري يمني ساري المفعول',
        type: 'cr',
        url: '/private-vault/cr-sarh-40912.pdf',
        uploadedAt: '2026-01-14',
        sizeMb: 2.4
      }
    ],
    moderatorNotes: 'تم التحقق من بيانات السجل التجاري ورقم المنشأة.',
    reviewedBy: 'مسؤول المنشآت والتحقق',
    reviewedAt: '2026-01-15',
    createdAt: '2026-01-14'
  },
  {
    id: 'ver-3',
    requestType: 'property_deed',
    targetId: 'list-103',
    targetName: 'أرض بيت بوس - بصيرة شرعية',
    submittedBy: 'عبد الملك الغولي',
    submittedByPhone: '773556677',
    status: 'approved',
    documents: [
      {
        id: 'doc-3',
        title: 'نسخة البصيرة الشرعية للأرض',
        type: 'ownership',
        url: '/private-vault/deed-baitbous-87.pdf',
        uploadedAt: '2026-02-19',
        sizeMb: 4.1
      }
    ],
    moderatorNotes: 'فحص البصيرة الشرعية والتأكد من وضوح الحدود والمساحة المعلنة.',
    reviewedBy: 'المحقق القانوني العقاري',
    reviewedAt: '2026-02-20',
    createdAt: '2026-02-19'
  },
  {
    id: 'ver-4',
    requestType: 'individual_advertiser',
    targetId: 'adv-new',
    targetName: 'ماجد عبد السلام الوصابي',
    submittedBy: 'ماجد الوصابي',
    submittedByPhone: '774112233',
    status: 'under_review',
    documents: [
      {
        id: 'doc-4',
        title: 'جواز سفر يمني',
        type: 'identity',
        url: '/private-vault/passport-majed.pdf',
        uploadedAt: '2026-03-04',
        sizeMb: 2.1
      }
    ],
    moderatorNotes: 'قيد المراجعة والتدقيق مع السجل المدني.',
    createdAt: '2026-03-04'
  }
];

export const INITIAL_REPORTS: ReportCase[] = [
  {
    id: 'rep-1',
    caseNumber: 'REP-2026-0041',
    listingId: 'list-101',
    listingTitle: 'فيلا سوبر ديلوكس في حدة',
    listingSnapshotPrice: '$320,000',
    listingSnapshotAdvertiser: 'هشام عبد الرحمن القدسي',
    reporterName: 'سعيد محمد الخولاني',
    reporterPhone: '771445566',
    reporterConfidentialNotes: 'ملاحظة سرية: مقدم البلاغ يذكر أن الشارع أمام الفيلا 14 متر وليس 16 متر.',
    reason: 'false_information',
    details: 'أود الإبلاغ عن اختلاف بسيط في عرض الشارع المذكور في الإعلان عن الواقع الميداني، أرجو التدقيق.',
    priority: 'low',
    status: 'new',
    createdAt: '2026-03-02 16:40'
  },
  {
    id: 'rep-2',
    caseNumber: 'REP-2026-0038',
    listingId: 'list-104',
    listingTitle: 'عمارة استثمارية 5 أدوار في تعز',
    listingSnapshotPrice: '$480,000',
    listingSnapshotAdvertiser: 'شركة الصرح العقارية الحديثة',
    reporterName: 'فؤاد سالم الصبري',
    reporterPhone: '735112299',
    reporterConfidentialNotes: 'تم التواصل مع إدارة الشركة للتأكد من حالة العقار واستمرار صلاحية الإعلان.',
    reason: 'duplicate_listing',
    details: 'وجدت إعلاناً آخر مشابهاً لنفس العمارة بسعر مختلف من معلن آخر.',
    priority: 'medium',
    status: 'investigating',
    assignedOfficer: 'مسؤول البلاغات - أحمد',
    createdAt: '2026-02-28 11:20'
  }
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    ticketNumber: 'TKT-2026-801',
    userId: 'adv-1',
    userName: 'هشام القدسي',
    userPhone: '777012345',
    subject: 'استفسار عن إضافة فيديو أو جولة افتراضية للإعلان',
    category: 'inquiry',
    priority: 'medium',
    status: 'in_progress',
    messages: [
      {
        id: 'msg-1',
        senderId: 'adv-1',
        senderName: 'هشام القدسي',
        senderRole: 'user',
        text: 'السلام عليكم، هل يمكن تضمين رابط فيديو يوتيوب أو لقطات عالية الدقة للفيلا في حدة؟',
        timestamp: '2026-03-01 14:10'
      },
      {
        id: 'msg-2',
        senderId: 'support-1',
        senderName: 'فريق الدعم الفني',
        senderRole: 'support',
        text: 'وعليكم السلام ورحمة الله، أهلاً بك أستاذ هشام. نعم، يمكنك إرفاق رابط الفيديو في حقل الوصف التفصيلي أو التواصل معنا لربط معرض صور إضافي، وسنكون سعداء بمساعدتك.',
        timestamp: '2026-03-01 15:30'
      }
    ],
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  },
  {
    id: 'tkt-2',
    ticketNumber: 'TKT-2026-802',
    userId: 'user-seeker-1',
    userName: 'أصيل محمد الحكيمي',
    userPhone: '778990011',
    subject: 'طلب مساعدة في تصفية الأراضي باللبنة في صنعاء',
    category: 'technical',
    priority: 'low',
    status: 'open',
    messages: [
      {
        id: 'msg-3',
        senderId: 'user-seeker-1',
        senderName: 'أصيل الحكيمي',
        senderRole: 'user',
        text: 'مرحباً، أبحث عن أراضٍ بمساحة بين 4 إلى 8 لبن في بيت بوس أو حدة بالريال اليمني أو الدولار.',
        timestamp: '2026-03-04 09:15'
      }
    ],
    createdAt: '2026-03-04',
    updatedAt: '2026-03-04'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-02-12 11:00',
    userId: 'usr-mod-1',
    userName: 'مسؤول المراجعة',
    userRole: 'moderator',
    action: 'اعتماد ونشر إعلان',
    targetType: 'listing',
    targetId: 'list-101',
    result: 'success',
    details: 'تم فحص الصور والنصوص والموقع واعتماد نشر الإعلان YEM-2026-101'
  },
  {
    id: 'log-2',
    timestamp: '2026-02-15 11:30',
    userId: 'usr-mod-1',
    userName: 'مسؤول المراجعة',
    userRole: 'moderator',
    action: 'اعتماد ونشر إعلان منشأة',
    targetType: 'listing',
    targetId: 'list-104',
    result: 'success',
    details: 'اعتماد نشر عمارة المظفر بعد مراجعة ملف شركة الصرح العقارية'
  },
  {
    id: 'log-3',
    timestamp: '2026-02-20 16:00',
    userId: 'usr-ver-1',
    userName: 'مسؤول التحقق',
    userRole: 'verifier',
    action: 'منح شارة وثيقة مراجعة',
    targetType: 'verification',
    targetId: 'list-103',
    result: 'success',
    details: 'مراجعة وتوثيق بصيرة أرض بيت بوس وإصدار شارة التحقق'
  },
  {
    id: 'log-4',
    timestamp: '2026-03-03 14:00',
    userId: 'usr-mod-1',
    userName: 'مسؤول المراجعة',
    userRole: 'moderator',
    action: 'طلب استكمال بيانات إعلان',
    targetType: 'listing',
    targetId: 'list-110',
    result: 'warning',
    details: 'طلب تعديل السعر وتحديد رقم الدور لإعلان شقة المنصورة'
  }
];

export const MOCK_USERS: Record<string, User> = {
  visitor: {
    id: 'usr-visitor',
    name: 'زائر المنصة',
    phone: '',
    phoneVerified: false,
    role: 'visitor',
    activeStatus: true,
    createdAt: '2026-01-01'
  },
  seeker: {
    id: 'usr-seeker',
    name: 'أصيل محمد الحكيمي',
    phone: '778990011',
    phoneVerified: true,
    email: 'aseel@example.com',
    role: 'seeker',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-01-20'
  },
  advertiser: {
    id: 'adv-1',
    name: 'هشام عبد الرحمن القدسي',
    phone: '777012345',
    phoneVerified: true,
    email: 'hisham@example.com',
    role: 'advertiser',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-11-10'
  },
  org_manager: {
    id: 'user-org-manager',
    name: 'م. نبيل الشامي',
    phone: '777123456',
    phoneVerified: true,
    role: 'org_manager',
    orgId: 'org-1',
    orgName: 'شركة الصرح العقارية الحديثة',
    isOrgAdmin: true,
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-06-10'
  },
  org_agent: {
    id: 'user-org-agent',
    name: 'طارق الأصبحي (موظف إعلانات)',
    phone: '771998877',
    phoneVerified: true,
    role: 'org_agent',
    orgId: 'org-1',
    orgName: 'شركة الصرح العقارية الحديثة',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-09-01'
  },
  moderator: {
    id: 'usr-mod-1',
    name: 'عصام العديني (مسؤول مراجعة المحتوى)',
    phone: '770112233',
    phoneVerified: true,
    role: 'moderator',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-05-01'
  },
  verifier: {
    id: 'usr-ver-1',
    name: 'سالم بن محفوظ (مسؤول التحقق والوثائق)',
    phone: '770223344',
    phoneVerified: true,
    role: 'verifier',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-05-01'
  },
  reporter_admin: {
    id: 'usr-rep-1',
    name: 'مختار الهمداني (مسؤول البلاغات والقضايا)',
    phone: '770334455',
    phoneVerified: true,
    role: 'reporter_admin',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-05-01'
  },
  support: {
    id: 'usr-sup-1',
    name: 'خلود العبسي (مسؤول الدعم الفني)',
    phone: '770445566',
    phoneVerified: true,
    role: 'support',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-05-01'
  },
  accountant: {
    id: 'usr-acc-1',
    name: 'جمال الريمي (المحاسب المالي)',
    phone: '770556677',
    phoneVerified: true,
    email: 'finance@dalani.ye',
    role: 'accountant',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-05-01'
  },
  system_admin: {
    id: 'usr-sys-admin',
    name: 'المهندس / مدير النظام العام',
    phone: '770000000',
    phoneVerified: true,
    email: 'admin@dalani.ye',
    role: 'system_admin',
    activeStatus: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-01-01'
  }
};

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-01',
    employeeCode: 'EMP-ADM-001',
    name: 'المهندس / مدير النظام العام',
    email: 'admin@dalani.ye',
    phone: '770000000',
    role: 'system_admin',
    department: 'الإدارة العليا',
    status: 'active',
    customPermissions: ['*'],
    twoFactorEnabled: true,
    lastLoginAt: '2026-10-17 14:15',
    lastLoginIp: '185.190.22.40 (صنعاء)',
    createdAt: '2025-01-01'
  },
  {
    id: 'staff-02',
    employeeCode: 'EMP-MOD-104',
    name: 'عصام العديني',
    email: 'issam.mod@dalani.ye',
    phone: '770112233',
    role: 'moderator',
    department: 'مراجعة الإعلانات',
    status: 'active',
    customPermissions: ['view_all_listings', 'approve_listings', 'reject_listings', 'view_ad_history'],
    twoFactorEnabled: true,
    lastLoginAt: '2026-10-17 13:40',
    lastLoginIp: '185.190.22.88 (تعز)',
    createdAt: '2025-05-01'
  },
  {
    id: 'staff-03',
    employeeCode: 'EMP-VER-208',
    name: 'سالم بن محفوظ',
    email: 'salem.ver@dalani.ye',
    phone: '770223344',
    role: 'verifier',
    department: 'التحقق والمستندات',
    status: 'active',
    customPermissions: ['view_deeds', 'approve_verification', 'request_docs_info', 'view_cr_records'],
    twoFactorEnabled: true,
    lastLoginAt: '2026-10-17 12:10',
    lastLoginIp: '82.114.160.12 (المكلا)',
    createdAt: '2025-05-01'
  },
  {
    id: 'staff-04',
    employeeCode: 'EMP-REP-315',
    name: 'مختار الهمداني',
    email: 'mukhtar.rep@dalani.ye',
    phone: '770334455',
    role: 'reporter_admin',
    department: 'الشؤون القانونية والبلاغات',
    status: 'active',
    customPermissions: ['view_reports', 'suspend_ad_by_report', 'access_confidential_reporter'],
    twoFactorEnabled: true,
    lastLoginAt: '2026-10-17 11:30',
    lastLoginIp: '185.190.22.15 (صنعاء)',
    createdAt: '2025-05-01'
  },
  {
    id: 'staff-05',
    employeeCode: 'EMP-SUP-422',
    name: 'خلود العبسي',
    email: 'kholoud.sup@dalani.ye',
    phone: '770445566',
    role: 'support',
    department: 'الدعم الفني',
    status: 'active',
    customPermissions: ['view_tickets', 'reply_tickets', 'close_tickets', 'view_user_public_profile'],
    twoFactorEnabled: false,
    lastLoginAt: '2026-10-17 10:45',
    lastLoginIp: '82.114.162.77 (عدن)',
    createdAt: '2025-05-01'
  },
  {
    id: 'staff-06',
    employeeCode: 'EMP-ACC-519',
    name: 'جمال الريمي',
    email: 'finance@dalani.ye',
    phone: '770556677',
    role: 'accountant',
    department: 'الإدارة المالية',
    status: 'active',
    customPermissions: ['view_finance_ledger', 'verify_package_payments', 'export_financial_reports'],
    twoFactorEnabled: true,
    lastLoginAt: '2026-10-17 09:15',
    lastLoginIp: '185.190.22.61 (صنعاء)',
    createdAt: '2025-05-01'
  },
  {
    id: 'staff-07',
    employeeCode: 'EMP-SEC-901',
    name: 'م. فهد الجابري',
    email: 'fahad.sec@dalani.ye',
    phone: '770889900',
    role: 'system_admin',
    department: 'أمن وتقنية المعلومات',
    status: 'disabled',
    customPermissions: ['view_security_logs', 'monitor_active_sessions'],
    twoFactorEnabled: true,
    lastLoginAt: '2026-10-14 18:20',
    lastLoginIp: '185.190.22.19 (صنعاء)',
    createdAt: '2025-08-15'
  }
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Visibility
  { id: 'view_all_listings', name: 'استعراض كافة الإعلانات', description: 'الاطلاع على جميع العقارات بما فيها المسودات وقيد المراجعة', category: 'visibility', isSensitive: false },
  { id: 'view_deeds', name: 'الاطلاع على بصائر ووثائق الملكية', description: 'رؤية صور ومستندات الملكية والوثائق العرفية المحمية', category: 'sensitive_data', isSensitive: true },
  { id: 'access_confidential_reporter', name: 'كشف هوية المبلّغين السرية', description: 'الاطلاع على هوية وأرقام هواتف مقدمي البلاغات والنزاعات', category: 'sensitive_data', isSensitive: true },
  { id: 'view_finance_ledger', name: 'الاطلاع على الدفتر المالي والباقات', description: 'استعراض إيرادات الاشتراكات والحسابات البنكية', category: 'visibility', isSensitive: false },
  { id: 'view_security_logs', name: 'استعراض سجل الأمان والتهديدات', description: 'الاطلاع على محاولات الاختراق والعناوين المشبوهة', category: 'visibility', isSensitive: false },

  // Execution
  { id: 'approve_listings', name: 'اعتماد ونشر الإعلانات', description: 'الموافقة على نشر الإعلانات بعد مراجعة شروط المحتوى', category: 'execution', isSensitive: false },
  { id: 'reject_listings', name: 'رفض وطلب تعديل الإعلانات', description: 'إعادة الإعلان للمعلن مع تدوين الحقول الناقصة', category: 'execution', isSensitive: false },
  { id: 'approve_verification', name: 'منح شارات التوثيق الرسمية', description: 'توثيق الهوية، الوثائق، أو رخص المنشآت العقارية', category: 'execution', isSensitive: true },
  { id: 'suspend_ad_by_report', name: 'إيقاف الإعلانات المخالفة', description: 'تجميد وحجب الإعلانات التي ثبت احتيالها أو انتهاكها', category: 'execution', isSensitive: true },
  { id: 'reply_tickets', name: 'معالجة تذاكر الدعم والرد عليها', description: 'التواصل المباشر مع المستخدمين لحل مشاكلهم', category: 'execution', isSensitive: false },

  // System Override & Sensitive
  { id: 'manage_staff_accounts', name: 'إدارة حسابات الموظفين', description: 'إنشاء، تعديل، تعطيل، وتعيين صلاحيات الموظفين', category: 'system_override', isSensitive: true },
  { id: 'system_config_override', name: 'تعديل إعدادات النظام ومفاتيح الخصائص', description: 'تغيير وضع الصيانة، شروط التسجيل، وإعدادات التكامل', category: 'system_override', isSensitive: true },
  { id: 'kill_active_sessions', name: 'إنهاء الجلسات النشطة وحظر العناوين', description: 'طرد أي جلسة مفتوحة وفصل المستخدم أمنياً فوراً', category: 'system_override', isSensitive: true },
  { id: 'manage_database_backups', name: 'النسخ الاحتياطي واستعادة البيانات', description: 'توليد لقطات النسخ واستعادة النظام من نقاط الحفظ', category: 'system_override', isSensitive: true }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  visitor: [],
  seeker: [],
  advertiser: [],
  org_agent: [],
  org_manager: [],
  moderator: ['view_all_listings', 'approve_listings', 'reject_listings'],
  verifier: ['view_all_listings', 'view_deeds', 'approve_verification'],
  reporter_admin: ['view_all_listings', 'access_confidential_reporter', 'suspend_ad_by_report'],
  support: ['view_all_listings', 'reply_tickets'],
  accountant: ['view_finance_ledger'],
  system_admin: ['*']
};

export const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'sess-001',
    userId: 'usr-sys-admin',
    userName: 'المهندس / مدير النظام العام',
    userRole: 'system_admin',
    ipAddress: '185.190.22.40',
    deviceType: 'desktop',
    browser: 'Chrome 128 / macOS',
    location: 'صنعاء - السبعين',
    startedAt: '2026-10-17 08:30',
    lastActivityAt: 'الآن (نشطة)',
    isCurrent: true
  },
  {
    id: 'sess-002',
    userId: 'usr-mod-1',
    userName: 'عصام العديني (مراجعة)',
    userRole: 'moderator',
    ipAddress: '185.190.22.88',
    deviceType: 'desktop',
    browser: 'Firefox 131 / Windows',
    location: 'تعز - المظفر',
    startedAt: '2026-10-17 09:00',
    lastActivityAt: 'منذ 4 دقائق',
    isCurrent: false
  },
  {
    id: 'sess-003',
    userId: 'usr-ver-1',
    userName: 'سالم بن محفوظ (تحقق)',
    userRole: 'verifier',
    ipAddress: '82.114.160.12',
    deviceType: 'desktop',
    browser: 'Edge 128 / Windows',
    location: 'حضرموت - المكلا',
    startedAt: '2026-10-17 10:15',
    lastActivityAt: 'منذ 12 دقيقة',
    isCurrent: false
  },
  {
    id: 'sess-004',
    userId: 'usr-sup-1',
    userName: 'خلود العبسي (دعم)',
    userRole: 'support',
    ipAddress: '82.114.162.77',
    deviceType: 'tablet',
    browser: 'Safari 18 / iPadOS',
    location: 'عدن - المعلا',
    startedAt: '2026-10-17 11:00',
    lastActivityAt: 'منذ 22 دقيقة',
    isCurrent: false
  },
  {
    id: 'sess-005',
    userId: 'user-org-manager',
    userName: 'م. نبيل الشامي (منشأة)',
    userRole: 'org_manager',
    ipAddress: '185.190.22.114',
    deviceType: 'mobile',
    browser: 'Mobile Safari / iOS',
    location: 'صنعاء - حدة',
    startedAt: '2026-10-17 12:45',
    lastActivityAt: 'منذ 38 دقيقة',
    isCurrent: false
  }
];

export const INITIAL_SUSPICIOUS_LOGINS: SuspiciousLogin[] = [
  {
    id: 'threat-101',
    ipAddress: '194.26.29.112',
    attemptedIdentifier: 'admin@dalani.ye',
    attemptType: 'brute_force',
    riskLevel: 'critical',
    timestamp: '2026-10-17 05:22:11',
    blocked: true,
    location: 'فرانكفورت، ألمانيا (VPN)',
    userAgent: 'Python-requests/2.31.0',
    resolvedReason: 'تم حظر العنوان تلقائياً لتجاوزه 5 محاولات فاشلة خلال دقيقة'
  },
  {
    id: 'threat-102',
    ipAddress: '45.148.10.66',
    attemptedIdentifier: 'root / /api/v1/admin/shell',
    attemptType: 'unauthorized_privilege',
    riskLevel: 'high',
    timestamp: '2026-10-16 23:40:05',
    blocked: true,
    location: 'أمستردام، هولندا',
    userAgent: 'curl/8.4.0',
    resolvedReason: 'محاولة استكشاف مسارات إدارية غير مصرح بها'
  },
  {
    id: 'threat-103',
    ipAddress: '185.190.22.204',
    attemptedIdentifier: '770223344 (موظف التحقق)',
    attemptType: 'brute_force',
    riskLevel: 'medium',
    timestamp: '2026-10-16 19:14:30',
    blocked: false,
    location: 'صنعاء، اليمن',
    userAgent: 'Mozilla/5.0 Android; Mobile',
    resolvedReason: 'إدخال كلمة مرور خاطئة مرتين متتاليتين ثم تم النجاح بالرمز السري'
  }
];

export const INITIAL_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'flag-reg',
    key: 'allow_new_registrations',
    name: 'السماح بتسجيل مستخدمين جدد',
    description: 'تمكين الزوار من إنشاء حسابات جديدة وتوثيق أرقام الهواتف',
    category: 'user_ops',
    enabled: true,
    lastModifiedBy: 'مدير النظام',
    updatedAt: '2026-10-10'
  },
  {
    id: 'flag-instant-pub',
    key: 'instant_publish_for_verified_orgs',
    name: 'النشر الفوري للمنشآت الموثقة',
    description: 'تخطي مرحلة المراجعة اليدوية للمنشآت العقارية ذات التقييم المرتفع',
    category: 'content',
    enabled: false,
    lastModifiedBy: 'مدير النظام',
    updatedAt: '2026-10-12'
  },
  {
    id: 'flag-sms-otp',
    key: 'enforce_sms_otp_verification',
    name: 'إلزام التحقق بـ SMS OTP عند الدخول',
    description: 'إرسال رمز تحقق نصي عند تسجيل الدخول من أجهزة جديدة',
    category: 'security',
    enabled: true,
    lastModifiedBy: 'مدير النظام',
    updatedAt: '2026-10-15'
  },
  {
    id: 'flag-strict-kyc',
    key: 'strict_kyc_for_high_value_listings',
    name: 'التوثيق الصارم للعقارات فوق 100 مليون ريال',
    description: 'إلزام إرفاق بصيرة الملكية ورقم الهوية الوطنية قبل النشر',
    category: 'content',
    enabled: true,
    lastModifiedBy: 'مدير النظام',
    updatedAt: '2026-10-14'
  },
  {
    id: 'flag-maint',
    key: 'system_maintenance_mode',
    name: 'وضع الصيانة العامة للمنصة',
    description: 'إظهار شاشة الصيانة للزوار والمستخدمين مع استمرار دخول الإدارة فقط',
    category: 'security',
    enabled: false,
    lastModifiedBy: 'مدير النظام',
    updatedAt: '2026-09-30'
  },
  {
    id: 'flag-ai-desc',
    key: 'enable_ai_ad_enhancement',
    name: 'مساعد صياغة الإعلانات الذكي',
    description: 'مساعدة المعلنين على توليد وصف تسويقي دقيق للعقار اليمني',
    category: 'experimental',
    enabled: true,
    lastModifiedBy: 'مدير النظام',
    updatedAt: '2026-10-11'
  }
];

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  platformName: 'منصة دلنّي العقارية - الجمهورية اليمنية',
  officialEmail: 'compliance@dalani.ye',
  supportPhone: '770000000',
  defaultCurrency: 'YER',
  maintenanceMode: false,
  registrationOpen: true,
  enforce2FAForStaff: true,
  maxFailedLoginsBeforeLock: 3,
  sessionTimeoutMinutes: 45,
  allowPublicAdSubmissions: true,
  strictKycForHighValue: true,
  requireSmsOtpVerification: true,
  autoBackupIntervalHours: 6,
  maxUploadSizeMb: 15
};

export const INITIAL_INTEGRATIONS: IntegrationService[] = [
  {
    id: 'int-sms-ym',
    name: 'بوابة رسائل SMS - يمن موبايل',
    category: 'sms',
    provider: 'Yemen Mobile Enterprise API',
    status: 'connected',
    latencyMs: 95,
    lastPingAt: 'منذ دقيقة',
    remainingCredits: 4820,
    healthNote: 'البوابة تعمل بكفاءة تامة ومعدل تسليم الرموز 99.4%'
  },
  {
    id: 'int-sms-sb',
    name: 'بوابة رسائل SMS - سبأفون (احتياطي)',
    category: 'sms',
    provider: 'Sabafon Corporate SMS Gateway',
    status: 'connected',
    latencyMs: 130,
    lastPingAt: 'منذ 5 دقائق',
    remainingCredits: 2150,
    healthNote: 'البوابة الاحتياطية جاهزة للتحويل التلقائي عند انقطاع المزود الأساسي'
  },
  {
    id: 'int-storage',
    name: 'مستودع الوثائق والصور السحابي المشفر',
    category: 'storage',
    provider: 'Dalani Encrypted Object Storage (S3-compatible)',
    status: 'connected',
    latencyMs: 42,
    lastPingAt: 'منذ 30 ثانية',
    remainingCredits: 85, // % remaining
    healthNote: 'تشفير AES-256 للوثائق والبصائر الخاصة مع تجزئة الصلاحيات'
  },
  {
    id: 'int-smtp',
    name: 'خادم البريد المؤسسي للإشعارات الإدارية',
    category: 'email',
    provider: 'Internal Secure SMTP Relay',
    status: 'connected',
    latencyMs: 65,
    lastPingAt: 'منذ دقيقتين',
    healthNote: 'إرسال تقارير الحوادث والتنبيهات الأمنية الفورية'
  },
  {
    id: 'int-backup',
    name: 'الخزينة الرقمية للنسخ الاحتياطي التلقائي',
    category: 'backup',
    provider: 'Disaster Recovery Vault (Cold Storage)',
    status: 'connected',
    latencyMs: 180,
    lastPingAt: 'منذ 15 دقيقة',
    healthNote: 'آخر لقطة متكاملة تم التحقق من سلامتها بنجاح'
  }
];

export const INITIAL_SYSTEM_ERRORS: SystemErrorLog[] = [
  {
    id: 'err-401',
    code: 'SEC_UNAUTHORIZED_DOC_ACCESS',
    module: 'الوثائق الخاصة والمستندات',
    message: 'محاولة استعراض بصيرة عقار محمي بدون صلاحية verifier من قبل معلن فرد',
    severity: 'warning',
    timestamp: '2026-10-17 12:44:19',
    resolved: true,
    resolvedBy: 'مدير النظام',
    resolvedAt: '2026-10-17 13:00'
  },
  {
    id: 'err-402',
    code: 'SMS_GATEWAY_THROTTLE',
    module: 'بوابة الرسائل القصيرة',
    message: 'تباطؤ مؤقت في استلام إشعار التسليم من مزود الرسائل (زمن الاستجابة ارتفع إلى 850ms)',
    severity: 'info',
    timestamp: '2026-10-17 10:12:05',
    resolved: true,
    resolvedBy: 'النظام التلقائي'
  },
  {
    id: 'err-403',
    code: 'DB_DUPLICATE_LISTING_ATTEMPT',
    module: 'محرك مطابقة الإعلانات',
    message: 'اكتشاف محاولة رفع إعلان مطابق بالكامل برقم هاتف مختلف لعقار في صنعاء حدة',
    severity: 'warning',
    timestamp: '2026-10-16 18:30:22',
    resolved: false
  }
];

export const INITIAL_BACKUP_SNAPSHOTS: BackupSnapshot[] = [
  {
    id: 'snap-2026-10-17-06',
    name: 'نسخة دورية آلية - الفجر (Automated Daily)',
    type: 'auto',
    sizeMb: 42.8,
    recordsCount: 1420,
    checksum: 'sha256-8a7f4b3c9d1e204',
    createdAt: '2026-10-17 06:00:00',
    status: 'verified'
  },
  {
    id: 'snap-2026-10-16-18',
    name: 'لقطة ما قبل التحديث الإداري الشامل',
    type: 'manual',
    sizeMb: 41.5,
    recordsCount: 1405,
    checksum: 'sha256-3c2d1e9f8a7b602',
    createdAt: '2026-10-16 18:00:00',
    status: 'ready'
  },
  {
    id: 'snap-2026-10-15-06',
    name: 'نسخة أسبوعية متكاملة ومؤرشفة',
    type: 'auto',
    sizeMb: 39.2,
    recordsCount: 1380,
    checksum: 'sha256-5b4a3c2d1e0f991',
    createdAt: '2026-10-15 06:00:00',
    status: 'ready'
  }
];

export const INITIAL_ESCALATIONS: AdminEscalation[] = [
  {
    id: 'esc-01',
    caseNumber: 'ESC-2026-08',
    title: 'طلب كشف بصيرة ملكية خاصة لفك نزاع نزع ملكية في صنعاء',
    category: 'sensitive_data_access',
    requesterName: 'مختار الهمداني',
    requesterRole: 'reporter_admin',
    details: 'وجود بلاغ احتيال على عمارة سكنية في السبعين يتطلب مقارنة أصل البصيرة مع سجل الأمانة العقاري',
    status: 'pending',
    submittedAt: '2026-10-17 11:20'
  },
  {
    id: 'esc-02',
    caseNumber: 'ESC-2026-07',
    title: 'طلب إعفاء وتجديد باقة ترويج لمنشأة الصرح العقارية',
    category: 'high_value_deal',
    requesterName: 'جمال الريمي',
    requesterRole: 'accountant',
    details: 'طلب خصم 20% لاشتراك سنوي يتجاوز قيمته 2 مليون ريال يمني ويتطلب اعتماد الإدارة العليا',
    status: 'approved',
    submittedAt: '2026-10-16 15:45',
    decisionBy: 'مدير النظام',
    decisionNotes: 'تمت الموافقة دعماً لشركاء المنصة العقارية'
  },
  {
    id: 'esc-03',
    caseNumber: 'ESC-2026-06',
    title: 'التماس فك حظر حساب معلن فرد بعد تقديم إثبات هوية صحيح',
    category: 'ban_appeal',
    requesterName: 'خلود العبسي',
    requesterRole: 'support',
    details: 'المعلن هشام القدسي تم إيقاف حسابه بسبب محاولات دخول متكررة خاطئة وتم التحقق من بطاقته الشخصية',
    status: 'pending',
    submittedAt: '2026-10-17 09:30'
  }
];

