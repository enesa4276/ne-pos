import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, Printer } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import OrderKanban, { NORMALIZE_STATUS } from '@/components/orders/OrderKanban';
import PrintTrigger from '@/components/orders/PrintTrigger';

export default function Orders() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [printJob, setPrintJob] = useState(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders-active', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user?.email }, '-created_date', 200),
    enabled: !!user?.email,
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, order }) => {
      await base44.entities.Order.update(id, { status });
      // Push-back: dış platformlara durum bildir (fetch tabanlı, Base44 kredisi tüketmez)
      if (order && ['wix', 'uber_eats', 'takeaway_com'].includes(order.order_source)) {
        try {
          await base44.functions.invoke('pushOrderStatusToPlatforms', { order_id: id, status });
        } catch (e) {
          console.warn('Push-back başarısız (yoksayıldı):', e?.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-active'] });
      toast.success('Durum güncellendi');
    },
    onError: (e) => toast.error('Güncellenemedi: ' + e.message),
  });

  // Aktif siparişler: sadece bugüne ait + tamamlanmamış
  const activeOrders = useMemo(() => {
    const todayStart = moment().startOf('day');
    return orders.filter((o) => {
      const norm = NORMALIZE_STATUS(o.status);
      const isToday = moment(o.created_date).isAfter(todayStart);
      // Tamamlandı statüsündekiler bugün ise gösterilir, dünkülerse gizlenir
      if (norm === 'completed' && !isToday) return false;
      return true;
    });
  }, [orders]);

  const filtered = useMemo(() => {
    let list = activeOrders;
    if (source !== 'all') list = list.filter((o) => (o.order_source || 'pos_dine_in') === source);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.table_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').includes(q)
      );
    }
    return list;
  }, [activeOrders, source, search]);

  return (
    <div className="flex flex-col h-screen pb-16 md:pb-0">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Anlık Siparişler</h1>
            <p className="text-[11px] text-muted-foreground">{filtered.length} aktif · Tamamlananlar gün sonunda otomatik gizlenir</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Yenile
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Müşteri / masa / telefon ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-9"
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-44 rounded-xl h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kaynaklar</SelectItem>
              <SelectItem value="pos_dine_in">POS — Masa</SelectItem>
              <SelectItem value="pos_takeaway">POS — Gel-Al</SelectItem>
              <SelectItem value="ai_phone">AI Telefon</SelectItem>
              <SelectItem value="wix">Wix</SelectItem>
              <SelectItem value="takeaway_com">Takeaway.com</SelectItem>
              <SelectItem value="uber_eats">Uber Eats</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <OrderKanban
            orders={filtered}
            onStatusChange={(o, status) => updateStatus.mutate({ id: o.id, status, order: o })}
            onPrint={(o) => setPrintJob(o)}
          />
        )}
      </div>

      {/* Programatik termal yazdırma */}
      {printJob && <PrintTrigger order={printJob} onDone={() => setPrintJob(null)} />}
    </div>
  );
}