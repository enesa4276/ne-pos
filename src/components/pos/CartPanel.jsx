import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Trash2, CreditCard, ChefHat, X } from 'lucide-react';

export default function CartPanel({ items, orderLabel, onUpdateQty, onRemove, onPayment, onSendKitchen, onCancel }) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/50">
        <h2 className="font-bold text-base text-foreground">{orderLabel || 'Yeni Sipariş'}</h2>
        <p className="text-xs text-muted-foreground">{items.length} kalem</p>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Ürün eklemek için menüden seçin
            </div>
          )}
          {items.map((item, idx) => (
            <div key={idx} className="bg-background rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.product_name}</p>
                  {item.extras?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.extras.map(e => e.name).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-bold text-sm text-primary ml-2">₺{item.subtotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => onUpdateQty(idx, item.quantity - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => onUpdateQty(idx, item.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onRemove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Ara Toplam</span>
          <span>₺{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>KDV (%10)</span>
          <span>₺{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-foreground pt-1 border-t border-border">
          <span>Genel Toplam</span>
          <span className="text-primary">₺{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 pt-0 grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          className="h-14 rounded-xl flex-col gap-0.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onCancel}
          disabled={items.length === 0}
        >
          <X className="h-5 w-5" />
          <span className="text-xs font-semibold">İptal</span>
        </Button>
        <Button
          variant="outline"
          className="h-14 rounded-xl flex-col gap-0.5 text-accent-foreground bg-accent hover:bg-accent/90"
          onClick={onSendKitchen}
          disabled={items.length === 0}
        >
          <ChefHat className="h-5 w-5" />
          <span className="text-xs font-semibold">Mutfak</span>
        </Button>
        <Button
          className="h-14 rounded-xl flex-col gap-0.5"
          onClick={() => onPayment(total)}
          disabled={items.length === 0}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-xs font-semibold">Ödeme</span>
        </Button>
      </div>
    </div>
  );
}