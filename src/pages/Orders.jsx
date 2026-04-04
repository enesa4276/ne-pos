import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useLang } from '@/lib/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, UtensilsCrossed, CreditCard, Printer } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import PaymentDialog from '@/components/pos/PaymentDialog';
import { CustomerReceipt } from '@/components/pos/ReceiptPrint';

const STATUS_VARIANTS = {
  open: 'default',
  paid: 'secondary',
  cancelled: 'destructive',
};

// 🔒 GİZLİ SİLME: Bir siparişi silmek için sipariş kartına 5 kez hızlıca tıkla.
// Sonra çıkan gizli onay kutusunda "STET" kodunu gir ve onayla.
// Bu işlem siparişi tamamen siler, analizde de gözükmez.
const SECRET_DELETE_CODE = 'STET';
const SECRET_CLICK_COUNT = 5;

export default function Orders() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { t } = useLang();
  const [filter, setFilter] = useState('open');
  const [payingOrder, setPayingOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  // Secret delete state
  const clickCountRef = useRef({});
  const clickTimerRef = useRef({});
  const [secretDeleteOrder, setSecretDeleteOrder] = useState(null);
  const [secretCode, setSecretCode] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user?.email }, '-created_date', 500),
    enabled: !!user?.email,
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const deleteOrder = useMutation({
    mutationFn: (id) => base44.entities.Order.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-analytics'] });
    },
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
    await updateOrder.mutateAsync({ id: payingOrder.id, data: { status: 'paid', payment_method: method } });
    if (payingOrder.table_id) {
      await updateTable.mutateAsync({ id: payingOrder.table_id, data: { status: 'empty' } });
    }
    toast.success(t('paymentReceived'));
    setPayingOrder(null);
  };

  const handlePrint = (order) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      setPrintOrder(null);
    }, 200);
  };

  // Secret delete: 5 rapid clicks on order header
  const handleSecretClick = (order) => {
    const id = order.id;
    if (!clickCountRef.current[id]) clickCountRef.current[id] = 0;
    clickCountRef.current[id]++;
    clearTimeout(clickTimerRef.current[id]);
    if (clickCountRef.current[id] >= SECRET_CLICK_COUNT) {
      clickCountRef.current[id] = 0;
      setSecretDeleteOrder(order);
      setSecretCode('');
    } else {
      clickTimerRef.current[id] = setTimeout(() => {
        clickCountRef.current[id] = 0;
      }, 1500);
    }
  };

  const handleSecretDelete = async () => {
    if (secretCode !== SECRET_DELETE_CODE) {
      toast.error(t('wrongCode'));
      return;
    }
    await deleteOrder.mutateAsync(secretDeleteOrder.id);
    setSecretDeleteOrder(null);
    setSecretCode('');
    toast.success(t('deleted'));
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-card/50">
        <h2 className="font-bold text-lg mb-3">{t('ordersTitle')}</h2>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="open">{t('open')}</TabsTrigger>
            <TabsTrigger value="paid">{t('paid')}</TabsTrigger>
            <TabsTrigger value="cancelled">{t('cancelled')}</TabsTrigger>
            <TabsTrigger value="all">{t('all')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 max-w-4xl mx-auto">
          {filteredOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-12">{t('noOrders')}</p>
          )}
          {filteredOrders.map((order) => {
            const stVariant = STATUS_VARIANTS[order.status] || 'default';
            const stLabel = t(order.status) || order.status;
            return (
              <div key={order.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div
                  className="flex items-center justify-between cursor-default select-none"
                  onClick={() => handleSecretClick(order)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {order.order_type === 'takeaway'
                      ? <Package className="h-4 w-4 text-accent" />
                      : <UtensilsCrossed className="h-4 w-4 text-primary" />}
                    <span className="font-bold text-sm">
                      {order.order_type === 'takeaway' ? t('takeaway') : order.table_name || t('tables')}
                    </span>
                    <Badge variant={stVariant} className="text-xs">{stLabel}</Badge>
                    {order.payment_method && (
                      <Badge variant="outline" className="text-xs">
                        {order.payment_method === 'cash' ? t('cash') : t('creditCard')}
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
                      <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
                  <span className="font-bold text-primary text-lg">{formatCurrency(order.total)}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl" onClick={() => handlePrint(order)}>
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('printReceipt')}</span>
                    </Button>
                    {order.status === 'open' && (
                      <Button size="sm" className="gap-1 rounded-xl" onClick={() => setPayingOrder(order)}>
                        <CreditCard className="h-4 w-4" />
                        {t('takePayment')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Payment Dialog */}
      <PaymentDialog
        open={!!payingOrder}
        onClose={() => setPayingOrder(null)}
        total={payingOrder?.total || 0}
        onComplete={handlePaymentComplete}
      />

      {/* Print Template */}
      {printOrder && <CustomerReceipt order={printOrder} total={printOrder.total} />}

      {/* 🔒 Secret Delete Modal */}
      {secretDeleteOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSecretDeleteOrder(null)}>
          <div className="bg-card rounded-2xl p-6 w-80 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-center">{t('verificationCode')}</p>
            <input
              autoFocus
              type="password"
              value={secretCode}
              onChange={e => setSecretCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSecretDelete()}
              placeholder={t('enterCode')}
              className="w-full border border-border rounded-xl px-4 py-3 text-center text-lg font-mono bg-background outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSecretDeleteOrder(null)}>{t('cancel')}</Button>
              <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleSecretDelete}>{t('confirm')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}