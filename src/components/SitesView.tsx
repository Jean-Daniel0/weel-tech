import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Site, UserProfile } from '../types';
import { Plus, Globe, Trash2, Check, RefreshCw, Eye, Sparkles, Filter, ExternalLink, ShieldCheck, Monitor, Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SitesViewProps {
  userProfile: UserProfile | null;
}

export default function SitesView({ userProfile }: SitesViewProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [newSiteType, setNewSiteType] = useState<'vitrine' | 'e-commerce' | 'portfolio' | 'blog'>('vitrine');
  const [filterType, setFilterType] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States for interactive live preview modal of existing sites
  const [previewSiteHtml, setPreviewSiteHtml] = useState<string | null>(null);
  const [previewSiteName, setPreviewSiteName] = useState<string | null>(null);
  const [previewSiteMode, setPreviewSiteMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    fetchSites();
  }, [userProfile]);

  const fetchSites = async () => {
    if (!userProfile) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSites(data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de charger vos sites. Veuillez vérifier votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile || !newSiteName || !newSiteDomain) return;
    setCreating(true);
    setErrorMessage(null);

    // Format domain slightly to make sure it's clean (e.g. clean up http:// and /)
    let formattedDomain = newSiteDomain.trim()
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/$/, '');

    // If they just typed a name without .com/etc, append a default demo extension
    if (!formattedDomain.includes('.')) {
      formattedDomain = `${formattedDomain}.weel.site`;
    }

    try {
      const newSite = {
        user_id: userProfile.id,
        name: newSiteName.trim(),
        domain: formattedDomain,
        status: 'active' as const,
        visitors_24h: Math.floor(Math.random() * 15), // Small starting traffic
        type: newSiteType
      };

      const { data, error } = await supabase
        .from('sites')
        .insert(newSite);

      if (error) throw error;

      // Reset form & reload
      setNewSiteName('');
      setNewSiteDomain('');
      setNewSiteType('vitrine');
      await fetchSites();
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Une erreur est survenue lors de la création du site.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (siteId: string, currentStatus: 'active' | 'draft') => {
    const nextStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      const { error } = await supabase
        .from('sites')
        .update({ status: nextStatus })
        .eq('id', siteId);

      if (error) throw error;
      
      // Update local state directly for speedy feedback
      setSites(sites.map(s => s.id === siteId ? { ...s, status: nextStatus, updated_at: new Date().toISOString() } : s));
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de mettre à jour le statut du site.");
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce site ? Tous les fichiers associés seront effacés.")) return;
    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;
      setSites(sites.filter(s => s.id !== siteId));
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de supprimer le site.");
    }
  };

  const handlePreviewSite = (e: React.MouseEvent, site: any) => {
    e.preventDefault();
    const cachedHtml = localStorage.getItem(`weel_tech_site_html_${site.domain}`);
    if (cachedHtml) {
      setPreviewSiteHtml(cachedHtml);
      setPreviewSiteName(site.name);
    } else {
      // Create a premium, beautiful fallback site on the fly matching the site type and name
      const fallbackHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', sans-serif; }
  </style>
</head>
<body class="bg-[#F8FAFC] text-[#0A0E1A] flex flex-col min-h-screen">
  <!-- Nav Bar -->
  <header class="bg-white border-b border-slate-100 sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center gap-2 font-extrabold text-xl tracking-tight text-[#2563EB]">
        <i data-lucide="globe" class="w-5 h-5"></i>
        <span>${site.name}</span>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <a href="#hero" class="hover:text-[#2563EB] transition">Accueil</a>
        <a href="#services" class="hover:text-[#2563EB] transition">Services</a>
        <a href="#about" class="hover:text-[#2563EB] transition">À Propos</a>
        <a href="#contact" class="hover:text-[#2563EB] transition">Contact</a>
      </nav>
      <button onclick="document.getElementById('contact').scrollIntoView({behavior: 'smooth'})" class="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10">
        Commencer
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <section id="hero" class="py-16 md:py-24 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-1">
    <div class="space-y-6">
      <div class="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-[#2563EB] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
        <span>Nouveau site en ligne</span>
      </div>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
        Bienvenue sur <span class="text-[#2563EB]">${site.name}</span>
      </h1>
      <p class="text-slate-500 text-base leading-relaxed">
        Ce superbe site web vitrine de type <strong class="text-slate-800 capitalize">${site.type}</strong> a été entièrement conçu, optimisé et déployé instantanément sur l'infrastructure Cloud de Weel-Tech.
      </p>
      <div class="flex gap-3">
        <button onclick="document.getElementById('services').scrollIntoView({behavior: 'smooth'})" class="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl transition shadow-lg">
          Découvrir nos offres
        </button>
        <button onclick="document.getElementById('contact').scrollIntoView({behavior: 'smooth'})" class="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-5 py-3 rounded-xl transition">
          Nous contacter
        </button>
      </div>
    </div>
    <div class="relative">
      <div class="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-10 blur-xl"></div>
      <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800" alt="Weel-Tech Website Preview" class="rounded-3xl shadow-xl border border-slate-200 relative object-cover h-80 w-full" />
    </div>
  </section>

  <!-- Services / Features Grid -->
  <section id="services" class="bg-white py-16 border-t border-slate-100">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center max-w-lg mx-auto space-y-3 mb-12">
        <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900">Nos Services Premium</h2>
        <p class="text-slate-500 text-sm">Une gamme complète d'outils et de solutions adaptées à vos besoins professionnels.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-blue-100 hover:shadow-lg transition">
          <div class="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/10">
            <i data-lucide="zap"></i>
          </div>
          <h3 class="font-bold text-base text-slate-900 mb-2">Performance Ultime</h3>
          <p class="text-slate-500 text-xs leading-relaxed">Chargement ultra-rapide et optimisation globale des performances pour une expérience utilisateur sans compromis.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-blue-100 hover:shadow-lg transition">
          <div class="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/10">
            <i data-lucide="shield"></i>
          </div>
          <h3 class="font-bold text-base text-slate-900 mb-2">Hébergement Sécurisé</h3>
          <p class="text-slate-500 text-xs leading-relaxed">Certificat SSL gratuit, serveurs isolés et haute disponibilité pour garder votre site en sécurité 24/7.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-100 hover:border-blue-100 hover:shadow-lg transition">
          <div class="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/10">
            <i data-lucide="smartphone"></i>
          </div>
          <h3 class="font-bold text-base text-slate-900 mb-2">100% Responsive</h3>
          <p class="text-slate-500 text-xs leading-relaxed">Un design fluide et dynamique qui s'adapte parfaitement sur tous les écrans d'ordinateurs, de tablettes et mobiles.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive Contact Section -->
  <section id="contact" class="py-16 max-w-4xl mx-auto px-6 text-center space-y-6">
    <div class="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
      <div class="absolute inset-0 bg-radial-at-t from-blue-600/20 via-transparent to-transparent"></div>
      <div class="relative z-10 max-w-md mx-auto space-y-4">
        <h2 class="text-2xl font-bold font-display">Prêt à propulser vos projets ?</h2>
        <p class="text-slate-400 text-xs">Entrez votre email ci-dessous pour recevoir notre brochure complète d'offres et prendre rendez-vous gratuitement.</p>
        
        <form onsubmit="event.preventDefault(); document.getElementById('success-msg').classList.remove('hidden'); this.classList.add('hidden')" class="flex flex-col sm:flex-row gap-2 mt-4">
          <input type="email" required placeholder="votre.email@adresse.com" class="bg-white/10 text-white text-xs border border-white/10 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1" />
          <button type="submit" class="bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold px-6 py-3 rounded-xl transition">S'inscrire</button>
        </form>
        <div id="success-msg" class="hidden p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl">
          ✓ Merci ! Votre inscription a bien été prise en compte. Notre équipe vous contacte sous 24h.
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-slate-950 text-slate-500 py-8 border-t border-slate-900 mt-auto text-center text-xs">
    <p>&copy; ${new Date().getFullYear()} ${site.name}. Hébergé fièrement sur Weel-Tech.</p>
  </footer>

  <script>
    lucide.createIcons();
  </script>
</body>
</html>
      `;
      setPreviewSiteHtml(fallbackHtml);
      setPreviewSiteName(site.name);
    }
  };

  // Stats calculators
  const totalSites = sites.length;
  const activeSites = sites.filter(s => s.status === 'active').length;
  const totalVisitors = sites.reduce((acc, curr) => acc + curr.visitors_24h, 0);

  // Filter sites
  const filteredSites = sites.filter(s => filterType === 'all' || s.type === filterType);

  return (
    <div className="space-y-6">
      {/* Overview Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold font-display text-[#0A0E1A] tracking-tight">Mes sites web</h1>
          <p className="text-[15px] text-slate-500">Concevez, gérez et suivez les performances de vos projets web en temps réel.</p>
        </div>
        <button
          onClick={fetchSites}
          className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-xs font-semibold cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs sm:text-sm flex gap-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Performance Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="main-card">
          <p className="text-[12px] uppercase tracking-wider font-semibold text-slate-400">Total projets</p>
          <p className="text-[40px] font-mono font-semibold text-[#0A0E1A] mt-1 leading-tight">{totalSites}</p>
          <p className="text-[12px] text-slate-400 mt-1">Sites configurés sur l'instance</p>
        </div>
        <div className="main-card">
          <p className="text-[12px] uppercase tracking-wider font-semibold text-slate-400">Sites publiés</p>
          <p className="text-[40px] font-mono font-semibold text-[#2563EB] mt-1 leading-tight">
            {activeSites} <span className="text-[15px] font-mono font-normal text-slate-400">/ {totalSites}</span>
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Visibles publiquement sur internet</p>
        </div>
        <div className="main-card">
          <p className="text-[12px] uppercase tracking-wider font-semibold text-slate-400">Visiteurs uniques (24h)</p>
          <p className="text-[40px] font-mono font-semibold text-emerald-600 mt-1 leading-tight">+{totalVisitors}</p>
          <p className="text-[12px] text-slate-400 mt-1">Trafic cumulé sur vos domaines</p>
        </div>
      </div>

      {/* Create Website Panel & List Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Creation Module Form */}
        <div className="main-card space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[24px] font-semibold text-[#0A0E1A] font-display tracking-tight">Lancer un nouveau site</h2>
          </div>
          <p className="text-[15px] text-slate-500 leading-relaxed">
            Remplissez les informations basiques pour déployer instantanément un nouveau serveur statique ou applicatif.
          </p>

          <form onSubmit={handleCreateSite} className="space-y-4 pt-2">
            <div>
              <label className="block text-[12px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Nom du projet</label>
              <input
                type="text"
                required
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="Ex. Boutique de Fleurs"
                className="block w-full px-3 py-2 sleek-input text-[15px] text-[#0A0E1A]"
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Nom de domaine</label>
              <input
                type="text"
                required
                value={newSiteDomain}
                onChange={(e) => setNewSiteDomain(e.target.value)}
                placeholder="Ex. fleuriste-paris.fr"
                className="block w-full px-3 py-2 sleek-input text-[15px] text-[#0A0E1A]"
              />
              <span className="text-[12px] text-slate-400 mt-1 block">Sans http://. Si aucune extension n'est entrée, `.weel.site` sera ajouté.</span>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Type d'application</label>
              <select
                value={newSiteType}
                onChange={(e: any) => setNewSiteType(e.target.value)}
                className="block w-full px-3 py-2 sleek-input text-[15px] text-[#0A0E1A] cursor-pointer"
              >
                <option value="vitrine">Site Vitrine (HTML/CSS)</option>
                <option value="e-commerce">Boutique en ligne (E-commerce)</option>
                <option value="portfolio">Portfolio créatif</option>
                <option value="blog">Blog d'actualités</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-[15px] font-semibold text-white bg-[#2563EB] hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition cursor-pointer"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Génération...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Créer et déployer
                </>
              )}
            </button>
          </form>
        </div>

        {/* List of Sites */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filtering Control Bar */}
          <div className="bg-white rounded-[12px] border border-slate-200/80 shadow-xs p-6 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[15px] font-semibold text-[#0A0E1A]">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Filtrer par :</span>
            </div>
            <div className="flex gap-1.5">
              {['all', 'vitrine', 'e-commerce', 'portfolio', 'blog'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg uppercase tracking-wider transition cursor-pointer border ${
                    filterType === type
                      ? 'bg-[#0A0E1A] text-white border-[#0A0E1A]'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type === 'all' ? 'Tous' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Sites Display Board */}
          {loading ? (
            <div className="main-card text-center">
              <svg className="animate-spin h-8 w-8 text-[#2563EB] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-[15px] text-slate-500">Chargement de la liste de vos projets...</p>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="main-card text-center">
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-[24px] font-semibold text-[#0A0E1A] font-display">Aucun site disponible</p>
              <p className="text-[15px] text-slate-400 max-w-sm mx-auto mt-1">
                {filterType === 'all' 
                  ? "Vous n'avez pas encore créé de site web. Utilisez le panneau de gauche pour en lancer un dès maintenant !"
                  : `Aucun site de type "${filterType}" trouvé.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSites.map((site) => (
                <div
                  key={site.id}
                  className="main-card hover:border-slate-300 transition-all duration-200 group relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left Info: Icon & Name */}
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-xl ${
                        site.status === 'active' ? 'bg-blue-50 text-[#2563EB]' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[16px] font-semibold font-display text-[#0A0E1A] leading-tight">{site.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold uppercase tracking-wider border ${
                            site.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {site.status === 'active' ? 'Publié' : 'Brouillon'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-500">
                            {site.type}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-400 font-mono mt-1 flex items-center gap-1 hover:text-[#2563EB] transition">
                          <ExternalLink className="w-3 h-3" />
                          <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer">
                            {site.domain}
                          </a>
                        </p>
                      </div>
                    </div>

                    {/* Right Info: Stats or Actions */}
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      {site.status === 'active' && (
                        <div className="text-right pr-4 border-r border-slate-100 hidden sm:block">
                          <span className="text-[12px] text-slate-400 font-semibold block uppercase tracking-wider">Visites (24h)</span>
                          <span className="text-[15px] font-mono font-semibold text-[#0A0E1A]">{site.visitors_24h}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {/* Toggle status */}
                        <button
                          onClick={() => handleToggleStatus(site.id, site.status)}
                          className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-wider border transition cursor-pointer ${
                            site.status === 'active'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {site.status === 'active' ? 'Désactiver' : 'Publier'}
                        </button>

                        {/* View mock site */}
                        <button
                          onClick={(e) => handlePreviewSite(e, site)}
                          className="p-2 text-slate-400 hover:text-[#2563EB] hover:bg-slate-50 rounded-lg transition cursor-pointer"
                          title="Visiter le site"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Delete site */}
                        <button
                          onClick={() => handleDeleteSite(site.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      Certificat SSL auto-activé
                    </span>
                    <span>Mise à jour : {new Date(site.updated_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {previewSiteHtml && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-4xl w-full h-[90vh] border border-slate-200 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand-blue" />
                  <h3 className="font-bold text-base font-display text-brand-dark">{previewSiteName}</h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex gap-1">
                    <button
                      onClick={() => setPreviewSiteMode('desktop')}
                      className={`p-1 rounded-md transition cursor-pointer ${previewSiteMode === 'desktop' ? 'bg-white text-brand-blue shadow-xs font-semibold' : 'text-slate-400'}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewSiteMode('mobile')}
                      className={`p-1 rounded-md transition cursor-pointer ${previewSiteMode === 'mobile' ? 'bg-white text-brand-blue shadow-xs font-semibold' : 'text-slate-400'}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setPreviewSiteHtml(null);
                      setPreviewSiteName(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-2xl p-4 flex items-center justify-center overflow-hidden">
                <div className={`w-full h-full transition-all duration-300 flex items-center justify-center ${previewSiteMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
                  {previewSiteMode === 'mobile' ? (
                    <div className="w-full h-[540px] bg-slate-900 rounded-[36px] border-[10px] border-slate-900 shadow-xl overflow-hidden relative flex flex-col">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-3 bg-slate-900 rounded-b-lg z-20 flex items-center justify-center">
                        <div className="w-6 h-1 bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="flex-1 bg-white pt-2 rounded-xl overflow-hidden">
                        <iframe srcDoc={previewSiteHtml} className="w-full h-full border-none" title="Aperçu mobile" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                      <iframe srcDoc={previewSiteHtml} className="w-full h-full border-none" title="Aperçu ordinateur" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
