import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Volume2, Upload, Play, Trash2, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';

// Her sipariş kaynağı için özel ses dosyası yüklenir.
// user.notification_sounds = { source_key: { url, name } }
// user.notification_repeat = saniye (15 default)
// user.notification_enabled = true/false
const SOURCES = [
  { key: 'pos_dine_in',  label: 'Masa (POS)',     icon: '🍽️', defaultDesc: 'Tabletten gelen siparişler' },
  { key: 'pos_takeaway', label: 'Gel-Al (POS)',   icon: '🥡', defaultDesc: 'POS gel-al siparişleri' },
  { key: 'ai_phone',     label: 'AI Telefon',     icon: '📞', defaultDesc: 'Telefon AI üzerinden gelen siparişler' },
  { key: 'wix',          label: 'Wix',            icon: '🌐', defaultDesc: 'Wix sitesinden' },
  { key: 'takeaway_com', label: 'Takeaway.com',   icon: '🛵', defaultDesc: 'Takeaway.com platformundan' },
  { key: 'uber_eats',    label: 'Uber Eats',      icon: '🚴', defaultDesc: 'Uber Eats platformundan' },
];

export default function NotificationSounds({ user, onChanged }) {
  const sounds = user?.notification_sounds || {};
  const enabled = user?.notification_enabled ?? true;
  const repeatInterval = user?.notification_repeat ?? 15;
  const [saving, setSaving] = useState(false);
  const [interval, setInterval] = useState(repeatInterval);

  async function setEnabled(v) {
    await base44.auth.updateMe({ notification_enabled: v });
    toast.success(v ? 'Bildirimler aktif' : 'Bildirimler kapalı');
    onChanged?.();
  }

  async function saveInterval() {
    setSaving(true);
    await base44.auth.updateMe({ notification_repeat: parseInt(interval) || 15 });
    toast.success('Tekrar süresi kaydedildi');
    setSaving(false);
    onChanged?.();
  }

  async function setSourceSound(sourceKey, sound) {
    const next = { ...sounds, [sourceKey]: sound };
    await base44.auth.updateMe({ notification_sounds: next });
    onChanged?.();
  }

  async function clearSourceSound(sourceKey) {
    const next = { ...sounds };
    delete next[sourceKey];
    await base44.auth.updateMe({ notification_sounds: next });
    onChanged?.();
    toast.success('Ses kaldırıldı');
  }

  return (
    <div className="space-y-4">
      {/* Genel ayarlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Bildirim Ayarları
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Yeni sipariş geldiğinde ses çalar ve kabul edilene kadar tekrar eder.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
            <div>
              <p className="font-medium text-sm">Sesli Bildirimler</p>
              <p className="text-xs text-muted-foreground">Yeni sipariş geldiğinde ses çal</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Tekrar süresi (saniye)</Label>
              <Input
                type="number" min="5" max="120"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="h-9 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Sipariş kabul edilene kadar bu aralıkta tekrar çalar.
              </p>
            </div>
            <Button size="sm" onClick={saveInterval} disabled={saving} className="rounded-xl gap-1">
              <Save className="h-3.5 w-3.5" /> Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kaynak başına ses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4" /> Kaynak Başına Bildirim Sesi
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Her sipariş türü için farklı bir ses yükleyin. MP3 / WAV / OGG formatları desteklenir (max 1MB).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {SOURCES.map((s) => (
            <SourceRow
              key={s.key}
              source={s}
              sound={sounds[s.key]}
              onUpload={(sound) => setSourceSound(s.key, sound)}
              onClear={() => clearSourceSound(s.key)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceRow({ source, sound, onUpload, onClear }) {
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('Dosya 1MB\'dan büyük olamaz');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpload({ url: file_url, name: file.name });
      toast.success(`${source.label} sesi yüklendi`);
    } catch (err) {
      toast.error('Yükleme başarısız: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
      <span className="text-2xl shrink-0">{source.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{source.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {sound?.name ? `🎵 ${sound.name}` : source.defaultDesc}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex gap-1 shrink-0">
        {sound?.url && (
          <Button
            size="icon" variant="ghost" className="h-8 w-8"
            onClick={() => { audioRef.current?.play().catch(() => toast.error('Ses çalınamadı')); }}
            title="Çal"
          >
            <Play className="h-3.5 w-3.5" />
            <audio ref={audioRef} src={sound.url} preload="auto" />
          </Button>
        )}
        <Button
          size="icon" variant="ghost" className="h-8 w-8"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          title="Yükle"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
        {sound?.url && (
          <Button
            size="icon" variant="ghost" className="h-8 w-8 text-destructive"
            onClick={onClear}
            title="Kaldır"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}