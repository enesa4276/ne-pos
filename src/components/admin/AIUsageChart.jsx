import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

// Son 30 günün AI kullanımı: günlük & aylık toplam token + istek sayısı.
// Bütçe yönetimini kolaylaştırmak için providers prop'u ile sağlayıcı bazlı kırılım gösterir.
export default function AIUsageChart({ providers = [] }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.entities.AIUsageEntry.list('-created_date', 1000);
        if (!cancel) setEntries(list || []);
      } catch (_) {
        if (!cancel) setEntries([]);
      }
      if (!cancel) setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  // Son 30 günü doldur (eksik günler 0 olsun)
  const dailyData = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, label: key.slice(5), tokens: 0, requests: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.day, i]));
    for (const e of entries) {
      const k = e.day_key || (e.created_date || '').slice(0, 10);
      if (idx[k] !== undefined) {
        days[idx[k]].tokens += Number(e.total_tokens || 0);
        days[idx[k]].requests += Number(e.request_count || 1);
      }
    }
    return days;
  }, [entries]);

  // Aylık toplam (son 6 ay)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, label: key, tokens: 0, requests: 0 });
    }
    const idx = Object.fromEntries(months.map((m, i) => [m.month, i]));
    for (const e of entries) {
      const k = (e.day_key || (e.created_date || '').slice(0, 10)).slice(0, 7);
      if (idx[k] !== undefined) {
        months[idx[k]].tokens += Number(e.total_tokens || 0);
        months[idx[k]].requests += Number(e.request_count || 1);
      }
    }
    return months;
  }, [entries]);

  // Sağlayıcı bazlı bu ayki toplam
  const providerBreakdown = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const map = new Map();
    for (const e of entries) {
      const k = (e.day_key || (e.created_date || '').slice(0, 10)).slice(0, 7);
      if (k !== thisMonth) continue;
      const key = `${e.ai_provider} · ${e.model_name}`;
      const cur = map.get(key) || { name: key, tokens: 0, requests: 0 };
      cur.tokens += Number(e.total_tokens || 0);
      cur.requests += Number(e.request_count || 1);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.tokens - a.tokens);
  }, [entries]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const todayTotals = dailyData.find((d) => d.day === todayKey) || { tokens: 0, requests: 0 };
  const monthTotal = monthlyData.find((m) => m.month === monthKey) || { tokens: 0, requests: 0 };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
        <p className="font-semibold mb-1 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> AI Kullanım Paneli</p>
        <p>Tüm AI çağrıları (test dahil) burada izlenir. Bütçe limitlerini sağlayıcı kartından ayarlayın.</p>
      </Card>

      {/* Özet rozetleri */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Bugün</div>
          <div className="text-lg font-bold">{todayTotals.tokens.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">token</span></div>
          <div className="text-[11px] text-muted-foreground">{todayTotals.requests} istek</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Bu ay</div>
          <div className="text-lg font-bold">{monthTotal.tokens.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">token</span></div>
          <div className="text-[11px] text-muted-foreground">{monthTotal.requests} istek</div>
        </Card>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="daily">Günlük (30g)</TabsTrigger>
          <TabsTrigger value="monthly">Aylık (6a)</TabsTrigger>
          <TabsTrigger value="provider">Sağlayıcı</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-2">
          <Card className="p-3">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tokens" fill="hsl(var(--primary))" name="Token" />
                  <Bar dataKey="requests" fill="hsl(var(--accent))" name="İstek" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-2">
          <Card className="p-3">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tokens" fill="hsl(var(--primary))" name="Token" />
                  <Bar dataKey="requests" fill="hsl(var(--accent))" name="İstek" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="provider" className="mt-2">
          <Card className="p-3 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Bu ay sağlayıcı bazlı</div>
            {providerBreakdown.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Henüz veri yok</div>
            ) : (
              providerBreakdown.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                  <span className="font-mono truncate">{row.name}</span>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">{row.tokens.toLocaleString()} tok</Badge>
                    <Badge variant="outline" className="text-[10px]">{row.requests} istek</Badge>
                  </div>
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}