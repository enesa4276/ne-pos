// Admin panelden bir API sağlayıcıyı küçük bir prompt ile test etmek için.
// Kayıtlı AIApiConfig'i kullanmaz — frontend'den gelen provider/model/secret ile direkt çağırır.
// Sadece super_admin veya admin çağırabilir.

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
      max_tokens: max_tokens ?? 200,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AI call failed: ${data?.error?.message || res.statusText}`);
  return {
    text: data?.choices?.[0]?.message?.content || "",
    usage: data?.usage || null,
  };
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
      max_tokens: max_tokens ?? 200,
      temperature: temperature ?? 0.7,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic failed: ${data?.error?.message || res.statusText}`);
  return {
    text: data?.content?.[0]?.text || "",
    usage: data?.usage ? { prompt_tokens: data.usage.input_tokens, completion_tokens: data.usage.output_tokens, total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0) } : null,
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.is_super_admin && user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { ai_provider, model_name, secret_name, prompt, temperature, max_tokens, config_id } = body || {};
    if (!ai_provider || !model_name || !secret_name || !prompt) {
      return Response.json({ error: "ai_provider, model_name, secret_name, prompt required" }, { status: 400 });
    }

    const apiKey = Deno.env.get(secret_name);
    if (!apiKey) {
      return Response.json({ error: `Sır bulunamadı: ${secret_name}` }, { status: 500 });
    }

    const messages = [
      { role: "system", content: "You are a helpful assistant. Reply briefly." },
      { role: "user", content: prompt },
    ];

    const t0 = Date.now();
    let result;
    try {
      if (ai_provider === "OpenAI") {
        result = await callOpenAICompatible({ baseUrl: "https://api.openai.com/v1", apiKey, model: model_name, messages, temperature, max_tokens });
      } else if (ai_provider === "OpenRouter") {
        result = await callOpenAICompatible({
          baseUrl: "https://openrouter.ai/api/v1", apiKey, model: model_name, messages, temperature, max_tokens,
          extraHeaders: { "HTTP-Referer": "https://nepos.app", "X-Title": "Ne-Pos" },
        });
      } else if (ai_provider === "Groq") {
        result = await callOpenAICompatible({ baseUrl: "https://api.groq.com/openai/v1", apiKey, model: model_name, messages, temperature, max_tokens });
      } else if (ai_provider === "Anthropic") {
        result = await callAnthropic({ apiKey, model: model_name, messages, max_tokens, temperature });
      } else {
        return Response.json({ error: `Sağlayıcı desteklenmiyor: ${ai_provider}` }, { status: 400 });
      }
    } catch (callErr) {
      // Hata logu
      try {
        await base44.asServiceRole.entities.AIApiCallLog.create({
          tenant_id: "global",
          ai_feature: "test",
          primary_config_id: config_id || "",
          used_config_id: config_id || "",
          ai_provider,
          model_name,
          status: "failed",
          duration_ms: Date.now() - t0,
          error_message: callErr.message,
          fallback_used: false,
          is_test: true,
          user_email: user.email,
        });
      } catch (_) { /* ignore */ }
      return Response.json({ error: callErr.message }, { status: 502 });
    }
    const ms = Date.now() - t0;

    // Başarı logu
    try {
      const u = result.usage || {};
      await base44.asServiceRole.entities.AIApiCallLog.create({
        tenant_id: "global",
        ai_feature: "test",
        primary_config_id: config_id || "",
        used_config_id: config_id || "",
        ai_provider,
        model_name,
        status: "success",
        duration_ms: ms,
        prompt_tokens: u.prompt_tokens || 0,
        completion_tokens: u.completion_tokens || 0,
        total_tokens: u.total_tokens || ((u.prompt_tokens || 0) + (u.completion_tokens || 0)),
        fallback_used: false,
        is_test: true,
        user_email: user.email,
      });
    } catch (_) { /* ignore */ }

    // Test çağrısını kullanım kayıtlarına ekle (is_test: true) — bütçe grafikleri için
    try {
      const usage = result.usage || {};
      const day = new Date().toISOString().slice(0, 10);
      await base44.asServiceRole.entities.AIUsageEntry.create({
        tenant_id: "global",
        config_id: config_id || "test",
        ai_provider,
        model_name,
        ai_feature: "test",
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)),
        request_count: 1,
        is_test: true,
        day_key: day,
      });
    } catch (_) { /* logging best-effort */ }

    return Response.json({
      ok: true,
      text: result.text,
      usage: result.usage,
      latency_ms: ms,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});