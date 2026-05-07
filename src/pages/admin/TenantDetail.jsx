import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Building2, Loader2, LogIn, Settings, Plug, Sparkles, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/useCurrentUser';
import TenantGeneralForm from '@/components/admin/TenantGeneralForm';
import TenantFeatureToggles from '@/components/admin/TenantFeatureToggles';
import TenantIntegrations from '@/components/admin/TenantIntegrations';
import TenantStats from '@/components/admin/TenantStats';

// Tek bir restoran (tenant) için tüm yönetim alanı.
// Sekmeler: İstatistik · Genel · Özellikler · Entegrasyonlar
export default function TenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.Tenant.get(tenantId);
      setTenant(t);
    } catch (e) {
      toast.error('Tenant yüklenemedi');
    }
    setLoading(false);
  }

  async function impersonate() {
    await base44.auth.updateMe({ selected_tenant_id: tenant.tenant_id });
    toast.success(`${tenant.company_name} olarak giriliyor…`);
    setTimeout(() => { window.location.href = '/'; }, 400);
  }

  if (userLoading || loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user?.is_super_admin && user?.role !== 'admin') {
    return <div className="p-6 text-center text-muted-foreground">Erişim yok.</div>;
  }

  if (!tenant) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Tenant bulunamadı.</p>
        <Button onClick={() => navigate('/super-admin/tenants')} className="mt-4 rounded-xl">Listeye Dön</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        {/* Üst bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/tenants')} className="gap-1 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Tüm Tenantlar
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black truncate">{tenant.company_name}</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {tenant.owner_email} · ID: <span className="font-mono">{tenant.tenant_id}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>{tenant.status}</Badge>
              <Badge variant="outline">{tenant.plan}</Badge>
              <Button size="sm" className="rounded-xl gap-1" onClick={impersonate}>
                <LogIn className="w-3.5 h-3.5" /> Bu Restoran Olarak Gir
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="stats" className="space-y-3">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="stats" className="gap-1"><BarChart3 className="w-3.5 h-3.5" /> İstatistik</TabsTrigger>
            <TabsTrigger value="general" className="gap-1"><Settings className="w-3.5 h-3.5" /> Genel</TabsTrigger>
            <TabsTrigger value="features" className="gap-1"><Sparkles className="w-3.5 h-3.5" /> Özellikler</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1"><Plug className="w-3.5 h-3.5" /> Entegrasyonlar</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <TenantStats tenant={tenant} />
          </TabsContent>
          <TabsContent value="general">
            <TenantGeneralForm tenant={tenant} onSaved={load} onDeleted={() => navigate('/super-admin/tenants')} />
          </TabsContent>
          <TabsContent value="features">
            <TenantFeatureToggles tenant={tenant} onSaved={load} />
          </TabsContent>
          <TabsContent value="integrations">
            <TenantIntegrations tenant={tenant} onSaved={load} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}