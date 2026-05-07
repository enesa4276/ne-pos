import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, LogOut, Building2, Phone, Mail, MapPin, Receipt, Hash, Upload, ImageIcon, Loader2, Tablet as TabletIcon, Users, QrCode } from 'lucide-react';
import ReceiptPreview from '@/components/account/ReceiptPreview';
import StaffManager from '@/components/account/StaffManager';
import TableManager from '@/components/admin/TableManager';
import QRCodeManager from '@/pages/admin/QRCodeManager';

const DEFAULTS = {
  company_name: '',
  vat_number: '',
  address: '',
  phone: '',
  email_receipt: '',
  receipt_footer: 'Bedankt voor uw bezoek!',
  receipt_logo_url: '',
  receipt_font: 'default',
  receipt_paper_size: '80mm',
  receipt_font_size: 'medium',
  max_tablets: 3,
};

export default function Account() {
  const { data: user, isLoading } = useCurrentUser();
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        company_name: user.company_name || '',
        vat_number: user.vat_number || '',
        address: user.address || '',
        phone: user.phone || '',
        email_receipt: user.email_receipt || '',
        receipt_footer: user.receipt_footer || 'Bedankt voor uw bezoek!',
        receipt_logo_url: user.receipt_logo_url || '',
        receipt_font: user.receipt_font || 'default',
        receipt_paper_size: user.receipt_paper_size || '80mm',
        receipt_font_size: user.receipt_font_size || 'medium',
        max_tablets: user.max_tablets ?? 3,
      });
    }
  }, [user]);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(form);
      toast.success('Ayarlar kaydedildi');
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message);
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update('receipt_logo_url', file_url);
      toast.success('Logo yüklendi');
    } catch (err) {
      toast.error('Yüklenemedi');
    }
    setUploadingLogo(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-20 md:pb-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Restoran Ayarları</h1>
          <p className="text-sm text-muted-foreground">{user?.full_name} · {user?.email}</p>
        </div>
        <Button variant="destructive" size="sm" className="rounded-xl gap-2" onClick={() => base44.auth.logout('/')}>
          <LogOut className="h-4 w-4" /> Çıkış
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="rounded-xl flex-wrap h-auto">
          <TabsTrigger value="info" className="rounded-lg gap-1.5"><Building2 className="h-3.5 w-3.5" />Genel</TabsTrigger>
          <TabsTrigger value="receipt" className="rounded-lg gap-1.5"><Receipt className="h-3.5 w-3.5" />Termal Fiş</TabsTrigger>
          <TabsTrigger value="tables" className="rounded-lg gap-1.5"><MapPin className="h-3.5 w-3.5" />Masalar</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-lg gap-1.5"><Users className="h-3.5 w-3.5" />Personel</TabsTrigger>
          <TabsTrigger value="qr" className="rounded-lg gap-1.5"><QrCode className="h-3.5 w-3.5" />QR Menü</TabsTrigger>
          <TabsTrigger value="devices" className="rounded-lg gap-1.5"><TabletIcon className="h-3.5 w-3.5" />Cihazlar</TabsTrigger>
        </TabsList>

        {/* GENEL */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Restoran Bilgileri</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Restoran Adı" icon={<Building2 className="h-3.5 w-3.5" />} value={form.company_name} onChange={(v) => update('company_name', v)} placeholder="Brasserie De Kroon" />
              <Field label="VAT/BTW Numarası" icon={<Hash className="h-3.5 w-3.5" />} value={form.vat_number} onChange={(v) => update('vat_number', v)} placeholder="BE 0123.456.789" />
              <Field label="Adres" icon={<MapPin className="h-3.5 w-3.5" />} value={form.address} onChange={(v) => update('address', v)} placeholder="Grote Markt 1, 9000 Gent" />
              <Field label="Telefon" icon={<Phone className="h-3.5 w-3.5" />} value={form.phone} onChange={(v) => update('phone', v)} placeholder="+32 9 000 00 00" />
              <Field label="E-posta" icon={<Mail className="h-3.5 w-3.5" />} value={form.email_receipt} onChange={(v) => update('email_receipt', v)} placeholder="info@restaurant.be" />
              <div className="md:col-span-2">
                <Button className="rounded-xl gap-2" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TERMAL FİŞ */}
        <TabsContent value="receipt" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Termal Fiş Tasarımı</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon className="h-3.5 w-3.5" />Logo</Label>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <div className="flex items-center gap-3 flex-wrap">
                    {form.receipt_logo_url && (
                      <img src={form.receipt_logo_url} alt="Logo" className="h-12 w-auto rounded-lg border border-border object-contain bg-white p-1" />
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

                <div className="grid grid-cols-3 gap-3">
                  <SelectField label="Kağıt" value={form.receipt_paper_size} onChange={(v) => update('receipt_paper_size', v)} options={[
                    { value: '58mm', label: '58 mm' }, { value: '80mm', label: '80 mm' },
                  ]} />
                  <SelectField label="Font Stili" value={form.receipt_font} onChange={(v) => update('receipt_font', v)} options={[
                    { value: 'default', label: 'Sans' }, { value: 'monospace', label: 'Mono' }, { value: 'serif', label: 'Serif' },
                  ]} />
                  <SelectField label="Font Boyutu" value={form.receipt_font_size} onChange={(v) => update('receipt_font_size', v)} options={[
                    { value: 'small', label: 'Küçük' }, { value: 'medium', label: 'Orta' }, { value: 'large', label: 'Büyük' },
                  ]} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Alt Yazı (Footer)</Label>
                  <Textarea
                    value={form.receipt_footer}
                    onChange={(e) => update('receipt_footer', e.target.value)}
                    placeholder="Bedankt voor uw bezoek!"
                    className="rounded-xl resize-none"
                    rows={2}
                  />
                </div>

                <Button className="w-full rounded-xl gap-2" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Tasarımı Kaydet'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Canlı Önizleme</CardTitle></CardHeader>
              <CardContent>
                <ReceiptPreview form={form} />
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Bu önizleme, gerçek bir siparişle aynı stille basılır.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MASALAR */}
        <TabsContent value="tables" className="mt-4">
          <TableManager />
        </TabsContent>

        {/* PERSONEL */}
        <TabsContent value="staff" className="mt-4">
          <StaffManager />
        </TabsContent>

        {/* QR */}
        <TabsContent value="qr" className="mt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[70vh] overflow-y-auto">
                <QRCodeManager />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CIHAZLAR */}
        <TabsContent value="devices" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TabletIcon className="h-4 w-4 text-primary" />Tablet Cihazları</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
                Garsonların kullanacağı tablet sayısını burada belirleyin. Her tablet aynı hesaptan giriş yapar ve sipariş alabilir.
              </div>
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-sm font-medium">Maksimum Tablet Sayısı</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.max_tablets}
                  onChange={(e) => update('max_tablets', parseInt(e.target.value) || 1)}
                  className="rounded-xl"
                />
              </div>
              <Button className="rounded-xl gap-2" onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>

              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-medium mb-2">Tablet'i Aç</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Her tablette tarayıcıyı açın ve aşağıdaki linke gidin. Garson masa numarasını seçerek sipariş almaya başlar.
                </p>
                <code className="block bg-secondary/70 p-3 rounded-xl text-xs break-all">
                  {window.location.origin}/tablet
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, icon, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">{icon}{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-xl" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}