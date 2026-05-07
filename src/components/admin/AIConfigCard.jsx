import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AI_FEATURES } from '@/lib/aiFeatures';
import { Pencil, Trash2, Key } from 'lucide-react';

export default function AIConfigCard({ config, tenantName, onEdit, onDelete, onToggle }) {
  const feature = AI_FEATURES[config.ai_feature] || { label: config.ai_feature, icon: '⚙️' };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">{feature.icon}</span>
            <h3 className="font-bold truncate">{feature.label}</h3>
            <Badge variant="outline">{config.ai_provider}</Badge>
            {!config.is_active && <Badge variant="secondary">Pasif</Badge>}
          </div>
          <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
            <div>🏢 <span className="font-medium">{tenantName}</span></div>
            <div className="font-mono text-xs">📦 {config.model_name}</div>
            <div className="flex items-center gap-1 text-xs">
              <Key className="h-3 w-3" /> <span className="font-mono">{config.secret_name}</span>
            </div>
            {config.notes && <div className="text-xs italic">📝 {config.notes}</div>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Switch checked={config.is_active} onCheckedChange={(c) => onToggle(config, c)} />
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(config)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(config)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-muted-foreground border-t pt-2">
        <span>🌡️ Temp: <span className="font-mono">{config.temperature ?? '-'}</span></span>
        <span>🎯 Max Tokens: <span className="font-mono">{config.max_tokens ?? '-'}</span></span>
      </div>
    </Card>
  );
}