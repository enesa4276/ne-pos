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

  console.log("Wix webhook received:", JSON.stringify(payload).substring(0, 500));

  // Wix Restaurants actual order data is under payload.data or payload["1"] (HTTP automation key)
  const order = payload?.data || payload?.order || payload?.["1"] || payload;

  // Site ID lives in context.metaSiteId
  const siteId =
    order?.context?.metaSiteId ||
    order?._context?.metaSiteId ||
    payload?.siteId ||
    order?.siteId;

  console.log("Resolved siteId:", siteId);

  // Find the user with this wix_site_id
  let ownerEmail = null;
  let webhookSecret = null;

  const users = await base44.asServiceRole.entities.User.list();
  const matchedUser = users.find((u) => u.wix_site_id && u.wix_site_id === siteId);
  if (matchedUser) {
    ownerEmail = matchedUser.email;
    webhookSecret = matchedUser.wix_webhook_secret;
  }
  console.log("Matched user:", ownerEmail);

  // Validate webhook secret if provided in header
  const incomingSecret = req.headers.get("x-wix-signature") || req.headers.get("x-webhook-secret");
  if (webhookSecret && incomingSecret && incomingSecret !== webhookSecret) {
    return Response.json({ error: "Invalid secret" }, { status: 403 });
  }

  // Parse order items
  const lineItems = order?.lineItems || order?.items || [];
  const parsedItems = lineItems.map((item) => {
    const modifiers = item?.modifierList || item?.options || item?.modifiers || [];
    const extras = modifiers.map((mod) => ({
      name: mod?.description || mod?.name || mod?.title || "",
      price: parseFloat(mod?.price?.amount || mod?.price || 0),
    }));

    // price field in Wix restaurants is like "€9,50" — strip non-numeric
    const priceRaw = item?.price || item?.priceData?.price || "0";
    const basePrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const qty = parseInt(item?.quantity || 1);
    const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
    const variant = item?.variant || item?.option || "";

    return {
      product_id: item?.catalogReference?.catalogItemId || item?.id || "",
      product_name: variant
        ? `${item?.name || "Unknown"} (${variant})`
        : (item?.name || item?.productName?.original || "Unknown"),
      base_price: basePrice,
      extras,
      quantity: qty,
      subtotal: (basePrice + extrasTotal) * qty,
    };
  });

  // Total: try summary first, then sum from items
  const lineItemsTotal = parsedItems.reduce((s, i) => s + i.subtotal, 0);
  const grandTotal =
    parseFloat(order?.priceSummary?.total?.amount || order?.totals?.total || 0) ||
    lineItemsTotal;

  const deliveryAddress = [
    order?.shippingInfo?.shipmentDetails?.address?.addressLine1,
    order?.shippingInfo?.shipmentDetails?.address?.city,
    order?.shippingInfo?.shipmentDetails?.address?.postalCode,
  ].filter(Boolean).join(", ");

  const rawContact = order?.contact || order?.buyerInfo || order?.contactDetails || {};
  const firstName = rawContact?.firstName || rawContact?.first || '';
  const lastName = rawContact?.lastName || rawContact?.last || '';
  const customerName = firstName
    ? `${firstName} ${lastName}`.trim()
    : (typeof rawContact?.name === 'string' ? rawContact.name : '');
  const customerPhone = rawContact?.phone || rawContact?.phones?.[0] || "";
  const customerEmail = rawContact?.email || order?.email || "";

  const wixOrderId = order?.orderId || order?.id || payload?.orderId;

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
    customer_name: customerName,
    customer_phone: String(customerPhone || ''),
    customer_email: String(customerEmail || ''),
    payment_status_wix: order?.paymentStatus || "",
    payment_method_wix: order?.paymentInfo?.paymentMethod || "",
    amount_due_wix: grandTotal,
    sent_to_kitchen: false,
  };

  if (ownerEmail) {
    newOrder.created_by = ownerEmail;
  }

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Order created successfully:", created?.id, "for site:", siteId);
  return Response.json({ success: true });
});