import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Minus, Send, Loader2, Package, UtensilsCrossed, Users } from 'lucide-react';
import { toast } from 'sonner';

// Dokunmatik dostu tablet POS modu
export default function Tablet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Adım: 'select' (masa seç) veya 'order' (sipariş al)
  const [step, setStep] = useState('select');
  const [selectedTable, setSelectedTable] = useState(null); // { id, name } veya { id: null, name: 'Paket' }
  const [waiter, setWaiter] = useState(null);
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
  const { data: tables = [] } = useQuery({
    queryKey: ['tables', user?.email],
    queryFn: () => base44.entities.RestaurantTable.filter({ created_by: user?.email }, 'name'),
    enabled: !!user?.email,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', user?.email],
    queryFn: () => base44.entities.Staff.filter({ created_by: user?.email, is_active: true }, 'name').catch(() => []),
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
    if (!cart.length || !selectedTable) return;
    const grandTotal = total + total * 0.21;
    await createOrder.mutateAsync({
      order_type: selectedTable.id ? 'dine_in' : 'takeaway',
      table_id: selectedTable.id || null,
      table_name: selectedTable.name,
      items: cart,
      status: 'open',
      total: grandTotal,
      sent_to_kitchen: true,
      order_source: selectedTable.id ? 'pos_dine_in' : 'pos_takeaway',
      notes: waiter ? `Garson: ${waiter}` : undefined,
    });
    if (selectedTable.id) {
      await base44.entities.RestaurantTable.update(selectedTable.id, { status: 'occupied' });
    }
    toast.success('Mutfağa gönderildi!');
    setCart([]);
    setStep('select');
    setSelectedTable(null);
  };

  // ============ ADIM 1: Masa & Garson Seçimi ============
  if (step === 'select') {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 bg-card border-b">
          <Button variant="ghost" size="lg" onClick={() => navigate('/')} className="rounded-xl">
            <ArrowLeft className="w-5 h-5 mr-1" /> Çıkış
          </Button>
          <h1 className="text-xl font-black">Tablet POS</h1>
          <div className="w-20" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
          {/* Garson seçimi */}
          {staff.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Users className="w-4 h-4" /> Garson
              </h2>
              <div className="flex flex-wrap gap-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setWaiter(s.name)}
                    className={`px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
                      waiter === s.name ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card border'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paket */}
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Package className="w-4 h-4" /> Paket Sipariş
            </h2>
            <button
              onClick={() => { setSelectedTable({ id: null, name: 'Paket' }); setStep('order'); }}
              className="w-full p-6 bg-card rounded-2xl border-2 border-dashed border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-black text-lg">Gel-Al / Paket</p>
                  <p className="text-sm text-muted-foreground">Masa seçmeden sipariş başlat</p>
                </div>
              </div>
            </button>
          </div>

          {/* Masalar */}
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <UtensilsCrossed className="w-4 h-4" /> Masa Seç ({tables.length})
            </h2>
            {tables.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Henüz masa eklenmemiş. Hesap → Masalar bölümünden ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTable({ id: t.id, name: t.name }); setStep('order'); }}
                    className={`p-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
                      t.status === 'occupied'
                        ? 'bg-red-500/20 text-red-600 border border-red-500/40'
                        : t.status === 'bill_requested'
                        ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                        : 'bg-card hover:bg-primary/5 border'
                    }`}
                  >
                    {t.name}
                    {t.status === 'occupied' && <p className="text-[10px] mt-1 opacity-70">Dolu</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ ADIM 2: Sipariş Alma ============
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between p-3 bg-card border-b">
        <Button variant="ghost" size="lg" onClick={() => { setStep('select'); setCart([]); }} className="rounded-xl">
          <ArrowLeft className="w-5 h-5 mr-1" /> Masa Seç
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-black">{selectedTable?.name}</h1>
          {waiter && <p className="text-xs text-muted-foreground">Garson: {waiter}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{cart.length} ürün</p>
          <p className="text-lg font-black text-primary">€{(total * 1.21).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories */}
        <div className="w-28 md:w-32 bg-secondary/30 overflow-y-auto p-2 space-y-2">
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
        <div className="w-64 md:w-72 bg-card border-l flex flex-col">
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