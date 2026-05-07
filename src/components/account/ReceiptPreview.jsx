import React from 'react';
import ReceiptBody from './receipt/ReceiptBody';

// Sahte sipariş — önizleme amaçlı
const SAMPLE_ORDER = {
  id: 'order_preview_demo123',
  table_name: 'Masa 4',
  order_type: 'dine_in',
  staff_name: 'Ahmet',
  payment_method: 'card',
  items: [
    { product_name: 'Burger Classic', quantity: 1, subtotal: 12.5, extras: [{ name: 'Ekstra peynir', price: 1.5 }] },
    { product_name: 'Patates Kızartması', quantity: 2, subtotal: 7.0, extras: [] },
    { product_name: 'Cola', quantity: 2, subtotal: 5.0, extras: [] },
  ],
};

export default function ReceiptPreview({ form }) {
  return (
    <div className="bg-secondary/30 p-4 rounded-2xl flex justify-center overflow-x-auto">
      <ReceiptBody order={SAMPLE_ORDER} companyInfo={form} isPreview />
    </div>
  );
}