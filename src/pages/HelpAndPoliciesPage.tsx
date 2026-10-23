import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  HelpCircle,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ChevronDown,
  Phone,
  MessageCircle,
  Mail,
  Lock,
  Flag,
  Send
} from 'lucide-react';

interface HelpAndPoliciesPageProps {
  onNavigateToSupport?: () => void;
}

export const HelpAndPoliciesPage: React.FC<HelpAndPoliciesPageProps> = ({ onNavigateToSupport }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeSection, setActiveSection] = useState<'faqs' | 'terms' | 'privacy' | 'reporting'>('faqs');

  const faqs = [
    {
      q: 'كيف تضمن منصة «دلنّي» صحة الإعلانات العقارية المعروضة؟',
      a: 'تخضع جميع الإعلانات للمراجعة الميدانية والتدقيق من قبل فريق الإشراف قبل نشرها للعامة. نتأكد من وضوح الأسعار بالعملات المعتمدة (الريال اليمني، الدولار، أو الريال السعودي)، وسلامة الصور ومطابقتها للموقع الجغرافي المعلن، ومنع الإعلانات المضللة أو الوهمية.'
    },
    {
      q: 'ماذا تعني شارة «وثيقة البصيرة راجعها الفريق»؟',
      a: 'تعني أن المعلن قام برفع وثيقة البصيرة الشرعية أو صك الملكية وقام المحقق القانوني بمطابقة الحدود والمساحة والاسم. نؤكد دوماً أن هذه الشارة هي إجراء فحص مكتبي إضافي ولا تلغي وجوب إجراءات التحري الشرعي والمعاينة الميدانية التقليدية عند إبرام أي عقد شراء.'
    },
    {
      q: 'هل توجد رسوم ترويج مدفوعة أو باقات إجبارية؟',
      a: 'لا. في الإصدار الحالي من منصة «دلنّي»، تم استبعاد أي أنظمة ترويج مدفوع أو باقات اشتراك لحين ربط بوابات دفع إلكترونية يمنية معتمدة ومرخصة رسمياً. الترتيب يخضع لمعايير الجودة والتحديث الفعلي فقط.'
    },
    {
      q: 'كيف أقدم بلاغاً عن إعلان مشبوه أو عقار تم بيعه مسبقاً؟',
      a: 'يمكنك فتح صفحة تفاصيل أي إعلان والضغط على زر «إبلاغ عن مخالفة»، وتحديد نوع المخالفة وإرفاق الملاحظات. نضمن لك السرية التامة لهويتك ورقم هاتفك، ولن يتم إطلاع المعلن على بياناتك أبداً.'
    },
    {
      q: 'كيف يمكن للمنشآت والمكاتب العقارية توثيق حساباتها؟',
      a: 'يمكن لمدير المنشأة رفع صورة السجل التجاري اليمني الساري والتفويض الرسمي عبر لوحة التحقق، ليتم فحصها ومنح المنشأة شارة «ملف المنشأة مراجع» وإتاحة إدارة موظفيها وإسناد الإعلانات لهم.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12A889]/10 text-[#12A889] text-xs font-bold border border-[#12A889]/20">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>مركز الشفافية والمساعدة القانونية</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#16324F]">دليل الاستخدام والسياسات المعتمدة</h1>
        <p className="text-xs text-slate-500">
          معلومات شفافة وشاملة حول معايير النشر، شروط الاستخدام، وحماية البيانات الشخصية في السوق العقاري اليمني
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold flex-wrap">
        {[
          { id: 'faqs', label: 'الأسئلة الشائعة للسوق اليمني' },
          { id: 'terms', label: 'شروط استخدام المنصة' },
          { id: 'privacy', label: 'سياسة الخصوصية وحماية الوثائق' },
          { id: 'reporting', label: 'سياسة تقديم البلاغات' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeSection === tab.id
                ? 'bg-[#16324F] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on Active Section */}
      {activeSection === 'faqs' && (
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-right font-bold text-sm md:text-base text-[#16324F] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-[#12A889]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-xs md:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeSection === 'terms' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs leading-relaxed text-slate-700">
          <h3 className="font-bold text-base text-[#16324F] mb-2">شروط وأحكام استخدام منصة «دلنّي» العقارية:</h3>
          <p>
            1. يلتزم المعلن بتقديم بيانات صحيحة ودقيقة عن العقار المعروض تشمل موقعه الجغرافي الفعلي، نوعه، مساحته، والسعر
            المطلوب بالعملة المحددة دون أي تضليل.
          </p>
          <p>
            2. يحظر تماماً نشر إعلانات لعقارات متنازع عليها قضائياً أو من غير مالكها الأصلي أو وكيلها الشرعي المعتمد بمسوغ
            قانوني.
          </p>
          <p>
            3. لا تعتبر المنصة طرفاً في أي تعاقد مالي أو إبرام بصيرة أو عقد إيجار؛ وتنحصر مسؤوليتها في الوساطة الرقمية وتسهيل
            الوصول بين الأطراف وفق المعايير التقنية المعلنة.
          </p>
          <p>
            4. تحتفظ إدارة المنصة بالحق في تعليق أو حذف أي إعلان يثبت عدم صحته أو تقديم بلاغات موثقة ضده بعد التحقق المسبب.
          </p>
        </div>
      )}

      {activeSection === 'privacy' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs leading-relaxed text-slate-700">
          <h3 className="font-bold text-base text-[#16324F] mb-2">سياسة الخصوصية وحماية الوثائق الحساسة (Private Vault):</h3>
          <p>
            1. <strong>المستندات الخاصة:</strong> تُحفظ صور البطاقات الشخصية وجوازات السفر والبصائر الشرعية والسجلات التجارية في
            مساحة خادم خاصة ومشفرة لا يمكن الوصول إليها عبر روابط عامة أو عبر محركات البحث.
          </p>
          <p>
            2. <strong>صلاحية الاطلاع:</strong> تقتصر صلاحية فحص المستندات على مسؤولي التحقق المفوضين حصراً لغرض منح شارات
            التحقق والتأكد من مطابقة السجلات.
          </p>
          <p>
            3. <strong>إخفاء الموقع الدقيق:</strong> توفر المنصة ميزة إظهار الموقع التقريبي للعقار للجمهور العام لحماية خصوصية
            أصحاب العقارات وسكانها.
          </p>
        </div>
      )}

      {activeSection === 'reporting' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs leading-relaxed text-slate-700">
          <h3 className="font-bold text-base text-[#16324F] mb-2">سياسة وضوابط البلاغات والنزاعات:</h3>
          <p>
            1. <strong>سرية المبلّغ:</strong> لن يتم كشف اسم أو بيانات الشخص المبلّغ للمعلن تحت أي ظرف، لمنع الاحتكاكات أو
            الملاحقات الشخصية.
          </p>
          <p>
            2. <strong>عدم الحذف التلقائي:</strong> لا يتم حذف الإعلان لمجرد تلقي بلاغ كيدي أو منفرد؛ بل يمر البلاغ بمرحلة فحص
            أولي من قبل مسؤول البلاغات ومراجعة الأدلة.
          </p>
          <p>
            3. <strong>حق التوضيح:</strong> للمعلن حق تقديم توضيح حول البلاغ قبل اتخاذ أي إجراء نهائي ما لم تكن هناك خطورة
            واضحة أو انتحال شخصية صريح.
          </p>
        </div>
      )}

      {/* Direct Contact Bar */}
      <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-[#16324F]">هل تحتاج إلى مساعدة إضافية أو استفسار فني؟</h4>
          <p className="text-xs text-slate-500 mt-0.5">فريق دعم دلنّي متاح للرد على استفساراتكم عبر تذاكر الدعم والاتصال المباشر</p>
        </div>

        {onNavigateToSupport && (
          <button
            onClick={onNavigateToSupport}
            className="px-5 py-2.5 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>فتح تذكرة دعم فني</span>
          </button>
        )}
      </div>
    </div>
  );
};
