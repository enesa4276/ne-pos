import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

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

  console.log("Wix webhook received:", JSON.stringify(payload).substring(0, 2000));

  // ── Strateji 1: Eski format — tüm sipariş nesnesi payload["1"] altında ──
  const rawOrder = payload?.["1"] || payload?.data || payload?.order;
  if (rawOrder && typeof rawOrder === "object" && (rawOrder.lineItems || rawOrder.orderId || rawOrder.id)) {
    console.log("Mode: full-order object");
    return await handleFullOrder(base44, rawOrder, payload);
  }

  // ── Strateji 2: Yeni format — Wix otomasyonu flat değişkenler gönderir ──
  if (payload?.order_id || payload?.site_id || payload?.item_names) {
    console.log("Mode: flat fields");
    return await handleFlatOrder(base44, payload);
  }

  // ── Strateji 3: Bilinmeyen format — log at ve 200 dön ──
  console.log("Unknown payload format, keys:", Object.keys(payload || {}));
  return Response.json({ success: true, skipped: true, keys: Object.keys(payload || {}) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tüm sipariş nesnesi (eski format)
// ─────────────────────────────────────────────────────────────────────────────
async function handleFullOrder(base44, order, rootPayload) {
  const siteId =
    order?.context?.metaSiteId ||
    order?._context?.metaSiteId ||
    rootPayload?.siteId ||
    order?.siteId;

  console.log("Full-order siteId:", siteId);

  const ownerEmail = await findOwnerEmail(base44, siteId);

  const lineItems = order?.lineItems || order?.items || [];
  const parsedItems = lineItems.map((item) => {
    const modifiers = item?.modifierList || item?.options || item?.modifiers || [];
    const extras = modifiers.map((mod) => ({
      name: mod?.description || mod?.name || mod?.title || "",
      price: parseFloat(mod?.price?.amount || mod?.price || 0),
    }));
    const priceRaw = item?.price || item?.priceData?.price || "0";
    const basePrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const qty = parseInt(item?.quantity || 1);
    const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
    const variant = item?.variant || item?.option || "";
    return {
      product_id: item?.catalogReference?.catalogItemId || item?.id || "",
      product_name: variant ? `${item?.name || "?"} (${variant})` : (item?.name || item?.productName?.original || "?"),
      base_price: basePrice,
      extras,
      quantity: qty,
      subtotal: (basePrice + extrasTotal) * qty,
    };
  });

  const lineItemsTotal = parsedItems.reduce((s, i) => s + i.subtotal, 0);
  const grandTotal = parseFloat(order?.priceSummary?.total?.amount || order?.totals?.total || 0) || lineItemsTotal;

  const deliveryAddress = [
    order?.shippingInfo?.shipmentDetails?.address?.addressLine1,
    order?.shippingInfo?.shipmentDetails?.address?.city,
    order?.shippingInfo?.shipmentDetails?.address?.postalCode,
  ].filter(Boolean).join(", ");

  const rawContact = order?.contact || order?.buyerInfo || order?.contactDetails || {};
  const firstName = rawContact?.firstName || rawContact?.first || '';
  const lastName = rawContact?.lastName || rawContact?.last || '';
  const customerName = firstName ? `${firstName} ${lastName}`.trim() : (typeof rawContact?.name === 'string' ? rawContact.name : '');
  const customerPhone = rawContact?.phone || rawContact?.phones?.[0] || "";
  const customerEmail = rawContact?.email || order?.email || "";
  const wixOrderId = order?.orderId || order?.id;

  if (wixOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: String(wixOrderId) });
    if (existing?.length > 0) {
      console.log("Duplicate, skipping:", wixOrderId);
      return Response.json({ success: true, duplicate: true });
    }
  }

  const newOrder = {
    order_type: "takeaway", order_source: "wix", status: "pending",
    wix_order_id: wixOrderId, wix_site_id: siteId,
    items: parsedItems, total: grandTotal,
    delivery_address: deliveryAddress || "",
    customer_name: customerName,
    customer_phone: String(customerPhone || ''),
    customer_email: String(customerEmail || ''),
    payment_status_wix: order?.paymentStatus || "",
    payment_method_wix: order?.paymentInfo?.paymentMethod || "",
    amount_due_wix: grandTotal, sent_to_kitchen: false,
  };
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Full-order created:", created?.id);
  return Response.json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Wix otomasyonu flat alanlar (yeni format)
// Wix'ten şu anahtarlarla gönderin:
//   order_id      → {{var("orderId")}}
//   site_id       → {{var("metaSiteId")}}
//   payment_status→ {{var("paymentStatus")}}
//   customer_email→ {{var("email")}}
//   customer_phone→ {{var("customerDetails.phone")}}
//   customer_fname→ {{var("customerDetails.firstName")}}
//   customer_lname→ {{var("customerDetails.lastName")}}
//   delivery_addr → {{var("deliveryInstructions")}}
//   item_names    → {{arrayMap(var("lineItems");"name")}}
//   item_prices   → {{arrayMap(var("lineItems");"price")}}
//   item_quantities→ {{arrayMap(var("lineItems");"quantity")}}
//   item_variants → {{arrayMap(var("lineItems");"variant")}}
//   total         → (hesaplanan toplam veya manuel gir)
// ─────────────────────────────────────────────────────────────────────────────
async function handleFlatOrder(base44, payload) {
  const siteId = payload?.site_id;
  console.log("Flat-order siteId:", siteId);

  const ownerEmail = await findOwnerEmail(base44, siteId);

  const wixOrderId = payload?.order_id ? String(payload.order_id) : null;
  if (wixOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
    if (existing?.length > 0) {
      console.log("Duplicate, skipping:", wixOrderId);
      return Response.json({ success: true, duplicate: true });
    }
  }

  // item_names, item_prices, item_quantities dizilerini parse et
  // Wix arrayMap sonucu virgülle ayrılmış string veya JSON dizi olabilir
  const parseList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch {}
    return String(val).split(",").map(s => s.trim()).filter(Boolean);
  };

  const names = parseList(payload?.item_names);
  const prices = parseList(payload?.item_prices);
  const quantities = parseList(payload?.item_quantities);
  const variants = parseList(payload?.item_variants);

  const parsedItems = names.map((name, i) => {
    const variant = variants[i] || "";
    const priceRaw = prices[i] || "0";
    const basePrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const qty = parseInt(quantities[i] || 1);
    return {
      product_id: "",
      product_name: variant ? `${name} (${variant})` : name,
      base_price: basePrice,
      extras: [],
      quantity: qty,
      subtotal: basePrice * qty,
    };
  });

  const totalRaw = payload?.total || 0;
  const grandTotal = parseFloat(String(totalRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || parsedItems.reduce((s, i) => s + i.subtotal, 0);

  const firstName = payload?.customer_fname || "";
  const lastName = payload?.customer_lname || "";
  const customerName = `${firstName} ${lastName}`.trim() || payload?.customer_name || "";

  const newOrder = {
    order_type: "takeaway", order_source: "wix", status: "pending",
    wix_order_id: wixOrderId,
    wix_site_id: siteId || null,
    items: parsedItems,
    total: grandTotal,
    delivery_address: payload?.delivery_addr || payload?.delivery_address || "",
    customer_name: customerName,
    customer_phone: String(payload?.customer_phone || ''),
    customer_email: String(payload?.customer_email || ''),
    payment_status_wix: payload?.payment_status || "",
    payment_method_wix: "",
    amount_due_wix: grandTotal,
    sent_to_kitchen: false,
  };
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Flat-order created:", created?.id, "items:", parsedItems.length);
  return Response.json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı: site_id ile kullanıcı bul, yoksa tek Wix kullanıcısını al
// ─────────────────────────────────────────────────────────────────────────────
async function findOwnerEmail(base44, siteId) {
  const users = await base44.asServiceRole.entities.User.list();
  if (siteId) {
    const matched = users.find((u) => u.wix_site_id && u.wix_site_id === siteId);
    if (matched) { console.log("Matched user:", matched.email); return matched.email; }
  }
  const withWix = users.find((u) => u.wix_site_id);
  if (withWix) { console.log("Fallback user:", withWix.email); return withWix.email; }
  return null;
}