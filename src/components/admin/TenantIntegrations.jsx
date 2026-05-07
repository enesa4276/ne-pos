import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { INTEGRATIONS, FEATURES } from '@/lib/features';
import { Save, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Restoran (tenant) için 3. parti entegrasyonların ayar paneli.
// Settings JSON içine yazar (wix_site_id, takeaway_store_id, vs.)
export default function TenantIntegrations({ tenant, onSaved }) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(null); // hangi entegrasyon kaydediliyor

  useEffect(() => {
    setDraft({
      ...(tenant.settings || {}),
      twilio_phone_number: tenant.twilio_phone_number || '',
    });
  }, [tenant]);

  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));

  async function saveIntegration(integrationKey) {
    setSaving(integrationKey);
    try {
      const def = INTEGRATIONS[integrationKey];
      // top-level alanları (twilio_phone_number gibi) ile settings JSON'unu ayır
      const updates = {};
      const settingsPatch = { ...(tenant.settings || {}) };

      def.fields.forEach((f) => {
        const val = draft[f.key] ?? '';
        if (f.topLevel) {
          updates[f.key] = val;
        } else {
          settingsPatch[f.key] = val;
        }
      });

      updates.settings = settingsPatch;
      await base44.entities.Tenant.update(tenant.id, updates);
      toast.success(`${def.name} ayarları kaydedildi`);
      onSaved?.();
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message);
    }
    setSaving(null);
  }

  return (
    <div className="space-y-3">
      {Object.entries(INTEGRATIONS).map(([key, def]) => {
        const requiresFeature = def.requires_feature;
        const featureEnabled = !requiresFeature || tenant.features_enabled?.[requiresFeature];

        return (
          <Card key={key} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{def.icon}</span>
                  <h3 className="font-bold">{def.name}</h3>
                  {requiresFeature && (
                    <Badge variant={featureEnabled ? 'default' : 'secondary'} className="text-[10px]">
                      {featureEnabled ? '✓ Özellik aktif' : `Özellik kapalı: ${FEATURES[requiresFeature]?.name}`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{def.description}</p>
              </div>
            </div>

            {!featureEnabled && (
              <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Bu entegrasyon için önce <strong>{FEATURES[requiresFeature]?.name}</strong> özelliğini aktif edin.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {def.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type={f.type || 'text'}
                    value={draft[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>

            {def.webhookHint && (
              <div className="text-[11px] bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 flex gap-2 text-blue-700">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{def.webhookHint}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => saveIntegration(key)}
                disabled={saving === key}
                className="rounded-xl gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                {saving === key ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}