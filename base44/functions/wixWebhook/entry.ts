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

  console.log("Wix webhook received:", JSON.stringify(payload).substring(0, 1000));

  // ── Strateji 1: Eski format (tüm sipariş nesnesi payload["1"] altında) ──
  const rawOrder = payload?.["1"] || payload?.data || payload?.order;
  if (rawOrder && (rawOrder.lineItems || rawOrder.orderId || rawOrder.id)) {
    return await handleFullOrder(base44, rawOrder, payload);
  }

  // ── Strateji 2: Yeni format (Wix otomasyonu ayrı alanlar gönderir) ──
  // Beklenen payload: { order_id, items: [...], customer_email, customer_phone,
  //                    customer_name, payment_status, delivery_address, total, site_id }
  const orderId = payload?.order_id || payload?.orderId;
  const items   = payload?.items;

  if (orderId || items) {
    return await handleFlatOrder(base44, payload);
  }

  console.log("Unknown payload format, skipping");
  return Response.json({ success: true, skipped: true });
});

// ── Tüm sipariş nesnesi geldiğinde ──────────────────────────────────────────
async function handleFullOrder(base44, order, rootPayload) {
  const siteId =
    order?.context?.metaSiteId ||
    order?._context?.metaSiteId ||
    rootPayload?.siteId ||
    order?.siteId;

  console.log("Full-order mode, siteId:", siteId);

  let ownerEmail = null;
  const users = await base44.asServiceRole.entities.User.list();
  const matchedUser = users.find((u) => u.wix_site_id && u.wix_site_id === siteId);
  if (matchedUser) ownerEmail = matchedUser.email;
  console.log("Matched user:", ownerEmail);

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
      product_name: variant ? `${item?.name || "Unknown"} (${variant})` : (item?.name || item?.productName?.original || "Unknown"),
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
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId });
    if (existing?.length > 0) {
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
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Full-order created:", created?.id);
  return Response.json({ success: true });
}

// ── Wix otomasyonu ayrı alanlar gönderdiğinde ───────────────────────────────
// Wix otomasyonunda şu anahtarlarla gönderin:
//   order_id        → Sipariş numarası
//   site_id         → (sabit metin olarak) sizin wix_site_id'niz
//   customer_name   → (varsa)
//   customer_email  → Müşteri e-postası
//   customer_phone  → İşletme telefon numarası (veya müşteri telefonu)
//   payment_status  → Ödeme durumu
//   total           → Sipariş Kalemi Toplam Fiyatı (tüm öğelerin toplamı)
//   delivery_address → İşletme adresi (veya teslimat adresi)
//   items           → Sipariş öğeleri (dizi olarak)
async function handleFlatOrder(base44, payload) {
  const siteId = payload?.site_id;
  console.log("Flat-order mode, siteId:", siteId);

  let ownerEmail = null;
  if (siteId) {
    const users = await base44.asServiceRole.entities.User.list();
    const matchedUser = users.find((u) => u.wix_site_id && u.wix_site_id === siteId);
    if (matchedUser) ownerEmail = matchedUser.email;
  } else {
    // site_id gönderilmemişse tek kullanıcıyı al (tek restoran senaryosu)
    const users = await base44.asServiceRole.entities.User.list();
    const withWix = users.find((u) => u.wix_site_id);
    if (withWix) {
      ownerEmail = withWix.email;
    }
  }
  console.log("Matched user:", ownerEmail);

  const wixOrderId = payload?.order_id;

  if (wixOrderId) {
    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: String(wixOrderId) });
    if (existing?.length > 0) {
      console.log("Duplicate wix order, skipping:", wixOrderId);
      return Response.json({ success: true, duplicate: true });
    }
  }

  // items dizisini parse et — Wix öğe dizisi veya tek nesne olabilir
  let parsedItems = [];
  const rawItems = payload?.items;
  if (Array.isArray(rawItems)) {
    parsedItems = rawItems.map((item) => {
      const name = item?.name || item?.["Sipariş Kalemi Adı"] || item?.productName || "Ürün";
      const variant = item?.variant || item?.["Sipariş öğesi varyantı"] || "";
      const qty = parseInt(item?.quantity || item?.["Sipariş öğesi Adedi"] || 1);
      const priceRaw = item?.price || item?.["Sipariş Kalemi Toplam Fiyatı"] || item?.["İndirim ve vergi öncesi fiyat"] || "0";
      const basePrice = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
      return {
        product_id: item?.id || item?.catalogItemId || "",
        product_name: variant ? `${name} (${variant})` : name,
        base_price: basePrice,
        extras: [],
        quantity: qty,
        subtotal: basePrice * qty,
      };
    });
  }

  const totalRaw = payload?.total || 0;
  const grandTotal = parseFloat(String(totalRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || parsedItems.reduce((s, i) => s + i.subtotal, 0);

  const newOrder = {
    order_type: "takeaway",
    order_source: "wix",
    status: "pending",
    wix_order_id: wixOrderId ? String(wixOrderId) : null,
    wix_site_id: siteId || null,
    items: parsedItems,
    total: grandTotal,
    delivery_address: payload?.delivery_address || "",
    customer_name: payload?.customer_name || "",
    customer_phone: String(payload?.customer_phone || ''),
    customer_email: String(payload?.customer_email || ''),
    payment_status_wix: payload?.payment_status || "",
    payment_method_wix: payload?.payment_method || "",
    amount_due_wix: grandTotal,
    sent_to_kitchen: false,
  };
  if (ownerEmail) newOrder.created_by = ownerEmail;

  const created = await base44.asServiceRole.entities.Order.create(newOrder);
  console.log("Flat-order created:", created?.id);
  return Response.json({ success: true });
}