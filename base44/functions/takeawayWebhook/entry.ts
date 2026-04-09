import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("Takeaway webhook received:", JSON.stringify(payload));

  const order = payload?.order || payload;
  const storeId = order?.restaurantId || order?.storeId || payload?.restaurantId || payload?.storeId;

  let ownerEmail = null;
  let webhookSecret = null;

  const users = await base44.asServiceRole.entities.User.list();
  const matchedUser = users.find((u) => u.takeaway_store_id && u.takeaway_store_id === String(storeId));
  if (matchedUser) {
    ownerEmail = matchedUser.email;
    webhookSecret = matchedUser.takeaway_webhook_secret;
  }

  const incomingSecret = req.headers.get("x-takeaway-secret") || req.headers.get("x-webhook-secret");
  if (webhookSecret && incomingSecret && incomingSecret !== webhookSecret) {
    return Response.json({ error: "Invalid secret" }, { status: 403 });
  }

  const lineItems = order?.items || order?.products || [];
  const parsedItems = lineItems.map((item) => {
    const extras = (item?.options || item?.choices || item?.extras || []).map((opt) => ({
      name: opt?.name || opt?.description || "",
      price: parseFloat(opt?.price || opt?.unitPrice || 0),
    }));
    const basePrice = parseFloat(item?.unitPrice || item?.price || 0);
    const qty = parseInt(item?.count || item?.quantity || 1);
    const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
    return {
      product_id: item?.productId || item?.id || "",
      product_name: item?.name || item?.description || "Unknown",
      base_price: basePrice,
      extras,
      quantity: qty,
      subtotal: (basePrice + extrasTotal) * qty,
    };
  });

  const grandTotal = parseFloat(order?.totalPrice || order?.total?.amount || order?.total || 0);

  const address = order?.deliveryAddress || order?.address || {};
  const deliveryAddress = [
    address?.street,
    address?.streetNumber,
    address?.city,
    address?.postalCode,
  ].filter(Boolean).join(", ");

  const customer = order?.customer || order?.contact || {};
  const externalOrderId = order?.orderId || order?.id || payload?.orderId;

  if (externalOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ external_order_id: externalOrderId, order_source: "takeaway_com" });
    if (existing && existing.length > 0) {
      console.log("Duplicate Takeaway order, skipping:", externalOrderId);
      return Response.json({ success: true, duplicate: true });
    }
  }

  const newOrder = {
    order_type: "takeaway",
    order_source: "takeaway_com",
    status: "pending",
    external_order_id: externalOrderId,
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

  if (ownerEmail) {
    newOrder.created_by = ownerEmail;
  }

  await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Takeaway order created for store:", storeId);
  return Response.json({ success: true });
});