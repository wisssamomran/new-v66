import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomNavBar } from './components/BottomNavBar';
import { AuthModal } from './components/AuthModal';
import { VisitorGateModal } from './components/VisitorGateModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailsPage } from './pages/ListingDetailsPage';
import { AdWizardPage } from './pages/AdWizardPage';
import { MyAdsPage } from './pages/MyAdsPage';
import { ModerationPage } from './pages/ModerationPage';
import { VerificationPage } from './pages/VerificationPage';
import { OrgDashboardPage } from './pages/OrgDashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { SupportPage } from './pages/SupportPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { HelpAndPoliciesPage } from './pages/HelpAndPoliciesPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { MyAccountPage } from './pages/MyAccountPage';
import { BookingsManagementPage } from './pages/BookingsManagementPage';
import { DalaniAiAssistantModal } from './components/DalaniAiAssistantModal';
import { AppPermissionsModal } from './components/AppPermissionsModal';
import { Listing } from './types';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { listings, currentUser, toasts, removeToast } = useApp();

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash) return hash;
      return sessionStorage.getItem('dalani_current_view') || 'home';
    } catch {
      return 'home';
    }
  });

  // Keep hash and currentView in sync
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && hash !== currentView) {
        setCurrentView(hash);
        try {
          sessionStorage.setItem('dalani_current_view', hash);
        } catch {}
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(() => {
    try {
      const stored = sessionStorage.getItem('dalani_selected_listing');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [searchParams, setSearchParams] = useState<any>(() => {
    try {
      const stored = sessionStorage.getItem('dalani_search_params');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Auth & Visitor Gate Modals State
  const [authModalOpen, setAuthModalOpen] = useState(() => {
    try {
      return sessionStorage.getItem('dalani_auth_modal_open') === 'true';
    } catch { return false; }
  });
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>(() => {
    try {
      return (sessionStorage.getItem('dalani_auth_modal_mode') as 'login' | 'register') || 'login';
    } catch { return 'login'; }
  });
  const [authRedirectReason, setAuthRedirectReason] = useState<string | undefined>(() => {
    try {
      return sessionStorage.getItem('dalani_auth_redirect_reason') || undefined;
    } catch { return undefined; }
  });

  const [visitorGateOpen, setVisitorGateOpen] = useState(() => {
    try {
      return sessionStorage.getItem('dalani_visitor_gate_open') === 'true';
    } catch { return false; }
  });
  const [visitorGateReason, setVisitorGateReason] = useState<string>(() => {
    try {
      return sessionStorage.getItem('dalani_visitor_gate_reason') || '';
    } catch { return ''; }
  });
  const [visitorGateTitle, setVisitorGateTitle] = useState<string>(() => {
    try {
      return sessionStorage.getItem('dalani_visitor_gate_title') || 'تسجيل الدخول مطلوب';
    } catch { return 'تسجيل الدخول مطلوب'; }
  });

  // Permissions Modal State
  const [permissionsModalOpen, setPermissionsModalOpen] = useState<boolean>(false);

  // AI Assistant Modal State
  const [aiModalOpen, setAiModalOpen] = useState(() => {
    try {
      return sessionStorage.getItem('dalani_ai_modal_open') === 'true';
    } catch { return false; }
  });

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', reason?: string) => {
    setAuthModalMode(mode);
    setAuthRedirectReason(reason);
    setAuthModalOpen(true);
    try {
      sessionStorage.setItem('dalani_auth_modal_open', 'true');
      sessionStorage.setItem('dalani_auth_modal_mode', mode);
      if (reason) sessionStorage.setItem('dalani_auth_redirect_reason', reason);
    } catch {}
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
    try {
      sessionStorage.setItem('dalani_auth_modal_open', 'false');
      sessionStorage.removeItem('dalani_auth_redirect_reason');
    } catch {}
  };

  const handleOpenVisitorGate = (title: string, reason: string) => {
    setVisitorGateTitle(title);
    setVisitorGateReason(reason);
    setVisitorGateOpen(true);
    try {
      sessionStorage.setItem('dalani_visitor_gate_open', 'true');
      sessionStorage.setItem('dalani_visitor_gate_title', title);
      sessionStorage.setItem('dalani_visitor_gate_reason', reason);
    } catch {}
  };

  const handleCloseVisitorGate = () => {
    setVisitorGateOpen(false);
    try {
      sessionStorage.setItem('dalani_visitor_gate_open', 'false');
    } catch {}
  };

  const handleToggleAiModal = () => {
    setAiModalOpen(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem('dalani_ai_modal_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleCloseAiModal = () => {
    setAiModalOpen(false);
    try {
      sessionStorage.setItem('dalani_ai_modal_open', 'false');
    } catch {}
  };

  const handleNavigate = (view: string, params?: any) => {
    // Check gate for restricted views
    if (view === 'wizard' && currentUser.role === 'visitor') {
      handleOpenAuth('register', 'يجب تسجيل الدخول أو تأكيد رقم هاتفك لإضافة ونشر إعلان عقاري');
      return;
    }

    if (view === 'favorites' && currentUser.role === 'visitor') {
      handleOpenVisitorGate('مفضلة العقارات تتطلب حساباً', 'سجل دخولك لحفظ وتتبع العقارات التي تهمك عبر أي جهاز.');
      return;
    }

    if (params) {
      setSearchParams(params);
      try {
        sessionStorage.setItem('dalani_search_params', JSON.stringify(params));
      } catch {}
    }
    try {
      sessionStorage.setItem('dalani_current_view', view);
      if (window.location.hash !== `#/${view}`) {
        window.history.replaceState(null, '', `#/${view}`);
      }
    } catch {}
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
    try {
      sessionStorage.setItem('dalani_selected_listing', JSON.stringify(listing));
      sessionStorage.setItem('dalani_current_view', 'listing_details');
      window.history.replaceState(null, '', '#/listing_details');
    } catch {}
    setCurrentView('listing_details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishWizard = (listingId: string) => {
    const created = listings.find(l => l.id === listingId);
    if (created) {
      setSelectedListing(created);
      try {
        sessionStorage.setItem('dalani_selected_listing', JSON.stringify(created));
        sessionStorage.setItem('dalani_current_view', 'listing_details');
        window.history.replaceState(null, '', '#/listing_details');
      } catch {}
      setCurrentView('listing_details');
    } else {
      try {
        sessionStorage.setItem('dalani_current_view', 'my_ads');
        window.history.replaceState(null, '', '#/my_ads');
      } catch {}
      setCurrentView('my_ads');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-[#12A889]/20 selection:text-[#16324F] ${currentView === 'home' ? 'h-screen overflow-hidden pb-14' : 'pb-16'}`}>
      {/* Main Header / Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onOpenRoleSwitcher={() => handleOpenAuth('login')}
      />

      {/* Main Page Router with Strict Role Enforcement */}
      <main className={`flex-1 ${currentView === 'home' ? 'overflow-hidden flex flex-col h-full' : ''}`}>
        {currentView === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectListing={handleSelectListing}
          />
        )}

        {currentView === 'search' && (
          <SearchPage
            initialParams={searchParams}
            onSelectListing={handleSelectListing}
          />
        )}

        {currentView === 'listing_details' && selectedListing && (
          <ListingDetailsPage
            listing={selectedListing}
            onBack={() => handleNavigate('search')}
            onSelectListing={handleSelectListing}
            onOpenAuth={handleOpenAuth}
            onOpenVisitorGate={handleOpenVisitorGate}
          />
        )}

        {currentView === 'wizard' && (
          <ProtectedRoute
            allowedRoles={['advertiser', 'org_manager', 'org_agent', 'system_admin', 'seeker']}
            moduleTitle="معالج إضافة الإعلانات"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <AdWizardPage
              onFinish={handleFinishWizard}
              onCancel={() => handleNavigate('home')}
            />
          </ProtectedRoute>
        )}

        {currentView === 'my_ads' && (
          <ProtectedRoute
            allowedRoles={['advertiser', 'org_manager', 'org_agent', 'system_admin']}
            moduleTitle="لوحة إعلاناتي"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <MyAdsPage
              onNavigateToWizard={() => handleNavigate('wizard')}
              onSelectListing={handleSelectListing}
              onNavigateToBookings={() => handleNavigate('bookings', { roleView: 'advertiser' })}
            />
          </ProtectedRoute>
        )}

        {currentView === 'moderation' && (
          <ProtectedRoute
            allowedRoles={['moderator', 'system_admin']}
            moduleTitle="لوحة مراجعة المحتوى"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <ModerationPage onSelectListing={handleSelectListing} />
          </ProtectedRoute>
        )}

        {currentView === 'verification' && (
          <ProtectedRoute
            allowedRoles={['verifier', 'system_admin']}
            moduleTitle="لوحة التحقق والمستندات"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <VerificationPage />
          </ProtectedRoute>
        )}

        {currentView === 'organization' && (
          <ProtectedRoute
            allowedRoles={['org_manager', 'org_agent', 'system_admin']}
            moduleTitle="لوحة المنشأة العقارية"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <OrgDashboardPage
              onSelectListing={handleSelectListing}
              onNavigate={handleNavigate}
            />
          </ProtectedRoute>
        )}

        {currentView === 'reports' && (
          <ProtectedRoute
            allowedRoles={['reporter_admin', 'system_admin']}
            moduleTitle="لوحة البلاغات والنزاعات"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <ReportsPage />
          </ProtectedRoute>
        )}

        {currentView === 'support' && (
          <SupportPage />
        )}

        {currentView === 'admin' && (
          <ProtectedRoute
            allowedRoles={['system_admin']}
            moduleTitle="الإدارة العليا وسجل التدقيق"
            onNavigateHome={() => handleNavigate('home')}
            onOpenRoleSwitcher={() => handleOpenAuth('login')}
          >
            <AdminDashboardPage />
          </ProtectedRoute>
        )}

        {currentView === 'help' && (
          <HelpAndPoliciesPage
            onNavigateToSupport={() => handleNavigate('support')}
          />
        )}

        {currentView === 'favorites' && (
          <FavoritesPage
            onSelectListing={handleSelectListing}
            onNavigateToSearch={() => handleNavigate('search')}
          />
        )}

        {currentView === 'account' && (
          <MyAccountPage
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
            onOpenPermissions={() => setPermissionsModalOpen(true)}
          />
        )}

        {(currentView === 'bookings' || currentView === 'reservations' || currentView === 'seeker_bookings' || currentView === 'advertiser_bookings') && (
          <BookingsManagementPage
            onNavigateHome={() => handleNavigate('home')}
            onSelectListing={handleSelectListing}
            initialRoleView={(searchParams?.roleView as 'seeker' | 'advertiser' | undefined) || (currentView === 'advertiser_bookings' ? 'advertiser' : currentView === 'seeker_bookings' ? 'seeker' : undefined)}
            onOpenAuth={handleOpenAuth}
          />
        )}
      </main>

      {/* Footer (only on non-home pages to keep map clean and full-screen like screenshot) */}
      {currentView !== 'home' && <Footer onNavigate={handleNavigate} />}

      {/* Fixed Bottom Navigation Bar (With Integrated Dalani AI) */}
      <BottomNavBar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onOpenAi={handleToggleAiModal}
        isAiOpen={aiModalOpen}
      />

      {/* Auth Modal (Login / Register / OTP / Password Reset) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={handleCloseAuth}
        initialMode={authModalMode}
        redirectReason={authRedirectReason}
      />

      {/* Visitor Gate Modal */}
      <VisitorGateModal
        isOpen={visitorGateOpen}
        onClose={handleCloseVisitorGate}
        title={visitorGateTitle}
        message={visitorGateReason}
        onOpenAuth={mode => {
          handleCloseVisitorGate();
          handleOpenAuth(mode);
        }}
      />

      {/* Dalani AI Assistant Interactive Modal / Chat Drawer */}
      <DalaniAiAssistantModal
        isOpen={aiModalOpen}
        onClose={handleCloseAiModal}
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      {/* App Permissions Management Modal (Location, Microphone, Camera, Calls) */}
      <AppPermissionsModal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
      />

      {/* Global Toast Notifications Container (Positioned top-left to avoid blocking AI button) */}
      <div className="fixed top-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => {
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-bottom duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-900 text-white border-emerald-700'
                  : toast.type === 'error'
                  ? 'bg-rose-900 text-white border-rose-700'
                  : toast.type === 'warning'
                  ? 'bg-amber-900 text-white border-amber-700'
                  : 'bg-[#16324F] text-white border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {toast.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
                {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-[#12A889]" />}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
