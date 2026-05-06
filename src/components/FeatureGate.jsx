import React from 'react';
import { useTenant } from '@/lib/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { FEATURES } from '@/lib/features';

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
    <Card className="p-8 text-center border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <div className="text-4xl mb-3">{info.icon}</div>
      <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
        {info.name}
        <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">{info.teaser}</p>
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-2xl font-bold text-primary">{info.price}</span>
      </div>
      <Button
        size="lg"
        className="gap-2"
        onClick={() => window.open('mailto:support@nepos.app?subject=Özellik: ' + info.name, '_blank')}
      >
        <Sparkles className="w-4 h-4" />
        Bu Özelliği Aktifleştir
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Bize ulaşın veya admin panelinizden talep edin
      </p>
    </Card>
  );
}

export default FeatureGate;