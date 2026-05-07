import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

// Sertleştirilmiş Wix webhook handler:
// - Tüm parsing adımları try-catch içinde
// - Eksik veride güvenli fallback
// - Hata loglama (console.error)
// - Asla 5xx döndürmez (Wix retry'leri sınırlı tutmak için 200 ile graceful fail)

function safeParseFloat(v, fallback = 0) {
  try {
    if (v === null || v === undefined) return fallback;
    const n = parseFloat(String(v).replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  } catch { return fallback; }
}

function safeParseInt(v, fallback = 1) {
  const n = parseInt(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "*" } });
  }
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  let payload;
  try {
    const text = await req.text();
    if (!text || !text.trim()) {
      console.warn("[wixWebhook] empty body");
      return Response.json({ success: true, note: "empty body" });
    }
    payload = JSON.parse(text);
  } catch (e) {
    console.error("[wixWebhook] JSON parse error:", e.message);
    return Response.json({ success: false, error: "invalid_json" });
  }

  try {
    const base44 = createClientFromRequest(req);

    const wixOrderId = String(payload?.orderId || "").trim();
    const siteId = payload?.metaSiteId || "";
    if (!wixOrderId) {
      console.warn("[wixWebhook] missing orderId");
      return Response.json({ success: true, skipped: true });
    }

    const existing = await base44.asServiceRole.entities.Order.filter({ wix_order_id: wixOrderId }).catch(() => []);
    if (existing?.length) return Response.json({ success: true, duplicate: true });

    const lineItems = Array.isArray(payload?.lineItems) ? payload.lineItems : [];
    const parsedItems = lineItems.map((item) => {
      try {
        const priceRaw = item?.price ?? item?.priceData?.price ?? item?.totalPrice ?? 0;
        const basePrice = safeParseFloat(priceRaw, 0);
        const qty = safeParseInt(item?.quantity, 1);
        const options = item?.options || item?.variantData?.selectedOptions || [];
        const extras = Array.isArray(options)
          ? options.map((o) => ({ name: `${o.option || o.optionKey || ""}: ${o.selection || o.value || ""}`, price: 0 })).filter((e) => e.name !== ": ")
          : [];
        return {
          product_id: item?.catalogReference?.catalogItemId || item?.id || "",
          product_name: item?.productName?.original || item?.name || "Onbekend",
          base_price: basePrice,
          extras,
          quantity: qty,
          subtotal: parseFloat((basePrice * qty).toFixed(2)),
        };
      } catch (e) {
        console.error("[wixWebhook] line parse error:", e.message);
        return null;
      }
    }).filter(Boolean);

    const totalRaw = payload?.priceSummary?.total?.amount ?? payload?.priceSummary?.total ?? 0;
    const grandTotal = safeParseFloat(totalRaw, parsedItems.reduce((s, i) => s + i.subtotal, 0));

    const cd = payload?.customerDetails || payload?.contact || {};
    const customerName = `${cd?.firstName || ""} ${cd?.lastName || ""}`.trim() || payload?.email || "";
    const customerPhone = String(cd?.phone || cd?.recipientInfoPhoneNumber || cd?.phoneNumber || "");
    const customerEmail = String(cd?.email || payload?.email || "");

    const da = payload?.deliveryAddress || {};
    const addrParts = [
      da?.addressLine || da?.street || da?.streetAddress?.name || "",
      da?.addressLine2 || "", da?.city || "", da?.postalCode || da?.zipCode || "", da?.country || "",
    ].filter(Boolean);
    const fullAddr = [addrParts.join(", "), payload?.deliveryInstructions, payload?.buyerNote, payload?.fulfillmentMethod ? `(${payload.fulfillmentMethod})` : ""].filter(Boolean).join(" | ");

    // Tenant bul
    let tenantId = null;
    let ownerEmail = null;
    if (siteId) {
      const tenants = await base44.asServiceRole.entities.Tenant.filter({}).catch(() => []);
      const matchedTenant = tenants.find((t) => t.settings?.wix_site_id === siteId);
      if (matchedTenant) tenantId = matchedTenant.tenant_id;

      const users = await base44.asServiceRole.entities.User.list().catch(() => []);
      const matchedUser = users.find((u) => u.wix_site_id === siteId);
      if (matchedUser) ownerEmail = matchedUser.email;
      if (!tenantId && matchedUser?.tenant_id) tenantId = matchedUser.tenant_id;
    }

    const newOrder = {
      tenant_id: tenantId || undefined,
      order_type: "takeaway",
      order_source: "wix",
      status: "pending",
      wix_order_id: wixOrderId,
      wix_site_id: siteId || null,
      items: parsedItems,
      total: grandTotal,
      delivery_address: fullAddr,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      payment_status_wix: payload?.paymentStatus || "",
      payment_method_wix: "",
      amount_due_wix: grandTotal,
      sent_to_kitchen: false,
    };
    if (ownerEmail) newOrder.created_by = ownerEmail;

    const created = await base44.asServiceRole.entities.Order.create(newOrder);
    console.log("[wixWebhook] created:", created?.id);
    return Response.json({ success: true, id: created?.id });
  } catch (e) {
    console.error("[wixWebhook] fatal:", e.message, e.stack);
    return Response.json({ success: false, error: e.message });
  }
});