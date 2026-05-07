import React from 'react';
import moment from 'moment';

const FONT_MAP = {
  default: 'ui-sans-serif, system-ui, sans-serif',
  monospace: 'ui-monospace, "Courier New", monospace',
  serif: 'ui-serif, Georgia, serif',
};

const SIZE_MAP = {
  small: { base: 11, title: 16, total: 14 },
  medium: { base: 13, title: 19, total: 17 },
  large: { base: 15, title: 22, total: 20 },
};

const WIDTH_MAP = { '58mm': 220, '80mm': 304 };

// Sahte sipariş — önizleme amaçlı
const SAMPLE = {
  table_name: 'Masa 4',
  order_type: 'dine_in',
  items: [
    { product_name: 'Burger Classic', quantity: 1, subtotal: 12.50, extras: [{ name: 'Ekstra peynir', price: 1.5 }] },
    { product_name: 'Patates Kızartması', quantity: 2, subtotal: 7.0, extras: [] },
    { product_name: 'Cola', quantity: 2, subtotal: 5.0, extras: [] },
  ],
};

export default function ReceiptPreview({ form }) {
  const fontFamily = FONT_MAP[form.receipt_font] || FONT_MAP.default;
  const size = SIZE_MAP[form.receipt_font_size] || SIZE_MAP.medium;
  const width = WIDTH_MAP[form.receipt_paper_size] || WIDTH_MAP['80mm'];
  const total = SAMPLE.items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="bg-secondary/30 p-4 rounded-2xl flex justify-center">
      <div
        className="bg-white text-black shadow-lg rounded-sm p-3"
        style={{ width: `${width}px`, fontFamily, fontSize: `${size.base}px`, lineHeight: 1.3 }}
      >
        {form.receipt_logo_url && (
          <div className="flex justify-center mb-2">
            <img
              src={form.receipt_logo_url}
              alt="Logo"
              style={{ maxHeight: 50, maxWidth: 140, objectFit: 'contain' }}
            />
          </div>
        )}
        {form.company_name && (
          <div className="text-center font-bold" style={{ fontSize: `${size.title}px` }}>
            {form.company_name}
          </div>
        )}
        {form.vat_number && (
          <div className="text-center" style={{ fontSize: `${size.base - 2}px` }}>
            BTW/TVA: {form.vat_number}
          </div>
        )}
        <div className="text-center mb-2" style={{ fontSize: `${size.base - 2}px` }}>
          {[form.address, form.phone].filter(Boolean).join(' • ')}
        </div>

        <div className="border-t border-dashed border-black pt-2 mb-1 flex justify-between" style={{ fontSize: `${size.base - 1}px` }}>
          <span>{SAMPLE.table_name}</span>
          <span>{moment().format('DD.MM HH:mm')}</span>
        </div>

        <table className="w-full" style={{ fontSize: `${size.base - 1}px` }}>
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1">Ürün</th>
              <th className="text-center">Adet</th>
              <th className="text-right">€</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.items.map((item, i) => (
              <React.Fragment key={i}>
                <tr>
                  <td className="py-0.5">{item.product_name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{item.subtotal.toFixed(2)}</td>
                </tr>
                {item.extras.map((e, j) => (
                  <tr key={j}>
                    <td colSpan={3} className="pl-2" style={{ fontSize: `${size.base - 3}px` }}>
                      + {e.name} (+€{e.price.toFixed(2)})
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black mt-1 pt-1 flex justify-between font-bold" style={{ fontSize: `${size.total}px` }}>
          <span>TOPLAM</span>
          <span>€{total.toFixed(2)}</span>
        </div>

        <div className="text-center mt-2 border-t border-dashed border-black pt-2" style={{ fontSize: `${size.base - 2}px` }}>
          {form.receipt_footer || 'Bedankt voor uw bezoek!'}
        </div>
      </div>
    </div>
  );
}