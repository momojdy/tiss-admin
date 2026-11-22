import {mergeGoodiesPromotions} from "../_shared/goodiesPromotions.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });

function stableAssetUrl(projectUrl: string, key: string, value: string) {
  const url = new URL("/functions/v1/wantiss-public-content", projectUrl);
  url.searchParams.set(key, value);
  return url.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST" && req.method !== "GET") return reply(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "Published content is not configured" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const requestUrl = new URL(req.url);
  const fileKey = requestUrl.searchParams.get("asset_file");
  const brandAsset = requestUrl.searchParams.get("brand_asset");

  if (fileKey) {
    const { data: asset, error } = await admin.from("wantiss_cms_assets")
      .select("storage_path,content_type").eq("asset_key", fileKey).eq("status", "published").maybeSingle();
    if (error) return reply(500, { error: "Published asset could not be loaded" });
    if (!asset) return reply(404, { error: "Published asset not found" });
    const { data: file, error: downloadError } = await admin.storage.from("wantiss-cms-assets").download(asset.storage_path);
    if (downloadError || !file) return reply(404, { error: "Published asset file is unavailable" });
    return new Response(file, {
      status: 200,
      headers: { ...headers, "Content-Type": asset.content_type || "application/octet-stream", "Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff" },
    });
  }

  if (brandAsset === "logo" || brandAsset === "wordmark") {
    const column = brandAsset === "logo" ? "logo_storage_path" : "wordmark_storage_path";
    const { data: brand, error } = await admin.from("wantiss_admin_branding")
      .select("logo_storage_path,wordmark_storage_path").eq("id", 1).maybeSingle();
    if (error) return reply(500, { error: "Published branding could not be loaded" });
    const path = brand?.[column];
    if (!path) return reply(404, { error: "Published branding asset not found" });
    const { data: file, error: downloadError } = await admin.storage.from("wantiss-cms-assets").download(path);
    if (downloadError || !file) return reply(404, { error: "Published branding asset file is unavailable" });
    return new Response(file, {
      status: 200,
      headers: { ...headers, "Content-Type": file.type || "application/octet-stream", "Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff" },
    });
  }

  if (req.method !== "POST") return reply(400, { error: "A published asset key is required" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid JSON body" }); }
  const locale = String(body.locale || "en");
  if (!/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/.test(locale)) return reply(400, { error: "Invalid locale" });

  const { data: content, error: contentError } = await admin.rpc("wantiss_cms_published_content", { p_locale: locale });
  if (contentError) return reply(503, { error: "Published content is temporarily unavailable" });
  const { data: assets, error: assetError } = await admin.from("wantiss_cms_assets")
    .select("asset_key,content_type,byte_size,alt_text").eq("status", "published");
  if (assetError) return reply(503, { error: "Published assets are temporarily unavailable" });

  let publicContent = content || [];
  if (publicContent.some((record: any) => ['goodies.content', 'goodies'].includes(record.content_key))) {
    const {data: promotions, error: promotionError} = await admin.rpc('goodies_public_promotions');
    if (promotionError || !Array.isArray(promotions)) return reply(503, {error: 'Published offers are temporarily unavailable'});
    publicContent = mergeGoodiesPromotions(publicContent, promotions);
  }
  const publishedAssets = (assets || []).map(asset => ({
    ...asset,
    url: stableAssetUrl(url, "asset_file", asset.asset_key),
  }));
  const { data: brand } = await admin.from("wantiss_admin_branding")
    .select("brand_name,logo_storage_path,wordmark_storage_path,updated_at").eq("id", 1).maybeSingle();
  const branding = {
    name: brand?.brand_name || "Wantiss",
    logo_url: brand?.logo_storage_path ? stableAssetUrl(url, "brand_asset", "logo") : null,
    wordmark_url: brand?.wordmark_storage_path ? stableAssetUrl(url, "brand_asset", "wordmark") : null,
    updated_at: brand?.updated_at || null,
  };
  return new Response(JSON.stringify({ content: publicContent, assets: publishedAssets, branding }), {
    status: 200, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});
