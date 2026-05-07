import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { FeatureGate } from '@/components/FeatureGate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Clock, DollarSign, Loader2, ChevronRight, PhoneCall } from 'lucide-react';
import LiveCallChat from '@/components/aiphone/LiveCallChat';
import moment from 'moment';

export default function AIPhoneDashboard() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-6xl mx-auto pb-12">
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
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    if (!tenant) return;
    loadCalls();
    const interval = setInterval(loadCalls, 3000);
    return () => clearInterval(interval);
  }, [tenant]);

  // Aktif arama otomatik seçilsin
  useEffect(() => {
    if (activeCalls.length && !selectedCall) {
      setSelectedCall(activeCalls[0]);
    }
    // Seçili arama biterse seçimi temizle
    if (selectedCall && !activeCalls.find((c) => c.id === selectedCall.id)) {
      const stillExists = recentCalls.find((c) => c.id === selectedCall.id);
      if (stillExists) setSelectedCall(stillExists);
      else setSelectedCall(null);
    }
  }, [activeCalls, recentCalls, selectedCall]);

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">📞 AI Telefon Asistanı</h1>
        <p className="text-sm text-muted-foreground">Canlı aramalar gerçek zamanlı izlenir, istediğiniz an müdahale edebilirsiniz.</p>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard icon={Phone} label="Bugün" value={stats.today} color="text-primary" />
        <StatCard icon={Clock} label="Ort. Süre" value={`${stats.avg_duration}s`} color="text-blue-500" />
        <StatCard icon={DollarSign} label="Toplam Maliyet" value={`€${stats.total_cost.toFixed(2)}`} color="text-green-500" />
      </div>

      {/* CANLI ALAN: solda liste, sağda chat */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Sol: arama listesi */}
        <div className="space-y-3">
          {activeCalls.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Canlı ({activeCalls.length})
              </h2>
              <div className="space-y-1.5">
                {activeCalls.map((c) => (
                  <CallListItem
                    key={c.id} call={c}
                    selected={selectedCall?.id === c.id}
                    onClick={() => setSelectedCall(c)}
                    isLive
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Son Aramalar
            </h2>
            {recentCalls.length === 0 ? (
              <Card className="p-4 text-center text-xs text-muted-foreground">Henüz arama yok.</Card>
            ) : (
              <div className="space-y-1.5">
                {recentCalls.slice(0, 15).map((c) => (
                  <CallListItem
                    key={c.id} call={c}
                    selected={selectedCall?.id === c.id}
                    onClick={() => setSelectedCall(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ: chat */}
        <div className="min-h-[400px]">
          {selectedCall ? (
            <LiveCallChat
              key={selectedCall.id}
              call={selectedCall}
              tenant={tenant}
              onClose={() => setSelectedCall(null)}
            />
          ) : (
            <Card className="p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <PhoneCall className="w-12 h-12 mx-auto opacity-30 mb-3" />
              <p className="text-sm">Canlı aramalar burada görünür.</p>
              <p className="text-xs mt-1">Bir arama seçin veya yeni arama bekleyin.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className="min-w-0">
          <div className="text-base md:text-xl font-bold truncate">{value}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function CallListItem({ call, selected, onClick, isLive = false }) {
  const statusColors = {
    completed: 'bg-emerald-500',
    transferred_to_human: 'bg-amber-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-400',
    in_progress: 'bg-red-500',
    ringing: 'bg-red-500',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
        selected
          ? 'bg-primary/10 border-primary/40'
          : 'bg-card hover:bg-secondary/50 border-border'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusColors[call.status] || 'bg-gray-500'} ${isLive ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{call.from_number}</p>
          <p className="text-[10px] text-muted-foreground">
            {moment(call.created_date).format('HH:mm')} · {call.duration_seconds ? `${call.duration_seconds}s` : '—'}
          </p>
        </div>
        {call.order_id && <Badge variant="outline" className="text-[9px]">✓ Sipariş</Badge>}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
}