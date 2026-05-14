// Fotoğraftan menü çıkarma (vision). OpenRouter (Claude 3.5 Sonnet vision) kullanılır.
// Frontend bunu aiInvoke yerine doğrudan çağırır.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { image_urls = [] } = await req.json() || {};
    if (!Array.isArray(image_urls) || image_urls.length === 0) {
      return Response.json({ error: "image_urls required" }, { status: 400 });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return Response.json({ error: "OPENROUTER_API_KEY tanımlı değil" }, { status: 500 });

    const userContent = [
      {
        type: "text",
        text:
          'Bu menü fotoğraflarındaki TÜM ürünleri çıkar. SADECE geçerli JSON döndür, başka hiçbir açıklama yazma.\n' +
          'Format: {"items":[{"name":"...","price":0.00,"category":"...","extras":[{"name":"Boy: Büyük","price":2.00}]}]}\n' +
          '- Fiyatları sayı olarak ver (€ işareti yok).\n' +
          '- Boy/porsiyon (örn. Küçük/Orta/Büyük) ve sos/ek malzeme seçeneklerini "extras" altına EKLE.\n' +
          '- Ekstra fiyat farkları ana fiyatın üstüne eklenecek delta olarak yaz; ücretsiz ise 0.\n' +
          '- Aynı ürün birden fazla boyda görünüyorsa: bir ürün + extras: [{Küçük, 0},{Orta, 1.5},{Büyük, 3}].\n' +
          '- Kategori bilgisi yoksa "Diğer" yaz. Türkçe/Hollandaca/İngilizce/Fransızca menüleri destekle.',
      },
      ...image_urls.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nepos.app",
        "X-Title": "Ne-Pos Menu Import",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: "You are a precise menu OCR assistant. Output strictly valid JSON only." },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `OpenRouter ${res.status}`);
    const text = data?.choices?.[0]?.message?.content || "";

    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});