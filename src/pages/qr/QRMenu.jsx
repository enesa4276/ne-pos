import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ShoppingCart, Plus, Minus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import QRCart from '@/components/qr/QRCart';
import QRSuggestions from '@/components/qr/QRSuggestions';

export default function QRMenu() {
  const { tenantId, tableId } = useParams();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => { loadAll(); }, [tenantId, tableId]);

  async function loadAll() {
    setLoading(true);
    try {
      const tenants = await base44.entities.Tenant.filter({ tenant_id: tenantId });
      setTenant(tenants[0]);
      const tables = await base44.entities.RestaurantTable.filter({ tenant_id: tenantId, id: tableId });
      setTable(tables[0]);
      const cats = await base44.entities.Category.filter({ tenant_id: tenantId }, 'sort_order');
      setCategories(cats);
      const prods = await base44.entities.Product.filter({ tenant_id: tenantId }, 'name');
      setProducts(prods);
      if (cats.length) setActiveCat(cats[0].id);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const addToCart = (product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product_id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        updated[idx].subtotal = updated[idx].base_price * updated[idx].quantity;
        return updated;
      }
      return [...prev, {
        product_id: product.id, product_name: product.name, base_price: product.base_price,
        quantity: 1, subtotal: product.base_price, extras: [],
      }];
    });
    toast.success(`${product.name} eklendi`);
  };

  const updateQty = (idx, delta) => {
    setCart((prev) => {
      const u = [...prev];
      u[idx].quantity = Math.max(0, u[idx].quantity + delta);
      if (u[idx].quantity === 0) return u.filter((_, i) => i !== idx);
      u[idx].subtotal = u[idx].base_price * u[idx].quantity;
      return u;
    });
  };

  const filtered = activeCat ? products.filter((p) => p.category_id === activeCat) : products;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (!tenant || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <X className="w-12 h-12 mx-auto text-destructive mb-2" />
          <h2 className="font-bold">Geçersiz QR Kod</h2>
          <p className="text-sm text-muted-foreground mt-1">Lütfen masanızdaki QR kodu kontrol edin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 pb-32">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 rounded-b-3xl shadow-lg">
        <p className="text-xs opacity-80 uppercase tracking-wide">Hoş geldiniz</p>
        <h1 className="text-2xl font-black mt-1">{tenant.company_name}</h1>
        <p className="text-sm opacity-90 mt-1">📍 Masa: <strong>{table.name}</strong></p>
      </div>

      {/* Categories */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border">
        <ScrollArea className="w-full">
          <div className="flex gap-2 p-3 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCat === c.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-foreground'
                }`}
              >
                {c.icon || '🍽️'} {c.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Products */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-card rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex">
            {p.image_url && <img src={p.image_url} alt={p.name} className="w-24 h-24 object-cover flex-shrink-0" />}
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm">{p.name}</h3>
                <p className="text-primary font-black mt-1">€{p.base_price.toFixed(2)}</p>
              </div>
              <Button size="sm" className="rounded-full mt-2 self-end" onClick={() => addToCart(p)}>
                <Plus className="w-3 h-3 mr-1" /> Ekle
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">Bu kategoride ürün yok.</p>
        )}
      </div>

      {/* Smart Suggestions */}
      {cart.length > 0 && (
        <QRSuggestions tenantId={tenantId} cart={cart} onAdd={addToCart} allProducts={products} />
      )}

      {/* Floating cart */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-4 right-4 bg-primary text-primary-foreground rounded-2xl p-4 shadow-2xl flex items-center justify-between font-bold z-20 backdrop-blur-md"
        >
          <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> {cartCount} ürün</span>
          <span>€{cartTotal.toFixed(2)} • Sepete bak →</span>
        </button>
      )}

      <QRCart
        open={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onUpdateQty={updateQty}
        tenantId={tenantId}
        tableId={tableId}
        tableName={table.name}
        onSubmitted={() => { setCart([]); setShowCart(false); }}
      />
    </div>
  );
}