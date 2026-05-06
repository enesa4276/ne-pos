/**
 * TWILIO TRANSFER
 * AI 3 kere müşteriyi anlamayınca bu endpoint'e yönlendirir,
 * burada insan operatörüne aktarır.
 */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone") || "";

  if (!phone) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="nl-BE">Sorry, geen medewerker beschikbaar.</Say>
  <Hangup/>
</Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="nl-BE">Een moment, ik verbind u door met een medewerker.</Say>
  <Dial timeout="30">${phone}</Dial>
</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
});