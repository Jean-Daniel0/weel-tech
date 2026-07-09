import React, { useState } from 'react';
import { supabase, isRealSupabaseConnected } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Mail, Lock, User, Briefcase, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { UserPlan } from '../types';
import { Logo } from './Logo';

interface AuthViewProps {
  onAuthSuccess: (session: any) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<UserPlan>('starter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (data.session) {
          onAuthSuccess(data.session);
        }
      } else {
        // Register flow
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_name: companyName,
              plan: selectedPlan,
            },
          },
        });

        if (authError) throw authError;

        if (isRealSupabaseConnected) {
          setSuccess('Inscription réussie ! Veuillez vérifier votre boîte mail pour confirmer votre compte ou connectez-vous si la confirmation n\'est pas requise.');
          setIsLogin(true);
        } else {
          setSuccess('Compte démo créé avec succès ! Connexion automatique...');
          setTimeout(() => {
            if (data.session) {
              onAuthSuccess(data.session);
            } else {
              setIsLogin(true);
            }
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur est survenue lors de l\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoCredentials = () => {
    setEmail('demo@weel-tech.fr');
    setPassword('demo123');
    setIsLogin(true);
  };

  return (
    <div id="auth-container" className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-display font-bold text-brand-dark tracking-tight">
            {isLogin ? 'Connexion à votre espace' : 'Créer votre compte gratuit'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 font-sans">
            {isLogin ? 'Gérez vos sites, paiements et domaines' : 'Rejoignez la plateforme Weel-Tech en quelques secondes'}
          </p>
        </div>

        {/* Real vs Mock Badge Info */}
        <div className="main-card p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">STATUT DU CLIENT SUPABASE</span>
            {isRealSupabaseConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connecté (Réel)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Mode Démo (Simulé)
              </span>
            )}
          </div>

          {!isRealSupabaseConnected && isLogin && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Accès d'évaluation rapide</span>
                  Utilisez le compte de test pré-configuré ou inscrivez un nouveau compte démo.
                </div>
              </div>
              <button
                type="button"
                onClick={loadDemoCredentials}
                className="self-end inline-flex items-center gap-1 px-3 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition font-medium text-2xs cursor-pointer shadow-sm"
              >
                Remplir les identifiants démo
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex gap-2">
              <Shield className="w-5 h-5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm flex gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom complet</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean-Daniel Michel"
                      className="block w-full pl-10 pr-3 py-2.5 sleek-input text-brand-dark sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom de l'entreprise <span className="text-slate-400 font-normal">(Optionnel)</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Weel Corp"
                      className="block w-full pl-10 pr-3 py-2.5 sleek-input text-brand-dark sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choisir votre plan d'activation</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['starter', 'pro', 'business'] as UserPlan[]).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition cursor-pointer capitalize ${
                          selectedPlan === plan
                            ? 'bg-brand-dark text-white border-brand-dark shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                  <p className="text-3xs text-slate-400 mt-1.5 text-center">
                    {selectedPlan === 'starter' && 'Idéal pour démarrer un projet personnel.'}
                    {selectedPlan === 'pro' && 'Idéal pour les créateurs de sites et petites agences.'}
                    {selectedPlan === 'business' && 'Le meilleur choix pour les entreprises à forte croissance.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Adresse email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="block w-full pl-10 pr-3 py-2.5 sleek-input text-brand-dark sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 sleek-input text-brand-dark sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:opacity-50 transition duration-150 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Chargement...
                </span>
              ) : isLogin ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              className="text-sm font-semibold text-brand-blue hover:text-blue-700 focus:outline-none cursor-pointer transition"
            >
              {isLogin ? "Nouveau sur Weel-Tech ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>

        {/* Footer info branding */}
        <div className="text-center text-xs text-slate-400">
          Weel-Tech &copy; {new Date().getFullYear()} &middot; Géré de manière sécurisée par Supabase
        </div>
      </div>
    </div>
  );
}
