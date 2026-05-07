import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PROVIDER_MODELS, PROVIDER_DEFAULT_SECRETS } from '@/lib/aiFeatures';
import { Save, X, FlaskConical } from 'lucide-react';
import AIProviderTestDialog from '@/components/admin/AIProviderTestDialog';

// Yeni form: hangi AI özelliği için soruluyor DEĞİL.
// Sadece sağlayıcı + model + secret eklenir. Daha sonra AI özelliklerine ayrı ekrandan atanır.
const DEFAULT_FORM = {
  ai_provider: 'OpenRouter',
  model_name: 'openai/gpt-4o-mini',
  secret_name: 'OPENROUTER_API_KEY',
  temperature: 0.7,
  max_tokens: 500,
  is_active: true,
  notes: '',
  // ai_feature alanı sadece DB uyumluluğu için tutulur — "general" placeholder'ı kullanılır.
  ai_feature: 'transcription',
};

export default function AIProviderForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || DEFAULT_FORM);
  const [testOpen, setTestOpen] = useState(false);

  useEffect(() => { setForm(initial || DEFAULT_FORM); }, [initial]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleProviderChange = (provider) => {
    setForm((f) => ({
      ...f,
      ai_provider: provider,
      model_name: PROVIDER_MODELS[provider]?.[0] || '',
      secret_name: PROVIDER_DEFAULT_SECRETS[provider] || '',
    }));
  };

  const models = PROVIDER_MODELS[form.ai_provider] || [];

  return (
    <div className="space-y-4 p-4 bg-secondary/20 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">AI Sağlayıcı</Label>
          <Select value={form.ai_provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(PROVIDER_MODELS).map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <Select value={form.model_name} onValueChange={(v) => set('model_name', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Model seç..." /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Sır Adı (Secret Name)</Label>
          <Input
            value={form.secret_name}
            onChange={(e) => set('secret_name', e.target.value)}
            placeholder="OPENAI_API_KEY"
            className="font-mono h-9"
          />
          <p className="text-[11px] text-muted-foreground">
            Base44 Dashboard → Environment Variables'dan tanımladığınız sır adı.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Temperature</Label>
          <Input
            type="number" step="0.1" min="0" max="2"
            value={form.temperature}
            onChange={(e) => set('temperature', parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Max Tokens</Label>
          <Input
            type="number"
            value={form.max_tokens}
            onChange={(e) => set('max_tokens', parseInt(e.target.value) || 0)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Notlar</Label>
          <Input
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Opsiyonel notlar..."
            className="h-9"
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <Switch checked={form.is_active} onCheckedChange={(c) => set('is_active', c)} />
          <Label className="text-xs">Aktif</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1 flex-wrap">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="rounded-xl">
          <X className="h-3.5 w-3.5 mr-1" /> İptal
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTestOpen(true)}
          disabled={!form.model_name || !form.secret_name}
          className="rounded-xl"
          title="Kaydetmeden önce test et"
        >
          <FlaskConical className="h-3.5 w-3.5 mr-1" /> Test Et
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(form)}
          disabled={saving || !form.model_name || !form.secret_name}
          className="rounded-xl"
        >
          <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <AIProviderTestDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        provider={form}
      />
    </div>
  );
}