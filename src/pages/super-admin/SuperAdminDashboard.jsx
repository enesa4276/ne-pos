import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { base44 } from '@/api/base44Client';
import {
  Building2, ShieldAlert, Loader2, ArrowRight,
  ShoppingBag, Euro, Phone, Activity,
} from 'lucide-react';
import moment from 'moment';

export default function SuperAdminDashboard() {
  const { data: user, isLoading } = useCurrentUser();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user?.is_super_admin || user?.role === 'admin') loadStats();
    // eslint-disable-next-line
  }, [user]);

  async function loadStats() {
    try {
      const [tenants, orders, calls] = await Promise.all([
        base44.entities.Tenant.list('-created_date').catch(() => []),
        base44.entities.Order.list('-created_date', 500).catch(() => []),
        base44.entities.PhoneCall.list('-created_date', 100).catch(() => []),
      ]);

      const last30 = moment().subtract(30, 'days');
      const ordersLast30 = orders.filter((o) => moment(o.created_date).isAfter(last30));
      const revenue = ordersLast30.reduce((s, o) => s + (o.total || 0), 0);
      const activeTenants = tenants.filter((t) => t.status === 'active').length;
      const trialTenants = tenants.filter((t) => t.status === 'trial').length;

      setStats({
        tenantsTotal: tenants.length,
        activeTenants,
        trialTenants,
        ordersLast30: ordersLast30.length,
        revenueLast30: revenue,
        callsTotal: calls.length,
        recentTenants: tenants.slice(0, 5),
      });
    } catch (e) { console.error(e); }
    setLoadingStats(false);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user?.is_super_admin && user?.role !== 'admin') {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Erişim engellendi</h2>
        <p className="text-muted-foreground">Bu alan sadece süper admin içindir.</p>
      </div>
    );
  }

  const tiles = [
    {
      to: '/super-admin/tenants',
      icon: Building2,
      title: 'Restoran (Tenant) Yönetimi',
      desc: 'Restoran hesaplarını, özelliklerini ve entegrasyonlarını yönetin.',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-12">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Süper Admin</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Kontrol Paneli</h1>
          <p className="text-muted-foreground mt-1 text-sm">Tüm tenantların ve global yapay zeka altyapısının kuş bakışı görünümü.</p>
        </div>

        {/* GERÇEK İSTATİSTİK KARTLARI */}
        {loadingStats ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              icon={Building2} label="Aktif Restoran" value={stats.activeTenants}
              sub={`${stats.trialTenants} trial · ${stats.tenantsTotal} toplam`}
              color="text-blue-500" bg="bg-blue-500/10"
            />
            <StatTile
              icon={ShoppingBag} label="Sipariş (30g)" value={stats.ordersLast30}
              sub="Tüm tenantlar" color="text-orange-500" bg="bg-orange-500/10"
            />
            <StatTile
              icon={Euro} label="Ciro (30g)" value={`€${stats.revenueLast30.toFixed(0)}`}
              sub="Tüm tenantlar" color="text-emerald-500" bg="bg-emerald-500/10"
            />
            <StatTile
              icon={Phone} label="AI Aramalar" value={stats.callsTotal}
              sub="Tüm tenantlar" color="text-purple-500" bg="bg-purple-500/10"
            />
          </div>
        )}

        {/* HIZLI ERİŞİM */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Yönetim Modülleri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tiles.map(({ to, icon: Icon, title, desc, iconColor, bgColor }) => (
              <Link key={to} to={to}>
                <Card className="p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full group">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl ${bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold">{title}</h3>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* SON EKLENEN TENANTLAR */}
        {stats?.recentTenants?.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Son Eklenen Restoranlar
            </h2>
            <Card className="divide-y">
              {stats.recentTenants.map((t) => (
                <Link
                  key={t.id}
                  to={`/super-admin/tenants/${t.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate text-sm">{t.company_name}</span>
                      <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{t.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.plan}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{t.owner_email}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{moment(t.created_date).fromNow()}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function StatTile({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <Card className="p-3">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-xl font-black mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}