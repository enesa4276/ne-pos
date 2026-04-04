import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category_id: '', base_price: '', image_url: '', extra_group_ids: [] });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('name'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  const { data: extraGroups = [] } = useQuery({
    queryKey: ['extraGroups'],
    queryFn: () => base44.entities.ExtraGroup.list(),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Ürün eklendi');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Ürün güncellendi');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Ürün silindi');
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', category_id: '', base_price: '', image_url: '', extra_group_ids: [] });
    setShowDialog(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category_id: product.category_id || '',
      base_price: String(product.base_price || ''),
      image_url: product.image_url || '',
      extra_group_ids: product.extra_group_ids || [],
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const data = {
      name: form.name,
      category_id: form.category_id || null,
      base_price: parseFloat(form.base_price) || 0,
      image_url: form.image_url || null,
      extra_group_ids: form.extra_group_ids,
    };

    if (editing) {
      update.mutate({ id: editing.id, data });
    } else {
      create.mutate(data);
    }
    setShowDialog(false);
  };

  const toggleExtraGroup = (groupId) => {
    setForm(prev => ({
      ...prev,
      extra_group_ids: prev.extra_group_ids.includes(groupId)
        ? prev.extra_group_ids.filter(id => id !== groupId)
        : [...prev.extra_group_ids, groupId],
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ürünler</CardTitle>
        <Button className="rounded-xl gap-1" onClick={openNew}>
          <Plus className="h-4 w-4" /> Yeni Ürün
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {products.map((product) => {
            const cat = categories.find(c => c.id === product.category_id);
            return (
              <div key={product.id} className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
                <div>
                  <span className="font-medium text-sm">{product.name}</span>
                  <span className="ml-2 text-primary font-bold text-sm">₺{product.base_price?.toFixed(2)}</span>
                  {cat && <span className="ml-2 text-xs text-muted-foreground">{cat.name}</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">Henüz ürün eklenmemiş</p>
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Ürün Düzenle' : 'Yeni Ürün'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Ürün Adı</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label>Fiyat (₺)</Label>
                <Input type="number" value={form.base_price} onChange={(e) => setForm(p => ({ ...p, base_price: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={form.category_id} onValueChange={(val) => setForm(p => ({ ...p, category_id: val }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Görsel URL (opsiyonel)</Label>
                <Input value={form.image_url} onChange={(e) => setForm(p => ({ ...p, image_url: e.target.value }))} className="rounded-xl" placeholder="https://..." />
              </div>
              {extraGroups.length > 0 && (
                <div className="space-y-2">
                  <Label>Ekstra Grupları</Label>
                  {extraGroups.map(g => (
                    <div key={g.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`eg-${g.id}`}
                        checked={form.extra_group_ids.includes(g.id)}
                        onCheckedChange={() => toggleExtraGroup(g.id)}
                      />
                      <Label htmlFor={`eg-${g.id}`} className="text-sm font-normal cursor-pointer">{g.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button className="rounded-xl" onClick={handleSave} disabled={!form.name || !form.base_price}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}