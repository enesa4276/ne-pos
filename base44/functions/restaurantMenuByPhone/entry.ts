// PUBLIC API (X-Api-Key gerekli):
// GET /api/restaurant/{phone_number}/menu
// Harici AI telefon sunucusu menüyü almak için bu endpoint'i çağırır.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let phoneNumber;
    let apiKey;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      phoneNumber = body.phone_number;
      apiKey = req.headers.get("x-api-key") || body.api_key;
    } else {
      const url = new URL(req.url);
      phoneNumber = url.searchParams.get("phone_number");
      apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
    }

    if (!phoneNumber) {
      return Response.json({ error: "phone_number required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Tenant'ı twilio_phone_number ile bul
    const tenants = await svc.entities.Tenant.filter({ twilio_phone_number: phoneNumber });
    const tenant = tenants[0];
    if (!tenant) {
      return Response.json({ error: "Bu numaraya bağlı restoran bulunamadı" }, { status: 404 });
    }

    // API key kontrolü
    const expectedKey = tenant.settings?.api_key;
    if (!expectedKey || apiKey !== expectedKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Menü verisini topla (tenant'a ait kayıtlar)
    const [products, categories, extraGroups, extras] = await Promise.all([
      svc.entities.Product.filter({ tenant_id: tenant.tenant_id }),
      svc.entities.Category.filter({ tenant_id: tenant.tenant_id }, 'sort_order'),
      svc.entities.ExtraGroup.filter({ tenant_id: tenant.tenant_id }),
      svc.entities.Extra.filter({ tenant_id: tenant.tenant_id }),
    ]);

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const groupMap = Object.fromEntries(extraGroups.map((g) => [g.id, g]));
    const extrasByGroup = {};
    for (const e of extras) {
      if (!extrasByGroup[e.group_id]) extrasByGroup[e.group_id] = [];
      extrasByGroup[e.group_id].push({ name: e.name, price: e.price || 0 });
    }

    const productsOut = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.base_price || 0),
      category: catMap[p.category_id] || null,
      is_active: p.is_active !== false,
      out_of_stock_reason: p.out_of_stock_reason || null,
      extras: (p.extra_group_ids || []).map((gid) => ({
        group_name: groupMap[gid]?.name || '',
        selection_type: groupMap[gid]?.selection_type || 'multiple',
        options: extrasByGroup[gid] || [],
      })),
    }));

    return Response.json({
      tenant_id: tenant.tenant_id,
      restaurant_name: tenant.company_name,
      categories: categories.map((c) => ({ id: c.id, name: c.name, sort_order: c.sort_order || 0 })),
      products: productsOut,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});