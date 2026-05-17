import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, MessageSquare, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [filterRating, setFilterRating] = useState('all');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', tenant?.tenant_id],
    queryFn: () => base44.entities.Review.filter({ tenant_id: tenant.tenant_id }, '-created_date', 100),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
  });

  const filtered = reviews.filter(r => {
    if (filterRating === 'positive') return r.rating >= 4;
    if (filterRating === 'negative') return r.rating <= 3;
    return true;
  });

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;

  async function submitReply() {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    await base44.entities.Review.update(replyTarget.id, { responded_by_owner: true, owner_response: replyText });
    qc.invalidateQueries({ queryKey: ['reviews', tenant?.tenant_id] });
    toast.success('Yanıt gönderildi');
    setReplyTarget(null);
    setReplyText('');
    setReplyLoading(false);
  }

  function generateReviewLink(orderId) {
    const link = `${window.location.origin}/review?t=${tenant?.tenant_id}&o=${orderId || 'general'}`;
    navigator.clipboard.writeText(link);
    toast.success('Link kopyalandı!');
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="text-amber-400 fill-amber-400" /> Yorumlar</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xl font-bold">{avgRating}</span>
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-sm text-muted-foreground">{reviews.length} yorum</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 rounded-xl" onClick={() => generateReviewLink('')}>
            <ExternalLink className="w-3.5 h-3.5" /> Yorum Linki Oluştur
          </Button>
        </div>

        {/* Filtreler */}
        <div className="flex gap-2">
          {[['all','Tümü'], ['positive','Olumlu (4-5★)'], ['negative','Olumsuz (1-3★)']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterRating(v)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${filterRating === v ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

        {!isLoading && filtered.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">Henüz yorum yok</Card>
        )}

        <div className="space-y-3">
          {filtered.map(review => {
            const positive = review.rating >= 4;
            return (
              <Card key={review.id} className={`p-4 border-l-4 ${positive ? 'border-green-500/40' : 'border-red-500/40'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StarRating rating={review.rating} />
                      <Badge variant="outline" className="text-[10px]">{review.source}</Badge>
                      {review.redirected_to_public && <Badge className="text-[10px] bg-blue-500/20 text-blue-700 border-0">Google'a yönlendirildi</Badge>}
                    </div>
                    {review.comment && <p className="text-sm">{review.comment}</p>}
                    {review.owner_response && (
                      <div className="mt-2 bg-muted/50 rounded-lg p-2.5 text-xs text-muted-foreground">
                        <span className="font-semibold">İşletme yanıtı:</span> {review.owner_response}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {review.created_date ? format(new Date(review.created_date), 'dd.MM.yyyy HH:mm') : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!positive && !review.responded_by_owner && (
                      <Button size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-xs" onClick={() => { setReplyTarget(review); setReplyText(''); }}>
                        <MessageSquare className="w-3.5 h-3.5" /> Yanıtla
                      </Button>
                    )}
                    {positive && (
                      <Button size="sm" variant="ghost" className="rounded-xl gap-1 h-8 text-xs" onClick={() => generateReviewLink(review.order_id)}>
                        <ExternalLink className="w-3.5 h-3.5" /> Link Oluştur
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!replyTarget} onOpenChange={() => setReplyTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yoruma Yanıt Ver</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {replyTarget && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <StarRating rating={replyTarget.rating} />
                <p className="mt-1 text-muted-foreground">{replyTarget.comment || '(Yorum yok)'}</p>
              </div>
            )}
            <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Yanıtınızı yazın..." rows={4} />
            <Button className="w-full" onClick={submitReply} disabled={replyLoading || !replyText.trim()}>
              {replyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yanıt Gönder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}