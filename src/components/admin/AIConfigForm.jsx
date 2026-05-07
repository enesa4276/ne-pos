import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AI_FEATURES, PROVIDER_MODELS, PROVIDER_DEFAULT_SECRETS } from '@/lib/aiFeatures';
import { Save, X } from 'lucide-react';

const DEFAULT_FORM = {
  tenant_id: 'global',
  ai_feature: 'ai_phone_order',
  ai_provider: 'OpenAI',
  model_name: '',
  secret_name: '',
  temperature: 0.7,
  max_tokens: 500,
  is_active: true,
  notes: '',
};

export default function AIConfigForm({ initial, tenants, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || DEFAULT_FORM);

  useEffect(() => {
    setForm(initial || DEFAULT_FORM);
  }, [initial]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tenant (Restoran)</Label>
          <Select value={form.tenant_id} onValueChange={(v) => set('tenant_id', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">🌍 Global (Tüm Tenantlar)</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>AI Özelliği</Label>
          <Select value={form.ai_feature} onValueChange={(v) => set('ai_feature', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(AI_FEATURES).map(([key, info]) => (
                <SelectItem key={key} value={key}>{info.icon} {info.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>AI Sağlayıcı</Label>
          <Select value={form.ai_provider} onValueChange={handleProviderChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(PROVIDER_MODELS).map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Model</Label>
          <Select value={form.model_name} onValueChange={(v) => set('model_name', v)}>
            <SelectTrigger><SelectValue placeholder="Model seç..." /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Sır Adı (Secret Name)</Label>
          <Input
            value={form.secret_name}
            onChange={(e) => set('secret_name', e.target.value)}
            placeholder="OPENAI_API_KEY"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Base44 Dashboard → Environment Variables'dan tanımladığınız sır adı.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Temperature</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={form.temperature}
            onChange={(e) => set('temperature', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Max Tokens</Label>
          <Input
            type="number"
            value={form.max_tokens}
            onChange={(e) => set('max_tokens', parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Notlar</Label>
          <Input
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Opsiyonel notlar..."
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <Switch checked={form.is_active} onCheckedChange={(c) => set('is_active', c)} />
          <Label>Aktif</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1" /> İptal
        </Button>
        <Button onClick={() => onSave(form)} disabled={saving || !form.model_name || !form.secret_name}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}