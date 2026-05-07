import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Loader2, Banknote, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QRCart({ open, onClose, cart, onUpdateQty, tenantId, tableId, tableName, onSubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash | card
  const total = cart.reduce((s, i) => s + i.subtotal, 0);
  const tax = total * 0.21;
  const grandTotal = total + tax;

  const submitOrder = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      await base44.entities.Order.create({
        tenant_id: tenantId,
        order_type: 'dine_in',
        order_source: 'pos_dine_in',
        status: 'pending',
        table_id: tableId,
        table_name: tableName,
        items: cart,
        total: grandTotal,
        payment_method: paymentMethod,
        sent_to_kitchen: false,
        notes: `QR Sipariş — ${paymentMethod === 'card' ? 'Kart' : 'Nakit'} ödeme istendi`,
      });
      toast.success(
        paymentMethod === 'card'
          ? 'Sipariş alındı! Garson kart cihazıyla gelecek.'
          : 'Siparişiniz alındı!'
      );
      onSubmitted?.();
    } catch (e) {
      toast.error('Sipariş gönderilemedi');
    }
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Sepetiniz · Masa {tableName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {cart.length === 0 && <p className="text-center text-muted-foreground py-8">Sepet boş</p>}
          {cart.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">€{item.base_price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdateQty(i, -1)} className="w-8 h-8 rounded-full bg-card border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQty(i, 1)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="font-bold w-16 text-right">€{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="border-t pt-3 space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground"><span>Ara toplam</span><span>€{total.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-muted-foreground"><span>KDV (21%)</span><span>€{tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-black"><span>Toplam</span><span className="text-primary">€{grandTotal.toFixed(2)}</span></div>

            {/* Ödeme Yöntemi */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ödeme Yöntemi</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                    paymentMethod === 'cash' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'
                  }`}
                >
                  <Banknote className="w-4 h-4" /> Nakit
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Kart
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                {paymentMethod === 'card'
                  ? 'Garson kart cihazıyla masanıza gelecek'
                  : 'Garson tahsilat için masanıza gelecek'}
              </p>
            </div>

            <Button className="w-full h-12 rounded-2xl text-base" onClick={submitOrder} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Siparişi Onayla
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}