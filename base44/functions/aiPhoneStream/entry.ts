import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

/**
 * AI PHONE STREAM (WebSocket)
 * Twilio'dan gelen ses akışını alır, Deepgram'a STT için gönderir,
 * OpenRouter (Claude Haiku) ile yanıt üretir, Deepgram TTS ile sese çevirip Twilio'ya geri yollar.
 */
Deno.serve((req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected websocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");
  const callSid = url.searchParams.get("callSid");
  const fromNumber = url.searchParams.get("from") || "";

  let conversationHistory = [];
  let currentOrder = { items: [], total: 0 };
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let deepgramSocket = null;

  const base44 = createClientFromRequest(req);

  socket.onopen = () => {
    console.log("📞 WebSocket connected:", callSid);

    const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");
    if (!deepgramApiKey) {
      console.error("DEEPGRAM_API_KEY is not set");
      socket.close();
      return;
    }

    deepgramSocket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=nova-2&language=multi&punctuate=true&interim_results=false&encoding=mulaw&sample_rate=8000`,
      ["token", deepgramApiKey]
    );

    deepgramSocket.onopen = () => console.log("🎙️ Deepgram connected");

    deepgramSocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
        if (transcript && data.is_final) {
          await handleCustomerMessage(transcript);
        }
      } catch (e) {
        console.error("Deepgram message error:", e.message);
      }
    };

    deepgramSocket.onerror = (e) => console.error("Deepgram error:", e);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.event === "media" && deepgramSocket?.readyState === WebSocket.OPEN) {
        const audioPayload = message.media.payload;
        // Twilio's payload is base64 mu-law audio. Forward raw bytes to Deepgram.
        const binary = atob(audioPayload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        deepgramSocket.send(bytes);
      }

      if (message.event === "stop") {
        try { deepgramSocket?.close(); } catch (_) {}
        await finalizeCall();
      }
    } catch (e) {
      console.error("socket.onmessage error:", e.message);
    }
  };

  socket.onclose = async () => {
    try { deepgramSocket?.close(); } catch (_) {}
    await finalizeCall();
  };

  async function handleCustomerMessage(transcript) {
    console.log("👤 Customer:", transcript);

    const aiResponse = await getAIResponse(transcript);
    console.log("🤖 AI:", aiResponse.text);

    if (aiResponse.failed_to_understand) {
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        await transferToHuman();
        return;
      }
    } else {
      retryCount = 0;
    }

    if (aiResponse.order_completed) {
      await createOrderFromCall(aiResponse.customer_name || "", aiResponse.delivery_address || "");
    }

    // TTS
    const audioBase64 = await textToSpeech(aiResponse.text);
    if (audioBase64) {
      socket.send(JSON.stringify({
        event: "media",
        media: { payload: audioBase64 },
      }));
    }

    conversationHistory.push(
      { role: "user", content: transcript },
      { role: "assistant", content: aiResponse.text }
    );

    await updateTranscript(transcript, aiResponse.text);
  }

  async function getAIResponse(message) {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return { text: "Sorry, AI niet beschikbaar.", failed_to_understand: true };
    }

    const products = await base44.asServiceRole.entities.Product.filter({ tenant_id: tenantId });

    const productList = products.length
      ? products.map((p) => `- ${p.name}: €${p.base_price}`).join("\n")
      : "(Geen producten gevonden)";

    const systemPrompt = `Je bent een vriendelijke AI telefoonassistent voor een restaurant in België.

KRITIEKE REGELS — VOLG STRIKT:
1. JE MAG NOOIT producten of prijzen verzinnen. Gebruik UITSLUITEND items uit onderstaande lijst.
2. Als de klant iets vraagt dat NIET in de lijst staat, zeg eerlijk: "Sorry, dat hebben we niet op de menukaart."
3. JE MAG NOOIT korting beloven, JE MAG NOOIT bezorgtijden of openingstijden verzinnen, JE MAG NOOIT betaalmethoden bevestigen die je niet kent.
4. Bevestig ALTIJD elk item dat je toevoegt door het kort te herhalen.
5. Als je 3 opeenvolgende keren niet begrijpt wat de klant zegt, geef aan dat je doorverbindt naar een medewerker.
6. Vraag pas naam en adres NA bevestiging van de bestelling.
7. Antwoord kort, vriendelijk en duidelijk. Maximaal 2 zinnen per antwoord.

BESCHIKBARE PRODUCTEN (de enige bron van waarheid):
${productList}

Huidige bestelling: ${JSON.stringify(currentOrder)}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nepos.app",
        "X-Title": "Nepos AI Phone",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "add_item_to_order",
              description: "Voeg item toe aan bestelling",
              parameters: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  quantity: { type: "number" },
                },
                required: ["product_name", "quantity"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "complete_order",
              description: "Bestelling afronden",
              parameters: {
                type: "object",
                properties: {
                  customer_name: { type: "string" },
                  delivery_address: { type: "string" },
                },
              },
            },
          },
        ],
      }),
    });

    const data = await res.json();
    const aiMessage = data.choices?.[0]?.message || {};

    let orderUpdated = false;
    let orderCompleted = false;
    let failedToUnderstand = false;
    let customerName = "";
    let deliveryAddress = "";

    if (aiMessage.tool_calls) {
      for (const tc of aiMessage.tool_calls) {
        try {
          const args = JSON.parse(tc.function.arguments || "{}");
          if (tc.function.name === "add_item_to_order") {
            const product = products.find((p) =>
              p.name.toLowerCase() === (args.product_name || "").toLowerCase()
            );
            if (product) {
              currentOrder.items.push({
                product_id: product.id,
                product_name: product.name,
                quantity: args.quantity,
                base_price: product.base_price,
                subtotal: product.base_price * args.quantity,
                extras: [],
              });
              currentOrder.total += product.base_price * args.quantity;
              orderUpdated = true;
            }
          } else if (tc.function.name === "complete_order") {
            orderCompleted = true;
            customerName = args.customer_name || "";
            deliveryAddress = args.delivery_address || "";
          }
        } catch (e) {
          console.error("tool_call parse error:", e.message);
        }
      }
    }

    const text = aiMessage.content || "Ik heb dat niet helemaal begrepen, kunt u herhalen?";
    const lower = text.toLowerCase();
    if (lower.includes("begrijp") || lower.includes("niet zeker") || lower.includes("herhalen")) {
      failedToUnderstand = true;
    }

    return { text, order_updated: orderUpdated, order_completed: orderCompleted, failed_to_understand: failedToUnderstand, customer_name: customerName, delivery_address: deliveryAddress };
  }

  async function textToSpeech(text) {
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) return null;
    try {
      const res = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-nl&encoding=mulaw&sample_rate=8000", {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const buf = await res.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    } catch (e) {
      console.error("TTS error:", e.message);
      return null;
    }
  }

  async function transferToHuman() {
    console.log("⚠️ 3x anlamadı, insana aktarılıyor");
    try {
      const calls = await base44.asServiceRole.entities.PhoneCall.filter({ call_sid: callSid });
      if (calls[0]) {
        await base44.asServiceRole.entities.PhoneCall.update(calls[0].id, {
          status: "transferred_to_human",
          transferred_to_human: true,
          transfer_reason: "failed_understanding",
        });
      }
    } catch (e) { console.error("transfer update error:", e.message); }
    try { socket.close(); } catch (_) {}
  }

  async function createOrderFromCall(customerName, deliveryAddress) {
    try {
      const order = await base44.asServiceRole.entities.Order.create({
        tenant_id: tenantId,
        order_type: "phone",
        order_source: "ai_phone",
        status: "pending",
        items: currentOrder.items,
        total: currentOrder.total,
        customer_name: customerName || "AI Phone Order",
        customer_phone: fromNumber,
        delivery_address: deliveryAddress || "",
        notes: `AI Phone - Call SID: ${callSid}`,
        sent_to_kitchen: false,
      });

      const calls = await base44.asServiceRole.entities.PhoneCall.filter({ call_sid: callSid });
      if (calls[0]) {
        await base44.asServiceRole.entities.PhoneCall.update(calls[0].id, {
          order_id: order.id,
          order_data: currentOrder,
          status: "completed",
        });
      }
      console.log("✅ Order created from call:", order.id);
    } catch (e) {
      console.error("createOrder error:", e.message);
    }
  }

  async function updateTranscript(customerText, aiText) {
    try {
      const calls = await base44.asServiceRole.entities.PhoneCall.filter({ call_sid: callSid });
      if (!calls[0]) return;
      const newTranscript = [
        ...(calls[0].transcript || []),
        { speaker: "customer", text: customerText, timestamp: new Date().toISOString() },
        { speaker: "ai", text: aiText, timestamp: new Date().toISOString() },
      ];
      await base44.asServiceRole.entities.PhoneCall.update(calls[0].id, { transcript: newTranscript });
    } catch (e) { console.error("transcript update error:", e.message); }
  }

  async function finalizeCall() {
    try {
      const calls = await base44.asServiceRole.entities.PhoneCall.filter({ call_sid: callSid });
      if (calls[0] && !calls[0].ended_date) {
        const endedDate = new Date().toISOString();
        const startedAt = new Date(calls[0].created_date).getTime();
        const duration = Math.round((Date.now() - startedAt) / 1000);
        await base44.asServiceRole.entities.PhoneCall.update(calls[0].id, {
          ended_date: endedDate,
          duration_seconds: duration,
          status: calls[0].status === "in_progress" ? "completed" : calls[0].status,
        });
      }
    } catch (e) { console.error("finalizeCall error:", e.message); }
  }

  return response;
});