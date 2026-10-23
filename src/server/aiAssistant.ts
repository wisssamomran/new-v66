import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { User, UserRole } from '../types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6KXFSJSOeZf-dndir5-aZFfsZ2hcowcsKLiHzW84dAukw';

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Role Arabic Information & Capabilities
export const ROLE_INFO: Record<string, { title: string; desc: string; allowedViews: string[] }> = {
  visitor: {
    title: 'زائر المنصة',
    desc: 'استكشاف العقارات والخريطة والبحث العام بدون حساب',
    allowedViews: ['home', 'search', 'listing_details', 'support']
  },
  seeker: {
    title: 'باحث عن عقار',
    desc: 'حساب مسجل للبحث، المفضلات، طلبات الحجز المؤقت، والتفاوض',
    allowedViews: ['home', 'search', 'listing_details', 'favorites', 'bookings', 'support', 'account']
  },
  advertiser: {
    title: 'معلن عقاري (فردي / مالك)',
    desc: 'نشر العقارات، إدارة العروض، متابعة الحجوزات، وإجراءات البيع/الإيجار',
    allowedViews: ['home', 'search', 'listing_details', 'wizard', 'my_ads', 'bookings', 'support', 'account']
  },
  org_manager: {
    title: 'مدير منشأة عقارية',
    desc: 'إدارة المكتب العقاري، فريق الوسطاء، حصص الإعلانات، ومتابعة الصفقات',
    allowedViews: ['home', 'search', 'listing_details', 'wizard', 'my_ads', 'organization', 'bookings', 'support', 'account']
  },
  org_agent: {
    title: 'وسيط عقاري معتمد',
    desc: 'إدارة الإعلانات المسندة، تنظيم المعاينات الميدانية، والتفاوض',
    allowedViews: ['home', 'search', 'listing_details', 'wizard', 'my_ads', 'organization', 'bookings', 'support', 'account']
  },
  moderator: {
    title: 'مشرف مراجعة المحتوى',
    desc: 'تدقيق الإعلانات قبل النشر، التحقق من جودة الصور ومطابقة الشروط',
    allowedViews: ['home', 'search', 'listing_details', 'moderation', 'support', 'account']
  },
  verifier: {
    title: 'مدقق الوثائق والصكوك',
    desc: 'فحص البصائر والصكوك الشرعية والسجلات ومنح شارات التوثيق',
    allowedViews: ['home', 'search', 'listing_details', 'verification', 'support', 'account']
  },
  reporter_admin: {
    title: 'مسؤول البلاغات والنزاعات',
    desc: 'التحقيق في الشكاوى، تجميد الإعلانات المخالفة، وحماية المتعاملين',
    allowedViews: ['home', 'search', 'listing_details', 'reports', 'support', 'account']
  },
  support: {
    title: 'أخصائي الدعم الفني',
    desc: 'مساعدة المستخدمين وحل المشكلات الفنية وتذاكر الدعم',
    allowedViews: ['home', 'search', 'listing_details', 'support', 'account']
  },
  accountant: {
    title: 'محاسب مالي',
    desc: 'إدارة المخالصات المالية والسندات والعمولات',
    allowedViews: ['home', 'search', 'listing_details', 'bookings', 'support', 'account']
  },
  operations_manager: {
    title: 'مدير العمليات الميدانية',
    desc: 'الإشراف على جدولة المعاينات، إنجاز الصفقات، ومتابعة الإشغال',
    allowedViews: ['home', 'search', 'listing_details', 'bookings', 'organization', 'support', 'account']
  },
  system_admin: {
    title: 'مدير النظام الأمني والتقني',
    desc: 'صلاحية كاملة لإدارة المنصة، المستخدمين، الأمان، والنسخ الاحتياطي',
    allowedViews: [
      'home', 'search', 'listing_details', 'wizard', 'my_ads', 'moderation',
      'verification', 'organization', 'reports', 'support', 'admin', 'favorites', 'account', 'bookings'
    ]
  }
};

// Friendly Screen Labels
export const SCREEN_LABELS: Record<string, string> = {
  home: 'الصفحة الرئيسية والخريطة',
  search: 'البحث المتقدم والخريطة التفاعلية',
  listing_details: 'تفاصيل العقار المعروض',
  wizard: 'معالج إضافة إعلان عقاري جديد',
  my_ads: 'لوحة إعلاناتي والعروض',
  moderation: 'لوحة مراجعة المحتوى وطابور الاعتماد',
  verification: 'لوحة التحقق وتدقيق الصكوك والبصائر',
  organization: 'لوحة المنشأة العقارية وإدارة الوسطاء',
  reports: 'لوحة البلاغات والنزاعات',
  support: 'مركز المساعدة وتذاكر الدعم',
  admin: 'لوحة تحكم مدير النظام الشاملة والأمن',
  favorites: 'قائمة العقارات المفضلة',
  account: 'إعدادات حسابي والجلسات والخصوصية',
  bookings: 'إدارة الحجوزات المؤقتة ومساحة الصفقات'
};

// Generate live role-based quick prompts
export function getQuickPromptsForRole(role: string, currentView?: string): string[] {
  switch (role) {
    case 'visitor':
      return [
        'كيف أبحث عن عقار للإيجار أو البيع في صنعاء؟',
        'ما هي ميزة الحجز المؤقت الحصري في دلنّي؟',
        'كيف أسجل حساباً جديداً لأنشر إعلاني؟',
        'ما معنى شارات التوثيق العقاري للبصائر؟'
      ];
    case 'seeker':
      return [
        'كيف أقدم طلب حجز مؤقت حصري على عقار؟',
        'أين أجد قائمة العقارات التي حفظتها في المفضلة؟',
        'كيف أتواصل مباشرة مع المعلن أو المكتب؟',
        'ما هي خطوات التفاوض وإتمام الصفقة في مساحة العمل؟'
      ];
    case 'advertiser':
      return [
        'كيف أضيف إعلاناً جديداً خطوة بخطوة؟',
        'لماذا إعلاني بحالة "قيد المراجعة"؟',
        'كيف أتابع طلبات الحجز المؤقت المقدمة على عقاراتي؟',
        'كيف أرفع بصيرة أو صك الملكية للحصول على شارة التوثيق؟'
      ];
    case 'org_manager':
      return [
        'كيف أضيف وسيطاً جديداً لفريق مكتبي العقاري؟',
        'كيف أوزع الإعلانات على الوسطاء التابعين للمنشأة؟',
        'كيف أتابع حجوزات وصفقات منشأتي المكتملة؟',
        'أريد ملخصاً عن إحصائيات وأداء مكتبي العقاري'
      ];
    case 'org_agent':
      return [
        'أين أجد العقارات المسندة إلي من قبل المدير؟',
        'كيف أنظم موعد معاينة ميدانية مع الباحث؟',
        'كيف أرسل تفاصيل الصفقة والاتفاق المالي؟'
      ];
    case 'moderator':
      return [
        'كم عدد الإعلانات المنتظرة في طابور المراجعة؟',
        'ما هي معايير قبول أو رفض الإعلان أو طلب تعديله؟',
        'كيف أراجع جودة الصور ومعلومات الموقع؟'
      ];
    case 'verifier':
      return [
        'كم عدد طلبات التحقق من الصكوك والبصائر المعلقة؟',
        'ما هي معايير منح شارة التوثيق الذهبية؟',
        'كيف أتحقق من صك الملكية والبصيرة الشرعية اليمنية؟'
      ];
    case 'reporter_admin':
      return [
        'كم عدد البلاغات المفتوحة قيد التحقيق؟',
        'كيف أجمد إعلاناً عقارياً مخالفاً أو احظر معلناً؟',
        'ما هي إجراءات الفصل في نزاعات الصفقات والحجوزات؟'
      ];
    case 'support':
      return [
        'كم عدد تذاكر الدعم الفني المفتوحة؟',
        'كيف أساعد مستخدماً يواجه مشكلة في توثيق هاتفه؟',
        'ما هي خطوات استعادة أو إعادة تنشيط الحساب؟'
      ];
    case 'system_admin':
      return [
        'ما هو ملخص حالة النظام وسجل التهديدات الأمنية؟',
        'كيف أستعرض سجل التدقيق الأمني (Audit Logs)؟',
        'هل النسخ الاحتياطية للبيانات منتظمة ومفحوصة؟',
        'كيف أتحكم في ميزات النظام وإلغاء حظر الـ IPs؟'
      ];
    default:
      return [
        'كيف أستخدم منصة دلنّي العقارية؟',
        'أين أجد الخريطة التفاعلية للعقارات؟',
        'كيف أوثق رقم هاتفي اليمني في المنصة؟'
      ];
  }
}

// Generate Personalized Dynamic Greeting
export function buildInitialGreeting(user: User, currentView: string = 'home') {
  const roleData = ROLE_INFO[user.role] || ROLE_INFO.visitor;
  const screenName = SCREEN_LABELS[currentView] || 'المنصة';

  let greetingMessage = '';
  let contextBadge = '';

  if (user.role === 'visitor') {
    greetingMessage = `أهلاً ومرحباً بك في **منصة دلنّي العقارية اليمنية** 🇾🇪!
أنا **مساعد دلنّي الذكي**، موجود لإرشادك في أي وقت. يمكنك استكشاف آلاف العقارات في صنعاء، عدن، تعز وكافة المحافظات، وتصفح الخريطة التفاعلية، ومعرفة كيفية حجز أو توثيق أي عقار.

أنت الآن في **${screenName}**. كيف يمكنني مساعدتك في رحلتك العقارية اليوم؟`;
    contextBadge = 'وضع الزائر • استعراض عام';
  } else if (user.role === 'seeker') {
    const myRequests = db.getRequests().filter(r => r.seekerId === user.id);
    const myBookings = db.getBookings().filter(b => b.seekerId === user.id && b.status === 'active');
    greetingMessage = `أهلاً بك أخي الكريم **${user.name}**! يسعدني جداً الترحيب بك كـ **باحث عن عقار** في منصة دلنّي.

📍 لديك حالياً **${myRequests.length}** طلبات عقارية، و **${myBookings.length}** حجوزات مؤقتة فعالة.
أنا تحت أمرك لأساعدك في العثور على أفضل شقة، بيت، أو أرض، وتوضيح كيفية تأكيد حجزك المؤقت، أو التوجه لأي قسم تريده في المنصة.`;
    contextBadge = `باحث • ${myBookings.length} حجز مؤقت فعال`;
  } else if (user.role === 'advertiser') {
    const myListings = db.getListings().filter(l => l.advertiser?.id === user.id);
    const published = myListings.filter(l => l.status === 'published').length;
    const underReview = myListings.filter(l => l.status === 'under_review').length;
    const activeBookings = db.getBookings().filter(b => b.advertiserId === user.id && b.status === 'active').length;

    greetingMessage = `أهلاً بك يا أستاذ **${user.name}**! بصفتك **معلناً عقارياً** في دلنّي، أنا شريكك الذكي لإدارة عروضك ونجاح صفقاتك.

📊 **موجز إعلاناتك الحالية:**
- إجمالي إعلاناتك: **${myListings.length}** عقار
- منشورة ومتاحة: **${published}**
- قيد مراجعة المشرف: **${underReview}**
- صفقات وحجوزات نشطة: **${activeBookings}**

يمكنني مساعدتك في إضافة إعلان جديد بمواصفات ممتازة، مراجعة حالة عروضك، أو إدارة طلبات الحجز. ما الذي تحتاجه الآن؟`;
    contextBadge = `معلن عقاري • ${myListings.length} إعلان (${published} منشور)`;
  } else if (user.role === 'org_manager') {
    const org = user.orgId ? db.getOrganizationById(user.orgId) : null;
    const orgListings = db.getListings().filter(l => l.advertiser?.orgId === user.orgId || l.advertiser?.id === user.id);
    greetingMessage = `مرحباً بك يا مدير المنشأة **${user.name}** (${org?.name || user.orgName || 'المكتب العقاري'}).
أنا مساعدك الإداري والذكي في منصة دلنّي.

🏢 يضم مكتبك **${orgListings.length}** إعلاناً عقارياً. بإمكاني إرشادك لإضافة وسطاء جدد، وتوزيع الحصص والإعلانات، ومتابعة الحجوزات ونسب الإنجاز.`;
    contextBadge = `إدارة منشأة • ${org?.name || 'مكتب عقاري'}`;
  } else if (user.role === 'system_admin') {
    const totalListings = db.getListings().length;
    const totalUsers = db.getUsers().length;
    const threats = db.getThreats().length;
    const blockedIps = db.getBlockedIps().length;

    greetingMessage = `أهلاً بك **سعادة مدير النظام** المهندس **${user.name}**!
نظام دلنّي التقني والأمني يعمل بكفاءة 100% 🛡️.

⚡ **نظرة تنفيذية سريعة:**
- إجمالي العقارات: **${totalListings}** | المستخدمين: **${totalUsers}**
- التهديدات المرصودة: **${threats}** | عناوين IP المحظورة: **${blockedIps}**
- حالة سجل التدقيق (Audit Logs): نشط ويسجل كل العمليات المشبوهة.

أنا جاهز لمساعدتك في فحص الأمان، إجراءات النسخ الاحتياطي، تبديل ميزات النظام، أو فحص أي مسار في النظام.`;
    contextBadge = 'مدير النظام • حوكمة وتحكم شامل';
  } else {
    greetingMessage = `أهلاً بك **${user.name}** بصفتك **${roleData.title}** في منصة دلنّي العقارية!
أنا مساعدك الذكي ومستعد لمساعدتك في أي استفسار أو حل أي مشكلة، وتوجيهك لأي قسم تريده في المنصة وفق صلاحياتك.`;
    contextBadge = `${roleData.title}`;
  }

  return {
    greetingMessage,
    contextBadge,
    roleTitle: roleData.title,
    currentScreen: screenName,
    quickPrompts: getQuickPromptsForRole(user.role, currentView)
  };
}

// Generate Response using Gemini with resilient Fallback
export async function generateAiAssistantResponse(
  user: User,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
  currentView: string = 'home'
): Promise<{ text: string; modelUsed: string; navigationSuggestions: Array<{ view: string; title: string }> }> {
  const roleData = ROLE_INFO[user.role] || ROLE_INFO.visitor;
  const currentScreenName = SCREEN_LABELS[currentView] || currentView;

  // Compile live database facts based on user role
  const totalListings = db.getListings().length;
  const publishedCount = db.getListings().filter(l => l.status === 'published').length;
  let userSpecificFacts = '';

  if (user.role === 'advertiser' || user.role === 'org_manager' || user.role === 'org_agent') {
    const userAds = db.getListings().filter(l => l.advertiser?.id === user.id || (user.orgId && l.advertiser?.orgId === user.orgId));
    const userRequests = db.getRequests().filter(r => r.advertiserId === user.id);
    const userBookings = db.getBookings().filter(b => b.advertiserId === user.id && b.status === 'active');
    userSpecificFacts = `
- إعلانات المستخدم الخاصة: ${userAds.length} (منها ${userAds.filter(a => a.status === 'published').length} منشور، ${userAds.filter(a => a.status === 'under_review').length} قيد المراجعة، ${userAds.filter(a => a.status === 'needs_changes').length} يتطلب تعديلات).
- طلبات الحجز المستلمة: ${userRequests.length} (منها ${userRequests.filter(r => r.status === 'pending').length} بانتظار الرد).
- الحجوزات المؤقتة الفعالة لديه حالياً: ${userBookings.length}.
`;
  } else if (user.role === 'seeker') {
    const myRequests = db.getRequests().filter(r => r.seekerId === user.id);
    const myBookings = db.getBookings().filter(b => b.seekerId === user.id && b.status === 'active');
    userSpecificFacts = `
- طلبات الباحث المرسلة: ${myRequests.length}.
- الحجوزات المؤقتة الفعالة لصالح الباحث: ${myBookings.length}.
`;
  } else if (user.role === 'moderator') {
    const pendingModeration = db.getListings().filter(l => l.status === 'under_review').length;
    userSpecificFacts = `- إعلانات بانتظار المراجعة والاعتماد حالياً: ${pendingModeration}.`;
  } else if (user.role === 'verifier') {
    const pendingVerifications = db.getVerifications().filter((v: any) => v.status === 'pending').length;
    userSpecificFacts = `- طلبات توثيق صكوك وبصائر معلقة: ${pendingVerifications}.`;
  } else if (user.role === 'reporter_admin') {
    const openReports = db.getReports().filter(r => r.status === 'new' || r.status === 'investigating').length;
    userSpecificFacts = `- بلاغات ونزاعات مفتوحة: ${openReports}.`;
  } else if (user.role === 'system_admin') {
    const threats = db.getThreats().length;
    const blockedIps = db.getBlockedIps().length;
    const sessions = db.getActiveSessions().length;
    userSpecificFacts = `
- حالة الحوكمة: 100% نشطة.
- إجمالي المستخدمين: ${db.getUsers().length}، طاقم العمل: ${db.getStaff().length}.
- الجلسات النشطة: ${sessions}، التهديدات المرصودة: ${threats}، الآي بي المحظور: ${blockedIps}.
- أحدث نسخة احتياطية: ${db.getBackups()[0]?.createdAt || '2026-10-17'}.
`;
  }

  const systemInstruction = `
أنت «مساعد دلنّي الذكي» (Dalani AI Assistant)، المساعد الذكي والخبير العقاري الشامل لمنصة «دلنّي» - كبرى المنصات العقارية الرقمية في الجمهورية اليمنية 🇾🇪.

بيانات المستخدم الحالي الذي تتحدث معه الآن:
- الاسم: ${user.name}
- الدور الحالي في النظام: ${roleData.title} (رمز الدور: ${user.role})
- الصلاحيات العامة للدور: ${roleData.desc}
- الشاشة الحالية التي يتواجد بها المستخدم الآن: ${currentScreenName} (رمز الشاشة: ${currentView})
- هاتف المستخدم الموثق: ${user.phone || 'غير مسجل'}
${userSpecificFacts}

قواعد أساسية صارمة يجب الالتزام بها:
1. خاطب المستخدم باسمه وصفته ودوره تلقائياً. أنت تعرفه مسبقاً وتعرف كافة مجريات المنصة، فلا تسأله "من أنت" أو "ما هو دورك".
2. اشرح وأجب على أي استفسار وفق حدود صلاحيات دوره:
   - الزائر (visitor): يمكنه البحث وتصفح الخريطة واستعراض العقارات، ولكنه يحتاج لتسجيل الدخول لنشر إعلان أو حجز عقار أو حفظ مفضلة.
   - الباحث (seeker): يبحث، يحفظ المفضلة، يطلب حجزاً مؤقتاً حصرياً، ويتفاوض في مساحة الصفقات.
   - المعلن (advertiser): يضيف عقارات عبر المعالج (7 خطوات)، وإعلاناته تخضع للمراجعة ولا تُنشر تلقائياً؛ يدير إعلاناته وحجوزاته من "إعلاناتي".
   - مدير المنشأة (org_manager): يدير المكتب، الوسطاء، حصص الإعلانات، والصفقات عبر "لوحة المنشأة".
   - الوسيط (org_agent): يدير الإعلانات المسندة إليه وينظم المعاينات الميدانية.
   - المشرف (moderator): يعتمد الإعلانات، يرفضها، أو يطلب تعديلها من "طابور المراجعة".
   - المدقق (verifier): يفحص صكوك الملكية والبصائر الشرعية ويمنح شارات التوثيق من "لوحة التحقق".
   - مسؤول البلاغات (reporter_admin): يعالج الشكاوى والنزاعات وتجميد الإعلانات المخالفة.
   - موظف الدعم (support): يحل تذاكر الدعم الفني ومشاكل المستخدمين.
   - مدير النظام (system_admin): يملك الصلاحية الشاملة لإدارة النظام، الأمان، سجل التدقيق (Audit Logs)، النسخ الاحتياطي، وحظر الـ IPs.
3. التوجيه الذكي إلى الشاشات (Navigation Action Tags):
   عندما تصف للمستخدم كيف يصل لمكان أو تحل مشكلته، أضف رابط انتقال ذكي بصيغة [GO:target_view|نص الزر] لتمكين المستخدم من النقر عليه والانتقال مباشرة!
   القيم الصالحة للـ target_view هي:
   - wizard (إضافة إعلان جديد)
   - my_ads (إدارة إعلاناتي)
   - search (البحث والخريطة)
   - bookings (الحجوزات والصفقات)
   - verification (لوحة التحقق وتدقيق الصكوك)
   - moderation (لوحة مراجعة المحتوى)
   - organization (لوحة المنشأة العقارية)
   - admin (لوحة إدارة النظام)
   - reports (لوحة البلاغات والنزاعات)
   - support (مركز الدعم والمساعدة)
   - account (إعدادات حسابي والجلسات)
   - favorites (المفضلة)
   - home (الصفحة الرئيسية)
4. احرص على أن تكون إجاباتك دقيقة، منظمة بنقاط أو خطوات سهلة القراءة، بلهجة عربية راقية وعصرية تليق بالسياق اليمني مع روح الترحيب والتعاون.
5. إذا سأل المستخدم عن إحصائياته أو أرقام إعلاناته أو حجوزاته، استخدم البيانات الحقيقية المذكورة أعلاه بدقة.
`;

  // Build contents history
  const contents: any[] = [];
  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  // Try gemini-3.1-flash-lite first (fast & reliable), then gemini-3.8-flash
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      // 8-second timeout per attempt
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI response timed out')), 8000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const responseText = response.text || '';
      if (responseText.trim()) {
        const navigationSuggestions = extractNavigationTags(responseText);
        return {
          text: responseText,
          modelUsed: model,
          navigationSuggestions
        };
      }
    } catch (err: any) {
      console.warn(`[Dalani AI] Attempt with model ${model} failed:`, err?.message || err);
      lastError = err;
      // Continue to next model in loop
    }
  }

  // Resilient Local Knowledge Base Fallback if both cloud calls fail
  console.warn('[Dalani AI] Falling back to intelligent local fallback handler.');
  const fallbackText = generateIntelligentFallbackResponse(user, userMessage, currentView);
  return {
    text: fallbackText,
    modelUsed: 'dalani-intelligent-local-engine',
    navigationSuggestions: extractNavigationTags(fallbackText)
  };
}

// Extract [GO:view|title] tags from text
export function extractNavigationTags(text: string): Array<{ view: string; title: string }> {
  const regex = /\[GO:([a-z_]+)\|([^\]]+)\]/g;
  const matches: Array<{ view: string; title: string }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      view: match[1],
      title: match[2]
    });
  }
  return matches;
}

// Intelligent Offline/Resilient Fallback Responder
function generateIntelligentFallbackResponse(user: User, message: string, currentView: string): string {
  const query = message.toLowerCase();

  if (query.includes('إعلان') || query.includes('نشر') || query.includes('اضيف') || query.includes('أضيف')) {
    if (user.role === 'visitor') {
      return `أهلاً بك يا ${user.name}! لنشر إعلانك في منصة دلنّي، يلزم أولاً تسجيل الدخول أو تأكيد رقم هاتفك اليمني لضمان موثوقية المعلنين.

بمجرد تسجيل الدخول ستتمكن من استخدام معالج الإعلانات المكون من 7 خطوات سهلة وسريعة:
[GO:search|تصفح العقارات المتاحة حالياً]`;
    }
    return `أهلاً بك يا ${user.name}! يمكنك إضافة ونشر عقارك بكل سهولة عبر معالج الإعلانات الذكي المكون من 7 خطوات (البيانات، الموقع، السعر، المساحة، التفاصيل، الصور، ووثائق الملكية).

تفضل بالدخول إلى المعالج مباشرة من هنا:
[GO:wizard|الانتقال إلى معالج إضافة إعلان جديد]

كما يمكنك متابعة حالة إعلاناتك السابقة في:
[GO:my_ads|استعراض لوحة إعلاناتي]`;
  }

  if (query.includes('حجز') || query.includes('حجوزات') || query.includes('مؤقت')) {
    return `نظام **الحجز المؤقت الحصري** في دلنّي يمنح الباحث حصرية حجز العقار لفترة محددة (بين 12 و 168 ساعة) لمراجعة الوثائق والتفاوض، وخلال هذه الفترة يُحجب العقار عن باقي الباحثين لمنع تضارب العروض.

يمكنك متابعة كافة الحجوزات وطلباتك ومساحة التفاوض من هنا:
[GO:bookings|لوحة إدارة الحجوزات ومساحة الصفقات]`;
  }

  if (query.includes('توثيق') || query.includes('بصيرة') || query.includes('صك') || query.includes('شارة')) {
    if (user.role === 'verifier' || user.role === 'system_admin') {
      return `أهلاً بك يا ${user.name}. بخصوص فحص الوثائق ومنح الشارات الذهبية للعقارات الموثقة بالبصيرة الشرعية، يمكنك مراجعة الطلبات المجدولة من خلال:
[GO:verification|لوحة التحقق وتدقيق الصكوك]`;
    }
    return `تحرص منصة دلنّي على موثوقية العقارات عبر مراجعة وثائق الملكية والبصائر والوكالات الشرعية من قبل فريق متخصص لمنح شارة "عقار موثق"، مما يرفع ثقة المشترين وسرعة إتمام الصفقات.`;
  }

  if (query.includes('أمان') || query.includes('حماية') || query.includes('جلسات') || query.includes('تهديد')) {
    if (user.role === 'system_admin') {
      return `بصفتك مدير النظام يا مهندس ${user.name}، يمكنك مراقبة سجل التدقيق الأمني الشامل، إدارة التهديدات، حظر عناوين IP المشبوهة، وفحص النسخ الاحتياطية من هنا:
[GO:admin|لوحة إدارة النظام والأمن الشاملة]`;
    }
    return `تعتمد منصة دلنّي أعلى معايير الحماية مع إخفاء إحداثيات العقارات بدقة تقريبية لحماية الخصوصية، وتشفير الجلسات وسجل تدقيق شامل لكافة العمليات الحساسة.
[GO:account|إدارة جلسات حسابي وأمانه]`;
  }

  if (query.includes('مكتب') || query.includes('منشأة') || query.includes('وسيط') || query.includes('وسطاء')) {
    if (user.role === 'org_manager' || user.role === 'system_admin') {
      return `أهلاً بك يا ${user.name}. يمكنك إضافة وتعيين الوسطاء العقاريين التابعين لمكتبك، وتوزيع حصص الإعلانات، ومتابعة عمولات وصفقات المنشأة مباشرة من هنا:
[GO:organization|لوحة المنشأة العقارية]`;
    }
  }

  return `أهلاً بك يا ${user.name}! أنا مساعد دلنّي الذكي، متواجد لمساعدتك في أي استفسار يتعلق بالبحث، نشر العقارات، توثيق البصائر، أو إدارة حسابك وصفقاتك.

إليك أهم الروابط السريعة التي يمكنك الانتقال إليها وفق دورك:
- [GO:search|تصفح العقارات والخريطة]
- [GO:my_ads|إدارة إعلاناتي]
- [GO:bookings|الحجوزات والصفقات]
- [GO:support|مركز الدعم الفني]`;
}
