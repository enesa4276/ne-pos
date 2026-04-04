import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/i18n';

export default function DiscountManager() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState({ name: '', code: '', type: 'percentage', value: '' });

  const { data: discounts = [] } = useQuery({
    queryKey: ['discounts', user?.email],
    queryFn: () => base44.entities.Discount.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Discount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      setForm({ name: '', code: '', type: 'percentage', value: '' });
      toast.success('İndirim oluşturuldu!');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Discount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('Silindi');
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Discount.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.value) return;
    createMut.mutate({
      ...form,
      code: form.code.toUpperCase().replace(/\s/g, ''),
      value: parseFloat(form.value),
      is_active: true,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Tag className="h-4 w-4 text-primary" /> İndirimler & Kodlar
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input
          placeholder="İndirim Adı"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <Input
          placeholder="KOD (ör: YAZI20)"
          value={form.code}
          onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
          className="font-mono"
        />
        <select
          className="border border-input bg-background rounded-md px-3 py-2 text-sm"
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
        >
          <option value="percentage">Yüzde (%)</option>
          <option value="fixed">Sabit (€)</option>
        </select>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={form.type === 'percentage' ? '% Değer' : '€ Değer'}
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            min={0}
            max={form.type === 'percentage' ? 100 : undefined}
          />
          <Button type="submit" size="icon" disabled={createMut.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {discounts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Henüz indirim oluşturulmadı.</p>
        )}
        {discounts.map(d => (
          <div key={d.id} className="flex items-center justify-between bg-secondary/40 rounded-xl px-3 py-2">
            <div className="flex items-center gap-3">
              <Badge className="font-mono text-xs">{d.code}</Badge>
              <span className="text-sm font-medium">{d.name}</span>
              <span className="text-sm text-primary font-bold">
                {d.type === 'percentage' ? `%${d.value}` : formatCurrency(d.value)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMut.mutate({ id: d.id, is_active: !d.is_active })}
                className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${
                  d.is_active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {d.is_active ? 'Aktif' : 'Pasif'}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => deleteMut.mutate(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}