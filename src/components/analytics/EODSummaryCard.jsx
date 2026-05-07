import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EODSummaryCard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('endOfDaySummary', {});
      if (res?.data?.error) {
        toast.error(res.data.error);
      } else {
        setSummary(res?.data);
      }
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-primary/10 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" /> AI Gün Sonu Özeti
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!summary && (
          <Button onClick={generate} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Bugünün AI Özetini Üret
          </Button>
        )}
        {summary && (
          <div className="space-y-3">
            <div className="bg-card/70 backdrop-blur-sm rounded-xl p-3">
              <p className="text-sm whitespace-pre-line leading-relaxed">{summary.summary}</p>
            </div>
            {summary.stats && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-card/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Sipariş</p>
                  <p className="font-black">{summary.stats.count}</p>
                </div>
                <div className="bg-card/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Ciro</p>
                  <p className="font-black text-primary">€{summary.stats.revenue}</p>
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="w-full rounded-xl">
              {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Yenile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}