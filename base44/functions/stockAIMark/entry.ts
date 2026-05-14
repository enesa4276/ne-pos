// Stok AI: Kullanıcının doğal dil metinini ve mevcut ürün listesini Claude'a gönderir,
// hangi ürünlerin tükendiğini + nedenini JSON olarak alır.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { text, product_names = [] } = await req.json() || {};
    if (!text || !Array.isArray(product_names)) {
      return Response.json({ error: "text and product_names required" }, { status: 400 });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY veya OPENROUTER_API_KEY tanımlı değil" }, { status: 500 });
    }

    const systemPrompt = `Sen bir restoran stok yönetimi asistanısın. Restoran çalışanının yazdığı doğal dil metinini analiz et ve hangi ürünlerin tükendiğini/satışa kapatılması gerektiğini çıkar.

Mevcut menüdeki ürünler:
${product_names.map((n) => `- ${n}`).join('\n')}

Görevin:
1. Metindeki tükenme/bozulma/eksiklik bildirimlerini tespit et.
2. Bunları mevcut menü ürünleriyle eşleştir (TAM ürün adını döndür — menüde nasıl yazıyorsa).
3. Her ürün için nedeni kısa yaz (örn: "tükendi", "fırın bozuk", "kalmadı", "et yok").
4. Eşleşen ürün bulunamasa bile metindeki ham ismi döndür (eşleşme uygulamada kontrol edilir).

ÇIKTI FORMATI: SADECE şu formatta JSON döndür, başka açıklama ekleme:
{"matches":[{"product_name":"...","reason":"..."}]}`;

    // OpenRouter üzerinden Claude (kullanıcının halihazırda key'i var)
    const useOpenRouter = !!Deno.env.get("OPENROUTER_API_KEY");
    let responseText;
    if (useOpenRouter) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nepos.app",
          "X-Title": "Ne-Pos Stock AI",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `OpenRouter ${res.status}`);
      responseText = data?.choices?.[0]?.message?.content || "";
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          system: systemPrompt,
          messages: [{ role: "user", content: text }],
          max_tokens: 500,
          temperature: 0.2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
      responseText = data?.content?.[0]?.text || "";
    }

    // JSON ayıkla (model bazen ```json ile sarabilir)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI cevabından JSON ayıklanamadı", raw: responseText }, { status: 502 });
    }
    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch (e) { return Response.json({ error: "JSON parse hatası: " + e.message }, { status: 502 }); }

    return Response.json({ matches: parsed.matches || [] });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});