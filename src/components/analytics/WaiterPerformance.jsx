import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserCheck } from 'lucide-react';

export default function WaiterPerformance({ orders }) {
  // Group by created_by (waiter email)
  const map = {};
  orders.forEach((o) => {
    if (o.status !== 'paid' && o.status !== 'fulfilled') return;
    const key = o.created_by || 'Bilinmeyen';
    if (!map[key]) map[key] = { name: key, count: 0, revenue: 0 };
    map[key].count++;
    map[key].revenue += o.total || 0;
  });
  const list = Object.values(map).sort((a, b) => b.revenue - a.revenue);
  const maxRev = Math.max(1, ...list.map((x) => x.revenue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-accent" /> Personel Performansı
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Veri yok</p>
        ) : (
          <div className="space-y-3">
            {list.map((w, i) => (
              <div key={w.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    {w.name.split('@')[0]}
                  </span>
                  <span className="text-muted-foreground">{w.count} sipariş · €{w.revenue.toFixed(0)}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent to-primary rounded-full" style={{ width: `${(w.revenue / maxRev) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}