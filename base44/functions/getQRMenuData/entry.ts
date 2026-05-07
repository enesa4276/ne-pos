import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

// Public endpoint — QR menüsü için tüm verileri tek seferde döner.
// Müşteri giriş yapmadığı için asServiceRole ile veri çekilir.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { tenant_id, table_id } = await req.json();
    if (!tenant_id || !table_id) {
      return Response.json({ error: 'tenant_id ve table_id zorunlu' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // 1) Tenant'ı bul
    const tenants = await sr.entities.Tenant.filter({ tenant_id });
    const tenant = tenants[0] || null;
    if (!tenant) {
      return Response.json({ error: 'Restoran bulunamadı', tenant: null, table: null }, { status: 404 });
    }

    // 2) Masayı bul — önce tenant_id ile, bulunamazsa direkt id ile
    let table = null;
    try {
      table = await sr.entities.RestaurantTable.get(table_id);
    } catch (_) { /* yok */ }
    if (!table) {
      return Response.json({ error: 'Masa bulunamadı', tenant: null, table: null }, { status: 404 });
    }

    // 3) Menü verilerini çek — tenant_id boş kayıtları da görmek için iki sorgu birleştir
    const [catsT, catsNull, prodsT, prodsNull, extraGroups, extras] = await Promise.all([
      sr.entities.Category.filter({ tenant_id }),
      sr.entities.Category.filter({ tenant_id: null }).catch(() => []),
      sr.entities.Product.filter({ tenant_id }),
      sr.entities.Product.filter({ tenant_id: null }).catch(() => []),
      sr.entities.ExtraGroup.filter({ tenant_id }).catch(() => []),
      sr.entities.Extra.filter({ tenant_id }).catch(() => []),
    ]);

    // tenant_id boş veya eşleşen kayıtları al, dedupe
    const dedupe = (arr) => {
      const map = new Map();
      arr.forEach((x) => map.set(x.id, x));
      return [...map.values()];
    };
    const categories = dedupe([...catsT, ...catsNull]);
    const products = dedupe([...prodsT, ...prodsNull]);

    // sort_order'a göre sırala
    categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return Response.json({
      tenant: {
        tenant_id: tenant.tenant_id,
        company_name: tenant.company_name,
      },
      table: { id: table.id, name: table.name },
      categories,
      products,
      extra_groups: extraGroups,
      extras,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('getQRMenuData error:', error);
    return Response.json({ error: error.message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
});