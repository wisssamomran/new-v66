import React from 'react';
import { DalaniLogo } from './DalaniLogo';
import { ShieldCheck, Phone, Mail, MapPin, CheckCircle, Info } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#16324F] text-white pt-14 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-slate-700/80">
          {/* Brand Col */}
          <div className="space-y-4">
            <DalaniLogo variant="full" theme="white" size="md" />
            <p className="text-xs text-slate-300 leading-relaxed">
              «دلنّي» هي المنصة العقارية الرقمية اليمنية المخصصة لاكتشاف العقارات، والبحث المتقدم والخريطة التفاعلية، وتنظيم
              إعلانات الأفراد والمنشآت العقارية بمعايير حقيقية وشفافة تلائم السوق المحلي.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#12A889] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>موثوقية النشر والفصل التام في الصلاحيات</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm text-white mb-4 border-r-2 border-[#12A889] pr-2.5">روابط المنصة</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#12A889] transition-colors">
                  الرئيسية
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('search')} className="hover:text-[#12A889] transition-colors">
                  استكشف خريطة العقارات
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('wizard')} className="hover:text-[#12A889] transition-colors">
                  إضافة إعلان عقاري
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('help')} className="hover:text-[#12A889] transition-colors">
                  مركز المساعدة والأسئلة الشائعة
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('help')} className="hover:text-[#12A889] transition-colors">
                  تقديم بلاغ عن إعلان مخالف
                </button>
              </li>
            </ul>
          </div>

          {/* Governance & Real Estate In Yemen */}
          <div>
            <h4 className="font-bold text-sm text-white mb-4 border-r-2 border-[#12A889] pr-2.5">المحافظات المغطاة</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <span className="hover:text-white cursor-default">• صنعاء (الأمانة)</span>
              <span className="hover:text-white cursor-default">• عدن</span>
              <span className="hover:text-white cursor-default">• تعز</span>
              <span className="hover:text-white cursor-default">• حضرموت (المكلا)</span>
              <span className="hover:text-white cursor-default">• إب</span>
              <span className="hover:text-white cursor-default">• مأرب</span>
              <span className="hover:text-white cursor-default">• الحديدة</span>
              <span className="hover:text-white cursor-default">• ذمار</span>
            </div>
          </div>

          {/* Standards & Transparency Box */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-xs space-y-2.5">
            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              <span>ميثاق الشفافية العقارية</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              نلتزم بعدم عرض أي شارة أو ادعاء تنظيمي دون إثبات فعلي. شارات تأكيد الهاتف توثق وسيلة الاتصال ولا تعني ضمان
              ملكية العقار. نحث المشترين دوماً على التحري الشرعي والمعاينة الميدانية.
            </p>
            <div className="pt-1 text-[11px] text-slate-400">
              الدعم الفني: <span className="font-mono text-white">770000000</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>جميع الحقوق محفوظة © {new Date().getFullYear()} لمنصة «دلنّي» العقارية اليمنية.</div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('help')} className="hover:text-white transition-colors">
              شروط الاستخدام
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('help')} className="hover:text-white transition-colors">
              سياسة الخصوصية وحماية الوثائق
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('help')} className="hover:text-white transition-colors">
              سياسة البلاغات
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
