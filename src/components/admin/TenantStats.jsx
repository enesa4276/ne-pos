import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Loader2, ShoppingBag, Euro, Users, Phone } from 'lucide-react';
import moment from 'moment';

// Tenant'a ait gerçek veriler — Order/User/PhoneCall entity'lerinden hesaplanır.
export default function TenantStats({ tenant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenant?.id]);

  async function load() {
    setLoading(true);
    try {
      const [orders, users, calls] = await Promise.all([
        base44.entities.Order.filter({ tenant_id: tenant.tenant_id }).catch(() => []),
        base44.entities.User.filter({ tenant_id: tenant.tenant_id }).catch(() => []),
        base44.entities.PhoneCall.filter({ tenant_id: tenant.tenant_id }).catch(() => []),
      ]);

      const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
      const last30 = orders.filter((o) => moment(o.created_date).isAfter(moment().subtract(30, 'days')));
      const last30Revenue = last30.reduce((s, o) => s + (o.total || 0), 0);

      setData({
        ordersTotal: orders.length,
        ordersLast30: last30.length,
        revenueTotal: totalRevenue,
        revenueLast30: last30Revenue,
        usersCount: users.length,
        callsTotal: calls.length,
        recentOrders: [...orders].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5),
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ShoppingBag} label="Toplam Sipariş" value={data.ordersTotal} sub={`Son 30 gün: ${data.ordersLast30}`} />
        <StatCard icon={Euro} label="Toplam Ciro" value={`€${data.revenueTotal.toFixed(0)}`} sub={`Son 30 gün: €${data.revenueLast30.toFixed(0)}`} color="text-emerald-500" />
        <StatCard icon={Users} label="Kullanıcı" value={data.usersCount} sub="Bu tenanta bağlı" />
        <StatCard icon={Phone} label="AI Aramaları" value={data.callsTotal} sub="Toplam" color="text-purple-500" />
      </div>

      {data.recentOrders.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Son Siparişler</p>
          <div className="divide-y">
            {data.recentOrders.map((o) => (
              <div key={o.id} className="py-2 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{o.table_name || o.customer_name || 'Sipariş'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {moment(o.created_date).format('DD.MM HH:mm')} · {o.order_source?.replace(/_/g, ' ') || 'pos'}
                  </p>
                </div>
                <span className="font-bold text-primary whitespace-nowrap">€{(o.total || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <Card className="p-3">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-black">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}