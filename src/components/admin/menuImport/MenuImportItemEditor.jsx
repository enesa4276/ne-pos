import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

// Tek bir ürünü düzenler: isim, fiyat, kategori, ekstralar (ad + fiyat)
export default function MenuImportItemEditor({ item, onChange, onRemove, categories }) {
  const update = (patch) => onChange({ ...item, ...patch });
  const addExtra = () => update({ extras: [...(item.extras || []), { name: '', price: 0 }] });
  const updateExtra = (idx, patch) => {
    const next = [...(item.extras || [])];
    next[idx] = { ...next[idx], ...patch };
    update({ extras: next });
  };
  const removeExtra = (idx) => update({ extras: (item.extras || []).filter((_, i) => i !== idx) });

  return (
    <div className={`p-3 rounded-xl border space-y-2 ${item._selected ? 'bg-primary/5 border-primary/40' : 'bg-secondary/30'}`}>
      {/* Üst satır */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item._selected !== false}
          onChange={(e) => update({ _selected: e.target.checked })}
          className="w-4 h-4"
        />
        <Input
          value={item.name || ''}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Ürün adı"
          className="flex-1 h-8 text-sm rounded-lg"
        />
        <Input
          type="number"
          step="0.01"
          value={item.price ?? ''}
          onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          className="w-20 h-8 text-sm rounded-lg"
        />
        <span className="text-xs text-muted-foreground">€</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      {/* Kategori */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-16">Kategori:</span>
        <Input
          value={item.category || ''}
          onChange={(e) => update({ category: e.target.value })}
          list="cat-suggestions"
          placeholder="Diğer"
          className="flex-1 h-7 text-xs rounded-lg"
        />
        <datalist id="cat-suggestions">
          {categories.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
      </div>

      {/* Ekstralar */}
      <div className="space-y-1 pl-6">
        {(item.extras || []).map((ex, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">+</span>
            <Input
              value={ex.name || ''}
              onChange={(e) => updateExtra(idx, { name: e.target.value })}
              placeholder="Ekstra adı (örn. Boy: Büyük)"
              className="flex-1 h-7 text-xs rounded-lg"
            />
            <Input
              type="number"
              step="0.01"
              value={ex.price ?? 0}
              onChange={(e) => updateExtra(idx, { price: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-16 h-7 text-xs rounded-lg"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => removeExtra(idx)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addExtra} className="h-6 text-[11px] gap-1 rounded-lg">
          <Plus className="h-3 w-3" /> Ekstra/Seçenek Ekle
        </Button>
      </div>
    </div>
  );
}