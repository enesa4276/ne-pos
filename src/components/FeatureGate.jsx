import React from 'react';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, Mail } from 'lucide-react';
import { FEATURES } from '@/lib/features';

// Feature kapalıyken çocuğu bulanık olarak arkada gösterir,
// üzerinde cazip bir "kilitli" overlay sunar.
export function FeatureGate({ feature, children, fallback = null }) {
  const { hasFeature, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const info = FEATURES[feature];
  if (!info) return fallback;

  return (
    <div className="relative w-full min-h-[60vh]">
      {/* Arka plan: gerçek içeriği bulanık ve etkileşimsiz göster */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-md opacity-40 saturate-50"
        style={{ filter: 'blur(8px)' }}
      >
        {children}
      </div>

      {/* Üstte cazip overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-b from-background/40 via-background/70 to-background/90 backdrop-blur-[2px]">
        <Card className="max-w-md w-full p-6 md:p-8 text-center border-2 border-primary/40 shadow-2xl bg-card/95">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/20 mb-3 relative">
            <Lock className="w-7 h-7 text-primary" />
            <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>

          <div className="text-3xl mb-2">{info.icon}</div>
          <h3 className="text-xl font-black mb-1">{info.name}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Bu özellik paketinize dahil değil
          </p>

          <p className="text-sm text-foreground/90 leading-relaxed mb-2 font-medium">
            {info.teaser}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {info.description}
          </p>

          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-primary/5 rounded-xl">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-2xl font-black text-primary">{info.price}</span>
          </div>

          <Button
            size="lg"
            className="gap-2 w-full rounded-xl"
            onClick={() => window.open(`mailto:support@nepos.app?subject=Özellik Talebi: ${info.name}`, '_blank')}
          >
            <Mail className="w-4 h-4" />
            Bu Özelliği Aktifleştir
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">
            Tek tıkla aktivasyon — destek ekibimiz 1 iş günü içinde devreye alır.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default FeatureGate;