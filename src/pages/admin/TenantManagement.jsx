import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FEATURES } from '@/lib/features';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, Plus } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import CreateTenantDialog from '@/components/admin/CreateTenantDialog';

export default function TenantManagement() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (user) loadTenants();
  }, [user]);

  async function loadTenants() {
    setLoading(true);
    try {
      const data = await base44.entities.Tenant.list();
      setTenants(data);
    } catch (e) {
      toast.error('Tenant listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function toggleFeature(tenant, featureKey, enabled) {
    const updatedFeatures = { ...(tenant.features_enabled || {}), [featureKey]: enabled };
    try {
      await base44.entities.Tenant.update(tenant.id, { features_enabled: updatedFeatures });
      toast.success(`${FEATURES[featureKey].name} ${enabled ? 'aktif' : 'pasif'}`);
      loadTenants();
    } catch (e) {
      toast.error('Güncelleme başarısız');
    }
  }

  async function updateLimit(tenant, limitKey, value) {
    const updatedLimits = { ...(tenant.feature_limits || {}), [limitKey]: parseInt(value) || 0 };
    try {
      await base44.entities.Tenant.update(tenant.id, { feature_limits: updatedLimits });
      toast.success('Limit güncellendi');
      loadTenants();
    } catch (e) {
      toast.error('Güncelleme başarısız');
    }
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
            <h1 className="text-2xl font-bold">🏢 Tenant Yönetimi</h1>
            <p className="text-sm text-muted-foreground">Tüm restoranların özelliklerini ve limitlerini yönetin. Tenant ID'leri otomatik UUID olarak atanır.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl"><Plus className="w-4 h-4 mr-1" /> Yeni Tenant</Button>
        </div>
        <CreateTenantDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => loadTenants()} />

        {tenants.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Henüz tenant yok. Yeni restoran ekleyin.
          </Card>
        )}

        {tenants.map((tenant) => (
          <Card key={tenant.id} className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-bold">{tenant.company_name}</h3>
                  {tenant.subdomain && (
                    <p className="text-sm text-muted-foreground">{tenant.subdomain}.nepos.app</p>
                  )}
                  <p className="text-xs text-muted-foreground">{tenant.owner_email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                  {tenant.status}
                </Badge>
                <Badge variant="outline">{tenant.plan}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-secondary/20 rounded-lg">
              <Stat label="Siparişler" value={tenant.total_orders || 0} />
              <Stat label="Ciro" value={`€${(tenant.total_revenue || 0).toFixed(0)}`} />
              <Stat label="AI Aramalar" value={tenant.total_ai_calls || 0} />
              <Stat label="AI Maliyet" value={`€${(tenant.monthly_ai_cost || 0).toFixed(2)}`} red />
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Özellikler:</div>
              <div className="space-y-2">
                {Object.entries(FEATURES).map(([key, info]) => {
                  const isEnabled = tenant.features_enabled?.[key] || false;
                  return (
                    <div key={key} className="flex items-center justify-between p-2 bg-secondary/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <span className="text-sm">{info.name}</span>
                        <Badge variant="outline" className="text-xs">{info.price}</Badge>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={(c) => toggleFeature(tenant, key, c)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Limitler:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <LimitInput label="Max Sipariş/Ay" value={tenant.feature_limits?.max_orders_per_month || 500}
                  onChange={(v) => updateLimit(tenant, 'max_orders_per_month', v)} />
                <LimitInput label="Max Kullanıcı" value={tenant.feature_limits?.max_users || 5}
                  onChange={(v) => updateLimit(tenant, 'max_users', v)} />
                <LimitInput label="Max AI Arama/Ay" value={tenant.feature_limits?.max_ai_calls_per_month || 100}
                  onChange={(v) => updateLimit(tenant, 'max_ai_calls_per_month', v)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function Stat({ label, value, red }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-bold ${red ? 'text-red-500' : ''}`}>{value}</div>
    </div>
  );
}

function LimitInput({ label, value, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onChange(v)}
        className="mt-1"
      />
    </div>
  );
}