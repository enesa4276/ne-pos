import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// AI stok asistanı — kullanıcının yazdığı doğal dilden tükenen ürünleri çıkarır
// ve Product entity'lerini is_active=false + out_of_stock_reason ile günceller.
export default function StockAIChat({ products }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const queryClient = useQueryClient();

  async function handleSend() {
    if (!text.trim()) return;
    setLoading(true);
    setLastResult(null);
    try {
      const res = await base44.functions.invoke('stockAIMark', {
        text,
        product_names: products.map((p) => p.name),
      });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);

      const matches = data.matches || []; // [{product_name, reason}]
      const matched = [];
      const unmatched = [];

      for (const m of matches) {
        const found = products.find(
          (p) => p.name.toLowerCase().trim() === String(m.product_name || '').toLowerCase().trim()
        );
        if (found) {
          await base44.entities.Product.update(found.id, {
            is_active: false,
            out_of_stock_reason: m.reason || 'Tükendi',
          });
          matched.push({ name: found.name, reason: m.reason });
        } else {
          unmatched.push(m.product_name);
        }
      }

      setLastResult({ matched, unmatched });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (matched.length) toast.success(`${matched.length} ürün tükenmiş olarak işaretlendi`);
      if (unmatched.length) toast.warning(`Eşleşmeyen: ${unmatched.join(', ')}`);
      setText('');
    } catch (e) {
      toast.error('Hata: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <Card className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <p className="text-xs font-bold text-purple-700 dark:text-purple-300">AI Stok Asistanı</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSend(); }}
          placeholder="Örn: salam bitti, kıymalı börek ve lahmacun kalmadı fırın bozuldu"
          disabled={loading}
          className="rounded-xl bg-card"
        />
        <Button onClick={handleSend} disabled={loading || !text.trim()} className="rounded-xl gap-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Gönder
        </Button>
      </div>

      {lastResult && (
        <div className="mt-3 space-y-1.5 text-xs">
          {lastResult.matched.length > 0 && (
            <div className="flex flex-wrap items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Tükendi:</span>
              {lastResult.matched.map((m) => (
                <Badge key={m.name} variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  {m.name} — {m.reason}
                </Badge>
              ))}
            </div>
          )}
          {lastResult.unmatched.length > 0 && (
            <div className="flex flex-wrap items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-semibold">Eşleşmedi:</span>
              {lastResult.unmatched.map((n, i) => (
                <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                  {n}
                </Badge>
              ))}
              <span className="text-muted-foreground text-[10px] w-full">Bu isimler menüde bulunamadı — menü ismini kontrol edin.</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}