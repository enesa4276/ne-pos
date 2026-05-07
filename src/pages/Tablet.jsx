import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Minus, Trash2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Basit, dokunmatik dostu tablet POS modu
export default function Tablet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get('tableId');
  const tableName = urlParams.get('tableName') || 'Paket';
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.email],
    queryFn: () => base44.entities.Category.filter({ created_by: user?.email }, 'sort_order'),
    enabled: !!user?.email,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', user?.email],
    queryFn: () => base44.entities.Product.filter({ created_by: user?.email }, 'name'),
    enabled: !!user?.email,
  });

  const createOrder = useMutation({
    mutationFn: (d) => base44.entities.Order.create(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const filtered = activeCat ? products.filter((p) => p.category_id === activeCat) : products;

  const add = (p) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product_id === p.id);
      if (idx >= 0) {
        const u = [...prev]; u[idx].quantity++; u[idx].subtotal = u[idx].base_price * u[idx].quantity; return u;
      }
      return [...prev, { product_id: p.id, product_name: p.name, base_price: p.base_price, quantity: 1, subtotal: p.base_price, extras: [] }];
    });
  };
  const change = (i, d) => {
    setCart((prev) => {
      const u = [...prev]; u[i].quantity = Math.max(0, u[i].quantity + d);
      if (u[i].quantity === 0) return u.filter((_, idx) => idx !== i);
      u[i].subtotal = u[i].base_price * u[i].quantity; return u;
    });
  };
  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  const send = async () => {
    if (!cart.length) return;
    const grandTotal = total + total * 0.21;
    await createOrder.mutateAsync({
      order_type: tableId ? 'dine_in' : 'takeaway',
      table_id: tableId || null,
      table_name: tableName,
      items: cart,
      status: 'open',
      total: grandTotal,
      sent_to_kitchen: true,
    });
    if (tableId) {
      await base44.entities.RestaurantTable.update(tableId, { status: 'occupied' });
    }
    toast.success('Mutfağa gönderildi!');
    setCart([]);
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-card border-b">
        <Button variant="ghost" size="lg" onClick={() => navigate('/')} className="rounded-xl">
          <ArrowLeft className="w-5 h-5 mr-1" /> Geri
        </Button>
        <h1 className="text-xl font-black">{tableName}</h1>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{cart.length} ürün</p>
          <p className="text-lg font-black text-primary">€{(total * 1.21).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories */}
        <div className="w-32 bg-secondary/30 overflow-y-auto p-2 space-y-2">
          <button
            onClick={() => setActiveCat(null)}
            className={`w-full p-3 rounded-2xl text-sm font-bold transition-all ${!activeCat ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card'}`}
          >Tümü</button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`w-full p-3 rounded-2xl text-sm font-bold transition-all ${activeCat === c.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card'}`}
            >
              <div className="text-2xl mb-1">{c.icon || '🍽️'}</div>
              {c.name}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-min">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="bg-card rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all overflow-hidden text-left"
            >
              {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover" />}
              <div className="p-3">
                <p className="font-bold text-sm leading-tight">{p.name}</p>
                <p className="text-primary font-black mt-1">€{p.base_price.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Cart */}
        <div className="w-72 bg-card border-l flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Henüz ürün yok</p>}
            {cart.map((item, i) => (
              <div key={i} className="bg-secondary/30 rounded-xl p-2">
                <p className="font-medium text-sm truncate">{item.product_name}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => change(i, -1)} className="w-8 h-8 rounded-full bg-card border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => change(i, 1)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="font-bold text-sm">€{item.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t space-y-2">
            <div className="flex justify-between font-black text-lg"><span>Toplam</span><span className="text-primary">€{(total * 1.21).toFixed(2)}</span></div>
            <Button className="w-full h-14 rounded-2xl text-base" onClick={send} disabled={!cart.length || createOrder.isPending}>
              {createOrder.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
              Mutfağa Gönder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}