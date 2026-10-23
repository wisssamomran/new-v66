import React, { useState } from 'react';
import { DalaniLogo } from './DalaniLogo';
import { useApp } from '../context/AppContext';
import {
  Menu,
  X,
  Building2,
  FileCheck,
  Shield,
  Flag,
  Headphones,
  Settings,
  HelpCircle,
  MapPin,
  Compass,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  CalendarCheck
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenRoleSwitcher: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenRoleSwitcher
}) => {
  const { currentUser, setCurrentUserRole, favorites, requests, bookings, showToast } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isVisitor = currentUser.role === 'visitor';

  // Booking & Request notification badges
  const seekerBookingsCount = bookings.filter(b => b.seekerId === currentUser.id && b.status === 'active').length;
  const incomingRequestsCount = requests.filter(r => r.status === 'pending' && (
    currentUser.role === 'system_admin' || r.advertiserId === currentUser.id
  )).length;

  // Role permissions checks for nav items
  const canSeeMyAds = ['advertiser', 'org_manager', 'org_agent', 'system_admin'].includes(currentUser.role);
  const canSeeModeration = ['moderator', 'system_admin'].includes(currentUser.role);
  const canSeeVerification = ['verifier', 'system_admin'].includes(currentUser.role);
  const canSeeOrg = ['org_manager', 'org_agent', 'system_admin'].includes(currentUser.role);
  const canSeeReports = ['reporter_admin', 'system_admin'].includes(currentUser.role);
  const canSeeSupportAdmin = ['support', 'system_admin'].includes(currentUser.role);
  const canSeeSystemAdmin = currentUser.role === 'system_admin';

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setCurrentUserRole('visitor');
    showToast('تم تسجيل الخروج بنجاح. أنت تتصفح الآن كزائر عام', 'info');
    onNavigate('home');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="cursor-pointer" onClick={() => handleNavClick('home')}>
            <DalaniLogo variant="horizontal" size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                currentView === 'home'
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#12A889] hover:bg-slate-50'
              }`}
            >
              الرئيسية
            </button>

            <button
              onClick={() => handleNavClick('search')}
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 ${
                currentView === 'search'
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#12A889] hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4 text-[#12A889]" />
              <span>استكشف الخريطة والعقارات</span>
            </button>

            {/* Role Specific Navigation */}
            {canSeeMyAds && (
              <button
                onClick={() => handleNavClick('my_ads')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                  currentView === 'my_ads'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#12A889] hover:bg-slate-50'
                }`}
              >
                إعلاناتي
              </button>
            )}

            {/* Bookings & Requests Navigation Button */}
            {!isVisitor && (
              <button
                onClick={() => handleNavClick('bookings')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  currentView === 'bookings'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#12A889] hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-[#12A889]" />
                <span>{canSeeMyAds ? 'الطلبات والحجوزات' : 'طلباتي وحجوزاتي'}</span>
                {canSeeMyAds && incomingRequestsCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold font-mono animate-pulse">
                    {incomingRequestsCount}
                  </span>
                ) : !canSeeMyAds && seekerBookingsCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold font-mono">
                    {seekerBookingsCount}
                  </span>
                ) : null}
              </button>
            )}

            {canSeeModeration && (
              <button
                onClick={() => handleNavClick('moderation')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1 ${
                  currentView === 'moderation'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>مراجعة الإعلانات</span>
              </button>
            )}

            {canSeeVerification && (
              <button
                onClick={() => handleNavClick('verification')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1 ${
                  currentView === 'verification'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-teal-800 hover:bg-teal-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                <span>لوحة التحقق</span>
              </button>
            )}

            {canSeeOrg && (
              <button
                onClick={() => handleNavClick('organization')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1 ${
                  currentView === 'organization'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-indigo-800 hover:bg-indigo-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>المنشأة العقارية</span>
              </button>
            )}

            {canSeeReports && (
              <button
                onClick={() => handleNavClick('reports')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1 ${
                  currentView === 'reports'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-rose-800 hover:bg-rose-50'
                }`}
              >
                <Flag className="w-3.5 h-3.5 text-rose-600" />
                <span>لوحة البلاغات</span>
              </button>
            )}

            {canSeeSupportAdmin && (
              <button
                onClick={() => handleNavClick('support')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1 ${
                  currentView === 'support'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-purple-800 hover:bg-purple-50'
                }`}
              >
                <Headphones className="w-3.5 h-3.5 text-purple-600" />
                <span>تذاكر الدعم</span>
              </button>
            )}

            {canSeeSystemAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1 ${
                  currentView === 'admin'
                    ? 'bg-[#16324F] text-white shadow-xs'
                    : 'text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>الإدارة والتدقيق</span>
              </button>
            )}

            <button
              onClick={() => handleNavClick('help')}
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                currentView === 'help'
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              المساعدة والسياسات
            </button>
          </nav>

          {/* Right Action Elements */}
          <div className="flex items-center gap-2 md:gap-3">


            {/* Visitor Auth Buttons (Profile button removed from top bar to keep it clean) */}
            {isVisitor && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#16324F] hover:bg-slate-100 transition-colors flex items-center gap-1 border border-slate-200"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>دخول</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold bg-[#16324F] hover:bg-[#12A889] text-white transition-colors"
                >
                  حساب جديد
                </button>
              </div>
            )}



            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-1.5 animate-in slide-in-from-top duration-200">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
              currentView === 'home' ? 'bg-[#16324F] text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            الرئيسية
          </button>
          <button
            onClick={() => handleNavClick('search')}
            className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
              currentView === 'search' ? 'bg-[#16324F] text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            استكشف الخريطة والعقارات
          </button>

          {canSeeMyAds && (
            <button
              onClick={() => handleNavClick('my_ads')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'my_ads' ? 'bg-[#16324F] text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              إعلاناتي
            </button>
          )}

          {!isVisitor && (
            <button
              onClick={() => handleNavClick('bookings')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between ${
                currentView === 'bookings' ? 'bg-[#16324F] text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#12A889]" />
                <span>{canSeeMyAds ? 'الطلبات والحجوزات' : 'طلباتي وحجوزاتي'}</span>
              </div>
              {canSeeMyAds && incomingRequestsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold font-mono">
                  {incomingRequestsCount} جديد
                </span>
              ) : !canSeeMyAds && seekerBookingsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold font-mono">
                  {seekerBookingsCount} نشط
                </span>
              ) : null}
            </button>
          )}

          {canSeeModeration && (
            <button
              onClick={() => handleNavClick('moderation')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'moderation' ? 'bg-[#16324F] text-white' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              مراجعة الإعلانات
            </button>
          )}

          {canSeeVerification && (
            <button
              onClick={() => handleNavClick('verification')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'verification' ? 'bg-[#16324F] text-white' : 'text-teal-800 hover:bg-teal-50'
              }`}
            >
              لوحة التحقق والمستندات
            </button>
          )}

          {canSeeOrg && (
            <button
              onClick={() => handleNavClick('organization')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'organization' ? 'bg-[#16324F] text-white' : 'text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              المنشأة العقارية
            </button>
          )}

          {canSeeReports && (
            <button
              onClick={() => handleNavClick('reports')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'reports' ? 'bg-[#16324F] text-white' : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              لوحة البلاغات
            </button>
          )}

          {canSeeSupportAdmin && (
            <button
              onClick={() => handleNavClick('support')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'support' ? 'bg-[#16324F] text-white' : 'text-purple-800 hover:bg-purple-50'
              }`}
            >
              تذاكر الدعم الفني
            </button>
          )}

          {canSeeSystemAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
                currentView === 'admin' ? 'bg-[#16324F] text-white' : 'text-slate-900 hover:bg-slate-100'
              }`}
            >
              الإدارة وسجل التدقيق
            </button>
          )}

          <button
            onClick={() => handleNavClick('help')}
            className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold ${
              currentView === 'help' ? 'bg-[#16324F] text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            المساعدة والسياسات
          </button>

          {isVisitor ? (
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex-1 py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="flex-1 py-2 bg-[#16324F] text-white text-xs font-bold rounded-xl"
              >
                إنشاء حساب
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleNavClick('account')}
                className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${
                  currentView === 'account' ? 'bg-[#12A889] text-white' : 'text-[#16324F] hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>إدارة حسابي</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-center py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl"
              >
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
