import React from 'react';
import ReceiptBody from '@/components/account/receipt/ReceiptBody';

// Mutfak fişi — sade, sadece ürünler. Kasa fişine göre minimalist.
export function KitchenReceipt({ order }) {
  if (!order) return null;
  return (
    <div id="print-area" className="hidden print:block p-4 bg-white text-black font-mono">
      <div className="print-title text-center text-xl font-bold border-b-2 border-dashed border-black pb-2 mb-3">
        MUTFAK FİŞİ
      </div>
      <div className="text-center text-lg font-bold mb-2">
        {order.order_type === 'takeaway' ? 'PAKET' : (order.table_name || '—')}
      </div>
      {order.staff_name && (
        <div className="text-center text-sm mb-2">Garson: {order.staff_name}</div>
      )}
      <div className="border-t border-dashed border-black pt-2">
        {order.items?.map((item, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between text-base font-bold">
              <span>{item.quantity}x {item.product_name}</span>
            </div>
            {item.extras?.length > 0 && (
              <div className="pl-4 text-sm">
                {item.extras.map((e, j) => (
                  <div key={j}>→ {e.name}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Müşteri fişi — Hesap → Termal Fiş'te tasarlanan tek tip şablon kullanılır.
// `companyInfo` user'ın receipt_* alanlarını içeren obje olmalı.
export function CustomerReceipt({ order, companyInfo }) {
  if (!order) return null;
  return (
    <div id="print-area" className="hidden print:block">
      <ReceiptBody order={order} companyInfo={companyInfo} />
    </div>
  );
}