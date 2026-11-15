// Called by the page after Stripe redirects back: checks the Checkout Session and marks the order paid.
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
let SK = Deno.env.get("STRIPE_SECRET_KEY") || "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const rpc = async (fn: string, args: unknown) => {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  return r.ok ? r.json() : null;
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!SK) SK = (await rpc("mecca_secret", { p_name: "mecca_stripe_secret_key" })) || "";
    if (!SK) return json({ error: "not_configured" }, 503);
    const { token, order } = await req.json();
    const ord = await rpc("mecca_pay_get", { p_token: token, p_id: order });
    if (!ord) return json({ error: "bad_order" }, 400);
    if (ord.status === "paid" || ord.status === "used") return json({ status: ord.status });
    if (!ord.provider_ref) return json({ status: ord.status });
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(ord.provider_ref)}`, { headers: { Authorization: `Bearer ${SK}` } });
    const s = await r.json();
    if (!r.ok) return json({ error: "stripe" }, 502);
    if (s.payment_status !== "paid" || s.metadata?.order !== ord.id) return json({ status: ord.status });
    const st = await rpc("mecca_pay_mark_paid", { p_id: ord.id, p_ref: s.id, p_amount_cents: s.amount_total, p_currency: s.currency });
    return json({ status: st });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
