// Gün sonunda yöneticiye AI destekli kısa içgörü raporu üretir.
// OpenRouter (Claude 3.5 Sonnet) kullanılır.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = user.is_super_admin ? (user.selected_tenant_id || user.tenant_id) : user.tenant_id;

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

    const stats = {
      count: orders.length,
      revenue: parseFloat(totalRev.toFixed(2)),
      top_products: top,
    };

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return Response.json({
        summary: `Bugün ${stats.count} sipariş, toplam €${stats.revenue}. En çok satan: ${top[0] || '-'}`,
        stats,
      });
    }

    const prompt = `Restoran gün sonu özeti:
- Toplam sipariş: ${stats.count}
- Ciro: €${stats.revenue}
- En çok satan ürünler:
${top.map((t) => `  • ${t}`).join("\n")}

Yöneticiye 3-4 cümlelik kısa, faydalı içgörüler yaz: hangi ürün öne çıktı, yarın için stok önerisi, performansa dair kısa yorum. Türkçe ve net konuş.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nepos.app",
        "X-Title": "Ne-Pos EOD",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: "Sen restoran yöneticisine günlük içgörü sunan deneyimli bir analitik asistansın. Halüsinasyon yapma, sadece verilen verileri yorumla." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });
    const data = await res.json();
    const summary = data?.choices?.[0]?.message?.content || "Özet üretilemedi.";

    return Response.json({ summary, stats });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});