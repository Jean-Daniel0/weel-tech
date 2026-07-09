import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { DomainName, Site, UserProfile } from '../types';
import { Link2, Search, Plus, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Unlink, Globe, Settings, Network, Check } from 'lucide-react';

interface DomainViewProps {
  userProfile: UserProfile | null;
}

export default function DomainView({ userProfile }: DomainViewProps) {
  const [domains, setDomains] = useState<DomainName[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Domain Search / Simulation state
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    domain: string;
    available: boolean;
    price: string;
    rawPrice?: number;
    basePrice?: number;
    planUsed?: string;
    isSimulated?: boolean;
  } | null>(null);

  const [registering, setRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Domain Purchase Workflow states
  const [purchaseStep, setPurchaseStep] = useState<'idle' | 'configure' | 'purchasing' | 'success_vendza' | 'success_external'>('idle');
  const [purchaseUsageType, setPurchaseUsageType] = useState<'vendza_site' | 'external'>('vendza_site');
  const [purchaseSiteId, setPurchaseSiteId] = useState<string>('');
  const [purchaseSteps, setPurchaseSteps] = useState<string[]>([]);
  const [purchaseStatusText, setPurchaseStatusText] = useState<string>('');

  useEffect(() => {
    fetchDomainsAndSites();
  }, [userProfile]);

  const fetchDomainsAndSites = async () => {
    if (!userProfile) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      // Fetch domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('registered_at', { ascending: false });

      if (domainsError) throw domainsError;
      setDomains(domainsData || []);

      // Fetch sites to link to
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', userProfile.id);

      if (sitesError) throw sitesError;
      setSites(sitesData || []);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de charger les données DNS et de domaines.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setSearching(true);
    setErrorMessage(null);
    setAvailabilityResult(null);
    setPurchaseStep('idle');

    try {
      // Check if domain includes extension
      let formatted = searchTerm.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
      if (!formatted.includes('.')) {
        formatted += '.fr';
      }

      // Check if they already own it
      const alreadyOwned = domains.some(d => d.domain_name === formatted);
      if (alreadyOwned) {
        setAvailabilityResult({
          domain: formatted,
          available: false,
          price: 'Indisponible'
        });
        setSearching(false);
        return;
      }

      const response = await fetch('/api/edge/search-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: formatted,
          userId: userProfile?.id,
          plan: userProfile?.plan,
        }),
      });

      if (!response.ok) {
        throw new Error("Impossible de vérifier la disponibilité du domaine.");
      }

      const data = await response.json();
      if (data.success) {
        setAvailabilityResult({
          domain: data.domain,
          available: data.available,
          price: `${data.finalPrice.toFixed(2)} €/an`,
          rawPrice: data.finalPrice,
          basePrice: data.basePrice,
          planUsed: data.planUsed,
          isSimulated: data.isSimulated
        });
      } else {
        throw new Error(data.error || "Erreur de recherche");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erreur lors de la vérification du domaine.");
    } finally {
      setSearching(false);
    }
  };

  const handlePurchaseDomain = async () => {
    if (!userProfile || !availabilityResult) return;
    
    // Validate site selection if using Vendza site
    if (purchaseUsageType === 'vendza_site' && !purchaseSiteId) {
      setErrorMessage("Veuillez sélectionner un site Vendza-Site pour l'association automatique.");
      return;
    }

    setRegistering(true);
    setErrorMessage(null);
    setPurchaseStep('purchasing');
    setPurchaseSteps(["Initialisation de la transaction...", "Contact de la Edge Function 'purchase-domain'..."]);

    try {
      const response = await fetch('/api/edge/purchase-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: availabilityResult.domain,
          userId: userProfile.id,
          plan: userProfile.plan,
          usageType: purchaseUsageType,
          siteId: purchaseUsageType === 'vendza_site' ? purchaseSiteId : undefined
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Une erreur est survenue lors de l'achat.");
      }

      const result = await response.json();
      if (result.success) {
        setPurchaseSteps(result.steps || []);
        setPurchaseStatusText(result.statusText || '');
        
        // Sync with browser fallback DB if Supabase isn't connected
        if (!(import.meta as any).env?.VITE_SUPABASE_URL) {
          const localDomains = JSON.parse(localStorage.getItem('weel_tech_domains') || '[]');
          localDomains.push(result.domain);
          localStorage.setItem('weel_tech_domains', JSON.stringify(localDomains));
        }

        // Set success step
        if (purchaseUsageType === 'vendza_site') {
          setPurchaseStep('success_vendza');
        } else {
          setPurchaseStep('success_external');
        }

        // Clean up input and reload list
        setSearchTerm('');
        fetchDomainsAndSites();
      } else {
        throw new Error(result.error || "L'enregistrement du domaine a échoué.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Échec de l'achat du domaine.");
      setPurchaseStep('configure'); // return to choice step on failure
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleDNS = async (domainId: string, currentDnsStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('domains')
        .update({ dns_configured: !currentDnsStatus })
        .eq('id', domainId);

      if (error) throw error;
      setDomains(domains.map(d => d.id === domainId ? { ...d, dns_configured: !currentDnsStatus } : d));
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de modifier la configuration DNS.");
    }
  };

  const handleLinkSite = async (domainId: string, siteId: string) => {
    try {
      const { error } = await supabase
        .from('domains')
        .update({ linked_site_id: siteId || null })
        .eq('id', domainId);

      if (error) throw error;
      setDomains(domains.map(d => d.id === domainId ? { ...d, linked_site_id: siteId || undefined } : d));
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible d'associer le site web.");
    }
  };

  const handleReleaseDomain = async (domainId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir abandonner ou résilier ce nom de domaine ? Cette opération est irréversible.")) return;
    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      setDomains(domains.filter(d => d.id !== domainId));
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de supprimer le domaine.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Head section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold px-2 py-0.5 rounded-lg bg-brand-dark text-white tracking-wider uppercase">Vendza</span>
            <h1 className="text-2xl font-bold font-display text-brand-dark tracking-tight">Domaine &middot; Gestion DNS</h1>
          </div>
          <p className="text-sm text-gray-500">Enregistrez des noms de domaine, configurez vos redirections et reliez-les à vos sites.</p>
        </div>
        <button
          onClick={fetchDomainsAndSites}
          className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs sm:text-sm">
          {errorMessage}
        </div>
      )}

      {/* Grid Layout: Left Registry search, Right domains list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registry Simulator Panel */}
        <div className="main-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-brand-blue" />
            <h2 className="text-base font-bold text-brand-dark font-display">Acheter un domaine</h2>
          </div>
          <p className="text-xs text-slate-500">
            Trouvez une adresse web mémorable et associez-la en un clic à vos serveurs applicatifs Weel-Tech.
          </p>

          <form onSubmit={handleSearchDomain} className="space-y-3 pt-2">
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rechercher une adresse</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex. ma-boutique.com"
                  className="block w-full pl-3 pr-10 py-2 sleek-input text-xs text-brand-dark sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="absolute inset-y-1.5 right-1.5 px-2 bg-brand-dark text-white rounded-lg hover:bg-black transition flex items-center justify-center cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>

          {availabilityResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 animate-fade-in">
              {/* Step 1: Found Domain & Basic Price Info */}
              {purchaseStep === 'idle' && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono font-bold text-brand-dark break-all">{availabilityResult.domain}</p>
                      <p className={`text-4xs font-semibold mt-0.5 ${
                        availabilityResult.available ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {availabilityResult.available ? '✓ Disponible à l\'enregistrement' : '✗ Déjà enregistré ou indisponible'}
                      </p>
                    </div>
                    {availabilityResult.available && (
                      <div className="text-right">
                        <span className="text-sm font-bold text-brand-dark block">{availabilityResult.price}</span>
                        {availabilityResult.planUsed && (
                          <span className="text-5xs text-slate-400 block font-medium">Tarif plan {userProfile?.plan || 'Standard'}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {availabilityResult.available ? (
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setPurchaseStep('configure')}
                        className="w-full py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-700 transition font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Acheter ce domaine
                      </button>
                    </div>
                  ) : (
                    <p className="text-4xs text-slate-400">Ce domaine appartient déjà à un tiers ou à votre portefeuille.</p>
                  )}
                </div>
              )}

              {/* Step 2: Choose Destination / Usage Type */}
              {purchaseStep === 'configure' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Configuration de l'achat</h4>
                    <p className="text-4xs text-slate-500 mt-0.5">Où allez-vous utiliser ce domaine ?</p>
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div className="p-2 bg-white border border-slate-200 rounded-lg text-4xs text-slate-600 space-y-1 font-medium">
                    <div className="flex justify-between">
                      <span>Tarif de base Dynadot :</span>
                      <span className="font-mono">{(availabilityResult.basePrice || 9.99).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-brand-blue">
                      <span>Marge plan ({userProfile?.plan ? userProfile.plan.toUpperCase() : 'Aucun'}) :</span>
                      <span>{userProfile?.plan === 'business' ? '+5% (Marge réduite)' : userProfile?.plan === 'pro' ? '+15%' : userProfile?.plan === 'starter' ? '+30%' : '+50% (Marge standard)'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-brand-dark">
                      <span>Prix d'achat final :</span>
                      <span>{availabilityResult.price}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPurchaseUsageType('vendza_site')}
                      className={`p-3 text-left border rounded-xl flex flex-col gap-2 transition cursor-pointer ${
                        purchaseUsageType === 'vendza_site'
                          ? 'border-brand-blue bg-blue-50/50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Globe className={`w-4 h-4 ${purchaseUsageType === 'vendza_site' ? 'text-brand-blue' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-4xs font-bold text-brand-dark">Sur Vendza-Site</p>
                        <p className="text-5xs text-slate-400 mt-0.5">Liaison auto & DNS Cloudflare</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurchaseUsageType('external')}
                      className={`p-3 text-left border rounded-xl flex flex-col gap-2 transition cursor-pointer ${
                        purchaseUsageType === 'external'
                          ? 'border-brand-blue bg-blue-50/50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Link2 className={`w-4 h-4 ${purchaseUsageType === 'external' ? 'text-brand-blue' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-4xs font-bold text-brand-dark">Ailleurs (externe)</p>
                        <p className="text-5xs text-slate-400 mt-0.5">Configuration DNS manuelle</p>
                      </div>
                    </button>
                  </div>

                  {/* Dropdown for sites if usage type is vendza_site */}
                  {purchaseUsageType === 'vendza_site' && (
                    <div className="space-y-1">
                      <label className="block text-4xs font-bold text-slate-500 uppercase tracking-wider">Sélectionner votre site Vendza</label>
                      <select
                        value={purchaseSiteId}
                        onChange={(e) => setPurchaseSiteId(e.target.value)}
                        className="block w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-4xs text-brand-dark outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
                      >
                        <option value="">-- Sélectionner un site --</option>
                        {sites.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPurchaseStep('idle')}
                      className="flex-1 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-5xs font-bold hover:bg-slate-100 transition text-center cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      disabled={registering}
                      onClick={handlePurchaseDomain}
                      className="flex-2 py-1.5 bg-brand-blue text-white rounded-lg text-5xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Confirmer et Payer ({availabilityResult.price})
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Purchasing Progress */}
              {purchaseStep === 'purchasing' && (
                <div className="space-y-4 py-2">
                  <div className="text-center">
                    <svg className="animate-spin h-6 w-6 text-brand-blue mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs font-bold text-brand-dark">Achat & configuration en cours</p>
                    <p className="text-5xs text-brand-blue font-semibold mt-1 animate-pulse">Connexion automatique en cours...</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-5xs font-mono text-slate-500 max-h-40 overflow-y-auto">
                    {purchaseSteps.map((s, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span className="text-emerald-500">&gt;</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4a: Success Vendza Site (Automatic Cloudflare Setup) */}
              {purchaseStep === 'success_vendza' && (
                <div className="space-y-4 text-center py-2 animate-fade-in">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-dark">Domaine Activé avec Succès !</h4>
                    <p className="text-5xs text-emerald-600 font-semibold mt-1">Connexion automatique en cours...</p>
                    <p className="text-4xs text-slate-500 mt-2">
                      Le domaine <strong>{availabilityResult.domain}</strong> a été réservé sur Dynadot. Ses serveurs de noms DNS ont été redirigés automatiquement vers Cloudflare et liés à votre projet.
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-left space-y-2">
                    <p className="text-5xs font-bold text-slate-400 uppercase tracking-wider">Serveurs DNS Configurés (Cloudflare) :</p>
                    <div className="space-y-1 text-5xs font-mono text-slate-600">
                      <div>ns0 : <code className="bg-slate-50 px-1 py-0.5 border rounded">jay.ns.cloudflare.com</code></div>
                      <div>ns1 : <code className="bg-slate-50 px-1 py-0.5 border rounded">leslie.ns.cloudflare.com</code></div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAvailabilityResult(null);
                      setPurchaseStep('idle');
                    }}
                    className="w-full py-1.5 bg-brand-dark text-white rounded-lg text-5xs font-bold hover:bg-black transition cursor-pointer"
                  >
                    Fermer le guichet
                  </button>
                </div>
              )}

              {/* Step 4b: Success External Site (Manual Configuration Guide) */}
              {purchaseStep === 'success_external' && (
                <div className="space-y-4 animate-fade-in py-2">
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 bg-blue-50 text-brand-blue rounded-full flex items-center justify-center mx-auto border border-blue-100">
                      <Check className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-brand-dark">Domaine Enregistré !</h4>
                    <p className="text-5xs text-amber-600 font-semibold">Redirection vers panneau de gestion DNS manuel</p>
                    <p className="text-4xs text-slate-500">
                      Le domaine <strong>{availabilityResult.domain}</strong> est à vous. Veuillez configurer manuellement vos serveurs ou entrées DNS pour le pointer vers Weel-Tech.
                    </p>
                  </div>

                  {/* Manual DNS Guide Records */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                    <p className="text-5xs font-bold text-slate-400 uppercase tracking-wider">Entrées DNS requises :</p>
                    <div className="space-y-2 text-5xs font-mono">
                      <div className="border-b border-slate-100 pb-1.5">
                        <div className="flex justify-between font-bold text-brand-dark">
                          <span>Type A</span>
                          <span className="text-brand-blue">@</span>
                        </div>
                        <div className="flex justify-between text-slate-500 mt-1">
                          <span>Valeur :</span>
                          <code className="bg-slate-50 px-1 border rounded">185.190.140.10</code>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between font-bold text-brand-dark">
                          <span>CNAME</span>
                          <span className="text-brand-blue">www</span>
                        </div>
                        <div className="flex justify-between text-slate-500 mt-1">
                          <span>Cible :</span>
                          <code className="bg-slate-50 px-1 border rounded">dns.weel-tech.fr</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAvailabilityResult(null);
                      setPurchaseStep('idle');
                    }}
                    className="w-full py-1.5 bg-brand-dark text-white rounded-lg text-5xs font-bold hover:bg-black transition cursor-pointer"
                  >
                    Fermer le guichet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio of Registered Domains */}
        <div className="lg:col-span-2 space-y-4">
          <div className="main-card p-4">
            <h3 className="text-sm font-bold font-display text-brand-dark mb-1">Vos noms de domaine ({domains.length})</h3>
            <p className="text-4xs text-slate-400">Vos serveurs DNS Weel-Tech pointent vers : <code className="font-mono bg-slate-50 text-brand-blue px-1 rounded border border-slate-200">ns1.weel-tech.fr</code></p>
          </div>

          {domains.length === 0 ? (
            <div className="main-card p-12 text-center">
              <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-brand-dark font-display">Aucun nom de domaine</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Recherchez une extension disponible ci-contre pour réserver vos premiers DNS Weel-Tech.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((dom) => {
                const linkedSite = sites.find(s => s.id === dom.linked_site_id);
                
                return (
                  <div key={dom.id} className="main-card p-5 hover:border-slate-300 transition relative">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      
                      {/* Left Block */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold font-mono text-brand-dark">{dom.domain_name}</h4>
                          
                          {/* Usage Type Badge */}
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-5xs font-bold uppercase tracking-wider border ${
                            dom.usage_type === 'external'
                              ? 'bg-orange-50 text-orange-700 border-orange-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                          }`}>
                            {dom.usage_type === 'external' ? 'Usage Externe' : 'Vendza-Site (Auto)'}
                          </span>

                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-5xs font-bold uppercase tracking-wider border ${
                            dom.dns_configured
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {dom.dns_configured 
                              ? (dom.usage_type === 'external' ? 'DNS Configuré' : 'DNS Connecté')
                              : (dom.usage_type === 'external' ? 'En attente de pointage' : 'Connexion automatique en cours...')
                            }
                          </span>
                        </div>

                        {/* Usage Type Subtext */}
                        {dom.usage_type === 'external' ? (
                          <p className="text-5xs text-amber-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Veuillez configurer vos entrées DNS chez votre hébergeur externe (voir ci-dessous).
                          </p>
                        ) : (
                          <p className="text-5xs text-emerald-600 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            Serveurs DNS gérés automatiquement via l'API Dynadot & Cloudflare Pages.
                          </p>
                        )}

                        {/* Associated Site selector / status */}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>Lien d'hébergement :</span>
                          <select
                            value={dom.linked_site_id || ''}
                            onChange={(e) => handleLinkSite(dom.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-600 outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
                          >
                            <option value="">Non associé</option>
                            {sites.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
 
                      {/* Right Block Actions */}
                      <div className="flex items-center gap-2 sm:self-start self-end">
                        <button
                          onClick={() => handleToggleDNS(dom.id, dom.dns_configured)}
                          className={`px-2.5 py-1 text-4xs font-bold rounded-lg uppercase tracking-wider border transition cursor-pointer ${
                            dom.dns_configured
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {dom.dns_configured ? 'Couper DNS' : 'Activer DNS'}
                        </button>
                        
                        <button
                          onClick={() => handleReleaseDomain(dom.id)}
                          className="px-2.5 py-1 text-4xs font-bold rounded-lg uppercase tracking-wider bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition cursor-pointer"
                        >
                          Résilier
                        </button>
                      </div>
                    </div>
 
                    {/* Footer records validation */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-5xs font-mono text-slate-400">
                      {dom.usage_type === 'external' ? (
                        <div className="flex gap-4">
                          <span>A (IP Weel) : <code className="bg-slate-50 px-1 border border-slate-200 rounded text-brand-dark font-bold">185.190.140.10</code></span>
                          <span>CNAME (WWW) : <code className="bg-slate-50 px-1 border border-slate-200 rounded text-brand-dark font-bold">dns.weel-tech.fr</code></span>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <span>Nameservers : <code className="bg-slate-50 px-1 border border-slate-200 rounded text-indigo-600 font-bold">jay.ns.cloudflare.com</code> & <code className="bg-slate-50 px-1 border border-slate-200 rounded text-indigo-600 font-bold">leslie.ns.cloudflare.com</code></span>
                        </div>
                      )}
                      <span className="self-end sm:self-auto">Expiration : {new Date(dom.expires_at).toLocaleDateString('fr-FR')}</span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
