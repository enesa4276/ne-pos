// Push back: Sistemimizdeki sipariş durumunu dış platformlara (Wix, Uber Eats, Takeaway) bildirir.
// Tamamen Deno fetch ile yazıldı, Base44 dahili AI/credit modülü kullanılmaz.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

// Sistemden -> Platform'a statü eşleştirmeleri
const WIX_STATUS_MAP = {
  pending: "NOT_FULFILLED",
  preparing: "ACCEPTED",
  ready: "READY",
  completed: "FULFILLED",
  cancelled: "CANCELED",
};

const UBER_STATUS_MAP = {
  pending: "accepted",
  preparing: "preparing",
  ready: "ready_for_pickup",
  completed: "fulfilled",
  cancelled: "cancelled",
};

const TAKEAWAY_STATUS_MAP = {
  pending: "RECEIVED",
  preparing: "ACCEPTED",
  ready: "READY",
  completed: "DELIVERED",
  cancelled: "REJECTED",
};

async function pushToWix(order, status) {
  const apiKey = Deno.env.get("WIX_API_KEY");
  const siteId = order.wix_site_id;
  const externalId = order.wix_order_id || order.external_order_id;
  if (!apiKey || !siteId || !externalId) return { skipped: true, reason: "missing wix credentials" };

  const wixStatus = WIX_STATUS_MAP[status];
  const res = await fetch(`https://www.wixapis.com/ecom/v1/orders/${externalId}/fulfillments`, {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "wix-site-id": siteId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fulfillment: { status: wixStatus } }),
  });
  return { ok: res.ok, status: res.status, platform: "wix" };
}

async function pushToUber(order, status) {
  const token = Deno.env.get("UBER_EATS_TOKEN");
  const externalId = order.external_order_id;
  if (!token || !externalId) return { skipped: true, reason: "missing uber credentials" };

  const uberStatus = UBER_STATUS_MAP[status];
  const res = await fetch(`https://api.uber.com/v1/eats/orders/${externalId}/status`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: uberStatus }),
  });
  return { ok: res.ok, status: res.status, platform: "uber_eats" };
}

async function pushToTakeaway(order, status) {
  const token = Deno.env.get("TAKEAWAY_API_TOKEN");
  const externalId = order.external_order_id;
  if (!token || !externalId) return { skipped: true, reason: "missing takeaway credentials" };

  const takeawayStatus = TAKEAWAY_STATUS_MAP[status];
  const res = await fetch(`https://api.takeaway.com/orders/${externalId}/status`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: takeawayStatus }),
  });
  return { ok: res.ok, status: res.status, platform: "takeaway_com" };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { order_id, status } = await req.json();
    if (!order_id || !status) {
      return Response.json({ error: "order_id and status required" }, { status: 400 });
    }

    const order = await base44.entities.Order.get(order_id);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    let result = { skipped: true, reason: "no external source" };
    if (order.order_source === "wix") result = await pushToWix(order, status);
    else if (order.order_source === "uber_eats") result = await pushToUber(order, status);
    else if (order.order_source === "takeaway_com") result = await pushToTakeaway(order, status);

    return Response.json({ ok: true, result });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});