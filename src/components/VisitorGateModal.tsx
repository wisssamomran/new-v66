import React from 'react';
import { Lock, ArrowRight, UserPlus, LogIn, Sparkles } from 'lucide-react';
import { DalaniLogo } from './DalaniLogo';

interface VisitorGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const VisitorGateModal: React.FC<VisitorGateModalProps> = ({
  isOpen,
  onClose,
  title = 'تسجيل الدخول مطلوب للمتابعة',
  message = 'هذه الميزة مخصصة للمستخدمين المسجلين في منصة دلنّي لضمان حماية البيانات ومتابعة الطلبات.',
  onOpenAuth
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-black text-lg text-[#16324F]">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{message}</p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onOpenAuth('login');
            }}
            className="w-full py-3 bg-[#16324F] hover:bg-[#12A889] text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول إلى حسابي</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAuth('register');
            }}
            className="w-full py-3 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>إنشاء حساب جديد بالهاتف</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            الاستمرار كزائر وتصفح العقارات
          </button>
        </div>
      </div>
    </div>
  );
};
