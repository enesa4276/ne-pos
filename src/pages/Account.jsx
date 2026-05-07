import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, LogOut, Building2, Phone, Mail, MapPin, Receipt, Hash, Loader2, Tablet as TabletIcon, Users, QrCode, Bell } from 'lucide-react';
import ReceiptPreview from '@/components/account/ReceiptPreview';
import ReceiptDesigner from '@/components/account/ReceiptDesigner';
import StaffManager from '@/components/account/StaffManager';
import TableManager from '@/components/admin/TableManager';
import QRCodeManager from '@/pages/admin/QRCodeManager';
import StaffTabletDevices from '@/components/account/StaffTabletDevices';
import NotificationSounds from '@/components/account/NotificationSounds';
import { RECEIPT_DEFAULTS } from '@/components/account/receipt/receiptStyles';

const DEFAULTS = {
  company_name: '',
  vat_number: '',
  address: '',
  phone: '',
  email_receipt: '',
  receipt_logo_url: '',
  max_tablets: 3,
  ...RECEIPT_DEFAULTS,
};

export default function Account() {
  const { data: user, isLoading } = useCurrentUser();
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // RECEIPT_DEFAULTS dahil tüm fiş alanlarını user'dan birleştir
      const merged = { ...DEFAULTS };
      for (const key of Object.keys(DEFAULTS)) {
        if (user[key] !== undefined && user[key] !== null) merged[key] = user[key];
      }
      setForm(merged);
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
          <TabsTrigger value="notifications" className="rounded-lg gap-1.5"><Bell className="h-3.5 w-3.5" />Bildirimler</TabsTrigger>
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
              <CardHeader>
                <CardTitle className="text-base">Termal Fiş Tasarımı</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Burada kaydedilen tasarım, sistemdeki tüm fiş yazdırma noktalarında kullanılır.
                </p>
              </CardHeader>
              <CardContent>
                <ReceiptDesigner form={form} update={update} onSave={save} saving={saving} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Canlı Önizleme</CardTitle></CardHeader>
              <CardContent>
                <ReceiptPreview form={form} />
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Bu önizleme, gerçek bir siparişle birebir aynı stille basılır.
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

        {/* CIHAZLAR — Her personele özel tablet linki */}
        <TabsContent value="devices" className="mt-4">
          <StaffTabletDevices />
        </TabsContent>

        {/* BİLDİRİMLER — Her sipariş kaynağı için özel ses */}
        <TabsContent value="notifications" className="mt-4">
          <NotificationSounds user={user} onChanged={() => window.location.reload()} />
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