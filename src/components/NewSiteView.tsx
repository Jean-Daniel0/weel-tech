import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { 
  Sparkles, 
  Send, 
  Monitor, 
  Smartphone, 
  Globe, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Laptop,
  Code2,
  Copy,
  Terminal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NewSiteViewProps {
  userProfile: UserProfile | null;
  onViewChange?: (view: any) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TerminalLog {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  timestamp: string;
}

export default function NewSiteView({ userProfile, onViewChange }: NewSiteViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'code'>('desktop');
  const [copied, setCopied] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [buildSummary, setBuildSummary] = useState<{
    status: 'idle' | 'building' | 'success' | 'error';
    duration: string;
    linesCount: number;
    sizeKb: string;
    timestamp: string;
  } | null>(null);
  
  // Publishing state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteDomain, setSiteDomain] = useState('');
  const [siteType, setSiteType] = useState<'vitrine' | 'e-commerce' | 'portfolio' | 'blog'>('vitrine');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle suggest cards
  const suggestionPrompts = [
    {
      title: "Portfolio de Photographe",
      desc: "Thème sombre, galerie d'images interactive, filtres et formulaire de contact épuré."
    },
    {
      title: "Boutique en Ligne de Café",
      desc: "Hero de marque, grille produits interactive avec un panier fonctionnel en JS."
    },
    {
      title: "Page Agence Marketing",
      desc: "Style épuré, témoignages animés, carte interactive et grille d'offres tarifaires."
    }
  ];

  const handleCopyCode = () => {
    if (!generatedHtml) return;
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSuggestionClick = (title: string, desc: string) => {
    setPrompt(`Crée un ${title.toLowerCase()}. ${desc}`);
  };

  // Run the site generation
  const handleGenerateSite = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userMsgText = prompt.trim();
    setPrompt('');
    setErrorMessage(null);

    // Create unique ID for messages
    const userMsgId = 'msg-' + Math.random().toString(36).substring(2, 11);
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userMsgText,
      timestamp: new Date()
    };

    // Update messages locally
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    // Initialize terminal logs and build summary
    setTerminalLogs([]);
    setBuildSummary(null);
    setIsLogsExpanded(true);

    const startTime = Date.now();
    const timeouts: NodeJS.Timeout[] = [];

    const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' | 'system' = 'info') => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTerminalLogs(prev => [...prev, {
        id: 'log-' + Math.random().toString(36).substring(2, 11),
        text,
        type,
        timestamp: timeStr
      }]);
    };

    // Add first initial logs
    addLog("🔌 Connexion sécurisée au serveur de génération Weel-Tech...", "system");
    addLog(`📥 Message reçu de l'utilisateur: "${userMsgText}"`, "info");
    addLog("🧠 Analyse sémantique et extraction des intentions de design...", "info");

    const steps = [
      { text: "📡 Envoi de la requête au modèle d'IA Gemini 3.5 Flash...", type: 'info' as const },
      { text: "🎨 Conception de la charte graphique et sélection de la palette de couleurs...", type: 'info' as const },
      { text: "🛠️ Structuration du document HTML5 sémantique avec Tailwind CSS...", type: 'info' as const },
      { text: "📦 Injection des modules d'interaction réactifs et de l'interactivité JS...", type: 'info' as const },
      { text: "🖼️ Sélection et intégration d'images d'illustrations professionnelles (Unsplash)...", type: 'info' as const },
      { text: "✨ Optimisation finale du design (accessibilité, contrastes, icônes Lucide)...", type: 'info' as const },
    ];

    steps.forEach((step, idx) => {
      const t = setTimeout(() => {
        addLog(step.text, step.type);
      }, (idx + 1) * 1200);
      timeouts.push(t);
    });

    try {
      // Build conversational history for Gemini proxy endpoint
      // We convert local ChatMessage structure to server-expected role/content list
      const conversationHistory = messages.concat(userMessage).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/generate-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMsgText,
          history: conversationHistory
        })
      });

      // Clear timeouts since we have the result (or error)
      timeouts.forEach(clearTimeout);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Une erreur est survenue pendant la génération.");
      }

      const data = await response.json();

      // Check return payload
      if (data && data.html) {
        // Log final stages
        addLog("🔮 Code HTML reçu avec succès de l'IA.", "info");
        addLog("🚀 Compilation finale et assemblage du livrable...", "system");
        
        setGeneratedHtml(data.html);
        
        // Add final compilation logs
        addLog("✅ Rendu de la page compilé avec succès !", "success");
        const linesCount = data.html.split('\n').length;
        const sizeKb = (new Blob([data.html]).size / 1024).toFixed(2);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

        addLog(`📈 Statistiques du livrable : ${linesCount} lignes de code, ${sizeKb} KB.`, "success");
        addLog("✨ Vue d'aperçu rafraîchie en temps réel.", "success");

        setBuildSummary({
          status: 'success',
          duration,
          linesCount,
          sizeKb: `${sizeKb} KB`,
          timestamp: new Date().toLocaleTimeString()
        });

        // Add AI response bubble
        const assistantMsgId = 'msg-' + Math.random().toString(36).substring(2, 11);
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: data.message || "Voici le site web généré selon vos consignes. Vous pouvez le modifier en écrivant un nouveau prompt.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Pre-fill publish form based on prompt content
        if (!siteName) {
          const matchName = userMsgText.match(/(?:pour (?:un |une )?|de )([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,25})/i);
          setSiteName(matchName ? `Site ${matchName[1].trim()}` : "Mon site généré");
        }
      } else {
        throw new Error("L'IA n'a pas retourné de code HTML valide.");
      }

    } catch (err: any) {
      console.error(err);
      timeouts.forEach(clearTimeout);
      addLog(`❌ Erreur critique de génération : ${err.message || "Une erreur inconnue est survenue."}`, "error");

      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      setBuildSummary({
        status: 'error',
        duration,
        linesCount: 0,
        sizeKb: '0 KB',
        timestamp: new Date().toLocaleTimeString()
      });

      setErrorMessage(err.message || "Impossible de générer le site. Vérifiez les paramètres de votre clé API.");
      
      // Add error message as system bubble
      const errorMsgId = 'msg-' + Math.random().toString(36).substring(2, 11);
      const errorMessageBubble: ChatMessage = {
        id: errorMsgId,
        role: 'assistant',
        content: `❌ Désolé, j'ai rencontré une erreur : ${err.message || "Une erreur inconnue est survenue."}. Veuillez réessayer ou configurer votre clé GEMINI_API_KEY.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessageBubble]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit the generated HTML into Supabase sites
  const handlePublishSite = async (e: FormEvent) => {
    e.preventDefault();
    if (!userProfile || !generatedHtml || !siteName || !siteDomain) return;

    setIsPublishing(true);
    setErrorMessage(null);

    // Format domain nicely
    let formattedDomain = siteDomain.trim()
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/$/, '');

    if (!formattedDomain.includes('.')) {
      formattedDomain = `${formattedDomain}.weel.site`;
    }

    try {
      const newSiteRecord = {
        user_id: userProfile.id,
        name: siteName.trim(),
        domain: formattedDomain,
        status: 'active' as const,
        visitors_24h: 1, // Fresh launch!
        type: siteType,
        updated_at: new Date().toISOString()
      };

      // Insert site metadata
      const { data, error } = await supabase
        .from('sites')
        .insert(newSiteRecord);

      if (error) throw error;

      // To make the generated HTML fully functional later, 
      // we cache the code in localStorage using the unique domain as the key.
      // This allows the preview frame or mock site rendering to fetch and display actual code!
      localStorage.setItem(`weel_tech_site_html_${formattedDomain}`, generatedHtml);

      setPublishedUrl(`https://${formattedDomain}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Une erreur est survenue lors de la publication du site.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4" id="new-site-workspace">
      
      {/* Upper Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-[20px] font-semibold font-display text-[#0A0E1A] tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-[#2563EB]" />
            Nouveau site par IA
          </h1>
          <p className="text-[12px] text-slate-500">Dialogue avec l'assistant IA pour concevoir, peaufiner et publier ton site idéal en temps réel.</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-end">
          
          {/* Back Button */}
          <button
            onClick={() => onViewChange && onViewChange('sites')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-[12px] rounded-lg hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer shrink-0 shadow-xs"
            title="Retour au tableau de bord"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Retour
          </button>

          {/* Publish Trigger Button */}
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={!generatedHtml || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-[12px] rounded-lg shadow-md shadow-blue-500/10 disabled:opacity-50 transition cursor-pointer shrink-0"
          >
            <Globe className="w-4 h-4" />
            Publier le site
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chat, Right Preview */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-4 flex-1 min-h-0 items-stretch">
        
        {/* LEFT COLUMN: Conversational AI Panel (4 / 10 = 40%) */}
        <div className="md:col-span-4 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs relative min-h-[550px] md:h-full md:min-h-0">
          
          {/* Chat Panel Header */}
          <div className="bg-slate-50/70 border-b border-slate-100 px-3.5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-semibold font-display text-[#0A0E1A] block">Weel-Tech Assistant</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase leading-none">MODÈLE: GEMINI 3.5 FLASH</span>
              </div>
            </div>
            
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              Session Live
            </span>
          </div>

          {/* Chat Messages Scrolling History */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 ? (
              // Empty State SUGGESTIONS
              <div className="h-full flex flex-col justify-center py-2 text-center space-y-4">
                <div className="max-w-xs mx-auto">
                  <div className="w-8 h-8 rounded-xl bg-[#2563EB]/5 border border-brand-blue/10 flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <h3 className="text-xs font-semibold text-[#0A0E1A] font-display">Décris ton site de rêve</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Saisis un court descriptif à gauche. Notre IA va créer un site web magnifique en quelques secondes.
                  </p>
                </div>

                <div className="space-y-1.5 text-left max-w-sm mx-auto">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">suggestions rapides :</p>
                  
                  {suggestionPrompts.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(sug.title, sug.desc)}
                      className="w-full text-left p-2 rounded-lg border border-slate-100 hover:border-brand-blue/20 bg-slate-50 hover:bg-brand-blue/5 transition duration-200 group cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-[#0A0E1A] group-hover:text-[#2563EB] transition">{sug.title}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#2563EB] transform group-hover:translate-x-0.5 transition" />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{sug.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Active Conversation Chat list
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/10'
                        : 'bg-slate-100 text-[#0A0E1A] border border-slate-200/50'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-[10px] block mt-1 text-right font-mono ${
                        msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Loading state indicator bubble */}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 border border-slate-200/50 rounded-xl px-3 py-2 text-xs text-[#0A0E1A] flex flex-col gap-1.5 max-w-[85%]">
                      <div className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3 w-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="font-semibold text-slate-500 font-display uppercase tracking-wider text-[10px]">Génération par l'IA...</span>
                      </div>
                      <p className="text-[10px] text-slate-400 animate-pulse">Création du design, structuration du HTML et programmation...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt Entry Box Form */}
          <div className="border-t border-slate-150 p-2.5 bg-slate-50/50">
            <form onSubmit={handleGenerateSite} className="flex gap-1.5">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isGenerating ? "L'IA réfléchit..." : "Ex: Ajoute un bouton d'achat ou change la couleur..."}
                disabled={isGenerating}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-[#0A0E1A] outline-none focus:ring-2 focus:ring-brand-blue/15 focus:border-brand-blue transition placeholder-slate-400 disabled:opacity-50 shadow-xs"
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="p-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5 px-0.5">
              <Info className="w-3 h-3 shrink-0" />
              <span>Chaque message affine ou édite le site en direct.</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive HTML Sandbox Preview (6 / 10 = 60%) */}
        <div className="md:col-span-6 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden min-h-[550px] md:h-full md:min-h-0">
          
          {/* Preview Panel Header with Pill Switcher */}
          <div className="bg-slate-50/70 border-b border-slate-100 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              {previewMode === 'desktop' && <Monitor className="w-4 h-4 text-slate-500" />}
              {previewMode === 'mobile' && <Smartphone className="w-4 h-4 text-slate-500" />}
              {previewMode === 'code' && <Code2 className="w-4 h-4 text-slate-500" />}
              <span className="text-xs font-semibold text-[#0A0E1A] font-display">
                {previewMode === 'desktop' && "Aperçu Ordinateur"}
                {previewMode === 'mobile' && "Aperçu Smartphone"}
                {previewMode === 'code' && "Code Source HTML"}
              </span>
            </div>

            {/* Pill Switcher */}
            <div className="bg-slate-100 rounded-lg p-0.5 flex gap-0.5 border border-slate-200/40 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  previewMode === 'desktop'
                    ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Aperçu Ordinateur"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bureau</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  previewMode === 'mobile'
                    ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Aperçu Smartphone"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  previewMode === 'code'
                    ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="Code Source HTML"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Code</span>
              </button>
            </div>
          </div>

          {/* Interactive Preview Viewport Panel */}
          <div className="flex-1 min-h-0 bg-slate-50/50 flex flex-col relative">
            {generatedHtml ? (
              <>
                {previewMode === 'desktop' && (
                  // Laptop viewport frame mockup
                  <div className="w-full h-full flex flex-col p-4">
                    <div className="w-full h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      {/* Browser top-bar */}
                      <div className="bg-slate-50/80 border-b border-slate-200/60 px-2.5 py-1.5 flex items-center gap-1.5 shrink-0">
                        <div className="flex gap-1 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        </div>
                        
                        {/* URL input field mockup */}
                        <div className="bg-white border border-slate-200 rounded px-2.5 py-0.5 text-[10px] text-slate-400 font-mono flex-1 max-w-sm mx-auto flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                          <span className="truncate">localhost:3000/live_preview.html</span>
                        </div>
                      </div>
                      
                      {/* Live preview sandbox iframe content */}
                      <div className="flex-1 bg-white relative">
                        <iframe
                          srcDoc={generatedHtml}
                          className="absolute inset-0 w-full h-full border-none"
                          title="Aperçu Desktop"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {previewMode === 'mobile' && (
                  // Mobile device viewport frame mockup
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
                    {/* Device outline */}
                    <div className="w-[320px] h-[450px] bg-slate-900 rounded-[36px] border-[10px] border-slate-900 shadow-xl relative overflow-hidden flex flex-col shrink-0">
                      {/* Speaker notch / Dynamic Island */}
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-800 mr-2"></div>
                        <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
                      </div>
                      {/* Web Content inside frame */}
                      <div className="flex-1 bg-white pt-5 overflow-hidden relative rounded-2xl">
                        <iframe
                          srcDoc={generatedHtml}
                          className="absolute inset-0 w-full h-full border-none"
                          title="Aperçu Mobile"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {previewMode === 'code' && (
                  // Custom highlighted source code block with copy button and line numbers
                  <div className="w-full h-full flex flex-col relative bg-slate-900 text-slate-100 overflow-hidden">
                    {/* Top action header */}
                    <div className="bg-slate-800/80 border-b border-slate-700/50 px-4 py-2 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">HTML5 Source • {generatedHtml.split('\n').length} lignes</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 hover:text-white rounded text-[10px] font-semibold font-mono transition cursor-pointer shadow-xs border border-slate-600/30"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier le code</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Scrollable container with line numbers */}
                    <div className="flex-1 overflow-auto font-mono text-[11px] leading-normal py-3 select-text bg-slate-950">
                      {generatedHtml.split('\n').map((line, idx) => (
                        <div key={idx} className="flex hover:bg-slate-850/30 w-full px-4">
                          <span className="w-9 text-right text-slate-500 select-none pr-3 border-r border-slate-800 shrink-0 font-normal">
                            {idx + 1}
                          </span>
                          <span className="pl-4 font-normal text-slate-300 whitespace-pre overflow-x-auto block flex-1">
                            {line.trim() === '' ? ' ' : highlightHtmlLine(line)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Empty code placeholder screen
              <div className="text-center p-6 max-w-sm mx-auto my-auto">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3.5 shadow-xs text-slate-300">
                  <Laptop className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#0A0E1A] font-display tracking-tight">Aperçu en direct</h3>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Aucun site n'a été créé pour le moment. Décrivez votre idée à gauche pour lancer la génération de l'IA.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Live Generation Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shrink-0">
        {/* Panel Header */}
        <button
          type="button"
          onClick={() => setIsLogsExpanded(!isLogsExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 cursor-pointer select-none text-slate-300 hover:text-white hover:bg-slate-900/80 transition"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-semibold font-mono tracking-wider uppercase">
              Console de Génération en Direct
            </span>
            {isGenerating && (
              <span className="flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] text-amber-400 font-mono font-medium">Compilation en cours...</span>
              </span>
            )}
            {!isGenerating && buildSummary?.status === 'success' && (
              <span className="flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">Prêt • Succès</span>
              </span>
            )}
            {!isGenerating && buildSummary?.status === 'error' && (
              <span className="flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-[10px] text-red-400 font-mono font-medium">Erreur</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isGenerating && buildSummary && (
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span>Temps: <strong className="text-slate-200">{buildSummary.duration}</strong></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                <span>Poids: <strong className="text-slate-200">{buildSummary.sizeKb}</strong></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                <span>Lignes: <strong className="text-slate-200">{buildSummary.linesCount}</strong></span>
              </div>
            )}
            {isLogsExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {/* Panel Content (Terminal Logs) */}
        {isLogsExpanded && (
          <div className="p-3 bg-slate-950 flex flex-col md:flex-row gap-4 min-h-[120px] max-h-[160px] overflow-y-auto">
            {/* Left side: Terminal lines */}
            <div className="flex-1 font-mono text-[10px] leading-relaxed space-y-1 overflow-y-auto">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 italic py-4 pl-1">
                  En attente d'une action de génération IA pour démarrer les logs de compilation...
                </div>
              ) : (
                terminalLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-1.5 hover:bg-slate-900/30 px-1 rounded transition duration-150">
                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                    <span className={`shrink-0 font-bold uppercase text-[9px] px-1 rounded-xs ${
                      log.type === 'success' ? 'bg-emerald-950 text-emerald-400' :
                      log.type === 'error' ? 'bg-red-950 text-red-400' :
                      log.type === 'system' ? 'bg-blue-950 text-blue-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {log.type}
                    </span>
                    <span className={`flex-1 break-all ${
                      log.type === 'success' ? 'text-emerald-400 font-medium' :
                      log.type === 'error' ? 'text-red-400 font-semibold animate-pulse' :
                      log.type === 'system' ? 'text-blue-300 font-medium' :
                      'text-slate-300'
                    }`}>
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Right side: Build Summary Card */}
            {buildSummary && (
              <div className="w-full md:w-56 bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between shrink-0 font-mono text-[10px]">
                <div>
                  <h4 className="text-[10px] font-semibold uppercase text-slate-400 border-b border-slate-800 pb-1.5 mb-2 tracking-wider">
                    Résumé du Build
                  </h4>
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Statut :</span>
                      <span className={buildSummary.status === 'success' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {buildSummary.status === 'success' ? 'SUCCÈS' : 'ÉCHEC'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Durée :</span>
                      <span className="text-slate-200">{buildSummary.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Poids :</span>
                      <span className="text-slate-200">{buildSummary.sizeKb}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Code :</span>
                      <span className="text-slate-200">{buildSummary.linesCount} lignes</span>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 text-right mt-2 border-t border-slate-800/50 pt-1">
                  Compilé à {buildSummary.timestamp}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PUBLISHING COMPLETED MODAL OVERLAY */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative"
            >
              {!publishedUrl ? (
                // Publish Details Form Panel
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                      <Globe className="w-4 h-4" />
                    </div>
                    <h2 className="text-[24px] font-semibold font-display text-[#0A0E1A] tracking-tight">Publier mon site</h2>
                  </div>
                  
                  <p className="text-[15px] text-slate-500 leading-relaxed">
                    Déployez instantanément votre site généré par l'IA sur notre serveur DNS et rendez-le disponible pour vos clients.
                  </p>

                  <form onSubmit={handlePublishSite} className="space-y-4 pt-1">
                    <div>
                      <label className="block text-[12px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Nom du Site</label>
                      <input
                        type="text"
                        required
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="Ex: Mon Portfolio d'Artiste"
                        className="block w-full px-3 py-2 sleek-input text-[15px] text-[#0A0E1A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Nom de domaine</label>
                      <input
                        type="text"
                        required
                        value={siteDomain}
                        onChange={(e) => setSiteDomain(e.target.value)}
                        placeholder="Ex: portfolio-jean"
                        className="block w-full px-3 py-2 sleek-input text-[15px] text-[#0A0E1A]"
                      />
                      <span className="text-[12px] text-slate-400 mt-1 block">Sans extension (ex: `.com`). L'extension `.weel.site` sera rattachée automatiquement.</span>
                    </div>

                    <div>
                      <label className="block text-[12px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Type de site</label>
                      <select
                        value={siteType}
                        onChange={(e: any) => setSiteType(e.target.value)}
                        className="block w-full px-3 py-2 sleek-input text-[15px] text-[#0A0E1A] cursor-pointer"
                      >
                        <option value="vitrine">Site Vitrine (HTML/CSS)</option>
                        <option value="e-commerce">Boutique E-commerce</option>
                        <option value="portfolio">Portfolio créatif</option>
                        <option value="blog">Blog d'actualités</option>
                      </select>
                    </div>

                    {errorMessage && (
                      <div className="p-3 bg-red-50 text-red-700 text-5xs font-bold uppercase rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPublishModal(false)}
                        className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isPublishing}
                        className="flex-1 py-2 px-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl shadow-md font-semibold text-xs transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-1"
                      >
                        {isPublishing ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Publication...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Déployer en ligne
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Publish Successful Celebration Panel
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-500 shadow-md">
                    <Check className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-[24px] font-semibold font-display text-[#0A0E1A] tracking-tight">Félicitations, votre site est en ligne !</h3>
                  <p className="text-[15px] text-slate-400">
                    Votre site web a été généré, optimisé et hébergé avec succès sur Weel-Tech. Il est maintenant accessible sur internet.
                  </p>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-mono break-all text-slate-600 select-all flex items-center justify-center gap-1.5 hover:bg-slate-100/50 transition">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#2563EB] transition">
                      {publishedUrl}
                    </a>
                  </div>

                  <div className="pt-4 flex gap-2.5">
                    <button
                      onClick={() => {
                        setShowPublishModal(false);
                        setPublishedUrl(null);
                        if (onViewChange) onViewChange('sites');
                      }}
                      className="flex-1 py-2 px-4 bg-brand-dark text-white rounded-xl shadow-xs font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
                    >
                      Retour à mes sites
                    </button>
                    <a
                      href={publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-4 bg-[#2563EB] text-white rounded-xl shadow-md font-semibold text-xs hover:bg-blue-700 transition cursor-pointer flex justify-center items-center gap-1"
                    >
                      Visiter
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple, high-quality syntax highlighting for raw HTML code lines in standard JSX
function highlightHtmlLine(line: string) {
  let escaped = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Return comments immediately
  if (escaped.includes('&lt;!--')) {
    return <span className="text-slate-500 italic" dangerouslySetInnerHTML={{ __html: escaped }} />;
  }

  // Tags highlighted in blue/cyan
  escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9-:]+)/g, '<span class="text-blue-400 font-medium">$1</span>');
  escaped = escaped.replace(/(&gt;)/g, '<span class="text-blue-400 font-medium">$1</span>');
  escaped = escaped.replace(/(\/&gt;)/g, '<span class="text-blue-400 font-medium">$1</span>');

  // Attributes highlighted in purple, and their string values in green
  escaped = escaped.replace(/([a-zA-Z0-9-]+)=(&quot;.*?&quot;)/g, '<span class="text-purple-400">$1</span>=<span class="text-emerald-400">$2</span>');
  escaped = escaped.replace(/([a-zA-Z0-9-]+)=(&#x27;.*?&#x27;)/g, '<span class="text-purple-400">$1</span>=<span class="text-emerald-400">$2</span>');

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
}
