// QR menüde sepete eklenen ürünlere bakarak akıllı upsell önerisi yapar.
// PUBLIC: Login gerekmez. OpenRouter (Claude 3.5 Sonnet) kullanılır.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

    const body = await req.json();
    const { tenant_id, cart_items } = body || {};
    if (!tenant_id || !Array.isArray(cart_items) || cart_items.length === 0) {
      return Response.json({ suggestions: [] });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return Response.json({ suggestions: [] });

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const allProducts = await svc.entities.Product.filter({ tenant_id });
    const inCartIds = new Set(cart_items.map((c) => c.product_id));
    const candidateList = allProducts
      .filter((p) => !inCartIds.has(p.id) && p.is_active !== false)
      .map((p) => ({ id: p.id, name: p.name, price: p.base_price }));

    const cartList = cart_items.map((c) => `${c.quantity}x ${c.product_name}`).join(", ");

    const messages = [
      {
        role: "system",
        content: `Sen bir restoranın akıllı menü asistanısın. Sepetteki ürünlere uygun, BIRBIRINI tamamlayıcı 1-3 ürün öner.
KESIN KURALLAR:
- Sadece sana verilen "candidates" listesinden ürün seç. UYDURMA.
- Yanıt SADECE şu JSON formatında olmalı: {"suggestions":[{"product_id":"...","reason":"kısa sebep (max 8 kelime)"}]}
- Halüsinasyon yapma. Listede olmayan ürün önerme.`,
      },
      {
        role: "user",
        content: `Sepet: ${cartList}\n\nCandidates: ${JSON.stringify(candidateList.slice(0, 30))}\n\nUygun 1-3 öneri ver.`,
      },
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nepos.app",
        "X-Title": "Ne-Pos",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages,
        temperature: 0.5,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { suggestions: [] }; }
    const suggestionList = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    const enriched = suggestionList
      .map((s) => {
        const p = allProducts.find((x) => x.id === s.product_id);
        if (!p) return null;
        return {
          product_id: p.id,
          product_name: p.name,
          base_price: p.base_price,
          image_url: p.image_url,
          reason: String(s.reason || "").slice(0, 60),
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    return Response.json({ suggestions: enriched });
  } catch (e) {
    console.error("smartMenuSuggestion error:", e.message);
    return Response.json({ suggestions: [] });
  }
});