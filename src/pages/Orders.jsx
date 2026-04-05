import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useLang } from '@/lib/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, UtensilsCrossed, CreditCard, Printer, Globe } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import PaymentDialog from '@/components/pos/PaymentDialog';
import { CustomerReceipt } from '@/components/pos/ReceiptPrint';
import WixOrderCard from '@/components/orders/WixOrderCard';

const STATUS_VARIANTS = {
  open: 'default',
  paid: 'secondary',
  cancelled: 'destructive',
};

const SECRET_DELETE_CODE = 'STET';
const SECRET_CLICK_COUNT = 5;

export default function Orders() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { t } = useLang();
  const [filter, setFilter] = useState('open');
  const [payingOrder, setPayingOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
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

  const hasWixIntegration = !!(user?.wix_site_id);

  // --- Notification sound via Web Audio API ---
  const playNotificationSound = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playBeep(880, ctx.currentTime, 0.15);
    playBeep(1100, ctx.currentTime + 0.18, 0.15);
    playBeep(1320, ctx.currentTime + 0.36, 0.2);
  };

  const notificationIntervalRef = useRef(null);
  const pendingWixCount = hasWixIntegration
    ? orders.filter(o => o.order_source === 'wix' && o.status === 'pending').length
    : 0;

  useEffect(() => {
    if (pendingWixCount > 0) {
      if (!notificationIntervalRef.current) {
        playNotificationSound();
        notificationIntervalRef.current = setInterval(() => {
          playNotificationSound();
        }, 15000);
      }
    } else {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    }
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    };
  }, [pendingWixCount]);

  // Split: Wix orders vs POS orders
  const wixOrders = hasWixIntegration ? orders.filter(o => o.order_source === 'wix') : [];
  const posOrders = orders.filter(o => o.order_source !== 'wix');

  const filteredPosOrders = filter === 'all'
    ? posOrders
    : posOrders.filter(o => o.status === filter);

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

  const handleWixStatusChange = async (orderId, newStatus) => {
    // Find the order to get wix_order_id
    const order = orders.find(o => o.id === orderId);
    
    // Update locally first
    await updateOrder.mutateAsync({ id: orderId, data: { status: newStatus } });
    toast.success(t('statusUpdated'));

    // Push status update to Wix (fire and forget — don't block UI)
    if (order?.wix_order_id) {
      fetch('/functions/wix-update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          newStatus,
          wixOrderId: order.wix_order_id,
          userEmail: user?.email,
        }),
      }).then(res => res.json()).then(data => {
        if (!data.success && !data.skipped) {
          console.warn('Wix status sync failed:', data);
        }
      }).catch(err => console.warn('Wix sync error:', err));
    }
  };

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

  // Active wix orders (not fulfilled/cancelled)
  const activeWixOrders = wixOrders.filter(o => !['fulfilled', 'cancelled'].includes(o.status));
  const doneWixOrders = wixOrders.filter(o => ['fulfilled', 'cancelled'].includes(o.status));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Split screen layout */}
      <div className="flex flex-1 overflow-hidden divide-x divide-border">

        {/* LEFT: Online / Wix Orders — only if wix is configured */}
        {hasWixIntegration && (
          <div className="flex flex-col w-1/2 min-w-0 overflow-hidden">
            <div className="p-3 border-b border-border bg-blue-50/50 dark:bg-blue-950/20 shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <h2 className="font-bold text-sm">{t('onlineOrders')}</h2>
                {activeWixOrders.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                    {activeWixOrders.length}
                  </span>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {activeWixOrders.length === 0 && doneWixOrders.length === 0 && (
                  <p className="text-center text-muted-foreground py-12 text-sm">
                    {t('noOnlineOrders')}
                  </p>
                )}
                {activeWixOrders.map(order => (
                  <WixOrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleWixStatusChange}
                    loading={updateOrder.isPending}
                  />
                ))}
                {doneWixOrders.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium pt-2">{t('onlineOrdersDone')}</p>
                    {doneWixOrders.slice(0, 20).map(order => (
                      <WixOrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleWixStatusChange}
                        loading={updateOrder.isPending}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* RIGHT: POS Orders — full width if no wix */}
        <div className={`flex flex-col min-w-0 overflow-hidden ${hasWixIntegration ? 'w-1/2' : 'w-full'}`}>
          <div className="p-3 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm">{t('ordersTitle')}</h2>
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="open" className="text-xs px-3">{t('open')}</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs px-3">{t('paid')}</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs px-3">{t('cancelled')}</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-3">{t('all')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {filteredPosOrders.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">{t('noOrders')}</p>
              )}
              {filteredPosOrders.map((order) => {
                const stVariant = STATUS_VARIANTS[order.status] || 'default';
                const stLabel = t(order.status) || order.status;
                return (
                  <div key={order.id} className="bg-card rounded-2xl border border-border p-3 space-y-2">
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
                        {moment(order.created_date).format('DD.MM HH:mm')}
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
                      <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs px-2" onClick={() => handlePrint(order)}>
                          <Printer className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">{t('printReceipt')}</span>
                        </Button>
                        {order.status === 'open' && (
                          <Button size="sm" className="gap-1 rounded-xl text-xs px-2" onClick={() => setPayingOrder(order)}>
                            <CreditCard className="h-3.5 w-3.5" />
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
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={!!payingOrder}
        onClose={() => setPayingOrder(null)}
        total={payingOrder?.total || 0}
        onComplete={handlePaymentComplete}
      />

      {/* Print Template */}
      {printOrder && <CustomerReceipt order={printOrder} total={printOrder.total} t={t} companyInfo={user} />}

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