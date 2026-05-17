// PUBLIC API — Harici AI ses mikroservisi için
// GET /functions/restaurantMenuByPhone?phone={twilio_phone_number}
// X-Api-Key: {SystemConfig.nepos_api_key}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function getApiKey(svc) {
  const configs = await svc.entities.SystemConfig.filter({ key: "nepos_api_key" });
  return configs[0]?.value || null;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get("phone") || url.searchParams.get("phone_number");
    const apiKey = req.headers.get("x-api-key");

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // API key doğrulama
    const expectedKey = await getApiKey(svc);
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!phone) {
      return Response.json({ error: "phone query param required" }, { status: 400 });
    }

    // Tenant'ı twilio_phone_number ile bul
    const tenants = await svc.entities.Tenant.filter({ twilio_phone_number: phone });
    const tenant = tenants[0];
    if (!tenant) {
      return Response.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Menü verisini paralel çek
    const [products, categories, extraGroups, extras] = await Promise.all([
      svc.entities.Product.filter({ tenant_id: tenant.tenant_id }),
      svc.entities.Category.filter({ tenant_id: tenant.tenant_id }, "sort_order"),
      svc.entities.ExtraGroup.filter({ tenant_id: tenant.tenant_id }),
      svc.entities.Extra.filter({ tenant_id: tenant.tenant_id }),
    ]);

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const groupMap = Object.fromEntries(extraGroups.map((g) => [g.id, g]));
    const extrasByGroup = {};
    for (const e of extras) {
      if (!extrasByGroup[e.group_id]) extrasByGroup[e.group_id] = [];
      extrasByGroup[e.group_id].push({ id: e.id, name: e.name, price: Number(e.price || 0) });
    }

    const productsOut = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.base_price || 0),
      category_id: p.category_id || null,
      category_name: catMap[p.category_id]?.name || null,
      is_active: p.is_active !== false,
      out_of_stock_reason: p.out_of_stock_reason || null,
      extras: (p.extra_group_ids || []).map((gid) => ({
        group_id: gid,
        group_name: groupMap[gid]?.name || "",
        selection_type: groupMap[gid]?.selection_type || "multiple",
        options: extrasByGroup[gid] || [],
      })),
    }));

    return Response.json({
      tenant_id: tenant.tenant_id,
      restaurant_name: tenant.company_name,
      fallback_phone: tenant.settings?.fallback_phone || null,
      default_language: tenant.settings?.default_language || "nl",
      greeting_message: tenant.settings?.greeting_message || null,
      business_hours: tenant.settings?.business_hours || null,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sort_order || 0,
        color: c.color || null,
      })),
      products: productsOut,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});