import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Upload, ImageIcon, Loader2, Layout, Type, Eye, Receipt as ReceiptIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Gelişmiş termal fiş tasarımcısı.
// `form` ve `update(key, value)` parent'tan gelir; kaydetmeyi de parent (`onSave`) yapar.
export default function ReceiptDesigner({ form, update, onSave, saving }) {
  const logoInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update('receipt_logo_url', file_url);
      toast.success('Logo yüklendi');
    } catch {
      toast.error('Yüklenemedi');
    }
    setUploadingLogo(false);
  };

  return (
    <Tabs defaultValue="layout">
      <TabsList className="rounded-xl mb-3 flex-wrap h-auto">
        <TabsTrigger value="layout" className="rounded-lg gap-1.5"><Layout className="h-3.5 w-3.5" />Düzen</TabsTrigger>
        <TabsTrigger value="typo" className="rounded-lg gap-1.5"><Type className="h-3.5 w-3.5" />Tipografi</TabsTrigger>
        <TabsTrigger value="content" className="rounded-lg gap-1.5"><Eye className="h-3.5 w-3.5" />İçerik</TabsTrigger>
        <TabsTrigger value="texts" className="rounded-lg gap-1.5"><ReceiptIcon className="h-3.5 w-3.5" />Metinler</TabsTrigger>
      </TabsList>

      {/* DÜZEN */}
      <TabsContent value="layout" className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon className="h-3.5 w-3.5" />Logo</Label>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <div className="flex items-center gap-3 flex-wrap">
            {form.receipt_logo_url && (
              <img src={form.receipt_logo_url} alt="Logo" className="h-12 w-auto rounded-lg border bg-white p-1 object-contain" />
            )}
            <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingLogo ? 'Yükleniyor…' : 'Logo Yükle'}
            </Button>
            {form.receipt_logo_url && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive rounded-xl" onClick={() => update('receipt_logo_url', '')}>
                Kaldır
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SelectField label="Kağıt Boyutu" value={form.receipt_paper_size} onChange={(v) => update('receipt_paper_size', v)} options={[
            { value: '58mm', label: '58 mm' }, { value: '80mm', label: '80 mm' },
          ]} />
          <SelectField label="Hizalama" value={form.receipt_align} onChange={(v) => update('receipt_align', v)} options={[
            { value: 'left', label: 'Sola Yaslı' }, { value: 'center', label: 'Ortalı' },
          ]} />
          <SelectField label="Ayraç Stili" value={form.receipt_separator} onChange={(v) => update('receipt_separator', v)} options={[
            { value: 'dashed', label: 'Kesikli' }, { value: 'solid', label: 'Düz' }, { value: 'double', label: 'Çift' }, { value: 'none', label: 'Yok' },
          ]} />
          <NumField label="KDV Oranı %" value={form.receipt_tax_rate} onChange={(v) => update('receipt_tax_rate', parseFloat(v) || 0)} />
        </div>
      </TabsContent>

      {/* TİPOGRAFİ */}
      <TabsContent value="typo" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SelectField label="Font Stili" value={form.receipt_font} onChange={(v) => update('receipt_font', v)} options={[
            { value: 'default', label: 'Sans' }, { value: 'monospace', label: 'Mono' }, { value: 'serif', label: 'Serif' },
          ]} />
          <SelectField label="Font Boyutu" value={form.receipt_font_size} onChange={(v) => update('receipt_font_size', v)} options={[
            { value: 'small', label: 'Küçük' },
            { value: 'medium', label: 'Orta' },
            { value: 'large', label: 'Büyük' },
            { value: 'xlarge', label: 'Çok Büyük' },
          ]} />
          <SelectField label="Font Ağırlığı" value={form.receipt_font_weight} onChange={(v) => update('receipt_font_weight', v)} options={[
            { value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Kalın' },
          ]} />
        </div>
      </TabsContent>

      {/* İÇERİK SEÇİMİ */}
      <TabsContent value="content" className="space-y-2">
        <p className="text-xs text-muted-foreground mb-1">Fiş üzerinde hangi alanların görüneceğini seçin.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['receipt_show_logo', 'Logo'],
            ['receipt_show_company', 'Restoran Adı'],
            ['receipt_show_address', 'Adres & Telefon'],
            ['receipt_show_vat', 'VAT/BTW Numarası'],
            ['receipt_show_table', 'Masa Adı'],
            ['receipt_show_datetime', 'Tarih & Saat'],
            ['receipt_show_order_number', 'Sipariş No'],
            ['receipt_show_staff', 'Garson Adı'],
            ['receipt_show_extras', 'Ürün Ekstraları'],
            ['receipt_show_subtotal', 'Ara Toplam'],
            ['receipt_show_tax', 'KDV Satırı'],
          ].map(([key, label]) => (
            <ToggleRow key={key} label={label} checked={!!form[key]} onChange={(v) => update(key, v)} />
          ))}
        </div>
      </TabsContent>

      {/* METİNLER */}
      <TabsContent value="texts" className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Başlık Altı Ekstra Yazı</Label>
          <Input
            value={form.receipt_header_extra || ''}
            onChange={(e) => update('receipt_header_extra', e.target.value)}
            placeholder="örn. www.restaurant.be"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Alt Yazı (1. Satır)</Label>
          <Textarea
            value={form.receipt_footer || ''}
            onChange={(e) => update('receipt_footer', e.target.value)}
            placeholder="Bedankt voor uw bezoek!"
            className="rounded-xl resize-none" rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Alt Yazı (2. Satır)</Label>
          <Input
            value={form.receipt_footer_2 || ''}
            onChange={(e) => update('receipt_footer_2', e.target.value)}
            placeholder="@restaurant_insta"
            className="rounded-xl"
          />
        </div>
      </TabsContent>

      <Button onClick={onSave} disabled={saving} className="w-full rounded-xl gap-2 mt-3">
        <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Tasarımı Kaydet'}
      </Button>
    </Tabs>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input type="number" value={value ?? 0} onChange={(e) => onChange(e.target.value)} className="rounded-xl h-9" />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}