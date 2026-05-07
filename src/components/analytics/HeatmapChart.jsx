import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import moment from 'moment';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 - 22:00

export default function HeatmapChart({ orders }) {
  // Build matrix [day][hour] = count
  const matrix = DAYS.map(() => HOURS.map(() => 0));
  orders.forEach((o) => {
    const d = moment(o.created_date);
    const day = (d.day() + 6) % 7; // make Monday = 0
    const hour = d.hour();
    const hIdx = HOURS.indexOf(hour);
    if (hIdx >= 0) matrix[day][hIdx]++;
  });
  const max = Math.max(1, ...matrix.flat());

  const intensity = (v) => {
    if (v === 0) return 'bg-secondary/40';
    const ratio = v / max;
    if (ratio < 0.2) return 'bg-primary/20';
    if (ratio < 0.4) return 'bg-primary/35';
    if (ratio < 0.6) return 'bg-primary/55';
    if (ratio < 0.8) return 'bg-primary/75';
    return 'bg-primary';
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">🔥 Yoğun Saat Isı Haritası</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `40px repeat(${HOURS.length}, 1fr)` }}>
            <div></div>
            {HOURS.map((h) => (
              <div key={h} className="text-[10px] text-center text-muted-foreground font-mono">{h}</div>
            ))}
            {DAYS.map((day, di) => (
              <React.Fragment key={day}>
                <div className="text-xs text-muted-foreground font-bold flex items-center">{day}</div>
                {HOURS.map((_, hi) => (
                  <div
                    key={hi}
                    className={`aspect-square rounded ${intensity(matrix[di][hi])} flex items-center justify-center text-[9px] font-bold text-foreground/70`}
                    title={`${day} ${HOURS[hi]}:00 — ${matrix[di][hi]} sipariş`}
                  >
                    {matrix[di][hi] > 0 ? matrix[di][hi] : ''}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Renk koyulaştıkça sipariş yoğunluğu artar.</p>
      </CardContent>
    </Card>
  );
}