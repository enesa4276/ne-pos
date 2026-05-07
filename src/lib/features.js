// Sistemde GERÇEKTEN var olan özellikler.
// Bu listede olmayan özellikler tenant'a açılmaz.
// Yeni özellik eklemek için: kodu yaz → buraya ekle → admin paneline otomatik gelir.
export const FEATURES = {
  ai_phone: {
    name: "AI Telefon Asistanı",
    description: "Müşteriler telefonla AI asistana sipariş verebilir (Twilio + Deepgram + LLM)",
    teaser: "Telefon siparişlerinizi 7/24 otomatik karşılayan AI asistan.",
    price: "€49/ay",
    icon: "📞",
    requires_setup: ['twilio_phone_number'], // entegrasyonlar sekmesinde set edilmeli
  },
  qr_menu: {
    name: "QR Menü",
    description: "Her masa için QR kod, müşteri kendi telefonundan sipariş verir",
    teaser: "Garson maliyetini azaltın, hatasız sipariş alın.",
    price: "€15/ay",
    icon: "🔲",
    requires_setup: [],
  },
  advanced_analytics: {
    name: "Gelişmiş Analitik",
    description: "Heatmap, garson performansı, gün sonu AI özeti",
    teaser: "Hangi saatler yoğun, hangi garson en hızlı — verilerle keşfedin.",
    price: "€39/ay",
    icon: "📈",
    requires_setup: [],
  },
  smart_menu_suggestion: {
    name: "Akıllı Menü Önerisi",
    description: "QR menüde müşteriye AI ile uygun ek/üst öneri sunar",
    teaser: "Sepet tutarını ortalama %15 artırın.",
    price: "€19/ay",
    icon: "🍽️",
    requires_setup: [],
  },
};

// Restoranın 3. parti entegrasyonları — "Olmayan" değil, sistemde webhook handler'ları olan gerçek entegrasyonlar.
export const INTEGRATIONS = {
  wix: {
    name: "Wix",
    icon: "🌐",
    description: "Wix sitesinden gelen siparişleri otomatik POS'a aktarır.",
    fields: [
      { key: "wix_site_id", label: "Wix Site ID (metaSiteId)", placeholder: "abc123-def456-..." },
    ],
    webhookHint: "Wix Automations → Webhook URL'i takeawayWebhook fonksiyonu yerine /functions/wixWebhook olarak ayarlayın.",
  },
  takeaway_com: {
    name: "Takeaway.com",
    icon: "🥡",
    description: "Takeaway.com siparişlerini otomatik alır.",
    fields: [
      { key: "takeaway_store_id", label: "Takeaway Store ID", placeholder: "12345" },
      { key: "takeaway_webhook_secret", label: "Webhook Secret", placeholder: "şifre", type: "password" },
    ],
    webhookHint: "Takeaway entegrasyon ekibine /functions/takeawayWebhook adresini ve secret'ı verin.",
  },
  uber_eats: {
    name: "Uber Eats",
    icon: "🛵",
    description: "Uber Eats siparişlerini POS'a alır.",
    fields: [
      { key: "uber_eats_store_id", label: "Uber Eats Store ID", placeholder: "store_..." },
      { key: "uber_eats_webhook_secret", label: "Webhook Secret", placeholder: "şifre", type: "password" },
    ],
    webhookHint: "Uber Eats Developer Portal'da /functions/uberEatsWebhook adresini bildirin.",
  },
  ai_phone: {
    name: "AI Telefon (Twilio)",
    icon: "📞",
    description: "Bu restorana özel Twilio telefon numarası — gelen aramaları AI yanıtlar.",
    requires_feature: "ai_phone",
    fields: [
      { key: "twilio_phone_number", label: "Twilio Numarası", placeholder: "+32...", topLevel: true },
      { key: "fallback_phone", label: "İnsana Aktarım Numarası", placeholder: "+32... (AI başaramazsa)" },
      { key: "default_language", label: "Varsayılan Dil", placeholder: "nl-BE / fr-BE / tr-TR" },
    ],
    webhookHint: "Twilio numarasının Voice Webhook URL'ini /functions/twilioVoiceWebhook olarak ayarlayın.",
  },
};