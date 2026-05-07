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
    console.error("[uberEatsWebhook] parse:", e.message);
    return Response.json({ success: false, error: "invalid_json" });
  }

  try {
    const base44 = createClientFromRequest(req);
    const order = payload?.order || payload || {};
    const storeId = order?.store_id || order?.storeId || payload?.store_id;

    let ownerEmail = null;
    let webhookSecret = null;
    let tenantId = null;

    const tenants = await base44.asServiceRole.entities.Tenant.filter({}).catch(() => []);
    const tenant = tenants.find((t) => t.settings?.uber_eats_store_id === String(storeId));
    if (tenant) { tenantId = tenant.tenant_id; webhookSecret = tenant.settings?.uber_eats_webhook_secret; }

    if (!tenantId) {
      const users = await base44.asServiceRole.entities.User.list().catch(() => []);
      const matchedUser = users.find((u) => u.uber_eats_store_id === String(storeId));
      if (matchedUser) {
        ownerEmail = matchedUser.email;
        webhookSecret = matchedUser.uber_eats_webhook_secret;
        tenantId = matchedUser.tenant_id || null;
      }
    }

    const incomingSecret = req.headers.get("x-uber-signature") || req.headers.get("x-webhook-secret");
    if (webhookSecret && incomingSecret && incomingSecret !== webhookSecret) {
      console.warn("[uberEatsWebhook] invalid secret");
      return Response.json({ error: "Invalid secret" }, { status: 403 });
    }

    const externalOrderId = order?.id || order?.order_id || payload?.order_id;
    if (externalOrderId) {
      const existing = await base44.asServiceRole.entities.Order.filter({
        external_order_id: String(externalOrderId), order_source: "uber_eats",
      }).catch(() => []);
      if (existing?.length) return Response.json({ success: true, duplicate: true });
    }

    const cart = order?.cart || {};
    const lineItems = Array.isArray(cart?.items) ? cart.items : (Array.isArray(order?.items) ? order.items : []);
    const parsedItems = lineItems.map((item) => {
      try {
        const extras = (item?.selected_modifier_groups || item?.modifiers || []).flatMap((group) =>
          (group?.selected_items || group?.items || []).map((opt) => ({
            name: opt?.title || opt?.name || "",
            price: safeFloat(opt?.price?.unit_price || opt?.price, 0) / 100,
          })),
        );
        const basePrice = safeFloat(item?.price?.unit_price || item?.base_price, 0) / 100;
        const qty = safeInt(item?.quantity, 1);
        const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
        return {
          product_id: item?.id || "",
          product_name: item?.title || item?.name || "Unknown",
          base_price: basePrice, extras, quantity: qty,
          subtotal: parseFloat(((basePrice + extrasTotal) * qty).toFixed(2)),
        };
      } catch (e) { console.error("[uberEatsWebhook] item:", e.message); return null; }
    }).filter(Boolean);

    const grandTotal = safeFloat(order?.payment?.charges?.total_charge?.total_amount || order?.pricing?.total, 0) / 100
      || parsedItems.reduce((s, i) => s + i.subtotal, 0);

    const address = order?.delivery_address || order?.eater_info?.delivery_address || {};
    const deliveryAddress = [address?.street_address || address?.formatted_address, address?.city, address?.zip].filter(Boolean).join(", ");
    const eater = order?.eater || order?.eater_info || {};
    const eaterName = eater?.name || (eater?.first_name ? `${eater.first_name} ${eater.last_name || ""}`.trim() : "");

    const newOrder = {
      tenant_id: tenantId || undefined,
      order_type: "takeaway",
      order_source: "uber_eats",
      status: "pending",
      external_order_id: externalOrderId ? String(externalOrderId) : undefined,
      items: parsedItems,
      total: grandTotal,
      delivery_address: deliveryAddress || "",
      customer_name: eaterName,
      customer_phone: eater?.phone || "",
      customer_email: eater?.email || "",
      external_payment_status: "PAID",
      external_payment_method: order?.payment?.payment_method || "uber_eats",
      sent_to_kitchen: false,
    };
    if (ownerEmail) newOrder.created_by = ownerEmail;

    const created = await base44.asServiceRole.entities.Order.create(newOrder);
    console.log("[uberEatsWebhook] created:", created?.id);
    return Response.json({ success: true, id: created?.id });
  } catch (e) {
    console.error("[uberEatsWebhook] fatal:", e.message);
    return Response.json({ success: false, error: e.message });
  }
});