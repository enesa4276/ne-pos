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

  console.log("Wix webhook received:", JSON.stringify(payload));

  // Wix Restaurants order payload structure
  const order = payload?.order || payload?.data?.order || payload;

  // Find site_id
  const siteId = order?.fulfillmentInfo?.siteId || order?.siteId || payload?.siteId;

  // Find the user with this wix_site_id
  let ownerEmail = null;
  let webhookSecret = null;

  const users = await base44.asServiceRole.entities.User.list();
  const matchedUser = users.find((u) => u.wix_site_id && u.wix_site_id === siteId);
  if (matchedUser) {
    ownerEmail = matchedUser.email;
    webhookSecret = matchedUser.wix_webhook_secret;
  }

  // Validate webhook secret if provided in header
  const incomingSecret = req.headers.get("x-wix-signature") || req.headers.get("x-webhook-secret");
  if (webhookSecret && incomingSecret && incomingSecret !== webhookSecret) {
    return Response.json({ error: "Invalid secret" }, { status: 403 });
  }

  // Parse order items
  const lineItems = order?.lineItems || order?.items || [];
  const parsedItems = lineItems.map((item) => {
    const extras = (item?.options || item?.modifiers || []).map((opt) => ({
      name: opt?.name || opt?.title || "",
      price: parseFloat(opt?.price?.amount || opt?.price || 0),
    }));
    const basePrice = parseFloat(item?.price?.amount || item?.price || item?.priceData?.price || 0);
    const qty = parseInt(item?.quantity || 1);
    const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
    return {
      product_id: item?.catalogReference?.catalogItemId || item?.id || "",
      product_name: item?.productName?.original || item?.name || item?.title || "Unknown",
      base_price: basePrice,
      extras,
      quantity: qty,
      subtotal: (basePrice + extrasTotal) * qty,
    };
  });

  const grandTotal = parseFloat(
    order?.priceSummary?.total?.amount ||
    order?.totals?.total ||
    order?.total?.amount ||
    0
  );

  const deliveryAddress = [
    order?.shippingInfo?.shipmentDetails?.address?.addressLine1,
    order?.shippingInfo?.shipmentDetails?.address?.city,
    order?.shippingInfo?.shipmentDetails?.address?.postalCode,
  ].filter(Boolean).join(", ");

  const buyerInfo = order?.buyerInfo || order?.contactDetails || {};
  const wixOrderId = order?.id || order?.orderId || payload?.orderId;

  // Check for duplicate
  if (wixOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
    if (existing && existing.length > 0) {
      console.log("Duplicate wix order, skipping:", wixOrderId);
      return Response.json({ success: true, duplicate: true });
    }
  }

  const newOrder = {
    order_type: "takeaway",
    order_source: "wix",
    status: "pending",
    wix_order_id: wixOrderId,
    wix_site_id: siteId,
    items: parsedItems,
    total: grandTotal,
    delivery_address: deliveryAddress || "",
    customer_name: buyerInfo?.firstName
      ? `${buyerInfo.firstName} ${buyerInfo.lastName || ""}`.trim()
      : buyerInfo?.name || "",
    customer_phone: buyerInfo?.phone || "",
    customer_email: buyerInfo?.email || "",
    payment_status_wix: order?.paymentStatus || "",
    payment_method_wix: order?.paymentInfo?.paymentMethod || "",
    amount_due_wix: parseFloat(order?.priceSummary?.total?.amount || 0),
    sent_to_kitchen: false,
  };

  if (ownerEmail) {
    newOrder.created_by = ownerEmail;
  }

  await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Order created successfully for site:", siteId);
  return Response.json({ success: true });
});