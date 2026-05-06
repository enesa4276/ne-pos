import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { FeatureGate } from '@/components/FeatureGate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Clock, DollarSign, Loader2 } from 'lucide-react';

export default function AIPhoneDashboard() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-12">
        <FeatureGate feature="ai_phone">
          <DashboardContent />
        </FeatureGate>
      </div>
    </ScrollArea>
  );
}

function DashboardContent() {
  const { tenant } = useTenant();
  const [activeCalls, setActiveCalls] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [stats, setStats] = useState({ today: 0, total_cost: 0, avg_duration: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    loadCalls();
    const interval = setInterval(loadCalls, 5000);
    return () => clearInterval(interval);
  }, [tenant]);

  async function loadCalls() {
    if (!tenant) return;
    try {
      const calls = await base44.entities.PhoneCall.filter(
        { tenant_id: tenant.tenant_id },
        '-created_date',
        100
      );
      const active = calls.filter((c) => c.status === 'in_progress' || c.status === 'ringing');
      const recent = calls.filter((c) => c.status !== 'in_progress' && c.status !== 'ringing').slice(0, 30);

      setActiveCalls(active);
      setRecentCalls(recent);

      const today = new Date();
      const todayCalls = calls.filter((c) => new Date(c.created_date).toDateString() === today.toDateString());
      const totalCost = calls.reduce((s, c) => s + (c.cost_total || 0), 0);
      const durations = calls.map((c) => c.duration_seconds || 0).filter(Boolean);
      const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      setStats({ today: todayCalls.length, total_cost: totalCost, avg_duration: avgDuration });
    } catch (e) {
      console.error('PhoneCall yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 AI Telefon Asistanı</h1>
        <p className="text-muted-foreground">Canlı aramalar ve geçmiş</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Phone} label="Bugün" value={stats.today} color="text-primary" />
        <StatCard icon={Clock} label="Ort. Süre" value={`${stats.avg_duration}s`} color="text-blue-500" />
        <StatCard icon={DollarSign} label="Toplam Maliyet" value={`€${stats.total_cost.toFixed(2)}`} color="text-green-500" />
      </div>

      {activeCalls.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            Canlı Aramalar ({activeCalls.length})
          </h2>
          <div className="space-y-3">
            {activeCalls.map((c) => <ActiveCallCard key={c.id} call={c} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-3">Son Aramalar</h2>
        {recentCalls.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Henüz arama yok.</Card>
        ) : (
          <div className="space-y-2">
            {recentCalls.map((c) => <RecentCallCard key={c.id} call={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function ActiveCallCard({ call }) {
  return (
    <Card className="p-4 border-red-500 border-2">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold">{call.from_number}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(call.created_date).toLocaleTimeString()}
          </div>
        </div>
        <Badge className="bg-red-500/20 text-red-600 border-red-500/40 border">CANLI</Badge>
      </div>
      <ScrollArea className="h-48 bg-secondary/20 rounded-lg p-3">
        {(call.transcript || []).map((msg, i) => (
          <div key={i} className="mb-2">
            <div className="text-xs font-medium">
              {msg.speaker === 'customer' ? '👤 Müşteri' : '🤖 AI'}:
            </div>
            <div className="text-sm">{msg.text}</div>
          </div>
        ))}
        {(call.transcript || []).length === 0 && (
          <div className="text-xs text-muted-foreground italic">Görüşme başlıyor...</div>
        )}
      </ScrollArea>
    </Card>
  );
}

function RecentCallCard({ call }) {
  const statusColors = {
    completed: 'bg-green-500',
    transferred_to_human: 'bg-yellow-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };
  return (
    <Card className="p-3 hover:bg-secondary/20 cursor-pointer">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusColors[call.status] || 'bg-gray-500'}`} />
          <div>
            <div className="font-medium">{call.from_number}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(call.created_date).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          {call.order_id && (
            <Badge variant="outline" className="text-xs">Sipariş #{String(call.order_id).slice(0, 8)}</Badge>
          )}
          {call.duration_seconds ? (
            <div className="text-xs text-muted-foreground mt-1">{call.duration_seconds}s</div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}