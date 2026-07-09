import { UserProfile } from '../types';
import { isRealSupabaseConnected, supabase } from '../lib/supabase';
import { LogOut, User, Sparkles, Database, Check } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function Header({ userProfile, onLogout, onProfileUpdate }: HeaderProps) {
  const isSandbox = userProfile?.sandbox_mode || false;

  const handleToggleSandbox = async () => {
    if (!userProfile) return;
    const nextSandbox = !isSandbox;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sandbox_mode: nextSandbox })
        .eq('id', userProfile.id);

      if (!error) {
        onProfileUpdate({
          ...userProfile,
          sandbox_mode: nextSandbox
        });
      }
    } catch (e) {
      console.error("Error toggling sandbox mode:", e);
    }
  };

  // Determine plan badge styling
  const getPlanBadgeStyle = (plan: string = 'starter') => {
    switch (plan.toLowerCase()) {
      case 'business':
        return 'bg-[#0A0E1A] text-white border-[#0A0E1A] font-semibold';
      case 'pro':
        return 'bg-blue-50 text-[#2563EB] border-blue-100 font-semibold';
      case 'starter':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
    }
  };

  return (
    <header id="header" className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2 flex items-center justify-between shadow-xs">
      {/* Brand & Plan Logo */}
      <div className="flex items-center gap-2">
        <Logo size="sm" />

        {/* User Active Plan Badge */}
        {userProfile && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider hidden md:inline">Plan Actif :</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getPlanBadgeStyle(userProfile.plan)}`}>
              {userProfile.plan}
            </span>
          </div>
        )}
      </div>

      {/* Connection & Actions Info */}
      <div className="flex items-center gap-4">
        {/* Toggle Mode Test / Production */}
        {userProfile && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase hidden sm:inline">Mode Test :</span>
            <button
              onClick={handleToggleSandbox}
              title={isSandbox ? "Désactiver le Mode Test" : "Activer le Mode Test"}
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isSandbox ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isSandbox ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Supabase Status Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-2xs font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
          {isRealSupabaseConnected ? (
            <>
              <Database className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-700 font-medium">Supabase Cloud</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-700 font-medium">Simulateur Démo</span>
            </>
          )}
        </div>

        {/* User Info & Log out button */}
        {userProfile && (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-brand-dark leading-none">{userProfile.full_name}</p>
              {userProfile.company_name && (
                <p className="text-[10px] text-slate-400 mt-0.5">{userProfile.company_name}</p>
              )}
            </div>

            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-brand-dark font-semibold text-xs">
              {userProfile.full_name ? userProfile.full_name.substring(0, 2).toUpperCase() : 'WT'}
            </div>

            <button
              onClick={onLogout}
              title="Déconnexion"
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition duration-150 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
