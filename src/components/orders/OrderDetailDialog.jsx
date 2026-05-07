import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Calendar, User, Phone, MapPin, FileText, CreditCard, Package } from 'lucide-react';
import moment from 'moment';
import { NORMALIZE_STATUS } from '@/components/orders/OrderKanban';

const STATUS_LABELS = {
  pending: 'Bekliyor',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  completed: 'Tamamlandı',
};

// Sipariş detay pop-up'ı — geçmiş sayfasından bir karta tıklandığında açılır.
// Tüm detayları gösterir + termal yazdırma butonu.
export default function OrderDetailDialog({ order, open, onClose, onPrint }) {
  if (!order) return null;
  const norm = NORMALIZE_STATUS(order.status);
  const subtotal = (order.items || []).reduce((s, i) => s + (i.subtotal || 0), 0);
  const tax = (order.total || 0) - subtotal;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap pr-6">
            <span className="text-lg">
              {order.table_name || order.customer_name || 'Sipariş'}{' '}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                #{String(order.id || '').slice(-6).toUpperCase()}
              </span>
            </span>
            <Badge variant="outline">{STATUS_LABELS[norm] || norm}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Üst meta */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Meta icon={<Calendar className="h-3.5 w-3.5" />} label="Tarih"
              value={moment(order.created_date).format('DD.MM.YYYY HH:mm')} />
            <Meta icon={<Package className="h-3.5 w-3.5" />} label="Kaynak"
              value={(order.order_source || 'pos_dine_in').replace(/_/g, ' ')} />
            {order.staff_name && (
              <Meta icon={<User className="h-3.5 w-3.5" />} label="Garson" value={order.staff_name} />
            )}
            {order.customer_name && (
              <Meta icon={<User className="h-3.5 w-3.5" />} label="Müşteri" value={order.customer_name} />
            )}
            {order.customer_phone && (
              <Meta icon={<Phone className="h-3.5 w-3.5" />} label="Telefon" value={order.customer_phone} />
            )}
            {order.payment_method && (
              <Meta icon={<CreditCard className="h-3.5 w-3.5" />} label="Ödeme"
                value={order.payment_method === 'card' ? 'Kart' : 'Nakit'} />
            )}
            {order.delivery_address && (
              <Meta icon={<MapPin className="h-3.5 w-3.5" />} label="Adres" value={order.delivery_address} />
            )}
          </div>

          {/* Notlar */}
          {order.notes && (
            <div className="p-3 bg-secondary/50 rounded-xl text-sm flex gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <span>{order.notes}</span>
            </div>
          )}

          {/* Ürünler */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Ürünler</p>
            <div className="border rounded-xl divide-y">
              {(order.items || []).map((item, i) => (
                <div key={i} className="p-3">
                  <div className="flex justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        <span className="text-muted-foreground">{item.quantity}×</span> {item.product_name}
                      </p>
                      {item.extras?.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {item.extras.map((e, j) => (
                            <li key={j}>+ {e.name}{e.price ? ` (€${Number(e.price).toFixed(2)})` : ''}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="font-bold text-sm">€{Number(item.subtotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <div className="p-3 text-xs text-muted-foreground text-center">Ürün yok</div>
              )}
            </div>
          </div>

          {/* Tutar özeti */}
          <div className="border rounded-xl p-3 space-y-1 text-sm bg-secondary/30">
            <Row label="Ara Toplam" value={`€${subtotal.toFixed(2)}`} />
            {tax > 0 && <Row label="KDV" value={`€${tax.toFixed(2)}`} />}
            <Row label="TOPLAM" value={`€${Number(order.total || 0).toFixed(2)}`} bold />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">Kapat</Button>
            <Button onClick={() => onPrint?.(order)} className="rounded-xl gap-1">
              <Printer className="h-4 w-4" /> Termal Yazdır
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-black text-base pt-1 border-t' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}