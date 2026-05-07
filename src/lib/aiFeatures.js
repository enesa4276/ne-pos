// AI özelliklerinin tanımları - süper admin panelinde gösterilir
export const AI_FEATURES = {
  ai_phone_order: {
    label: 'AI Telefon Siparişi',
    description: 'Müşteri aramalarını yanıtlayan ve sipariş alan AI asistan',
    icon: '📞',
  },
  smart_menu_suggestion: {
    label: 'Akıllı Menü Önerisi',
    description: 'Müşteriye uygun menü ve upsell önerileri',
    icon: '🍽️',
  },
  eod_summary: {
    label: 'Gün Sonu Özeti',
    description: 'Günlük satış ve performans özeti',
    icon: '📊',
  },
  transcription: {
    label: 'Ses Transkripsiyonu',
    description: 'Telefon görüşmelerini metne çevirme',
    icon: '🎙️',
  },
};

// Sağlayıcı bazlı önerilen modeller
export const PROVIDER_MODELS = {
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  OpenRouter: [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.1-70b-instruct',
    'google/gemini-flash-1.5',
  ],
  Groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  Deepgram: ['nova-2', 'nova', 'enhanced', 'base'],
  Anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
};

// Sağlayıcı için varsayılan secret adı (öneri)
export const PROVIDER_DEFAULT_SECRETS = {
  OpenAI: 'OPENAI_API_KEY',
  OpenRouter: 'OPENROUTER_API_KEY',
  Groq: 'GROQ_API_KEY',
  Deepgram: 'DEEPGRAM_API_KEY',
  Anthropic: 'ANTHROPIC_API_KEY',
};