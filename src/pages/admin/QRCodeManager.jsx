import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Printer, Copy, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner';

// Basit Google Charts QR API kullanır (kütüphane gerektirmez)
function qrUrl(text, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

export default function QRCodeManager() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [copiedId, setCopiedId] = useState(null);
  const printRef = useRef(null);

  const tenantId = tenant?.tenant_id;

  const { data: tables = [], isLoading: loading } = useQuery({
    queryKey: ['qr-tables', tenantId],
    queryFn: () => base44.entities.RestaurantTable.filter({ tenant_id: tenantId }, 'name'),
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const buildLink = (tableId) => `${window.location.origin}/qr/${tenant?.tenant_id}/${tableId}`;

  const copyLink = (tableId) => {
    const link = buildLink(tableId);
    navigator.clipboard.writeText(link);
    setCopiedId(tableId);
    toast.success('Link kopyalandı');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const printAll = () => {
    window.print();
  };

  if (tenantLoading || loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!tenant) {
    return <div className="p-6 text-center text-muted-foreground">Tenant bulunamadı.</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode className="text-primary" /> QR Menü Kodları</h1>
            <p className="text-sm text-muted-foreground mt-1">Her masa için benzersiz QR kodu. Müşteriler okuttuğunda menüye erişebilir.</p>
          </div>
          <Button onClick={printAll} variant="outline" className="rounded-xl">
            <Printer className="w-4 h-4 mr-2" /> Tümünü Yazdır
          </Button>
        </div>

        {tables.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Henüz masa yok. Önce Admin → Masalar bölümünden masa ekleyin.</Card>
        ) : (
          <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3">
            {tables.map((t) => (
              <Card key={t.id} className="p-4 flex flex-col items-center gap-2 print:break-inside-avoid">
                <div className="font-bold text-lg">{t.name}</div>
                <img src={qrUrl(buildLink(t.id))} alt={`QR ${t.name}`} className="w-40 h-40 rounded-lg" />
                <p className="text-xs text-muted-foreground text-center font-bold">{tenant.company_name}</p>
                <Button size="sm" variant="outline" className="w-full print:hidden rounded-lg" onClick={() => copyLink(t.id)}>
                  {copiedId === t.id ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                  Linki Kopyala
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}