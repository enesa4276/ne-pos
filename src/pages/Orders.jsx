import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, UtensilsCrossed } from 'lucide-react';
import moment from 'moment';

const statusLabels = {
  open: { label: 'Açık', variant: 'default' },
  paid: { label: 'Ödendi', variant: 'secondary' },
  cancelled: { label: 'İptal', variant: 'destructive' },
};

export default function Orders() {
  const [filter, setFilter] = useState('open');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

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
                  <div className="flex items-center gap-2">
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

                <div className="flex justify-end pt-2 border-t border-border">
                  <span className="font-bold text-primary text-lg">₺{order.total?.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}