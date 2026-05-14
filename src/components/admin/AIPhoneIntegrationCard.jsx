import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Phone, Eye, EyeOff, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { FEATURES } from '@/lib/features';

// Üst düzey + settings içindeki AI telefon alanlarını tek formda yönetir.
// API Key: 32 karakter hex üretici + göster/gizle.
function generateApiKey() {
  const bytes = new Uint8Array(16); // 16 byte = 32 hex karakter
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AIPhoneIntegrationCard({ tenant, onSaved }) {
  const featureEnabled = !!tenant.features_enabled?.ai_phone;
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [twilioPhone, setTwilioPhone] = useState(tenant.twilio_phone_number || '');
  const [apiKey, setApiKey] = useState(tenant.settings?.api_key || '');
  const [voiceServerUrl, setVoiceServerUrl] = useState(tenant.settings?.voice_server_url || '');
  const [fallbackPhone, setFallbackPhone] = useState(tenant.settings?.fallback_phone || '');

  useEffect(() => {
    setTwilioPhone(tenant.twilio_phone_number || '');
    setApiKey(tenant.settings?.api_key || '');
    setVoiceServerUrl(tenant.settings?.voice_server_url || '');
    setFallbackPhone(tenant.settings?.fallback_phone || '');
  }, [tenant]);

  async function handleSave() {
    setSaving(true);
    try {
      // Mevcut settings'i koru, sadece bu 3 alanı güncelle
      const newSettings = {
        ...(tenant.settings || {}),
        api_key: apiKey,
        voice_server_url: voiceServerUrl,
        fallback_phone: fallbackPhone,
      };
      await base44.entities.Tenant.update(tenant.id, {
        twilio_phone_number: twilioPhone,
        settings: newSettings,
      });
      toast.success('AI Telefon ayarları kaydedildi');
      onSaved?.();
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message);
    }
    setSaving(false);
  }

  function handleGenerateKey() {
    setApiKey(generateApiKey());
    setShowKey(true);
    toast.info('Yeni API Key üretildi — kaydetmeyi unutmayın');
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📞</span>
            <h3 className="font-bold">AI Telefon Entegrasyonu</h3>
            <Badge variant={featureEnabled ? 'default' : 'secondary'} className="text-[10px]">
              {featureEnabled ? '✓ Özellik aktif' : `Kapalı: ${FEATURES.ai_phone?.name}`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Harici AI ses sunucusunun Ne-POS ile iletişim kurması için gerekli bağlantı bilgileri.
          </p>
        </div>
      </div>

      {!featureEnabled && (
        <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex gap-2 text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Bu entegrasyon için önce <strong>AI Telefon Asistanı</strong> özelliğini aktif edin.</span>
        </div>
      )}

      {/* Bilgi notu */}
      <div className="text-[11px] bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 flex gap-2 text-blue-700">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Bu bilgiler harici AI ses sunucusunun Ne-POS ile iletişim kurması için gereklidir.
          API Key'i ses sunucunuzun <code className="font-mono bg-blue-500/10 px-1 rounded">.env</code> dosyasına{' '}
          <code className="font-mono bg-blue-500/10 px-1 rounded">NEPOS_API_KEY</code> olarak ekleyin.
        </span>
      </div>

      {/* Twilio Numarası */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Twilio Numarası</Label>
        <Input
          value={twilioPhone}
          onChange={(e) => setTwilioPhone(e.target.value)}
          placeholder="+32..."
          className="h-9 text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground">Müşterilerin arayacağı Twilio numarası.</p>
      </div>

      {/* API Key */}
      <div className="space-y-1">
        <Label className="text-xs">API Key</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="32 karakterlik gizli anahtar"
              className="h-9 text-sm font-mono pr-9"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? 'Gizle' : 'Göster'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button
            type="button" variant="outline" size="sm"
            onClick={handleGenerateKey}
            className="h-9 rounded-xl gap-1 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Yeni Key
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Harici sunucu Ne-POS API'lerini <code className="font-mono">X-Api-Key</code> header'ı ile çağırır.
        </p>
      </div>

      {/* Voice Server URL */}
      <div className="space-y-1">
        <Label className="text-xs">Voice Server URL</Label>
        <Input
          value={voiceServerUrl}
          onChange={(e) => setVoiceServerUrl(e.target.value)}
          placeholder="https://your-voice-server.up.railway.app"
          className="h-9 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">Harici ses sunucusunun temel URL'i (manuel devralma buraya istek atar).</p>
      </div>

      {/* Fallback Telefon */}
      <div className="space-y-1">
        <Label className="text-xs">Fallback Telefon</Label>
        <Input
          value={fallbackPhone}
          onChange={(e) => setFallbackPhone(e.target.value)}
          placeholder="+32XXXXXXXXX"
          className="h-9 text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground">AI çağrıyı devredemezse aramanın gideceği gerçek restoran telefonu.</p>
      </div>

      {/* Kaydet */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-1">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </Card>
  );
}