import React, { useState, useEffect, FormEvent } from 'react';
import { supabase, isRealSupabaseConnected } from '../lib/supabase';
import { UserProfile, UserPlan } from '../types';
import { Settings, User, Briefcase, Zap, ShieldAlert, Sparkles, Key, Check } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-bold font-display text-brand-dark tracking-tight">Paramètres du compte</h1>
        <p className="text-sm text-slate-500">Mettez à jour vos informations personnelles, changez de plan et gérez vos clés d'API.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Details Form */}
        <div className="main-card p-5 sm:p-6 md:col-span-2 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-brand-blue" />
            <h2 className="text-base font-bold text-brand-dark font-display">Détails personnels</h2>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs sm:text-sm">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Profil enregistré et synchronisé avec succès !</span>
            </div>
          )}

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
                        {isActive && <div className="w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center text-3xs font-bold">✓</div>}
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
                <p>Pour brancher votre propre base de données Supabase, configurez les variables <code className="font-mono">VITE_SUPABASE_URL</code> et <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> dans la console AI Studio, ou entrez-les ci-dessous pour ce navigateur.</p>
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
    </div>
  );
}
