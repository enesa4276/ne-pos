// AI Phone takeover — restoran personeli aktif aramayı kendi telefonuna yönlendirir.
// Twilio REST API ile çağrı redirect edilir.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { call_sid, target_phone, reason = "manual_takeover" } = await req.json();
    if (!call_sid || !target_phone) {
      return Response.json({ error: "call_sid ve target_phone gerekli" }, { status: 400 });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) {
      return Response.json({ error: "Twilio credentials not set" }, { status: 500 });
    }

    // TwiML: aramayı target_phone'a Dial et
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="nl-BE">Een moment, ik verbind u door met een medewerker.</Say>
  <Dial timeout="30">${target_phone}</Dial>
</Response>`;

    // Twilio REST: çağrıyı yeni TwiML ile yönlendir
    const auth = btoa(`${accountSid}:${authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call_sid}.json`;

    const body = new URLSearchParams({ Twiml: twiml });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Twilio takeover failed:", data);
      return Response.json({ error: data.message || "Takeover failed", details: data }, { status: 500 });
    }

    // PhoneCall kaydını güncelle
    const calls = await base44.asServiceRole.entities.PhoneCall.filter({ call_sid });
    if (calls[0]) {
      await base44.asServiceRole.entities.PhoneCall.update(calls[0].id, {
        status: "transferred_to_human",
        transferred_to_human: true,
        transfer_reason: reason,
      });
    }

    return Response.json({ ok: true, twilio: data });
  } catch (e) {
    console.error("twilioCallTakeover error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});