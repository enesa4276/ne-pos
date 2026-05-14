// PUBLIC API: Harici AI sistemi PhoneCall kaydını günceller (status, transcript, süre).
// X-Api-Key header gerekir. call_sid ile kaydı bulur; yoksa oluşturur.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

    const body = await req.json().catch(() => ({}));
    const apiKey = req.headers.get("x-api-key") || body.api_key;
    const {
      call_sid, tenant_id, status, transcript, duration_seconds,
      from_number, to_number, ai_retry_count, transferred_to_human,
      transfer_reason, cost_twilio, cost_ai, cost_total, ended_date,
    } = body;

    if (!call_sid) return Response.json({ error: "call_sid required" }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Tenant + API key doğrulama
    let tenant;
    if (tenant_id) {
      const tenants = await svc.entities.Tenant.filter({ tenant_id });
      tenant = tenants[0];
    }
    if (!tenant) return Response.json({ error: "Restaurant not found" }, { status: 404 });
    const expectedKey = tenant.settings?.api_key;
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // PhoneCall var mı? — yoksa oluştur (status="ringing" gibi ilk update için).
    const calls = await svc.entities.PhoneCall.filter({ call_sid });
    const existing = calls[0];

    const patch = {};
    if (status !== undefined) patch.status = status;
    if (Array.isArray(transcript)) patch.transcript = transcript;
    if (duration_seconds !== undefined) patch.duration_seconds = Number(duration_seconds) || 0;
    if (ai_retry_count !== undefined) patch.ai_retry_count = Number(ai_retry_count) || 0;
    if (transferred_to_human !== undefined) patch.transferred_to_human = !!transferred_to_human;
    if (transfer_reason !== undefined) patch.transfer_reason = transfer_reason;
    if (cost_twilio !== undefined) patch.cost_twilio = Number(cost_twilio) || 0;
    if (cost_ai !== undefined) patch.cost_ai = Number(cost_ai) || 0;
    if (cost_total !== undefined) patch.cost_total = Number(cost_total) || 0;
    if (ended_date) patch.ended_date = ended_date;

    let result;
    if (existing) {
      result = await svc.entities.PhoneCall.update(existing.id, patch);
    } else {
      result = await svc.entities.PhoneCall.create({
        tenant_id,
        call_sid,
        from_number: from_number || "",
        to_number: to_number || "",
        ...patch,
      });
    }

    return Response.json({ success: true, id: result.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});