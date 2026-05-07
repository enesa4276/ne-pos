// Süper admin için: Yeni Tenant oluşturur ve tenant_id'yi otomatik UUID olarak atar.
// Frontend hiçbir zaman tenant_id girmez; bu endpoint sadece company_name + owner_email alır.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function generateUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.is_super_admin && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { company_name, owner_email, owner_name, phone, plan } = body || {};
    if (!company_name || !owner_email) {
      return Response.json({ error: "company_name and owner_email required" }, { status: 400 });
    }

    const tenant_id = generateUUID();
    const subdomain = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);

    const tenant = await base44.asServiceRole.entities.Tenant.create({
      tenant_id,
      company_name,
      owner_email,
      owner_name: owner_name || "",
      phone: phone || "",
      plan: plan || "basic",
      status: "trial",
      subdomain,
      features_enabled: {
        ai_phone: false,
        advanced_crm: false,
        inventory_management: false,
        advanced_analytics: false,
        qr_menu: false,
        whatsapp_integration: false,
        multi_branch: false,
      },
      feature_limits: {
        max_orders_per_month: 500,
        max_users: 5,
        max_ai_calls_per_month: 100,
      },
    });

    return Response.json({ success: true, tenant });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});