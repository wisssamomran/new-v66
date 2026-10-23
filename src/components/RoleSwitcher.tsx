import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Users,
  Shield,
  Eye,
  Search,
  Building,
  UserCheck,
  FileCheck,
  Flag,
  Headphones,
  Settings,
  ChevronDown,
  CheckCircle2,
  Lock,
  Sparkles,
  CreditCard
} from 'lucide-react';

export interface RoleOption {
  role: UserRole;
  title: string;
  badge: string;
  icon: React.ReactNode;
  color: string;
  allowed: string[];
  restricted: string[];
}

export const ROLES_INFO: RoleOption[] = [
  {
    role: 'visitor',
    title: 'زائر غير مسجل',
    badge: 'عام',
    icon: <Eye className="w-4 h-4" />,
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    allowed: ['تصفح الإعلانات المنشورة والنشطة', 'البحث والفلترة وعرض الخريطة', 'معاينة مواصفات العقار والحي والأسعار', 'مركز المساعدة والسياسات'],
    restricted: ['المسودات والإعلانات المعلقة والمرفوضة', 'المفضلة وحفظ العقارات (تتطلب تسجيلاً)', 'التواصل والاتصال المباشر (يتطلب تسجيلاً)', 'إضافة ونشر الإعلانات', 'لوحات الإدارة والمراجعة وسجل التدقيق']
  },
  {
    role: 'seeker',
    title: 'باحث مسجل عن عقار',
    badge: 'مستخدم',
    icon: <Search className="w-4 h-4" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    allowed: ['جميع صلاحيات الزائر', 'إدارة المفضلة الشخصية', 'إرسال تذاكر الدعم والاستفسارات', 'إعدادات الحساب الشخصي'],
    restricted: ['لوحة إعلانات المعلنين', 'بيانات المستخدمين الخاصة', 'لوحات الإشراف والتحقق']
  },
  {
    role: 'advertiser',
    title: 'معلن فرد موثق',
    badge: 'معلن',
    icon: <Building className="w-4 h-4" />,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    allowed: ['إنشاء إعلان وحفظه كمسودة', 'إرسال الإعلان للمراجعة', 'متابعة سجل انتقالات الحالة', 'استكمال النواقص وإعادة التقديم'],
    restricted: ['اعتماد إعلانه بنفسه', 'رؤية مسودات أو وثائق الآخرين', 'منح نفسه صفات غير مثبتة']
  },
  {
    role: 'org_manager',
    title: 'مدير منشأة عقارية',
    badge: 'منشأة',
    icon: <Building className="w-4 h-4" />,
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    allowed: ['إدارة ملف المنشأة وبياناتها', 'دعوة الموظفين وتفعيل عضوياتهم', 'إسناد الإعلانات لأعضاء المنشأة', 'تقارير إعلانات المنشأة'],
    restricted: ['منشآت ومكاتب أخرى', 'المستندات الشخصية غير اللازمة']
  },
  {
    role: 'org_agent',
    title: 'موظف إعلانات منشأة',
    badge: 'موظف',
    icon: <UserCheck className="w-4 h-4" />,
    color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    allowed: ['إنشاء الإعلانات المسندة إليه', 'استكمال بيانات الإعلانات المفوض بها', 'متابعة حالات إعلاناته'],
    restricted: ['إعدادات المنشأة الحساسة', 'دعوة أو تعديل صلاحيات الأعضاء', 'إعلانات زملائه غير المفوض بها']
  },
  {
    role: 'moderator',
    title: 'مسؤول مراجعة المحتوى',
    badge: 'مراجعة',
    icon: <FileCheck className="w-4 h-4" />,
    color: 'bg-amber-50 text-amber-800 border-amber-300',
    allowed: ['عرض طابور الإعلانات المنتظرة', 'اعتماد الإعلان أو رفضه المسبب', 'طلب استكمال البيانات الناقصة', 'إيقاف الإعلان المخالف'],
    restricted: ['اعتماد إعلان أنشأه بنفسه', 'الاطلاع على وثائق الهوية والملكية الخاصة دون تكليف', 'تعديل قواعد البيانات']
  },
  {
    role: 'verifier',
    title: 'مسؤول التحقق والوثائق',
    badge: 'تحقق',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-teal-50 text-teal-800 border-teal-300',
    allowed: ['مراجعة طلبات التحقق للمعلنين', 'الاطلاع الآمن على وثائق الهوية والبصائر', 'منح شارات التحقق المحددة والمعللة', 'تسجيل مصدر التحقق وتاريخه'],
    restricted: ['نشر المستندات الخاصة للعامة', 'منح شارات غير مثبتة أو ادعاءات غير مدعومة']
  },
  {
    role: 'reporter_admin',
    title: 'مسؤول البلاغات والقضايا',
    badge: 'بلاغات',
    icon: <Flag className="w-4 h-4" />,
    color: 'bg-rose-50 text-rose-800 border-rose-300',
    allowed: ['فحص قائمة البلاغات وأولوياتها', 'معاينة نسخة الإعلان وقت البلاغ', 'إيقاف الإعلان مؤقتاً عند الخطورة', 'اتخاذ قرار معلل في القضية'],
    restricted: ['كشف هوية مقدم البلاغ للمعلن', 'حذف الإعلان تلقائياً دون دليل أو قرار معلل']
  },
  {
    role: 'support',
    title: 'مسؤول الدعم الفني',
    badge: 'دعم',
    icon: <Headphones className="w-4 h-4" />,
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    allowed: ['استقبال تذاكر المستخدمين والرد عليها', 'تصنيف التذاكر وتحديث حالتها', 'تصعيد التذاكر الفنية', 'إدارة الأسئلة الشائعة'],
    restricted: ['الاطلاع على مستندات التحقق الحساسة', 'تعديل أدوار أو صلاحيات المستخدمين']
  },
  {
    role: 'accountant',
    title: 'المحاسب والإدارة المالية',
    badge: 'مالية',
    icon: <CreditCard className="w-4 h-4" />,
    color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    allowed: ['متابعة الإعلانات المدفوعة والمميزة', 'فحص الإعلانات بانتظار سداد الرسوم', 'متابعة الاشتراكات وحالات التحصيل', 'تقارير الأداء المالي'],
    restricted: ['تعديل المواصفات الفنية أو إحداثيات العقار', 'الاطلاع على وثائق الهوية الخاصة غير المالية']
  },
  {
    role: 'system_admin',
    title: 'مدير النظام وسجل التدقيق',
    badge: 'إدارة عليا',
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-slate-900 text-white border-slate-700',
    allowed: ['إدارة الحسابات والأدوار', 'إدارة قواميس المحافظات والمدن', 'مراجعة سجل التدقيق الشامل', 'إعدادات الهوية والمنصة'],
    restricted: ['لا يظهر محرر SQL أو كلمات المرور في واجهة الإنتاج', 'العمليات الحساسة مسجلة وجوباً بالسجل']
  }
];

export const RoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUserRole, resetToInitialData } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleInfo = ROLES_INFO.find(r => r.role === currentUser.role) || ROLES_INFO[0];

  return (
    <>
      {/* Top Floating Pill for Easy Demo Role Testing */}
      <div className="bg-[#16324F] text-white px-3 py-1.5 text-xs border-b border-slate-700/80 flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="font-bold text-slate-300 whitespace-nowrap flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#12A889]" />
            <span>نظام الصلاحيات (RBAC):</span>
          </span>

          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all font-bold text-white border border-white/20"
          >
            <span className="w-2 h-2 rounded-full bg-[#12A889]"></span>
            <span>الدور الحالي: {currentRoleInfo.title}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden md:inline">
            اضغط لتبديل الأدوار واختبار قيود العزل والصلاحيات الـ 10
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="px-2.5 py-1 text-[11px] bg-[#12A889] hover:bg-[#0f8d73] text-white font-bold rounded-md transition-colors"
          >
            تبديل الدور
          </button>
        </div>
      </div>

      {/* Role Switcher Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-black text-lg text-[#16324F] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#12A889]" />
                  <span>محاكي الأدوار والصلاحيات - منصة دلنّي</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  اختر أي دور لمحاكاة تجربة الاستخدام والتحقق من تطبيق قواعد الصلاحيات والقيود بدقة
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {ROLES_INFO.map(item => {
                const isSelected = item.role === currentUser.role;
                return (
                  <div
                    key={item.role}
                    onClick={() => {
                      setCurrentUserRole(item.role);
                      setIsOpen(false);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#12A889] bg-[#12A889]/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#16324F] flex items-center gap-1.5">
                            <span>{item.title}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#12A889]" />}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-400">{item.badge}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px] mt-2 pt-2 border-t border-slate-100">
                      <div>
                        <span className="font-bold text-emerald-700">✓ مسموح: </span>
                        <span className="text-slate-600">{item.allowed.slice(0, 2).join(' • ')}</span>
                      </div>
                      <div>
                        <span className="font-bold text-rose-700">✕ محجوب: </span>
                        <span className="text-slate-500">{item.restricted.slice(0, 2).join(' • ')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={resetToInitialData}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
              >
                استعادة بيانات المشروع الافتراضية
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-[#16324F] text-white text-xs font-bold rounded-xl hover:bg-[#12A889] transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
