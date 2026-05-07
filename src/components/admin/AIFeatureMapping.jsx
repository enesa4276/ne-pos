import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AI_FEATURES } from '@/lib/aiFeatures';
import { toast } from 'sonner';
import { Loader2, Link2, CheckCircle2, AlertTriangle } from 'lucide-react';

// AI Özellik ↔ API Sağlayıcı eşlemesi.
// Her AI özelliği için, mevcut API sağlayıcılarından (havuzdan) bir tanesi seçilir.
// Eşleme AIApiConfig kayıtlarının ai_feature alanına kaydedilir (mevcut yapıyla uyumlu).
export default function AIFeatureMapping({ providers, onChanged }) {
  const [mappings, setMappings] = useState({}); // featureKey -> configId
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMappings(); /* eslint-disable-next-line */ }, [providers]);

  async function loadMappings() {
    setLoading(true);
    // Var olan global eşlemeleri oku (ai_feature alanı belirli bir feature key'ine eşit olanlar)
    const configs = providers || [];
    const map = {};
    for (const f of Object.keys(AI_FEATURES)) {
      const found = configs.find((c) => c.ai_feature === f && c.is_active);
      if (found) map[f] = found.id;
    }
    setMappings(map);
    setLoading(false);
  }

  async function setMapping(featureKey, configId) {
    try {
      // Önce: bu özelliği şu an hangi config kullanıyor? Onu generic ('transcription') yap ki kaybolmasın.
      // Basit yaklaşım: seçilen config'in ai_feature'ı bu featureKey olur.
      // Diğer aynı feature'a atanmış configleri 'transcription'a çevir (havuzda tut).
      const same = providers.filter((p) => p.ai_feature === featureKey && p.id !== configId);
      await Promise.all(same.map((p) => base44.entities.AIApiConfig.update(p.id, { ai_feature: 'transcription' })));

      if (configId === 'none') {
        toast.success('Eşleme kaldırıldı');
      } else {
        await base44.entities.AIApiConfig.update(configId, { ai_feature: featureKey });
        toast.success('Eşleme güncellendi');
      }
      setMappings((m) => ({ ...m, [featureKey]: configId === 'none' ? undefined : configId }));
      onChanged?.();
    } catch (e) {
      toast.error('Hata: ' + e.message);
    }
  }

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1 flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> AI Özellik Eşlemesi</p>
        <p>
          Her AI özelliğine, eklediğiniz API sağlayıcılarından birini atayın. Atanmamış özellikler çalışmaz.
        </p>
      </Card>

      {Object.entries(AI_FEATURES).map(([fKey, info]) => {
        const current = mappings[fKey];
        const mapped = providers.find((p) => p.id === current);
        return (
          <Card key={fKey} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info.icon}</span>
                  <span className="font-bold">{info.label}</span>
                  {mapped ? (
                    <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Atandı
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-amber-700 border-amber-500/40 text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> Atanmamış
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
              </div>
            </div>
            <Select value={current || 'none'} onValueChange={(v) => setMapping(fKey, v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="API seç..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Atama yok —</SelectItem>
                {providers.filter((p) => p.is_active).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.ai_provider} · {p.model_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        );
      })}
    </div>
  );
}