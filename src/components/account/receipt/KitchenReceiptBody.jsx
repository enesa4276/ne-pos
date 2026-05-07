import React from 'react';
import moment from 'moment';
import { getReceiptStyle } from './receiptStyles';

// MUTFAK FİŞİ — kullanıcının termal fiş tasarımı (font, kağıt, logo, başlık) korunur,
// fiyatlar/KDV/ödeme gösterilmez. Sadece adet + ürün + ekstra + not.
// 58mm/80mm kağıt + monospace ile ESC/POS uyumlu.
export default function KitchenReceiptBody({ order, companyInfo = {}, isPreview = false }) {
  const { fontFamily, size, width, fontWeight, textAlign, sepBorder, cfg } = getReceiptStyle(companyInfo);

  if (!order) return null;
  const items = order.items || [];

  const sep = { borderTop: sepBorder, marginTop: 4, marginBottom: 4, height: 0, borderBottom: 0, borderLeft: 0, borderRight: 0 };
  const center = { textAlign: 'center' };
  const row = { display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' };

  const containerStyle = {
    width: `${width}px`,
    fontFamily,
    fontSize: `${size.base}px`,
    lineHeight: 1.35,
    fontWeight,
    textAlign,
    color: '#000',
    background: '#fff',
    padding: isPreview ? 12 : 0,
    letterSpacing: '0.01em',
  };

  const orderNo = order.id ? String(order.id).slice(-6).toUpperCase() : '';
  const dateStr = moment(order.created_date || undefined).format('DD/MM/YYYY HH:mm');

  return (
    <div style={containerStyle} className={isPreview ? 'shadow-lg rounded-sm' : ''}>
      {/* HEADER — kullanıcının logo/şirket ayarları */}
      {cfg.receipt_show_logo && cfg.receipt_logo_url && (
        <div style={{ ...center, marginBottom: 4 }}>
          <img
            src={cfg.receipt_logo_url}
            alt="Logo"
            style={{ maxHeight: 56, maxWidth: width - 20, objectFit: 'contain', display: 'inline-block' }}
          />
        </div>
      )}

      {cfg.receipt_show_company && cfg.company_name && (
        <div style={{ ...center, fontWeight: 700, fontSize: size.title, lineHeight: 1.15, letterSpacing: '0.04em' }}>
          {cfg.company_name.toUpperCase()}
        </div>
      )}

      {/* MUTFAK BAŞLIĞI — büyük ve net */}
      <div style={{ ...center, fontSize: size.total, fontWeight: 800, marginTop: 6, marginBottom: 2, letterSpacing: '0.1em' }}>
        ★ MUTFAK ★
      </div>

      <div style={sep} />

      {/* META */}
      <div style={{ fontSize: size.sm }}>
        {cfg.receipt_show_datetime && (
          <div style={row}><span>Datum:</span><span>{dateStr}</span></div>
        )}
        {cfg.receipt_show_order_number && orderNo && (
          <div style={row}><span>Bestelnr:</span><span style={{ fontWeight: 700 }}>#{orderNo}</span></div>
        )}
        <div style={row}>
          <span>Type:</span>
          <span style={{ fontWeight: 700 }}>
            {order.order_type === 'takeaway' ? 'AFHAAL' :
             order.order_type === 'delivery' ? 'BEZORGEN' :
             order.order_type === 'phone' ? 'TELEFOON' :
             (order.table_name || 'TAFEL').toUpperCase()}
          </span>
        </div>
        {order.staff_name && (
          <div style={row}><span>Bediening:</span><span>{order.staff_name}</span></div>
        )}
        {order.customer_name && (
          <div style={row}><span>Klant:</span><span>{order.customer_name}</span></div>
        )}
      </div>

      <div style={sep} />

      {/* ITEMS — büyük adet, fiyatsız */}
      <div style={{ fontSize: size.base }}>
        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: 6, paddingBottom: 4, borderBottom: '1px dashed #999' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: size.total, fontWeight: 800, minWidth: 36 }}>
                {item.quantity}x
              </span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: size.base, wordBreak: 'break-word' }}>
                {item.product_name}
              </span>
            </div>

            {item.extras?.length > 0 && (
              <div style={{ paddingLeft: 44, fontSize: size.sm, marginTop: 2 }}>
                {item.extras.map((e, j) => (
                  <div key={j}>+ {e.name}</div>
                ))}
              </div>
            )}

            {item.note && (
              <div style={{ paddingLeft: 44, fontSize: size.sm, fontStyle: 'italic', marginTop: 2 }}>
                ★ {item.note}
              </div>
            )}
          </div>
        ))}
      </div>

      {order.notes && (
        <>
          <div style={sep} />
          <div style={{ fontSize: size.sm, fontStyle: 'italic' }}>Opm: {order.notes}</div>
        </>
      )}

      {/* Bottom whitespace — kesici için */}
      <div style={{ height: 18 }} />
    </div>
  );
}