import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, PhoneCall, PhoneOff, User, Bot, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

// Aktif AI aramasının canlı transcript görünümü.
// 2 saniyede bir transcript yenilenir. "Aramayı Al" → twilioCallTakeover.
export default function LiveCallChat({ call, tenant, onClose }) {
  const [data, setData] = useState(call);
  const [taking, setTaking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const fresh = await base44.entities.PhoneCall.get(call.id);
        if (!cancelled) setData(fresh);
      } catch (e) { /* yok */ }
    }
    refresh();
    const t = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [call.id]);

  // En alta scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.transcript?.length]);

  const transcript = data?.transcript || [];
  const isActive = data?.status === 'in_progress' || data?.status === 'ringing';
  const retryCount = data?.ai_retry_count || 0;

  async function takeover() {
    const targetPhone = tenant?.settings?.fallback_phone || tenant?.phone;
    if (!targetPhone) {
      toast.error('Önce Ayarlar → Restoran Bilgileri\'nden telefon numarası ekleyin.');
      return;
    }
    if (!confirm(`Arama ${targetPhone} numarasına aktarılacak. Devam edilsin mi?`)) return;

    setTaking(true);
    try {
      const r = await base44.functions.invoke('twilioCallTakeover', {
        call_sid: data.call_sid,
        target_phone: targetPhone,
        reason: 'manual_takeover',
      });
      if (r.data?.ok) {
        toast.success(`Arama ${targetPhone} numarasına aktarıldı`);
        onClose?.();
      } else {
        toast.error(r.data?.error || 'Aktarım başarısız');
      }
    } catch (e) {
      toast.error('Aktarım hatası: ' + e.message);
    }
    setTaking(false);
  }

  return (
    <Card className="overflow-hidden border-2 border-red-500/50 shadow-xl flex flex-col h-full">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <PhoneCall className="h-5 w-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{data.from_number || 'Bilinmeyen'}</p>
          <p className="text-xs opacity-90 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {moment(data.created_date).fromNow()}
          </p>
        </div>
        {isActive && (
          <Badge variant="secondary" className="bg-white/20 border-0 text-white text-[10px]">
            CANLI
          </Badge>
        )}
      </div>

      {/* RETRY UYARISI */}
      {retryCount > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-2 flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          AI {retryCount}/3 kez anlamadı. {retryCount >= 3 && 'Otomatik aktarım yapılıyor...'}
        </div>
      )}

      {/* CHAT */}
      <ScrollArea className="flex-1 min-h-[300px] max-h-[500px]">
        <div ref={scrollRef} className="p-3 space-y-2">
          {transcript.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              {isActive ? '🎙️ Görüşme başlıyor, mesajlar burada görünecek...' : 'Transcript yok.'}
            </div>
          )}
          {transcript.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}
        </div>
      </ScrollArea>

      {/* AKSIYONLAR */}
      <div className="border-t border-border p-3 flex flex-col sm:flex-row gap-2">
        <Button
          variant="destructive"
          className="rounded-xl gap-2 flex-1"
          onClick={takeover}
          disabled={!isActive || taking}
        >
          <Phone className="h-4 w-4" /> {taking ? 'Aktarılıyor…' : 'Aramayı Bana Aktar'}
        </Button>
        <Button variant="outline" className="rounded-xl gap-2 flex-1 sm:flex-none" onClick={onClose}>
          <PhoneOff className="h-4 w-4" /> Kapat
        </Button>
      </div>
    </Card>
  );
}

function ChatBubble({ msg }) {
  const isCustomer = msg.speaker === 'customer';
  return (
    <div className={`flex gap-2 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isCustomer ? 'bg-blue-500/20 text-blue-600' : 'bg-purple-500/20 text-purple-600'
      }`}>
        {isCustomer ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
        isCustomer
          ? 'bg-secondary text-foreground rounded-tl-sm'
          : 'bg-purple-500 text-white rounded-tr-sm'
      }`}>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">
          {isCustomer ? 'Müşteri' : 'AI'}
        </p>
        <p className="break-words">{msg.text}</p>
        {msg.timestamp && (
          <p className="text-[9px] opacity-60 mt-0.5">{moment(msg.timestamp).format('HH:mm:ss')}</p>
        )}
      </div>
    </div>
  );
}