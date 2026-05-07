import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';

// Tenant genel bilgileri ve tehlikeli işlemler.
export default function TenantGeneralForm({ tenant, onSaved, onDeleted }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      company_name: tenant.company_name || '',
      owner_name: tenant.owner_name || '',
      owner_email: tenant.owner_email || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      subdomain: tenant.subdomain || '',
      custom_domain: tenant.custom_domain || '',
      plan: tenant.plan || 'basic',
      status: tenant.status || 'trial',
      admin_notes: tenant.admin_notes || '',
    });
  }, [tenant]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function persist(patch) {
    const res = await base44.functions.invoke('superAdminUpdateTenant', {
      tenant_id: tenant.id,
      patch,
    });
    if (res?.data?.error) throw new Error(res.data.error);
    if (!res?.data?.ok) throw new Error('Güncelleme başarısız');
  }

  async function save() {
    setSaving(true);
    try {
      await persist(form);
      toast.success('Bilgiler güncellendi');
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    }
    setSaving(false);
  }

  async function toggleSuspend() {
    const next = tenant.status === 'suspended' ? 'active' : 'suspended';
    try {
      await persist({ status: next });
      toast.success(next === 'suspended' ? 'Askıya alındı' : 'Aktifleştirildi');
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function deleteTenant() {
    if (!confirm(`"${tenant.company_name}" silinecek. Bu işlem geri alınamaz. Emin misiniz?`)) return;
    if (!confirm('Bu tenant ve TÜM verileri kalıcı olarak silinecek. Tekrar onaylıyor musunuz?')) return;
    try {
      const res = await base44.functions.invoke('superAdminUpdateTenant', {
        tenant_id: tenant.id,
        action: 'delete',
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success('Tenant silindi');
      onDeleted?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">Genel Bilgiler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Restoran Adı" v={form.company_name} on={(v) => set('company_name', v)} />
          <Field label="Subdomain" v={form.subdomain} on={(v) => set('subdomain', v)} placeholder="restaurant-name" />
          <Field label="Sahip Adı" v={form.owner_name} on={(v) => set('owner_name', v)} />
          <Field label="Sahip Email" v={form.owner_email} on={(v) => set('owner_email', v)} type="email" />
          <Field label="Telefon" v={form.phone} on={(v) => set('phone', v)} />
          <Field label="Custom Domain" v={form.custom_domain} on={(v) => set('custom_domain', v)} placeholder="restaurant.com" />
          <div className="md:col-span-2">
            <Field label="Adres" v={form.address} on={(v) => set('address', v)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Plan</Label>
            <Select value={form.plan} onValueChange={(v) => set('plan', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Durum</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Field label="Admin Notları" v={form.admin_notes} on={(v) => set('admin_notes', v)} placeholder="Sadece sizin görebileceğiniz notlar..." />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving} className="rounded-xl gap-1">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-destructive/30 bg-destructive/5 space-y-2">
        <h3 className="font-bold text-sm text-destructive">Tehlikeli Bölge</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={toggleSuspend}>
            {tenant.status === 'suspended' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {tenant.status === 'suspended' ? 'Aktifleştir' : 'Askıya Al'}
          </Button>
          <Button size="sm" variant="destructive" className="rounded-xl gap-1" onClick={deleteTenant}>
            <Trash2 className="w-3.5 h-3.5" /> Tenant'ı Sil
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, v, on, type = 'text', placeholder }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={v ?? ''} onChange={(e) => on(e.target.value)} type={type} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}