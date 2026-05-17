// PUBLIC API — Harici AI ses mikroservisi için
// POST /functions/updatePhoneCall
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
    const {
      call_sid, tenant_id, status, transcript, duration_seconds,
      from_number, to_number, order_data,
      transferred_to_human, transfer_reason,
      cost_twilio, cost_ai, cost_total, ended_date,
    } = body;

    if (!call_sid) return Response.json({ error: "call_sid required" }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // API key doğrulama
    const expectedKey = await getApiKey(svc);
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patch = {};
    if (status !== undefined) patch.status = status;
    if (Array.isArray(transcript)) patch.transcript = transcript;
    if (duration_seconds !== undefined) patch.duration_seconds = Number(duration_seconds) || 0;
    if (transferred_to_human !== undefined) patch.transferred_to_human = !!transferred_to_human;
    if (transfer_reason !== undefined) patch.transfer_reason = transfer_reason;
    if (order_data !== undefined) patch.order_data = order_data;
    if (cost_twilio !== undefined) patch.cost_twilio = Number(cost_twilio) || 0;
    if (cost_ai !== undefined) patch.cost_ai = Number(cost_ai) || 0;
    if (cost_total !== undefined) patch.cost_total = Number(cost_total) || 0;
    if (ended_date) patch.ended_date = ended_date;

    const calls = await svc.entities.PhoneCall.filter({ call_sid });
    let result;
    if (calls[0]) {
      result = await svc.entities.PhoneCall.update(calls[0].id, patch);
    } else {
      // Yoksa oluştur (fallback)
      result = await svc.entities.PhoneCall.create({
        tenant_id: tenant_id || "",
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