import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Store, Globe, Copy, Check, Save, Key } from 'lucide-react';

export default function MenuproIntegration({ value, onChange, onSave, saving, origin }) {
  const [copied, setCopied] = useState(false);
  const url = `${origin}/functions/menuproWebhook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4 text-orange-500" />Menupro Entegrasyonu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="h-3.5 w-3.5" />Webhook URL
          </Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="rounded-xl font-mono text-xs bg-secondary/50" />
            <Button size="icon" variant="outline" className="shrink-0 rounded-xl" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-xs text-orange-700 dark:text-orange-300">
          <p className="font-semibold mb-1">Nasıl kurulur?</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Menupro panelinizden Ayarlar → Webhook bölümüne gidin.</li>
            <li>Yukarıdaki URL'yi "Order Webhook URL" olarak girin.</li>
            <li>Restoran ID'nizi aşağıya yapıştırın.</li>
          </ol>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Store className="h-3.5 w-3.5" />Menupro Restoran ID
          </Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="resto_12345"
            className="rounded-xl"
          />
        </div>

        <Button className="w-full rounded-xl gap-2" onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </CardContent>
    </Card>
  );
}