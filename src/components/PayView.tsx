import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { PaymentTransaction, UserProfile, ApiKey } from '../types';
import { 
  CreditCard, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  Send, 
  Sparkles, 
  Key, 
  Trash2, 
  ArrowRightLeft, 
  ShieldCheck, 
  Check, 
  XCircle,
  HelpCircle,
  QrCode,
  Settings2,
  Code,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PayViewProps {
  userProfile: UserProfile | null;
}

export default function PayView({ userProfile }: PayViewProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  
  // Configuration State (persisted locally)
  const [isStripeConnected, setIsStripeConnected] = useState<boolean>(() => {
    return localStorage.getItem('weel_tech_stripe_connected') === 'true';
  });
  const [isMonCashConnected, setIsMonCashConnected] = useState<boolean>(() => {
    return localStorage.getItem('weel_tech_moncash_connected') === 'true';
  });

  // Standalone Mode State (persisted locally)
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(() => {
    return localStorage.getItem('weel_tech_standalone_mode') !== 'false'; // defaults to true
  });

  // Transferred balance state (persisted locally)
  const [transferredAmount, setTransferredAmount] = useState<number>(() => {
    const val = localStorage.getItem('weel_tech_transferred_amount');
    return val ? parseFloat(val) : 150.00;
  });

  // Swept transaction IDs state (persisted locally to compute pending transfers)
  const [sweptTxIds, setSweptTxIds] = useState<string[]>(() => {
    const val = localStorage.getItem('weel_tech_swept_tx_ids');
    return val ? JSON.parse(val) : [];
  });

  // API Key creation state
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);

  // New transaction form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'succeeded' | 'pending' | 'failed'>('succeeded');
  const [method, setMethod] = useState<string>('');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Widget Configuration state
  const [widgetApiKey, setWidgetApiKey] = useState<string>('');
  const [widgetAmount, setWidgetAmount] = useState<string>('49.00');
  const [widgetCurrency, setWidgetCurrency] = useState<string>('EUR');
  const [widgetSiteId, setWidgetSiteId] = useState<string>('site-1');
  const [widgetDesc, setWidgetDesc] = useState<string>('Abonnement Premium');
  const [widgetCustName, setWidgetCustName] = useState<string>('Marie Dupont');
  const [widgetCustEmail, setWidgetCustEmail] = useState<string>('marie@dupont.com');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDiv, setCopiedDiv] = useState(false);
  
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  useEffect(() => {
    fetchTransactions();
    fetchApiKeys();
    
    // Fetch sites for MonCash simulation
    const fetchSites = async () => {
      if (!userProfile) return;
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('*')
          .eq('user_id', userProfile.id);
        if (!error && data) {
          setSites(data);
          if (data.length > 0) {
            setSelectedSiteId(data[0].id);
          }
        }
      } catch (e) {
        console.error("Error fetching sites:", e);
      }
    };
    fetchSites();
  }, [userProfile]);

  // Handle Stripe Connect onboarding redirect params (success / cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboard-success') === 'true') {
      setIsStripeConnected(true);
      localStorage.setItem('weel_tech_stripe_connected', 'true');
      const accountId = params.get('accountId') || '';
      showNotification(`Connexion Stripe réussie ! Compte connecté : ${accountId}`);
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchTransactions();
    } else if (params.get('onboard-canceled') === 'true') {
      showNotification("Onboarding Stripe annulé.", true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Set default method when configuration changes
  useEffect(() => {
    if (isStripeConnected) {
      setMethod('Stripe');
    } else if (isMonCashConnected) {
      setMethod('MonCash');
    } else if (isStandaloneMode) {
      setMethod('API');
    } else {
      setMethod('Stripe');
    }
  }, [isStripeConnected, isMonCashConnected, isStandaloneMode]);

  const fetchTransactions = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // 1. Fetch from Supabase / Mock database
      const { data: localData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 2. Fetch from backend webhook transactions and merge them
      const mergedData = [...(localData || [])];
      try {
        const response = await fetch(`/api/backend-transactions?userId=${userProfile.id}`);
        if (response.ok) {
          const backendData = await response.json();
          // Filter out duplicates (checking by ID)
          const localIds = new Set(mergedData.map(tx => tx.id));
          backendData.forEach((tx: any) => {
            if (!localIds.has(tx.id)) {
              mergedData.push(tx);
            }
          });
        }
      } catch (e) {
        console.warn("Could not fetch backend transactions:", e);
      }

      // Sort by created_at descending
      mergedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(mergedData);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Impossible de charger les transactions financières.");
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    if (!userProfile) return;
    setLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const keys = data || [];
      setApiKeys(keys);
      const active = keys.find(k => k.status === 'active');
      if (active) {
        setWidgetApiKey(active.key);
      } else if (keys.length > 0) {
        setWidgetApiKey(keys[0].key);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Toggle/Connect Stripe onboarding flow
  const handleToggleStripe = async () => {
    if (isStripeConnected) {
      // If already connected, disconnect it
      setIsStripeConnected(false);
      localStorage.setItem('weel_tech_stripe_connected', 'false');
      showNotification("Stripe a été déconnecté de votre compte.");
      return;
    }

    // Otherwise, generate real or simulated onboarding link
    setLoading(true);
    try {
      const response = await fetch('/api/connect-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.id || 'demo-user-123',
          plan: userProfile?.plan || 'starter',
          email: userProfile?.email || 'demo@weel-tech.fr'
        })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la communication avec le serveur.");
      }

      const data = await response.json();
      if (data.url) {
        if (data.simulated) {
          showNotification("Génération de l'onboarding de simulation...", false);
        } else {
          showNotification("Redirection sécurisée vers Stripe Connect...", false);
        }
        // Redirect to Stripe onboarding URL
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Lien d'onboarding non reçu du serveur.");
      }
    } catch (err: any) {
      console.error(err);
      showNotification(`Erreur d'onboarding: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Toggle MonCash connection
  const handleToggleMonCash = () => {
    const nextState = !isMonCashConnected;
    setIsMonCashConnected(nextState);
    localStorage.setItem('weel_tech_moncash_connected', String(nextState));
    showNotification(
      nextState 
        ? "MonCash a été configuré et connecté avec succès !" 
        : "MonCash a été déconnecté de votre compte."
    );
  };

  // Toggle Standalone Mode
  const handleToggleStandalone = () => {
    const nextState = !isStandaloneMode;
    setIsStandaloneMode(nextState);
    localStorage.setItem('weel_tech_standalone_mode', String(nextState));
    showNotification(
      nextState 
        ? "Mode Standalone activé (Intégration API disponible)" 
        : "Mode Standalone désactivé."
    );
  };

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Trigger Payout sweep
  const handleSweepToBank = () => {
    const unsweptSucceededTxs = transactions.filter(
      t => t.status === 'succeeded' && !sweptTxIds.includes(t.id)
    );
    const amountToTransfer = unsweptSucceededTxs.reduce((sum, t) => sum + t.amount, 0);

    if (amountToTransfer <= 0) {
      showNotification("Aucun nouveau fonds n'est disponible pour un virement bancaire.", true);
      return;
    }

    const newSweptIds = [...sweptTxIds, ...unsweptSucceededTxs.map(t => t.id)];
    const newTransferredTotal = transferredAmount + amountToTransfer;

    setSweptTxIds(newSweptIds);
    setTransferredAmount(newTransferredTotal);

    localStorage.setItem('weel_tech_swept_tx_ids', JSON.stringify(newSweptIds));
    localStorage.setItem('weel_tech_transferred_amount', String(newTransferredTotal));

    showNotification(`Virement initié ! Un montant de ${amountToTransfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} a été transféré vers votre compte bancaire.`);
  };

  // Create mock API Key
  const handleGenerateApiKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile || !newKeyName.trim()) return;
    setCreatingKey(true);

    try {
      const prefix = 'vp_live_';
      const randomHex = Array.from({ length: 24 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const fullKey = prefix + randomHex;

      const newKey: Omit<ApiKey, 'id' | 'created_at'> = {
        user_id: userProfile.id,
        name: newKeyName.trim(),
        key: fullKey,
        status: 'active'
      };

      const { data, error } = await supabase
        .from('api_keys')
        .insert(newKey);

      if (error) throw error;

      setNewKeyName('');
      setGeneratedKeyResult(fullKey);
      await fetchApiKeys();
      showNotification("Clé API générée avec succès !");
    } catch (err: any) {
      console.error(err);
      showNotification("Erreur lors de la création de la clé API.", true);
    } finally {
      setCreatingKey(false);
    }
  };

  // Revoke API Key
  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer cette clé API ? Toutes les applications l'utilisant perdront l'accès instantanément.")) return;
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ status: 'revoked' })
        .eq('id', keyId);

      if (error) throw error;

      await fetchApiKeys();
      showNotification("La clé API a été révoquée.");
    } catch (err: any) {
      console.error(err);
      showNotification("Erreur lors de la révocation.", true);
    }
  };

  // Simulate payment transaction
  const handleSimulatePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile || !customerName || !customerEmail || !amount) return;
    setCreating(true);

    try {
      if (method === 'Stripe' && status === 'succeeded') {
        // Trigger the Stripe Webhook so it computes commission, saves on database/JSON and triggers logs
        const webhookResponse = await fetch('/api/stripe-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'simulated.payment',
            data: {
              amount: parseFloat(amount),
              currency: 'EUR',
              customer_name: customerName.trim(),
              customer_email: customerEmail.trim().toLowerCase(),
              description: description.trim() || 'Achat de service Connect',
              user_id: userProfile.id,
              plan: userProfile.plan || 'starter'
            }
          })
        });

        if (!webhookResponse.ok) {
          throw new Error("Échec de traitement par le Webhook Stripe");
        }

        const webhookResult = await webhookResponse.json();
        console.log("Stripe Webhook response processed:", webhookResult);
        showNotification(`Paiement traité par Stripe Webhook ! Commission calculée : ${(webhookResult.transaction?.application_fee_amount || 0).toFixed(2)}€`);
      } else if (method === 'MonCash') {
        // Trigger the /api/moncash-payout endpoint to calculate payout & invoke Bazik (or simulated Bazik)
        const moncashResponse = await fetch('/api/moncash-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(amount),
            siteId: selectedSiteId || 'site-1',
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim().toLowerCase(),
            currency: 'EUR'
          })
        });

        if (!moncashResponse.ok) {
          const errData = await moncashResponse.json().catch(() => ({}));
          throw new Error(errData.error || "Échec de l'onboarding ou du transfert via Bazik");
        }

        const moncashResult = await moncashResponse.json();
        console.log("MonCash Payout API response processed:", moncashResult);
        
        if (moncashResult.success) {
          showNotification(
            `Transfert MonCash réussi vers ${moncashResult.receiver} ! Montant transféré : ${moncashResult.transferAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} (commission 10% prélevée)`
          );
        } else {
          throw new Error("Le transfert a été refusé par l'API de transfert.");
        }
      } else {
        // Fallback for regular or other payment simulations
        const newTx = {
          user_id: userProfile.id,
          amount: parseFloat(amount),
          currency: 'EUR',
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim().toLowerCase(),
          status,
          description: description.trim() || 'Paiement de service',
          method: method || 'Stripe',
        };

        const { error } = await supabase
          .from('transactions')
          .insert(newTx);

        if (error) throw error;
        showNotification("Transaction simulée enregistrée avec succès !");
      }

      setCustomerName('');
      setCustomerEmail('');
      setAmount('');
      setDescription('');
      setStatus('succeeded');
      
      await fetchTransactions();
    } catch (err: any) {
      console.error(err);
      showNotification(`Erreur lors de la simulation : ${err.message}`, true);
    } finally {
      setCreating(false);
    }
  };

  // --- Financial Balances Calculations ---
  
  // 1. Montant total encaissé ce mois-ci (Only succeeded in current month)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalEncaisseCeMois = transactions
    .filter(t => {
      if (t.status !== 'succeeded') return false;
      const d = new Date(t.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // 2. Montant en attente (Sum of pending transactions + succeeded transactions not yet swept)
  const pendingTotal = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const unsweptSucceededAmount = transactions
    .filter(t => t.status === 'succeeded' && !sweptTxIds.includes(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const montantEnAttente = pendingTotal + unsweptSucceededAmount;

  // Filter & Search logic for transactions
  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      t.customer_name.toLowerCase().includes(query) || 
      t.customer_email.toLowerCase().includes(query) || 
      t.description.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || (t.method || 'Stripe').toLowerCase() === methodFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const isAnyPaymentMethodActive = isStripeConnected || isMonCashConnected;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold px-2 py-0.5 rounded bg-brand-blue text-white tracking-wider uppercase">Vendza</span>
            <h1 className="text-2xl font-bold font-display text-brand-dark tracking-tight">Pay &middot; Hub Financier</h1>
          </div>
          <p className="text-sm text-gray-500">Gérez vos passerelles, encaissez sur vos sites et suivez vos statistiques de ventes.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => {
              fetchTransactions();
              fetchApiKeys();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS CONTAINER */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs sm:text-sm flex items-center gap-2"
          >
            <XCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs sm:text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION SOLDE & TRANSFER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TOTAL ENCAISSÉ CE MOIS */}
        <div className="main-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute right-4 top-4 text-emerald-600 bg-emerald-50 p-2 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xs font-semibold text-slate-400 uppercase tracking-widest">Encaissé ce mois</p>
            <p className="text-2xl sm:text-3xl font-display font-bold text-brand-dark mt-1">
              {totalEncaisseCeMois.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <p className="text-4xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Revenu net encaissé sur la période en cours
          </p>
        </div>

        {/* MONTANT TRANSFÉRÉ */}
        <div className="main-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute right-4 top-4 text-brand-blue bg-blue-50 p-2 rounded-xl">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xs font-semibold text-slate-400 uppercase tracking-widest">Montant transféré</p>
            <p className="text-2xl sm:text-3xl font-display font-bold text-slate-700 mt-1">
              {transferredAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <p className="text-4xs text-slate-400 mt-2">
            Fonds envoyés vers votre compte bancaire principal
          </p>
        </div>

        {/* MONTANT EN ATTENTE + TRANSFER BUTTON */}
        <div className="main-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px] border-l-4 border-l-amber-400">
          <div className="absolute right-4 top-4 text-amber-600 bg-amber-50 p-2 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xs font-semibold text-slate-400 uppercase tracking-widest">Montant en attente</p>
            <p className="text-2xl sm:text-3xl font-display font-bold text-amber-600 mt-1">
              {montantEnAttente.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-4xs text-slate-400">
              Prêt pour virement bancaire
            </p>
            {unsweptSucceededAmount > 0 && (
              <button
                onClick={handleSweepToBank}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-5xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                Transférer vers banque
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION CONFIGURATION */}
      <div className="main-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Settings2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-brand-dark font-display">Configuration des passerelles de paiement</h2>
              <p className="text-5xs sm:text-4xs text-slate-400">Déterminez vos passerelles de paiement actives et paramétrez vos intégrations</p>
            </div>
          </div>

          {/* Mode Switch Standalone */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-5xs font-bold text-slate-500 uppercase tracking-wider">Mode Standalone API</span>
            <button
              onClick={handleToggleStandalone}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isStandaloneMode ? 'bg-brand-blue' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isStandaloneMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Empty state conditional renderer for configuration */}
        {!isAnyPaymentMethodActive ? (
          <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-6 text-center space-y-4 max-w-2xl mx-auto my-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-800">Aucun moyen de paiement actif</h3>
              <p className="text-4xs text-slate-500 max-w-md mx-auto">
                Connectez une ou plusieurs passerelles de paiement pour commencer à accepter des règlements sur vos applications et sites web.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleToggleStripe}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Connecter Stripe
              </button>
              <button
                onClick={handleToggleMonCash}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                Connecter MonCash
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Stripe Card Status */}
            <div className={`p-4 rounded-xl border transition flex items-center justify-between ${
              isStripeConnected ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/50 border-slate-100 opacity-60'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isStripeConnected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  S
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Stripe Gateway
                    {isStripeConnected && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.2 rounded-full">Actif</span>
                    )}
                  </h4>
                  <p className="text-5xs text-slate-400">Cartes bleues, Apple Pay, virements internationaux</p>
                </div>
              </div>
              <button
                onClick={handleToggleStripe}
                className={`px-2.5 py-1 text-5xs font-bold uppercase tracking-wider rounded-lg border transition cursor-pointer ${
                  isStripeConnected 
                    ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' 
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isStripeConnected ? 'Déconnecter' : 'Activer'}
              </button>
            </div>

            {/* MonCash Card Status */}
            <div className={`p-4 rounded-xl border transition flex items-center justify-between ${
              isMonCashConnected ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50/50 border-slate-100 opacity-60'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isMonCashConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  M
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    MonCash Gateway
                    {isMonCashConnected && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.2 rounded-full">Actif</span>
                    )}
                  </h4>
                  <p className="text-5xs text-slate-400">Paiements mobiles en Haïti via numéro MonCash</p>
                </div>
              </div>
              <button
                onClick={handleToggleMonCash}
                className={`px-2.5 py-1 text-5xs font-bold uppercase tracking-wider rounded-lg border transition cursor-pointer ${
                  isMonCashConnected 
                    ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' 
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isMonCashConnected ? 'Déconnecter' : 'Activer'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SIMULATOR PANEL */}
        <div className="main-card p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-brand-blue animate-pulse" />
            <h2 className="text-xs font-bold text-brand-dark font-display uppercase tracking-wider">Simuler un Paiement</h2>
          </div>
          <p className="text-5xs text-gray-400">
            Enregistrez instantanément de nouveaux flux financiers pour tester le comportement de vos intégrations, les calculs de soldes et l'affichage des graphiques.
          </p>

          <form onSubmit={handleSimulatePayment} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nom du client</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex. Alice Dupont"
                className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark"
              />
            </div>

            <div>
              <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email du client</label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Ex. alice@dupont.com"
                className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Montant (€)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex. 49"
                  className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark"
                />
              </div>
              <div>
                <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Statut</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark cursor-pointer"
                >
                  <option value="succeeded">Réussi</option>
                  <option value="pending">En attente</option>
                  <option value="failed">Échoué</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Méthode</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark cursor-pointer"
                >
                  {isStripeConnected && <option value="Stripe">Stripe</option>}
                  {isMonCashConnected && <option value="MonCash">MonCash</option>}
                  {isStandaloneMode && <option value="API">API Standalone</option>}
                  {/* Fallback to show items even if disabled */}
                  {!isStripeConnected && !isMonCashConnected && !isStandaloneMode && (
                    <option value="Stripe">Stripe (Désactivé)</option>
                  )}
                  {!isStripeConnected && <option value="Stripe">Stripe (Inactif)</option>}
                  {!isMonCashConnected && <option value="MonCash">MonCash (Inactif)</option>}
                  {!isStandaloneMode && <option value="API">API (Inactif)</option>}
                </select>
              </div>
              <div>
                <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Devise</label>
                <input
                  type="text"
                  disabled
                  value="EUR (€)"
                  className="block w-full px-2.5 py-1.5 sleek-input text-xs text-slate-400 bg-slate-50"
                />
              </div>
            </div>

            {method === 'MonCash' && (
              <div>
                <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Site concerné (MonCash Payout)</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark cursor-pointer"
                >
                  {sites.length > 0 ? (
                    sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.domain})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="site-1">Weel Shop (weel-shop.com)</option>
                      <option value="site-2">Portfolio Jean (jean-michel.me)</option>
                      <option value="site-3">Weel Blog (blog.weel-tech.fr)</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex. Formule Mensuelle Premium"
                className="block w-full px-2.5 py-1.5 sleek-input text-xs text-brand-dark"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full flex justify-center items-center gap-2 py-2 px-3 border border-transparent rounded-xl shadow-xs text-xs font-semibold text-white bg-brand-blue hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition cursor-pointer"
            >
              {creating ? (
                'Création...'
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Simuler la transaction
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: TRANSACTIONS LIST & API KEYS SECTION */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION TRANSACTIONS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              {/* Search bar */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher client, email, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-8 pr-2.5 py-1.5 sleek-input text-xs text-brand-dark bg-white"
                />
              </div>

              {/* Quick Status / Method filters */}
              <div className="flex flex-wrap gap-1 items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-5xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  <option value="all">Tous statuts</option>
                  <option value="succeeded">Réussis</option>
                  <option value="pending">En attente</option>
                  <option value="failed">Échoués</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-5xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  <option value="all">Toutes méthodes</option>
                  <option value="stripe">Stripe</option>
                  <option value="moncash">MonCash</option>
                  <option value="api">API Standalone</option>
                </select>
              </div>
            </div>

            {/* Transactions List Table */}
            {loading ? (
              <div className="main-card p-12 text-center">
                <p className="text-xs text-slate-500">Chargement des transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="main-card p-12 text-center">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-brand-dark font-display">Aucune transaction trouvée</p>
                <p className="text-5xs text-slate-400 mt-0.5">Enregistrez un paiement pour tester cette vue.</p>
              </div>
            ) : (
              <div className="main-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/70">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-5xs font-bold text-slate-400 uppercase tracking-widest">Client</th>
                        <th className="px-4 py-2.5 text-left text-5xs font-bold text-slate-400 uppercase tracking-widest">Méthode</th>
                        <th className="px-4 py-2.5 text-left text-5xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-4 py-2.5 text-center text-5xs font-bold text-slate-400 uppercase tracking-widest">Statut</th>
                        <th className="px-4 py-2.5 text-right text-5xs font-bold text-slate-400 uppercase tracking-widest">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {filteredTransactions.map((tx) => {
                        const txMethod = tx.method || 'Stripe';
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/30 transition">
                            {/* Customer */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand-blue/5 text-brand-blue flex items-center justify-center font-bold text-2xs shrink-0">
                                  {tx.customer_name.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-brand-dark truncate">{tx.customer_name}</p>
                                  <p className="text-5xs text-slate-400 font-mono truncate">{tx.customer_email}</p>
                                  {tx.application_fee_amount !== undefined && (
                                    <p className="text-5xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 inline-block font-medium border border-amber-100/60">
                                      Commission : {tx.application_fee_amount.toLocaleString('fr-FR', { style: 'currency', currency: tx.currency })} ({userProfile?.plan === 'starter' ? '12%' : '10%'})
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Method */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-5xs font-semibold ${
                                txMethod.toLowerCase() === 'stripe'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : txMethod.toLowerCase() === 'moncash'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {txMethod}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3 whitespace-nowrap text-5xs text-slate-400 font-mono">
                              {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-5xs font-bold uppercase tracking-wider ${
                                tx.status === 'succeeded'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : tx.status === 'pending'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}>
                                {tx.status === 'succeeded' && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                                {tx.status === 'pending' && <Clock className="w-2.5 h-2.5 text-amber-500" />}
                                {tx.status === 'failed' && <XCircle className="w-2.5 h-2.5 text-red-500" />}
                                {tx.status === 'succeeded' ? 'Réussi' : tx.status === 'pending' ? 'En attente' : 'Échoué'}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-3 whitespace-nowrap text-right font-mono">
                              <p className="text-xs font-bold text-brand-dark">
                                {tx.amount.toLocaleString('fr-FR', { style: 'currency', currency: tx.currency })}
                              </p>
                              {tx.net_amount !== undefined && (
                                <p className="text-[10px] font-medium text-emerald-600">
                                  Net : {tx.net_amount.toLocaleString('fr-FR', { style: 'currency', currency: tx.currency })}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION API KEYS (Vendza:Pay standalone) */}
          {isStandaloneMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="main-card p-5 space-y-4 border-t-2 border-t-indigo-500"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Key className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 font-display">Clés d'API d'intégration (Standalone)</h3>
                    <p className="text-5xs text-slate-400">Authentifiez vos serveurs, terminaux de paiements et webhooks tiers.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGeneratedKeyResult(null);
                    setShowNewKeyModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-blue hover:bg-blue-700 text-white rounded-lg text-5xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Générer une clé
                </button>
              </div>

              {/* API Keys Table */}
              {loadingKeys ? (
                <div className="py-4 text-center text-5xs text-slate-400">
                  Chargement des clés API...
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="py-6 text-center text-5xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Aucune clé API active. Cliquez sur "Générer une clé" pour commencer l'intégration.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/40">
                      <tr>
                        <th className="px-3 py-2 text-left text-5xs font-bold text-slate-400 uppercase tracking-widest">Nom / Libellé</th>
                        <th className="px-3 py-2 text-left text-5xs font-bold text-slate-400 uppercase tracking-widest">Clé secrète</th>
                        <th className="px-3 py-2 text-center text-5xs font-bold text-slate-400 uppercase tracking-widest">Statut</th>
                        <th className="px-3 py-2 text-right text-5xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {apiKeys.map((k) => {
                        // Mask logic: show prefix e.g. "vp_live_" or "vp_test_" + first 4 chars, mask the rest
                        const isLive = k.key.startsWith('vp_live_');
                        const prefix = isLive ? 'vp_live_' : 'vp_test_';
                        const suffix = k.key.substring(k.key.length - 4);
                        const maskedKey = `${prefix}••••••••••••${suffix}`;

                        return (
                          <tr key={k.id} className="hover:bg-slate-50/20 transition">
                            {/* Name */}
                            <td className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                              {k.name}
                              <span className="block text-5xs text-slate-400 font-normal">
                                Créée le {new Date(k.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </td>

                            {/* Masked Key */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <code className="text-4xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono select-all">
                                {maskedKey}
                              </code>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5 whitespace-nowrap text-center">
                              <span className={`inline-flex px-1.5 py-0.2 rounded-full text-5xs font-bold uppercase tracking-wider ${
                                k.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                {k.status === 'active' ? 'Active' : 'Révoquée'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2.5 whitespace-nowrap text-right">
                              {k.status === 'active' ? (
                                <button
                                  onClick={() => handleRevokeApiKey(k.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-5xs font-bold uppercase tracking-wider transition cursor-pointer border border-red-100"
                                  title="Révoquer la clé"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Révoquer
                                </button>
                              ) : (
                                <span className="text-5xs text-slate-400 font-mono italic">Révoquée</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION INTEGRATION WIDGET */}
          {isStandaloneMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="main-card p-5 space-y-4 border-t-2 border-t-blue-500 mt-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Code className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-display">Intégration du Bouton de Paiement (Widget JS)</h3>
                  <p className="text-5xs text-slate-400">Générez un code d'intégration clé en main pour vos sites web externes.</p>
                </div>
              </div>

              {/* Paramétrage du snippet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider">Clé API à utiliser</label>
                  <select
                    value={widgetApiKey}
                    onChange={(e) => setWidgetApiKey(e.target.value)}
                    className="block w-full px-2 py-1 sleek-input text-xs text-brand-dark"
                  >
                    {apiKeys.length === 0 ? (
                      <option value="">(Aucune clé générée)</option>
                    ) : (
                      apiKeys.filter(k => k.status === 'active').map(k => (
                        <option key={k.id} value={k.key}>{k.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider">ID du Site</label>
                  <input
                    type="text"
                    value={widgetSiteId}
                    onChange={(e) => setWidgetSiteId(e.target.value)}
                    className="block w-full px-2 py-1 sleek-input text-xs text-brand-dark"
                    placeholder="site-1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider">Montant & Devise</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={widgetAmount}
                      onChange={(e) => setWidgetAmount(e.target.value)}
                      className="block w-full px-2 py-1 sleek-input text-xs text-brand-dark flex-1"
                      placeholder="10.00"
                    />
                    <select
                      value={widgetCurrency}
                      onChange={(e) => setWidgetCurrency(e.target.value)}
                      className="block px-2 py-1 sleek-input text-xs text-brand-dark w-16"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="HTG">HTG (gdes)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider">Description de l'achat</label>
                  <input
                    type="text"
                    value={widgetDesc}
                    onChange={(e) => setWidgetDesc(e.target.value)}
                    className="block w-full px-2 py-1 sleek-input text-xs text-brand-dark"
                    placeholder="Ex. Abonnement Mensuel, Panier d'achat"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider">Nom du Client (Prérempli)</label>
                  <input
                    type="text"
                    value={widgetCustName}
                    onChange={(e) => setWidgetCustName(e.target.value)}
                    className="block w-full px-2 py-1 sleek-input text-xs text-brand-dark"
                    placeholder="Ex. Jean Cadet"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-5xs font-bold text-slate-400 uppercase tracking-wider">Email du Client (Prérempli)</label>
                  <input
                    type="email"
                    value={widgetCustEmail}
                    onChange={(e) => setWidgetCustEmail(e.target.value)}
                    className="block w-full px-2 py-1 sleek-input text-xs text-brand-dark"
                    placeholder="Ex. client@gmail.com"
                  />
                </div>
              </div>

              {/* Code Blocks */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-5xs font-bold text-slate-500 uppercase tracking-wider">Étape 1 : Inclure le script de chargement</span>
                    <button
                      onClick={() => {
                        const code = `<script src="${window.location.origin}/vendza-pay-widget.js"></script>`;
                        navigator.clipboard.writeText(code);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-5xs font-semibold text-brand-blue hover:text-blue-700 cursor-pointer"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg text-4xs font-mono overflow-x-auto select-all border border-slate-800">
                      {`<script src="${window.location.origin}/vendza-pay-widget.js"></script>`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-5xs font-bold text-slate-500 uppercase tracking-wider">Étape 2 : Insérer le bouton HTML</span>
                    <button
                      onClick={() => {
                        const code = `<div id="vendza-pay-button"
  data-api-key="${widgetApiKey || 'VOTRE_CLE_API'}"
  data-site-id="${widgetSiteId || 'site-1'}"
  data-amount="${widgetAmount || '49.00'}"
  data-currency="${widgetCurrency}"
  data-description="${widgetDesc || 'Achat de service'}"
  data-customer-name="${widgetCustName}"
  data-customer-email="${widgetCustEmail}"
></div>`;
                        navigator.clipboard.writeText(code);
                        setCopiedDiv(true);
                        setTimeout(() => setCopiedDiv(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-5xs font-semibold text-brand-blue hover:text-blue-700 cursor-pointer"
                    >
                      {copiedDiv ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg text-4xs font-mono overflow-x-auto select-all border border-slate-800 leading-relaxed">
{`<div id="vendza-pay-button"
  data-api-key="${widgetApiKey || 'VOTRE_CLE_API'}"
  data-site-id="${widgetSiteId || 'site-1'}"
  data-amount="${widgetAmount || '49.00'}"
  data-currency="${widgetCurrency}"
  data-description="${widgetDesc || 'Achat de service'}"
  data-customer-name="${widgetCustName}"
  data-customer-email="${widgetCustEmail}"
></div>`}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </div>

      {/* NEW API KEY MODAL */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-brand-blue" />
                Générer une clé d'API
              </h3>
              <button 
                onClick={() => {
                  setShowNewKeyModal(false);
                  setGeneratedKeyResult(null);
                }} 
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {generatedKeyResult ? (
              <div className="space-y-3.5 py-1">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-800 text-5xs sm:text-4xs space-y-1">
                  <p className="font-bold">Attention !</p>
                  <p>Copiez cette clé maintenant. Pour des raisons de sécurité, vous ne pourrez plus la visualiser en entier par la suite.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-5xs font-bold text-slate-400 uppercase tracking-wider">Votre clé secrète :</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-slate-50 border border-slate-200 text-4xs font-mono px-3 py-2 rounded-lg text-brand-dark overflow-x-auto select-all">
                      {generatedKeyResult}
                    </code>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNewKeyModal(false);
                    setGeneratedKeyResult(null);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  J'ai enregistré ma clé
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateApiKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-5xs font-bold text-slate-400 uppercase tracking-wider">Libellé de la clé</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Ex. Webhook Stripe Prod, Application React Native"
                    className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark"
                  />
                  <p className="text-5xs text-slate-400">Un nom descriptif vous aidant à vous souvenir de l'utilisation de cette clé.</p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewKeyModal(false)}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingKey}
                    className="flex-1 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    {creatingKey ? 'Génération...' : 'Générer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
