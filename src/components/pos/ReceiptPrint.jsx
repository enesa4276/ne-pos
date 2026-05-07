import React from 'react';
import ReceiptBody from '@/components/account/receipt/ReceiptBody';
import KitchenReceiptBody from '@/components/account/receipt/KitchenReceiptBody';

// MUTFAK FİŞİ — kullanıcının termal tasarımıyla aynı şablon, fiyatlar yok.
// Hesap → Termal Fiş ayarları (logo, font, kağıt boyu, başlık) korunur.
export function KitchenReceipt({ order, companyInfo }) {
  if (!order) return null;
  return (
    <div id="print-area" className="hidden print:block">
      <KitchenReceiptBody order={order} companyInfo={companyInfo} />
    </div>
  );
}

// MÜŞTERİ FİŞİ — Hesap → Termal Fiş'te tasarlanan tek tip şablon kullanılır.
export function CustomerReceipt({ order, companyInfo }) {
  if (!order) return null;
  return (
    <div id="print-area" className="hidden print:block">
      <ReceiptBody order={order} companyInfo={companyInfo} />
    </div>
  );
}