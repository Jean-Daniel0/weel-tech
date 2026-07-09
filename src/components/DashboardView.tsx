import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { UserProfile, PaymentTransaction, Site, DomainName, SidebarView } from '../types';
import { 
  Globe, CreditCard, Link2, Sparkles, TrendingUp, DollarSign, 
  Layers, ArrowUpRight, Lock, CheckCircle2, ChevronRight, Activity, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface DashboardProps {
  userProfile: UserProfile | null;
  onViewChange: (view: SidebarView) => void;
}

export default function DashboardView({ userProfile, onViewChange }: DashboardProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [domains, setDomains] = useState<DomainName[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartCurrency, setChartCurrency] = useState<'USD' | 'HTG'>('USD');

  const isPaidUser = userProfile?.plan === 'pro' || userProfile?.plan === 'business';
  const isSandbox = userProfile?.sandbox_mode || false;

  useEffect(() => {
    if (!isPaidUser) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: txs } = await supabase.from('transactions').select('*');
        const { data: sts } = await supabase.from('sites').select('*');
        const { data: dms } = await supabase.from('domains').select('*');

        if (txs) setTransactions(txs);
        if (sts) setSites(sts);
        if (dms) setDomains(dms);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isPaidUser, isSandbox]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="relative w-10 h-10 mx-auto">
            <span className="absolute inset-0 rounded-full border-4 border-brand-blue/10"></span>
            <span className="absolute inset-0 rounded-full border-4 border-t-brand-blue border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-display">Calcul des métriques...</p>
        </div>
      </div>
    );
  }

  // --- 1. STARTER PLAN LOCK SCREEN (PREMIUM TEASING) ---
  if (!isPaidUser) {
    return (
      <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-8">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden"
        >
          {/* Top Decorative Elements */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>
          
          <div className="flex flex-col items-center text-center">
            {/* Lock Hexagon Emblem */}
            <div className="relative w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <Lock className="w-7 h-7" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-black">
                <Zap className="w-2.5 h-2.5 text-white animate-pulse" />
              </div>
            </div>

            <span className="text-3xs font-extrabold px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 tracking-wider uppercase mb-3">
              Module Premium &bull; Vendza:Analytics
            </span>
            
            <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight sm:text-3xl">
              Libérez la puissance de vos données
            </h2>
            
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              Suivez l'évolution de vos ventes en direct, visualisez vos transactions multi-devises (USD et Gourdes) et analysez la répartition de vos revenus grâce à nos graphiques interactifs avancés.
            </p>

            {/* Features list */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 text-left border-y border-slate-100 py-6">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Graphes Recharts Interactifs</h4>
                  <p className="text-[10px] text-slate-500">Tendances de ventes filtrables par devise</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Double Solde Consolidé</h4>
                  <p className="text-[10px] text-slate-500">Séparation stricte des Dollars ($) et Gourdes (G)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Flux d'Activité Temps Réel</h4>
                  <p className="text-[10px] text-slate-500">Traces d'événements, domaines et paiements</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Multi-Sites Illimités</h4>
                  <p className="text-[10px] text-slate-500">Déverrouillez le quota maximum de votre plan</p>
                </div>
              </div>
            </div>

            {/* CTA action */}
            <div className="mt-8 w-full flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={() => onViewChange('settings')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/10 transition cursor-pointer"
              >
                Découvrir les offres Pro & Business
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewChange('sites')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                Retourner à mes sites
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- 2. STATS AGGREGATION & DATA ISOLATION ---
  // filter by sandbox mode
  const filteredTxs = transactions.filter(t => isSandbox ? t.is_sandbox : !t.is_sandbox);

  // Totals
  const succeededTxs = filteredTxs.filter(t => t.status === 'succeeded');
  const totalUSD = succeededTxs.filter(t => t.currency.toUpperCase() === 'USD').reduce((sum, t) => sum + t.amount, 0);
  const totalHTG = succeededTxs.filter(t => t.currency.toUpperCase() === 'HTG').reduce((sum, t) => sum + t.amount, 0);

  // Quotas sites
  const maxSites = userProfile.plan === 'pro' ? 5 : userProfile.plan === 'business' ? 9999 : 1;
  const activeCustomDomains = domains.filter(d => d.dns_configured).length;

  // Pie chart payment method breakdown
  const methodCounts: { [key: string]: number } = { Stripe: 0, MonCash: 0, API: 0 };
  succeededTxs.forEach(t => {
    const m = t.method || 'Stripe';
    if (methodCounts[m] !== undefined) {
      methodCounts[m] += t.amount;
    } else {
      methodCounts[m] = t.amount;
    }
  });

  const pieData = Object.keys(methodCounts).map(method => ({
    name: method,
    value: parseFloat(methodCounts[method].toFixed(2))
  })).filter(item => item.value > 0);

  const PIE_COLORS = ['#2563EB', '#F59E0B', '#10B981'];

  // Trend Chart: Sales over the last 7 days
  const getTrendData = () => {
    const dates: { [key: string]: number } = {};
    
    // Seed last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      dates[dateStr] = 0;
    }

    // Populate with real data
    succeededTxs
      .filter(t => t.currency.toUpperCase() === chartCurrency)
      .forEach(t => {
        const d = new Date(t.created_at);
        const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        if (dates[dateStr] !== undefined) {
          dates[dateStr] += t.amount;
        }
      });

    return Object.keys(dates).map(date => ({
      date,
      Ventes: parseFloat(dates[date].toFixed(2))
    }));
  };

  const trendData = getTrendData();

  // --- 3. RECENT ACTIVITY EVENTS (MAX 5 ITEMS) ---
  const getActivityEvents = () => {
    const events: { id: string; type: 'site' | 'tx' | 'domain'; title: string; subtitle: string; time: string; dateObj: Date }[] = [];

    // Add sites
    sites.forEach(s => {
      events.push({
        id: `site-${s.id}`,
        type: 'site',
        title: `Site publié : ${s.name}`,
        subtitle: `Hébergé sur ${s.domain || 'Weel-Tech Subdomain'}`,
        time: new Date(s.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        dateObj: new Date(s.updated_at)
      });
    });

    // Add transactions
    filteredTxs.forEach(t => {
      const formattedAmt = t.currency.toUpperCase() === 'USD' 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.amount)
        : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(t.amount) + ' G';

      events.push({
        id: `tx-${t.id}`,
        type: 'tx',
        title: t.status === 'succeeded' 
          ? `Vente réussie de ${formattedAmt}` 
          : t.status === 'pending' ? `Paiement en attente de ${formattedAmt}` : `Échec de transaction (${formattedAmt})`,
        subtitle: `Payé par ${t.customer_name} via ${t.method || 'Stripe'}`,
        time: new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        dateObj: new Date(t.created_at)
      });
    });

    // Add domains
    domains.forEach(d => {
      events.push({
        id: `dom-${d.id}`,
        type: 'domain',
        title: `Domaine ${d.status === 'active' ? 'enregistré' : 'en cours'} : ${d.domain_name}`,
        subtitle: d.dns_configured ? 'Serveurs DNS configurés' : 'DNS en attente de propagation',
        time: new Date(d.registered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        dateObj: new Date(d.registered_at)
      });
    });

    // Sort by date descending and take top 5
    return events.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()).slice(0, 5);
  };

  const recentActivities = getActivityEvents();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            Tableau de Bord Global
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-600 tracking-wider uppercase">
              {userProfile.plan === 'business' ? 'BUSINESS HUB' : 'PRO HUB'}
            </span>
          </h1>
          <p className="text-sm text-slate-500">Vue consolidée en temps réel de votre activité multi-sites, de vos domaines et de vos encaissements.</p>
        </div>

        {/* Indicator for Sandbox mode */}
        {isSandbox && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2 text-amber-800 text-xs font-semibold self-start sm:self-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Mode Test Actif
          </div>
        )}
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sites Quota Card */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sites internet</p>
            <p className="text-lg font-bold text-slate-800">
              {sites.length} <span className="text-xs font-normal text-slate-400">/ {maxSites === 9999 ? '∞' : maxSites}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Sites actifs créés</p>
          </div>
        </div>

        {/* Domains Quota Card */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Domaines actifs</p>
            <p className="text-lg font-bold text-slate-800">{activeCustomDomains}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{domains.length} domaines totaux</p>
          </div>
        </div>

        {/* Revenue USD Card */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Volume Stripe (USD)</p>
            <p className="text-lg font-bold text-slate-800">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalUSD)}
            </p>
            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5 font-semibold">
              <ArrowUpRight className="w-3 h-3" />
              Succeeded Txs
            </p>
          </div>
        </div>

        {/* Revenue HTG Card */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Volume MonCash (HTG)</p>
            <p className="text-lg font-bold text-slate-800">
              {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(totalHTG)} G
            </p>
            <p className="text-[10px] text-amber-600 flex items-center gap-0.5 mt-0.5 font-semibold">
              <ArrowUpRight className="w-3 h-3" />
              Succeeded Txs
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (Left & Center, takes 2 columns) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Évolution temporelle des ventes
              </h3>
              <p className="text-[11px] text-slate-500">Volume journalier cumulé sur les 7 derniers jours.</p>
            </div>

            {/* Currency selector tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 self-start sm:self-auto">
              <button
                onClick={() => setChartCurrency('USD')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                  chartCurrency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setChartCurrency('HTG')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                  chartCurrency === 'HTG' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                HTG (G)
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartCurrency === 'USD' ? '#2563EB' : '#F59E0B'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={chartCurrency === 'USD' ? '#2563EB' : '#F59E0B'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '8px', color: '#F8FAFC', fontSize: '11px' }}
                  formatter={(value) => [`${value} ${chartCurrency === 'USD' ? '$' : 'G'}`]}
                />
                <Area 
                  type="monotone" 
                  dataKey="Ventes" 
                  stroke={chartCurrency === 'USD' ? '#2563EB' : '#F59E0B'} 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#salesGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart (Right, takes 1 column) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-emerald-600" />
              Répartition par méthode
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Proportion du volume total encaissé par canal (Stripe, MonCash ou API externe).</p>
          </div>

          {pieData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <CreditCard className="w-8 h-8 text-slate-300 stroke-1 mb-2 animate-bounce" />
              <p className="text-[11px] font-semibold text-slate-400">Aucune vente enregistrée</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '8px', color: '#F8FAFC', fontSize: '11px' }}
                      formatter={(value, name) => [`${value}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY LOGS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Activity className="w-4 h-4 text-indigo-600" />
          Flux d'activité en temps réel
        </h3>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs">Aucune activité récente à afficher sur votre compte.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-4 p-2 rounded-lg hover:bg-slate-50 transition border-b border-slate-100 last:border-none pb-3">
                <div className="flex items-start gap-3">
                  {/* Icon depending on type */}
                  <div className={`p-2 rounded-xl shrink-0 ${
                    event.type === 'site' 
                      ? 'bg-blue-50 text-blue-600' 
                      : event.type === 'tx' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {event.type === 'site' && <Layers className="w-4 h-4" />}
                    {event.type === 'tx' && <CreditCard className="w-4 h-4" />}
                    {event.type === 'domain' && <Globe className="w-4 h-4" />}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{event.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{event.subtitle}</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0 text-right">
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
