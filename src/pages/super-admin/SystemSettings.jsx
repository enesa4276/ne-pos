import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2, Eye, EyeOff, Save, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Süper admin'e özel global sistem ayarları sayfası.
// SystemConfig kayıtlarını listeler, value alanını düzenlenebilir yapar.
// is_secret=true olanlar password gibi maskeli gösterilir (göster/gizle).
export default function SystemSettings() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['system-configs'],
    queryFn: () => base44.entities.SystemConfig.list('key'),
    enabled: !!user?.is_super_admin,
  });

  if (userLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user?.is_super_admin) {
    return (
      <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
        <Lock className="w-8 h-8" />
        <p>Bu sayfaya yalnızca süper admin erişebilir.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 pb-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="text-primary" /> Sistem Ayarları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tüm restoranları etkileyen global ayarlar. Yalnızca süper admin erişebilir.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : configs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Henüz sistem ayarı tanımlanmamış.
          </Card>
        ) : (
          <div className="space-y-2">
            {configs.map((cfg) => (
              <SystemConfigRow
                key={cfg.id}
                config={cfg}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['system-configs'] })}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function SystemConfigRow({ config, onSaved }) {
  const [value, setValue] = useState(config.value || '');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = value !== (config.value || '');

  async function handleSave() {
    setSaving(true);
    try {
      await base44.entities.SystemConfig.update(config.id, { value });
      toast.success(`${config.key} güncellendi`);
      onSaved?.();
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message);
    }
    setSaving(false);
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm font-bold">{config.key}</code>
            {config.is_secret && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Lock className="w-2.5 h-2.5" /> Gizli
              </Badge>
            )}
          </div>
          {config.description && (
            <p className="text-[11px] text-muted-foreground mt-1">{config.description}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={config.is_secret && !show ? 'password' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Değer"
            className={`h-9 text-sm ${config.is_secret ? 'font-mono pr-9' : ''}`}
          />
          {config.is_secret && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? 'Gizle' : 'Göster'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-9 rounded-xl gap-1 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </Card>
  );
}