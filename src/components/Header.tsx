import { UserProfile } from '../types';
import { isRealSupabaseConnected } from '../lib/supabase';
import { LogOut, User, Sparkles, Database, Check } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Header({ userProfile, onLogout }: HeaderProps) {
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
