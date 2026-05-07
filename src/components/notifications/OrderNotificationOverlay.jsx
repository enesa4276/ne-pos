import React from 'react';
import { useLocation } from 'react-router-dom';
import { useOrderNotifications } from '@/lib/OrderNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, Phone, Globe, Bike, ShoppingBag, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_META = {
  pos_dine_in:  { icon: ShoppingBag, label: 'Masa', color: 'bg-blue-500' },
  pos_takeaway: { icon: ShoppingBag, label: 'Gel-Al', color: 'bg-orange-500' },
  ai_phone:     { icon: Phone,       label: 'AI Telefon', color: 'bg-purple-500' },
  wix:          { icon: Globe,       label: 'Wix', color: 'bg-emerald-500' },
  takeaway_com: { icon: Bike,        label: 'Takeaway.com', color: 'bg-yellow-500' },
  uber_eats:    { icon: Bike,        label: 'Uber Eats', color: 'bg-black' },
};

// Tüm sayfalarda görünen sabit bildirim overlay'i.
// QR menü ve tablet sayfalarında gizlenir.
export default function OrderNotificationOverlay() {
  const { pendingOrders, acceptOrder, rejectOrder } = useOrderNotifications();
  const location = useLocation();

  // QR menü, tablet, login: bildirim gösterme
  if (location.pathname.startsWith('/qr/') || location.pathname.startsWith('/tablet')) return null;
  if (!pendingOrders.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96">
      {pendingOrders.slice(0, 3).map((order) => (
        <NotificationCard
          key={order.id}
          order={order}
          onAccept={() => acceptOrder(order).then(() => toast.success('Sipariş kabul edildi')).catch((e) => toast.error(e.message))}
          onReject={() => {
            if (!confirm('Siparişi iptal etmek istediğinize emin misiniz?')) return;
            rejectOrder(order).then(() => toast.success('Sipariş iptal edildi')).catch((e) => toast.error(e.message));
          }}
        />
      ))}
      {pendingOrders.length > 3 && (
        <div className="bg-card border border-border rounded-xl p-2 text-center text-xs text-muted-foreground">
          + {pendingOrders.length - 3} bekleyen sipariş daha
        </div>
      )}
    </div>
  );
}

function NotificationCard({ order, onAccept, onReject }) {
  const meta = SOURCE_META[order.order_source] || SOURCE_META.pos_dine_in;
  const Icon = meta.icon;
  const itemsCount = (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div className="bg-card border-2 border-primary rounded-2xl shadow-2xl overflow-hidden animate-pulse-slow">
      <div className={`${meta.color} text-white px-3 py-1.5 flex items-center gap-2`}>
        <Bell className="h-3.5 w-3.5 animate-bounce" />
        <span className="text-xs font-bold uppercase tracking-wider flex-1">Yeni Sipariş</span>
        <Badge variant="secondary" className="text-[10px] gap-1 bg-white/20 border-0 text-white">
          <Icon className="h-3 w-3" /> {meta.label}
        </Badge>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">
              {order.customer_name || order.table_name || `#${String(order.id).slice(-4)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {itemsCount} ürün · €{(order.total || 0).toFixed(2)}
            </p>
            {order.customer_phone && (
              <p className="text-[11px] text-muted-foreground">📞 {order.customer_phone}</p>
            )}
          </div>
        </div>

        {/* Items özeti */}
        <div className="text-[11px] text-muted-foreground bg-secondary/40 rounded-lg p-2 max-h-20 overflow-y-auto">
          {(order.items || []).slice(0, 4).map((it, i) => (
            <div key={i} className="flex justify-between">
              <span className="truncate pr-2">{it.quantity}x {it.product_name}</span>
              <span>€{(it.subtotal || 0).toFixed(2)}</span>
            </div>
          ))}
          {(order.items || []).length > 4 && (
            <div className="text-center mt-0.5">+ {(order.items || []).length - 4} daha</div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={onReject}
            className="rounded-xl flex-1 gap-1"
          >
            <X className="h-3.5 w-3.5" /> İptal
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="rounded-xl flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="h-3.5 w-3.5" /> Kabul
          </Button>
        </div>
      </div>
    </div>
  );
}