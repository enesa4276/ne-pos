import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import OrderKanban from '@/components/orders/OrderKanban';
import WixOrderCard from '@/components/orders/WixOrderCard';
import { exportOrdersToCSV, exportOrdersToPDF } from '@/lib/exportOrders';

export default function Orders() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [view, setView] = useState('kanban');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user?.email }, '-created_date', 200),
    enabled: !!user?.email,
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Durum güncellendi');
    },
    onError: (e) => toast.error('Güncellenemedi: ' + e.message),
  });

  const filtered = useMemo(() => {
    let list = orders;
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
  }, [orders, source, search]);

  const externalOrders = filtered.filter((o) => ['wix', 'takeaway_com', 'uber_eats'].includes(o.order_source));

  return (
    <div className="flex flex-col h-screen pb-16 md:pb-0">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold">Siparişler</h1>
          <span className="text-xs text-muted-foreground">{filtered.length} sipariş</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Yenile
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => exportOrdersToCSV(filtered)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => exportOrdersToPDF(filtered)}>
              <FileText className="h-3.5 w-3.5" /> PDF
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
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="rounded-xl">
              <TabsTrigger value="kanban" className="rounded-lg">Kanban</TabsTrigger>
              <TabsTrigger value="external" className="rounded-lg">Online ({externalOrders.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'kanban' ? (
          <OrderKanban
            orders={filtered}
            onStatusChange={(o, status) => updateStatus.mutate({ id: o.id, status })}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4 overflow-y-auto h-full">
            {externalOrders.map((order) => (
              <WixOrderCard
                key={order.id}
                order={order}
                loading={updateStatus.isPending}
                onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                onPrint={() => window.print()}
              />
            ))}
            {externalOrders.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-12 text-sm">
                Online sipariş yok.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}