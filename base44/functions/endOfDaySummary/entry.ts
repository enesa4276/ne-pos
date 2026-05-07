// Gün sonunda yöneticiye AI destekli kısa içgörü raporu üretir.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function callLLM({ provider, apiKey, model, messages, max_tokens = 400 }) {
  if (provider === "Anthropic") {
    const sys = messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages.filter((m) => m.role !== "system");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model, system: sys, messages: userMessages, max_tokens, temperature: 0.4 }),
    });
    const d = await r.json();
    return d?.content?.[0]?.text || "";
  }
  const baseUrls = {
    OpenAI: "https://api.openai.com/v1",
    OpenRouter: "https://openrouter.ai/api/v1",
    Groq: "https://api.groq.com/openai/v1",
  };
  const baseUrl = baseUrls[provider];
  if (!baseUrl) return "";
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(provider === "OpenRouter" ? { "HTTP-Referer": "https://nepos.app", "X-Title": "Ne-Pos" } : {}),
    },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens }),
  });
  const d = await r.json();
  return d?.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = user.is_super_admin ? (user.selected_tenant_id || user.tenant_id) : user.tenant_id;

    // Son 24 saatteki paid orders
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const orders = await base44.asServiceRole.entities.Order.filter(
      { tenant_id: tenantId, status: "paid", created_date: { $gte: since } },
      "-created_date",
      500,
    );

    if (!orders.length) {
      return Response.json({ summary: "Bugün henüz tamamlanmış sipariş yok.", stats: { count: 0, revenue: 0 } });
    }

    const totalRev = orders.reduce((s, o) => s + (o.total || 0), 0);
    const productMap = {};
    orders.forEach((o) => {
      o.items?.forEach((it) => {
        if (!productMap[it.product_name]) productMap[it.product_name] = { qty: 0, revenue: 0 };
        productMap[it.product_name].qty += it.quantity || 0;
        productMap[it.product_name].revenue += it.subtotal || 0;
      });
    });
    const top = Object.entries(productMap)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5)
      .map(([name, v]) => `${name}: ${v.qty} adet (€${v.revenue.toFixed(0)})`);

    // AI config çek
    let configs = await base44.asServiceRole.entities.AIApiConfig.filter({
      tenant_id: tenantId, ai_feature: "eod_summary", is_active: true,
    });
    if (!configs.length) {
      configs = await base44.asServiceRole.entities.AIApiConfig.filter({
        tenant_id: "global", ai_feature: "eod_summary", is_active: true,
      });
    }
    const config = configs[0];

    const stats = {
      count: orders.length,
      revenue: parseFloat(totalRev.toFixed(2)),
      top_products: top,
    };

    if (!config) {
      return Response.json({
        summary: `Bugün ${stats.count} sipariş, toplam €${stats.revenue}. En çok satan: ${top[0] || '-'}`,
        stats,
      });
    }

    const apiKey = Deno.env.get(config.secret_name);
    if (!apiKey) {
      return Response.json({ summary: "AI sırrı bulunamadı.", stats });
    }

    const prompt = `Restoran gün sonu özeti:
- Toplam sipariş: ${stats.count}
- Ciro: €${stats.revenue}
- En çok satan ürünler:
${top.map((t) => `  • ${t}`).join("\n")}

Yöneticiye 3-4 cümlelik kısa, faydalı içgörüler yaz: hangi ürün öne çıktı, yarın için stok önerisi, performansa dair kısa yorum. Türkçe ve net konuş.`;

    const messages = [
      { role: "system", content: "Sen restoran yöneticisine günlük içgörü sunan deneyimli bir analitik asistansın. Halüsinasyon yapma, sadece verilen verileri yorumla." },
      { role: "user", content: prompt },
    ];

    const summary = await callLLM({
      provider: config.ai_provider, apiKey, model: config.model_name, messages, max_tokens: config.max_tokens || 400,
    });

    return Response.json({ summary: summary || "Özet üretilemedi.", stats });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});