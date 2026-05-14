// PUBLIC API: Harici AI sistemi sipariş tamamlanınca buraya POST atar.
// X-Api-Key header (Tenant.settings.api_key) gerekir.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

    const body = await req.json().catch(() => ({}));
    const apiKey = req.headers.get("x-api-key") || body.api_key;
    const { tenant_id, call_sid, customer_phone, customer_name, items, total, notes } = body;

    if (!tenant_id || !Array.isArray(items)) {
      return Response.json({ error: "tenant_id and items required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // API key kontrolü
    const tenants = await svc.entities.Tenant.filter({ tenant_id });
    const tenant = tenants[0];
    if (!tenant) return Response.json({ error: "Tenant bulunamadı" }, { status: 404 });
    const expectedKey = tenant.settings?.api_key;
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Sipariş oluştur
    const order = await svc.entities.Order.create({
      tenant_id,
      order_type: "phone",
      order_source: "ai_phone",
      status: "pending",
      items,
      total: Number(total || 0),
      customer_phone: customer_phone || "",
      customer_name: customer_name || "",
      notes: notes || "",
    });

    // PhoneCall ile bağla
    if (call_sid) {
      const calls = await svc.entities.PhoneCall.filter({ call_sid });
      if (calls[0]) {
        await svc.entities.PhoneCall.update(calls[0].id, { order_id: order.id });
      }
    }

    return Response.json({ ok: true, order_id: order.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});