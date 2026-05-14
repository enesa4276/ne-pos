import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Radio, Phone, Clock, ChevronDown, ChevronUp, Loader2, PhoneOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function LiveCalls() {
  const { tenant, loading: tenantLoading } = useTenant();

  if (tenantLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!tenant) {
    return <div className="p-6 text-center text-muted-foreground">Tenant bulunamadı.</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="text-red-500 animate-pulse" /> Canlı Çağrılar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI telefonun aktif görüşmelerini izleyin ve istediğinizde devralın.
          </p>
        </div>

        <Tabs defaultValue="live">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="live">Canlı</TabsTrigger>
            <TabsTrigger value="history">Geçmiş</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="mt-3">
            <LiveList tenant={tenant} />
          </TabsContent>
          <TabsContent value="history" className="mt-3">
            <HistoryList tenant={tenant} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

function LiveList({ tenant }) {
  const queryClient = useQueryClient();
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['live-calls', tenant.tenant_id],
    queryFn: async () => {
      const all = await base44.entities.PhoneCall.filter({ tenant_id: tenant.tenant_id }, '-created_date', 50);
      return all.filter((c) => c.status === 'in_progress' || c.status === 'ringing');
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (calls.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Şu anda aktif çağrı yok. 10 saniyede bir yenilenir.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map((c) => (
        <LiveCallCard
          key={c.id} call={c} tenant={tenant}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['live-calls'] })}
        />
      ))}
    </div>
  );
}

function LiveCallCard({ call, tenant, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const transcript = call.transcript || [];
  const lastMsg = transcript[transcript.length - 1];
  const started = moment(call.created_date);
  const duration = moment().diff(started, 'seconds');
  const disabled = call.transferred_to_human;

  async function handleTakeover() {
    if (!confirm('Bu çağrıyı devralmak istiyor musunuz?')) return;
    setTakingOver(true);
    try {
      const res = await base44.functions.invoke('callTakeoverExternal', {
        call_sid: call.call_sid,
        tenant_id: tenant.tenant_id,
      });
      if (res.data?.ok) {
        toast.success('Çağrı devralındı');
        onChanged?.();
      } else {
        toast.error(res.data?.error || 'Devralma başarısız');
      }
    } catch (e) {
      toast.error('Hata: ' + e.message);
    }
    setTakingOver(false);
  }

  return (
    <Card className={`p-3 border-2 ${disabled ? 'opacity-60 border-border' : 'border-red-500/40 bg-red-500/5'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <Phone className="w-4 h-4 text-red-600" />
            <span className="font-mono font-bold">{call.from_number}</span>
            <Badge variant="outline" className="text-[10px]">{call.status}</Badge>
            {disabled && <Badge variant="secondary" className="text-[10px]">Devralındı</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{duration}s</span>
            <span>·</span>
            <span>{started.format('HH:mm:ss')}</span>
          </div>
          {lastMsg && (
            <div className="mt-2 text-xs bg-card rounded-lg px-2 py-1.5 border">
              <span className="font-semibold text-[10px] uppercase opacity-60">{lastMsg.speaker === 'customer' ? 'Müşteri' : 'AI'}: </span>
              <span className="break-words">{lastMsg.text}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            variant="destructive" size="sm"
            onClick={handleTakeover}
            disabled={disabled || takingOver}
            className="rounded-xl gap-1"
          >
            {takingOver ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
            Çağrıyı Devral
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="rounded-xl">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Transcript
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-1.5 max-h-72 overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Henüz mesaj yok.</p>
          ) : (
            transcript.map((m, i) => (
              <div key={i} className={`text-xs flex gap-2 ${m.speaker === 'customer' ? '' : 'flex-row-reverse text-right'}`}>
                <div className={`max-w-[80%] rounded-lg px-2 py-1 ${m.speaker === 'customer' ? 'bg-secondary' : 'bg-purple-500/10'}`}>
                  <p className="text-[9px] uppercase font-bold opacity-60">{m.speaker === 'customer' ? 'Müşteri' : 'AI'}</p>
                  <p className="break-words">{m.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}

function HistoryList({ tenant }) {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['history-calls', tenant.tenant_id],
    queryFn: async () => {
      const all = await base44.entities.PhoneCall.filter({ tenant_id: tenant.tenant_id }, '-created_date', 100);
      return all.filter((c) => c.status === 'completed' || c.status === 'transferred_to_human');
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (calls.length === 0) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Henüz geçmiş çağrı yok.</Card>;
  }

  return (
    <div className="space-y-2">
      {calls.map((c) => (
        <Card key={c.id} className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono text-sm">{c.from_number}</span>
              <Badge variant={c.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                {c.status === 'transferred_to_human' ? 'Devralındı' : 'Tamamlandı'}
              </Badge>
              <span className="text-xs text-muted-foreground">{c.duration_seconds || 0}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{moment(c.created_date).format('DD.MM HH:mm')}</span>
              {c.order_id && (
                <Link to={`/orders?id=${c.order_id}`}>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1 h-7 text-[11px]">
                    <ExternalLink className="w-3 h-3" /> Sipariş
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}