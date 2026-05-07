import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CreateTenantDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ company_name: '', owner_email: '', owner_name: '', phone: '', plan: 'basic' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.company_name || !form.owner_email) {
      toast.error('Restoran adı ve email zorunlu');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('provisionTenant', form);
      if (res?.data?.success) {
        toast.success('Tenant oluşturuldu (UUID otomatik atandı)');
        onCreated?.(res.data.tenant);
        setForm({ company_name: '', owner_email: '', owner_name: '', phone: '', plan: 'basic' });
        onClose();
      } else {
        toast.error(res?.data?.error || 'Oluşturulamadı');
      }
    } catch (e) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Yeni Tenant Oluştur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2">
            🔒 Tenant ID otomatik UUID olarak atanır — kullanıcılara gösterilmez.
          </p>
          <div className="space-y-1.5">
            <Label>Restoran Adı *</Label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Brasserie De Kroon" />
          </div>
          <div className="space-y-1.5">
            <Label>Sahip Email *</Label>
            <Input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} placeholder="owner@restaurant.be" />
          </div>
          <div className="space-y-1.5">
            <Label>Sahip Adı</Label>
            <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>İptal</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Oluştur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}