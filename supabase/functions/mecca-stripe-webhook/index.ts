// Stripe webhook (checkout.session.completed / async_payment_succeeded). Secret: STRIPE_WEBHOOK_SECRET.
const SB = Deno.env.get("SUPABASE_URL")!, SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WH = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const rpc = async (fn: string, args: unknown) => {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  return r.ok ? r.json() : null;
};
async function verify(body: string, header: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = parts["t"];
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(WH), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].reduce((a, c, i) => a | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}
Deno.serve(async (req) => {
  if (!WH) return new Response("not configured", { status: 503 });
  const body = await req.text();
  if (!(await verify(body, req.headers.get("stripe-signature") || ""))) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(body);
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const s = ev.data.object;
    if (s.payment_status === "paid") {
      const id = s.metadata?.order || (await rpc("mecca_pay_by_ref", { p_ref: s.id }));
      if (id) await rpc("mecca_pay_mark_paid", { p_id: id, p_ref: s.id, p_amount_cents: s.amount_total, p_currency: s.currency });
    }
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
