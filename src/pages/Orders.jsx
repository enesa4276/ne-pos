import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, UtensilsCrossed, CreditCard } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import PaymentDialog from '@/components/pos/PaymentDialog';

const statusLabels = {
  open: { label: 'Açık', variant: 'default' },
  paid: { label: 'Ödendi', variant: 'secondary' },
  cancelled: { label: 'İptal', variant: 'destructive' },
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('open');
  const [payingOrder, setPayingOrder] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const updateTable = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantTable.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  });

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const handlePaymentComplete = async (method) => {
    if (!payingOrder) return;
    await updateOrder.mutateAsync({
      id: payingOrder.id,
      data: { status: 'paid', payment_method: method },
    });
    if (payingOrder.table_id) {
      await updateTable.mutateAsync({ id: payingOrder.table_id, data: { status: 'empty' } });
    }
    toast.success('Ödeme alındı!');
    setPayingOrder(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-card/50">
        <h2 className="font-bold text-lg mb-3">Siparişler</h2>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="open">Açık</TabsTrigger>
            <TabsTrigger value="paid">Ödendi</TabsTrigger>
            <TabsTrigger value="cancelled">İptal</TabsTrigger>
            <TabsTrigger value="all">Tümü</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 max-w-4xl mx-auto">
          {filteredOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Sipariş bulunamadı</p>
          )}
          {filteredOrders.map((order) => {
            const st = statusLabels[order.status] || statusLabels.open;
            return (
              <div
                key={order.id}
                className="bg-card rounded-2xl border border-border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {order.order_type === 'takeaway' ? (
                      <Package className="h-4 w-4 text-accent" />
                    ) : (
                      <UtensilsCrossed className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-bold text-sm">
                      {order.order_type === 'takeaway' ? 'Paket' : order.table_name || 'Masa'}
                    </span>
                    <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                    {order.payment_method && (
                      <Badge variant="outline" className="text-xs">
                        {order.payment_method === 'cash' ? 'Nakit' : 'Kart'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {moment(order.created_date).format('DD.MM.YYYY HH:mm')}
                  </span>
                </div>

                <div className="space-y-1">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.product_name}
                        {item.extras?.length > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({item.extras.map(e => e.name).join(', ')})
                          </span>
                        )}
                      </span>
                      <span className="font-medium">₺{item.subtotal?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-bold text-primary text-lg">₺{order.total?.toFixed(2)}</span>
                  {order.status === 'open' && (
                    <Button
                      className="gap-2 rounded-xl"
                      onClick={() => setPayingOrder(order)}
                    >
                      <CreditCard className="h-4 w-4" />
                      Ödeme Al
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <PaymentDialog
        open={!!payingOrder}
        onClose={() => setPayingOrder(null)}
        total={payingOrder?.total || 0}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
}