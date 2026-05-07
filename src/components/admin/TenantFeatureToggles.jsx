import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FEATURES } from '@/lib/features';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Sadece sistemde GERÇEKTEN var olan özellikleri toggle eder.
// FEATURES listesi merkezi — yeni özellik eklendiğinde otomatik buraya gelir.
export default function TenantFeatureToggles({ tenant, onSaved }) {
  async function toggleFeature(key, enabled) {
    const updated = { ...(tenant.features_enabled || {}), [key]: enabled };
    try {
      await base44.entities.Tenant.update(tenant.id, { features_enabled: updated });
      toast.success(`${FEATURES[key].name}: ${enabled ? 'Aktif' : 'Pasif'}`);
      onSaved?.();
    } catch (e) { toast.error(e.message); }
  }

  async function updateLimit(key, value) {
    const updated = { ...(tenant.feature_limits || {}), [key]: parseInt(value) || 0 };
    try {
      await base44.entities.Tenant.update(tenant.id, { feature_limits: updated });
      toast.success('Limit güncellendi');
      onSaved?.();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-2">
        <h3 className="font-bold text-sm mb-2">Özellikler</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Sadece sistemde gerçekten kullanılabilir olan özellikler listelenir. Bir özellik aktif edilmezse,
          restoran kullanıcısı o özelliği uygulamada hiç görmez.
        </p>
        <div className="space-y-2">
          {Object.entries(FEATURES).map(([key, info]) => {
            const enabled = !!tenant.features_enabled?.[key];
            return (
              <div key={key} className="flex items-start justify-between gap-3 p-3 bg-secondary/30 rounded-xl">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{info.icon}</span>
                    <span className="font-medium text-sm">{info.name}</span>
                    <Badge variant="outline" className="text-[10px]">{info.price}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={(c) => toggleFeature(key, c)} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">Kullanım Limitleri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Limit
            label="Max Sipariş / Ay"
            value={tenant.feature_limits?.max_orders_per_month ?? 500}
            onSave={(v) => updateLimit('max_orders_per_month', v)}
          />
          <Limit
            label="Max Kullanıcı"
            value={tenant.feature_limits?.max_users ?? 5}
            onSave={(v) => updateLimit('max_users', v)}
          />
          <Limit
            label="Max AI Arama / Ay"
            value={tenant.feature_limits?.max_ai_calls_per_month ?? 100}
            onSave={(v) => updateLimit('max_ai_calls_per_month', v)}
          />
        </div>
      </Card>
    </div>
  );
}

function Limit({ label, value, onSave }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v != value && onSave(v)}
        className="h-8 text-sm"
      />
    </div>
  );
}