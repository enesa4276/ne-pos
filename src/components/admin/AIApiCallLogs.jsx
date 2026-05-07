import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, CheckCircle2, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { AI_FEATURES_LABELS } from '@/lib/aiFeatures';

const STATUS_STYLES = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/40', label: 'Başarılı' },
  fallback_success: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/40', label: 'Fallback' },
  failed: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/40', label: 'Hata' },
};

// AI API çağrı logları — son 200 kayıt; debug için tablo görünümü.
export default function AIApiCallLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await base44.entities.AIApiCallLog.list('-created_date', 200);
      setLogs(data || []);
    } catch (e) {
      // sessizce fail — boş liste
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = statusFilter === 'all' ? logs : logs.filter((l) => l.status === statusFilter);

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === 'success').length,
    fallback: logs.filter((l) => l.status === 'fallback_success').length,
    failed: logs.filter((l) => l.status === 'failed').length,
  };

  return (
    <div className="space-y-3">
      {/* özet */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Toplam" value={stats.total} />
        <StatCard label="Başarılı" value={stats.success} color="text-emerald-600" />
        <StatCard label="Fallback" value={stats.fallback} color="text-amber-600" />
        <StatCard label="Hata" value={stats.failed} color="text-red-600" />
      </div>

      {/* kontroller */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="success">Sadece Başarılı</SelectItem>
            <SelectItem value="fallback_success">Sadece Fallback</SelectItem>
            <SelectItem value="failed">Sadece Hata</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={load} className="h-8 rounded-xl gap-1" disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">Son 200 çağrı gösteriliyor</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Bu filtre için kayıt yok.
        </Card>
      )}

      <div className="space-y-1.5">
        {filtered.map((log) => {
          const s = STATUS_STYLES[log.status] || STATUS_STYLES.success;
          const Icon = s.icon;
          const isOpen = expanded === log.id;
          const date = log.created_date ? new Date(log.created_date) : null;
          return (
            <Card key={log.id} className={`p-3 border ${s.bg}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : log.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                    <Badge variant="outline" className="text-[10px]">{s.label}</Badge>
                    <span className="font-mono text-xs truncate">{log.ai_provider} · {log.model_name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {AI_FEATURES_LABELS?.[log.ai_feature] || log.ai_feature}
                    </Badge>
                    {log.fallback_used && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">FB</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {log.duration_ms}ms</span>
                    {date && <span>{date.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}</span>}
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1 text-[11px]">
                  <Row k="Tenant" v={log.tenant_id} mono />
                  <Row k="Kullanıcı" v={log.user_email || '-'} />
                  <Row k="Tokens" v={`${log.prompt_tokens || 0} → ${log.completion_tokens || 0} (toplam ${log.total_tokens || 0})`} />
                  <Row k="Primary cfg" v={log.primary_config_id} mono />
                  <Row k="Used cfg" v={log.used_config_id} mono />
                  {log.error_message && (
                    <div className="mt-1 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-600 break-all whitespace-pre-wrap">
                      {log.error_message}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = '' }) {
  return (
    <Card className="p-2.5 text-center">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </Card>
  );
}

function Row({ k, v, mono = false }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-20 shrink-0">{k}:</span>
      <span className={mono ? 'font-mono break-all' : 'break-all'}>{v}</span>
    </div>
  );
}