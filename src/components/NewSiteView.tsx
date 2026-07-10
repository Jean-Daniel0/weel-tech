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
  ChevronUp,
  X,
  Folder,
  FileCode,
  Image,
  CreditCard,
  Plus,
  Upload,
  Edit3,
  Save,
  BookOpen,
  RefreshCw,
  Eye,
  Settings
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

  // New States for Editor & Asset Manager
  const [selectedFile, setSelectedFile] = useState<string>('index.html');
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [editCodeValue, setEditCodeValue] = useState<string>('');
  const [userApiKey, setUserApiKey] = useState<string>('vp_live_demo_weel_tech_7k29f');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  
  // Widget Builder States
  const [widgetAmount, setWidgetAmount] = useState<number>(25);
  const [widgetCurrency, setWidgetCurrency] = useState<string>('USD');
  const [widgetProductName, setWidgetProductName] = useState<string>('Abonnement Premium');
  const [widgetDesc, setWidgetDesc] = useState<string>('Accès complet à nos services');

  // Curated premium images for the gallery
  const imagePresets = {
    resto: [
      { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80', label: 'Ambiance Café Moderne' },
      { url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80', label: 'Machine à Café Espresso' },
      { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80', label: 'Tasse de Cappuccino' },
      { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', label: 'Salle de Restaurant' }
    ],
    tech: [
      { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80', label: 'Équipe de Développement' },
      { url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80', label: 'Réunion de Travail SaaS' },
      { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', label: 'Tableau de Bord Analytics' },
      { url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80', label: 'Ordinateur Portable minimaliste' }
    ],
    art: [
      { url: 'https://images.unsplash.com/photo-1453722751114-569253a5cf6b?auto=format&fit=crop&w=800&q=80', label: 'Objectif de Caméra Pro' },
      { url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80', label: 'Séance Photo Extérieure' },
      { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80', label: 'Appareil Photo Vintage' },
      { url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80', label: 'Photographe de Nature' }
    ],
    shop: [
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80', label: 'Boutique de Vêtements' },
      { url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80', label: 'Étagère de Produits Artisanaux' },
      { url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80', label: 'Vêtements Minimalistes' },
      { url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80', label: 'Sacs de Shopping Premium' }
    ]
  };

  // Sync edit code value on tab switch or generation
  useEffect(() => {
    if (selectedFile === 'index.html') {
      setEditCodeValue(generatedHtml);
    } else if (selectedFile === 'styles.css') {
      setEditCodeValue(extractStyleFromHtml(generatedHtml));
    } else if (selectedFile === 'app.js') {
      setEditCodeValue(extractScriptFromHtml(generatedHtml));
    }
  }, [selectedFile, generatedHtml]);

  // Load API Key on mount
  useEffect(() => {
    if (userProfile?.id) {
      supabase
        .from('api_keys')
        .select('key')
        .eq('user_id', userProfile.id)
        .eq('status', 'active')
        .limit(1)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setUserApiKey(data[0].key);
          }
        });
    }
  }, [userProfile]);

  const handleSaveEditedCode = () => {
    let updatedHtml = generatedHtml;
    if (selectedFile === 'index.html') {
      updatedHtml = editCodeValue;
    } else if (selectedFile === 'styles.css') {
      updatedHtml = injectStyleIntoHtml(generatedHtml, editCodeValue);
    } else if (selectedFile === 'app.js') {
      updatedHtml = injectScriptIntoHtml(generatedHtml, editCodeValue);
    }
    
    setGeneratedHtml(updatedHtml);
    setIsEditingCode(false);
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalLogs(prev => [...prev, {
      id: 'log-' + Math.random().toString(36).substring(2, 11),
      text: `✏️ Modifications enregistrées avec succès dans ${selectedFile} !`,
      type: 'success',
      timestamp: timeStr
    }]);
  };

  const replaceImageSrc = (oldSrc: string, newSrc: string) => {
    const newHtml = generatedHtml.replaceAll(oldSrc, newSrc);
    setGeneratedHtml(newHtml);
    setEditCodeValue(newHtml);
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalLogs(prev => [...prev, {
      id: 'log-' + Math.random().toString(36).substring(2, 11),
      text: "🖼️ Image mise à jour et remplacée avec succès !",
      type: 'success',
      timestamp: timeStr
    }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, oldImgSrc: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        replaceImageSrc(oldImgSrc, base64Url);
      }
    };
    reader.readAsDataURL(file);
  };

  const autoInjectPayment = () => {
    let html = generatedHtml;
    
    const scriptSrc = `<script src="${window.location.origin}/vendza-pay-widget.js"></script>`;
    if (!html.includes('vendza-pay-widget.js')) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `  ${scriptSrc}\n</body>`);
      } else {
        html = html + `\n${scriptSrc}`;
      }
    }

    const btnRegex = /<(button|a)\b([^>]*?)>([^<]*?(?:acheter|commander|payer|checkout|réserver|s'abonner|order|pay|buy|subscribe)[^<]*?)<\/\1>/gi;
    
    if (btnRegex.test(html)) {
      const updatedHtml = html.replace(btnRegex, (match, tag, attrs, text) => {
        const hasClass = /class=["']([^"']+)["']/i.exec(attrs);
        let newAttrs = attrs;
        
        if (hasClass) {
          newAttrs = attrs.replace(/class=["']([^"']+)["']/i, `class="${hasClass[1]} vendza-pay-button"`);
        } else {
          newAttrs += ' class="vendza-pay-button"';
        }
        
        newAttrs += ` id="vendza-pay-button"`;
        newAttrs += ` data-api-key="${userApiKey}"`;
        newAttrs += ` data-amount="${widgetAmount}"`;
        newAttrs += ` data-currency="${widgetCurrency}"`;
        newAttrs += ` data-description="${widgetDesc.replace(/"/g, '&quot;')}"`;
        
        return `<${tag}${newAttrs}>${text}</${tag}>`;
      });
      
      setGeneratedHtml(updatedHtml);
      setEditCodeValue(updatedHtml);
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTerminalLogs(prev => [...prev, {
        id: 'log-' + Math.random().toString(36).substring(2, 11),
        text: "⚡ Connexion automatique réussie ! Le premier bouton de paiement trouvé a été transformé en bouton Vendza:Pay sécurisé.",
        type: 'success',
        timestamp: timeStr
      }]);
    } else {
      const widgetCode = `\n<div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
  <div class="vendza-pay-button" 
       id="vendza-pay-button"
       data-api-key="${userApiKey}"
       data-amount="${widgetAmount}"
       data-currency="${widgetCurrency}"
       data-description="${widgetDesc.replace(/"/g, '&quot;')}">
  </div>
</div>`;
      
      let updatedHtml = html;
      if (html.includes('</body>')) {
        updatedHtml = html.replace('</body>', `${widgetCode}\n</body>`);
      } else {
        updatedHtml += widgetCode;
      }
      
      setGeneratedHtml(updatedHtml);
      setEditCodeValue(updatedHtml);
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTerminalLogs(prev => [...prev, {
        id: 'log-' + Math.random().toString(36).substring(2, 11),
        text: "⚡ Aucun bouton de paiement trouvé dans le design d'origine. Un bouton de paiement flottant a été injecté au bas de l'écran !",
        type: 'info',
        timestamp: timeStr
      }]);
    }
  };
  
  // Abort controller and cancel/timeout state tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortReasonRef = useRef<'timeout' | 'user' | null>(null);

  const handleCancelGeneration = () => {
    if (isGenerating && abortControllerRef.current) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTerminalLogs(prev => [...prev, {
        id: 'log-' + Math.random().toString(36).substring(2, 11),
        text: "🛑 Demande d'annulation de la génération par l'utilisateur...",
        type: 'warning',
        timestamp: timeStr
      }]);
      abortReasonRef.current = 'user';
      abortControllerRef.current.abort();
    }
  };
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
  
  // Tab and real-time generation step states
  const [activeLeftTab, setActiveLeftTab] = useState<'chat' | 'suggestions'>('chat');
  const [generationStepIndex, setGenerationStepIndex] = useState(-1);

  const generationSteps = [
    { label: "Analyse sémantique", desc: "Analyse des intentions de design et objectifs" },
    { label: "Design & Couleurs", desc: "Conception de la charte graphique et du style" },
    { label: "Structure HTML5", desc: "Structuration sémantique complète de la page" },
    { label: "Composants CSS", desc: "Intégration et style responsive avec Tailwind CSS" },
    { label: "Interactivité JS", desc: "Injection de l'interactivité dynamique et des animations" },
    { label: "Recherche Médias", desc: "Sélection d'images d'illustration Unsplash adaptées" },
    { label: "Assemblage final", desc: "Optimisation de l'affichage, polices et métadonnées" }
  ];

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
      title: "Portfolio de Photographe d'Art",
      desc: "Esthétique sombre raffinée, galerie filtrable interactive gérée par JavaScript, et formulaire sécurisé avec validation.",
      image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=400&q=80",
      prompt: "Génère un portfolio de photographe d'art professionnel à l'aide de Tailwind CSS et Lucide Icons. L'interface doit adopter une esthétique sombre et haut de gamme (fond noir ardoise avec des nuances crème/or subtiles). Fonctionnalités requises : une section héros captivante avec titre d'en-tête élégant, une galerie de photographies d'art interactive entièrement filtrable par catégories (ex: Paysages, Portraits, Nature) gérée par JavaScript côté client, une présentation biographique à l'allure éditoriale littéraire, et un formulaire de contact minimaliste avec validation rigoureuse en temps réel et avertissement contre l'envoi de données confidentielles. Veille à ce que toutes les images Unsplash utilisent l'attribut referrerPolicy=\"no-referrer\" et que tous les liens externes s'ouvrent de manière sécurisée avec target=\"_blank\" et rel=\"noopener noreferrer\"."
    },
    {
      title: "Boutique de Café Artisanal",
      desc: "Ambiance chaleureuse, présentation écoresponsable, grille de produits interactive avec panier d'achat dynamique en JS.",
      image: "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=400&q=80",
      prompt: "Crée une page e-commerce interactive pour une marque de café artisanal haut de gamme. Utilise des nuances chaudes de terre, de crème et de brun-café avec des touches modernes de vert forêt. Le site doit intégrer : une section héros immersive, un volet éducatif sur le sourcing éthique des grains, une grille de produits interactive permettant l'ajout d'articles au panier en temps réel, un panier d'achat interactif recalculant dynamiquement le total, les quantités et les frais d'expédition fictifs, et une simulation de validation de commande sécurisée (sans demande de carte bancaire réelle) montrant un retour visuel clair sous forme de notification."
    },
    {
      title: "Agence de Stratégie Digitale",
      desc: "Design professionnel épuré, grilles de services interactives, témoignages animés et grille tarifaire dynamique.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80",
      prompt: "Développe une page vitrine complète pour une agence de conseil et stratégie marketing digital. Utilise une palette lumineuse et épurée (fond blanc cassé, gris doux, bleu électrique professionnel). Inclus : un hero accrocheur avec des boutons d'appels à l'action distincts, une grille de services interactifs avec des icônes descriptives, un module dynamique de témoignages clients défilant ou filtrable, un tableau comparatif de tarifs interactif permettant de basculer instantanément entre facturation mensuelle et annuelle grâce à JavaScript, et un formulaire d'estimation de projet sécurisé avec validation complète des entrées de l'utilisateur."
    },
    {
      title: "Landing Page SaaS Moderne",
      desc: "Style technologique de pointe avec des dégradés de couleurs subtils, un accordéon FAQ dynamique et des forfaits interactifs.",
      image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80",
      prompt: "Génère une landing page haut de gamme pour un logiciel SaaS de productivité d'équipe. Crée une mise en page technologique raffinée (fond gris anthracite très élégant, bordures extra-fines, dégradés de couleurs doux bleus/violets, coins arrondis précis). Sections requises : proposition de valeur percutante avec bouton d'appel à l'action, grille de fonctionnalités interactives avec fenêtres de détails réactives au survol, tableau de comparaison des formules d'abonnement, section FAQ interactive utilisant des accordéons dynamiques s'ouvrant individuellement en JS, et un pied de page légal soigné. Assure une accessibilité visuelle irréprochable avec des taux de contraste optimisés pour le texte."
    },
    {
      title: "Hôtel-Boutique & Réservation",
      desc: "Diaporama photo de prestige, sélecteur de dates de séjour logique avec calcul de prix estimatif automatique.",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
      prompt: "Conçois une interface web d'exception pour un hôtel-boutique et spa de luxe. Adopte un style chic et lumineux (nuances de blanc, beige lin et touches dorées minimalistes, polices sérif raffinées). Le site doit contenir : un en-tête immersif avec un diaporama d'images des suites, une grille présentant les services et activités exclusifs, un formulaire de réservation interactif et intelligent validant logiquement que la date de départ est postérieure à la date d'arrivée, calculant automatiquement un devis estimatif dynamique basé sur le nombre de nuits et de personnes, et un encart confirmant que la saisie de données est sécurisée et confidentielle."
    },
    {
      title: "Maison de Couture & Design",
      desc: "Style éditorial façon magazine de mode, lookbook immersif de créateur et inscription sécurisée.",
      image: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&w=400&q=80",
      prompt: "Construis un site web artistique pour un atelier de création de mode et haute couture sur-mesure. Inspire-toi des magazines d'art contemporains : grands aplats de couleurs, typographie fine et distinguée, et utilisation audacieuse des espaces négatifs. Le site doit comporter : une introduction de l'histoire et du savoir-faire de l'atelier, un lookbook interactif permettant d'explorer de grandes photos de créateur avec description textuelle dynamique au clic ou survol, et un formulaire sécurisé de demande de rendez-vous ou d'inscription à la newsletter validant précisément le format des adresses e-mail avec un message de succès élégant."
    }
  ];

  const handleCopyCode = () => {
    if (!generatedHtml) return;
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSuggestionClick = (title: string, fullPromptText: string) => {
    setActiveLeftTab('chat');
    setPrompt('');
    // Auto-trigger the generation immediately on selection
    setTimeout(() => {
      handleGenerateSite(undefined, fullPromptText);
    }, 100);
  };

  // Run the site generation
  const handleGenerateSite = async (e?: FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const activePrompt = overridePrompt || prompt;
    if (!activePrompt.trim() || isGenerating) return;

    const userMsgText = activePrompt.trim();
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

    setGenerationStepIndex(0);
    const stepIntervalMs = 700; // Fast step intervals (700ms) to make generation feel extremely snappy and responsive
    steps.forEach((step, idx) => {
      const t = setTimeout(() => {
        addLog(step.text, step.type);
        setGenerationStepIndex(idx + 1);
      }, (idx + 1) * stepIntervalMs);
      timeouts.push(t);
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;
    abortReasonRef.current = null;

    // Safety timeout of 35 seconds
    const fetchTimeoutId = setTimeout(() => {
      addLog("⚠️ Timeout de sécurité de 35 secondes dépassé côté client.", "warning");
      abortReasonRef.current = 'timeout';
      controller.abort();
    }, 35000);

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
        }),
        signal: controller.signal
      });

      // Clear timeouts since we have the result (or error)
      clearTimeout(fetchTimeoutId);
      timeouts.forEach(clearTimeout);

      // Instantly flush remaining logs for ultra-fast response
      const currentPrintedCount = Math.min(steps.length, Math.floor((Date.now() - startTime) / stepIntervalMs));
      for (let i = currentPrintedCount; i < steps.length; i++) {
        addLog(steps[i].text, steps[i].type);
      }
      setGenerationStepIndex(6); // Jump straight to completed step state

      let data: any = null;
      let parseError = false;

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (e) {
          parseError = true;
        }
      }

      if (!response.ok) {
        let errorMsg = "Une erreur est survenue pendant la génération.";
        if (data && data.error) {
          errorMsg = data.error;
        } else if (response.status === 504) {
          errorMsg = "La génération a dépassé la limite de temps autorisée de 24 secondes. Veuillez réessayer.";
        } else if (response.status === 503) {
          errorMsg = "Le service de génération est momentanément surchargé. Veuillez réessayer dans quelques instants.";
        } else {
          errorMsg = `Le serveur a renvoyé une erreur (Code: ${response.status}).`;
        }
        throw new Error(errorMsg);
      }

      if (parseError || !data) {
        throw new Error("Le serveur a renvoyé une réponse invalide (non-JSON). Veuillez réessayer.");
      }

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
      clearTimeout(fetchTimeoutId);
      console.error(err);
      timeouts.forEach(clearTimeout);

      let customErrorMessage = err.message || "Une erreur inconnue est survenue.";

      if (err.name === 'AbortError' || controller.signal.aborted) {
        if (abortReasonRef.current === 'timeout') {
          customErrorMessage = "La génération a pris trop de temps, veuillez réessayer.";
          addLog("❌ La génération a pris trop de temps (limite client de 35 secondes dépassée).", "error");
        } else {
          customErrorMessage = "Génération annulée par l'utilisateur.";
          addLog("ℹ️ Génération interrompue manuellement par l'utilisateur.", "info");
        }
      } else {
        addLog(`❌ Erreur critique de génération : ${customErrorMessage}`, "error");
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      setBuildSummary({
        status: 'error',
        duration,
        linesCount: 0,
        sizeKb: '0 KB',
        timestamp: new Date().toLocaleTimeString()
      });

      setErrorMessage(customErrorMessage);
      
      // Add error message as system bubble
      const errorMsgId = 'msg-' + Math.random().toString(36).substring(2, 11);
      const errorMessageBubble: ChatMessage = {
        id: errorMsgId,
        role: 'assistant',
        content: `❌ ${customErrorMessage}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessageBubble]);
    } finally {
      setIsGenerating(false);
      setGenerationStepIndex(-1);
      abortControllerRef.current = null;
      abortReasonRef.current = null;
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

          {/* Elegant Sub-Header Tab Selector (Onglets) */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveLeftTab('chat')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold font-display transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeLeftTab === 'chat'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200/50 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Send className="w-3 h-3" />
              Assistant Chat {messages.length > 0 && <span className="ml-1 px-1.5 py-0.2 bg-[#2563EB]/10 text-[#2563EB] text-[9px] rounded-full">{messages.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab('suggestions')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold font-display transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeLeftTab === 'suggestions'
                  ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200/50 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Modèles & Idées
            </button>
          </div>

          {/* Chat Messages Scrolling History / Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {activeLeftTab === 'suggestions' ? (
              // Tab Suggestions: Modèles de sites inspirants avec images
              <div className="space-y-4 py-1">
                <div className="px-1">
                  <h3 className="text-xs font-bold text-[#0A0E1A] font-display uppercase tracking-wider">Modèles Inspirants</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Explore des designs haut de gamme et génère ton site en un clic.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3.5 px-0.5 pb-2">
                  {suggestionPrompts.map((sug, idx) => (
                    <div 
                      key={idx}
                      className="group bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#2563EB]/30 transition-all duration-300 flex flex-col"
                    >
                      {/* Image Thumbnail */}
                      <div className="h-28 w-full overflow-hidden bg-slate-100 relative shrink-0">
                        <img 
                          src={sug.image} 
                          alt={sug.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60" />
                        <span className="absolute bottom-2 left-2.5 px-2 py-0.5 bg-white/95 backdrop-blur-xs text-[10px] font-bold text-[#2563EB] rounded-md shadow-xs uppercase tracking-wide">
                          Modèle IA
                        </span>
                      </div>
                      
                      {/* Body details */}
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[#0A0E1A] tracking-tight group-hover:text-[#2563EB] transition-colors">
                            {sug.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                            {sug.desc}
                          </p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(sug.title, sug.prompt)}
                          disabled={isGenerating}
                          className="w-full py-1.5 px-3 bg-[#2563EB]/10 hover:bg-[#2563EB] text-[#2563EB] hover:text-white disabled:opacity-50 text-[10px] font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          Générer ce site
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Tab Active Chat Assistant
              <>
                {messages.length === 0 ? (
                  // Empty State inside Chat
                  <div className="h-full flex flex-col justify-center py-6 text-center space-y-4 max-w-xs mx-auto">
                    <div className="w-9 h-9 rounded-xl bg-[#2563EB]/5 border border-[#2563EB]/10 flex items-center justify-center mx-auto">
                      <Sparkles className="w-4.5 h-4.5 text-[#2563EB]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-[#0A0E1A] font-display">Décris ton site idéal</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Écris tes idées ci-dessous, ou parcours les modèles visuels haut de gamme dans l'onglet des suggestions.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveLeftTab('suggestions')}
                      className="px-3.5 py-1.5 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] font-bold text-[11px] rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1 mx-auto"
                    >
                      <Sparkles className="w-3 h-3" />
                      Découvrir les modèles
                    </button>
                  </div>
                ) : (
                  // Active Conversation Chat list
                  <div className="space-y-3 pb-2">
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

                    {/* Stateful Real-time Stepper inside Chat Loading Bubble */}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 text-xs text-[#0A0E1A] flex flex-col gap-3 max-w-[90%] w-full">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]"></span>
                              </span>
                              <span className="font-bold text-[#0A0E1A] font-display uppercase tracking-wider text-[10px]">Création en cours...</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                              Étape {Math.max(1, generationStepIndex + 1)} / 7
                            </span>
                          </div>

                          {/* Progress bar line */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${((Math.max(0, generationStepIndex + 1)) / 7) * 100}%` }}
                            />
                          </div>

                          {/* Steps with indicators */}
                          <div className="space-y-2">
                            {generationSteps.map((step, idx) => {
                              const isDone = idx < generationStepIndex;
                              const isActive = idx === generationStepIndex;
                              const isPending = idx > generationStepIndex;

                              return (
                                <div 
                                  key={idx} 
                                  className={`flex items-start gap-2.5 text-[11px] transition-all duration-200 ${
                                    isActive ? 'text-[#2563EB] font-medium scale-[1.01]' : isPending ? 'text-slate-400 opacity-60' : 'text-slate-600'
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isDone ? (
                                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5" />
                                      </div>
                                    ) : isActive ? (
                                      <div className="w-3.5 h-3.5 rounded-full border border-[#2563EB] bg-blue-50 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                                      </div>
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[8px] text-slate-400">
                                        {idx + 1}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between leading-none">
                                      <span>{step.label}</span>
                                      {isActive && <span className="text-[9px] font-mono animate-pulse text-[#2563EB]">actif...</span>}
                                    </div>
                                    {isActive && (
                                      <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">{step.desc}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Cancel generation button inside stepper card */}
                          <button
                            type="button"
                            onClick={handleCancelGeneration}
                            className="mt-2 w-full py-2 px-3 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            Annuler la génération
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Prompt Entry Box Form */}
          <div className="border-t border-slate-150 p-2.5 bg-slate-50/50">
            <form onSubmit={handleGenerateSite} className="flex gap-1.5">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isGenerating ? "Génération en cours... Vous pouvez annuler si besoin" : "Ex: Ajoute un bouton d'achat ou change la couleur..."}
                disabled={isGenerating}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-[#0A0E1A] outline-none focus:ring-2 focus:ring-brand-blue/15 focus:border-brand-blue transition placeholder-slate-400 disabled:opacity-50 shadow-xs"
              />
              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  Annuler
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="p-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
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
                  <div className="w-full h-full flex flex-col md:flex-row bg-[#0E131F] text-slate-100 overflow-hidden font-sans">
                    
                    {/* Left Sidebar: Virtual Project Explorer */}
                    <div className="w-full md:w-60 bg-[#151B2B] border-r border-slate-800 flex flex-col shrink-0">
                      
                      {/* Sidebar Header */}
                      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center">
                          <Laptop className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Explorateur</h4>
                          <p className="text-[9px] text-slate-500 font-mono">PROJET : weel-site-live</p>
                        </div>
                      </div>

                      {/* File tree */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
                        
                        {/* Folder 1: Source Files */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Folder className="w-3.5 h-3.5 text-amber-500/80 fill-amber-500/10" />
                            <span>Fichiers Source</span>
                          </div>
                          
                          {/* File index.html */}
                          <button
                            type="button"
                            onClick={() => { setSelectedFile('index.html'); setIsEditingCode(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition text-left cursor-pointer ${
                              selectedFile === 'index.html'
                                ? 'bg-[#2563EB]/15 text-blue-400 border border-blue-500/20 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-blue-400" />
                              index.html
                            </span>
                            <span className="text-[9px] text-slate-600 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">Squelette</span>
                          </button>

                          {/* File styles.css */}
                          <button
                            type="button"
                            onClick={() => { setSelectedFile('styles.css'); setIsEditingCode(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition text-left cursor-pointer ${
                              selectedFile === 'styles.css'
                                ? 'bg-[#2563EB]/15 text-blue-400 border border-blue-500/20 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-teal-400" />
                              styles.css
                            </span>
                            <span className="text-[9px] text-slate-600 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">Styles</span>
                          </button>

                          {/* File app.js */}
                          <button
                            type="button"
                            onClick={() => { setSelectedFile('app.js'); setIsEditingCode(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition text-left cursor-pointer ${
                              selectedFile === 'app.js'
                                ? 'bg-[#2563EB]/15 text-blue-400 border border-blue-500/20 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                              app.js
                            </span>
                            <span className="text-[9px] text-slate-600 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">JS Code</span>
                          </button>
                        </div>

                        {/* Folder 2: Media Management */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Folder className="w-3.5 h-3.5 text-indigo-500/80 fill-indigo-500/10" />
                            <span>Actifs Médias</span>
                          </div>
                          
                          {/* Media Gallery file */}
                          <button
                            type="button"
                            onClick={() => { setSelectedFile('images.png'); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition text-left cursor-pointer ${
                              selectedFile === 'images.png'
                                ? 'bg-[#2563EB]/15 text-blue-400 border border-blue-500/20 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Image className="w-3.5 h-3.5 text-indigo-400" />
                              images.png
                            </span>
                            <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20 font-semibold font-sans">
                              {getImgSources(generatedHtml).length} im.
                            </span>
                          </button>
                        </div>

                        {/* Folder 3: Monetization */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Folder className="w-3.5 h-3.5 text-emerald-500/80 fill-emerald-500/10" />
                            <span>Monétisation</span>
                          </div>
                          
                          {/* Vendza Pay file */}
                          <button
                            type="button"
                            onClick={() => { setSelectedFile('vendza-pay.html'); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition text-left cursor-pointer ${
                              selectedFile === 'vendza-pay.html'
                                ? 'bg-[#2563EB]/15 text-blue-400 border border-blue-500/20 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                              vendza-pay.html
                            </span>
                            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 font-semibold font-sans">Connecté</span>
                          </button>
                        </div>

                      </div>

                      {/* Connection status footer */}
                      <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Serveur Cloud Actif</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono leading-relaxed truncate">Sync : weel-tech.app</p>
                      </div>

                    </div>

                    {/* Right Pane: Code Editor or Module Views */}
                    <div className="flex-1 min-w-0 flex flex-col bg-[#0A0D16]">
                      
                      {/* Sub-Header bar */}
                      <div className="bg-[#111625] border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-mono font-medium text-slate-300">
                            weel-site-live / {selectedFile}
                          </span>
                        </div>

                        {/* Actions for source code files */}
                        {(selectedFile === 'index.html' || selectedFile === 'styles.css' || selectedFile === 'app.js') && (
                          <div className="flex items-center gap-2">
                            {/* Read/Write mode toggles */}
                            <div className="bg-[#0A0D16] border border-slate-800 p-0.5 rounded-md flex">
                              <button
                                type="button"
                                onClick={() => setIsEditingCode(false)}
                                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                  !isEditingCode ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <Eye className="w-3 h-3 inline mr-1" />
                                Mode Lecture
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedFile === 'index.html') setEditCodeValue(generatedHtml);
                                  else if (selectedFile === 'styles.css') setEditCodeValue(extractStyleFromHtml(generatedHtml));
                                  else if (selectedFile === 'app.js') setEditCodeValue(extractScriptFromHtml(generatedHtml));
                                  setIsEditingCode(true);
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                  isEditingCode ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <Edit3 className="w-3 h-3 inline mr-1" />
                                Mode Édition
                              </button>
                            </div>

                            {/* Standard Copy button */}
                            {!isEditingCode ? (
                              <button
                                type="button"
                                onClick={() => {
                                  let txt = '';
                                  if (selectedFile === 'index.html') txt = generatedHtml;
                                  else if (selectedFile === 'styles.css') txt = extractStyleFromHtml(generatedHtml);
                                  else if (selectedFile === 'app.js') txt = extractScriptFromHtml(generatedHtml);
                                  navigator.clipboard.writeText(txt);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded text-[10px] font-mono transition cursor-pointer shadow-xs border border-slate-700/30"
                              >
                                {copied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copier</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              /* Save / Cancel buttons in write mode */
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingCode(false)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold transition cursor-pointer"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveEditedCode}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold transition cursor-pointer shadow-xs"
                                >
                                  <Save className="w-3 h-3" />
                                  Enregistrer
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content panel */}
                      <div className="flex-1 overflow-auto">
                        
                        {/* VIEW 1: SOURCE FILES (index.html, styles.css, app.js) */}
                        {(selectedFile === 'index.html' || selectedFile === 'styles.css' || selectedFile === 'app.js') && (
                          <div className="w-full h-full flex flex-col min-h-0 bg-slate-950">
                            {isEditingCode ? (
                              /* WRITE MODE: Textarea Editor */
                              <div className="flex-1 flex flex-col p-4 relative h-full">
                                <div className="text-[10px] text-slate-400 pb-2 flex justify-between items-center shrink-0">
                                  <span>Modifications en temps réel sur <code>{selectedFile}</code>. Utilisez Ctrl+S ou cliquez sur "Enregistrer" pour appliquer.</span>
                                  <span className="font-mono text-emerald-400 font-semibold">Mode d'écriture libre actif</span>
                                </div>
                                <textarea
                                  value={editCodeValue}
                                  onChange={(e) => setEditCodeValue(e.target.value)}
                                  className="flex-1 w-full bg-[#080B12] text-[#E2E8F0] font-mono text-xs p-4 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed h-[380px] max-h-full"
                                  placeholder={`Entrez votre code ${selectedFile} ici...`}
                                  spellCheck={false}
                                />
                              </div>
                            ) : (
                              /* READ MODE: Pretty Syntax Highlight */
                              <div className="flex-1 overflow-auto font-mono text-[11px] leading-normal py-3 select-text bg-slate-950">
                                {(selectedFile === 'index.html' ? generatedHtml : selectedFile === 'styles.css' ? extractStyleFromHtml(generatedHtml) : extractScriptFromHtml(generatedHtml))
                                  .split('\n')
                                  .map((line, idx) => (
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
                            )}
                          </div>
                        )}

                        {/* VIEW 2: MEDIA GALLERY MANAGER (images.png) */}
                        {selectedFile === 'images.png' && (
                          <div className="p-6 space-y-6 max-w-4xl">
                            <div>
                              <h2 className="text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
                                <Image className="w-5 h-5 text-indigo-400" />
                                Bibliothèque d'Images & Remplacement
                              </h2>
                              <p className="text-xs text-slate-400 mt-1">
                                Nous avons scanné le code source de votre site web pour y découvrir toutes les balises d'images actives. Vous pouvez uploader vos propres photos ou en choisir parmi nos presets Unsplash de haute qualité pour les remplacer instantanément dans le code.
                              </p>
                            </div>

                            {/* Main List of Images detected in the HTML */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Images Détectées dans le site ({getImgSources(generatedHtml).length})</h3>
                              
                              {getImgSources(generatedHtml).length === 0 ? (
                                <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-400">
                                  <Image className="w-8 h-8 text-slate-600 mx-auto mb-2.5" />
                                  <p className="text-xs">Aucune image active détectée dans le squelette de votre site web.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {getImgSources(generatedHtml).map((src, idx) => (
                                    <div key={idx} className="bg-[#131929] border border-slate-800 rounded-xl p-4 flex gap-4 items-start shadow-xs">
                                      {/* Image Thumbnail */}
                                      <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative group">
                                        <img 
                                          src={src} 
                                          alt={`Detected ${idx}`} 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] text-slate-300">
                                          N° {idx + 1}
                                        </div>
                                      </div>

                                      {/* Replacement controls */}
                                      <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-semibold text-indigo-400">Balise &lt;img&gt; #{idx+1}</span>
                                          <span className="text-[9px] text-slate-500 font-mono truncate max-w-[150px]" title={src}>
                                            {src.substring(0, 30)}...
                                          </span>
                                        </div>

                                        {/* Direct File Upload */}
                                        <div className="flex gap-2">
                                          <label className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer text-center border border-slate-700/50 flex items-center justify-center gap-1.5">
                                            <Upload className="w-3 h-3" />
                                            Uploader un fichier
                                            <input 
                                              type="file" 
                                              accept="image/*" 
                                              onChange={(e) => handleImageUpload(e, src)} 
                                              className="hidden" 
                                            />
                                          </label>
                                          
                                          {/* Manual URL field */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newUrl = prompt("Saisissez l'adresse URL complète de l'image de remplacement (ex: https://example.com/photo.jpg) :");
                                              if (newUrl && newUrl.trim() !== '') {
                                                replaceImageSrc(src, newUrl.trim());
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-semibold transition cursor-pointer border border-slate-700/50"
                                          >
                                            Coller URL
                                          </button>
                                        </div>

                                        {/* Quick select presets based on templates */}
                                        <div className="pt-1.5 border-t border-slate-800/80">
                                          <p className="text-[9px] text-slate-400 mb-1">Remplacement rapide par catégorie :</p>
                                          <div className="flex flex-wrap gap-1">
                                            <button
                                              type="button"
                                              onClick={() => replaceImageSrc(src, imagePresets.resto[Math.floor(Math.random() * 4)].url)}
                                              className="text-[8px] bg-slate-900 hover:bg-[#1E293B] text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 cursor-pointer"
                                            >
                                              ☕ Café/Resto
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => replaceImageSrc(src, imagePresets.tech[Math.floor(Math.random() * 4)].url)}
                                              className="text-[8px] bg-slate-900 hover:bg-[#1E293B] text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 cursor-pointer"
                                            >
                                              💻 SaaS/Tech
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => replaceImageSrc(src, imagePresets.art[Math.floor(Math.random() * 4)].url)}
                                              className="text-[8px] bg-slate-900 hover:bg-[#1E293B] text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 cursor-pointer"
                                            >
                                              📸 Art/Portrait
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => replaceImageSrc(src, imagePresets.shop[Math.floor(Math.random() * 4)].url)}
                                              className="text-[8px] bg-slate-900 hover:bg-[#1E293B] text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 cursor-pointer"
                                            >
                                              🛍️ Boutique
                                            </button>
                                          </div>
                                        </div>

                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Preset library explorer */}
                            <div className="pt-4 border-t border-slate-800 space-y-3">
                              <h3 className="text-xs font-semibold text-slate-300">Galerie de Modèles Unsplash Recommandés</h3>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                {[...imagePresets.resto, ...imagePresets.tech].slice(0, 4).map((p, pIdx) => (
                                  <div key={pIdx} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col group">
                                    <div className="h-20 w-full overflow-hidden relative">
                                      <img src={p.url} alt={p.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="p-2 space-y-1">
                                      <p className="text-[9px] text-slate-300 truncate font-semibold">{p.label}</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(p.url);
                                          alert("URL copiée ! Vous pouvez la coller dans n'importe quel attribut d'image de votre code.");
                                        }}
                                        className="w-full text-center py-0.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[8px] rounded transition cursor-pointer font-medium"
                                      >
                                        Copier l'URL
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}

                        {/* VIEW 3: MONETIZATION / VENDZA:PAY INTEGRATION (vendza-pay.html) */}
                        {selectedFile === 'vendza-pay.html' && (
                          <div className="p-6 space-y-6 max-w-4xl text-slate-300">
                            
                            {/* Section Header */}
                            <div>
                              <h2 className="text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-400 animate-pulse" />
                                Connexion Automatique des Méthodes de Paiement
                              </h2>
                              <p className="text-xs text-slate-400 mt-1">
                                Weel-Tech intègre l'infrastructure financière unifiée <strong>Vendza:Pay</strong>. Ce module vous permet d'accepter automatiquement les paiements en Haïti par <strong>MonCash (Gourdes)</strong> et à l'international par <strong>Stripe (USD / Cartes de crédit)</strong> sur vos sites web générés.
                              </p>
                            </div>

                            {/* Direct Connect Alert Box */}
                            <div className="bg-[#102A24] border border-emerald-500/30 rounded-xl p-4 text-xs flex gap-3.5 items-start">
                              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                              <div className="space-y-1 leading-relaxed">
                                <p className="font-bold text-emerald-300">Intégration d'API Automatisée</p>
                                <p className="text-slate-300">
                                  Votre clé secrète Vendza:Pay active (<code className="font-mono text-emerald-400">{userApiKey.substring(0, 12)}...</code>) a été détectée et est automatiquement configurée pour ce site. Les boutons de commande d'origine du code seront configurés avec vos identifiants pour que les fonds arrivent directement sur votre Hub de paiement Weel-Tech !
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                              
                              {/* Left column: Button Config Wizard */}
                              <div className="bg-[#121826] border border-slate-800 rounded-xl p-5 space-y-4">
                                <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1">
                                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                                  Générateur de Bouton de Paiement
                                </h3>
                                
                                <div className="space-y-3">
                                  {/* Product Name */}
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nom du produit / service</label>
                                    <input 
                                      type="text" 
                                      value={widgetProductName} 
                                      onChange={(e) => setWidgetProductName(e.target.value)}
                                      className="w-full bg-[#080B12] text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
                                      placeholder="Ex: Café Robusta Premium"
                                    />
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description courte</label>
                                    <input 
                                      type="text" 
                                      value={widgetDesc} 
                                      onChange={(e) => setWidgetDesc(e.target.value)}
                                      className="w-full bg-[#080B12] text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
                                      placeholder="Ex: Paquet de 500g, torréfié localement"
                                    />
                                  </div>

                                  {/* Price and currency */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Montant</label>
                                      <input 
                                        type="number" 
                                        value={widgetAmount} 
                                        onChange={(e) => setWidgetAmount(Number(e.target.value))}
                                        className="w-full bg-[#080B12] text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Devise</label>
                                      <select
                                        value={widgetCurrency}
                                        onChange={(e) => setWidgetCurrency(e.target.value)}
                                        className="w-full bg-[#080B12] text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
                                      >
                                        <option value="USD">USD ($) - Stripe</option>
                                        <option value="HTG">HTG (Gourdes) - MonCash</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Instant Injection Magic button! */}
                                <button
                                  type="button"
                                  onClick={autoInjectPayment}
                                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex justify-center items-center gap-1.5 shadow-md shadow-emerald-950/25"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                                  ⚡ Connecter automatiquement au site
                                </button>
                                
                                <p className="text-[9px] text-slate-500 leading-relaxed text-center">
                                  Ce bouton va scanner le code HTML de votre site, repérer les boutons d'appel à l'action existants (ex: "Acheter maintenant") et les connecter automatiquement à votre module de paiement.
                                </p>
                              </div>

                              {/* Right column: Explanations and documentation */}
                              <div className="space-y-4 text-xs">
                                <div className="bg-[#121826] border border-slate-800 rounded-xl p-5 space-y-3.5">
                                  <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                                    Comment ça marche ?
                                  </h3>
                                  
                                  <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
                                    <div className="flex gap-2">
                                      <span className="w-4 h-4 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">1</span>
                                      <p>Le widget sécurisé unifié de <code>vendza-pay-widget.js</code> est chargé de manière autonome en arrière-plan.</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="w-4 h-4 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">2</span>
                                      <p>Il identifie les éléments portant l'identifiant <code>id="vendza-pay-button"</code> ou la classe <code>.vendza-pay-button</code> et y injecte le bouton de paiement universel.</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="w-4 h-4 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">3</span>
                                      <p>Lorsque vos clients cliquent dessus, ils choisissent leur mode de paiement et règlent l'achat. L'argent est synchronisé en temps réel sur votre tableau de bord financier.</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-[#121826] border border-slate-800 rounded-xl p-5 space-y-3">
                                  <h3 className="text-xs font-bold text-slate-300">Code Source d'Intégration Généré</h3>
                                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-[9px] text-slate-300 overflow-x-auto whitespace-pre">
{`<script src="${window.location.origin}/vendza-pay-widget.js"></script>

<div class="vendza-pay-button"
     data-api-key="${userApiKey}"
     data-amount="${widgetAmount}"
     data-currency="${widgetCurrency}"
     data-description="${widgetProductName.replace(/"/g, '&quot;')}">
</div>`}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const code = `<script src="${window.location.origin}/vendza-pay-widget.js"></script>\n\n<div class="vendza-pay-button"\n     data-api-key="${userApiKey}"\n     data-amount="${widgetAmount}"\n     data-currency="${widgetCurrency}"\n     data-description="${widgetProductName}">\n</div>`;
                                      navigator.clipboard.writeText(code);
                                      alert("Code d'intégration copié !");
                                    }}
                                    className="w-full text-center py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded transition cursor-pointer font-semibold"
                                  >
                                    Copier le code d'intégration
                                  </button>
                                </div>

                              </div>
                            </div>

                          </div>
                        )}

                      </div>
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

// Extract Style Block from HTML
function extractStyleFromHtml(html: string): string {
  if (!html) return '';
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1].trim() : '/* Aucun bloc <style> personnalisé détecté dans ce site. Les classes Tailwind CSS sont utilisées directement. */';
}

// Inject Style Block back into HTML
function injectStyleIntoHtml(html: string, newStyle: string): string {
  if (!html) return html;
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/i;
  if (styleRegex.test(html)) {
    return html.replace(styleRegex, `<style>\n${newStyle}\n  </style>`);
  } else {
    // If not found, inject in head
    if (html.includes('</head>')) {
      return html.replace('</head>', `  <style>\n${newStyle}\n  </style>\n</head>`);
    }
  }
  return html;
}

// Extract Script Block from HTML
function extractScriptFromHtml(html: string): string {
  if (!html) return '';
  // Match longest custom script (not referencing external src)
  const scriptRegex = /<script\b(?!.*?src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let longestScript = '';
  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].length > longestScript.length) {
      longestScript = match[1];
    }
  }
  return longestScript || '/* Aucun script d\'interactivité JS personnalisé détecté. Vous pouvez en écrire ici pour animer votre site ou connecter des APIs ! */';
}

// Inject Script Block back into HTML
function injectScriptIntoHtml(html: string, newScript: string): string {
  if (!html) return html;
  const scriptRegex = /<script\b(?!.*?src=)[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(scriptRegex)];
  
  if (matches.length > 0) {
    let targetMatch = matches[0];
    let maxLen = 0;
    for (const m of matches) {
      if (m[1].length > maxLen) {
        maxLen = m[1].length;
        targetMatch = m;
      }
    }
    const fullMatchText = targetMatch[0];
    const headerEndIndex = fullMatchText.indexOf(targetMatch[1]);
    const header = headerEndIndex !== -1 ? fullMatchText.substring(0, headerEndIndex) : '<script>';
    return html.replace(fullMatchText, `${header}\n${newScript}\n  </script>`);
  } else {
    if (html.includes('</body>')) {
      return html.replace('</body>', `  <script>\n${newScript}\n  </script>\n</body>`);
    }
  }
  return html;
}

// Helper to extract image sources
function getImgSources(html: string): string[] {
  if (!html) return [];
  const sources: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1] && !sources.includes(match[1]) && !match[1].startsWith('data:image/svg+xml')) {
      sources.push(match[1]);
    }
  }
  return sources;
}
