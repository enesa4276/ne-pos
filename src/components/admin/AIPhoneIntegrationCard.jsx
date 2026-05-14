import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Phone, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { FEATURES } from '@/lib/features';

// Tenant-spesifik AI telefon alanlarını yönetir.
// NOT: API Key ve Voice Server URL artık global SystemConfig'tedir (Süper Admin → Sistem Ayarları).
export default function AIPhoneIntegrationCard({ tenant, onSaved }) {
  const featureEnabled = !!tenant.features_enabled?.ai_phone;
  const [saving, setSaving] = useState(false);

  const [twilioPhone, setTwilioPhone] = useState(tenant.twilio_phone_number || '');
  const [fallbackPhone, setFallbackPhone] = useState(tenant.settings?.fallback_phone || '');

  useEffect(() => {
    setTwilioPhone(tenant.twilio_phone_number || '');
    setFallbackPhone(tenant.settings?.fallback_phone || '');
  }, [tenant]);

  async function handleSave() {
    setSaving(true);
    try {
      const newSettings = {
        ...(tenant.settings || {}),
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
          API Key ve Voice Server URL artık <strong>global sistem ayarları</strong>ndadır
          (Süper Admin → Sistem Ayarları). Bu bölüm yalnızca bu restorana özel telefon ayarlarını içerir.
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