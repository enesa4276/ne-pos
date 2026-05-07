import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Plus } from 'lucide-react';

export default function QRSuggestions({ tenantId, cart, onAdd, allProducts }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cart.length === 0) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      fetchSuggestions();
    }, 800); // debounce
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart.map((c) => c.product_id + ':' + c.quantity))]);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('smartMenuSuggestion', { tenant_id: tenantId, cart_items: cart });
      setSuggestions(res?.data?.suggestions || []);
    } catch (e) { setSuggestions([]); }
    setLoading(false);
  }

  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="px-4 mt-2">
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="font-bold text-sm">Bunlarla iyi gider</h3>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Öneriler hazırlanıyor...</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => {
              const product = allProducts.find((p) => p.id === s.product_id) || s;
              return (
                <div key={s.product_id} className="flex items-center gap-3 bg-card/70 rounded-xl p-2">
                  {s.image_url && <img src={s.image_url} alt={s.product_name} className="w-12 h-12 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.product_name}</p>
                    <p className="text-xs text-muted-foreground italic truncate">{s.reason}</p>
                  </div>
                  <span className="font-bold text-primary text-sm">€{s.base_price?.toFixed(2)}</span>
                  <button
                    onClick={() => onAdd(product)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}