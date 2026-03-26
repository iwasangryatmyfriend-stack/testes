export async function onRequest(context) {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }

  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  }

  let body;
  try { body = await context.request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }

  const { action, accessToken, refreshToken, clientId, clientSecret, dateFrom, dateTo, page = 1, orderId, productId } = body;

  function respond(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
  }

  async function blingGet(url, token) {
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  if (action === "refresh") {
    if (!clientId || !clientSecret || !refreshToken)
      return respond({ error: "Missing credentials" }, 400);
    const creds = btoa(`${clientId}:${clientSecret}`);
    const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${creds}` },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });
    const data = await res.json();
    if (!res.ok) return respond({ error: data }, res.status);
    return respond(data);
  }

  if (action === "orders") {
    if (!accessToken) return respond({ error: "Missing accessToken" }, 400);
    const params = new URLSearchParams({ pagina: page, limite: 100 });
    if (dateFrom) params.append("dataInicial", dateFrom);
    if (dateTo)   params.append("dataFinal", dateTo);
    const { ok, status, data } = await blingGet(`https://api.bling.com.br/Api/v3/pedidos/vendas?${params}`, accessToken);
    if (!ok) return respond({ error: data }, status);
    return respond(data);
  }

  if (action === "order_detail") {
    if (!accessToken || !orderId) return respond({ error: "Missing params" }, 400);
    const { ok, status, data } = await blingGet(`https://api.bling.com.br/Api/v3/pedidos/vendas/${orderId}`, accessToken);
    if (!ok) return respond({ error: data }, status);
    return respond(data);
  }

  if (action === "product") {
    if (!accessToken || !productId) return respond({ error: "Missing params" }, 400);
    const { ok, status, data } = await blingGet(`https://api.bling.com.br/Api/v3/produtos/${productId}`, accessToken);
    if (!ok) return respond({ error: data }, status);
    return respond(data);
  }

  return respond({ error: "Unknown action" }, 400);
}
