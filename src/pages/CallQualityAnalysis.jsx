import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PhoneCall, Star, AlertCircle, Loader2, Brain } from 'lucide-react';
import { format } from 'date-fns';

function ScoreBadge({ score }) {
  const color = score >= 8 ? 'bg-green-500/20 text-green-700' : score >= 5 ? 'bg-amber-500/20 text-amber-700' : 'bg-red-500/20 text-red-700';
  return <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}><Star className="w-3 h-3" />{score}/10</span>;
}

export default function CallQualityAnalysis() {
  const { tenant } = useTenant();
  const [selected, setSelected] = useState(null);

  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['call-quality', tenant?.tenant_id],
    queryFn: () => base44.entities.CallQualityScore.filter({ tenant_id: tenant.tenant_id }, '-created_date', 50),
    enabled: !!tenant?.tenant_id,
    staleTime: 0,
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['phone-calls-quality', tenant?.tenant_id],
    queryFn: () => base44.entities.PhoneCall.filter({ tenant_id: tenant.tenant_id }, '-created_date', 50),
    enabled: !!tenant?.tenant_id,
  });

  const callMap = Object.fromEntries(calls.map(c => [c.id, c]));

  const avgScore = scores.length ? (scores.reduce((s, c) => s + (c.overall_score || 0), 0) / scores.length).toFixed(1) : 0;

  const trendData = [...scores].reverse().map((s, i) => ({
    idx: i + 1,
    skor: s.overall_score,
    tarih: s.created_date ? format(new Date(s.created_date), 'dd.MM') : ''
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-12">
        <h1 className="text-2xl font-bold flex items-center gap-2"><PhoneCall className="text-primary" /> Çağrı Kalite Analizi</h1>

        {/* Özet */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Ort. Skor</p><p className="text-2xl font-bold text-primary">{avgScore}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Toplam Çağrı</p><p className="text-2xl font-bold">{scores.length}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Halüsinasyon</p><p className="text-2xl font-bold text-red-500">{scores.filter(s => s.hallucination_detected).length}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Düşük Skor (&lt;5)</p><p className="text-2xl font-bold text-amber-500">{scores.filter(s => s.overall_score < 5).length}</p></Card>
        </div>

        {/* Trend */}
        {trendData.length > 1 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Skor Trendi</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <XAxis dataKey="tarih" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="skor" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Liste */}
        {scoresLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {scores.map(score => {
              const call = callMap[score.phone_call_id];
              return (
                <Card key={score.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected({ score, call })}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <ScoreBadge score={score.overall_score} />
                        {score.hallucination_detected && <Badge className="text-[10px] bg-red-500/20 text-red-700 border-0">⚠️ Halüsinasyon</Badge>}
                        {call && <span className="text-xs text-muted-foreground">{call.from_number}</span>}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>Memnuniyet: {score.customer_satisfaction}/10</span>
                        <span>Sipariş: {score.order_completeness}/10</span>
                        <span>Ses: {score.voice_clarity}/10</span>
                        <span>Hız: {score.response_speed}/10</span>
                      </div>
                      {score.issues?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {score.issues.slice(0, 2).map((issue, i) => (
                            <span key={i} className="text-[10px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full">{issue}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {score.created_date ? format(new Date(score.created_date), 'dd.MM.yyyy HH:mm') : ''}
                    </span>
                  </div>
                </Card>
              );
            })}
            {scores.length === 0 && <Card className="p-12 text-center text-muted-foreground">Henüz kalite skoru yok</Card>}
          </div>
        )}
      </div>

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Çağrı Detayı</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[['Genel', selected.score.overall_score],['Memnuniyet', selected.score.customer_satisfaction],['Sipariş', selected.score.order_completeness],['Ses', selected.score.voice_clarity],['Hız', selected.score.response_speed]].map(([l,v]) => (
                  <div key={l} className="bg-muted/50 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">{l}</p><p className="font-bold">{v}/10</p></div>
                ))}
              </div>
              {selected.score.issues?.length > 0 && (
                <div><p className="text-xs font-semibold mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Sorunlar</p>
                  <ul className="space-y-1">{selected.score.issues.map((i, idx) => <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-amber-500">•</span>{i}</li>)}</ul>
                </div>
              )}
              {selected.score.improvements_suggested && (
                <div className="bg-blue-500/5 rounded-lg p-3"><p className="text-xs font-semibold mb-1">Önerilen İyileştirme</p><p className="text-xs text-muted-foreground">{selected.score.improvements_suggested}</p></div>
              )}
              {selected.score.ai_self_evaluation && (
                <div className="bg-primary/5 rounded-lg p-3"><p className="text-xs font-semibold mb-1 flex items-center gap-1"><Brain className="w-3.5 h-3.5 text-primary" /> AI Öz Değerlendirmesi</p><p className="text-xs text-muted-foreground">{selected.score.ai_self_evaluation}</p></div>
              )}
              {selected.call?.transcript?.length > 0 && (
                <div><p className="text-xs font-semibold mb-1">Transkript</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selected.call.transcript.map((t, i) => (
                      <div key={i} className={`text-xs p-2 rounded-lg ${t.speaker === 'ai' ? 'bg-primary/10 ml-6' : 'bg-muted mr-6'}`}>
                        <span className="font-semibold capitalize">{t.speaker}:</span> {t.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ScrollArea>
  );
}