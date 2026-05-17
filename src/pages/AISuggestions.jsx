import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lightbulb, CheckCircle, X, TrendingUp, Loader2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  discount: { label: 'İndirim', color: 'bg-blue-500/20 text-blue-700' },
  bundle: { label: 'Paket', color: 'bg-purple-500/20 text-purple-700' },
  happy_hour: { label: 'Happy Hour', color: 'bg-amber-500/20 text-amber-700' },
  loyalty_reward: { label: 'Sadakat', color: 'bg-green-500/20 text-green-700' },
  social_post: { label: 'Sosyal Medya', color: 'bg-pink-500/20 text-pink-700' },
  whatsapp_campaign: { label: 'WhatsApp', color: 'bg-emerald-500/20 text-emerald-700' },
};

const CHANNEL_LABELS = {
  wix: 'Wix', instagram: 'Instagram', whatsapp: 'WhatsApp',
  sms_to_customers: 'SMS', qr_menu: 'QR Menü', pos_screen: 'POS Ekran',
};

export default function AISuggestions() {
  const { tenant } = useTenant();
  const qc = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['campaign-suggestions', tenant?.tenant_id],
    queryFn: () => base44.entities.CampaignSuggestion.filter({ tenant_id: tenant.tenant_id }, '-created_date', 50),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampaignSuggestion.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-suggestions', tenant?.tenant_id] }),
  });

  const pending = suggestions.filter(s => !s.approved && !s._rejected);
  const approved = suggestions.filter(s => s.approved);

  async function approve(s) {
    await updateMutation.mutateAsync({ id: s.id, data: { approved: true, executed_at: new Date().toISOString() } });
    toast.success('Öneri onaylandı ve uygulandı!');
  }

  async function reject(s) {
    await base44.entities.CampaignSuggestion.delete(s.id);
    qc.invalidateQueries({ queryKey: ['campaign-suggestions', tenant?.tenant_id] });
    toast.success('Öneri reddedildi');
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 pb-12">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">AI Önerileri</h1>
            <p className="text-sm text-muted-foreground">{pending.length} bekleyen öneri</p>
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Bekleyen ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Geçmiş ({approved.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-3">
            {pending.length === 0 && (
              <Card className="p-12 text-center">
                <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">Bekleyen öneri yok</p>
              </Card>
            )}
            {pending.map(s => <SuggestionCard key={s.id} s={s} onApprove={approve} onReject={reject} />)}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3 mt-3">
            {approved.length === 0 && (
              <Card className="p-12 text-center text-muted-foreground">Henüz onaylanan öneri yok</Card>
            )}
            {approved.map(s => (
              <Card key={s.id} className="p-4 border-green-500/20 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.reasoning}</p>
                    {s.executed_at && (
                      <p className="text-xs text-green-600 mt-1">✓ {format(new Date(s.executed_at), 'dd.MM.yyyy HH:mm')} tarihinde uygulandı</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

function SuggestionCard({ s, onApprove, onReject }) {
  const cfg = TYPE_CONFIG[s.suggestion_type] || { label: s.suggestion_type, color: 'bg-secondary text-secondary-foreground' };
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Megaphone className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">{s.title}</h3>
          <Badge className={`text-[10px] ${cfg.color} border-0`}>{cfg.label}</Badge>
        </div>
        {s.expected_revenue_impact > 0 && (
          <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            +€{s.expected_revenue_impact?.toFixed(0)}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{s.reasoning}</p>

      {s.channels?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {s.channels.map(c => (
            <span key={c} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">{CHANNEL_LABELS[c] || c}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="gap-1 rounded-xl flex-1" onClick={() => onApprove(s)}>
          <CheckCircle className="w-3.5 h-3.5" /> Onayla ve Uygula
        </Button>
        <Button size="sm" variant="outline" className="gap-1 rounded-xl" onClick={() => onReject(s)}>
          <X className="w-3.5 h-3.5" /> Reddet
        </Button>
      </div>
    </Card>
  );
}