import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, ShoppingBag, UtensilsCrossed, Package, Star, Loader2 } from 'lucide-react';
import moment from 'moment';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444', '#14b8a6', '#f43f5e'];

export default function Analytics() {
  const [period, setPeriod] = useState('today');
  const { data: user } = useCurrentUser();

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['orders-analytics', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user?.email }, '-created_date', 1000),
    enabled: !!user?.email,
  });

  // Filter by period and only paid orders
  const paidOrders = allOrders.filter(o => {
    if (o.status !== 'paid') return false;
    const d = moment(o.created_date);
    if (period === 'today') return d.isSame(moment(), 'day');
    if (period === 'week') return d.isAfter(moment().subtract(7, 'days'));
    if (period === 'month') return d.isAfter(moment().subtract(30, 'days'));
    return true; // all
  });

  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = paidOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const dineInCount = paidOrders.filter(o => o.order_type === 'dine_in').length;
  const takeawayCount = paidOrders.filter(o => o.order_type === 'takeaway').length;

  // Product sales ranking
  const productSales = {};
  paidOrders.forEach(order => {
    order.items?.forEach(item => {
      if (!productSales[item.product_name]) productSales[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      productSales[item.product_name].qty += item.quantity;
      productSales[item.product_name].revenue += item.subtotal;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Daily revenue chart (last 7 or 30 days)
  const days = period === 'month' ? 30 : period === 'week' ? 7 : 7;
  const dailyData = Array.from({ length: days }, (_, i) => {
    const day = moment().subtract(days - 1 - i, 'days');
    const dayOrders = paidOrders.filter(o => moment(o.created_date).isSame(day, 'day'));
    return {
      label: day.format('DD/MM'),
      gelir: parseFloat(dayOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)),
      siparis: dayOrders.length,
    };
  });

  // Order type pie
  const typePie = [
    { name: 'Masada', value: dineInCount },
    { name: 'Paket', value: takeawayCount },
  ].filter(x => x.value > 0);

  // Payment method split
  const cashCount = paidOrders.filter(o => o.payment_method === 'cash').length;
  const cardCount = paidOrders.filter(o => o.payment_method === 'card').length;
  const paymentPie = [
    { name: 'Nakit', value: cashCount },
    { name: 'Kart', value: cardCount },
  ].filter(x => x.value > 0);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analiz</h1>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="today">Bugün</TabsTrigger>
              <TabsTrigger value="week">7 Gün</TabsTrigger>
              <TabsTrigger value="month">30 Gün</TabsTrigger>
              <TabsTrigger value="all">Tümü</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Gelir</p>
                  <p className="text-xl font-bold text-primary">€{totalRevenue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sipariş Sayısı</p>
                  <p className="text-xl font-bold">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Masada</p>
                  <p className="text-xl font-bold">{dineInCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paket</p>
                  <p className="text-xl font-bold">{takeawayCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Revenue Chart */}
        {period !== 'today' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Günlük Gelir (€)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `€${v}`} />
                  <Bar dataKey="gelir" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Sipariş Tipi</CardTitle></CardHeader>
            <CardContent>
              {typePie.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                      {typePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8 text-sm">Veri yok</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Ödeme Yöntemi</CardTitle></CardHeader>
            <CardContent>
              {paymentPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                      {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i + 2 % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8 text-sm">Veri yok</p>}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              En Çok Satan Ürünler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Veri yok</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">{p.qty} adet · €{p.revenue.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg order */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ortalama Sipariş Tutarı</span>
            <span className="text-2xl font-bold text-primary">€{avgOrder.toFixed(2)}</span>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}