import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { SidebarView, UserProfile } from './types';
import AuthView from './components/AuthView';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SitesView from './components/SitesView';
import PayView from './components/PayView';
import DomainView from './components/DomainView';
import SettingsView from './components/SettingsView';
import NewSiteView from './components/NewSiteView';
import { Menu, X, Sparkles, LogOut, CheckCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<SidebarView>('sites');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        fetchUserProfile(initialSession.user.id, initialSession.user.email);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, currentSession: any) => {
        setSession(currentSession);
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id, currentSession.user.email);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Automatically create a default profile in the DB if it doesn't exist
        const defaultProfile: UserProfile = {
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          plan: 'starter',
          created_at: new Date().toISOString()
        };

        // Suppress errors and set the profile locally
        await supabase.from('profiles').insert(defaultProfile);
        setUserProfile(defaultProfile);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du profil :", err);
      // Fallback
      setUserProfile({
        id: userId,
        email: email,
        full_name: email.split('@')[0],
        plan: 'starter',
        created_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setLoading(false);
  };

  // Switch sub-panels
  const renderActiveView = () => {
    switch (currentView) {
      case 'sites':
        return <SitesView userProfile={userProfile} />;
      case 'new-site':
        return <NewSiteView userProfile={userProfile} onViewChange={(view) => setCurrentView(view)} />;
      case 'pay':
        return <PayView userProfile={userProfile} />;
      case 'domains':
        return <DomainView userProfile={userProfile} />;
      case 'settings':
        return <SettingsView userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <SitesView userProfile={userProfile} />;
    }
  };

  if (loading) {
    return (
      <div id="loader-wrapper" className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <span className="absolute inset-0 rounded-full border-4 border-brand-blue/10"></span>
            <span className="absolute inset-0 rounded-full border-4 border-t-brand-blue border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
          </div>
          <p className="text-xs font-semibold text-gray-500 font-display uppercase tracking-widest">Initialisation de Weel-Tech...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session || !userProfile) {
    return <AuthView onAuthSuccess={(s) => setSession(s)} />;
  }

  const isWorkspaceView = currentView === 'new-site';

  return (
    <div className="h-screen bg-[#F5F7FA] flex flex-col text-brand-dark overflow-hidden">
      {/* Header Bar */}
      {!isWorkspaceView && <Header userProfile={userProfile} onLogout={handleLogout} />}

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden min-h-0">
        
        {/* Mobile Navigation Toggle Bar */}
        {!isWorkspaceView && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-brand-dark hover:bg-gray-50 rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <span className="text-2xs font-bold text-gray-400 capitalize">
              Menu: <strong className="text-brand-blue">{currentView === 'sites' ? 'Mes sites' : currentView}</strong>
            </span>
          </div>
        )}

        {/* Sidebar Component with Mobile Responsiveness Drawer overlay */}
        {!isWorkspaceView && (
          <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block shrink-0 h-auto md:h-full`}>
            <Sidebar
              currentView={currentView}
              onViewChange={(view) => {
                setCurrentView(view);
                setMobileMenuOpen(false); // Close mobile drawer
              }}
            />
          </div>
        )}

        {/* Content Box */}
        <main 
          className={isWorkspaceView 
            ? "flex-1 w-full h-screen overflow-hidden flex flex-col p-4 md:p-6 bg-[#F5F7FA]" 
            : "flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto min-h-0 h-full"
          }
          style={!isWorkspaceView ? { paddingRight: '30px' } : undefined}
        >
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
