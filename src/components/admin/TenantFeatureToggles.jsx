import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NORMAL_FEATURES, AI_TENANT_FEATURES, FEATURES } from '@/lib/features';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Sparkles, Wrench } from 'lucide-react';

export default function TenantFeatureToggles({ tenant, onSaved }) {
  const [features, setFeatures] = useState(tenant.features_enabled || {});
  const [limits, setLimits] = useState(tenant.feature_limits || {});

  useEffect(() => {
    setFeatures(tenant.features_enabled || {});
    setLimits(tenant.feature_limits || {});
  }, [tenant.id]);

  async function persist(patch) {
    await base44.entities.Tenant.update(tenant.id, patch);
  }

  async function toggleFeature(key, enabled) {
    const previous = features;
    const updated = { ...features, [key]: enabled };
    setFeatures(updated);
    try {
      await persist({ features_enabled: updated });
      onSaved?.();
      toast.success(`${FEATURES[key]?.name ?? key}: ${enabled ? 'Aktif' : 'Pasif'}`);
    } catch (e) {
      setFeatures(previous);
      toast.error(e.message || 'Güncelleme başarısız');
    }
  }

  async function updateLimit(key, value) {
    const previous = limits;
    const updated = { ...limits, [key]: parseInt(value) || 0 };
    setLimits(updated);
    try {
      await persist({ feature_limits: updated });
      onSaved?.();
      toast.success('Limit güncellendi');
    } catch (e) {
      setLimits(previous);
      toast.error(e.message || 'Güncelleme başarısız');
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Operasyonel Özellikler</h3>
        </div>
        <p className="text-xs text-muted-foreground">Restoranın günlük işleyişine yönelik temel modüller.</p>
        <FeatureGroup features={NORMAL_FEATURES} enabledMap={features} onToggle={toggleFeature} />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="font-bold text-sm">AI Özellikleri</h3>
        </div>
        <p className="text-xs text-muted-foreground">Yapay zeka tabanlı özellikler.</p>
        <FeatureGroup features={AI_TENANT_FEATURES} enabledMap={features} onToggle={toggleFeature} isAI />
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">Kullanım Limitleri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Limit label="Max Sipariş / Ay" value={limits.max_orders_per_month ?? 500} onSave={(v) => updateLimit('max_orders_per_month', v)} />
          <Limit label="Max Kullanıcı" value={limits.max_users ?? 5} onSave={(v) => updateLimit('max_users', v)} />
          <Limit label="Max AI Arama / Ay" value={limits.max_ai_calls_per_month ?? 100} onSave={(v) => updateLimit('max_ai_calls_per_month', v)} />
        </div>
      </Card>
    </div>
  );
}

function FeatureGroup({ features, enabledMap, onToggle, isAI = false }) {
  return (
    <div className="space-y-2">
      {Object.entries(features).map(([key, info]) => {
        const enabled = !!enabledMap?.[key];
        return (
          <div key={key} className="flex items-start justify-between gap-3 p-3 bg-secondary/30 rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{info.name}</span>
                {isAI && <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-300">AI</Badge>}
                {enabled && <Badge variant="default" className="text-[10px]">Aktif</Badge>}
              </div>
              {info.description && <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>}
            </div>
            <Switch checked={enabled} onCheckedChange={(val) => onToggle(key, val)} className="mt-0.5 shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

function Limit({ label, value, onSave }) {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="h-8 text-sm rounded-lg" />
        <button onClick={() => onSave(val)} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">Kaydet</button>
      </div>
    </div>
  );
}
