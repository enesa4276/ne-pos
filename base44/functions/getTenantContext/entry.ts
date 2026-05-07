// Frontend'in mevcut tenant'ı güvenli şekilde almasını sağlayan endpoint.
// Tenant ID hiçbir zaman frontend'e açık manuel olarak ifşa edilmez;
// burada user oturumundan otomatik türetilir.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = user.is_super_admin
      ? (user.selected_tenant_id || user.tenant_id || null)
      : (user.tenant_id || null);

    if (!tenantId) {
      return Response.json({ tenant: null, isSuperAdmin: !!user.is_super_admin });
    }

    let tenant = null;
    const byTenantId = await base44.asServiceRole.entities.Tenant.filter({ tenant_id: tenantId });
    tenant = byTenantId?.[0] || null;
    if (!tenant) {
      try {
        tenant = await base44.asServiceRole.entities.Tenant.get(tenantId);
      } catch (_) { tenant = null; }
    }

    return Response.json({
      tenant,
      isSuperAdmin: !!user.is_super_admin,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});