import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Plus, Sparkles, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import AIConfigForm from '@/components/admin/AIConfigForm';
import AIConfigCard from '@/components/admin/AIConfigCard';

export default function AIApiManagement() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [configs, setConfigs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.is_super_admin) loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    const [c, t] = await Promise.all([
      base44.entities.AIApiConfig.list('-created_date'),
      base44.entities.Tenant.list(),
    ]);
    setConfigs(c);
    setTenants(t);
    setLoading(false);
  }

  const tenantName = (id) => {
    if (id === 'global' || !id) return '🌍 Global';
    const t = tenants.find((x) => x.id === id);
    return t?.company_name || 'Bilinmeyen';
  };

  async function handleSave(form) {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.AIApiConfig.update(editing.id, form);
        toast.success('Konfigürasyon güncellendi');
      } else {
        await base44.entities.AIApiConfig.create(form);
        toast.success('Konfigürasyon eklendi');
      }
      setShowForm(false);
      setEditing(null);
      loadAll();
    } catch (e) {
      toast.error('Kaydetme başarısız: ' + e.message);
    }
    setSaving(false);
  }

  async function handleDelete(config) {
    if (!confirm(`"${config.ai_feature}" konfigürasyonunu silmek istiyor musunuz?`)) return;
    await base44.entities.AIApiConfig.delete(config.id);
    toast.success('Silindi');
    loadAll();
  }

  async function handleToggle(config, active) {
    await base44.entities.AIApiConfig.update(config.id, { is_active: active });
    loadAll();
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="text-primary" /> AI API Yönetimi
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI özelliklerini sağlayıcı ve modellerle eşleştirin. API anahtarları sır olarak güvenli saklanır.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Yeni Konfigürasyon
            </Button>
          )}
        </div>

        <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">🔐 Güvenlik Notu</p>
          <p>
            API anahtarlarının değerlerini Base44 Dashboard → Environment Variables bölümünden tanımlayın.
            Burada sadece sır <strong>adını</strong> seçin; gerçek değer asla uygulamada saklanmaz.
          </p>
        </Card>

        {showForm && (
          <AIConfigForm
            initial={editing}
            tenants={tenants}
            saving={saving}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        {configs.length === 0 && !showForm && (
          <Card className="p-8 text-center text-muted-foreground">
            Henüz konfigürasyon yok. <strong>Yeni Konfigürasyon</strong> ile başlayın.
          </Card>
        )}

        <div className="space-y-3">
          {configs.map((config) => (
            <AIConfigCard
              key={config.id}
              config={config}
              tenantName={tenantName(config.tenant_id)}
              onEdit={(c) => { setEditing(c); setShowForm(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}