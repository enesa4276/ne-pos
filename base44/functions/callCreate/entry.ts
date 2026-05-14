// PUBLIC API: Harici AI sistemi yeni bir telefon çağrısı başladığında bu endpoint'i çağırır.
// POST /api/calls/create
// X-Api-Key header (Tenant.settings.api_key) gerekir.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const apiKey = req.headers.get("x-api-key") || body.api_key;
    const { tenant_id, call_sid, from_number, to_number } = body;

    if (!tenant_id || !call_sid) {
      return Response.json({ error: "tenant_id and call_sid required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Tenant + API key doğrulama
    const tenants = await svc.entities.Tenant.filter({ tenant_id });
    const tenant = tenants[0];
    if (!tenant) return Response.json({ error: "Restaurant not found" }, { status: 404 });
    const expectedKey = tenant.settings?.api_key;
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Aynı call_sid varsa tekrar yaratma — idempotent davran.
    const existing = await svc.entities.PhoneCall.filter({ call_sid });
    if (existing[0]) {
      return Response.json({ success: true, call_id: existing[0].id, existed: true });
    }

    const call = await svc.entities.PhoneCall.create({
      tenant_id,
      call_sid,
      from_number: from_number || "",
      to_number: to_number || tenant.twilio_phone_number || "",
      status: "ringing",
      transcript: [],
    });

    return Response.json({ success: true, call_id: call.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});