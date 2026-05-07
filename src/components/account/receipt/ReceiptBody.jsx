import React from 'react';
import moment from 'moment';
import { getReceiptStyle } from './receiptStyles';

// Fiş gövdesi — hem önizleme (renkli arka plan) hem de gerçek yazdırmada kullanılır.
// `order` ve `companyInfo` (= form ayarları) verilir.
// Bu, tüm uygulamanın tek tip fiş şablonudur.
export default function ReceiptBody({ order, companyInfo = {}, isPreview = false }) {
  const { fontFamily, size, width, fontWeight, textAlign, sepBorder, cfg } = getReceiptStyle(companyInfo);

  if (!order) return null;

  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const taxRate = parseFloat(cfg.receipt_tax_rate || 0) / 100;
  const tax = subtotal * taxRate;
  const total = order.total ?? (subtotal + tax);

  const sep = { borderTop: sepBorder, marginTop: 4, marginBottom: 4, height: 0 };

  const containerStyle = {
    width: `${width}px`,
    fontFamily,
    fontSize: `${size.base}px`,
    lineHeight: 1.3,
    fontWeight,
    textAlign,
    color: '#000',
    background: '#fff',
    padding: isPreview ? 12 : 0,
  };

  return (
    <div style={containerStyle} className={isPreview ? 'shadow-lg rounded-sm' : ''}>
      {cfg.receipt_show_logo && cfg.receipt_logo_url && (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img src={cfg.receipt_logo_url} alt="Logo" style={{ maxHeight: 50, maxWidth: 140, objectFit: 'contain', display: 'inline-block' }} />
        </div>
      )}

      {cfg.receipt_show_company && cfg.company_name && (
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: size.title }}>
          {cfg.company_name}
        </div>
      )}

      {cfg.receipt_header_extra && (
        <div style={{ textAlign: 'center', fontSize: size.base - 2, marginTop: 2 }}>
          {cfg.receipt_header_extra}
        </div>
      )}

      {cfg.receipt_show_vat && cfg.vat_number && (
        <div style={{ textAlign: 'center', fontSize: size.base - 2 }}>BTW/TVA: {cfg.vat_number}</div>
      )}

      {cfg.receipt_show_address && (cfg.address || cfg.phone) && (
        <div style={{ textAlign: 'center', fontSize: size.base - 2, marginBottom: 4 }}>
          {[cfg.address, cfg.phone].filter(Boolean).join(' • ')}
        </div>
      )}

      <div style={sep} />

      {/* Sipariş üst bilgi: masa | tarih */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size.base - 1 }}>
        {cfg.receipt_show_table && (
          <span>{order.order_type === 'takeaway' ? 'Paket' : (order.table_name || '—')}</span>
        )}
        {cfg.receipt_show_datetime && <span>{moment().format('DD.MM HH:mm')}</span>}
      </div>

      {/* Sipariş No + Personel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size.base - 2, opacity: 0.85 }}>
        {cfg.receipt_show_order_number && order.id && <span>No: {String(order.id).slice(-6).toUpperCase()}</span>}
        {cfg.receipt_show_staff && order.staff_name && <span>Garson: {order.staff_name}</span>}
      </div>

      <div style={sep} />

      {/* Ürünler */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: size.base - 1 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: '2px 0' }}>Ürün</th>
            <th style={{ textAlign: 'center', borderBottom: '1px solid #000' }}>Adet</th>
            <th style={{ textAlign: 'right', borderBottom: '1px solid #000' }}>€</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <React.Fragment key={i}>
              <tr>
                <td style={{ padding: '2px 0' }}>{item.product_name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{(item.subtotal || 0).toFixed(2)}</td>
              </tr>
              {cfg.receipt_show_extras && item.extras?.map((e, j) => (
                <tr key={j}>
                  <td colSpan={3} style={{ paddingLeft: 8, fontSize: size.base - 3, opacity: 0.85 }}>
                    + {e.name}{e.price ? ` (+€${e.price.toFixed(2)})` : ''}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div style={sep} />

      {cfg.receipt_show_subtotal && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size.base - 1 }}>
          <span>Ara Toplam</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
      )}
      {cfg.receipt_show_tax && taxRate > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size.base - 1 }}>
          <span>KDV ({cfg.receipt_tax_rate}%)</span>
          <span>€{tax.toFixed(2)}</span>
        </div>
      )}

      <div style={{ ...sep, marginTop: 6 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: size.total }}>
        <span>TOPLAM</span>
        <span>€{Number(total).toFixed(2)}</span>
      </div>

      {order.payment_method && (
        <div style={{ textAlign: 'center', fontSize: size.base - 2, marginTop: 4 }}>
          {order.payment_method === 'card' ? '💳 Kart' : '💵 Nakit'}
        </div>
      )}

      <div style={{ ...sep, marginTop: 8 }} />

      {cfg.receipt_footer && (
        <div style={{ textAlign: 'center', fontSize: size.base - 1 }}>{cfg.receipt_footer}</div>
      )}
      {cfg.receipt_footer_2 && (
        <div style={{ textAlign: 'center', fontSize: size.base - 2, opacity: 0.8 }}>{cfg.receipt_footer_2}</div>
      )}
    </div>
  );
}