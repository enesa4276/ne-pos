import React from 'react';
import moment from 'moment';
import { formatCurrency } from '@/lib/i18n';

export function KitchenReceipt({ order, t }) {
  if (!order) return null;
  const tr = t || ((k) => k);
  return (
    <div id="print-area" className="hidden print:block p-4 bg-white text-black font-mono">
      <div className="print-title text-center text-xl font-bold border-b-2 border-dashed border-black pb-2 mb-3">
        {tr('kitchenTicket')}
      </div>
      <div className="text-center text-lg font-bold mb-2">
        {order.order_type === 'takeaway' ? tr('package') : order.table_name || tr('tables')}
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

export function CustomerReceipt({ order, total, t, companyInfo }) {
  if (!order) return null;
  const tr = t || ((k) => k);
  const ci = companyInfo || {};
  const subtotal = order.items?.reduce((s, i) => s + i.subtotal, 0) || 0;
  const tax = subtotal * 0.21;

  return (
    <div id="print-area" className="hidden print:block p-4 bg-white text-black font-mono">
      <div className="print-title text-center text-xl font-bold mb-1">
        {ci.company_name || 'RestoPOS'}
      </div>
      {ci.vat_number && (
        <div className="text-center text-xs">
          BTW/TVA: {ci.vat_number}
        </div>
      )}
      <div className="text-center text-xs mb-3">
        {[ci.address, ci.phone, ci.email_receipt].filter(Boolean).join(' • ') || ''}
      </div>
      <div className="border-t border-dashed border-black pt-2 text-sm mb-2">
        <div className="flex justify-between">
          <span>{order.order_type === 'takeaway' ? tr('takeaway') : order.table_name}</span>
          <span>{moment().format('DD.MM.YYYY HH:mm')}</span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">{tr('product')}</th>
            <th className="text-center">{tr('quantity')}</th>
            <th className="text-right">{tr('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, i) => (
            <React.Fragment key={i}>
              <tr>
                <td className="py-1">{item.product_name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{formatCurrency(item.subtotal)}</td>
              </tr>
              {item.extras?.map((e, j) => (
                <tr key={j}>
                  <td className="pl-2 text-xs" colSpan={2}>+ {e.name} (+{formatCurrency(e.price)})</td>
                  <td></td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black mt-2 pt-2 text-sm">
        <div className="flex justify-between"><span>{tr('subtotal')}</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="flex justify-between"><span>{tr('vatLabel')}</span><span>{formatCurrency(tax)}</span></div>
        <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-black">
          <span>{tr('total')}</span><span>{formatCurrency(total || subtotal + tax)}</span>
        </div>
      </div>
      {ci.vat_number && (
        <div className="text-center text-xs mt-2 border-t border-dashed border-black pt-2">
          BTW/TVA: {ci.vat_number}
        </div>
      )}
      <div className="text-center text-xs mt-3">
        {ci.receipt_footer || tr('thankYou')}
      </div>
    </div>
  );
}