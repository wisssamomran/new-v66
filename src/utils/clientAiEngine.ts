import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { User } from '../types';

export interface ClientAiResult {
  text: string;
  modelUsed: string;
  navigationSuggestions?: Array<{ view: string; title: string }>;
}

const ROLE_TITLES: Record<string, string> = {
  visitor: 'زائر المنصة',
  seeker: 'باحث عن عقار',
  advertiser: 'معلن عقاري (فردي / مالك)',
  org_manager: 'مدير منشأة عقارية',
  org_agent: 'وسيط عقاري معتمد',
  moderator: 'مشرف مراجعة المحتوى',
  verifier: 'مدقق الوثائق والصكوك',
  reporter_admin: 'مسؤول البلاغات والنزاعات',
  support: 'أخصائي الدعم الفني',
  system_admin: 'مدير النظام التقني'
};

const SCREEN_LABELS: Record<string, string> = {
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

export function extractNavigationTags(text: string): Array<{ view: string; title: string }> {
  const suggestions: Array<{ view: string; title: string }> = [];
  const regex = /\[GO:([a-z_]+)\|([^\]]+)\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const view = match[1];
    const title = match[2];
    if (view && title && !suggestions.some(s => s.view === view)) {
      suggestions.push({ view, title });
    }
  }
  return suggestions;
}

export function generateClientAiResponse(
  user: User,
  messageText: string,
  currentView: string = 'home'
): ClientAiResult {
  const query = messageText.toLowerCase().trim();
  const userRoleTitle = ROLE_TITLES[user.role] || 'مستخدم منصة دلنّي';
  const userName = user.name || 'عزيزي المستفيد';

  let response = '';
  let modelUsed = 'dalani-client-ai-engine';

  // 1. Greeting & Identity
  if (query.includes('مرحبا') || query.includes('أهلا') || query.includes('السلام عليكم') || query.includes('من انت') || query.includes('من أنت')) {
    response = `أهلاً وسهلاً بك يا ${userName}! 👋\n\nأنا **مساعد «دلنّي» الذكي**، منصتك العقارية الموثوقة في اليمن.\nبصفتك **${userRoleTitle}**، يسعدني جداً مساعدتك في الوصول السريع لكافة الخدمات والإجابة على أي استفسارات تخص العقارات، الحجوزات، أو الصكوك في اليمن.\n\n[GO:search|تصفح الخريطة والعقارات] [GO:bookings|متابعة الحجوزات والصفقات]`;
  }
  // 2. Search & Map Query
  else if (query.includes('بحث') || query.includes('خريطة') || query.includes('صنعاء') || query.includes('عدن') || query.includes('تعز') || query.includes('شقة') || query.includes('أرض') || query.includes('بيت') || query.includes('إيجار') || query.includes('بيع')) {
    response = `أهلاً بك يا ${userName}! 🏡\n\nيمكنك البحث عن العقارات وتصفيتها بدقة عالية عبر **الخريطة التفاعلية والبحث المتقدم**:\n\n1. **تحديد المحافظة والحي:** يمكنك التصفية حسب صنعاء، عدن، تعز، إب، أو حضرموت.\n2. **نوع العقار:** شقق سكنية، أراضي، فلل، أو مقرات تجارية.\n3. **عملة السعر:** يدعم النظام العرض بالريال اليمني (YER)، الدولار (USD)، والريال السعودي (SAR).\n4. **الحجز المؤقت:** عند اختيار عقار، يمكنك تقديم طلب حجز مؤقت وقفل التعامل لمنع أي تعارض.\n\nاضغط أدناه للانتقال المباشر للبحث المتقدم:\n[GO:search|انتقل إلى الخريطة والبحث المتقدم]`;
  }
  // 3. Booking / Temporary Reservation Query
  else if (query.includes('حجز') || query.includes('صفقة') || query.includes('معاينة') || query.includes('تأكيد')) {
    response = `أهلاً بك يا ${userName}! 📝\n\n**ميزة الحجز المؤقت الحصري في منصة «دلنّي»:**\n\n- تُتيح لك تقديم طلب رسمي لمعاينة العقار وتجميد العروض مؤقتاً لتجنب المنافسة.\n- يتم تحديد مدة الحجز (24 ساعة إلى 7 أيام) بالاتفاق مع المعلن.\n- يمكنك متابعة حالة طلبك وتفاصيل العقد في شاشة الحجوزات.\n\nاضغط هنا لمعاينة كافة طلباتك وحجوزاتك الحالية:\n[GO:bookings|الانتقال لمساحة الحجوزات والصفقات]`;
  }
  // 4. Add Listing / Advertiser Query
  else if (query.includes('إضافة') || query.includes('إعلان') || query.includes('نشر') || query.includes('عرض عقار')) {
    response = `أهلاً بك يا ${userName}! ➕\n\nإضافة إعلان عقاري جديد في «دلنّي» تتم عبر معالج ذكي خطوة بخطوة:\n\n1. **تحديد نوع العقار:** (بيع أو إيجار - سكني أو تجاري).\n2. **الموقع على الخريطة:** تحديد الإحداثيات والمافظة والحي بدقة.\n3. **الصور والمعلومات:** رفع الصور وتحديد السعر والمرافق المتاحة.\n4. **توثيق الملكية:** إرفاق صورة البصيرة أو الصك الشرعي للحصول على شارة التوثيق.\n\n[GO:wizard|بدء إضافة إعلان جديد] [GO:my_ads|إدارة إعلاناتي الحالية]`;
  }
  // 5. Verification & Deed (Basira) Query
  else if (query.includes('بصيرة') || query.includes('صك') || query.includes('توثيق') || query.includes('شارة')) {
    response = `مرحباً بك يا ${userName}! 🛡️\n\n**شارات التوثيق العقاري في منصة «دلنّي»:**\n\nتُمنح شارة التوثيق الذهبية بعد فحص ودراسة الصكوك والبصائر الشرعية اليمنية ومطابقتها مع السجلات الرسمية لحماية المشتري والمستأجر وضمان صحة الملكية.\n\n[GO:verification|فحص لوحة التوثيق والوثائق]`;
  }
  // 6. Support & Account Query
  else if (query.includes('دعم') || query.includes('مساعدة') || query.includes('حساب') || query.includes('هاتف') || query.includes('رقم')) {
    response = `أهلاً بك يا ${userName}! 📞\n\nيمكنك إشعار فريق الدعم الفني مباشرة أو تعديل بيانات حسابك ورقم هاتفك اليمني المعتمد من خلال الخيارات المتاحة:\n\n[GO:support|مركز المساعدة وتذاكر الدعم] [GO:account|إعدادات حسابي والجلسات]`;
  }
  // 7. General Fallback with Smart Guidance
  else {
    response = `أهلاً بك يا ${userName}! 🌟\n\nأنا هنا لمساعدتك في كل ما يتعلق بالمنصة العقارية. استناداً لصفحة **[${SCREEN_LABELS[currentView] || currentView}]** ودورك الحقيقي كـ **${userRoleTitle}**، يمكنك استخدام الخيارات أدناه للتنقل المباشر:\n\n- **البحث عن عقار:** تصفح الخريطة التفاعلية والفلاتر.\n- **إدارة الحجوزات:** متابعة العروض والمعاينات الحية.\n- **إضافة إعلان:** نشر عقارك مع ضمانات التوثيق.\n\n[GO:search|تصفح الخريطة والبحث] [GO:bookings|متابعة الحجوزات والصفقات] [GO:home|العودة للرئيسية]`;
  }

  const navigationSuggestions = extractNavigationTags(response);

  return {
    text: response,
    modelUsed,
    navigationSuggestions
  };
}

export async function generateClientAiResponseAsync(
  user: User,
  messageText: string,
  history: Array<{ role: string; text: string }> = [],
  currentView: string = 'home'
): Promise<ClientAiResult> {
  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    localStorage.getItem('dalani_gemini_key') ||
    '';
  const apiKey = envKey ? String(envKey).trim() : '';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const roleTitle = ROLE_TITLES[user.role] || 'مستخدم منصة دلنّي';
      const screenName = SCREEN_LABELS[currentView] || currentView;

      const systemInstruction = `أنت «مساعد دلنّي الذكي» (Dalani AI Assistant)، المساعد الذكي والخبير العقاري الشامل لمنصة «دلنّي» - كبرى المنصات العقارية الرقمية في الجمهورية اليمنية 🇾🇪.

بيانات المستخدم الحالي الذي تتحدث معه الآن:
- الاسم: ${user.name}
- الدور الحالي في النظام: ${roleTitle} (رمز الدور: ${user.role})
- الشاشة الحالية التي يتواجد بها المستخدم الآن: ${screenName} (رمز الشاشة: ${currentView})
- هاتف المستخدم الموثق: ${user.phone || 'غير مسجل'}

قواعد أساسية صارمة يجب الالتزام بها:
1. خاطب المستخدم باسمه وصفته ودوره تلقائياً. أنت تعرفه مسبقاً وتعرف كافة مجريات المنصة.
2. اشرح وأجب على أي استفسار وفق حدود صلاحيات دوره والسياق العقاري اليمني (صنعاء، عدن، تعز، إب، حضرموت، الريال اليمني، الدولار، البصائر الشرعية، شارات التوثيق).
3. التوجيه الذكي إلى الشاشات (Navigation Action Tags):
   عندما تصف للمستخدم كيف يصل لمكان أو تحل مشكلته، أضف رابط انتقال ذكي بصيغة [GO:target_view|نص الزر] لتمكين المستخدم من النقر عليه والانتقال مباشرة!
   الشاشات المتاحة:
   - wizard (إضافة إعلان جديد)
   - my_ads (إدارة إعلاناتي)
   - search (البحث والخريطة)
   - bookings (الحجوزات والصفقات)
   - verification (لوحة التحقق وتدقيق الصكوك)
   - moderation (لوحة مراجعة المحتوى)
   - organization (لوحة المنشأة العقارية)
   - admin (لوحة إدارة النظام)
   - support (مركز الدعم والمساعدة)
   - account (إعدادات حسابي والجلسات)
   - favorites (المفضلة)
   - home (الصفحة الرئيسية)
4. احرص على أن تكون إجاباتك دقيقة، منظمة بنقاط سهلة القراءة، بلهجة عربية راقية وعصرية تليق بالسياق اليمني مع روح الترحيب والتعاون.`;

      const contents: any[] = [];
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: messageText }]
      });

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
      for (const model of candidateModels) {
        try {
          const generatePromise = ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
              ...(model === 'gemini-3.1-flash-lite' || model === 'gemini-2.5-flash' ? {
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.MINIMAL
                }
              } : {})
            }
          });

          // 7-second timeout for fast responsive chat
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI response timed out')), 7000)
          );

          const res = await Promise.race([generatePromise, timeoutPromise]);

          if (res && res.text) {
            const navigationSuggestions = extractNavigationTags(res.text);
            return {
              text: res.text,
              modelUsed: `${model} (Reasoning Thinking Engine)`,
              navigationSuggestions
            };
          }
        } catch (mErr) {
          console.warn(`[Client Gemini] Model ${model} attempt failed:`, mErr);
        }
      }
    } catch (err) {
      console.warn('[Client Gemini] Direct API call error:', err);
    }
  }

  // Fallback to local intelligent Arabic engine
  return generateClientAiResponse(user, messageText, currentView);
}
