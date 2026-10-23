import React from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Search,
  Plus,
  Heart,
  HelpCircle,
  User,
  Building,
  FileCheck,
  ShieldCheck,
  Settings,
  Grid,
  Flag,
  Headphones,
  BookOpen,
  CalendarCheck,
  Sparkles
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isProminent?: boolean;
}

interface BottomNavBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenAi?: () => void;
  isAiOpen?: boolean;
}

// Blended Dalani Real Estate Logo + AI Icon for regular tab
const DalaniAiNavIcon: React.FC<{ isActive?: boolean }> = ({ isActive }) => (
  <div className="relative flex items-center justify-center">
    <div
      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
        isActive
          ? 'bg-gradient-to-tr from-[#12A889] to-[#0F2942] text-white shadow-md shadow-teal-500/20'
          : 'bg-teal-50 text-[#12A889] group-hover:bg-teal-100'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z"
          fill="currentColor"
        />
        <polygon points="63,90 81,78 81,146 63,146" fill="currentColor" />
        <polygon points="88,64 108,78 108,136 88,136" fill="currentColor" />
        <path
          d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186Z"
          fill="#12A889"
        />
        <circle cx="144" cy="107" r="4" fill="#12A889" />
      </svg>
    </div>
    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  </div>
);

// Prominent Center AI Button Icon
const DalaniAiProminentIcon: React.FC = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0F2942] via-[#16324F] to-[#12A889] text-white flex items-center justify-center shadow-lg border-3 border-white group-hover:scale-105 group-active:scale-95 transition-all relative">
    <svg
      width="24"
      height="24"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z"
        fill="#FFFFFF"
      />
      <polygon points="63,90 81,78 81,146 63,146" fill="#FFFFFF" />
      <polygon points="88,64 108,78 108,136 88,136" fill="#FFFFFF" />
      <path
        d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186Z"
        fill="#12A889"
      />
      <circle cx="144" cy="107" r="4" fill="#FFFFFF" />
    </svg>
    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-emerald-300 animate-spin" style={{ animationDuration: '6s' }} />
  </div>
);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenAi,
  isAiOpen = false
}) => {
  const {
    currentUser,
    favorites,
    listings,
    reports,
    tickets,
    requests,
    bookings,
    verificationRequests
  } = useApp();

  // Dynamic Badges
  const pendingModerationCount = listings.filter(l => l.status === 'under_review').length;
  const pendingVerificationCount = verificationRequests.filter(v => v.status === 'under_review').length;
  const newReportsCount = reports.filter(r => r.status === 'new').length;
  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const myActionableAdsCount = listings.filter(
    l => l.advertiser.id === currentUser.id && (l.status === 'needs_changes' || l.status === 'under_review')
  ).length;

  const seekerActiveBookingsCount = bookings.filter(b => b.seekerId === currentUser.id && b.status === 'active').length;
  const incomingRequestsCount = requests.filter(r => r.status === 'pending' && (
    currentUser.role === 'system_admin' || r.advertiserId === currentUser.id
  )).length;

  // Strict 1:1 Implementation of the 10 User Roles Bottom Bar Matrix WITH Integrated Dalani AI
  const getTabs = (): TabItem[] => {
    switch (currentUser.role) {
      // 1. الزائر غير المسجل: الرئيسية، البحث، دلنّي AI (زر مركزي بارز)، المساعدة، حسابي
      case 'visitor':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'help', label: 'المساعدة', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'تسجيل الدخول', icon: <User className="w-5 h-5" /> }
        ];

      // 2. المستخدم المسجل والباحث عن عقار: الرئيسية، البحث، دلنّي AI (زر مركزي بارز)، حجوزاتي، حسابي
      case 'seeker':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'bookings', label: 'حجوزاتي', icon: <CalendarCheck className="w-5 h-5" />, badge: seekerActiveBookingsCount },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 3. المعلن الفرد الموثق: الرئيسية، إعلاناتي، أضف إعلان (مركزي)، دلنّي AI، حسابي
      case 'advertiser':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'my_ads', label: 'إعلاناتي', icon: <Grid className="w-5 h-5" />, badge: myActionableAdsCount },
          { id: 'wizard', label: 'أضف إعلان', icon: <Plus className="w-6 h-6" />, isProminent: true },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiNavIcon isActive={isAiOpen} /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 4. مدير المنشأة العقارية: الرئيسية، المنشأة، أضف إعلان (مركزي)، دلنّي AI، حسابي
      case 'org_manager':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'organization', label: 'المنشأة', icon: <Building className="w-5 h-5" /> },
          { id: 'wizard', label: 'أضف إعلان', icon: <Plus className="w-6 h-6" />, isProminent: true },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiNavIcon isActive={isAiOpen} /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 5. وكيل المنشأة العقارية: الرئيسية، إعلاناتي، أضف إعلان (مركزي)، دلنّي AI، حسابي
      case 'org_agent':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'my_ads', label: 'إعلاناتي', icon: <Grid className="w-5 h-5" /> },
          { id: 'wizard', label: 'أضف إعلان', icon: <Plus className="w-6 h-6" />, isProminent: true },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiNavIcon isActive={isAiOpen} /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 6. مراجع المحتوى: الرئيسية، المراجعة، دلنّي AI (مركزي)، البحث، حسابي
      case 'moderator':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'moderation', label: 'المراجعة', icon: <FileCheck className="w-5 h-5" />, badge: pendingModerationCount },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 7. مسؤول التحقق والمطابقة: الرئيسية، لوحة التحقق، دلنّي AI (مركزي)، البحث، حسابي
      case 'verifier':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'verification', label: 'التحقق', icon: <ShieldCheck className="w-5 h-5" />, badge: pendingVerificationCount },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 8. مسؤول البلاغات والقضايا: الرئيسية، البلاغات، دلنّي AI (مركزي)، البحث، حسابي
      case 'reporter_admin':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'reports', label: 'البلاغات', icon: <Flag className="w-5 h-5" />, badge: newReportsCount },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 9. ممثل الدعم الفني: الرئيسية، تذاكر الدعم، دلنّي AI (مركزي)، البحث، حسابي
      case 'support':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'support', label: 'الدعم', icon: <Headphones className="w-5 h-5" />, badge: openTicketsCount },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      // 10. مدير النظام العام: الرئيسية، لوحة الإدارة، دلنّي AI (مركزي)، المراجعة، حسابي
      case 'system_admin':
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'admin', label: 'الإدارة', icon: <Settings className="w-5 h-5" /> },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'moderation', label: 'المراجعة', icon: <FileCheck className="w-5 h-5" />, badge: pendingModerationCount },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];

      default:
        return [
          { id: 'home', label: 'الرئيسية', icon: <MapPin className="w-5 h-5" /> },
          { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
          { id: 'ai', label: 'دلنّي AI', icon: <DalaniAiProminentIcon />, isProminent: true },
          { id: 'help', label: 'المساعدة', icon: <HelpCircle className="w-5 h-5" /> },
          { id: 'account', label: 'حسابي', icon: <User className="w-5 h-5" /> }
        ];
    }
  };

  const tabs = getTabs();

  const handleTabClick = (tabId: string) => {
    if (tabId === 'ai') {
      if (onOpenAi) {
        onOpenAi();
      } else {
        onNavigate('support');
      }
      return;
    }
    onNavigate(tabId);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 py-1 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const isActive = tab.id === 'ai' ? isAiOpen : currentView === tab.id;

          // Prominent Center Button (Add Listing or Dalani AI)
          if (tab.isProminent) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="relative -mt-6 flex flex-col items-center group cursor-pointer focus:outline-hidden"
                title={tab.label}
              >
                {tab.id === 'ai' ? (
                  tab.icon
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#12A889] to-emerald-400 text-white flex items-center justify-center shadow-lg border-3 border-white group-hover:scale-105 group-active:scale-95 transition-all">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                )}
                <span className={`text-[10px] mt-1 font-black leading-tight ${
                  tab.id === 'ai' ? 'text-teal-700 font-extrabold' : 'text-[#16324F]'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#12A889] font-black'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative">
                {tab.id === 'ai' ? (
                  <DalaniAiNavIcon isActive={isActive} />
                ) : (
                  tab.icon
                )}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>

              {/* Text Label */}
              <span
                className={`text-[10px] mt-1 leading-tight tracking-tight whitespace-nowrap ${
                  isActive ? 'font-black text-[#12A889]' : ''
                }`}
              >
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#12A889] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
