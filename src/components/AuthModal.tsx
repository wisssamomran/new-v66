import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Lock,
  Phone,
  User as UserIcon,
  Mail,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { DalaniLogo } from './DalaniLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  redirectReason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  redirectReason
}) => {
  const { setCurrentUserRole, showToast } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('seeker');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('4829');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim() || !password.trim()) {
      showToast('يرجى إدخال رقم الهاتف أو البريد وكلمة المرور', 'warning');
      return;
    }

    // Determine role based on input or log in as active seeker/advertiser
    setCurrentUserRole('seeker');
    showToast('تم تسجيل الدخول بنجاح! مرحباً بك في دلنّي', 'success');
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }
    if (!agreeTerms) {
      showToast('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية', 'warning');
      return;
    }

    // Go to OTP confirmation step
    setMode('otp');
    setGeneratedOtp(Math.floor(1000 + Math.random() * 9000).toString());
    showToast('تم إرسال رمز التحقق إلى رقم هاتفك', 'info');
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      showToast('يرجى إدخال رمز التحقق', 'warning');
      return;
    }

    // Set user with role
    setCurrentUserRole(selectedRole);
    showToast('تم تأكيد رقم الهاتف وإنشاء الحساب بنجاح!', 'success');
    onClose();
  };

  const handleQuickRoleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    showToast(`تم تسجيل الدخول المباشر بدور: ${role}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="space-y-1">
            <DalaniLogo variant="horizontal" size="sm" />
            {redirectReason && (
              <div className="p-2 bg-amber-50 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 mt-2">
                🔒 {redirectReason}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switchers (Login vs Register) */}
        {mode !== 'otp' && mode !== 'forgot' && (
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                mode === 'login' ? 'bg-[#16324F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                mode === 'register' ? 'bg-[#16324F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {/* MODE 1: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم الهاتف أو البريد الإلكتروني:</label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneOrEmail}
                  onChange={e => setPhoneOrEmail(e.target.value)}
                  placeholder="770000000 أو user@example.com"
                  dir="ltr"
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#12A889] text-left font-medium"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">كلمة المرور:</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-[#12A889] font-bold hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#12A889] text-left font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#12A889] hover:bg-[#0f8d73] text-white font-bold rounded-xl shadow-md transition-colors text-sm mt-2"
            >
              دخول إلى الحساب
            </button>
          </form>
        )}

        {/* MODE 2: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">الاسم الكامل (كما في الهوية):</label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="الاسم الثلاثي أو الرباعي"
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم الهاتف اليمني للتواصل والتأكيد:</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="770000000"
                  dir="ltr"
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                يقبل شبكات يمن موبايل، يو (YOU)، سبأفون، أو واي
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع الحساب:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { r: 'seeker', label: 'باحث عن عقار' },
                  { r: 'advertiser', label: 'معلن فرد' },
                  { r: 'org_manager', label: 'منشأة عقارية' }
                ].map(item => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => setSelectedRole(item.r as UserRole)}
                    className={`py-2 rounded-xl border text-center font-bold transition-all ${
                      selectedRole === item.r
                        ? 'border-[#12A889] bg-[#12A889]/10 text-[#16324F]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">كلمة المرور:</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left font-mono"
              />
            </div>

            <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 text-[#12A889] rounded border-slate-300 mt-0.5"
              />
              <span className="text-slate-600 text-[11px] leading-relaxed">
                أوافق على <strong>شروط استخدام منصة دلنّي</strong> و<strong>سياسة الخصوصية وحماية الوثائق</strong>،
                وأتعهد بصحة البيانات.
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 bg-[#12A889] hover:bg-[#0f8d73] text-white font-bold rounded-xl shadow-md transition-colors text-sm mt-2"
            >
              متابعة وتأكيد رقم الهاتف
            </button>
          </form>
        )}

        {/* MODE 3: OTP PHONE VERIFICATION */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpVerify} className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="text-center space-y-1 mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#16324F]">تأكيد رقم الهاتف اليمني</h3>
              <p className="text-slate-500 text-xs">
                تم إرسال رمز التحقق إلى الرقم <span className="font-mono font-bold text-slate-800">{phone || '770000000'}</span>
              </p>
              <div className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-600 font-mono inline-block mt-1">
                رمز الاختبار التجريبي: <strong>{generatedOtp}</strong>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-center">أدخل رمز التحقق (4 أرقام):</label>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="----"
                className="w-40 mx-auto text-center py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xl font-mono tracking-widest block focus:border-[#12A889] focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#12A889] hover:bg-[#0f8d73] text-white font-bold rounded-xl shadow-md transition-colors text-sm"
            >
              تأكيد وتفعيل الحساب
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMode('register')}
                className="hover:underline text-slate-600"
              >
                تعديل رقم الهاتف
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeneratedOtp(Math.floor(1000 + Math.random() * 9000).toString());
                  showToast('تمت إعادة إرسال رمز التحقق', 'info');
                }}
                className="text-[#12A889] font-bold hover:underline"
              >
                إعادة إرسال الرمز
              </button>
            </div>
          </form>
        )}

        {/* MODE 4: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4 text-xs animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-base text-[#16324F] mb-1">استعادة كلمة المرور</h3>
              <p className="text-slate-500 mb-3">
                أدخل رقم هاتفك المسجل وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور فوراً.
              </p>
              <input
                type="tel"
                placeholder="770000000"
                dir="ltr"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                showToast('تم إرسال رابط إعادة التعيين إلى هاتفك', 'success');
                setMode('login');
              }}
              className="w-full py-2.5 bg-[#16324F] text-white font-bold rounded-xl hover:bg-[#12A889] transition-colors"
            >
              إرسال رمز الاستعادة
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full py-2 text-slate-600 font-bold hover:underline"
            >
              الرجوع لتسجيل الدخول
            </button>
          </div>
        )}

        {/* 1-CLICK ROLE QUICK TESTING BUTTONS */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#12A889]" />
            <span>تسجيل دخول سريع لتجربة صلاحيات الأدوار:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('seeker')}
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 transition-colors"
            >
              🔍 باحث عن عقار
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('advertiser')}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition-colors"
            >
              🏡 معلن فرد موثق
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('org_manager')}
              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 transition-colors"
            >
              🏢 مدير منشأة
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('org_agent')}
              className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold border border-cyan-200 transition-colors"
            >
              👨‍💼 وكيل منشأة
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('moderator')}
              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 transition-colors"
            >
              🛡️ مراجع المحتوى
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('verifier')}
              className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 transition-colors"
            >
              📜 مسؤول التحقق
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('reporter_admin')}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 transition-colors"
            >
              ⚖️ مسؤول البلاغات
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('support')}
              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 transition-colors"
            >
              🎧 الدعم الفني
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('system_admin')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold border border-slate-700 transition-colors"
            >
              ⚙️ مدير النظام
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
