import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Bot, Send, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

function stockStatus(item) {
  if (item.current_quantity <= 0) return 'out';
  if (item.current_quantity <= item.low_stock_threshold) return 'low';
  return 'ok';
}

export default function StockManagement() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', tenant?.tenant_id],
    queryFn: () => base44.entities.Inventory.filter({ tenant_id: tenant.tenant_id }, 'name', 200),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inventory.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', tenant?.tenant_id] }),
  });

  const outCount = items.filter(i => stockStatus(i) === 'out').length;
  const lowCount = items.filter(i => stockStatus(i) === 'low').length;

  async function sendAiMessage() {
    if (!aiMsg.trim()) return;
    setAiLoading(true);
    setAiReply('');
    try {
      const productList = items.map(i => ({ id: i.id, name: i.name, quantity: i.current_quantity, unit: i.unit }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Restoran stok asistanısın. Kullanıcı mesajı: "${aiMsg}"\n\nMevcut stok listesi:\n${JSON.stringify(productList, null, 2)}\n\nKullanıcının söylediği değişiklikleri analiz et ve her etkilenen malzeme için JSON döndür:\n{"updates": [{"id": "...", "name": "...", "new_quantity": 0}], "summary": "..."}`,
        response_json_schema: {
          type: 'object',
          properties: {
            updates: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, new_quantity: { type: 'number' } } } },
            summary: { type: 'string' }
          }
        }
      });
      if (res.updates?.length > 0) {
        await Promise.all(res.updates.map(u => base44.entities.Inventory.update(u.id, { current_quantity: u.new_quantity, last_updated_by_ai: new Date().toISOString() })));
        qc.invalidateQueries({ queryKey: ['inventory', tenant?.tenant_id] });
        setAiReply(res.summary || `${res.updates.length} malzeme güncellendi`);
        toast.success('Stok güncellendi');
      } else {
        setAiReply(res.summary || 'Güncellenecek malzeme bulunamadı');
      }
    } catch (e) {
      toast.error('AI hatası: ' + e.message);
    }
    setAiLoading(false);
    setAiMsg('');
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="text-primary" /> Stok Yönetimi</h1>
            <div className="flex gap-3 mt-1">
              {outCount > 0 && <span className="text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {outCount} bitti</span>}
              {lowCount > 0 && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {lowCount} azalıyor</span>}
              <span className="text-xs text-muted-foreground">{items.length} malzeme</span>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1 rounded-xl"><Plus className="w-4 h-4" /> Stok Ekle</Button>
        </div>

        {/* AI Stok Asistanı */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">AI Stok Asistanı</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Doğal dille güncelle: "salam bitti", "tavuktan 3 kg aldım"</p>
          {aiReply && <div className="text-sm bg-card rounded-lg p-3 mb-3 border border-primary/20 text-primary">{aiReply}</div>}
          <div className="flex gap-2">
            <Input
              value={aiMsg}
              onChange={e => setAiMsg(e.target.value)}
              placeholder="Stok durumunu anlat..."
              className="flex-1 h-9 text-sm rounded-xl"
              onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
              disabled={aiLoading}
            />
            <Button size="sm" onClick={sendAiMessage} disabled={aiLoading || !aiMsg.trim()} className="rounded-xl gap-1 px-4">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        {/* Tablo */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Malzeme</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Kategori</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Miktar</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Eşik</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground">Durum</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => {
                    const status = stockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{item.category}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.current_quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.low_stock_threshold}</td>
                        <td className="px-4 py-3 text-center">
                          {status === 'ok' && <span className="inline-flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Yeterli</span>}
                          {status === 'low' && <span className="inline-flex items-center gap-1 text-amber-600 text-xs"><AlertTriangle className="w-3.5 h-3.5" /> Az</span>}
                          {status === 'out' && <span className="inline-flex items-center gap-1 text-red-600 text-xs"><XCircle className="w-3.5 h-3.5" /> Bitti</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>Sil</Button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Henüz malzeme eklenmemiş</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <AddInventoryDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          tenantId={tenant?.tenant_id}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['inventory', tenant?.tenant_id] }); setShowAdd(false); }}
        />
      </div>
    </ScrollArea>
  );
}

function AddInventoryDialog({ open, onClose, tenantId, onSaved }) {
  const [form, setForm] = useState({ name: '', unit: 'adet', category: 'other', current_quantity: 0, low_stock_threshold: 5, supplier_name: '', supplier_phone: '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Malzeme adı gerekli');
    setSaving(true);
    await base44.entities.Inventory.create({ ...form, tenant_id: tenantId, current_quantity: Number(form.current_quantity), low_stock_threshold: Number(form.low_stock_threshold) });
    toast.success('Malzeme eklendi');
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yeni Malzeme Ekle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Malzeme Adı</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Birim</Label>
              <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['kg','litre','adet','kutu','paket'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['meat','vegetable','dairy','dough','drink','sauce','spice','packaging','other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Mevcut Miktar</Label><Input type="number" value={form.current_quantity} onChange={e => setForm(p => ({ ...p, current_quantity: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs">Uyarı Eşiği</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm(p => ({ ...p, low_stock_threshold: e.target.value }))} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Tedarikçi</Label><Input value={form.supplier_name} onChange={e => setForm(p => ({ ...p, supplier_name: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs">Tedarikçi Tel</Label><Input value={form.supplier_phone} onChange={e => setForm(p => ({ ...p, supplier_phone: e.target.value }))} className="mt-1" /></div>
          </div>
          <Button className="w-full mt-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kaydet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}