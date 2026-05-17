// PUBLIC API — Harici AI ses mikroservisi için stok güncelleme
// POST /functions/stockUpdateByAI
// X-Api-Key: {SystemConfig.nepos_api_key}  VEYA  kullanıcı session (admin)

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function getApiKey(svc) {
  const configs = await svc.entities.SystemConfig.filter({ key: "nepos_api_key" });
  return configs[0]?.value || null;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

    const body = await req.json().catch(() => ({}));
    const apiKey = req.headers.get("x-api-key");
    const { tenant_id, ai_response_json } = body;

    if (!tenant_id || !Array.isArray(ai_response_json)) {
      return Response.json({ error: "tenant_id and ai_response_json required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // API key VEYA kullanıcı session auth (admin)
    const expectedKey = await getApiKey(svc);
    if (apiKey) {
      if (!expectedKey || apiKey !== expectedKey) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      const user = await base44.auth.me();
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // matched_id'si olan kayıtları güncelle
    let updatedCount = 0;
    for (const item of ai_response_json) {
      if (item.matched_id) {
        await svc.entities.Product.update(item.matched_id, {
          is_active: false,
          out_of_stock_reason: item.reason || "tükendi",
        });
        updatedCount++;
      }
    }

    return Response.json({ success: true, updated_count: updatedCount });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});