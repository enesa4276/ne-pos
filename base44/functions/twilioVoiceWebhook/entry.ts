import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

/**
 * TWILIO VOICE WEBHOOK
 * Twilio gelen aramaları buraya yönlendirir.
 * AI telefon aktif ise stream'i başlatır, değilse fallback'e yönlendirir.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  let callSid, from, to;
  try {
    if (req.method === "POST") {
      const formData = await req.formData();
      callSid = formData.get("CallSid");
      from = formData.get("From");
      to = formData.get("To");
    } else {
      const url = new URL(req.url);
      callSid = url.searchParams.get("CallSid");
      from = url.searchParams.get("From");
      to = url.searchParams.get("To");
    }
  } catch (e) {
    console.error("Form parse error:", e.message);
  }

  console.log("📞 Gelen arama:", { callSid, from, to });

  // Numaradan tenant bul
  const tenants = await base44.asServiceRole.entities.Tenant.filter({ twilio_phone_number: to });
  const tenant = tenants[0];

  if (!tenant) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="nl-BE">Sorry, dit nummer is niet actief.</Say>
  <Hangup/>
</Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  const aiEnabled = tenant.features_enabled?.ai_phone || false;
  const limitReached = (tenant.total_ai_calls || 0) >= (tenant.feature_limits?.max_ai_calls_per_month || 100);

  if (!aiEnabled || limitReached) {
    const fallbackPhone = tenant.settings?.fallback_phone || tenant.phone || "";
    if (!fallbackPhone) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="nl-BE">Sorry, we kunnen u nu niet helpen. Probeer later opnieuw.</Say>
  <Hangup/>
</Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30">${fallbackPhone}</Dial>
</Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // PhoneCall kaydı oluştur
  await base44.asServiceRole.entities.PhoneCall.create({
    tenant_id: tenant.tenant_id,
    call_sid: callSid,
    from_number: from,
    to_number: to,
    status: "in_progress",
    transcript: [],
    ai_retry_count: 0,
    transferred_to_human: false,
  });

  // AI call sayısını artır
  await base44.asServiceRole.entities.Tenant.update(tenant.id, {
    total_ai_calls: (tenant.total_ai_calls || 0) + 1,
  });

  const host = req.headers.get("host");
  const streamUrl = `wss://${host}/functions/aiPhoneStream?tenantId=${tenant.tenant_id}&callSid=${callSid}`;

  const language = tenant.settings?.default_language || "nl-BE";
  const greetings = {
    "nl-BE": "Hallo! Ik ben de AI-assistent. Hoe kan ik u helpen?",
    "fr-BE": "Bonjour! Je suis l'assistant IA. Comment puis-je vous aider?",
    "en-US": "Hello! I am the AI assistant. How can I help you?",
  };
  const greeting = greetings[language] || greetings["nl-BE"];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${language}">${greeting}</Say>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="tenantId" value="${tenant.tenant_id}"/>
      <Parameter name="callSid" value="${callSid}"/>
    </Stream>
  </Connect>
</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
});