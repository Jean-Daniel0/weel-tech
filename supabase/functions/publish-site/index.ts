// Supabase Edge Function: publish-site
// Located at: /supabase/functions/publish-site/index.ts
// Serves to publish generated HTML content directly to a Cloudflare R2 bucket using S3-compatible API.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client } from "https://deno.land/x/s3_lite_client@0.2.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { siteId, htmlContent } = await req.json();

    if (!siteId) {
      return new Response(
        JSON.stringify({ error: "L'identifiant du site (siteId) est requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ error: "Le contenu HTML (htmlContent) est requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load Environment Variables from Deno context
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID");
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mainDomain = Deno.env.get("MAIN_DOMAIN") || "weel-tech.app";

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(
        JSON.stringify({ error: "Identifiants Cloudflare R2 non configurés sur l'Edge Function." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Credentials de base de données Supabase manquants." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Client with Service Role (bypass RLS for publishing metadata updates)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch site details to confirm existence and retrieve domain or current state
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: `Site introuvable ou erreur : ${siteError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Generate or use existing r2_key_prefix
    // If not already defined, we use a random prefix (e.g., site-xyz123) or the existing slug
    const r2KeyPrefix = site.r2_key_prefix || `site-${Math.random().toString(36).substring(2, 9)}`;
    const r2Key = `${r2KeyPrefix}/index.html`;

    // 3. Initialize S3 Client pointing to Cloudflare R2 Endpoint
    const s3 = new S3Client({
      endPoint: `${r2AccountId}.r2.cloudflarestorage.com`,
      accessKey: r2AccessKeyId,
      secretKey: r2SecretAccessKey,
      bucket: "weelsite",
      useSSL: true,
    });

    // 4. Upload HTML content to R2
    const encoder = new TextEncoder();
    const fileData = encoder.encode(htmlContent);

    await s3.putObject(r2Key, fileData, {
      contentType: "text/html; charset=utf-8",
    });

    // 5. Update the site record in Supabase database
    const { error: updateError } = await supabase
      .from("sites")
      .update({
        status: "published",
        r2_key_prefix: r2KeyPrefix,
        updated_at: new Date().toISOString(),
      })
      .eq("id", siteId);

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour de la table sites : ${updateError.message}`);
    }

    // 6. Build public live URL
    // Format: siteprefix.weel-tech.app or site domain if configured
    const isCustomDomain = site.domain && !site.domain.endsWith(mainDomain);
    const publicUrl = isCustomDomain 
      ? `https://${site.domain}` 
      : `https://${r2KeyPrefix}.${mainDomain}`;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Site publié avec succès sur Cloudflare R2 !",
        r2_key_prefix: r2KeyPrefix,
        r2_key: r2Key,
        public_url: publicUrl,
        published_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Publishing edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Une erreur interne est survenue." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
