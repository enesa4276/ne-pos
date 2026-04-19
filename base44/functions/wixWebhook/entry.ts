import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  // CORS / preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" } });
  }
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  const base44 = createClientFromRequest(req);

  let payload;
  try {
    const text = await req.text();
    console.log("=== WIX WEBHOOK HIT ===");
    console.log("Method:", req.method);
    console.log("Content-Type:", req.headers.get("content-type"));
    console.log("Body length:", text.length);
    console.log("Full body:", text.substring(0, 3000));
    
    if (!text || text.trim() === "") {
      console.log("EMPTY BODY — Wix sent no payload!");
      return new Response(JSON.stringify({ success: true, note: "empty body" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    payload = JSON.parse(text);
  } catch (e) {
    console.log("JSON parse error:", e.message);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  console.log("Wix webhook received. Keys:", Object.keys(payload || {}).join(", "));
  console.log("Payload preview:", JSON.stringify(payload).substring(0, 1500));

  // ── Wix Otomasyonu: "Sipariş kabul edildiğinde" ──
  // Payload doğrudan sipariş objesi:
  //   orderId, metaSiteId, lineItems[], customerDetails{}, paymentStatus,
  //   deliveryAddress{}, fulfillmentMethod, buyerNote, priceSummary{}, email, contact{}

  const wixOrderId = String(payload?.orderId || "").trim();
  const siteId     = payload?.metaSiteId || "";

  if (!wixOrderId) {
    console.log("No orderId found, skipping. Keys:", Object.keys(payload || {}).join(", "));
    return new Response(JSON.stringify({ success: true, skipped: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Duplicate kontrolü
  const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
  if (existing?.length > 0) {
    console.log("Duplicate, skipping:", wixOrderId);
    return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // ── Ürünler (lineItems) ──
  const lineItems = Array.isArray(payload?.lineItems) ? payload.lineItems : [];
  const parsedItems = lineItems.map((item) => {
    // Fiyat: price veya priceData.price (string veya number)
    const priceRaw  = item?.price ?? item?.priceData?.price ?? item?.totalPrice ?? 0;
    const basePrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const qty       = parseInt(item?.quantity || 1);

    // Seçenekler/varyantlar extras olarak
    const options = item?.options || item?.variantData?.selectedOptions || [];
    const extras = Array.isArray(options)
      ? options.map(o => ({ name: `${o.option || o.optionKey || ""}: ${o.selection || o.value || ""}`, price: 0 })).filter(e => e.name !== ": ")
      : [];

    return {
      product_id:   item?.catalogReference?.catalogItemId || item?.id || "",
      product_name: item?.productName?.original || item?.name || "?",
      base_price:   basePrice,
      extras,
      quantity:     qty,
      subtotal:     parseFloat((basePrice * qty).toFixed(2)),
    };
  });

  // ── Toplam ──
  const totalRaw   = payload?.priceSummary?.total?.amount ?? payload?.priceSummary?.total ?? 0;
  const grandTotal = parseFloat(String(totalRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 
    parsedItems.reduce((s, i) => s + i.subtotal, 0);

  // ── Müşteri bilgileri ──
  const cd          = payload?.customerDetails || payload?.contact || {};
  const firstName   = cd?.firstName || cd?.first_name || "";
  const lastName    = cd?.lastName  || cd?.last_name  || "";
  const customerName = `${firstName} ${lastName}`.trim() || payload?.email || "";
  const customerPhone = String(cd?.phone || cd?.recipientInfoPhoneNumber || cd?.phoneNumber || "");
  const customerEmail = String(cd?.email || payload?.email || "");

  // ── Teslimat adresi ──
  const da = payload?.deliveryAddress || {};
  const addrParts = [
    da?.addressLine || da?.street || da?.streetAddress?.name || "",
    da?.addressLine2 || "",
    da?.city || "",
    da?.postalCode || da?.zipCode || "",
    da?.country || "",
  ].filter(Boolean);
  const deliveryAddr = addrParts.join(", ");

  // ── Ek bilgiler ──
  const buyerNote       = payload?.buyerNote || "";
  const fulfillMethod   = payload?.fulfillmentMethod || "";
  const paymentStatus   = payload?.paymentStatus || "";
  const deliveryInstr   = payload?.deliveryInstructions || "";

  // Adres + notlar birleştir
  const fullAddrParts = [deliveryAddr, deliveryInstr, buyerNote, fulfillMethod ? `(${fulfillMethod})` : ""].filter(Boolean);
  const fullAddr = fullAddrParts.join(" | ");

  // ── Owner bul ──
  const ownerEmail = await findOwnerEmail(base44, siteId);

  const newOrder = {
    order_type:         "takeaway",
    order_source:       "wix",
    status:             "pending",
    wix_order_id:       wixOrderId,
    wix_site_id:        siteId || null,
    items:              parsedItems,
    total:              grandTotal,
    delivery_address:   fullAddr,
    customer_name:      customerName,
    customer_phone:     customerPhone,
    customer_email:     customerEmail,
    payment_status_wix: paymentStatus,
    payment_method_wix: "",
    amount_due_wix:     grandTotal,
    sent_to_kitchen:    false,
  };
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Created order:", created?.id, "| customer:", customerName, "| items:", parsedItems.length, "| total:", grandTotal);
  return new Response(JSON.stringify({ success: true, id: created?.id }), { status: 200, headers: { "Content-Type": "application/json" } });
});

async function findOwnerEmail(base44, siteId) {
  const users = await base44.asServiceRole.entities.User.list();
  if (siteId) {
    const matched = users.find((u) => u.wix_site_id === siteId);
    if (matched) return matched.email;
  }
  const withWix = users.find((u) => u.wix_site_id);
  return withWix?.email || null;
}