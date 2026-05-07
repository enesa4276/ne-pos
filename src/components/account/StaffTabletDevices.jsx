import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tablet as TabletIcon, Copy, Check, ExternalLink, Users } from 'lucide-react';
import { toast } from 'sonner';

function qrUrl(text, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

// Her personele özel tablet linki + QR. Personel listesi `Hesap → Personel` sekmesinden gelir.
export default function StaffTabletDevices() {
  const { data: user } = useCurrentUser();
  const [copied, setCopied] = useState(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', user?.email],
    queryFn: () => base44.entities.Staff.filter({ created_by: user?.email }, 'name').catch(() => []),
    enabled: !!user?.email,
  });

  const buildLink = (staffId) => `${window.location.origin}/tablet?staffId=${staffId}`;
  const buildLinkGeneric = () => `${window.location.origin}/tablet`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Kopyalandı');
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TabletIcon className="h-4 w-4 text-primary" /> Tablet Cihazları (Personele Özel)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
            Her personele özel tablet linki ve QR kod. Tableti açtığınızda link otomatik o personelle eşleşir; tüm
            siparişlere o garson işlenir ve geçmişte filtrelenebilir.
          </div>

          <div className="bg-card border border-dashed border-primary/40 rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-bold">Genel Tablet (Personelsiz)</p>
              <code className="text-xs break-all">{buildLinkGeneric()}</code>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => copy(buildLinkGeneric(), 'generic')}>
                {copied === 'generic' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => window.open(buildLinkGeneric(), '_blank')}>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Personel Tabletleri ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Yükleniyor…</p>
          ) : staff.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Önce <strong>Personel</strong> sekmesinden personel ekleyin.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {staff.map((s) => {
                const link = buildLink(s.id);
                return (
                  <div key={s.id} className="bg-secondary/30 rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
                    <p className="font-bold text-base">{s.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.role}</p>
                    <img src={qrUrl(link)} alt={`QR ${s.name}`} className="w-32 h-32 rounded-xl bg-white p-1" />
                    <code className="text-[10px] text-muted-foreground break-all w-full">{link}</code>
                    <div className="flex gap-1 w-full">
                      <Button size="sm" variant="outline" className="rounded-xl flex-1 gap-1" onClick={() => copy(link, s.id)}>
                        {copied === s.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        Kopyala
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl flex-1 gap-1" onClick={() => window.open(link, '_blank')}>
                        <ExternalLink className="w-3 h-3" /> Aç
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}