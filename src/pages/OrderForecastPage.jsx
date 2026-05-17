import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, Clock, Printer, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function OrderForecastPage() {
  const { tenant } = useTenant();

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['order-forecasts', tenant?.tenant_id],
    queryFn: () => base44.entities.OrderForecast.filter({ tenant_id: tenant.tenant_id }, 'forecast_date', 14),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const todayForecast = forecasts.find(f => f.forecast_date === today);
  const tomorrowForecast = forecasts.find(f => f.forecast_date === tomorrow);
  const mainForecast = tomorrowForecast || todayForecast;

  const chartData = mainForecast?.predicted_busiest_hours?.map(h => ({
    hour: `${h.hour}:00`,
    siparis: h.expected_orders,
  })) || [];

  const weekForecasts = forecasts.slice(0, 7);

  function printPrepList() {
    if (!mainForecast?.ingredient_prep_list?.length) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Hazırlık Listesi</title><style>body{font-family:monospace;padding:20px}h2{margin-bottom:12px}table{width:100%}td,th{padding:4px 8px;border-bottom:1px solid #eee;text-align:left}</style></head><body>`);
    w.document.write(`<h2>Hazırlık Listesi — ${mainForecast.forecast_date}</h2><p>Tahmini ${mainForecast.predicted_orders} sipariş</p><table><tr><th>Malzeme</th><th>Miktar</th><th>Birim</th></tr>`);
    mainForecast.ingredient_prep_list.forEach(item => { w.document.write(`<tr><td>${item.ingredient_name}</td><td>${item.quantity}</td><td>${item.unit}</td></tr>`); });
    w.document.write(`</table></body></html>`);
    w.document.close();
    w.print();
  }

  if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="text-primary" /> Sipariş Tahmini</h1>

        {mainForecast ? (
          <>
            {/* Ana kart */}
            <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {mainForecast.forecast_date === tomorrow ? 'Yarın' : 'Bugün'} — {format(new Date(mainForecast.forecast_date), 'dd MMMM yyyy', { locale: tr })}
                  </p>
                  <h2 className="text-3xl font-black mt-1">{mainForecast.predicted_orders} sipariş</h2>
                  <p className="text-sm text-muted-foreground">Tahmini ciro: €{mainForecast.predicted_revenue?.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${mainForecast.confidence_score || 0}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">%{mainForecast.confidence_score} güven</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{mainForecast.recommended_staff_count} personel önerilir</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{mainForecast.based_on_days} günlük veriye dayalı</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Saatlik dağılım */}
            {chartData.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Saatlik Dağılım Tahmini</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="siparis" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Hazırlık listesi */}
            {mainForecast.ingredient_prep_list?.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Malzeme Hazırlık Listesi</h3>
                  <Button size="sm" variant="outline" className="gap-1 rounded-xl h-8 text-xs" onClick={printPrepList}>
                    <Printer className="w-3.5 h-3.5" /> Yazdır
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="pb-2">Malzeme</th><th className="pb-2 text-right">Miktar</th><th className="pb-2 text-right">Birim</th></tr></thead>
                    <tbody className="divide-y divide-border/50">
                      {mainForecast.ingredient_prep_list.map((item, i) => (
                        <tr key={i}><td className="py-2">{item.ingredient_name}</td><td className="py-2 text-right font-mono">{item.quantity}</td><td className="py-2 text-right text-muted-foreground">{item.unit}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-12 text-center text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Henüz tahmin verisi yok</p>
            <p className="text-xs mt-1">Tahminler yeterli sipariş geçmişi biriktikçe otomatik oluşturulur</p>
          </Card>
        )}

        {/* Haftalık özet */}
        {weekForecasts.length > 1 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Haftanın Tahmini</h3>
            <div className="space-y-2">
              {weekForecasts.map(f => (
                <div key={f.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span>{format(new Date(f.forecast_date), 'EEEE dd.MM', { locale: tr })}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{f.predicted_orders} sipariş</span>
                    <span>€{f.predicted_revenue?.toFixed(0)}</span>
                    <span className="text-xs">{f.recommended_staff_count} personel</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}