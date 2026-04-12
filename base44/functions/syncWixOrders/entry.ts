import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const CONNECTOR_ID = "69d28be020e6bfced7c26a54";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the Wix access token for the current user
  let accessToken;
  try {
    accessToken = await base44.asServiceRole.connectors.getCurrentAppUserAccessToken(CONNECTOR_ID);
  } catch (e) {
    return Response.json({ error: "Wix not connected. Please connect your Wix account first.", notConnected: true }, { status: 400 });
  }

  // Search Wix ecom orders — exclude FULFILLED and CANCELED
  const searchRes = await fetch("https://www.wixapis.com/ecom/v1/orders/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      search: {
        filter: {
          status: { "$nin": ["FULFILLED", "CANCELED"] }
        },
        sort: [{ fieldName: "createdDate", order: "DESC" }],
        cursorPaging: { limit: 100 }
      }
    }),
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    console.error("Wix search orders error:", errText);
    return Response.json({ error: "Failed to fetch from Wix", details: errText }, { status: 500 });
  }

  const { orders: wixOrders = [] } = await searchRes.json();
  console.log(`Fetched ${wixOrders.length} orders from Wix`);

  let created = 0;
  let skipped = 0;

  for (const order of wixOrders) {
    const wixOrderId = order.id;

    // Duplicate check
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Parse line items
    const parsedItems = (order.lineItems || []).map((item) => {
      const descLines = item.descriptionLines || [];
      const extras = descLines.map((d) => ({
        name: d.name?.original || d.plainText?.original || "",
        price: 0,
      })).filter(e => e.name);

      const priceRaw = item.price?.amount || item.fullPrice?.amount || "0";
      const basePrice = parseFloat(priceRaw) || 0;
      const qty = parseInt(item.quantity || 1);

      return {
        product_id: item.catalogReference?.catalogItemId || item.id || "",
        product_name: item.productName?.original || item.productName?.translated || "Unknown",
        base_price: basePrice,
        extras,
        quantity: qty,
        subtotal: basePrice * qty,
      };
    });

    const grandTotal = parseFloat(order.priceSummary?.total?.amount || 0) ||
      parsedItems.reduce((s, i) => s + i.subtotal, 0);

    const addr = order.shippingInfo?.logistics?.shippingDestination?.address;
    const deliveryAddress = addr
      ? [addr.addressLine1, addr.city, addr.postalCode].filter(Boolean).join(", ")
      : "";

    const buyer = order.buyerInfo || {};
    const contact = order.shippingInfo?.logistics?.shippingDestination?.contactDetails || {};
    const customerName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
      buyer.email || "";
    const customerPhone = contact.phone || buyer.phone || "";
    const customerEmail = buyer.email || "";

    // Map Wix fulfillment status to our status
    let status = "pending";
    if (order.fulfillmentStatus === "PARTIALLY_FULFILLED") status = "preparing";
    if (order.paymentStatus === "PAID") status = "accepted";

    const newOrder = {
      order_type: "takeaway",
      order_source: "wix",
      status,
      wix_order_id: wixOrderId,
      wix_site_id: user.wix_site_id || "",
      items: parsedItems,
      total: grandTotal,
      delivery_address: deliveryAddress,
      customer_name: customerName,
      customer_phone: String(customerPhone),
      customer_email: String(customerEmail),
      payment_status_wix: order.paymentStatus || "",
      payment_method_wix: "",
      amount_due_wix: grandTotal,
      sent_to_kitchen: false,
      created_by: user.email,
    };

    await base44.asServiceRole.entities.Order.create(newOrder);
    created++;
  }

  console.log(`Sync complete: ${created} created, ${skipped} skipped`);
  return Response.json({ success: true, created, skipped, total: wixOrders.length });
});