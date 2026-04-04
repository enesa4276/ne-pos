import React from 'react';
import moment from 'moment';

export function KitchenReceipt({ order }) {
  if (!order) return null;
  return (
    <div id="print-area" className="hidden print:block p-4 bg-white text-black font-mono">
      <div className="print-title text-center text-xl font-bold border-b-2 border-dashed border-black pb-2 mb-3">
        MUTFAK FİŞİ
      </div>
      <div className="text-center text-lg font-bold mb-2">
        {order.order_type === 'takeaway' ? '*** PAKET ***' : order.table_name || 'Masa'}
      </div>
      <div className="text-center text-sm mb-4">
        {moment().format('DD.MM.YYYY HH:mm')}
      </div>
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

export function CustomerReceipt({ order, total }) {
  if (!order) return null;
  const subtotal = order.items?.reduce((s, i) => s + i.subtotal, 0) || 0;
  const tax = subtotal * 0.10;

  return (
    <div id="print-area" className="hidden print:block p-4 bg-white text-black font-mono">
      <div className="print-title text-center text-xl font-bold mb-1">
        RESTORAN ADI
      </div>
      <div className="text-center text-xs mb-3">
        Adres Bilgisi • Tel: 0212 000 00 00
      </div>
      <div className="border-t border-dashed border-black pt-2 text-sm mb-2">
        <div className="flex justify-between">
          <span>{order.order_type === 'takeaway' ? 'Paket' : order.table_name}</span>
          <span>{moment().format('DD.MM.YYYY HH:mm')}</span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Ürün</th>
            <th className="text-center">Adet</th>
            <th className="text-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, i) => (
            <React.Fragment key={i}>
              <tr>
                <td className="py-1">{item.product_name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">₺{item.subtotal.toFixed(2)}</td>
              </tr>
              {item.extras?.map((e, j) => (
                <tr key={j}>
                  <td className="pl-2 text-xs" colSpan={2}>+ {e.name} (+₺{e.price.toFixed(2)})</td>
                  <td></td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black mt-2 pt-2 text-sm">
        <div className="flex justify-between"><span>Ara Toplam</span><span>₺{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>KDV (%10)</span><span>₺{tax.toFixed(2)}</span></div>
        <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-black">
          <span>TOPLAM</span><span>₺{(total || subtotal + tax).toFixed(2)}</span>
        </div>
      </div>
      <div className="text-center text-xs mt-4">
        Bizi tercih ettiğiniz için teşekkürler!
      </div>
    </div>
  );
}