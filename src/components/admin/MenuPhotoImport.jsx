import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, Loader2, Check, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

// Görselden AI ile menü çıkarma. AI çağrısı `aiInvoke` backend fonksiyonu üzerinden
// yapılır → süper admin'in tanımladığı dış API kullanılır (Base44 kredisi YOK).
export default function MenuPhotoImport() {
  const inputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState([]); // [{ name, price, category }]
  const [importing, setImporting] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setExtracted([]);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success('Görsel yüklendi. Şimdi "AI ile Tara"ya basın.');
    } catch (err) {
      toast.error('Yükleme başarısız');
    }
    setUploading(false);
  };

  const handleAnalyze = async () => {
    if (!imageUrl) return;
    setAnalyzing(true);
    try {
      const prompt = `Bu menü fotoğrafındaki tüm ürünleri çıkar. SADECE geçerli JSON döndür, başka hiçbir şey yazma.
Format: {"items":[{"name":"...","price":0.00,"category":"..."}]}
Fiyatları sayı olarak ver (€ işareti yok). Kategori yoksa "Diğer" yaz.
Görsel URL: ${imageUrl}`;

      const res = await base44.functions.invoke('aiInvoke', {
        feature: 'menu_photo_import',
        messages: [
          { role: 'system', content: 'You are a menu OCR assistant. Output strictly valid JSON.' },
          { role: 'user', content: prompt },
        ],
      });

      const text = res?.data?.text || '';
      // JSON'u ayıkla
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI yanıtı JSON içermiyor');
      const parsed = JSON.parse(match[0]);
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      if (items.length === 0) throw new Error('Hiç ürün bulunamadı');

      setExtracted(items.map((i) => ({ ...i, _selected: true })));
      toast.success(`${items.length} ürün bulundu. Onayladıktan sonra içe aktarın.`);
    } catch (err) {
      toast.error('Tarama hatası: ' + err.message);
    }
    setAnalyzing(false);
  };

  const toggleItem = (idx) => {
    setExtracted((prev) => prev.map((it, i) => (i === idx ? { ...it, _selected: !it._selected } : it)));
  };

  const handleImport = async () => {
    const selected = extracted.filter((i) => i._selected);
    if (selected.length === 0) return toast.error('En az bir ürün seçin');
    setImporting(true);
    try {
      // Mevcut kategorileri al, eksikleri oluştur
      const allCats = await base44.entities.Category.list();
      const catMap = new Map(allCats.map((c) => [c.name.toLowerCase(), c.id]));
      const newCatNames = [...new Set(selected.map((i) => i.category || 'Diğer'))]
        .filter((n) => !catMap.has(n.toLowerCase()));
      for (const name of newCatNames) {
        const c = await base44.entities.Category.create({ name, sort_order: 0 });
        catMap.set(name.toLowerCase(), c.id);
      }

      // Ürünleri ekle
      await base44.entities.Product.bulkCreate(
        selected.map((i) => ({
          name: i.name,
          base_price: parseFloat(i.price) || 0,
          category_id: catMap.get((i.category || 'Diğer').toLowerCase()),
        }))
      );

      toast.success(`${selected.length} ürün eklendi 🎉`);
      setExtracted([]);
      setImageUrl('');
    } catch (err) {
      toast.error('İçe aktarma başarısız: ' + err.message);
    }
    setImporting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" /> Görselden Menü Oluştur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
          Menü fotoğrafınızı yükleyin, AI tüm ürünleri ve fiyatları otomatik çıkarsın.
          Süper admin tarafından tanımlanan harici AI kullanılır — ek Base44 kredisi tüketilmez.
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {!imageUrl ? (
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 rounded-2xl border-2 border-dashed bg-secondary/30 hover:bg-secondary/60"
            variant="outline"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-6 h-6" />
                <span className="text-sm">Menü fotoğrafı seç</span>
              </div>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <img src={imageUrl} alt="Menü" className="w-32 h-32 object-cover rounded-xl border" />
              <div className="flex-1 space-y-2">
                <Button onClick={handleAnalyze} disabled={analyzing} className="w-full rounded-xl gap-2">
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {analyzing ? 'AI tarıyor…' : 'AI ile Tara'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => { setImageUrl(''); setExtracted([]); }}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Görseli Kaldır
                </Button>
              </div>
            </div>
          </div>
        )}

        {extracted.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-1">
                <ImageIcon className="w-4 h-4" /> Bulunan Ürünler ({extracted.filter((i) => i._selected).length}/{extracted.length})
              </p>
              <Button onClick={handleImport} disabled={importing} size="sm" className="rounded-xl gap-1">
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                İçe Aktar
              </Button>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {extracted.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleItem(idx)}
                  className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${
                    item._selected ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/40'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      item._selected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {item._selected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className="flex-1 text-sm font-medium">{item.name}</span>
                  <Badge variant="outline" className="text-[10px]">{item.category || 'Diğer'}</Badge>
                  <span className="text-sm font-bold text-primary">€{parseFloat(item.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}