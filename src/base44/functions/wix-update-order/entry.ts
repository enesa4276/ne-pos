import { createClientFromRequest } from "npm:@base44/sdk";

// Updates order status on Wix Restaurants via Admin API
// Called from frontend when staff changes order status

const WIX_STATUS_MAP: Record<string, string> = {
  accepted: "ACCEPTED",
  preparing: "IN_PROGRESS",
  ready_for_delivery_pickup: "READY_FOR_PICKUP",
  out_for_delivery: "OUT_FOR_DELIVERY",
  fulfilled: "FULFILLED",
  cancelled: "CANCELED",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, newStatus, wixOrderId, userEmail } = body;

  if (!wixOrderId || !newStatus) {
    return Response.json({ error: "Missing wixOrderId or newStatus" }, { status: 400 });
  }

  const wixApiStatus = WIX_STATUS_MAP[newStatus];
  if (!wixApiStatus) {
    console.log("No Wix mapping for status:", newStatus, "- skipping Wix update");
    return Response.json({ success: true, skipped: true });
  }

  // Get Wix API key from the user's settings
  // The Admin API key is stored as a Base44 secret: WIX_ADMIN_API_KEY
  const wixApiKey = Deno.env.get("WIX_ADMIN_API_KEY");

  if (!wixApiKey) {
    console.error("WIX_ADMIN_API_KEY secret not set");
    return Response.json({ error: "Wix API key not configured" }, { status: 500 });
  }

  // Find the user's wix_site_id
  let siteId: string | null = null;
  try {
    if (userEmail) {
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users && users.length > 0) {
        siteId = users[0].wix_site_id;
      }
    }
  } catch (e) {
    console.error("Error fetching user:", e);
  }

  // Call Wix Restaurants API to update order status
  // Wix Restaurants v2 API
  try {
    const wixRes = await fetch(
      `https://www.wixapis.com/restaurants/v2/orders/${wixOrderId}/statuses/fulfillment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: wixApiKey,
          ...(siteId ? { "wix-site-id": siteId } : {}),
        },
        body: JSON.stringify({ status: wixApiStatus }),
      }
    );

    const wixData = await wixRes.json();
    console.log("Wix update response:", JSON.stringify(wixData));

    if (!wixRes.ok) {
      console.error("Wix API error:", wixData);
      // Don't fail - the local update already happened
      return Response.json({ success: false, wixError: wixData });
    }

    return Response.json({ success: true, wixData });
  } catch (e: any) {
    console.error("Error calling Wix API:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});