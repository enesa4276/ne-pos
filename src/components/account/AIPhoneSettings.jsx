import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Save, Globe, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AIPhoneSettings({ origin }) {
  const { tenant, hasFeature, refresh } = useTenant();
  const [twilioNumber, setTwilioNumber] = useState('');
  const [fallback, setFallback] = useState('');
  const [language, setLanguage] = useState('nl-BE');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tenant) {
      setTwilioNumber(tenant.twilio_phone_number || '');
      setFallback(tenant.settings?.fallback_phone || '');
      setLanguage(tenant.settings?.default_language || 'nl-BE');
    }
  }, [tenant]);

  const url = `${origin}/functions/twilioVoiceWebhook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await base44.entities.Tenant.update(tenant.id, {
        twilio_phone_number: twilioNumber,
        settings: {
          ...(tenant.settings || {}),
          fallback_phone: fallback,
          default_language: language,
        },
      });
      toast.success('AI telefon ayarları kaydedildi');
      refresh();
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message);
    }
    setSaving(false);
  };

  if (!tenant) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />AI Telefon Asistanı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI telefon ayarları için önce bir Tenant kaydı gerekiyor. Süper admin'den hesabınıza tenant atanmasını isteyin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const enabled = hasFeature('ai_phone');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />AI Telefon Asistanı
          {enabled ? (
            <span className="ml-auto text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full font-medium">Aktif</span>
          ) : (
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />Premium
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
            Bu özellik henüz aktif değil. Aktivasyon için bizimle iletişime geçin.
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="h-3.5 w-3.5" />Twilio Voice Webhook URL
          </Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="rounded-xl font-mono text-xs bg-secondary/50" />
            <Button size="icon" variant="outline" className="shrink-0 rounded-xl" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Twilio'da numaranızın "A Call Comes In" ayarına bu URL'i yapıştırın.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Phone className="h-3.5 w-3.5" />Twilio Telefon Numarası
          </Label>
          <Input
            value={twilioNumber}
            onChange={(e) => setTwilioNumber(e.target.value)}
            placeholder="+32xxxxxxxxx"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Phone className="h-3.5 w-3.5" />Yedek (İnsan) Numarası
          </Label>
          <Input
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="+32xxxxxxxxx"
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">AI 3 kere anlamayınca bu numaraya aktarılır.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="h-3.5 w-3.5" />Varsayılan Dil
          </Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nl-BE">🇧🇪 Nederlands (België)</SelectItem>
              <SelectItem value="fr-BE">🇧🇪 Français (Belgique)</SelectItem>
              <SelectItem value="en-US">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full rounded-xl gap-2" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </CardContent>
    </Card>
  );
}