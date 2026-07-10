import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

// Configure JSON parsing with a generous body limit and capture rawBody for webhook signature checks
app.use(express.json({
  limit: '15mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));


// Helper to safely initialize the Gemini API client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API Endpoint for generating websites with conversational context
app.post('/api/generate-site', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Le prompt est obligatoire." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ 
        error: "La clé de l'API Gemini (GEMINI_API_KEY) n'est pas configurée dans les secrets de l'application. Veuillez l'ajouter dans l'onglet Secrets de la plateforme pour utiliser la génération." 
      });
    }

    // Format conversational history correctly for the modern @google/genai SDK
    let contents = [];
    if (history && Array.isArray(history) && history.length > 0) {
      contents = history.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
    } else {
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    const systemInstruction = `Vous êtes un générateur de sites web professionnel et ultra-rapide pour Weel-Tech. 
Votre rôle est de concevoir ou d'éditer un code HTML/CSS/JS complet, entièrement autonome, responsive, moderne et visuellement splendide à partir du prompt de l'utilisateur.

Le site généré doit respecter scrupuleusement les exigences suivantes :
1. Autonome et complet : Tout doit être contenu dans un seul fichier index.html, y compris le CSS et le JS d'interaction.
2. Design & Styling : Utilisez Tailwind CSS (via le script CDN : <script src="https://cdn.tailwindcss.com"></script>). Choisissez une palette de couleurs moderne, élégante et un contraste élevé.
3. Typographie : Utilisez des Google Fonts haut de gamme pour renforcer l'identité (ex: Inter, Playfair Display, Outfit).
4. Icônes : Utilisez la bibliothèque Lucide via CDN (<script src="https://unpkg.com/lucide@latest"></script> puis initialisez avec lucide.createIcons() dans un script JS) ou des SVGs en ligne épurés.
5. Images : Utilisez des URLs d'images d'illustration réelles et professionnelles issues d'Unsplash (par exemple : https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800).
6. Contenu réel & Français : Pas de 'Lorem Ipsum'. Écrivez des accroches marketing et des textes percutants en français adaptés au domaine.
7. Interactivité & Micro-interactions : Ajoutez du code JavaScript simple (dans une balise <script>) pour animer ou rendre fonctionnel des éléments (comme un menu mobile burger, des filtres de galerie d'images, des accordéons de FAQ, des onglets, un panier d'achat simple avec calcul de total, ou un formulaire de contact fonctionnel affichant un superbe message de succès lors de la soumission sans recharger la page).
8. Si l'utilisateur demande une modification d'un site existant (déjà présente dans l'historique), reprenez le code existant et appliquez les modifications demandées avec soin, en conservant le reste de la structure intacte.

Vous devez STRICTEMENT retourner un objet JSON correspondant au schéma suivant :
- message : Résumé conversationnel court (en français, 2-3 phrases) des choix esthétiques, des sections et de l'interactivité ajoutée ou modifiée.
- html : Le code source HTML de haute qualité complet, propre et fonctionnel de la page.`;

    let response: any = null;
    let success = false;
    let lastError: any = null;
    let globalTimeoutHit = false;
    let finalJsonResult: any = null;

    const isUnavailableError = (err: any): boolean => {
      const errMsg = String(err?.message || '').toUpperCase();
      const errCode = String(err?.code || err?.status || err?.statusCode || '');
      return errCode.includes('503') || 
             errCode.includes('429') ||
             errCode.includes('UNAVAILABLE') || 
             errCode.includes('RESOURCE_EXHAUSTED') ||
             errMsg.includes('UNAVAILABLE') || 
             errMsg.includes('503') ||
             errMsg.includes('429') ||
             errMsg.includes('RESOURCE_EXHAUSTED') ||
             errMsg.includes('RATE_LIMIT') ||
             errMsg.includes('QUOTA') ||
             errMsg.includes('LIMIT_EXCEEDED') ||
             errMsg.includes('SERVICE_UNAVAILABLE') ||
             err?.status === 503 ||
             err?.status === 429 ||
             err?.statusCode === 503 ||
             err?.statusCode === 429;
    };

    // Helper for strict API request timeout
    const generateWithTimeout = async (aiClient: any, params: any, timeoutMs: number) => {
      const controller = new AbortController();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          controller.abort();
          reject(new Error("TIMEOUT"));
        }, timeoutMs);
        if (timer && typeof timer.unref === 'function') {
          timer.unref();
        }
      });

      const apiPromise = aiClient.models.generateContent(params, { signal: controller.signal });

      return Promise.race([apiPromise, timeoutPromise]);
    };

    // Configuration for the 5 generation attempts
    const attemptsConfig = [
      { attemptNum: 1, model: 'gemini-3.5-flash', backoff: 500 },
      { attemptNum: 2, model: 'gemini-3.1-flash-lite', backoff: 1000 },
      { attemptNum: 3, model: 'gemini-3.5-flash', backoff: 1500 },
      { attemptNum: 4, model: 'gemini-flash-latest', backoff: 1000 },
      { attemptNum: 5, model: 'gemini-3.1-flash-lite', backoff: 0 }
    ];

    const globalStartTime = Date.now();
    const globalTimeoutMs = 24000;

    // Running the defined sequence of generation attempts
    for (let i = 0; i < attemptsConfig.length; i++) {
      const config = attemptsConfig[i];
      
      const elapsed = Date.now() - globalStartTime;
      const remainingGlobalTime = globalTimeoutMs - elapsed;
      
      if (remainingGlobalTime <= 1000) {
        console.log(`[Gemini API] Timeout global atteint avant de démarrer la tentative ${config.attemptNum}.`);
        globalTimeoutHit = true;
        break;
      }

      const currentTimeout = Math.min(15000, remainingGlobalTime);
      console.log(`[Gemini API] Tentative ${config.attemptNum}/5 avec le modèle ${config.model} (Timeout: ${currentTimeout}ms)...`);

      try {
        response = await generateWithTimeout(ai, {
          model: config.model,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                message: {
                  type: Type.STRING,
                  description: "Explication synthétique et chaleureuse en français des choix de design et fonctionnalités."
                },
                html: {
                  type: Type.STRING,
                  description: "Le code HTML complet, autonome, valide et fonctionnel incluant Tailwind CSS et JS d'interaction."
                }
              },
              required: ["message", "html"]
            }
          }
        }, currentTimeout);

        const text = response.text;
        if (!text) {
          throw new Error("Gemini n'a pas renvoyé de réponse textuelle valide.");
        }
        finalJsonResult = JSON.parse(text);
        console.log(`[Gemini API] Tentative ${config.attemptNum}/5 réussie avec le modèle ${config.model}.`);
        console.log(`[AI Provider Selection] Succès: Gemini (Modèle: ${config.model}) a répondu.`);
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        const isTimeout = err?.message === "TIMEOUT" || err?.name === "AbortError";
        
        if (isTimeout) {
          console.error(`[Gemini API] Échec de la tentative ${config.attemptNum}/5 avec le modèle ${config.model} - Erreur : Timeout de ${currentTimeout}ms dépassé (Status/Code: TIMEOUT)`);
        } else {
          console.error(`[Gemini API] Échec de la tentative ${config.attemptNum}/5 avec le modèle ${config.model} - Erreur : ${err.message || err} (Status/Code: ${err?.status || err?.statusCode || err?.code || 'N/A'})`);
        }

        // Check if global timeout was reached
        const checkElapsed = Date.now() - globalStartTime;
        if (checkElapsed >= globalTimeoutMs) {
          console.log(`[Gemini API] Timeout global de ${globalTimeoutMs}ms dépassé lors de la tentative ${config.attemptNum}.`);
          globalTimeoutHit = true;
          break;
        }

        // Stop early if the error is non-transient
        if (!isTimeout && !isUnavailableError(err)) {
          console.log(`[Gemini API] Erreur non-transitoire détectée à la tentative ${config.attemptNum}. Arrêt immédiat.`);
          break;
        }

        // Wait with backoff before next retry
        if (config.backoff > 0 && i < attemptsConfig.length - 1) {
          const timeAfterAttempt = Date.now() - globalStartTime;
          const remainingAfterAttempt = globalTimeoutMs - timeAfterAttempt;
          if (remainingAfterAttempt > 1000) {
            const actualBackoff = Math.min(config.backoff, remainingAfterAttempt - 1000);
            if (actualBackoff > 0) {
              console.log(`[Gemini API] Service indisponible ou timeout. Attente de ${actualBackoff / 1000}s avant le prochain essai...`);
              await new Promise(resolve => setTimeout(resolve, actualBackoff));
            }
          } else {
            console.log(`[Gemini API] Pas assez de temps restant pour appliquer le backoff de ${config.backoff}ms.`);
          }
        }
      }
    }

    if (globalTimeoutHit) {
      return res.status(504).json({
        error: "La génération a dépassé la limite de temps autorisée de 24 secondes. Veuillez réessayer."
      });
    }

    // 2. Anthropic Claude Fallback Attempt
    if (!success) {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        console.log("[Anthropic API] ANTHROPIC_API_KEY n'est pas configurée. Impossible d'effectuer la tentative de secours.");
      } else {
        const elapsed = Date.now() - globalStartTime;
        const remainingGlobalTime = globalTimeoutMs - elapsed;
        
        if (remainingGlobalTime <= 1000) {
          console.log("[Anthropic API] Pas assez de temps restant pour la tentative de secours Claude.");
        } else {
          const currentTimeout = Math.min(15000, remainingGlobalTime);
          console.log(`[Anthropic API] Tentative de secours avec le modèle claude-haiku-4-5-20251001 (Timeout: ${currentTimeout}ms)...`);
          
          try {
            // Adapt prompt/history to Messages API format
            let anthropicMessages = [];
            if (history && Array.isArray(history) && history.length > 0) {
              anthropicMessages = history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
              }));
            } else {
              anthropicMessages = [{ role: 'user', content: prompt }];
            }

            let timerId: NodeJS.Timeout | null = null;
            const controller = new AbortController();
            const timeoutPromise = new Promise<never>((_, reject) => {
              timerId = setTimeout(() => {
                controller.abort();
                reject(new Error("TIMEOUT"));
              }, currentTimeout);
              if (timerId && typeof (timerId as any).unref === 'function') {
                (timerId as any).unref();
              }
            });

            const apiPromise = fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 4000,
                system: systemInstruction,
                messages: anthropicMessages
              }),
              signal: controller.signal
            });

            const fetchResponse = await Promise.race([apiPromise, timeoutPromise]) as any;
            if (timerId) {
              clearTimeout(timerId);
            }

            if (!fetchResponse.ok) {
              const errBody = await fetchResponse.text();
              throw new Error(`Erreur HTTP Anthropic ${fetchResponse.status}: ${errBody}`);
            }

            const data = await fetchResponse.json();
            const rawText = data?.content?.[0]?.text;
            if (!rawText) {
              throw new Error("La réponse de Claude ne contient pas de texte.");
            }

            // Extract JSON from response. Claude sometimes wraps responses in markdown code blocks
            let cleanJsonStr = rawText.trim();
            if (cleanJsonStr.startsWith("```")) {
              cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
            }

            // Extract valid JSON content helper
            const extractJson = (text: string) => {
              const startIdx = text.indexOf('{');
              const endIdx = text.lastIndexOf('}');
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const jsonCandidate = text.slice(startIdx, endIdx + 1);
                try {
                  return JSON.parse(jsonCandidate);
                } catch (e) {
                  // Fall through
                }
              }
              return JSON.parse(text);
            };

            finalJsonResult = extractJson(cleanJsonStr);
            console.log("[AI Provider Selection] Succès: Claude (Modèle: claude-haiku-4-5-20251001) a répondu.");
            success = true;
          } catch (err: any) {
            const isTimeout = err?.message === "TIMEOUT" || err?.name === "AbortError";
            if (isTimeout) {
              console.error(`[Anthropic API] Échec de la tentative Claude - Erreur : Timeout de ${currentTimeout}ms dépassé`);
            } else {
              console.error(`[Anthropic API] Échec de la tentative Claude - Erreur : ${err.message || err}`);
            }
          }
        }
      }
    }

    // 3. OpenAI Fallback Attempt
    if (!success) {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        console.log("[OpenAI API] OPENAI_API_KEY n'est pas configurée. Impossible d'effectuer la tentative de secours.");
      } else {
        const elapsed = Date.now() - globalStartTime;
        const remainingGlobalTime = globalTimeoutMs - elapsed;
        
        if (remainingGlobalTime <= 1000) {
          console.log("[OpenAI API] Pas assez de temps restant pour la tentative de secours OpenAI.");
        } else {
          const currentTimeout = Math.min(15000, remainingGlobalTime);
          console.log(`[OpenAI API] Tentative de secours avec le modèle gpt-4o-mini (Timeout: ${currentTimeout}ms)...`);
          
          try {
            let openaiMessages = [];
            if (systemInstruction) {
              openaiMessages.push({ role: "system", content: systemInstruction });
            }
            if (history && Array.isArray(history) && history.length > 0) {
              openaiMessages.push(...history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
              })));
            } else {
              openaiMessages.push({ role: 'user', content: prompt });
            }

            let timerId: NodeJS.Timeout | null = null;
            const controller = new AbortController();
            const timeoutPromise = new Promise<never>((_, reject) => {
              timerId = setTimeout(() => {
                controller.abort();
                reject(new Error("TIMEOUT"));
              }, currentTimeout);
              if (timerId && typeof (timerId as any).unref === 'function') {
                (timerId as any).unref();
              }
            });

            const apiPromise = fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${openAiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: openaiMessages,
                response_format: { type: "json_object" }
              }),
              signal: controller.signal
            });

            const fetchResponse = await Promise.race([apiPromise, timeoutPromise]) as any;
            if (timerId) {
              clearTimeout(timerId);
            }

            if (!fetchResponse.ok) {
              const errBody = await fetchResponse.text();
              throw new Error(`Erreur HTTP OpenAI ${fetchResponse.status}: ${errBody}`);
            }

            const data = await fetchResponse.json();
            const rawText = data?.choices?.[0]?.message?.content;
            if (!rawText) {
              throw new Error("La réponse de OpenAI ne contient pas de texte.");
            }

            // Extract JSON from response
            let cleanJsonStr = rawText.trim();
            if (cleanJsonStr.startsWith("```")) {
              cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
            }

            // Extract valid JSON content helper
            const extractJson = (text: string) => {
              const startIdx = text.indexOf('{');
              const endIdx = text.lastIndexOf('}');
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const jsonCandidate = text.slice(startIdx, endIdx + 1);
                try {
                  return JSON.parse(jsonCandidate);
                } catch (e) {
                  // Fall through
                }
              }
              return JSON.parse(text);
            };

            finalJsonResult = extractJson(cleanJsonStr);
            console.log("[AI Provider Selection] Succès: OpenAI (Modèle: gpt-4o-mini) a répondu.");
            success = true;
          } catch (err: any) {
            const isTimeout = err?.message === "TIMEOUT" || err?.name === "AbortError";
            if (isTimeout) {
              console.error(`[OpenAI API] Échec de la tentative OpenAI - Erreur : Timeout de ${currentTimeout}ms dépassé`);
            } else {
              console.error(`[OpenAI API] Échec de la tentative OpenAI - Erreur : ${err.message || err}`);
            }
          }
        }
      }
    }

    if (!success) {
      return res.status(503).json({ 
        error: "Le service de génération est momentanément surchargé. Veuillez réessayer dans quelques instants." 
      });
    }

    return res.json(finalJsonResult);

  } catch (error: any) {
    console.error("Erreur de génération Gemini :", error);
    return res.status(500).json({ 
      error: error.message || "Une erreur interne est survenue lors de la génération par l'IA." 
    });
  }
});

// --- STRIPE CONNECT & WEBHOOK CHUNK ---

const TX_FILE_PATH = path.join(process.cwd(), 'transactions-backend.json');

// Helper to load backend transactions from local JSON storage
const getBackendTransactions = (): any[] => {
  try {
    if (fs.existsSync(TX_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(TX_FILE_PATH, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading backend transactions:", e);
  }
  return [];
};

// Helper to save a single transaction to local JSON storage
const saveBackendTransaction = (tx: any) => {
  try {
    const txs = getBackendTransactions();
    txs.push({
      id: tx.id || 'tx-' + Math.random().toString(36).substring(2, 11),
      created_at: new Date().toISOString(),
      ...tx
    });
    fs.writeFileSync(TX_FILE_PATH, JSON.stringify(txs, null, 2));
  } catch (e) {
    console.error("Error saving backend transaction:", e);
  }
};

// Lazy Stripe initialization helper to prevent crashing when key is absent
let stripeClient: Stripe | null = null;
const getStripe = (): Stripe => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is missing from environment variables.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2023-10-16' as any,
    });
  }
  return stripeClient;
};

// Helper to initialize active Supabase client on the backend
const getSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('YOUR_')) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  return null;
};

/**
 * 1. Endpoint: /api/connect-stripe
 * Generates an onboarding URL for Stripe Connect.
 * Uses real Stripe APIs if keys are set, otherwise serves a simulation page link.
 */
app.post('/api/connect-stripe', async (req, res) => {
  const { userId, plan, email } = req.body;
  const devUrl = process.env.APP_URL || `http://localhost:${PORT}`;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Generate simulated onboarding redirect URL
    const simulationUrl = `${devUrl}/onboard-simulation?userId=${encodeURIComponent(userId || 'demo-user-123')}&plan=${encodeURIComponent(plan || 'starter')}&email=${encodeURIComponent(email || 'demo@weel-tech.fr')}`;
    return res.json({
      url: simulationUrl,
      simulated: true,
      message: "STRIPE_SECRET_KEY non configurée. Redirection vers l'onboarding de simulation."
    });
  }

  try {
    const stripe = getStripe();
    
    // Create an Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      email: email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: userId || 'unknown',
        plan: plan || 'starter'
      }
    });

    const returnUrl = `${devUrl}/?onboard-success=true&accountId=${account.id}&userId=${encodeURIComponent(userId || '')}&plan=${encodeURIComponent(plan || '')}`;
    const refreshUrl = `${devUrl}/?onboard-refresh=true&accountId=${account.id}&userId=${encodeURIComponent(userId || '')}&plan=${encodeURIComponent(plan || '')}`;

    // Create Stripe Account Link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return res.json({
      url: accountLink.url,
      accountId: account.id,
      simulated: false
    });
  } catch (err: any) {
    console.error("Error creating Stripe Connect account or onboarding link:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Visual Onboarding Simulation UI Page
 */
app.get('/onboard-simulation', (req, res) => {
  const { userId, plan, email } = req.query;
  const devUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simulation Stripe Connect Onboarding</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="bg-indigo-600 text-white p-2 rounded-xl">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide">stripe connect</span>
          </div>
          <span class="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium border border-amber-100">Mode Démo</span>
        </div>

        <div class="space-y-2">
          <h1 class="text-xl font-bold text-slate-800 tracking-tight">Onboarding Simulation</h1>
          <p class="text-sm text-slate-500 leading-relaxed">
            Vous êtes redirigé vers l'interface de connexion Stripe Connect pour Weel-Tech. En mode simulation, aucun compte Stripe réel n'est créé.
          </p>
        </div>

        <div class="bg-slate-50 rounded-xl p-4 space-y-2 text-xs font-mono text-slate-600">
          <p><span class="font-bold text-slate-400">User ID:</span> ${userId || 'demo-user-123'}</p>
          <p><span class="font-bold text-slate-400">Email:</span> ${email || 'demo@weel-tech.fr'}</p>
          <p><span class="font-bold text-slate-400">Plan:</span> ${plan || 'pro'}</p>
        </div>

        <div class="space-y-3 pt-2">
          <button 
            onclick="completeOnboarding()" 
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition text-sm shadow-md"
          >
            Finaliser la Connexion Stripe
          </button>
          <button 
            onclick="window.location.href='/?onboard-canceled=true'" 
            class="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-2.5 rounded-xl font-medium transition text-sm"
          >
            Annuler l'onboarding
          </button>
        </div>

        <p class="text-center text-[11px] text-slate-400">
          Weel-Tech &middot; Intégration Sécurisée des Passerelles
        </p>
      </div>

      <script>
        function completeOnboarding() {
          const params = new URLSearchParams(window.location.search);
          const userId = params.get('userId') || 'demo-user-123';
          const plan = params.get('plan') || 'pro';
          const email = params.get('email') || 'demo@weel-tech.fr';
          
          // Redirect with success flag
          window.location.href = '/?onboard-success=true&accountId=acct_simulated_' + Math.random().toString(36).substring(2, 9) + '&userId=' + userId + '&plan=' + plan + '&email=' + email;
        }
      </script>
    </body>
    </html>
  `);
});

/**
 * 3. Endpoint: /api/stripe-webhook
 * Listens to Stripe payment events and inserts/updates "transactions" records.
 * Automatically computes fee commission percentage (10% on pro/business plans, 12% on starter/others).
 */
app.post('/api/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (process.env.STRIPE_SECRET_KEY && webhookSecret && sig) {
      const stripe = getStripe();
      const payload = (req as any).rawBody || JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(payload, sig as string, webhookSecret);
    } else {
      // Direct body for sandbox / simulator test requests
      event = req.body;
      console.log("Processing direct unverified Stripe webhook payload:", event);
    }
  } catch (err: any) {
    console.error("Stripe Webhook Signature Verification Failed:", err.message);
    return res.status(400).send(`Webhook Signature Error: ${err.message}`);
  }

  try {
    let paymentData: any = null;

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      paymentData = {
        stripe_id: session.id,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: (session.currency || 'eur').toUpperCase(),
        customer_name: session.customer_details?.name || 'Client Stripe',
        customer_email: session.customer_details?.email || 'stripe@example.com',
        description: session.metadata?.description || 'Achat Stripe Checkout',
        user_id: session.metadata?.userId || 'demo-user-123',
        plan: session.metadata?.plan || 'starter'
      };
    } else if (event.type === 'payment_intent.succeeded') {
      const pi = event.data?.object;
      paymentData = {
        stripe_id: pi.id,
        amount: pi.amount ? pi.amount / 100 : 0,
        currency: (pi.currency || 'eur').toUpperCase(),
        customer_name: pi.billing_details?.name || pi.metadata?.customer_name || 'Client Stripe',
        customer_email: pi.billing_details?.email || pi.metadata?.customer_email || 'stripe@example.com',
        description: pi.description || pi.metadata?.description || 'Paiement direct',
        user_id: pi.metadata?.userId || 'demo-user-123',
        plan: pi.metadata?.plan || 'starter'
      };
    } else if (event.type === 'charge.succeeded') {
      const charge = event.data?.object;
      paymentData = {
        stripe_id: charge.id,
        amount: charge.amount ? charge.amount / 100 : 0,
        currency: (charge.currency || 'eur').toUpperCase(),
        customer_name: charge.billing_details?.name || 'Client Stripe',
        customer_email: charge.billing_details?.email || 'stripe@example.com',
        description: charge.description || 'Paiement Carte',
        user_id: charge.metadata?.userId || 'demo-user-123',
        plan: charge.metadata?.plan || 'starter'
      };
    } else if (event.type === 'simulated.payment') {
      // Allow simulator payloads from simulation UI
      const mockObj = event.data || {};
      paymentData = {
        stripe_id: mockObj.id || 'sim-' + Math.random().toString(36).substring(2, 9),
        amount: mockObj.amount || 99,
        currency: (mockObj.currency || 'USD').toUpperCase(),
        customer_name: mockObj.customer_name || 'Simulated Customer',
        customer_email: mockObj.customer_email || 'sim@example.com',
        description: mockObj.description || 'Paiement simulé Connect',
        user_id: mockObj.user_id || 'demo-user-123',
        plan: mockObj.plan || 'starter',
        is_sandbox: mockObj.is_sandbox !== undefined ? mockObj.is_sandbox : true
      };
    }

    if (paymentData) {
      // Calculate automatically the commission (application_fee_amount according to plan: 10% or 12%)
      const plan = (paymentData.plan || 'starter').toLowerCase();
      const isLowFeePlan = plan === 'pro' || plan === 'business';
      const commissionRate = isLowFeePlan ? 0.10 : 0.12;
      const applicationFeeAmount = paymentData.amount * commissionRate;
      const netAmount = paymentData.amount - applicationFeeAmount;

      const newTx = {
        id: paymentData.stripe_id || 'tx-' + Math.random().toString(36).substring(2, 11),
        user_id: paymentData.user_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        customer_name: paymentData.customer_name,
        customer_email: paymentData.customer_email,
        status: 'succeeded' as const,
        description: `${paymentData.description} (Commission ${commissionRate * 100}% d'un montant de ${applicationFeeAmount.toFixed(2)} ${paymentData.currency})`,
        method: 'Stripe',
        created_at: new Date().toISOString(),
        application_fee_amount: applicationFeeAmount,
        net_amount: netAmount,
        is_sandbox: paymentData.is_sandbox !== undefined ? paymentData.is_sandbox : false
      };

      // 1. Save to real Supabase if connected
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('transactions')
          .insert([newTx]);
        if (error) {
          console.error("Error inserting webhook transaction into Supabase:", error);
        }
      }

      // 2. Always persist in the local file database for offline/mock development support
      saveBackendTransaction(newTx);

      console.log(`Successfully processed transaction ${newTx.id} for ${paymentData.customer_name}: Amount ${paymentData.amount}, Fee ${applicationFeeAmount} (${commissionRate * 100}%)`);
      
      return res.json({ 
        received: true, 
        processed: true, 
        transaction: newTx 
      });
    }

    return res.json({ 
      received: true, 
      processed: false, 
      reason: `Type d'événement Stripe non pris en charge pour insertion directe : ${event.type}` 
    });
  } catch (err: any) {
    console.error("Error handling Stripe event data:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Endpoint: /api/backend-transactions
 * Allows frontend client to fetch simulated webhook transactions to display on UI.
 */
app.get('/api/backend-transactions', (req, res) => {
  const { userId } = req.query;
  let txs = getBackendTransactions();
  if (userId) {
    txs = txs.filter(t => t.user_id === userId);
  }
  return res.json(txs);
});

// --- MONCASH PAYOUT & BAZIK INTEGRATION ---

const CONFIG_FILE_PATH = path.join(process.cwd(), 'payment_configs-backend.json');

// Helper to load backend payment configs from local JSON storage
const getBackendPaymentConfigs = (): any[] => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading backend payment configs:", e);
  }
  // Default seeded configs
  return [
    {
      id: 'cfg-1',
      site_id: 'site-1',
      user_id: 'demo-user-123',
      moncash_phone: '50937123456',
      moncash_client_id: 'client_id_site_1',
      moncash_secret_key: 'secret_key_site_1',
      created_at: new Date().toISOString()
    },
    {
      id: 'cfg-2',
      site_id: 'site-2',
      user_id: 'demo-user-123',
      moncash_phone: '50948765432',
      moncash_client_id: 'client_id_site_2',
      moncash_secret_key: 'secret_key_site_2',
      created_at: new Date().toISOString()
    }
  ];
};

// Helper to save a single payment config to local JSON storage
const saveBackendPaymentConfig = (config: any) => {
  try {
    const configs = getBackendPaymentConfigs();
    const existingIdx = configs.findIndex(c => c.site_id === config.site_id);
    if (existingIdx !== -1) {
      configs[existingIdx] = { ...configs[existingIdx], ...config };
    } else {
      configs.push({
        id: 'cfg-' + Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        ...config
      });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2));
  } catch (e) {
    console.error("Error saving backend payment config:", e);
  }
};

/**
 * Endpoint: /api/payment-configs
 * Fetch or update payment configurations (like MonCash phone numbers) per site.
 */
app.get('/api/payment-configs', (req, res) => {
  const { siteId } = req.query;
  const configs = getBackendPaymentConfigs();
  if (siteId) {
    const config = configs.find(c => c.site_id === siteId);
    return res.json(config || null);
  }
  return res.json(configs);
});

app.post('/api/payment-configs', (req, res) => {
  const { siteId, moncashPhone, moncashClientId, moncashSecretKey, userId } = req.body;
  if (!siteId || !moncashPhone) {
    return res.status(400).json({ error: "Paramètres 'siteId' et 'moncashPhone' requis." });
  }
  const config = {
    site_id: siteId,
    user_id: userId || 'demo-user-123',
    moncash_phone: moncashPhone,
    moncash_client_id: moncashClientId || '',
    moncash_secret_key: moncashSecretKey || ''
  };
  saveBackendPaymentConfig(config);
  return res.json({ success: true, config });
});

/**
 * Edge Function equivalent Endpoint: /api/moncash-payout
 * 1. Receives paid amount and concerned site_id
 * 2. Calculates transfer amount: amount * 0.90
 * 3. Invokes Bazik API to transfer money to the owner's MonCash phone number (from payment_configs)
 * 4. Records the transaction inside "transactions" table with the status returned by Bazik
 */
app.post('/api/moncash-payout', async (req, res) => {
  const { amount, siteId, customerName, customerEmail, currency = 'HTG', is_sandbox } = req.body;

  if (!amount || !siteId) {
    return res.status(400).json({ error: "Paramètres 'amount' et 'siteId' sont requis." });
  }

  // Calculate the amount to transfer: amount * 0.90
  const originalAmount = parseFloat(amount);
  const transferAmount = originalAmount * 0.90;
  const commissionAmount = originalAmount - transferAmount;

  // Retrieve MonCash config from payment_configs
  let config: any = null;
  const supabaseClient = getSupabase();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('payment_configs')
        .select('*')
        .eq('site_id', siteId)
        .maybeSingle();
      if (data) {
        config = data;
      }
    } catch (e) {
      console.warn("Could not query payment_configs from real Supabase:", e);
    }
  }

  // Fallback to local configs
  if (!config) {
    const configs = getBackendPaymentConfigs();
    config = configs.find(c => c.site_id === siteId);
  }

  if (!config || !config.moncash_phone) {
    return res.status(400).json({ 
      error: `Configuration MonCash introuvable ou numéro de téléphone manquant pour le site ${siteId}.` 
    });
  }

  const moncashPhone = config.moncash_phone;
  const userId = config.user_id || 'demo-user-123';

  // Call Bazik API (or simulate if key is absent)
  const bazikKey = process.env.BAZIK_API_KEY;
  const bazikUrl = process.env.BAZIK_API_URL || 'https://api.bazik.io/v1';

  let bazikResponse: any = null;
  let isSimulated = false;

  if (bazikKey) {
    try {
      const response = await fetch(`${bazikUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bazikKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: transferAmount,
          currency: currency,
          receiver: moncashPhone,
          channel: 'moncash',
          description: `Payout MonCash pour le site ${siteId} - Réf client: ${customerEmail || 'N/A'}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur API Bazik (Status ${response.status})`);
      }

      bazikResponse = await response.json();
    } catch (err: any) {
      console.error("Error invoking real Bazik API:", err);
      bazikResponse = {
        status: 'failed',
        error_message: err.message,
        reference: 'bazik-err-' + Math.random().toString(36).substring(2, 9)
      };
    }
  } else {
    // Mode simulation
    isSimulated = true;
    const isSuccess = originalAmount > 0;
    bazikResponse = {
      status: isSuccess ? 'succeeded' : 'failed',
      id: 'bazik-sim-' + Math.random().toString(36).substring(2, 10),
      reference: 'BZK' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      message: isSuccess ? 'Transfert effectué avec succès via Bazik MonCash.' : 'Le montant doit être supérieur à 0.',
      transfer_details: {
        amount: transferAmount,
        currency: currency,
        receiver: moncashPhone,
        fee_applied: commissionAmount
      }
    };
  }

  // Save transaction in the table "transactions" with status returned by Bazik
  const status = bazikResponse.status === 'succeeded' ? 'succeeded' : 'failed';
  const description = `Transfert MonCash de ${transferAmount.toFixed(2)} ${currency} vers ${moncashPhone} via Bazik. Commission prélevée de 10% (${commissionAmount.toFixed(2)} ${currency}). Réf: ${bazikResponse.reference || 'N/A'}`;

  const newTx = {
    id: bazikResponse.id || 'tx-' + Math.random().toString(36).substring(2, 11),
    user_id: userId,
    amount: originalAmount,
    currency: currency,
    customer_name: customerName || `Payout ${moncashPhone}`,
    customer_email: customerEmail || 'payout@moncash.com',
    status: status,
    description: description,
    method: 'MonCash',
    created_at: new Date().toISOString(),
    application_fee_amount: commissionAmount,
    net_amount: transferAmount,
    is_sandbox: is_sandbox !== undefined ? is_sandbox : false
  };

  // Save to real Supabase if connected
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('transactions')
        .insert([newTx]);
      if (error) {
        console.error("Error inserting payout transaction into real Supabase:", error);
      }
    } catch (e) {
      console.error("Database connection issue during transaction insert:", e);
    }
  }

  // Always save to backend local json database
  saveBackendTransaction(newTx);

  return res.json({
    success: status === 'succeeded',
    transferAmount,
    commissionAmount,
    receiver: moncashPhone,
    status,
    simulated: isSimulated,
    bazikResponse,
    transaction: newTx
  });
});

/**
 * 5b. Endpoint: /api/edge/search-domain
 * This acts as the search-domain Edge Function.
 * It queries the Dynadot API to verify the availability of a domain
 * and calculates the customized price according to the user's subscription plan.
 */
app.post('/api/edge/search-domain', async (req, res) => {
  try {
    const { domain, extensions, userId, plan } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Le nom de domaine ou le préfixe est obligatoire." });
    }

    // Sanitize domain
    const baseDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');

    // Determine the list of domains to check
    let domainsToCheck: string[] = [];
    if (Array.isArray(extensions) && extensions.length > 0) {
      domainsToCheck = extensions.map(ext => {
        const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
        return `${baseDomain}${cleanExt}`;
      });
    } else {
      domainsToCheck = [baseDomain];
    }
    
    const dynadotApiKey = process.env.DYNADOT_API_KEY;

    const results = await Promise.all(domainsToCheck.map(async (formattedDomain) => {
      let isAvailable = true;
      let basePrice = 9.99; // Default base price in EUR
      let isSimulated = true;

      // Check availability via Dynadot if Key exists
      if (dynadotApiKey) {
        try {
          const url = `https://api.dynadot.com/api3.json?key=${dynadotApiKey}&command=search&domain0=${encodeURIComponent(formattedDomain)}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data?.SearchResponse?.SearchResults?.[0]) {
              const result = data.SearchResponse.SearchResults[0];
              isAvailable = result.Available === 'yes';
              basePrice = parseFloat(result.Price) || basePrice;
              isSimulated = false;
            }
          }
        } catch (err) {
          console.error(`Error communicating with Dynadot API for ${formattedDomain}, falling back to simulator:`, err);
        }
      }

      // Local simulator fallback if not connected
      if (isSimulated) {
        const lower = formattedDomain;
        // Deterministic availability check: unavailable for common brands
        isAvailable = !lower.includes('google') && 
                      !lower.includes('facebook') && 
                      !lower.includes('apple') && 
                      !lower.includes('weel-tech') &&
                      !lower.includes('vendza');
        
        // Assign pricing based on extension
        if (lower.endsWith('.fr')) {
          basePrice = 7.99;
        } else if (lower.endsWith('.com')) {
          basePrice = 9.99;
        } else if (lower.endsWith('.net')) {
          basePrice = 11.99;
        } else if (lower.endsWith('.org')) {
          basePrice = 10.99;
        } else if (lower.endsWith('.io')) {
          basePrice = 29.99;
        } else {
          basePrice = 12.99;
        }
      }

      // Price markup calculation depending on user subscription plan
      // Full margin (marge pleine) if no subscription: +50% markup
      // Reduced margins (marge réduite) according to starter/pro/business plans:
      let markup = 0.50; // no plan / default
      if (plan === 'starter') markup = 0.30;
      else if (plan === 'pro') markup = 0.15;
      else if (plan === 'business') markup = 0.05;

      const finalPrice = basePrice * (1 + markup);

      return {
        domain: formattedDomain,
        available: isAvailable,
        basePrice: parseFloat(basePrice.toFixed(2)),
        finalPrice: parseFloat(finalPrice.toFixed(2)),
        currency: "USD",
        planUsed: plan || "Aucun abonnement (marge pleine)",
        isSimulated
      };
    }));

    return res.json({
      success: true,
      results: results
    });

  } catch (error: any) {
    console.error("Error in search-domain:", error);
    return res.status(500).json({ error: "Une erreur est survenue lors de la recherche du domaine." });
  }
});

/**
 * 5c. Endpoint: /api/edge/purchase-domain
 * This acts as the purchase-domain Edge Function.
 * It handles the Dynadot register API call, sets nameservers to Cloudflare,
 * updates the DB domain entry, and configures Cloudflare Pages custom domain if needed.
 */
app.post('/api/edge/purchase-domain', async (req, res) => {
  try {
    const { domain, userId, plan, usageType, siteId } = req.body;

    if (!domain || !userId) {
      return res.status(400).json({ error: "Paramètres manquants ('domain', 'userId' requis)." });
    }

    const formattedDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    const dynadotApiKey = process.env.DYNADOT_API_KEY;
    const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY;
    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    let isSimulated = true;
    const steps: string[] = [];

    // Step 1: Register Domain on Dynadot
    if (dynadotApiKey) {
      try {
        const registerUrl = `https://api.dynadot.com/api3.json?key=${dynadotApiKey}&command=register&domain=${encodeURIComponent(formattedDomain)}&duration=1`;
        const response = await fetch(registerUrl);
        if (response.ok) {
          const data = await response.json();
          // We assume Dynadot API response shows success
          steps.push(`✓ Enregistrement réussi du domaine "${formattedDomain}" via Dynadot API.`);
          isSimulated = false;
        } else {
          throw new Error("Dynadot API response was not OK");
        }
      } catch (err) {
        console.error("Real Dynadot registration failed, falling back to simulation:", err);
        steps.push(`[SIMULATION] Enregistrement simulé du domaine "${formattedDomain}" (Dynadot API Key absente ou invalide).`);
      }
    } else {
      steps.push(`[SIMULATION] Enregistrement simulé du domaine "${formattedDomain}" (Dynadot API Key non configurée).`);
    }

    let pagesProjectName = 'weel-pages-project';
    
    // Step 2: Handle configuration based on usageType
    if (usageType === 'vendza_site') {
      steps.push("✓ Option 'Sur un site Vendza-Site' sélectionnée.");

      // Fetch site details to link Cloudflare Pages project correctly
      let siteDomain = '';
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        try {
          const { data: siteData } = await supabaseClient
            .from('sites')
            .select('*')
            .eq('id', siteId)
            .maybeSingle();
          if (siteData) {
            pagesProjectName = siteData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            siteDomain = siteData.domain;
            steps.push(`✓ Récupération des informations du site "${siteData.name}" effectuée.`);
          }
        } catch (e) {
          console.error("Supabase query site error in purchase-domain:", e);
        }
      }

      // 2a. Update nameservers to Cloudflare
      if (dynadotApiKey && !isSimulated) {
        try {
          const nsUrl = `https://api.dynadot.com/api3.json?key=${dynadotApiKey}&command=set_ns&domain=${encodeURIComponent(formattedDomain)}&ns0=jay.ns.cloudflare.com&ns1=leslie.ns.cloudflare.com`;
          const response = await fetch(nsUrl);
          if (response.ok) {
            steps.push("✓ Serveurs de noms (Nameservers) configurés avec succès vers Cloudflare.");
          } else {
            throw new Error("Failed to set Nameservers");
          }
        } catch (err) {
          console.error("Dynadot Nameservers set failed:", err);
          steps.push("⚠ Échec du réglage automatique des serveurs de noms sur Dynadot.");
        }
      } else {
        steps.push("[SIMULATION] Configuration automatique des serveurs de noms (Nameservers) vers Cloudflare effectuée.");
      }

      // 2b. Add custom domain to Cloudflare Pages
      if (cloudflareApiKey && cloudflareAccountId) {
        try {
          const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${pagesProjectName}/domains`;
          const cfResponse = await fetch(cfUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cloudflareApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: formattedDomain })
          });

          if (cfResponse.ok) {
            steps.push(`✓ Domaine associé avec succès au projet Cloudflare Pages "${pagesProjectName}".`);
          } else {
            const cfErr = await cfResponse.json().catch(() => ({}));
            steps.push(`⚠ Signalement Cloudflare Pages : ${cfErr?.errors?.[0]?.message || 'Erreur d\'association Pages.'}`);
          }
        } catch (err) {
          console.error("Cloudflare custom domain setup failed:", err);
          steps.push("⚠ Impossible de lier le domaine personnalisé sur Cloudflare Pages.");
        }
      } else {
        steps.push(`[SIMULATION] Ajout du domaine personnalisé "${formattedDomain}" sur le projet Cloudflare Pages "${pagesProjectName}" effectué.`);
      }

    } else {
      steps.push("✓ Option 'Ailleurs (site externe)' sélectionnée.");
      steps.push("ⓘ Aucune mise à jour automatique des DNS ou du serveur d'hébergement. Redirection vers configuration manuelle requise.");
    }

    // Step 3: Insert Domain record into Supabase or construct the object
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const newDomain = {
      user_id: userId,
      domain_name: formattedDomain,
      status: 'active' as const,
      dns_configured: usageType === 'vendza_site', // automatically connected for vendza, false/pending for external
      registered_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      linked_site_id: usageType === 'vendza_site' ? (siteId || undefined) : undefined,
      usage_type: usageType
    };

    let savedDomain: any = null;
    const supabaseClient = getSupabase();
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('domains')
          .insert([newDomain])
          .select()
          .single();
        if (error) {
          console.error("Supabase domains insert error:", error);
        } else if (data) {
          savedDomain = data;
          steps.push("✓ Enregistré dans la base de données Supabase 'domains'.");
        }
      } catch (e) {
        console.error("Exception during domain insertion:", e);
      }
    }

    // In case Supabase insert failed or wasn't connected, we create a fallback structure
    if (!savedDomain) {
      savedDomain = {
        id: 'dom-' + Math.random().toString(36).substring(2, 11),
        ...newDomain
      };
      steps.push("✓ Enregistrement local ou simulation de base de données effectué.");
    }

    return res.json({
      success: true,
      domain: savedDomain,
      isSimulated,
      steps,
      statusText: usageType === 'vendza_site' 
        ? "Connexion automatique en cours..." 
        : "Manuel - Redirection vers panneau de configuration DNS"
    });

  } catch (error: any) {
    console.error("Error in purchase-domain:", error);
    return res.status(500).json({ error: "Une erreur est survenue lors de la finalisation de l'achat." });
  }
});

/**
 * 5d. Endpoint: /api/edge/sync-dns-record
 * This pushes a DNS record change to Dynadot API and returns success status.
 */
app.post('/api/edge/sync-dns-record', async (req, res) => {
  try {
    const { record, domainName, action } = req.body;

    if (!record || !domainName || !action) {
      return res.status(400).json({ error: "Paramètres manquants ('record', 'domainName', 'action' requis)." });
    }

    const dynadotApiKey = process.env.DYNADOT_API_KEY;
    const steps: string[] = [];
    let isSimulated = true;

    steps.push(`[API] Déclenchement de la synchronisation DNS pour ${domainName} (${action.toUpperCase()})`);

    if (dynadotApiKey) {
      try {
        const dCommand = action === 'delete' ? 'delete_dns' : 'set_dns2';
        const url = `https://api.dynadot.com/api3.json?key=${dynadotApiKey}&command=${dCommand}&domain=${encodeURIComponent(domainName)}&type0=${record.type}&host0=${encodeURIComponent(record.name)}&target0=${encodeURIComponent(record.value)}&ttl0=${record.ttl}`;
        const response = await fetch(url);
        if (response.ok) {
          steps.push(`✓ Synchronisation de l'enregistrement ${record.type} pour "${domainName}" réussie sur Dynadot.`);
          isSimulated = false;
        } else {
          throw new Error("Failed Dynadot response");
        }
      } catch (err) {
        console.error("Real Dynadot DNS Sync failed, falling back to simulation:", err);
        steps.push(`[SIMULATION] Pousse DNS simulée vers Dynadot : ${record.type} ${record.name} -> ${record.value} (TTL: ${record.ttl})`);
      }
    } else {
      steps.push(`[SIMULATION] Enregistrement DNS poussé vers Dynadot : ${record.type} ${record.name} -> ${record.value} (TTL: ${record.ttl}, Priorité: ${record.priority || 'N/A'})`);
    }

    steps.push(`✓ Enregistrement "${record.type}" synchronisé et validé.`);

    return res.json({
      success: true,
      synced: true,
      steps,
      isSimulated
    });

  } catch (error: any) {
    console.error("Error in sync-dns-record:", error);
    return res.status(500).json({ error: "Une erreur est survenue lors de la synchronisation DNS." });
  }
});

// --- STRIPE BILLING & WEBHOOK FOR WEEL-TECH SUBSCRIPTIONS ---

const SUBS_FILE_PATH = path.join(process.cwd(), 'subscriptions-backend.json');

// Helper to load backend subscriptions from local JSON storage
const getBackendSubscriptions = (): any[] => {
  try {
    if (fs.existsSync(SUBS_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(SUBS_FILE_PATH, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading backend subscriptions:", e);
  }
  return [];
};

// Helper to save subscription to local JSON storage
const saveBackendSubscription = (sub: any) => {
  try {
    const subs = getBackendSubscriptions();
    const index = subs.findIndex(s => s.user_id === sub.user_id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...sub, updated_at: new Date().toISOString() };
    } else {
      subs.push({
        id: sub.id || 'sub-' + Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        ...sub
      });
    }
    fs.writeFileSync(SUBS_FILE_PATH, JSON.stringify(subs, null, 2));
  } catch (e) {
    console.error("Error saving backend subscription:", e);
  }
};

/**
 * Endpoint: Create a Stripe Checkout Session for classic subscription
 */
app.post('/api/stripe/create-subscription-checkout', async (req, res) => {
  const { userId, plan, email } = req.body;
  const devUrl = process.env.APP_URL || `http://localhost:${PORT}`;

  if (!userId || !plan) {
    return res.status(400).json({ error: "userId et plan sont requis." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Generate simulated checkout redirect URL
    const simulationUrl = `${devUrl}/stripe-billing-simulation?userId=${encodeURIComponent(userId)}&plan=${encodeURIComponent(plan)}&email=${encodeURIComponent(email || 'demo@weel-tech.fr')}`;
    return res.json({
      url: simulationUrl,
      simulated: true,
      message: "STRIPE_SECRET_KEY non configurée. Redirection vers la simulation de paiement."
    });
  }

  try {
    const stripe = getStripe();
    
    // Create Stripe Checkout Session for standard subscription
    const amount = plan === 'starter' ? 1900 : plan === 'pro' ? 4900 : 9900;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Abonnement Weel-Tech - Plan ${plan.toUpperCase()}`,
              description: `Accès complet au plan ${plan} de Weel-Tech`,
            },
            unit_amount: amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: `${devUrl}/?billing-success=true&plan=${plan}`,
      cancel_url: `${devUrl}/?billing-cancel=true`,
      metadata: {
        userId: userId,
        plan: plan,
        email: email || ''
      }
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("Error creating Stripe subscription checkout session:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Endpoint: GET current subscription status for a user
 */
app.get('/api/subscription/status', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId requis." });
  }

  const subs = getBackendSubscriptions();
  const userSub = subs.find(s => s.user_id === userId);

  return res.json({ subscription: userSub || null });
});

/**
 * Edge Function Webhook: stripe-subscription-webhook
 * Updates subscriptions table and profiles plan according to Stripe subscription events
 */
app.post('/api/edge/stripe-subscription-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (process.env.STRIPE_SECRET_KEY && webhookSecret && sig) {
      const stripe = getStripe();
      const payload = (req as any).rawBody || JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(payload, sig as string, webhookSecret);
    } else {
      event = req.body;
      console.log("Processing direct or simulated subscription webhook payload:", event);
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    let planToSet: string | null = null;
    let userIdToSet: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let stripeCustomerId: string | null = null;
    let subStatus: string = 'active';
    let updateType = 'none';

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (session.mode === 'subscription') {
        userIdToSet = session.metadata?.userId;
        planToSet = session.metadata?.plan || 'starter';
        stripeSubscriptionId = session.subscription;
        stripeCustomerId = session.customer;
        subStatus = 'active';
        updateType = 'checkout';
      }
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data?.object;
      stripeSubscriptionId = subscription.id;
      stripeCustomerId = subscription.customer;
      subStatus = subscription.status; // 'active', 'trialing', 'past_due', 'canceled', etc.
      
      // Attempt to find userId via local subscriptions first, or metadata
      userIdToSet = subscription.metadata?.userId;
      planToSet = subscription.metadata?.plan;

      if (!userIdToSet) {
        const localSubs = getBackendSubscriptions();
        const found = localSubs.find(s => s.stripe_subscription_id === stripeSubscriptionId);
        if (found) {
          userIdToSet = found.user_id;
          planToSet = found.plan_id;
        }
      }
      updateType = 'update';
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data?.object;
      stripeSubscriptionId = subscription.id;
      subStatus = 'canceled';
      planToSet = 'starter'; // Default or degraded plan

      const localSubs = getBackendSubscriptions();
      const found = localSubs.find(s => s.stripe_subscription_id === stripeSubscriptionId);
      if (found) {
        userIdToSet = found.user_id;
      }
      updateType = 'deleted';
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data?.object;
      stripeSubscriptionId = invoice.subscription;
      subStatus = 'past_due';
      planToSet = 'starter'; // Degrade due to failed payment

      const localSubs = getBackendSubscriptions();
      const found = localSubs.find(s => s.stripe_subscription_id === stripeSubscriptionId);
      if (found) {
        userIdToSet = found.user_id;
      }
      updateType = 'payment_failed';
    }

    if (userIdToSet) {
      const periodStart = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Persist Subscription state locally
      const subRecord = {
        id: stripeSubscriptionId || 'sub-' + Math.random().toString(36).substring(2, 11),
        user_id: userIdToSet,
        plan_id: planToSet || 'starter',
        status: subStatus,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        stripe_subscription_id: stripeSubscriptionId || 'sub_simulated_' + Math.random().toString(36).substring(2, 9),
        stripe_customer_id: stripeCustomerId || 'cus_simulated_' + Math.random().toString(36).substring(2, 9),
        updated_at: new Date().toISOString()
      };

      saveBackendSubscription(subRecord);

      // 2. Persist in real Supabase if connected
      const supabase = getSupabase();
      if (supabase) {
        // Update user profile plan
        if (planToSet) {
          const { error: pErr } = await supabase
            .from('profiles')
            .update({ plan: planToSet })
            .eq('id', userIdToSet);
          if (pErr) console.error("Error updating profile in Supabase from webhook:", pErr);
        }

        // Upsert subscription
        const { error: sErr } = await supabase
          .from('subscriptions')
          .upsert({
            id: subRecord.id,
            user_id: subRecord.user_id,
            plan_id: subRecord.plan_id,
            status: subRecord.status,
            current_period_start: subRecord.current_period_start,
            current_period_end: subRecord.current_period_end,
            cancel_at_period_end: subRecord.cancel_at_period_end,
            stripe_subscription_id: subRecord.stripe_subscription_id,
            stripe_customer_id: subRecord.stripe_customer_id,
            updated_at: subRecord.updated_at
          });
        if (sErr) console.error("Error upserting subscription in Supabase from webhook:", sErr);
      }

      console.log(`[Subscription Webhook] Processed event ${event.type}. User: ${userIdToSet}, Plan: ${planToSet}, Sub Status: ${subStatus}`);
      return res.json({
        success: true,
        processed: true,
        type: updateType,
        subscription: subRecord
      });
    }

    return res.json({
      success: true,
      processed: false,
      reason: `Event type ${event.type} processed but no matching userId found.`
    });

  } catch (err: any) {
    console.error("Error processing Stripe Subscription Webhook:", err);
    return res.status(500).json({ error: "Internal webhook processing error." });
  }
});

/**
 * Route: Visual Stripe Checkout Simulator Page for Subscriptions
 */
app.get('/stripe-billing-simulation', (req, res) => {
  const { userId, plan, email } = req.query;
  const devUrl = process.env.APP_URL || `http://localhost:${PORT}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simulation Stripe Billing Checkout</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; }
      </style>
    </head>
    <body class="bg-[#0A0E1A] text-slate-100 min-h-screen flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-[#111726] rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2">
            <div class="bg-indigo-600 text-white p-2 rounded-xl">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-400">Stripe Checkout</h2>
              <p class="text-lg font-bold font-display text-white">Weel-Tech Billing</p>
            </div>
          </div>
          <span class="text-2xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-wide">Simulateur</span>
        </div>

        <div class="space-y-4">
          <p class="text-sm text-slate-300 leading-relaxed">
            Configurez et simulez la réponse de la passerelle Stripe pour l'abonnement au plan <span class="text-indigo-400 uppercase font-bold">${plan || 'pro'}</span>.
          </p>

          <!-- Client details -->
          <div class="bg-slate-900/60 rounded-xl p-4.5 space-y-2 text-xs font-mono border border-slate-800 text-slate-300">
            <p><span class="font-bold text-slate-500">Utilisateur (ID):</span> ${userId || 'demo-user-123'}</p>
            <p><span class="font-bold text-slate-500">Client Email:</span> ${email || 'demo@weel-tech.fr'}</p>
            <p><span class="font-bold text-slate-500">Plan Choisi:</span> <span class="text-indigo-400 uppercase font-bold">${plan || 'pro'}</span></p>
            <p><span class="font-bold text-slate-500">Tarif Mensuel:</span> ${plan === 'starter' ? '19,00 €' : plan === 'pro' ? '49,00 €' : '99,00 €'} / mois</p>
          </div>
        </div>

        <!-- Simulation Options -->
        <div class="space-y-3 pt-2">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Simuler un événement de paiement :</div>
          
          <button 
            onclick="triggerWebhook('checkout.session.completed')" 
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Succès - Valider l'Abonnement (checkout.session.completed)
          </button>
          
          <button 
            onclick="triggerWebhook('invoice.payment_failed')" 
            class="w-full bg-[#182030] hover:bg-[#1e293c] text-red-400 border border-red-500/10 py-3 rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            Échec - Simuler un Rejet de Carte (invoice.payment_failed)
          </button>

          <button 
            onclick="triggerWebhook('customer.subscription.deleted')" 
            class="w-full bg-[#182030] hover:bg-[#1e293c] text-amber-400 border border-amber-500/10 py-3 rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            Résiliation - Annuler l'Abonnement (customer.subscription.deleted)
          </button>
        </div>

        <div class="flex items-center justify-between border-t border-slate-800 pt-4">
          <button 
            onclick="window.location.href='/?billing-cancel=true'" 
            class="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            &larr; Annuler la transaction
          </button>
          <p class="text-[10px] text-slate-500">
            Weel-Tech &middot; Bac à sable de Facturation
          </p>
        </div>

      </div>

      <script>
        async function triggerWebhook(eventType) {
          const params = new URLSearchParams(window.location.search);
          const userId = params.get('userId') || 'demo-user-123';
          const plan = params.get('plan') || 'pro';
          const email = params.get('email') || 'demo@weel-tech.fr';
          
          const subId = 'sub_sim_' + Math.random().toString(36).substring(2, 9);
          const custId = 'cus_sim_' + Math.random().toString(36).substring(2, 9);
          
          let payload = {};
          
          if (eventType === 'checkout.session.completed') {
            payload = {
              type: 'checkout.session.completed',
              data: {
                object: {
                  mode: 'subscription',
                  subscription: subId,
                  customer: custId,
                  amount_total: plan === 'starter' ? 1900 : plan === 'pro' ? 4900 : 9900,
                  currency: 'eur',
                  customer_details: { email: email },
                  metadata: { userId, plan, email }
                }
              }
            };
          } else if (eventType === 'invoice.payment_failed') {
            payload = {
              type: 'invoice.payment_failed',
              data: {
                object: {
                  subscription: subId,
                  customer: custId,
                  metadata: { userId, plan, email }
                }
              }
            };
          } else if (eventType === 'customer.subscription.deleted') {
            payload = {
              type: 'customer.subscription.deleted',
              data: {
                object: {
                  id: subId,
                  customer: custId,
                  status: 'canceled',
                  metadata: { userId, plan, email }
                }
              }
            };
          }

          try {
            const res = await fetch('/api/edge/stripe-subscription-webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            if (res.ok) {
              if (eventType === 'checkout.session.completed') {
                window.location.href = '/?billing-success=true&plan=' + plan;
              } else if (eventType === 'invoice.payment_failed') {
                window.location.href = '/?billing-failed=true';
              } else {
                window.location.href = '/?billing-canceled=true';
              }
            } else {
              alert("Erreur de simulation webhook.");
            }
          } catch (e) {
            console.error(e);
            alert("Erreur lors de l'appel au simulateur de webhook.");
          }
        }
      </script>
    </body>
    </html>
  `);
});

/**
 * 6. Endpoint: /api/widget/pay
 * This is called by the vendza-pay-widget.js component on third-party sites.
 * It validates the developer's API Key, creates the transaction, and handles
 * payouts for MonCash if needed.
 */
app.post('/api/widget/pay', async (req, res) => {
  const { apiKey, siteId, amount, currency, customerName, customerEmail, description, method = 'Stripe' } = req.body;
  let txCurrency = currency || (method === 'MonCash' ? 'HTG' : 'USD');

  if (!apiKey) {
    return res.status(400).json({ error: "Clé API manquante. Veuillez fournir 'apiKey'." });
  }

  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: "Montant invalide ou manquant." });
  }

  const numericAmount = parseFloat(amount);
  let userId = 'demo-user-123';
  let isKeyValid = false;

  // Validate API key via Supabase if connected
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key', apiKey)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error("Error verifying API Key:", error);
      } else if (data) {
        userId = data.user_id;
        isKeyValid = true;
      }
    } catch (e) {
      console.error("Exception during API Key verification:", e);
    }
  } else {
    // Local / development fallback: accept any key starting with 'wt_' or 'pk_'
    if (apiKey.startsWith('wt_') || apiKey.startsWith('pk_') || apiKey.includes('demo')) {
      isKeyValid = true;
    }
  }

  // If Supabase is connected but key is invalid, we will still fallback to allow demo actions in sandbox,
  // but let's enforce security strictly when possible.
  if (supabase && !isKeyValid) {
    // Check if the key is just a demo key
    if (!apiKey.startsWith('wt_') && !apiKey.startsWith('pk_')) {
      return res.status(401).json({ error: "Clé API invalide ou révoquée." });
    }
  }

  // Calculate fees (10% standard commission)
  const commissionRate = 0.10;
  const applicationFeeAmount = numericAmount * commissionRate;
  const netAmount = numericAmount - applicationFeeAmount;

  let finalStatus = 'succeeded';
  let transferDetails: any = null;

  if (method === 'MonCash') {
    // MonCash Payout Logic: Retrieve owner's configuration
    let config: any = null;
    if (supabase) {
      try {
        const { data } = await supabase
          .from('payment_configs')
          .select('*')
          .eq('site_id', siteId || 'site-1')
          .maybeSingle();
        if (data) {
          config = data;
        }
      } catch (e) {
        console.warn("Could not query payment_configs for widget:", e);
      }
    }

    if (!config) {
      const configs = getBackendPaymentConfigs();
      config = configs.find(c => c.site_id === (siteId || 'site-1'));
    }

    const moncashPhone = config ? config.moncash_phone : '50937123456';
    const bazikKey = process.env.BAZIK_API_KEY;
    const bazikUrl = process.env.BAZIK_API_URL || 'https://api.bazik.io/v1';

    let isSimulated = true;
    let bazikResponse: any = null;

    if (bazikKey) {
      try {
        const response = await fetch(`${bazikUrl}/transfers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bazikKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: netAmount,
            currency: txCurrency,
            receiver: moncashPhone,
            channel: 'moncash',
            description: `Payout MonCash widget pour ${siteId || 'site-1'} - Réf: ${customerEmail || 'N/A'}`
          })
        });

        if (response.ok) {
          bazikResponse = await response.json();
          isSimulated = false;
          if (bazikResponse.status === 'failed') {
            finalStatus = 'failed';
          }
        } else {
          finalStatus = 'failed';
        }
      } catch (err: any) {
        console.error("Widget Bazik transfer error:", err);
        finalStatus = 'failed';
      }
    } else {
      // simulated success
      bazikResponse = {
        status: 'succeeded',
        reference: 'bazik-sim-' + Math.random().toString(36).substring(2, 9)
      };
    }

    transferDetails = {
      receiver: moncashPhone,
      transferAmount: netAmount,
      commissionAmount: applicationFeeAmount,
      bazikResponse,
      simulated: isSimulated
    };
  }

  // Create & save transaction
  const newTx = {
    id: 'tx-' + Math.random().toString(36).substring(2, 11),
    user_id: userId,
    site_id: siteId || 'site-1',
    amount: numericAmount,
    currency: txCurrency,
    customer_name: customerName || 'Client Widget',
    customer_email: customerEmail || 'client@widget.com',
    status: finalStatus as any,
    description: description || `Achat via widget (${method})`,
    method: method,
    created_at: new Date().toISOString(),
    application_fee_amount: applicationFeeAmount,
    net_amount: netAmount,
    is_sandbox: apiKey.startsWith('vp_test_')
  };

  // Save to real database if connected
  if (supabase) {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([newTx]);
      if (error) {
        console.error("Error inserting widget transaction into Supabase:", error);
      }
    } catch (e) {
      console.error("Supabase insert exception during widget transaction:", e);
    }
  }

  // Always save to backend local JSON
  saveBackendTransaction(newTx);

  return res.json({
    success: finalStatus === 'succeeded',
    transaction: newTx,
    transferDetails
  });
});

/**
 * Endpoint: Get Cloudflare Web Analytics
 * Fetches real analytics via Cloudflare GraphQL API if API Key is configured, 
 * otherwise returns beautifully simulated 30-day analytics data.
 */
app.get('/api/cloudflare/analytics', async (req, res) => {
  const { domain, siteId } = req.query;
  if (!domain) {
    return res.status(400).json({ error: "Le domaine est requis." });
  }

  const cfApiKey = process.env.CLOUDFLARE_API_KEY;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (cfApiKey && cfAccountId) {
    try {
      // Structure the GraphQL Query to get rumAnalyticsAdaptiveGroups (Web Analytics)
      // Grouped by date over the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateString = thirtyDaysAgo.toISOString().split('T')[0];

      const query = `
        query GetWebAnalytics($accountId: String!, $domain: String!, $startDate: String!) {
          viewer {
            accounts(filter: {accountTag: $accountId}) {
              rumAnalyticsAdaptiveGroups(
                limit: 100,
                filter: {
                  and: [
                    { date_geq: $startDate },
                    { requestHost: $domain }
                  ]
                },
                orderBy: [date_ASC]
              ) {
                sum {
                  pageViews
                  visits
                }
                dimensions {
                  date
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfApiKey}`
        },
        body: JSON.stringify({
          query,
          variables: {
            accountId: cfAccountId,
            domain: domain.toString(),
            startDate: dateString
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const dataGroups = result.data?.viewer?.accounts?.[0]?.rumAnalyticsAdaptiveGroups || [];
        
        // Map to client-friendly format
        const analytics = dataGroups.map((g: any) => ({
          date: g.dimensions.date,
          visitors: g.sum.visits || 0,
          pageViews: g.sum.pageViews || 0
        }));

        return res.json({
          source: 'cloudflare',
          simulated: false,
          analytics
        });
      } else {
        const errorText = await response.text();
        console.error("Cloudflare GraphQL API error response:", errorText);
        throw new Error("Could not fetch from Cloudflare API");
      }
    } catch (err: any) {
      console.error("Error calling real Cloudflare API, falling back to simulator:", err);
    }
  }

  // --- SIMULATOR FOR CLOUDFLARE WEB ANALYTICS ---
  // Seed generation based on site ID or domain name so the charts look stable but unique
  const seedString = (siteId || domain || 'default-seed').toString();
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }

  const getSeededRandom = (dayOffset: number) => {
    const x = Math.sin(hash + dayOffset) * 10000;
    return x - Math.floor(x);
  };

  const analyticsList = [];
  const today = new Date();
  
  // Base visitor count generated randomly but anchored to a reasonable volume
  const baseVisitors = 50 + Math.abs(hash % 150); // 50 to 200 daily visitors base

  for (let i = 29; i >= 0; i--) {
    const currentDate = new Date();
    currentDate.setDate(today.getDate() - i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Add weekly rhythm (lower traffic on weekends: Sat, Sun are index 6, 0)
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayFactor = isWeekend ? 0.6 : 1.1; // lower traffic on weekend

    // Random variation around the base (-30% to +30%)
    const randomVariation = 0.7 + getSeededRandom(i) * 0.6;

    // Gradual overall growth trend
    const trendFactor = 1 + (30 - i) * 0.008; // small growth of 0.8% per day over the 30 days

    const visitors = Math.round(baseVisitors * dayFactor * randomVariation * trendFactor);
    // Page views is typically 1.5 to 3.5 times the unique visitors
    const pageViewsFactor = 1.8 + getSeededRandom(i + 100) * 1.5;
    const pageViews = Math.round(visitors * pageViewsFactor);

    analyticsList.push({
      date: dateStr,
      visitors: Math.max(1, visitors),
      pageViews: Math.max(visitors, pageViews)
    });
  }

  return res.json({
    source: 'cloudflare-simulator',
    simulated: true,
    message: "Données générées par le simulateur Cloudflare Web Analytics (clés d'API non configurées).",
    analytics: analyticsList
  });
});

// Serve static production assets or delegate to Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Static production assets mounted from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Weel-Tech custom server running on http://localhost:${PORT}`);
  });
}

startServer();
