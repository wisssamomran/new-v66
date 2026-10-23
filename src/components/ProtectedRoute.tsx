import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldAlert, Lock, ArrowRight, UserCheck } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  moduleTitle: string;
  onNavigateHome: () => void;
  onOpenRoleSwitcher: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
  moduleTitle,
  onNavigateHome,
  onOpenRoleSwitcher
}) => {
  const { currentUser } = useApp();

  const isAllowed = allowedRoles.includes(currentUser.role);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border-2 border-rose-200 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          وصول محجوب بقواعد الصلاحيات (RBAC)
        </span>
        <h2 className="text-xl md:text-2xl font-black text-[#16324F]">
          غير مصرح لك بالوصول إلى {moduleTitle}
        </h2>
        <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          وفقاً لدليل الصلاحيات المعياري لمنصة «دلنّي»، يتطلب هذا القسم أحد الأدوار التالية:{' '}
          <strong className="text-slate-800">{allowedRoles.join(' أو ')}</strong>، بينما دورك الحالي هو:{' '}
          <strong className="text-rose-600">{currentUser.name} ({currentUser.role})</strong>.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          العودة للرئيسية
        </button>

        <button
          onClick={onOpenRoleSwitcher}
          className="px-5 py-2.5 bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          <span>تبديل الدور للمعاينة</span>
        </button>
      </div>
    </div>
  );
};
