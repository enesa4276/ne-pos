import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

/**
 * MENUPRO WEBHOOK
 * Belçika'da yaygın kullanılan online sipariş platformu
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("📱 Menupro webhook:", JSON.stringify(payload).slice(0, 500));

  // Tenant tarafından (Tenant.settings.menupro_restaurant_id) veya User.menupro_restaurant_id ile bul
  let tenantId = null;
  let ownerEmail = null;

  const tenants = await base44.asServiceRole.entities.Tenant.list();
  const matchedTenant = tenants.find((t) => t.settings?.menupro_restaurant_id === payload.restaurant_id);
  if (matchedTenant) {
    tenantId = matchedTenant.tenant_id;
    ownerEmail = matchedTenant.owner_email;
  } else {
    const users = await base44.asServiceRole.entities.User.list();
    const owner = users.find((u) => u.menupro_restaurant_id === payload.restaurant_id);
    if (owner) {
      ownerEmail = owner.email;
      tenantId = owner.tenant_id || null;
    }
  }

  // Duplicate check
  const existing = await base44.asServiceRole.entities.Order.filter({
    external_order_id: payload.order_id,
    order_source: "menupro",
  });
  if (existing.length > 0) {
    return Response.json({ success: true, duplicate: true });
  }

  const items = (payload.items || []).map((item) => {
    const price = parseFloat(item.price || 0);
    const qty = parseInt(item.quantity || 1);
    return {
      product_id: item.id || "",
      product_name: item.name || "Unknown",
      base_price: price,
      quantity: qty,
      extras: item.options || [],
      subtotal: price * qty,
    };
  });

  const orderPayload = {
    order_type: payload.type === "pickup" ? "takeaway" : "delivery",
    order_source: "menupro",
    status: "pending",
    external_order_id: payload.order_id,
    items,
    total: parseFloat(payload.total || 0),
    customer_name: payload.customer?.name || "Menupro Order",
    customer_phone: payload.customer?.phone || "",
    customer_email: payload.customer?.email || "",
    delivery_address: payload.customer?.address || "",
    notes: payload.notes || "",
    sent_to_kitchen: false,
  };
  if (tenantId) orderPayload.tenant_id = tenantId;
  if (ownerEmail) orderPayload.created_by = ownerEmail;

  const order = await base44.asServiceRole.entities.Order.create(orderPayload);

  console.log("✅ Menupro order created:", order.id);
  return Response.json({ success: true, order_id: order.id });
});