/**
 * Cloudflare Worker - Dynamic Site Router with R2 Storage
 * 
 * This Worker intercepts incoming requests, resolves the correct site folder/prefix
 * based on the hostname (subdomain or custom domain), and serves the corresponding
 * files (HTML and static assets) directly from a Cloudflare R2 bucket.
 */

interface Env {
  // R2 Bucket bound to SITES_BUCKET in wrangler.toml
  SITES_BUCKET: {
    get(key: string): Promise<R2ObjectBody | null>;
  };
  // Main app domain for subdomain detection
  MAIN_DOMAIN?: string; // e.g., "weel-tech.app"
}

// Minimal types for R2 output to keep compilation green without external packages
interface R2ObjectBody {
  body: ReadableStream;
  httpHeaders?: {
    contentType?: string;
    contentLanguage?: string;
    contentEncoding?: string;
    contentDisposition?: string;
    cacheControl?: string;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    
    // 1. Determine site prefix / folder name
    let sitePrefix = "";
    
    // Default main domain if not provided in environment variables
    const mainDomain = env.MAIN_DOMAIN || "weel-tech.app";
    
    if (hostname === mainDomain || hostname === `www.${mainDomain}` || hostname === "localhost" || hostname === "127.0.0.1") {
      // Direct request to main platform - usually routed to the dashboard, but handle gracefully
      return new Response("Weel-Tech Platform Worker: Ready to route subdomains.", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    } else if (hostname.endsWith(`.${mainDomain}`)) {
      // Subdomain extraction (e.g. "xyz123.weel-tech.app" -> "xyz123")
      const subdomain = hostname.replace(`.${mainDomain}`, "");
      if (subdomain === "www" || subdomain === "") {
        return new Response("Weel-Tech Platform Worker: Primary landing domain.", { status: 200 });
      }
      sitePrefix = subdomain;
    } else {
      // Custom Domain (e.g. "my-portfolio.com" -> serves from "custom-domains/my-portfolio.com" or "my-portfolio.com")
      // We will search for files stored under the literal custom domain folder in R2
      sitePrefix = hostname;
    }

    // 2. Resolve target asset path inside the R2 bucket
    let pathname = url.pathname;
    
    // Normalize path to prevent directory traversal
    pathname = pathNormalize(pathname);

    // If request is for root or doesn't have an extension, default to index.html
    let isHtmlPage = false;
    let r2Key = "";

    if (pathname === "/" || pathname === "") {
      r2Key = `${sitePrefix}/index.html`;
      isHtmlPage = true;
    } else if (!pathname.includes(".")) {
      // Clean URLs support (e.g., "/about" -> "/about/index.html" or "/about.html")
      r2Key = `${sitePrefix}${pathname}/index.html`;
      isHtmlPage = true;
    } else {
      // Static assets or specific files (e.g., "/assets/style.css" -> "xyz123/assets/style.css")
      r2Key = `${sitePrefix}${pathname}`;
    }

    try {
      // 3. Fetch object from R2 bucket
      let object = await env.SITES_BUCKET.get(r2Key);

      // If clean URL /index.html search failed, try with .html extension directly
      if (!object && isHtmlPage && pathname !== "/" && pathname !== "") {
        r2Key = `${sitePrefix}${pathname}.html`;
        object = await env.SITES_BUCKET.get(r2Key);
      }

      // If still not found, return 404 page
      if (!object) {
        // Try to serve site-specific 404.html if the creator uploaded one
        const custom404Key = `${sitePrefix}/404.html`;
        const custom404 = await env.SITES_BUCKET.get(custom404Key);
        
        if (custom404) {
          return new Response(custom404.body, {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }

        // Generic friendly 404 fallback
        return new Response(getGeneric404Html(hostname), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // 4. Determine appropriate Content-Type
      const contentType = getContentType(r2Key, object.httpHeaders?.contentType);

      // 5. Build and return HTTP Response
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      
      // Set caching headers for static assets to improve performance
      if (pathname.includes("/assets/") || pathname.match(/\.(css|js|webp|png|jpg|jpeg|gif|svg|ico|woff2)$/i)) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
      }

      // Add security headers
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

      return new Response(object.body, {
        status: 200,
        headers
      });

    } catch (err: any) {
      console.error(`Worker error serving ${r2Key}:`, err);
      return new Response("Erreur interne du serveur lors du traitement de la page.", { 
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  }
};

/**
 * Basic path normalization to prevent directory traversal attacks
 */
function pathNormalize(path: string): string {
  const parts = path.split("/");
  const safeParts: string[] = [];
  
  for (const part of parts) {
    if (part === ".." || part === ".") continue;
    safeParts.push(part);
  }
  
  return "/" + safeParts.join("/");
}

/**
 * Fallback mime type mapper based on file extensions
 */
function getContentType(key: string, defaultType?: string): string {
  if (defaultType && defaultType !== "application/octet-stream") {
    return defaultType;
  }

  const lowercaseKey = key.toLowerCase();
  
  if (lowercaseKey.endsWith(".html") || lowercaseKey.endsWith(".htm")) return "text/html; charset=utf-8";
  if (lowercaseKey.endsWith(".css")) return "text/css; charset=utf-8";
  if (lowercaseKey.endsWith(".js") || lowercaseKey.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (lowercaseKey.endsWith(".json")) return "application/json; charset=utf-8";
  if (lowercaseKey.endsWith(".png")) return "image/png";
  if (lowercaseKey.endsWith(".jpg") || lowercaseKey.endsWith(".jpeg")) return "image/jpeg";
  if (lowercaseKey.endsWith(".gif")) return "image/gif";
  if (lowercaseKey.endsWith(".svg")) return "image/svg+xml";
  if (lowercaseKey.endsWith(".webp")) return "image/webp";
  if (lowercaseKey.endsWith(".ico")) return "image/x-icon";
  if (lowercaseKey.endsWith(".woff")) return "font/woff";
  if (lowercaseKey.endsWith(".woff2")) return "font/woff2";
  if (lowercaseKey.endsWith(".ttf")) return "font/ttf";
  if (lowercaseKey.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lowercaseKey.endsWith(".pdf")) return "application/pdf";
  if (lowercaseKey.endsWith(".xml")) return "application/xml; charset=utf-8";

  return "application/octet-stream";
}

/**
 * Return an elegant, custom-designed generic 404 page
 */
function getGeneric404Html(hostname: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Non Trouvée - Weel-Tech CDN</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-[#0A0E1A] text-slate-100 min-h-screen flex items-center justify-center p-6">
  <div class="max-w-md w-full bg-[#111726] rounded-2xl shadow-2xl border border-slate-800 p-8 text-center space-y-6">
    <div class="inline-flex p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <div class="space-y-2">
      <h1 class="text-4xl font-extrabold text-white font-display tracking-tight">Erreur 404</h1>
      <h2 class="text-lg font-bold text-slate-300">Site ou page introuvable</h2>
      <p class="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
        La ressource demandée sur <span class="text-indigo-400 font-mono">${hostname}</span> n'existe pas ou n'a pas encore été publiée sur Weel-Tech.
      </p>
    </div>
    <div class="bg-slate-900/60 rounded-xl p-4 border border-slate-800 text-3xs font-mono text-slate-400 text-left space-y-1">
      <p><span class="font-bold text-slate-500">&gt; Status:</span> Page Not Found</p>
      <p><span class="font-bold text-slate-500">&gt; Domain:</span> ${hostname}</p>
      <p><span class="font-bold text-slate-500">&gt; Engine:</span> Cloudflare Worker R2 Router</p>
    </div>
    <div class="pt-2">
      <a href="https://weel-tech.fr" class="inline-flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-md">
        Retourner à la plateforme Weel-Tech
      </a>
    </div>
  </div>
</body>
</html>`;
}
