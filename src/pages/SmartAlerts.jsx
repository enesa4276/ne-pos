import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCheck, Wrench, Loader2, AlertTriangle, Info, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const SEVERITY_CONFIG = {
  info:     { color: 'bg-blue-500/10 border-blue-500/30 text-blue-700',     icon: Info,           badge: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  warning:  { color: 'bg-amber-500/10 border-amber-500/30 text-amber-700',  icon: AlertTriangle,  badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
  critical: { color: 'bg-red-500/10 border-red-500/30 text-red-700',        icon: Zap,            badge: 'bg-red-500/20 text-red-700 border-red-500/30' },
};

const TYPE_LABELS = {
  stock_low: 'Stok Azalıyor', stock_out: 'Stok Bitti',
  rush_hour_starting: 'Yoğun Saat', unusual_traffic: 'Anormal Trafik',
  wix_order_failed: 'Wix Hatası', ai_call_failed: 'AI Çağrı Hatası',
  negative_review: 'Olumsuz Yorum', operating_hours_anomaly: 'Saat Anomalisi',
  no_orders_today: 'Bugün Sipariş Yok', capacity_warning: 'Kapasite Uyarısı',
  customer_churn_risk: 'Müşteri Kaybı Riski',
};

export default function SmartAlerts() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['smart-alerts', tenant?.tenant_id],
    queryFn: () => base44.entities.SmartAlert.filter({ tenant_id: tenant.tenant_id }, '-created_date', 100),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SmartAlert.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart-alerts', tenant?.tenant_id] }),
  });

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'critical') return a.severity === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_read).length;

  async function markRead(alert) {
    await updateMutation.mutateAsync({ id: alert.id, data: { is_read: true } });
  }

  async function markActionTaken(alert) {
    await updateMutation.mutateAsync({ id: alert.id, data: { action_taken: true, is_read: true } });
    toast.success('İşlem yapıldı olarak işaretlendi');
  }

  async function markAllRead() {
    const unread = alerts.filter(a => !a.is_read);
    await Promise.all(unread.map(a => base44.entities.SmartAlert.update(a.id, { is_read: true })));
    qc.invalidateQueries({ queryKey: ['smart-alerts', tenant?.tenant_id] });
    toast.success(`${unread.length} uyarı okundu işaretlendi`);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="text-primary" />
              Akıllı Uyarılar
              {criticalCount > 0 && (
                <Badge className="bg-red-500 text-white rounded-full text-xs px-2">{criticalCount}</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} okunmamış · {alerts.length} toplam</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1 rounded-xl">
              <CheckCheck className="w-3.5 h-3.5" /> Tümünü Okundu İşaretle
            </Button>
          )}
        </div>

        {/* Filtre */}
        <div className="flex gap-2 flex-wrap">
          {[['all','Hepsi'], ['unread','Okunmamış'], ['critical','Kritik']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${filter === v ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        )}

        {!isLoading && filtered.length === 0 && (
          <Card className="p-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {filter === 'all' ? 'Henüz uyarı yok 🎉' : 'Bu filtrede uyarı yok'}
            </p>
          </Card>
        )}

        <div className="space-y-2">
          {filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <Card
                key={alert.id}
                className={`p-4 border-l-4 transition-opacity ${cfg.color} ${alert.is_read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        {TYPE_LABELS[alert.type] || alert.type}
                      </span>
                      {!alert.is_read && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Yeni</span>
                      )}
                      {alert.action_taken && (
                        <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">✓ İşlem yapıldı</span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.created_date), { addSuffix: true, locale: tr })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!alert.is_read && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markRead(alert)}>
                        <CheckCheck className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!alert.action_taken && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg" onClick={() => markActionTaken(alert)}>
                        <Wrench className="w-3.5 h-3.5 mr-1" /> Yapıldı
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}