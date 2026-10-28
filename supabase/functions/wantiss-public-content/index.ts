import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "Published content is not configured" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid JSON body" }); }
  const locale = String(body.locale || "en");
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale)) return reply(400, { error: "Invalid locale" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: content, error: ce } = await admin.rpc("wantiss_cms_published_content", { p_locale: locale });
  if (ce) return reply(503, { error: "Published content is temporarily unavailable" });
  const { data: assets, error: ae } = await admin.from("wantiss_cms_assets")
    .select("asset_key,storage_path,content_type,byte_size,alt_text").eq("status", "published");
  if (ae) return reply(503, { error: "Published assets are temporarily unavailable" });
  const publishedAssets = await Promise.all((assets || []).map(async asset => {
    const { data, error } = await admin.storage.from("wantiss-cms-assets").createSignedUrl(asset.storage_path, 300);
    return error || !data?.signedUrl ? null : { asset_key: asset.asset_key, url: data.signedUrl, content_type: asset.content_type, byte_size: asset.byte_size, alt_text: asset.alt_text };
  }));
  const { data: brand } = await admin.from("wantiss_admin_branding").select("brand_name,logo_storage_path,wordmark_storage_path,updated_at").eq("id", 1).maybeSingle();
  const signBrandAsset = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data, error } = await admin.storage.from("wantiss-cms-assets").createSignedUrl(path, 300);
    return error || !data?.signedUrl ? null : data.signedUrl;
  };
  const branding = { name: brand?.brand_name || "Wantiss", logo_url: await signBrandAsset(brand?.logo_storage_path), wordmark_url: await signBrandAsset(brand?.wordmark_storage_path), updated_at: brand?.updated_at || null };
  return new Response(JSON.stringify({ content: content || [], assets: publishedAssets.filter(Boolean), branding }), {
    status: 200, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});
function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
