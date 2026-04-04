import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExtrasPopup({ open, onClose, product, extraGroups, extras, onAdd }) {
  const [selectedExtras, setSelectedExtras] = useState({});
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const productGroups = extraGroups.filter(g =>
    product.extra_group_ids?.includes(g.id)
  );

  const groupExtras = (groupId) => extras.filter(e => e.group_id === groupId);

  const handleSingleSelect = (groupId, extraId) => {
    setSelectedExtras(prev => ({ ...prev, [groupId]: [extraId] }));
  };

  const handleMultiSelect = (groupId, extraId, checked) => {
    setSelectedExtras(prev => {
      const current = prev[groupId] || [];
      if (checked) return { ...prev, [groupId]: [...current, extraId] };
      return { ...prev, [groupId]: current.filter(id => id !== extraId) };
    });
  };

  const getSelectedExtrasList = () => {
    const list = [];
    Object.values(selectedExtras).flat().forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      if (extra) list.push({ name: extra.name, price: extra.price || 0 });
    });
    return list;
  };

  const extrasTotal = getSelectedExtrasList().reduce((sum, e) => sum + e.price, 0);
  const itemTotal = (product.base_price + extrasTotal) * quantity;

  const canAdd = () => {
    for (const group of productGroups) {
      if (group.selection_type === 'single_required') {
        if (!selectedExtras[group.id] || selectedExtras[group.id].length === 0) return false;
      }
    }
    return true;
  };

  const handleAdd = () => {
    onAdd({
      product_id: product.id,
      product_name: product.name,
      base_price: product.base_price,
      extras: getSelectedExtrasList(),
      quantity,
      subtotal: itemTotal,
    });
    setSelectedExtras({});
    setQuantity(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <p className="text-primary font-bold text-lg">₺{product.base_price?.toFixed(2)}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {productGroups.map(group => (
            <div key={group.id} className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                {group.name}
                {group.selection_type === 'single_required' && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Zorunlu</span>
                )}
              </h3>

              {group.selection_type === 'single_required' ? (
                <RadioGroup
                  value={selectedExtras[group.id]?.[0] || ''}
                  onValueChange={(val) => handleSingleSelect(group.id, val)}
                  className="space-y-1"
                >
                  {groupExtras(group.id).map(extra => (
                    <Label
                      key={extra.id}
                      htmlFor={extra.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                        selectedExtras[group.id]?.[0] === extra.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={extra.id} id={extra.id} />
                        <span className="text-sm font-medium">{extra.name}</span>
                      </div>
                      {extra.price > 0 && (
                        <span className="text-primary font-semibold text-sm">+₺{extra.price?.toFixed(2)}</span>
                      )}
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-1">
                  {groupExtras(group.id).map(extra => (
                    <Label
                      key={extra.id}
                      htmlFor={`chk-${extra.id}`}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                        (selectedExtras[group.id] || []).includes(extra.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`chk-${extra.id}`}
                          checked={(selectedExtras[group.id] || []).includes(extra.id)}
                          onCheckedChange={(checked) => handleMultiSelect(group.id, extra.id, checked)}
                        />
                        <span className="text-sm font-medium">{extra.name}</span>
                      </div>
                      {extra.price > 0 && (
                        <span className="text-primary font-semibold text-sm">+₺{extra.price?.toFixed(2)}</span>
                      )}
                    </Label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full h-14 text-lg font-bold rounded-xl"
            disabled={!canAdd()}
            onClick={handleAdd}
          >
            Ekle — ₺{itemTotal.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}