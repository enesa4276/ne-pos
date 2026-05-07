// AI Router: AIApiConfig'e göre doğru sağlayıcı + model + secret ile LLM çağırır.
// Sır anahtarları frontend'e ASLA gönderilmez. Frontend yalnızca özelliği ve mesajı verir.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function callOpenAICompatible({ baseUrl, apiKey, model, messages, temperature, max_tokens, extraHeaders = {} }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 500,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AI call failed: ${data?.error?.message || res.statusText}`);
  return data?.choices?.[0]?.message?.content || "";
}

async function callAnthropic({ apiKey, model, messages, max_tokens, temperature }) {
  const sys = messages.find((m) => m.role === "system")?.content || "";
  const userMessages = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: sys,
      messages: userMessages,
      max_tokens: max_tokens ?? 500,
      temperature: temperature ?? 0.7,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic failed: ${data?.error?.message || res.statusText}`);
  return data?.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { feature, messages, tenant_id: requestedTenantId } = body || {};
    if (!feature || !Array.isArray(messages)) {
      return Response.json({ error: "feature and messages required" }, { status: 400 });
    }

    const tenantId = user.is_super_admin
      ? (requestedTenantId || user.selected_tenant_id || user.tenant_id)
      : user.tenant_id;

    // Önce tenant'a özel config ara, sonra global'e fallback
    let configs = [];
    if (tenantId) {
      configs = await base44.asServiceRole.entities.AIApiConfig.filter({
        tenant_id: tenantId,
        ai_feature: feature,
        is_active: true,
      });
    }
    if (!configs.length) {
      configs = await base44.asServiceRole.entities.AIApiConfig.filter({
        tenant_id: "global",
        ai_feature: feature,
        is_active: true,
      });
    }
    const config = configs[0];
    if (!config) {
      return Response.json({ error: `Bu özellik için AI konfigürasyonu yok: ${feature}` }, { status: 404 });
    }

    const apiKey = Deno.env.get(config.secret_name);
    if (!apiKey) {
      return Response.json({ error: `Sır bulunamadı: ${config.secret_name}` }, { status: 500 });
    }

    let text = "";
    if (config.ai_provider === "OpenAI") {
      text = await callOpenAICompatible({
        baseUrl: "https://api.openai.com/v1",
        apiKey,
        model: config.model_name,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      });
    } else if (config.ai_provider === "OpenRouter") {
      text = await callOpenAICompatible({
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey,
        model: config.model_name,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        extraHeaders: { "HTTP-Referer": "https://nepos.app", "X-Title": "Ne-Pos" },
      });
    } else if (config.ai_provider === "Groq") {
      text = await callOpenAICompatible({
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey,
        model: config.model_name,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      });
    } else if (config.ai_provider === "Anthropic") {
      text = await callAnthropic({
        apiKey,
        model: config.model_name,
        messages,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
      });
    } else {
      return Response.json({ error: `Sağlayıcı desteklenmiyor: ${config.ai_provider}` }, { status: 400 });
    }

    return Response.json({ text, provider: config.ai_provider, model: config.model_name });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});