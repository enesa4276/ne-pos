// PUBLIC API — Harici AI ses mikroservisi için
// POST /functions/createPhoneCall
// X-Api-Key: {SystemConfig.nepos_api_key}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function getApiKey(svc) {
  const configs = await svc.entities.SystemConfig.filter({ key: "nepos_api_key" });
  return configs[0]?.value || null;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

    const body = await req.json().catch(() => ({}));
    const apiKey = req.headers.get("x-api-key");
    const { tenant_id, call_sid, from_number, to_number } = body;

    if (!tenant_id || !call_sid) {
      return Response.json({ error: "tenant_id and call_sid required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // API key doğrulama
    const expectedKey = await getApiKey(svc);
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Idempotent: aynı call_sid varsa tekrar yaratma
    const existing = await svc.entities.PhoneCall.filter({ call_sid });
    if (existing[0]) {
      return Response.json({ success: true, id: existing[0].id, existed: true });
    }

    const call = await svc.entities.PhoneCall.create({
      tenant_id,
      call_sid,
      from_number: from_number || "",
      to_number: to_number || "",
      status: "ringing",
      transcript: [],
    });

    return Response.json({ success: true, id: call.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});