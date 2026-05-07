import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Check, ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import MenuImportUploader from '@/components/admin/menuImport/MenuImportUploader';
import MenuImportItemEditor from '@/components/admin/menuImport/MenuImportItemEditor';

// Görselden AI ile menü çıkarma — çoklu görsel + ekstralar/varyantlar.
// 1) Restoran menü fotoğrafları yükler
// 2) AI vision (OpenAI/OpenRouter uyumlu) tüm ürünleri ve ekstraları çıkarır
// 3) ONAY EKRANI: restoran her ürünü düzeltebilir, ekstra ekleyip silebilir
// 4) "Menüyü Uygula" — Category/Product/ExtraGroup/Extra entity'lerine yazılır
export default function MenuPhotoImport() {
  const [images, setImages] = useState([]);   // [url]
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState([]);     // [{ name, price, category, extras:[{name,price}], _selected }]
  const [importing, setImporting] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-import'],
    queryFn: () => base44.entities.Category.list(),
  });

  // ====== UPLOAD ======
  async function addImages(files) {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} fotoğraf yüklendi`);
    } catch (err) {
      toast.error('Yükleme başarısız: ' + err.message);
    }
    setUploading(false);
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // ====== AI ANALİZ ======
  async function analyze() {
    if (!images.length) return toast.error('Önce fotoğraf yükleyin');
    setAnalyzing(true);
    try {
      // OpenAI/OpenRouter vision formatı: messages[].content array → [{type:"text"},{type:"image_url"}]
      const userContent = [
        {
          type: 'text',
          text:
            'Bu menü fotoğraflarındaki TÜM ürünleri çıkar. SADECE geçerli JSON döndür, başka hiçbir açıklama yazma.\n' +
            'Format: {"items":[{"name":"...","price":0.00,"category":"...","extras":[{"name":"Boy: Büyük","price":2.00}]}]}\n' +
            '- Fiyatları sayı olarak ver (€ işareti yok).\n' +
            '- Boy/porsiyon (örn. Küçük/Orta/Büyük) ve sos/ek malzeme seçeneklerini "extras" altına EKLE.\n' +
            '- Ekstra fiyat farkları ana fiyatın üstüne eklenecek delta olarak yaz; ücretsiz ise 0.\n' +
            '- Aynı ürün birden fazla boyda görünüyorsa: bir ürün + extras: [{Küçük, 0},{Orta, 1.5},{Büyük, 3}].\n' +
            '- Kategori bilgisi yoksa "Diğer" yaz. Türkçe/Hollandaca/İngilizce/Fransızca menüleri destekle.',
        },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
      ];

      const res = await base44.functions.invoke('aiInvoke', {
        feature: 'menu_photo_import',
        messages: [
          { role: 'system', content: 'You are a precise menu OCR assistant. Output strictly valid JSON only.' },
          { role: 'user', content: userContent },
        ],
      });

      const text = res?.data?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI yanıtı JSON içermiyor');
      const parsed = JSON.parse(match[0]);
      const arr = Array.isArray(parsed.items) ? parsed.items : [];
      if (!arr.length) throw new Error('Hiç ürün bulunamadı');

      setItems(
        arr.map((i) => ({
          name: i.name || '',
          price: parseFloat(i.price) || 0,
          category: i.category || 'Diğer',
          extras: Array.isArray(i.extras)
            ? i.extras.map((e) => ({ name: e.name || '', price: parseFloat(e.price) || 0 }))
            : [],
          _selected: true,
        }))
      );
      toast.success(`${arr.length} ürün bulundu — düzelt ve uygula`);
    } catch (err) {
      toast.error('Tarama hatası: ' + err.message);
    }
    setAnalyzing(false);
  }

  // ====== UYGULA ======
  async function applyImport() {
    const selected = items.filter((i) => i._selected !== false && i.name?.trim());
    if (!selected.length) return toast.error('En az bir ürün seçin');
    setImporting(true);
    try {
      // 1) Kategorileri map'le, eksikleri yarat
      const allCats = await base44.entities.Category.list();
      const catMap = new Map(allCats.map((c) => [c.name.toLowerCase(), c.id]));
      const newCatNames = [...new Set(selected.map((i) => (i.category || 'Diğer').trim()))]
        .filter((n) => !catMap.has(n.toLowerCase()));
      for (const name of newCatNames) {
        const c = await base44.entities.Category.create({ name, sort_order: 0 });
        catMap.set(name.toLowerCase(), c.id);
      }

      // 2) Ürünleri tek tek oluştur — ekstrası olanlar için ExtraGroup + Extra zinciri kur
      let created = 0;
      for (const it of selected) {
        const categoryId = catMap.get((it.category || 'Diğer').toLowerCase());
        let extraGroupIds = [];

        if (it.extras?.length) {
          // Ürüne özel bir ExtraGroup
          const grp = await base44.entities.ExtraGroup.create({
            name: `${it.name} - Seçenekler`,
            selection_type: 'multiple',
          });
          await Promise.all(
            it.extras
              .filter((e) => e.name?.trim())
              .map((e) =>
                base44.entities.Extra.create({
                  name: e.name,
                  price: parseFloat(e.price) || 0,
                  group_id: grp.id,
                })
              )
          );
          extraGroupIds = [grp.id];
        }

        await base44.entities.Product.create({
          name: it.name,
          base_price: parseFloat(it.price) || 0,
          category_id: categoryId,
          extra_group_ids: extraGroupIds,
        });
        created++;
      }

      toast.success(`${created} ürün menüye eklendi 🎉`);
      setItems([]);
      setImages([]);
    } catch (err) {
      toast.error('İçe aktarma başarısız: ' + err.message);
    }
    setImporting(false);
  }

  // ====== UI ======
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" /> Fotoğraftan Menü Oluştur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <p>📸 Birden fazla menü fotoğrafı yükleyin (sayfa sayfa).</p>
          <p>🤖 AI tüm ürünleri, fiyatları ve <strong>boy/seçenek/ekstra</strong>ları çıkarır.</p>
          <p>✏️ Onay ekranında düzeltir, eksikleri eklersiniz — sonra menü kayda alınır.</p>
        </div>

        {/* 1. Yükleyici */}
        <MenuImportUploader
          images={images}
          onAdd={addImages}
          onRemove={removeImage}
          uploading={uploading}
        />

        {/* 2. Analiz et */}
        {images.length > 0 && (
          <Button
            onClick={analyze}
            disabled={analyzing}
            className="w-full rounded-xl gap-2"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'AI tarıyor…' : `AI ile ${images.length} Fotoğrafı Tara`}
          </Button>
        )}

        {/* 3. Onay & düzenleme */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                Bulunan Ürünler ({items.filter((i) => i._selected !== false).length}/{items.length})
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setItems((prev) => [...prev, { name: '', price: 0, category: 'Diğer', extras: [], _selected: true }])}
                >
                  + Manuel Ekle
                </Button>
                <Button
                  onClick={applyImport}
                  disabled={importing}
                  size="sm"
                  className="rounded-xl gap-1"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Menüye Uygula
                </Button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 flex gap-2 text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>AI hatalı çıkarmış olabilir — fiyatları ve ekstra fark fiyatlarını kontrol edip düzeltin.</span>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <MenuImportItemEditor
                  key={idx}
                  item={item}
                  categories={categories}
                  onChange={(next) => setItems((prev) => prev.map((it, i) => (i === idx ? next : it)))}
                  onRemove={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}