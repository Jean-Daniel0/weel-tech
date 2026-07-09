import { SidebarView } from '../types';
import { Globe, CreditCard, Link2, Settings, ChevronRight, Sparkles, LayoutDashboard } from 'lucide-react';

interface SidebarProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard' as SidebarView,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      description: 'Vue d\'ensemble'
    },
    {
      id: 'sites' as SidebarView,
      label: 'Mes sites',
      icon: Globe,
      description: 'Gérer vos portails web'
    },
    {
      id: 'new-site' as SidebarView,
      label: 'Nouveau site',
      icon: Sparkles,
      description: 'Générateur par IA',
      badge: 'IA'
    },
    {
      id: 'pay' as SidebarView,
      label: 'Vendza:Pay',
      icon: CreditCard,
      description: 'Transactions & Paiements',
      badge: 'PRO'
    },
    {
      id: 'domains' as SidebarView,
      label: 'Vendza:Domaine',
      icon: Link2,
      description: 'Noms de domaine',
    },
    {
      id: 'settings' as SidebarView,
      label: 'Paramètres',
      icon: Settings,
      description: 'Profil & configuration'
    }
  ];

  return (
    <aside id="sidebar" style={{ width: '208.99px' }} className="bg-[#0A0E1A] text-slate-300 flex flex-col justify-between shrink-0 p-2 md:p-3.5 border-r border-slate-900 h-full">
      <div className="space-y-4">
        <div className="hidden md:block">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 px-2">NAVIGATION PRINCIPALE</p>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-semibold shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs leading-none block font-medium">{item.label}</span>
                    <span className={`text-[10px] font-normal hidden md:block mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{item.description}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {item.badge && (
                    <span className={`text-[8px] px-1 py-0.5 rounded font-bold tracking-wider uppercase scale-90 ${
                      isActive ? 'bg-white text-[#2563EB]' : 'bg-white/10 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${
                    isActive ? 'text-white/80 transform translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`} />
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-900 hidden md:block">
        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-semibold text-white">Statut du cloud</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Serveur opérationnel : 12ms.</p>
        </div>
      </div>
    </aside>
  );
}
