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

  console.log("Wix webhook received. Keys:", Object.keys(payload || {}).join(", "));
  console.log("Payload preview:", JSON.stringify(payload).substring(0, 1000));

  // ── Strateji 1: Wix otomasyonu flat alanlar (yeni format) ──
  // order_id veya site_id varsa flat format
  const hasFlat = payload?.order_id || payload?.site_id || payload?.["sipariş kimliği"] || payload?.["metaSiteId"];
  if (hasFlat) {
    console.log("Mode: flat fields");
    return await handleFlatOrder(base44, payload);
  }

  // ── Strateji 2: Eski format — tüm sipariş nesnesi payload["1"] altında ──
  const rawOrder = payload?.["1"] || payload?.data || payload?.order;
  if (rawOrder && typeof rawOrder === "object") {
    console.log("Mode: full-order object");
    return await handleFullOrder(base44, rawOrder, payload);
  }

  // ── Bilinmeyen format ──
  console.log("Unknown payload format");
  return Response.json({ success: true, skipped: true, keys: Object.keys(payload || {}) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wix otomasyonu flat alanlar
// Wix'ten bu anahtarlarla gönderin:
//   order_id          → {{var("sipariş kimliği")}}
//   site_id           → {{var("metaSiteId")}}
//   payment_status    → {{var("ödemeDurumu")}}
//   customer_email    → {{var("e-posta")}}
//   fulfillment_method→ {{var("yerine getirme yöntemi")}}
//   delivery_addr     → {{var("teslimat talimatları")}}
//   buyer_note        → {{var("alıcıNotu")}}
//   item_names        → {{arrayMap(var("satır öğeleri");"name")}}
//   item_prices       → {{arrayMap(var("satır öğeleri");"price")}}
//   item_quantities   → {{arrayMap(var("satır öğeleri");"quantity")}}
//   item_variants     → {{arrayMap(var("satır öğeleri");"variant")}}
// ─────────────────────────────────────────────────────────────────────────────
async function handleFlatOrder(base44, payload) {
  // Hem Türkçe anahtar hem de İngilizce anahtar desteği
  const siteId = payload?.site_id || payload?.metaSiteId;
  const wixOrderId = String(
    payload?.order_id || payload?.["sipariş kimliği"] || ""
  ).trim();

  console.log("Flat siteId:", siteId, "orderId:", wixOrderId);

  const ownerEmail = await findOwnerEmail(base44, siteId);

  // Duplicate kontrolü
  if (wixOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
    if (existing?.length > 0) {
      console.log("Duplicate, skipping:", wixOrderId);
      return Response.json({ success: true, duplicate: true });
    }
  }

  // Ürün listelerini parse et (arrayMap virgülle ayrılmış string veya JSON dizi döndürür)
  const parseList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch {}
    return String(val).split(",").map(s => s.trim()).filter(Boolean);
  };

  const names      = parseList(payload?.item_names);
  const prices     = parseList(payload?.item_prices);
  const quantities = parseList(payload?.item_quantities);
  const variants   = parseList(payload?.item_variants);

  const parsedItems = names.map((name, i) => {
    const variant   = variants[i] || "";
    const priceRaw  = String(prices[i] || "0").replace(/[^0-9.,]/g, "").replace(",", ".");
    const basePrice = parseFloat(priceRaw) || 0;
    const qty       = parseInt(quantities[i] || 1);
    return {
      product_id:   "",
      product_name: variant ? `${name} (${variant})` : name,
      base_price:   basePrice,
      extras:       [],
      quantity:     qty,
      subtotal:     basePrice * qty,
    };
  });

  const grandTotal = parsedItems.reduce((s, i) => s + i.subtotal, 0);

  const customerEmail  = payload?.customer_email  || "";
  const customerPhone  = payload?.customer_phone  || "";
  const customerFname  = payload?.customer_fname  || "";
  const customerLname  = payload?.customer_lname  || "";
  const customerName   = payload?.customer_name   || `${customerFname} ${customerLname}`.trim();
  const deliveryAddr   = payload?.delivery_addr   || "";
  const buyerNote      = payload?.buyer_note      || "";
  const paymentStatus  = payload?.payment_status  || "";
  const fulfillMethod  = payload?.fulfillment_method || "";

  // Adres: teslimat adresi + not + yöntem
  const addrParts = [deliveryAddr, buyerNote, fulfillMethod ? `(${fulfillMethod})` : ""].filter(Boolean);
  const fullAddr = addrParts.join(" | ");

  const newOrder = {
    order_type:          "takeaway",
    order_source:        "wix",
    status:              "pending",
    wix_order_id:        wixOrderId || null,
    wix_site_id:         siteId || null,
    items:               parsedItems,
    total:               grandTotal,
    delivery_address:    fullAddr,
    customer_name:       customerName,
    customer_phone:      String(customerPhone),
    customer_email:      String(customerEmail),
    payment_status_wix:  paymentStatus,
    payment_method_wix:  "",
    amount_due_wix:      grandTotal,
    sent_to_kitchen:     false,
  };
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Created order:", created?.id, "items:", parsedItems.length, "total:", grandTotal);
  return Response.json({ success: true, id: created?.id });
}

// ─────────────────────────────────────────────────────────────────────────────
// Eski format — tüm sipariş nesnesi (fallback)
// ─────────────────────────────────────────────────────────────────────────────
async function handleFullOrder(base44, order, rootPayload) {
  const siteId = order?.context?.metaSiteId || rootPayload?.siteId || order?.siteId;
  const ownerEmail = await findOwnerEmail(base44, siteId);

  const lineItems = order?.lineItems || order?.items || [];
  const parsedItems = lineItems.map((item) => {
    const priceRaw  = item?.price || item?.priceData?.price || "0";
    const basePrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const qty       = parseInt(item?.quantity || 1);
    return {
      product_id:   item?.catalogReference?.catalogItemId || item?.id || "",
      product_name: item?.name || item?.productName?.original || "?",
      base_price:   basePrice,
      extras:       [],
      quantity:     qty,
      subtotal:     basePrice * qty,
    };
  });

  const grandTotal = parseFloat(order?.priceSummary?.total?.amount || 0) ||
    parsedItems.reduce((s, i) => s + i.subtotal, 0);

  const wixOrderId = order?.orderId || order?.id;
  if (wixOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: String(wixOrderId) });
    if (existing?.length > 0) {
      return Response.json({ success: true, duplicate: true });
    }
  }

  const contact    = order?.contact || order?.buyerInfo || {};
  const firstName  = contact?.firstName || "";
  const lastName   = contact?.lastName || "";
  const newOrder = {
    order_type:         "takeaway", order_source: "wix", status: "pending",
    wix_order_id:       wixOrderId,
    wix_site_id:        siteId || null,
    items:              parsedItems,
    total:              grandTotal,
    delivery_address:   "",
    customer_name:      `${firstName} ${lastName}`.trim(),
    customer_phone:     String(contact?.phone || ""),
    customer_email:     String(contact?.email || order?.email || ""),
    payment_status_wix: order?.paymentStatus || "",
    payment_method_wix: "",
    amount_due_wix:     grandTotal,
    sent_to_kitchen:    false,
  };
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Full-order created:", created?.id);
  return Response.json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı: site_id ile kullanıcı bul
// ─────────────────────────────────────────────────────────────────────────────
async function findOwnerEmail(base44, siteId) {
  const users = await base44.asServiceRole.entities.User.list();
  if (siteId) {
    const matched = users.find((u) => u.wix_site_id === siteId);
    if (matched) return matched.email;
  }
  const withWix = users.find((u) => u.wix_site_id);
  return withWix?.email || null;
}