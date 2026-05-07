import React, { useEffect, useState } from 'react';
import { CustomerReceipt } from '@/components/pos/ReceiptPrint';
import { useCurrentUser } from '@/lib/useCurrentUser';

// Programatik yazdırma helper'ı: Anlık sipariş ekranındaki "yazdır" butonuyla
// kullanılır. Hesap → Termal Fiş'te tasarlanan müşteri fişini basar (tek tip).
export default function PrintTrigger({ order, onDone }) {
  const { data: user } = useCurrentUser();
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active || !order) return;
    const timer = setTimeout(() => {
      try { window.print(); } catch (e) { console.warn(e); }
      setActive(false);
      onDone?.();
    }, 200);
    return () => clearTimeout(timer);
  }, [active, order, onDone]);

  if (!active || !order) return null;
  return <CustomerReceipt order={order} companyInfo={user || {}} />;
}