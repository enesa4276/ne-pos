import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NORMAL_FEATURES, AI_TENANT_FEATURES, FEATURES } from '@/lib/features';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Sparkles, Wrench, Save, Loader2 } from 'lucide-react';

// Özellikler sekmesi — toggle'lar draft state'te tutulur,
// alttaki "Kaydet" butonuna basılınca tek seferde persist edilir.
export default function TenantFeatureToggles({ tenant, onSaved }) {
  const [features, setFeatures] = useState(tenant.features_enabled || {});
  const [limits, setLimits] = useState(tenant.feature_limits || {});
  const [saving, setSaving] = useState(false);

  // Tenant prop değişince (üst bileşen yeniden yükledi) state'i senkronla
  useEffect(() => {
    setFeatures(tenant.features_enabled || {});
    setLimits(tenant.feature_limits || {});
  }, [tenant.id]);

  function toggleFeature(key, enabled) {
    setFeatures((prev) => ({ ...prev, [key]: enabled }));
  }

  function updateLimit(key, value) {
    setLimits((prev) => ({ ...prev, [key]: parseInt(value) || 0 }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await base44.entities.Tenant.update(tenant.id, {
        features_enabled: features,
        feature_limits: limits,
      });
      toast.success('Özellikler kaydedildi');
      onSaved?.();
    } catch (e) {
      toast.error(e.message || 'Kaydetme başarısız');
    }
    setSaving(false);
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
          <LimitField label="Max Sipariş / Ay" value={limits.max_orders_per_month ?? 500} onChange={(v) => updateLimit('max_orders_per_month', v)} />
          <LimitField label="Max Kullanıcı" value={limits.max_users ?? 5} onChange={(v) => updateLimit('max_users', v)} />
          <LimitField label="Max AI Arama / Ay" value={limits.max_ai_calls_per_month ?? 100} onChange={(v) => updateLimit('max_ai_calls_per_month', v)} />
        </div>
      </Card>

      {/* Tek kaydet butonu */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl px-6">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
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

// Limit input — sadece local state günceller, kayıt üstteki butonla olur
function LimitField({ label, value, onChange }) {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={val}
        onChange={(e) => { setVal(e.target.value); onChange(e.target.value); }}
        className="h-8 text-sm rounded-lg"
      />
    </div>
  );
}