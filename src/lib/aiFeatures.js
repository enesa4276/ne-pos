// AI özelliklerinin tanımları — AI Özellik ↔ API Sağlayıcı eşlemesi için kullanılır.
// no_api_assignment=true olan özellikler (AI Phone gibi) kendi özel sistemini kullanır,
// tenant başına ayrı API ataması yapılmaz.
export const AI_FEATURES = {
  smart_menu_suggestion: {
    label: 'Akıllı Menü Önerisi',
    description: 'QR menüde müşteriye AI ile uygun ek/üst öneri sunar.',
    icon: '🍽️',
  },
  eod_summary: {
    label: 'Gün Sonu Özeti',
    description: 'Günlük satış ve performans özetini AI çıkarır.',
    icon: '📊',
  },
  menu_photo_import: {
    label: 'Menü Fotoğraftan İçe Aktar',
    description: 'Menü fotoğraflarından AI ile ürün ve kategori oluşturur (vision modeli gerekir).',
    icon: '📸',
  },
  transcription: {
    label: 'Ses Transkripsiyonu',
    description: 'Genel amaçlı ses → metin (Deepgram).',
    icon: '🎙️',
  },
};

// Sağlayıcı bazlı önerilen modeller
export const PROVIDER_MODELS = {
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  OpenRouter: [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
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