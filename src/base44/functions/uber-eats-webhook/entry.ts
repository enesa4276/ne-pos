import { createClientFromRequest } from "npm:@base44/sdk";

// Uber Eats sends order notifications via webhook
// We store it as an Order entity with order_source = "uber_eats"

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("Uber Eats webhook received:", JSON.stringify(payload));

  // Uber Eats order payload structure
  const order = payload?.order || payload;

  // Find user by uber_eats_store_id
  const storeId = order?.store_id || order?.storeId || payload?.store_id;

  let ownerEmail: string | null = null;
  let webhookSecret: string | null = null;

  try {
    const users = await base44.asServiceRole.entities.User.list();
    const matchedUser = users.find((u: any) => u.uber_eats_store_id && u.uber_eats_store_id === String(storeId));
    if (matchedUser) {
      ownerEmail = matchedUser.email;
      webhookSecret = matchedUser.uber_eats_webhook_secret;
    }
  } catch (e) {
    console.error("Error finding user by store_id:", e);
  }

  // Validate secret if present
  const incomingSecret = req.headers.get("x-uber-signature") || req.headers.get("x-webhook-secret");
  if (webhookSecret && incomingSecret && incomingSecret !== webhookSecret) {
    return Response.json({ error: "Invalid secret" }, { status: 403 });
  }

  // Parse items — Uber Eats uses "cart" with "items"
  const cart = order?.cart || {};
  const lineItems = cart?.items || order?.items || [];

  const parsedItems = lineItems.map((item: any) => {
    const extras = (item?.selected_modifier_groups || item?.modifiers || []).flatMap((group: any) =>
      (group?.selected_items || group?.items || []).map((opt: any) => ({
        name: opt?.title || opt?.name || "",
        price: parseFloat(opt?.price?.unit_price || opt?.price || 0) / 100, // Uber Eats uses cents
      }))
    );
    const basePrice = parseFloat(item?.price?.unit_price || item?.base_price || 0) / 100;
    const qty = parseInt(item?.quantity || 1);
    const extrasTotal = extras.reduce((s: number, e: any) => s + e.price, 0);
    return {
      product_id: item?.id || "",
      product_name: item?.title || item?.name || "Unknown",
      base_price: basePrice,
      extras,
      quantity: qty,
      subtotal: (basePrice + extrasTotal) * qty,
    };
  });

  // Uber Eats totals are in cents
  const grandTotal = parseFloat(
    order?.payment?.charges?.total_charge?.total_amount ||
    order?.pricing?.total ||
    0
  ) / 100;

  const address = order?.delivery_address || order?.eater_info?.delivery_address || {};
  const deliveryAddress = [
    address?.street_address || address?.formatted_address,
    address?.city,
    address?.zip,
  ].filter(Boolean).join(", ");

  const eater = order?.eater || order?.eater_info || {};
  const externalOrderId = order?.id || order?.order_id || payload?.order_id;

  // Duplicate check
  if (externalOrderId) {
    try {
      const existing = await base44.asServiceRole.entities.Order.filter({ external_order_id: externalOrderId, order_source: "uber_eats" });
      if (existing && existing.length > 0) {
        console.log("Duplicate Uber Eats order, skipping:", externalOrderId);
        return Response.json({ success: true, duplicate: true });
      }
    } catch (e) {
      console.error("Duplicate check error:", e);
    }
  }

  const newOrder: any = {
    order_type: "takeaway",
    order_source: "uber_eats",
    status: "pending",
    external_order_id: externalOrderId,
    items: parsedItems,
    total: grandTotal,
    delivery_address: deliveryAddress || "",
    customer_name: eater?.name || eater?.first_name && `${eater.first_name} ${eater.last_name || ""}`.trim() || "",
    customer_phone: eater?.phone || "",
    customer_email: eater?.email || "",
    external_payment_status: "PAID", // Uber Eats always charges upfront
    external_payment_method: order?.payment?.payment_method || "uber_eats",
    sent_to_kitchen: false,
  };

  if (ownerEmail) {
    newOrder.created_by = ownerEmail;
  }

  try {
    await base44.asServiceRole.entities.Order.create(newOrder);
    console.log("Uber Eats order created for store:", storeId);
    return Response.json({ success: true });
  } catch (e: any) {
    console.error("Error creating order:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});