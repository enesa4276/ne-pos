import React, { useEffect, useState } from 'react';
import { KitchenReceipt } from '@/components/pos/ReceiptPrint';
import { useLang } from '@/lib/LanguageContext';

// Programatik yazdırma helper'ı: tek bir siparişi termal'a basar.
// State'i set ettikten sonra window.print() çağırır, ardından temizler.
export default function PrintTrigger({ order, onDone }) {
  const { t } = useLang();
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active || !order) return;
    const timer = setTimeout(() => {
      try { window.print(); } catch (e) { console.warn(e); }
      setActive(false);
      onDone?.();
    }, 100);
    return () => clearTimeout(timer);
  }, [active, order, onDone]);

  if (!active || !order) return null;
  return <KitchenReceipt order={order} t={t} />;
}