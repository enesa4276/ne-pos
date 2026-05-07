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

  // Bir API'yi birden fazla özelliğe atayabilmek için:
  // - Aynı (provider+model+secret) sahip başka bir kayıt zaten o özelliğe atanmışsa onu kullan.
  // - Yoksa seçilen API kaydını "klonlayarak" yeni bir kayıt oluştur ve ona feature'ı ata.
  // Böylece her AIApiConfig kaydı yine tek bir feature'ı temsil eder ama aynı API farklı feature'larda çalışabilir.
  async function setMapping(featureKey, configId) {
    const prev = mappings;
    // Optimistic UI
    setMappings((m) => ({ ...m, [featureKey]: configId === 'none' ? undefined : configId }));

    try {
      if (configId === 'none') {
        // Bu feature'a atanmış kaydı havuza al (transcription)
        const current = (providers || []).find((p) => p.ai_feature === featureKey);
        if (current) {
          await base44.entities.AIApiConfig.update(current.id, { ai_feature: 'transcription' });
        }
        toast.success('Eşleme kaldırıldı');
        onChanged?.({ featureKey, configId: null });
        return;
      }

      const selected = (providers || []).find((p) => p.id === configId);
      if (!selected) throw new Error('Seçilen API bulunamadı');

      // Aynı (provider+model+secret) sahip ve zaten bu featureKey'e atanmış bir kayıt var mı?
      const alreadyMapped = (providers || []).find((p) =>
        p.ai_feature === featureKey &&
        p.ai_provider === selected.ai_provider &&
        p.model_name === selected.model_name &&
        p.secret_name === selected.secret_name
      );

      let finalId = configId;
      if (alreadyMapped) {
        finalId = alreadyMapped.id;
      } else if (selected.ai_feature && selected.ai_feature !== featureKey) {
        // Seçilen kayıt başka bir feature'a atanmış → KLONLA, böylece her ikisi de çalışır.
        const clone = await base44.entities.AIApiConfig.create({
          tenant_id: selected.tenant_id || 'global',
          ai_feature: featureKey,
          ai_provider: selected.ai_provider,
          model_name: selected.model_name,
          secret_name: selected.secret_name,
          temperature: selected.temperature,
          max_tokens: selected.max_tokens,
          monthly_budget_eur: selected.monthly_budget_eur,
          is_active: true,
          notes: selected.notes,
        });
        finalId = clone.id;
      } else {
        // Henüz hiçbir feature'a atanmamış → doğrudan ata
        await base44.entities.AIApiConfig.update(configId, { ai_feature: featureKey });
      }

      // Bu featureKey'e atanmış DİĞER kayıtları geri al (birden fazla atama olmasın aynı feature'a)
      const sameFeatureOthers = (providers || []).filter(
        (p) => p.ai_feature === featureKey && p.id !== finalId
      );
      for (const p of sameFeatureOthers) {
        await base44.entities.AIApiConfig.update(p.id, { ai_feature: 'transcription' });
      }

      setMappings((m) => ({ ...m, [featureKey]: finalId }));
      toast.success('Eşleme güncellendi');
      onChanged?.({ featureKey, configId: finalId, reload: !alreadyMapped && selected.ai_feature && selected.ai_feature !== featureKey });
    } catch (e) {
      setMappings(prev);
      const msg = String(e?.message || '').toLowerCase().includes('rate limit')
        ? 'Çok hızlı tıkladınız — birkaç saniye sonra tekrar deneyin'
        : 'Hata: ' + e.message;
      toast.error(msg);
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
        // Aynı (provider+model+secret) kombosunu tek seçenek olarak göster — temsilci olarak ilk aktif kaydı kullan.
        const seen = new Set();
        const uniqueOptions = [];
        for (const p of providers.filter((x) => x.is_active)) {
          const key = `${p.ai_provider}|${p.model_name}|${p.secret_name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          // Eğer bu kombo zaten bu feature'a atanmışsa onun id'sini kullan, değilse herhangi bir aktif kaydını
          const matchForFeature = providers.find(
            (x) => x.is_active && x.ai_provider === p.ai_provider && x.model_name === p.model_name && x.secret_name === p.secret_name && x.ai_feature === fKey
          );
          uniqueOptions.push({ id: (matchForFeature || p).id, ai_provider: p.ai_provider, model_name: p.model_name });
        }
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
                {uniqueOptions.map((p) => (
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