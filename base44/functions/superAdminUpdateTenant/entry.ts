// Süper admin tenant düzenlemeleri — RLS'i bypass etmek için service role.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.is_super_admin && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tenant_id, patch, action } = await req.json();
    if (!tenant_id) return Response.json({ error: "tenant_id required" }, { status: 400 });

    if (action === "delete") {
      await base44.asServiceRole.entities.Tenant.delete(tenant_id);
      return Response.json({ ok: true, deleted: true });
    }

    if (!patch || typeof patch !== "object") {
      return Response.json({ error: "patch object required" }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Tenant.update(tenant_id, patch);
    return Response.json({ ok: true, tenant: updated });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});