import React, { useState, useEffect, FormEvent } from 'react';
import { supabase, isRealSupabaseConnected } from '../lib/supabase';
import { UserProfile, UserPlan } from '../types';
import { Settings, User, Briefcase, Zap, ShieldAlert, Sparkles, Key, Check, CreditCard, RefreshCw, Star, Crown, Award, HelpCircle } from 'lucide-react';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function SettingsView({ userProfile, onProfileUpdate }: SettingsViewProps) {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [activePlan, setActivePlan] = useState<UserPlan>('starter');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // For testing custom credentials locally
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  // Subscription Billing Integration states
  const [activeTab, setActiveTab] = useState<'profil' | 'abonnement'>('profil');
  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<string | null>(null);

  const fetchSubscriptionStatus = async () => {
    if (!userProfile) return;
    setSubLoading(true);
    try {
      const res = await fetch(`/api/subscription/status?userId=${encodeURIComponent(userProfile.id)}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        
        // If an active subscription exists on the backend, ensure local userProfile plan is synchronized
        if (data.subscription && (data.subscription.status === 'active' || data.subscription.status === 'trialing')) {
          if (data.subscription.plan_id !== userProfile.plan) {
            const matchedPlan = data.subscription.plan_id as UserPlan;
            const { error } = await supabase
              .from('profiles')
              .update({ plan: matchedPlan })
              .eq('id', userProfile.id);
            if (!error) {
              onProfileUpdate({ ...userProfile, plan: matchedPlan });
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching subscription status:", e);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setCompanyName(userProfile.company_name || '');
      setActivePlan(userProfile.plan || 'starter');
    }

    // Load custom credentials from local storage if any
    const savedUrl = localStorage.getItem('weel_tech_custom_url') || '';
    const savedKey = localStorage.getItem('weel_tech_custom_key') || '';
    setCustomUrl(savedUrl);
    setCustomKey(savedKey);
  }, [userProfile]);

  // Handle billing redirect success/fail query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing-success') === 'true') {
      const plan = params.get('plan') as UserPlan;
      if (plan && userProfile) {
        const updatedProfile = { ...userProfile, plan };
        supabase
          .from('profiles')
          .update({ plan })
          .eq('id', userProfile.id)
          .then(({ error }) => {
            if (!error) {
              onProfileUpdate(updatedProfile);
            }
          });
      }
      setSaveSuccess(true);
      setActiveTab('abonnement');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('billing-failed') === 'true') {
      setErrorMessage("Le paiement ou la souscription a échoué. Veuillez vérifier vos informations de paiement.");
      setActiveTab('abonnement');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('billing-canceled') === 'true') {
      setErrorMessage("La souscription a été annulée par l'utilisateur.");
      setActiveTab('abonnement');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (userProfile) {
      fetchSubscriptionStatus();
    }
  }, [userProfile]);

  const handleSubscribe = async (plan: string) => {
    if (!userProfile) return;
    setCheckoutLoadingPlan(plan);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/stripe/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          plan: plan,
          email: userProfile.email
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Impossible d'accéder à la facturation Stripe.");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("L'URL Stripe Checkout est manquante.");
      }
    } catch (err: any) {
      console.error("Subscription Checkout error:", err);
      setErrorMessage(err.message || "Une erreur est survenue lors de l'initialisation de Stripe.");
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userProfile || !subscription) return;
    setSubLoading(true);
    setErrorMessage(null);
    try {
      const payload = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: subscription.stripe_subscription_id || 'sub_sim_123',
            customer: subscription.stripe_customer_id || 'cus_sim_123',
            status: 'canceled',
            metadata: {
              userId: userProfile.id,
              plan: 'starter',
              email: userProfile.email
            }
          }
        }
      };

      const res = await fetch('/api/edge/stripe-subscription-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        const updatedProfile = { ...userProfile, plan: 'starter' as UserPlan };
        onProfileUpdate(updatedProfile);
        setActivePlan('starter');
        await fetchSubscriptionStatus();
      } else {
        throw new Error("Échec de la désactivation de l'abonnement sur le serveur.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Impossible de résilier l'abonnement pour le moment.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const updatedFields = {
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        plan: activePlan
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatedFields)
        .eq('id', userProfile.id);

      if (error) throw error;

      // Update parent state
      onProfileUpdate({
        ...userProfile,
        ...updatedFields
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Une erreur est survenue lors de l'enregistrement de votre profil.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomCredentials = (e: FormEvent) => {
    e.preventDefault();
    if (customUrl && customKey) {
      localStorage.setItem('weel_tech_custom_url', customUrl.trim());
      localStorage.setItem('weel_tech_custom_key', customKey.trim());
      localStorage.setItem('weel_tech_current_session', ''); // Reset session to force reconnect
      alert("Identifiants Supabase enregistrés ! L'application va se recharger pour appliquer les modifications.");
      window.location.reload();
    } else {
      localStorage.removeItem('weel_tech_custom_url');
      localStorage.removeItem('weel_tech_custom_key');
      alert("Identifiants Supabase réinitialisés !");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-dark tracking-tight">Paramètres du compte</h1>
          <p className="text-sm text-slate-500">Mettez à jour vos informations personnelles, changez de plan et gérez vos clés d'API.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs sm:text-sm">
          {errorMessage}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs sm:text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Action effectuée et synchronisée avec succès !</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('profil')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profil'
              ? 'border-brand-blue text-brand-blue font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Profil & API
          </div>
        </button>
        <button
          onClick={() => setActiveTab('abonnement')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'abonnement'
              ? 'border-brand-blue text-brand-blue font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Abonnement Weel-Tech
            {userProfile?.plan && userProfile.plan !== 'starter' && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-3xs font-extrabold uppercase">
                {userProfile.plan}
              </span>
            )}
          </div>
        </button>
      </div>

      {activeTab === 'profil' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Profile Details Form */}
          <div className="main-card p-5 sm:p-6 md:col-span-2 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-brand-blue" />
              <h2 className="text-base font-bold text-brand-dark font-display">Détails personnels</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom Complet</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="block w-full px-3 py-2 sleek-input text-xs text-brand-dark sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choisir votre Plan Actif</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['starter', 'pro', 'business'] as UserPlan[]).map((plan) => {
                    const isActive = activePlan === plan;
                    return (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setActivePlan(plan)}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-brand-blue/5 border-brand-blue ring-1 ring-brand-blue'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-dark capitalize">{plan}</span>
                          {isActive && <div className="w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center text-3xs font-bold font-display">✓</div>}
                        </div>
                        <p className="text-5xs text-slate-400 mt-1.5 leading-normal">
                          {plan === 'starter' && 'Outils essentiels pour petits sites web.'}
                          {plan === 'pro' && 'Accès complet, Vendza:Pay & Vendza:Domaine.'}
                          {plan === 'business' && 'Support dédié, serveurs haute performance.'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center items-center gap-2 py-2 px-5 border border-transparent rounded-xl shadow-xs text-xs font-semibold text-white bg-brand-dark hover:bg-black focus:outline-none disabled:opacity-50 transition cursor-pointer"
                >
                  {saving ? (
                    'Mise à jour...'
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Integration configuration instructions / secrets */}
          <div className="space-y-4">
            
            {/* Status module */}
            <div className="main-card p-5 space-y-3.5">
              <h3 className="text-xs font-bold font-display text-brand-dark uppercase tracking-widest">Abonnement Weel-Tech</h3>
              
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-brand-dark">Facturation Mensuelle</p>
                <div className="flex justify-between items-center text-4xs font-mono text-slate-400">
                  <span>PLAN : <strong className="text-brand-blue uppercase">{userProfile?.plan}</strong></span>
                  <span>Prochain prélèvement : 08/08/2026</span>
                </div>
              </div>

              <div className="text-5xs text-slate-400 space-y-1">
                <p>✔ Assistance technique 24h/24.</p>
                <p>✔ Serveur de routage CDN optimisé.</p>
                <p>✔ Certificats de chiffrement SSL gratuits.</p>
              </div>
            </div>

            {/* Supabase details and instructions */}
            <div className="main-card p-5 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark">
                <Key className="w-4 h-4 text-brand-blue" />
                <span>Configuration Supabase</span>
              </div>

              {isRealSupabaseConnected ? (
                <div className="p-3 bg-green-50/50 border border-green-100 text-green-800 rounded-xl text-5xs leading-relaxed">
                  <strong>Base connectée !</strong> Vos sites, paiements et profils sont stockés dans votre cloud Supabase à l'adresse <code className="font-mono">{(import.meta as any).env?.VITE_SUPABASE_URL}</code>.
                </div>
              ) : (
                <div className="p-3 bg-amber-50/50 border border-amber-100 text-amber-800 rounded-xl text-5xs leading-relaxed space-y-2">
                  <p><strong>Mode Simulateur Actif.</strong> Vous utilisez l'environnement de bac à sable local.</p>
                  <p>Pour brancher votre propre base de données Supabase, configurez les variables <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> dans la console AI Studio, ou entrez-les ci-dessous pour ce navigateur.</p>
                </div>
              )}

              {/* Local override Form */}
              <form onSubmit={handleSaveCustomCredentials} className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-5xs font-bold text-slate-400 uppercase">Surcharger URL Supabase</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://xyz.supabase.co"
                    className="block w-full px-2 py-1.5 sleek-input text-4xs text-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-5xs font-bold text-slate-400 uppercase">Surcharger Clé Anon</label>
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="block w-full px-2 py-1.5 sleek-input text-4xs text-brand-dark"
                  />
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 py-1 px-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition font-semibold text-5xs text-center cursor-pointer"
                  >
                    Valider
                  </button>
                  {(customUrl || customKey) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUrl('');
                        setCustomKey('');
                        localStorage.removeItem('weel_tech_custom_url');
                        localStorage.removeItem('weel_tech_custom_key');
                        window.location.reload();
                      }}
                      className="py-1 px-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-semibold text-5xs text-center cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </form>
            </div>

          </div>

        </div>
      ) : (
        <div className="space-y-6">
          {/* Stripe Billing plans view */}
          <div className="text-center max-w-xl mx-auto py-3 space-y-2">
            <h2 className="text-lg font-extrabold font-display text-brand-dark">Choisissez le plan parfait pour votre activité</h2>
            <p className="text-xs text-slate-500">
              Profitez d'un accès instantané aux meilleurs outils de création de sites web et d'intégration de paiements avec Stripe Billing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            {/* Starter Plan */}
            <div className={`main-card p-6 flex flex-col justify-between space-y-6 border relative ${
              userProfile?.plan === 'starter' ? 'ring-2 ring-brand-blue border-transparent bg-brand-blue/[0.01]' : 'border-slate-100'
            }`}>
              {userProfile?.plan === 'starter' && (
                <span className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-blue text-white uppercase tracking-wider">
                  Plan Actif
                </span>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Starter</span>
                  <Star className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-brand-dark">19 $</span>
                    <span className="text-5xs text-slate-400 font-medium">/ mois</span>
                  </div>
                  <p className="text-5xs text-slate-400 mt-1">Idéal pour démarrer votre premier site vitrine autonome.</p>
                </div>
                
                <ul className="space-y-2.5 text-4xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>1 Site Web Actif</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>1 Domaine Personnalisé</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Frais de transaction : 2%</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400 line-through">
                    <span>Intégration Vendza:Pay Widget</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Support par email standard</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={userProfile?.plan === 'starter' || checkoutLoadingPlan !== null}
                  onClick={() => handleSubscribe('starter')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer flex items-center justify-center gap-2 ${
                    userProfile?.plan === 'starter'
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-brand-dark text-white hover:bg-black shadow-md'
                  }`}
                >
                  {checkoutLoadingPlan === 'starter' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : userProfile?.plan === 'starter' ? (
                    'Votre Plan Actuel'
                  ) : (
                    'Choisir Starter'
                  )}
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className={`main-card p-6 flex flex-col justify-between space-y-6 border relative ${
              userProfile?.plan === 'pro' ? 'ring-2 ring-brand-blue border-transparent bg-brand-blue/[0.01]' : 'border-indigo-100 shadow-lg'
            }`}>
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[9px] font-bold bg-amber-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3" />
                Populaire
              </div>
              
              {userProfile?.plan === 'pro' && (
                <span className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-blue text-white uppercase tracking-wider">
                  Plan Actif
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-blue uppercase tracking-widest">Pro</span>
                  <Crown className="w-4.5 h-4.5 text-brand-blue" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-brand-dark">49 $</span>
                    <span className="text-5xs text-slate-400 font-medium">/ mois</span>
                  </div>
                  <p className="text-5xs text-slate-400 mt-1">Idéal pour les créateurs sérieux et les entreprises en croissance.</p>
                </div>
                
                <ul className="space-y-2.5 text-4xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-brand-dark">Jusqu'à 5 Sites Actifs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Domaines personnalisés illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-brand-blue">Widget Vendza:Pay Intégré</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Frais de transaction : 1%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Support prioritaire 24h/24</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={userProfile?.plan === 'pro' || checkoutLoadingPlan !== null}
                  onClick={() => handleSubscribe('pro')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer flex items-center justify-center gap-2 ${
                    userProfile?.plan === 'pro'
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-brand-blue text-white hover:bg-blue-700 shadow-md ring-2 ring-brand-blue/10'
                  }`}
                >
                  {checkoutLoadingPlan === 'pro' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : userProfile?.plan === 'pro' ? (
                    'Votre Plan Actuel'
                  ) : (
                    'Choisir Pro'
                  )}
                </button>
              </div>
            </div>

            {/* Business Plan */}
            <div className={`main-card p-6 flex flex-col justify-between space-y-6 border relative ${
              userProfile?.plan === 'business' ? 'ring-2 ring-brand-blue border-transparent bg-brand-blue/[0.01]' : 'border-slate-100'
            }`}>
              {userProfile?.plan === 'business' && (
                <span className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-blue text-white uppercase tracking-wider">
                  Plan Actif
                </span>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Business</span>
                  <Award className="w-4.5 h-4.5 text-indigo-500" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-brand-dark">99 $</span>
                    <span className="text-5xs text-slate-400 font-medium">/ mois</span>
                  </div>
                  <p className="text-5xs text-slate-400 mt-1">Pour les agences et les besoins de performance à grande échelle.</p>
                </div>
                
                <ul className="space-y-2.5 text-4xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-brand-dark">Sites Web Illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>API d'automatisation complète</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Frais de transaction : 0.5%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Infrastructure CDN Dédiée</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-indigo-600">Support Dédié & SLA Garanti</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={userProfile?.plan === 'business' || checkoutLoadingPlan !== null}
                  onClick={() => handleSubscribe('business')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer flex items-center justify-center gap-2 ${
                    userProfile?.plan === 'business'
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                  }`}
                >
                  {checkoutLoadingPlan === 'business' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : userProfile?.plan === 'business' ? (
                    'Votre Plan Actuel'
                  ) : (
                    'Choisir Business'
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Subscription State Management Section */}
          <div className="main-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-blue" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-dark font-display">Statut détaillé de l'abonnement</h3>
              </div>
              {subLoading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>

            {subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5 text-xs">
                  <p className="text-slate-500">ID de Souscription : <code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand-dark font-mono text-3xs">{subscription.id}</code></p>
                  <p className="text-slate-500">Stripe Subscription ID : <code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand-dark font-mono text-3xs">{subscription.stripe_subscription_id}</code></p>
                  <p className="text-slate-500">Plan de Facturation : <strong className="text-indigo-600 uppercase">{subscription.plan_id}</strong></p>
                  <p className="text-slate-500">Date de Renouvellement : <span className="text-brand-dark font-medium">{new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span></p>
                </div>
                
                <div className="flex flex-col justify-between items-start md:items-end gap-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Statut de Facturation :</span>
                    <span className={`px-2.5 py-0.5 rounded text-3xs font-bold uppercase ${
                      subscription.status === 'active' || subscription.status === 'trialing'
                        ? 'bg-emerald-100 text-emerald-800'
                        : subscription.status === 'canceled'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>

                  {(subscription.status === 'active' || subscription.status === 'trialing') && (
                    <button
                      type="button"
                      disabled={subLoading}
                      onClick={handleCancelSubscription}
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-4xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      Résoudre & Annuler l'Abonnement
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-xs flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700">Aucun abonnement Stripe actif détecté sur votre compte.</p>
                  <p className="text-5xs text-slate-400 mt-1 leading-normal">
                    Vous êtes actuellement sur le tier Starter par défaut. Utilisez les boutons "S'abonner" ci-dessus pour lancer le simulateur de paiement Stripe Billing et mettre à niveau votre compte.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
