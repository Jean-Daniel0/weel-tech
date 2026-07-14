import React, { useState, useEffect } from 'react';
import { Site } from '../types';
import { 
  ArrowLeft, Globe, TrendingUp, Users, Eye, RefreshCw, 
  ShieldCheck, BarChart3, HelpCircle, Copy, Check, Calendar, Clock, Lock, Edit3
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface SiteDetailsViewProps {
  site: Site;
  onBack: () => void;
  onEditSite?: (site: Site) => void;
}

interface AnalyticsItem {
  date: string;
  visitors: number;
  pageViews: number;
}

export default function SiteDetailsView({ site, onBack, onEditSite }: SiteDetailsViewProps) {
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [site]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cloudflare/analytics?domain=${encodeURIComponent(site.domain)}&siteId=${site.id}`);
      if (!response.ok) {
        throw new Error("Impossible de charger les statistiques.");
      }
      const data = await response.json();
      setAnalytics(data.analytics || []);
      setIsSimulated(data.simulated || false);
    } catch (err: any) {
      console.error(err);
      setError("Une erreur est survenue lors du chargement des statistiques Cloudflare.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/cloudflare/analytics?domain=${encodeURIComponent(site.domain)}&siteId=${site.id}&refresh=true`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || []);
        setIsSimulated(data.simulated || false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculations based on 30-day analytics
  const totalUniqueVisitors = analytics.reduce((sum, item) => sum + item.visitors, 0);
  const totalPageViews = analytics.reduce((sum, item) => sum + item.pageViews, 0);
  const avgDailyVisitors = analytics.length > 0 ? Math.round(totalUniqueVisitors / analytics.length) : 0;
  
  // Find peak audience day
  let peakDay: AnalyticsItem | null = null;
  if (analytics.length > 0) {
    peakDay = analytics.reduce((max, item) => item.visitors > max.visitors ? item : max, analytics[0]);
  }

  // Last 7 days statistics list for raw values display
  const last7Days = [...analytics].slice(-7).reverse();

  // Cloudflare beacon JS snippet
  const cloudflareBeaconCode = `<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "cf_web_analytics_${site.id.substring(0, 8)}"}'></script>
<!-- End Cloudflare Web Analytics -->`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cloudflareBeaconCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateFrench = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatDateFullFrench = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl transition cursor-pointer shadow-xs"
            title="Retour à la liste"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[28px] font-semibold font-display text-[#0A0E1A] tracking-tight">
                {site.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold uppercase tracking-wider border ${
                site.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {site.status === 'active' ? 'En ligne' : 'Brouillon'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-500">
                {site.type}
              </span>
            </div>
            <p className="text-[14px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#2563EB] transition">
                {site.domain}
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          {onEditSite && (
            <button
              onClick={() => onEditSite(site)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition text-xs font-semibold cursor-pointer shadow-md shadow-blue-500/10"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modifier / Éditer le site
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualisation...' : 'Actualiser les stats'}
          </button>
        </div>
      </div>

      {/* Cloudflare Indicator */}
      <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-[#0A0E1A]">Cloudflare Web Analytics</h4>
            <p className="text-[12px] text-slate-500 max-w-2xl mt-0.5">
              Mesure d'audience gratuite et respectueuse de la vie privée. Aucun cookie n'est déposé, aucun consentement RGPD n'est requis. Données précises à 100% collectées au plus près de vos visiteurs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSimulated ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
              Mode Simulation
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Données Cloudflare Live
            </span>
          )}
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="main-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[12px] uppercase tracking-wider font-semibold">Visiteurs Uniques (30j)</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-[32px] font-mono font-semibold text-[#0A0E1A] mt-2 leading-tight">
            {loading ? '...' : totalUniqueVisitors.toLocaleString('fr-FR')}
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Nombre d'utilisateurs uniques</p>
        </div>

        <div className="main-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[12px] uppercase tracking-wider font-semibold">Pages Vues (30j)</span>
            <Eye className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-[32px] font-mono font-semibold text-[#2563EB] mt-2 leading-tight">
            {loading ? '...' : totalPageViews.toLocaleString('fr-FR')}
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Consultations cumulées</p>
        </div>

        <div className="main-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[12px] uppercase tracking-wider font-semibold">Moyenne quotidienne</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[32px] font-mono font-semibold text-emerald-600 mt-2 leading-tight">
            {loading ? '...' : avgDailyVisitors.toLocaleString('fr-FR')}
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Visiteurs uniques / jour</p>
        </div>

        <div className="main-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[12px] uppercase tracking-wider font-semibold">Pic d'audience</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-[32px] font-mono font-semibold text-indigo-600 mt-2 leading-tight">
            {loading ? '...' : peakDay ? peakDay.visitors.toLocaleString('fr-FR') : '0'}
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            {loading ? 'Chargement...' : peakDay ? `Atteint le ${formatDateFrench(peakDay.date)}` : 'Aucune donnée'}
          </p>
        </div>
      </div>

      {/* Recharts Area Chart & Technical Explainer Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph Card */}
        <div className="lg:col-span-2 main-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[#0A0E1A] font-display tracking-tight">Courbe de trafic des 30 derniers jours</h3>
                <p className="text-[12px] text-slate-400">Suivi temporel des visites uniques et pages vues</p>
              </div>
              <div className="flex items-center gap-4 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#2563EB] rounded-xs opacity-80 inline-block"></span>
                  <span className="text-slate-600 font-medium">Pages vues</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded-xs opacity-80 inline-block"></span>
                  <span className="text-slate-600 font-medium">Visiteurs uniques</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-72 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-[#2563EB] mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-xs text-slate-400">Chargement du graphique...</p>
              </div>
            ) : error ? (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-red-500 text-xs">
                {error}
              </div>
            ) : analytics.length === 0 ? (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                Aucune donnée à afficher pour le moment.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDateFrench} 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      labelFormatter={formatDateFullFrench}
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                        fontSize: '12px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pageViews" 
                      stroke="#2563EB" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPageViews)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="visitors" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorVisitors)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Mise à jour en temps réel (UTC)
            </span>
            <span>Intervalle d'affichage : 30 jours</span>
          </div>
        </div>

        {/* Cloudflare explanation card */}
        <div className="main-card space-y-4">
          <h3 className="text-[18px] font-semibold text-[#0A0E1A] font-display tracking-tight flex items-center gap-1.5">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            Pourquoi Cloudflare ?
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Nous avons choisi <strong>Cloudflare Web Analytics</strong> comme moteur d'analyse principal pour offrir à votre site la meilleure infrastructure possible :
          </p>

          <div className="space-y-3 pt-2 text-[12px]">
            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <div>
                <strong className="text-slate-800">Conformité RGPD immédiate :</strong>
                <p className="text-slate-500">Pas de bandeaux cookies invasifs à afficher. Cloudflare respecte la confidentialité de vos visiteurs.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <div>
                <strong className="text-slate-800">Zéro impact de chargement :</strong>
                <p className="text-slate-500">Le script est asynchrone, hyper-optimisé (1.4KB) et servi par l'un des réseaux Edge les plus rapides au monde.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <div>
                <strong className="text-slate-800">Insensible aux AdBlockers :</strong>
                <p className="text-slate-500">La collecte se base au niveau DNS et proxy CDN, garantissant la comptabilisation des visites habituellement bloquées par Google Analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Code Widget & Last 7 Days Raw list row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Integration Code tag */}
        <div className="lg:col-span-2 main-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-semibold text-[#0A0E1A] font-display tracking-tight">Code d'intégration (Optionnel)</h3>
              <p className="text-[12px] text-slate-400">Pour un suivi encore plus précis via JS Beacon, ajoutez ce tag avant &lt;/body&gt;</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono rounded-xl overflow-x-auto select-all leading-relaxed max-h-36">
              {cloudflareBeaconCode}
            </pre>
            <div className="absolute bottom-2 right-2 bg-slate-800 text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-md border border-slate-700 pointer-events-none">
              HTML
            </div>
          </div>
        </div>

        {/* Last 7 Days Raw Stats Table */}
        <div className="main-card flex flex-col justify-between">
          <div>
            <h3 className="text-[18px] font-semibold text-[#0A0E1A] font-display tracking-tight mb-3">7 derniers jours</h3>
            
            {loading ? (
              <div className="space-y-2 py-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-6 bg-slate-50 rounded-md animate-pulse"></div>
                ))}
              </div>
            ) : last7Days.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Aucun relevé disponible</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {last7Days.map((item, idx) => (
                  <div key={item.date} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                    <span className="font-medium text-slate-600">{formatDateFrench(item.date)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 flex items-center gap-1" title="Pages Vues">
                        <Eye className="w-3 h-3 text-[#2563EB]/60" />
                        {item.pageViews}
                      </span>
                      <span className="font-mono text-slate-900 font-semibold flex items-center gap-1" title="Visiteurs Uniques">
                        <Users className="w-3 h-3 text-emerald-500/60" />
                        {item.visitors}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1 pt-2 border-t border-slate-50">
            <Lock className="w-3 h-3 text-emerald-500" />
            Analyse externe sécurisée
          </div>
        </div>

      </div>
    </div>
  );
}
