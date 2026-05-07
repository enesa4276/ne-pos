import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Sparkles, ShieldCheck, Pencil, Trash2, Key, Phone, Copy, FlaskConical } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import AIProviderForm from '@/components/admin/AIProviderForm';
import AIFeatureMapping from '@/components/admin/AIFeatureMapping';
import AIProviderTestDialog from '@/components/admin/AIProviderTestDialog';
import AIUsageChart from '@/components/admin/AIUsageChart';

export default function AIApiManagement() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testProvider, setTestProvider] = useState(null); // Test diyaloğu için

  useEffect(() => {
    if (user?.role === 'admin' || user?.is_super_admin) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const c = await base44.entities.AIApiConfig.list('-created_date');
      setProviders(c || []);
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('rate limit')) {
        toast.error('Çok fazla istek — birkaç saniye sonra tekrar deneyin');
      } else {
        toast.error('Liste yüklenemedi: ' + (e?.message || ''));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      const payload = { ...form, tenant_id: 'global' };
      if (editing) {
        const updated = await base44.entities.AIApiConfig.update(editing.id, payload);
        setProviders((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...updated, ...payload } : x)));
        toast.success('API güncellendi');
      } else {
        const created = await base44.entities.AIApiConfig.create(payload);
        setProviders((prev) => [created, ...prev]);
        toast.success('API eklendi');
      }
      setShowForm(false); setEditing(null);
    } catch (e) {
      toast.error('Kaydetme başarısız: ' + e.message);
    }
    setSaving(false);
  }

  async function handleDelete(p) {
    if (!confirm('Bu API sağlayıcı kaydı silinsin mi?')) return;
    const prev = providers;
    setProviders((list) => list.filter((x) => x.id !== p.id)); // optimistic
    try {
      await base44.entities.AIApiConfig.delete(p.id);
      toast.success('Silindi');
    } catch (e) {
      setProviders(prev);
      toast.error('Silinemedi: ' + e.message);
    }
  }

  async function handleClone(p) {
    try {
      const payload = {
        tenant_id: p.tenant_id || 'global',
        ai_feature: 'transcription', // havuza ekle, eşleme tab'ından atanır
        ai_provider: p.ai_provider,
        model_name: p.model_name,
        secret_name: p.secret_name,
        temperature: p.temperature,
        max_tokens: p.max_tokens,
        monthly_budget_eur: p.monthly_budget_eur,
        is_active: true,
        notes: p.notes ? `${p.notes} (kopya)` : 'Kopya',
      };
      const created = await base44.entities.AIApiConfig.create(payload);
      setProviders((prev) => [created, ...prev]);
      toast.success('Sağlayıcı klonlandı');
    } catch (e) {
      toast.error('Klonlanamadı: ' + e.message);
    }
  }

  async function handleToggle(p, active) {
    const prev = providers;
    setProviders((list) => list.map((x) => (x.id === p.id ? { ...x, is_active: active } : x))); // optimistic
    try {
      await base44.entities.AIApiConfig.update(p.id, { is_active: active });
    } catch (e) {
      setProviders(prev);
      toast.error('Güncellenemedi: ' + e.message);
    }
  }

  if (userLoading || loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user?.is_super_admin && user?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
        <h2 className="text-lg font-bold mb-2">Erişim engellendi</h2>
        <p className="text-muted-foreground">Bu sayfayı sadece super admin görüntüleyebilir.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary" /> AI API Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            API sağlayıcı havuzu oluşturun ve AI özelliklerine atayın. API anahtarları sır olarak güvenli saklanır.
          </p>
        </div>

        {/* AI Telefon bilgi kartı — burada yapılandırılmaz */}
        <Card className="p-3 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-xs">
          <p className="font-semibold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
            <Phone className="w-3.5 h-3.5" /> AI Telefon Asistanı
          </p>
          <p className="text-purple-700/80 dark:text-purple-300/80 mt-1">
            AI Telefon kendi özel pipeline'ını kullanır (Twilio + Deepgram + OpenRouter). Bu sayfada yapılandırma gerekmez.
            Tenant başına Twilio numarası, dil ve fallback ayarları ilgili tenantın <strong>Entegrasyonlar</strong> sekmesinden yapılır.
          </p>
        </Card>

        <Tabs defaultValue="providers">
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="providers">API Sağlayıcılar</TabsTrigger>
            <TabsTrigger value="mapping">Özellik Eşlemesi</TabsTrigger>
            <TabsTrigger value="usage">Kullanım</TabsTrigger>
          </TabsList>

          {/* SAĞLAYICI HAVUZU */}
          <TabsContent value="providers" className="space-y-3 mt-3">
            <div className="flex justify-end">
              {!showForm && (
                <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }} className="rounded-xl gap-1">
                  <Plus className="h-3.5 w-3.5" /> Yeni API
                </Button>
              )}
            </div>

            <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">🔐 Güvenlik Notu</p>
              <p>
                API anahtarlarının değerlerini Base44 Dashboard → Environment Variables'dan tanımlayın.
                Burada sadece sır <strong>adını</strong> seçin; gerçek değer asla uygulamada saklanmaz.
              </p>
            </Card>

            {showForm && (
              <AIProviderForm
                initial={editing}
                saving={saving}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            )}

            {providers.length === 0 && !showForm && (
              <Card className="p-8 text-center text-muted-foreground text-sm">
                Henüz API sağlayıcı yok. <strong>Yeni API</strong> ile başlayın.
              </Card>
            )}

            <div className="space-y-2">
              {providers.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-bold">{p.ai_provider}</Badge>
                        <span className="font-mono text-xs truncate">{p.model_name}</span>
                        {!p.is_active && <Badge variant="secondary" className="text-[10px]">Pasif</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Key className="h-3 w-3" /> <span className="font-mono">{p.secret_name}</span>
                      </div>
                      {p.notes && <div className="text-[11px] italic mt-0.5 text-muted-foreground">{p.notes}</div>}
                      <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                        <span>🌡 {p.temperature ?? '-'}</span>
                        <span>🎯 max {p.max_tokens ?? '-'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={(c) => handleToggle(p, c)} />
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => setTestProvider(p)} title="Test Et">
                          <FlaskConical className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleClone(p)} title="Klonla">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setShowForm(true); }} title="Düzenle">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p)} title="Sil">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* KULLANIM GRAFİĞİ */}
          <TabsContent value="usage" className="mt-3">
            <AIUsageChart providers={providers} />
          </TabsContent>

          {/* ÖZELLİK EŞLEMESİ */}
          <TabsContent value="mapping" className="mt-3">
            <AIFeatureMapping
              providers={providers}
              onChanged={({ featureKey, configId, clonedRecord }) => {
                // Sayfa yenilenmesin — sadece local state'i güncelle
                setProviders((list) => {
                  let next = list;
                  // Klonlandıysa yeni kaydı ekle
                  if (clonedRecord && !list.find((x) => x.id === clonedRecord.id)) {
                    next = [clonedRecord, ...next];
                  }
                  // Bu feature'a atanan kaydı işaretle, diğerlerini bozma (artık aynı API birden çok feature'a atanabilir)
                  return next.map((p) => (p.id === configId ? { ...p, ai_feature: featureKey } : p));
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AIProviderTestDialog
        open={!!testProvider}
        onOpenChange={(o) => { if (!o) setTestProvider(null); }}
        provider={testProvider}
      />
    </ScrollArea>
  );
}