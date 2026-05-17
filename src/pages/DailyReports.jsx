import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { BarChart3, TrendingUp, Users, ShoppingBag, Loader2, Brain } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

const COLORS = ['#f97316', '#10b981', '#6366f1', '#f59e0b', '#ef4444'];

export default function DailyReports() {
  const { tenant } = useTenant();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['daily-reports', tenant?.tenant_id],
    queryFn: () => base44.entities.DailyReport.filter({ tenant_id: tenant.tenant_id }, '-date', 30),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
  });

  const today = reports[0];
  const chartData = [...reports].reverse().map(r => ({
    date: format(new Date(r.date), 'dd.MM'),
    ciro: r.total_revenue,
    siparis: r.total_orders,
  }));

  const pieData = today ? [
    { name: 'Masa', value: today.dine_in_orders || 0 },
    { name: 'Gel-Al', value: today.takeaway_orders || 0 },
    { name: 'Delivery', value: today.delivery_orders || 0 },
    { name: 'Telefon', value: today.phone_orders || 0 },
  ].filter(d => d.value > 0) : [];

  const customerPie = today ? [
    { name: 'Yeni', value: today.new_customers || 0 },
    { name: 'Dönen', value: today.returning_customers || 0 },
  ] : [];

  if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="text-primary" /> Günlük Raporlar</h1>

        {/* Bugünün özeti */}
        {today ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Toplam Sipariş" value={today.total_orders} icon={ShoppingBag} />
              <StatCard label="Ciro" value={`€${today.total_revenue?.toFixed(2)}`} icon={TrendingUp} />
              <StatCard label="Ort. Sipariş" value={`€${today.average_order_value?.toFixed(2)}`} icon={BarChart3} />
              <StatCard label="Müşteri" value={(today.new_customers || 0) + (today.returning_customers || 0)} icon={Users} />
            </div>

            {/* AI İçgörüsü */}
            {today.ai_insights && (
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">AI İçgörüsü</h3>
                  <span className="text-[10px] text-muted-foreground">— {format(new Date(today.date), 'dd MMMM yyyy', { locale: tr })}</span>
                </div>
                <div className="prose prose-sm max-w-none text-sm text-foreground">
                  <ReactMarkdown>{today.ai_insights}</ReactMarkdown>
                </div>
              </Card>
            )}

            {/* Grafikler */}
            <div className="grid md:grid-cols-2 gap-4">
              {pieData.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Sipariş Türleri</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
              {customerPie.some(d => d.value > 0) && (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Yeni vs Dönen Müşteri</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={customerPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {customerPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>

            {/* Top ürünler */}
            {today.top_selling_items?.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">En Çok Satan Ürünler</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="pb-2">Ürün</th><th className="pb-2 text-right">Adet</th><th className="pb-2 text-right">Gelir</th></tr></thead>
                    <tbody className="divide-y divide-border/50">
                      {today.top_selling_items.map((item, i) => (
                        <tr key={i}><td className="py-2">{item.product_name}</td><td className="py-2 text-right">{item.count}</td><td className="py-2 text-right">€{item.revenue?.toFixed(2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-12 text-center text-muted-foreground">Henüz rapor verisi yok</Card>
        )}

        {/* 30 günlük ciro grafiği */}
        {chartData.length > 1 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Son {chartData.length} Günlük Ciro</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                <Tooltip formatter={(v) => `€${v}`} />
                <Bar dataKey="ciro" fill="#f97316" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

function StatCard({ label, value, icon: IconComp }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <IconComp className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
    </Card>
  );
}