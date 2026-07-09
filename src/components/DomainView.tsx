import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { DomainName, Site, UserProfile } from '../types';
import { Link2, Search, Plus, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Unlink, Globe, Settings, Network, Check, ArrowLeft, Trash2, Edit } from 'lucide-react';

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
  const [searchResults, setSearchResults] = useState<Array<{
    domain: string;
    available: boolean;
    price: string;
    rawPrice?: number;
    basePrice?: number;
    planUsed?: string;
    isSimulated?: boolean;
  }>>([]);

  const [registering, setRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Domain Purchase Workflow states
  const [purchaseStep, setPurchaseStep] = useState<'idle' | 'configure' | 'purchasing' | 'success_vendza' | 'success_external'>('idle');
  const [purchaseUsageType, setPurchaseUsageType] = useState<'vendza_site' | 'external'>('vendza_site');
  const [purchaseSiteId, setPurchaseSiteId] = useState<string>('');
  const [purchaseSteps, setPurchaseSteps] = useState<string[]>([]);
  const [purchaseStatusText, setPurchaseStatusText] = useState<string>('');

  // DNS Records Management States
  const [selectedDomainForDns, setSelectedDomainForDns] = useState<DomainName | null>(null);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncingRecordId, setSyncingRecordId] = useState<string | null>(null);

  // DNS Form State
  const [dnsType, setDnsType] = useState<'A' | 'CNAME' | 'MX' | 'TXT'>('A');
  const [dnsName, setDnsName] = useState('@');
  const [dnsValue, setDnsValue] = useState('');
  const [dnsTtl, setDnsTtl] = useState<number>(14400);
  const [dnsPriority, setDnsPriority] = useState<number>(10);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDomainForDns) {
      fetchDnsRecords(selectedDomainForDns.id);
    }
  }, [selectedDomainForDns]);

  const fetchDnsRecords = async (domainId: string) => {
    setDnsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dns_records')
        .select('*')
        .eq('domain_id', domainId);
      if (error) throw error;
      setDnsRecords(data || []);
    } catch (err: any) {
      console.error("Error fetching DNS records:", err);
      setErrorMessage("Impossible de charger les enregistrements DNS.");
    } finally {
      setDnsLoading(false);
    }
  };

  const handleUpdateConnectionStatus = async (domainId: string, status: 'pending' | 'propagating' | 'active' | 'failed') => {
    try {
      const { error } = await supabase
        .from('domains')
        .update({ connection_status: status })
        .eq('id', domainId);
      if (error) throw error;

      setDomains(prev => prev.map(d => d.id === domainId ? { ...d, connection_status: status } : d));
      if (selectedDomainForDns && selectedDomainForDns.id === domainId) {
        setSelectedDomainForDns(prev => prev ? { ...prev, connection_status: status } : null);
      }
    } catch (err: any) {
      console.error("Error updating connection status:", err);
    }
  };

  const handleSaveDnsRecord = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDomainForDns || !dnsValue) return;

    setDnsLoading(true);
    setSyncLogs([]);
    setErrorMessage(null);

    const isEdit = !!editingRecordId;
    const tempId = editingRecordId || 'dns-rec-' + Math.random().toString(36).substring(2, 11);

    const recordPayload = {
      id: tempId,
      domain_id: selectedDomainForDns.id,
      type: dnsType,
      name: dnsName,
      value: dnsValue,
      ttl: dnsTtl,
      priority: dnsType === 'MX' ? dnsPriority : undefined,
      synced_with_dynadot: false,
      created_at: new Date().toISOString()
    };

    setSyncingRecordId(tempId);

    try {
      const response = await fetch('/api/edge/sync-dns-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          record: recordPayload,
          domainName: selectedDomainForDns.domain_name,
          action: isEdit ? 'edit' : 'add'
        })
      });

      if (!response.ok) {
        throw new Error("L'API de synchronisation DNS a renvoyé une erreur.");
      }

      const syncResult = await response.json();
      if (syncResult.steps) {
        setSyncLogs(syncResult.steps);
      }

      const finalRecord = {
        ...recordPayload,
        synced_with_dynadot: true
      };

      if (isEdit) {
        const { error } = await supabase
          .from('dns_records')
          .update(finalRecord)
          .eq('id', editingRecordId);
        if (error) throw error;

        setDnsRecords(prev => prev.map(r => r.id === editingRecordId ? finalRecord : r));
      } else {
        const { error } = await supabase
          .from('dns_records')
          .insert([finalRecord]);
        if (error) throw error;

        setDnsRecords(prev => [...prev, finalRecord]);
      }

      // Reset
      setDnsValue('');
      setDnsName('@');
      setDnsType('A');
      setDnsTtl(14400);
      setDnsPriority(10);
      setEditingRecordId(null);
    } catch (err: any) {
      console.error("DNS sync save error:", err);
      setErrorMessage("Une erreur s'est produite lors de la synchronisation de l'enregistrement DNS.");
    } finally {
      setDnsLoading(false);
      setSyncingRecordId(null);
    }
  };

  const handleDeleteDnsRecord = async (recordId: string) => {
    if (!selectedDomainForDns) return;
    if (!confirm("Voulez-vous vraiment supprimer cet enregistrement DNS ?")) return;

    setDnsLoading(true);
    setSyncLogs([]);
    setErrorMessage(null);
    setSyncingRecordId(recordId);

    const recordToDelete = dnsRecords.find(r => r.id === recordId);
    if (!recordToDelete) return;

    try {
      const response = await fetch('/api/edge/sync-dns-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          record: recordToDelete,
          domainName: selectedDomainForDns.domain_name,
          action: 'delete'
        })
      });

      if (!response.ok) {
        throw new Error("Erreur de l'API lors de la suppression de l'enregistrement.");
      }

      const syncResult = await response.json();
      if (syncResult.steps) {
        setSyncLogs(syncResult.steps);
      }

      const { error } = await supabase
        .from('dns_records')
        .delete()
        .eq('id', recordId);
      if (error) throw error;

      setDnsRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err: any) {
      console.error("DNS sync delete error:", err);
      setErrorMessage("Une erreur s'est produite lors de la suppression du DNS.");
    } finally {
      setDnsLoading(false);
      setSyncingRecordId(null);
    }
  };

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
    setSearchResults([]);
    setAvailabilityResult(null);
    setPurchaseStep('idle');

    try {
      // Check if domain includes extension
      let formatted = searchTerm.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
      let extensionsToSend: string[] = [];

      if (!formatted.includes('.')) {
        extensionsToSend = ['.com', '.net', '.org', '.fr', '.io'];
      }

      const response = await fetch('/api/edge/search-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: formatted,
          extensions: extensionsToSend,
          userId: userProfile?.id,
          plan: userProfile?.plan,
        }),
      });

      if (!response.ok) {
        throw new Error("Impossible de vérifier la disponibilité du domaine.");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.results)) {
        const mappedResults = data.results.map((res: any) => {
          const alreadyOwned = domains.some(d => d.domain_name === res.domain);
          return {
            domain: res.domain,
            available: alreadyOwned ? false : res.available,
            price: alreadyOwned ? 'Déjà possédé' : `${res.finalPrice.toFixed(2)} €/an`,
            rawPrice: res.finalPrice,
            basePrice: res.basePrice,
            planUsed: res.planUsed,
            isSimulated: res.isSimulated
          };
        });
        setSearchResults(mappedResults);

        // If a single domain was typed with an extension, automatically select it to show its configuration options
        if (formatted.includes('.')) {
          setAvailabilityResult(mappedResults[0]);
        }
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

  if (selectedDomainForDns) {
    const connStatus = selectedDomainForDns.connection_status || 'pending';
    let statusLabel = 'En attente de propagation';
    let statusBg = 'bg-slate-50 border-slate-200 text-slate-600';
    let statusDot = 'bg-slate-400';

    if (connStatus === 'active') {
      statusLabel = 'Actif & Connecté';
      statusBg = 'bg-emerald-50 border-emerald-200 text-emerald-700';
      statusDot = 'bg-emerald-500';
    } else if (connStatus === 'propagating') {
      statusLabel = 'Propagation en cours...';
      statusBg = 'bg-amber-50 border-amber-200 text-amber-700';
      statusDot = 'bg-amber-500 animate-pulse';
    } else if (connStatus === 'failed') {
      statusLabel = 'Échec de la connexion';
      statusBg = 'bg-red-50 border-red-200 text-red-700';
      statusDot = 'bg-red-500';
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => {
                setSelectedDomainForDns(null);
                setEditingRecordId(null);
                setDnsValue('');
                setDnsName('@');
                setSyncLogs([]);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-dark transition cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour aux domaines
            </button>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-display text-brand-dark tracking-tight">
                Gérer le DNS : <span className="text-brand-blue">{selectedDomainForDns.domain_name}</span>
              </h1>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wider">
                Externe
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Configurez et synchronisez les zones DNS pour pointer le domaine vers votre hébergement.
            </p>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Statut de connexion</span>
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${statusBg}`}>
                <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                {statusLabel}
              </div>
              
              <select
                value={connStatus}
                onChange={(e) => handleUpdateConnectionStatus(selectedDomainForDns.id, e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
                title="Simuler un changement de statut de connexion"
              >
                <option value="pending">En attente (Pending)</option>
                <option value="propagating">En cours (Propagating)</option>
                <option value="active">Actif (Active)</option>
                <option value="failed">Échec (Failed)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Explicit Reminder Alert Banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">Rappel de configuration</p>
            <p>
              Ce domaine n'est pas connecté à un site Vendza-Site. Configurez vos propres enregistrements DNS pour le faire pointer vers votre hébergement actuel.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs sm:text-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DNS Add/Edit Form Panel */}
          <div className="main-card p-5 sm:p-6 space-y-4 h-fit">
            <h3 className="text-base font-bold text-brand-dark font-display flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-blue" />
              {editingRecordId ? "Modifier l'enregistrement" : "Ajouter un enregistrement"}
            </h3>
            <p className="text-xs text-slate-500">
              Saisissez les paramètres de votre zone DNS. La synchronisation automatique avec Dynadot se lancera dès validation.
            </p>

            <form onSubmit={handleSaveDnsRecord} className="space-y-4 pt-2">
              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type d'enregistrement</label>
                <select
                  value={dnsType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setDnsType(type);
                    if (type === 'MX' && dnsName === '@') {
                      setDnsName('@');
                    }
                  }}
                  className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark cursor-pointer"
                >
                  <option value="A">A (Adresse IPv4)</option>
                  <option value="CNAME">CNAME (Alias)</option>
                  <option value="MX">MX (Serveur de Messagerie)</option>
                  <option value="TXT">TXT (Texte brut)</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom (Host)</label>
                <input
                  type="text"
                  required
                  value={dnsName}
                  onChange={(e) => setDnsName(e.target.value)}
                  placeholder="Ex. @ ou www"
                  className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valeur (Target)</label>
                <input
                  type="text"
                  required
                  value={dnsValue}
                  onChange={(e) => setDnsValue(e.target.value)}
                  placeholder={dnsType === 'A' ? "Ex. 185.190.140.10" : dnsType === 'CNAME' ? "Ex. ghs.google.com" : "Ex. mail.mon-domaine.com"}
                  className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark"
                />
              </div>

              {dnsType === 'MX' && (
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priorité (MX uniquement)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="65535"
                    value={dnsPriority}
                    onChange={(e) => setDnsPriority(parseInt(e.target.value) || 10)}
                    className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark"
                  />
                </div>
              )}

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">TTL (Seconds)</label>
                <select
                  value={dnsTtl}
                  onChange={(e) => setDnsTtl(parseInt(e.target.value) || 14400)}
                  className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark cursor-pointer"
                >
                  <option value={300}>300 (5 mins)</option>
                  <option value={600}>600 (10 mins)</option>
                  <option value={3600}>3600 (1 hour)</option>
                  <option value={14400}>14400 (4 hours - Standard)</option>
                  <option value={86400}>86400 (1 day)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={dnsLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-dark text-white rounded-xl hover:bg-black font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {dnsLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Synchronisation...
                    </>
                  ) : editingRecordId ? (
                    "Enregistrer"
                  ) : (
                    "Ajouter"
                  )}
                </button>
                {editingRecordId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecordId(null);
                      setDnsValue('');
                      setDnsName('@');
                      setDnsType('A');
                      setDnsTtl(14400);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>

            {syncLogs.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 font-mono text-4xs text-slate-500 max-h-48 overflow-y-auto">
                <p className="font-bold text-slate-600 mb-1 border-b border-slate-200 pb-1">Logs de Synchronisation Edge :</p>
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="leading-tight">{log}</div>
                ))}
              </div>
            )}
          </div>

          {/* DNS Records Table Panel */}
          <div className="lg:col-span-2 main-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-dark font-display flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-blue" />
                Enregistrements DNS Actuels ({dnsRecords.length})
              </h3>
            </div>

            {dnsLoading && dnsRecords.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-blue" />
                <span className="text-xs">Chargement des enregistrements DNS...</span>
              </div>
            ) : dnsRecords.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-2">
                <p className="text-xs text-slate-400">Aucun enregistrement DNS configuré pour ce domaine.</p>
                <p className="text-5xs text-slate-400 font-mono">Ajoutez un enregistrement à l'aide du panneau latéral gauche pour commencer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 font-bold font-mono text-5xs tracking-wider uppercase border-b border-slate-100">
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Nom (Host)</th>
                      <th className="py-3.5 px-4">Valeur (Target)</th>
                      <th className="py-3.5 px-4">TTL</th>
                      <th className="py-3.5 px-4">Dynadot Sync</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans text-xs">
                    {dnsRecords.map((rec) => {
                      const isSyncingThis = syncingRecordId === rec.id;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/30 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-2xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {rec.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs">
                            {rec.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 break-all text-2xs">
                            {rec.value}
                            {rec.type === 'MX' && rec.priority !== undefined && (
                              <span className="ml-1.5 px-1 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                                Priorité: {rec.priority}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-3xs">
                            {rec.ttl}s
                          </td>
                          <td className="py-3 px-4">
                            {rec.synced_with_dynadot ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Synchronisé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 border border-amber-100 rounded-lg animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                En attente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingRecordId(rec.id);
                                  setDnsType(rec.type);
                                  setDnsName(rec.name);
                                  setDnsValue(rec.value);
                                  setDnsTtl(rec.ttl);
                                  if (rec.priority !== undefined) {
                                    setDnsPriority(rec.priority);
                                  }
                                }}
                                disabled={isSyncingThis || dnsLoading}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                                title="Modifier cet enregistrement"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDnsRecord(rec.id)}
                                disabled={isSyncingThis || dnsLoading}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                                title="Supprimer cet enregistrement"
                              >
                                {isSyncingThis ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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

          {(searchResults.length > 0 || availabilityResult) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 animate-fade-in">
              {/* Step 1: Found Domain & Basic Price Info */}
              {purchaseStep === 'idle' && (
                <div className="space-y-3">
                  <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">
                    Disponibilité des extensions
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {searchResults.map((res) => (
                      <div key={res.domain} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-brand-dark break-all">{res.domain}</p>
                          <p className={`text-5xs font-semibold mt-0.5 ${
                            res.available ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {res.available ? '✓ Disponible' : '✗ Indisponible'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {res.available ? (
                            <div className="flex items-center gap-2">
                              <span className="text-2xs font-bold text-brand-dark">{res.price}</span>
                              <button
                                onClick={() => {
                                  setAvailabilityResult(res);
                                  setPurchaseStep('configure');
                                }}
                                className="px-2 py-1 bg-brand-blue hover:bg-blue-600 text-white font-bold text-5xs rounded-lg transition cursor-pointer flex items-center gap-0.5"
                              >
                                <Plus className="w-3 h-3" />
                                Choisir
                              </button>
                            </div>
                          ) : (
                            <span className="text-5xs text-slate-400 font-semibold">Indisponible</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      setSearchResults([]);
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
                      setSearchResults([]);
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

                          {dom.usage_type === 'external' && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-5xs font-bold uppercase tracking-wider border ${
                              dom.connection_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              dom.connection_status === 'propagating' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                              dom.connection_status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-slate-50 text-slate-700 border-slate-100'
                            }`}>
                              Connexion: {dom.connection_status || 'pending'}
                            </span>
                          )}
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
                        {dom.usage_type === 'external' && (
                          <button
                            onClick={() => setSelectedDomainForDns(dom)}
                            className="px-2.5 py-1 text-4xs font-bold rounded-lg uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                          >
                            Gérer le DNS
                          </button>
                        )}

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
