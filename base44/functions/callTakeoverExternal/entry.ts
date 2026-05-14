// Harici ses sunucusuna handoff isteği gönderir ve PhoneCall kaydını işaretler.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { call_sid, tenant_id } = await req.json() || {};
    if (!call_sid || !tenant_id) {
      return Response.json({ error: "call_sid and tenant_id required" }, { status: 400 });
    }

    // Tenant'tan voice_server_url'i al, yoksa env'den
    const tenants = await base44.asServiceRole.entities.Tenant.filter({ tenant_id });
    const tenant = tenants[0];
    const voiceUrl = tenant?.settings?.voice_server_url;

    if (!voiceUrl) {
      return Response.json({ error: "Tenant ayarlarında voice_server_url tanımlı değil. Süper Admin → Tenant → Entegrasyonlar → AI Telefon" }, { status: 500 });
    }

    // Harici ses sunucusuna handoff
    const res = await fetch(`${voiceUrl.replace(/\/+$/, '')}/api/voice/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_sid, tenant_id }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return Response.json({ error: `Harici sunucu hatası: ${res.status} ${errText}` }, { status: 502 });
    }

    // PhoneCall kaydını işaretle
    const calls = await base44.asServiceRole.entities.PhoneCall.filter({ call_sid });
    const call = calls[0];
    if (call) {
      await base44.asServiceRole.entities.PhoneCall.update(call.id, {
        transferred_to_human: true,
        transfer_reason: "manual_takeover",
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});