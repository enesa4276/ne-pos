// PUBLIC API — Harici AI ses mikroservisi için
// POST /functions/createPhoneOrder
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
    const { tenant_id, call_sid, customer_phone, customer_name, delivery_address, items, total, notes } = body;

    if (!tenant_id || !Array.isArray(items)) {
      return Response.json({ error: "tenant_id and items required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // API key doğrulama
    const expectedKey = await getApiKey(svc);
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tenant kontrolü
    const tenants = await svc.entities.Tenant.filter({ tenant_id });
    const tenant = tenants[0];
    if (!tenant) return Response.json({ error: "Restaurant not found" }, { status: 404 });

    // Sipariş oluştur
    const order = await svc.entities.Order.create({
      tenant_id,
      order_type: "phone",
      order_source: "ai_phone",
      status: "pending",
      sent_to_kitchen: false,
      items,
      total: Number(total || 0),
      customer_phone: customer_phone || "",
      customer_name: customer_name || "",
      delivery_address: delivery_address || "",
      notes: notes || "",
    });

    // PhoneCall ile bağla
    if (call_sid) {
      const calls = await svc.entities.PhoneCall.filter({ call_sid });
      if (calls[0]) {
        await svc.entities.PhoneCall.update(calls[0].id, { order_id: order.id });
      }
    }

    // Customer güncelle veya oluştur
    if (customer_phone) {
      const customers = await svc.entities.Customer.filter({ tenant_id, phone: customer_phone });
      const now = new Date().toISOString();
      if (customers[0]) {
        const c = customers[0];
        await svc.entities.Customer.update(c.id, {
          total_orders: (c.total_orders || 0) + 1,
          total_spent: (c.total_spent || 0) + Number(total || 0),
          last_order_date: now,
          name: c.name || customer_name || "",
        });
      } else {
        await svc.entities.Customer.create({
          tenant_id,
          phone: customer_phone,
          name: customer_name || "",
          total_orders: 1,
          total_spent: Number(total || 0),
          last_order_date: now,
          source: "ai_phone",
        });
      }
    }

    return Response.json({ success: true, order_id: order.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});