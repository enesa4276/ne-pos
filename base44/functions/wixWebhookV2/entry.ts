import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

/**
 * WIX WEBHOOKS V2 - Resmi API
 * Setup: https://dev.wix.com/docs/rest/articles/getting-started/webhooks
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  const signature = req.headers.get("x-wix-webhook-signature");
  const timestamp = req.headers.get("x-wix-timestamp");
  const body = await req.text();

  console.log("=== WIX WEBHOOK V2 ===");
  console.log("Timestamp:", timestamp);
  console.log("Signature present:", !!signature);
  console.log("Body length:", body.length);

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    console.error("JSON parse error:", e.message);
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("Event type:", payload.eventType);
  console.log("Instance ID:", payload.instanceId);

  if (payload.eventType === "ecom/v1/orders/created" || payload.eventType?.includes("orders/created")) {
    return await handleOrderCreated(base44, payload);
  } else if (payload.eventType === "ecom/v1/orders/updated" || payload.eventType?.includes("orders/updated")) {
    return await handleOrderUpdated(base44, payload);
  }

  console.log("Event not handled:", payload.eventType);
  return new Response(JSON.stringify({ message: "Event not handled" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function handleOrderCreated(base44, payload) {
  const orderData = payload.data;
  const wixOrderId = orderData?.id;
  const instanceId = payload.instanceId;

  if (!wixOrderId) {
    console.log("No order ID in payload");
    return new Response(JSON.stringify({ error: "No order ID" }), { status: 200 });
  }

  console.log("📦 Creating order:", wixOrderId);

  const existing = await base44.asServiceRole.entities.Order.filter({
    wix_order_id: wixOrderId,
  });
  if (existing?.length > 0) {
    console.log("⚠️ Duplicate, skipping");
    return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
  }

  const parsedItems = (orderData.lineItems || []).map((item) => {
    const basePrice = parseFloat(item.price?.amount || 0);
    const quantity = parseInt(item.quantity || 1);
    const extras = (item.descriptionLines || [])
      .map((d) => ({
        name: d.name?.original || d.plainText?.original || "",
        price: 0,
      }))
      .filter((e) => e.name);

    return {
      product_id: item.catalogReference?.catalogItemId || item.id || "",
      product_name: item.productName?.original || item.productName?.translated || "Unknown",
      base_price: basePrice,
      quantity,
      extras,
      subtotal: parseFloat(item.totalPrice?.amount || 0) || basePrice * quantity,
    };
  });

  const buyer = orderData.buyerInfo || {};
  const shippingInfo = orderData.shippingInfo?.logistics?.shippingDestination;
  const contact = shippingInfo?.contactDetails || {};
  const address = shippingInfo?.address || {};

  const customerName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || buyer.email || "";
  const deliveryAddress = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  const total = parseFloat(orderData.priceSummary?.total?.amount || 0);
  const orderType = orderData.shippingInfo?.logistics?.deliveryOption === "PICKUP" ? "takeaway" : "delivery";

  let status = "pending";
  if (orderData.paymentStatus === "PAID") {
    status = "accepted";
  }

  // Find owner by instance ID
  const users = await base44.asServiceRole.entities.User.list();
  const owner =
    users.find((u) => u.wix_site_id === instanceId) || users.find((u) => u.wix_site_id);

  const orderPayload = {
    order_type: orderType,
    order_source: "wix",
    status,
    wix_order_id: wixOrderId,
    wix_site_id: instanceId,
    items: parsedItems,
    total,
    delivery_address: deliveryAddress,
    customer_name: customerName,
    customer_phone: contact.phone || buyer.phone || "",
    customer_email: buyer.email || "",
    payment_status_wix: orderData.paymentStatus || "",
    payment_method_wix: "",
    fulfillment_status: orderData.fulfillmentStatus || "",
    sent_to_kitchen: false,
    notes: orderData.buyerNote || "",
  };
  if (owner?.email) orderPayload.created_by = owner.email;
  if (owner?.tenant_id) orderPayload.tenant_id = owner.tenant_id;

  const order = await base44.asServiceRole.entities.Order.create(orderPayload);

  console.log("✅ Order created:", order.id);
  return new Response(JSON.stringify({ success: true, orderId: order.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleOrderUpdated(base44, payload) {
  const orderData = payload.data;
  const wixOrderId = orderData?.id;

  if (!wixOrderId) {
    return new Response(JSON.stringify({ error: "No order ID" }), { status: 200 });
  }

  console.log("🔄 Updating order:", wixOrderId);

  const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
  if (!existing || existing.length === 0) {
    console.log("⚠️ Order not found, creating new");
    return await handleOrderCreated(base44, payload);
  }

  let status = existing[0].status;
  const fulfillmentStatus = orderData.fulfillmentStatus;
  const paymentStatus = orderData.paymentStatus;

  if (fulfillmentStatus === "FULFILLED") {
    status = "completed";
  } else if (fulfillmentStatus === "CANCELED") {
    status = "cancelled";
  } else if (fulfillmentStatus === "PARTIALLY_FULFILLED") {
    status = "preparing";
  } else if (paymentStatus === "PAID" && status === "pending") {
    status = "accepted";
  }

  await base44.asServiceRole.entities.Order.update(existing[0].id, {
    status,
    payment_status_wix: paymentStatus || "",
    fulfillment_status: fulfillmentStatus || "",
  });

  console.log("✅ Order updated:", existing[0].id);
  return new Response(JSON.stringify({ success: true, updated: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}