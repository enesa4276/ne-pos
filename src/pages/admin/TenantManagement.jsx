import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, Plus, LogIn, Beaker, X, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import CreateTenantDialog from '@/components/admin/CreateTenantDialog';

// Tüm tenant'ların ÖZET listesi. Detaylar için her tenant'ın detay sayfasına gidilir.
export default function TenantManagement() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { if (user) loadTenants(); }, [user]);

  async function loadTenants() {
    setLoading(true);
    try {
      const data = await base44.entities.Tenant.list('-created_date');
      setTenants(data);
    } catch (e) { toast.error('Tenant listesi yüklenemedi'); }
    setLoading(false);
  }

  async function impersonate(tenant) {
    await base44.auth.updateMe({ selected_tenant_id: tenant.tenant_id });
    toast.success(`${tenant.company_name} olarak giriliyor…`);
    setTimeout(() => { window.location.href = '/'; }, 400);
  }

  async function exitImpersonation() {
    await base44.auth.updateMe({ selected_tenant_id: '' });
    toast.success('Süper admin paneline dönülüyor');
    setTimeout(() => { window.location.href = '/super-admin'; }, 400);
  }

  async function impersonateRandom() {
    if (!tenants.length) return toast.error('Henüz tenant yok');
    const random = tenants[Math.floor(Math.random() * tenants.length)];
    impersonate(random);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (t.company_name || '').toLowerCase().includes(q) ||
        (t.owner_email || '').toLowerCase().includes(q) ||
        (t.tenant_id || '').toLowerCase().includes(q)
      );
    });
  }, [tenants, search, statusFilter]);

  if (userLoading || loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user?.is_super_admin && user?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-bold mb-2">Erişim engellendi</h2>
        <p className="text-muted-foreground">Bu sayfayı sadece super admin görüntüleyebilir.</p>
      </div>
    );
  }

  const statuses = ['all', 'trial', 'active', 'suspended', 'cancelled'];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="text-primary" /> Restoranlar (Tenant Yönetimi)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tüm restoran hesaplarını buradan yönetin. Detayına girip özellik, entegrasyon ve istatistikleri görün.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {user?.selected_tenant_id && (
              <Button onClick={exitImpersonation} variant="outline" size="sm" className="rounded-xl gap-1">
                <X className="w-3.5 h-3.5" /> Tenant'tan Çık
              </Button>
            )}
            <Button onClick={impersonateRandom} variant="outline" size="sm" className="rounded-xl gap-1">
              <Beaker className="w-3.5 h-3.5" /> Rastgele Test
            </Button>
            <Button onClick={() => setShowCreate(true)} size="sm" className="rounded-xl gap-1">
              <Plus className="w-3.5 h-3.5" /> Yeni Tenant
            </Button>
          </div>
        </div>
        <CreateTenantDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => loadTenants()} />

        {/* Arama & filtre */}
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Restoran adı, email, tenant ID ara..."
              className="h-8 pl-8 text-sm rounded-lg"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
              >
                {s === 'all' ? 'Tümü' : s}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} tenant</span>
        </Card>

        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            {tenants.length === 0 ? 'Henüz tenant yok. Yeni restoran ekleyin.' : 'Filtreye uyan tenant yok.'}
          </Card>
        )}

        <div className="space-y-2">
          {filtered.map((tenant) => {
            const enabledFeatures = Object.entries(tenant.features_enabled || {}).filter(([, v]) => v).map(([k]) => k);
            return (
              <Card
                key={tenant.id}
                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate">{tenant.company_name}</h3>
                      <Badge variant={tenant.status === 'active' ? 'default' : tenant.status === 'suspended' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {tenant.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{tenant.plan}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {tenant.owner_email} · {tenant.total_orders || 0} sipariş · €{(tenant.total_revenue || 0).toFixed(0)}
                    </p>
                    {enabledFeatures.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        ✓ {enabledFeatures.length} özellik aktif
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-1 h-8"
                      onClick={(e) => { e.stopPropagation(); impersonate(tenant); }}
                    >
                      <LogIn className="w-3 h-3" /> Gir
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}