// Creates a Stripe Checkout Session for a pending Cloud Mecca order and returns its URL.
// Secrets: STRIPE_SECRET_KEY (required), ALLOWED_ORIGINS (optional, comma-separated).
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SK = Deno.env.get("STRIPE_SECRET_KEY") || "";
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://cloud-mecca.vercel.app,http://localhost:3000,http://localhost:5173").split(",").map((s) => s.trim());
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const rpc = async (fn: string, args: unknown) => {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  return r.ok ? r.json() : null;
};
const NAMES: Record<string, Record<string, string>> = {
  support: { ar: "مكة في السحاب · دعم الموقع", zh: "云上麦加 · 支持本站", en: "Cloud Mecca · support" },
  hajj_course: { ar: "مكة في السحاب · الرحلة الكاملة الموجّهة", zh: "云上麦加 · 完整引导之旅", en: "Cloud Mecca · full guided journey" },
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!SK) return json({ error: "not_configured" }, 503);
    const { token, order, lang, origin } = await req.json();
    const o = String(origin || "");
    if (!ORIGINS.includes(o) && !/^https:\/\/cloud-mecca(-[a-z0-9-]+)?\.vercel\.app$/.test(o)) return json({ error: "bad_origin" }, 400);
    const ord = await rpc("mecca_pay_get", { p_token: token, p_id: order });
    if (!ord || ord.status !== "pending") return json({ error: "bad_order" }, 400);
    const L = lang === "zh" ? "zh" : lang === "ar" ? "ar" : "en";
    const f = new URLSearchParams();
    f.set("mode", "payment");
    f.set("line_items[0][quantity]", "1");
    f.set("line_items[0][price_data][currency]", ord.currency);
    f.set("line_items[0][price_data][unit_amount]", String(ord.amount_cents));
    f.set("line_items[0][price_data][product_data][name]", (NAMES[ord.kind] || NAMES.support)[L]);
    f.set("success_url", `${o}/?pay=ok&sid={CHECKOUT_SESSION_ID}`);
    f.set("cancel_url", `${o}/?pay=cancel`);
    f.set("client_reference_id", ord.id);
    f.set("metadata[order]", ord.id);
    f.set("payment_intent_data[metadata][order]", ord.id);
    f.set("locale", L === "zh" ? "zh" : "auto");
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${SK}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `mecca-${ord.id}` }, body: f });
    const s = await r.json();
    if (!r.ok || !s.url) return json({ error: "stripe", detail: s?.error?.message || null }, 502);
    await rpc("mecca_pay_set_ref", { p_id: ord.id, p_ref: s.id });
    return json({ url: s.url });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
