import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, FlaskConical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Bir AI sağlayıcı/model/secret kombosunu küçük bir prompt ile test eder.
// `provider` prop: { ai_provider, model_name, secret_name, temperature, max_tokens, id? }
export default function AIProviderTestDialog({ open, onOpenChange, provider }) {
  const [prompt, setPrompt] = useState('Merhaba! Kısa bir test cevabı ver.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!provider) return null;

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('aiTestProvider', {
        ai_provider: provider.ai_provider,
        model_name: provider.model_name,
        secret_name: provider.secret_name,
        temperature: provider.temperature,
        max_tokens: provider.max_tokens || 200,
        prompt,
        config_id: provider.id,
      });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success('Test başarılı');
    } catch (e) {
      toast.error('Test hatası: ' + e.message);
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" /> API Test
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="font-bold">{provider.ai_provider}</Badge>
            <span className="font-mono">{provider.model_name}</span>
            <Badge variant="secondary" className="font-mono text-[10px]">{provider.secret_name}</Badge>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Test Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Test mesajı..."
            />
          </div>

          {result && !result.error && (
            <div className="rounded-md border bg-secondary/30 p-3 text-xs space-y-2">
              <div className="font-semibold">Yanıt</div>
              <div className="whitespace-pre-wrap font-mono">{result.text}</div>
              <div className="flex gap-3 text-[11px] text-muted-foreground pt-1 border-t">
                {result.usage && (
                  <>
                    <span>📥 {result.usage.prompt_tokens || 0}</span>
                    <span>📤 {result.usage.completion_tokens || 0}</span>
                    <span>Σ {result.usage.total_tokens || 0}</span>
                  </>
                )}
                {typeof result.latency_ms === 'number' && <span>⏱ {result.latency_ms}ms</span>}
              </div>
            </div>
          )}

          {result?.error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs p-3">
              {result.error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Kapat
          </Button>
          <Button size="sm" onClick={runTest} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Test Et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}