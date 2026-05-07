import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function safeFloat(v, fb = 0) { const n = parseFloat(v); return Number.isFinite(n) ? n : fb; }
function safeInt(v, fb = 1) { const n = parseInt(v); return Number.isFinite(n) && n > 0 ? n : fb; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  let payload;
  try {
    const text = await req.text();
    if (!text?.trim()) return Response.json({ success: true, note: "empty" });
    payload = JSON.parse(text);
  } catch (e) {
    console.error("[takeawayWebhook] parse error:", e.message);
    return Response.json({ success: false, error: "invalid_json" });
  }

  try {
    const base44 = createClientFromRequest(req);
    const order = payload?.order || payload || {};
    const storeId = order?.restaurantId || order?.storeId || payload?.restaurantId || payload?.storeId;

    let ownerEmail = null;
    let webhookSecret = null;
    let tenantId = null;

    const tenants = await base44.asServiceRole.entities.Tenant.filter({}).catch(() => []);
    const tenant = tenants.find((t) => t.settings?.takeaway_store_id === String(storeId));
    if (tenant) {
      tenantId = tenant.tenant_id;
      webhookSecret = tenant.settings?.takeaway_webhook_secret;
    }
    if (!tenantId) {
      const users = await base44.asServiceRole.entities.User.list().catch(() => []);
      const matchedUser = users.find((u) => u.takeaway_store_id === String(storeId));
      if (matchedUser) {
        ownerEmail = matchedUser.email;
        webhookSecret = matchedUser.takeaway_webhook_secret;
        tenantId = matchedUser.tenant_id || null;
      }
    }

    const incomingSecret = req.headers.get("x-takeaway-secret") || req.headers.get("x-webhook-secret");
    if (webhookSecret && incomingSecret && incomingSecret !== webhookSecret) {
      console.warn("[takeawayWebhook] invalid secret for store:", storeId);
      return Response.json({ error: "Invalid secret" }, { status: 403 });
    }

    const externalOrderId = order?.orderId || order?.id || payload?.orderId;
    if (externalOrderId) {
      const existing = await base44.asServiceRole.entities.Order.filter({
        external_order_id: String(externalOrderId), order_source: "takeaway_com",
      }).catch(() => []);
      if (existing?.length) return Response.json({ success: true, duplicate: true });
    }

    const lineItems = Array.isArray(order?.items) ? order.items : (Array.isArray(order?.products) ? order.products : []);
    const parsedItems = lineItems.map((item) => {
      try {
        const extras = (item?.options || item?.choices || item?.extras || []).map((opt) => ({
          name: opt?.name || opt?.description || "", price: safeFloat(opt?.price || opt?.unitPrice, 0),
        }));
        const basePrice = safeFloat(item?.unitPrice || item?.price, 0);
        const qty = safeInt(item?.count || item?.quantity, 1);
        const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
        return {
          product_id: item?.productId || item?.id || "",
          product_name: item?.name || item?.description || "Unknown",
          base_price: basePrice, extras, quantity: qty,
          subtotal: parseFloat(((basePrice + extrasTotal) * qty).toFixed(2)),
        };
      } catch (e) { console.error("[takeawayWebhook] item parse:", e.message); return null; }
    }).filter(Boolean);

    const grandTotal = safeFloat(order?.totalPrice || order?.total?.amount || order?.total, parsedItems.reduce((s, i) => s + i.subtotal, 0));
    const address = order?.deliveryAddress || order?.address || {};
    const deliveryAddress = [address?.street, address?.streetNumber, address?.city, address?.postalCode].filter(Boolean).join(", ");
    const customer = order?.customer || order?.contact || {};

    const newOrder = {
      tenant_id: tenantId || undefined,
      order_type: "takeaway",
      order_source: "takeaway_com",
      status: "pending",
      external_order_id: externalOrderId ? String(externalOrderId) : undefined,
      items: parsedItems,
      total: grandTotal,
      delivery_address: deliveryAddress || "",
      customer_name: customer?.name || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "",
      customer_phone: customer?.phoneNumber || customer?.phone || "",
      customer_email: customer?.email || "",
      external_payment_status: order?.paymentStatus || (order?.isPaid ? "PAID" : "UNPAID"),
      external_payment_method: order?.paymentMethod || order?.payment?.method || "",
      sent_to_kitchen: false,
    };
    if (ownerEmail) newOrder.created_by = ownerEmail;

    const created = await base44.asServiceRole.entities.Order.create(newOrder);
    console.log("[takeawayWebhook] created:", created?.id);
    return Response.json({ success: true, id: created?.id });
  } catch (e) {
    console.error("[takeawayWebhook] fatal:", e.message);
    return Response.json({ success: false, error: e.message });
  }
});