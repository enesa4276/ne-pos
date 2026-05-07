import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NORMAL_FEATURES, AI_TENANT_FEATURES, FEATURES } from '@/lib/features';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Sparkles, Wrench, Info } from 'lucide-react';

// Tenant'a açılacak özellikleri yönetir.
// İki grup: Normal Özellikler (operasyonel) + AI Özellikleri.
// Switch optimistic update — sayfa yenilemeden anında değişir, hata olursa geri alınır.
export default function TenantFeatureToggles({ tenant, onSaved }) {
  // Local state — switch'ler anında tepki verir, sayfa yenilenmez.
  const [features, setFeatures] = useState(tenant.features_enabled || {});
  const [limits, setLimits] = useState(tenant.feature_limits || {});

  // Tenant prop değişirse (parent yeniden yüklerse) local state'i sync et.
  useEffect(() => {
    setFeatures(tenant.features_enabled || {});
    setLimits(tenant.feature_limits || {});
  }, [tenant.id]);

  async function toggleFeature(key, enabled) {
    const previous = features;
    const updated = { ...features, [key]: enabled };
    setFeatures(updated); // anında UI güncelle
    try {
      await base44.entities.Tenant.update(tenant.id, { features_enabled: updated });
      toast.success(`${FEATURES[key].name}: ${enabled ? 'Aktif' : 'Pasif'}`);
      // onSaved'ı çağırmıyoruz — parent reload sayfayı sıfırlardı.
    } catch (e) {
      setFeatures(previous); // geri al
      toast.error(e.message || 'Güncelleme başarısız');
    }
  }

  async function updateLimit(key, value) {
    const previous = limits;
    const updated = { ...limits, [key]: parseInt(value) || 0 };
    setLimits(updated);
    try {
      await base44.entities.Tenant.update(tenant.id, { feature_limits: updated });
      toast.success('Limit güncellendi');
    } catch (e) {
      setLimits(previous);
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {/* NORMAL ÖZELLİKLER */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Operasyonel Özellikler</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Restoranın günlük işleyişine yönelik temel modüller.
        </p>
        <FeatureGroup features={NORMAL_FEATURES} enabledMap={features} onToggle={toggleFeature} />
      </Card>

      {/* AI ÖZELLİKLERİ */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="font-bold text-sm">AI Özellikleri</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Yapay zeka tabanlı özellikler. Her birinin global API atamasının yapılmış olması gerekir
          (<strong>Süper Admin → AI API Yönetimi</strong>).
        </p>
        <FeatureGroup features={AI_TENANT_FEATURES} enabledMap={features} onToggle={toggleFeature} isAI />
      </Card>

      {/* LİMİTLER */}
      <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">Kullanım Limitleri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Limit
            label="Max Sipariş / Ay"
            value={limits.max_orders_per_month ?? 500}
            onSave={(v) => updateLimit('max_orders_per_month', v)}
          />
          <Limit
            label="Max Kullanıcı"
            value={limits.max_users ?? 5}
            onSave={(v) => updateLimit('max_users', v)}
          />
          <Limit
            label="Max AI Arama / Ay"
            value={limits.max_ai_calls_per_month ?? 100}
            onSave={(v) => updateLimit('max_ai_calls_per_month', v)}
          />
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{info.icon}</span>
                <span className="font-medium text-sm">{info.name}</span>
                <Badge variant="outline" className="text-[10px]">{info.price}</Badge>
                {isAI && info.no_api_assignment && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Info className="w-2.5 h-2.5" /> Özel sistem
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
              {info.requires_setup?.length > 0 && enabled && (
                <p className="text-[10px] text-amber-600 mt-1">
                  ⚠ Entegrasyonlar sekmesinden ayar gerekli: {info.requires_setup.join(', ')}
                </p>
              )}
            </div>
            <Switch checked={enabled} onCheckedChange={(c) => onToggle(key, c)} />
          </div>
        );
      })}
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