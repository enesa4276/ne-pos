import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Trash2, CreditCard, ChefHat, X, Tag, Percent } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { toast } from 'sonner';

export default function CartPanel({ items, orderLabel, onUpdateQty, onRemove, onPayment, onSendKitchen, onCancel }) {
  const { t } = useLang();
  const { data: user } = useCurrentUser();

  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { name, type, value }
  const [manualDiscount, setManualDiscount] = useState({ show: false, type: 'percentage', value: '' });
  const [codeLoading, setCodeLoading] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.21;
  const baseTotal = subtotal + tax;

  // İndirim hesaplama
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percentage'
      ? baseTotal * (appliedDiscount.value / 100)
      : Math.min(appliedDiscount.value, baseTotal)
    : 0;
  const total = Math.max(0, baseTotal - discountAmount);

  const handleApplyCode = async () => {
    if (!discountCode.trim()) return;
    setCodeLoading(true);
    const results = await base44.entities.Discount.filter({
      created_by: user?.email,
      code: discountCode.toUpperCase().trim(),
      is_active: true,
    });
    setCodeLoading(false);
    if (results.length > 0) {
      setAppliedDiscount(results[0]);
      toast.success(`"${results[0].code}" kodu uygulandı!`);
      setDiscountCode('');
    } else {
      toast.error(t('invalidCode'));
    }
  };

  const handleManualDiscount = () => {
    const val = parseFloat(manualDiscount.value);
    if (!val || val <= 0) return;
    if (manualDiscount.type === 'percentage' && val > 100) return;
    setAppliedDiscount({
      name: manualDiscount.type === 'percentage' ? `%${val} Manuel İndirim` : `${formatCurrency(val)} Manuel İndirim`,
      type: manualDiscount.type,
      value: val,
    });
    setManualDiscount({ show: false, type: 'percentage', value: '' });
    toast.success('İndirim uygulandı!');
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    toast('İndirim kaldırıldı');
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/50">
        <h2 className="font-bold text-base text-foreground">{orderLabel || t('newOrder')}</h2>
        <p className="text-xs text-muted-foreground">{items.length} {t('items')}</p>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t('addFromMenu')}
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
                <p className="font-bold text-sm text-primary ml-2">{formatCurrency(item.subtotal)}</p>
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

      {/* Discount Section */}
      <div className="border-t border-border px-3 py-2 space-y-2">
        {/* Uygulanan indirim gösterimi */}
        {appliedDiscount && (
          <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">{appliedDiscount.name}</span>
              <span className="text-xs text-accent">-{formatCurrency(discountAmount)}</span>
            </div>
            <button onClick={removeDiscount} className="text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* İndirim kodu */}
        {!appliedDiscount && (
          <div className="flex gap-1.5">
            <Input
              placeholder={t('discountCode')}
              value={discountCode}
              onChange={e => setDiscountCode(e.target.value.toUpperCase())}
              className="h-8 text-xs font-mono"
              onKeyDown={e => e.key === 'Enter' && handleApplyCode()}
            />
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={handleApplyCode} disabled={codeLoading}>
              {codeLoading ? '...' : t('apply')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              title={t('manualDiscount')}
              onClick={() => setManualDiscount(m => ({ ...m, show: !m.show }))}
            >
              <Percent className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Manuel indirim girişi */}
        {!appliedDiscount && manualDiscount.show && (
          <div className="flex gap-1.5">
            <select
              className="border border-input bg-background rounded-md px-2 py-1 text-xs"
              value={manualDiscount.type}
              onChange={e => setManualDiscount(m => ({ ...m, type: e.target.value }))}
            >
              <option value="percentage">%</option>
              <option value="fixed">€</option>
            </select>
            <Input
              type="number"
              placeholder={manualDiscount.type === 'percentage' ? '0-100' : '€'}
              value={manualDiscount.value}
              onChange={e => setManualDiscount(m => ({ ...m, value: e.target.value }))}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 px-3 text-xs" onClick={handleManualDiscount}>
              {t('apply')}
            </Button>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-border px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('subtotal')}</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('vat')}</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-accent font-semibold">
            <span>{t('discount')}</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-foreground pt-1 border-t border-border">
          <span>{t('grandTotal')}</span>
          <span className="text-primary">{formatCurrency(total)}</span>
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
          <span className="text-xs font-semibold">{t('cancel')}</span>
        </Button>
        <Button
          variant="outline"
          className="h-14 rounded-xl flex-col gap-0.5 text-accent-foreground bg-accent hover:bg-accent/90"
          onClick={onSendKitchen}
          disabled={items.length === 0}
        >
          <ChefHat className="h-5 w-5" />
          <span className="text-xs font-semibold">{t('kitchen')}</span>
        </Button>
        <Button
          className="h-14 rounded-xl flex-col gap-0.5"
          onClick={() => onPayment(total)}
          disabled={items.length === 0}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-xs font-semibold">{t('payment')}</span>
        </Button>
      </div>
    </div>
  );
}