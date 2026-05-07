import React from 'react';
import moment from 'moment';
import { getReceiptStyle, wrapText } from './receiptStyles';

// Profesyonel termal fiş gövdesi (ESC/POS uyumlu).
// 58mm = 32 kol, 80mm = 48 kol — monospace ile mükemmel hizalanır.
// Wix/Takeaway/UberEats termal printer çıktılarıyla aynı standart.
export default function ReceiptBody({ order, companyInfo = {}, isPreview = false }) {
  const { fontFamily, size, width, cols, fontWeight, textAlign, sepBorder, cfg } = getReceiptStyle(companyInfo);

  if (!order) return null;

  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const taxRate = parseFloat(cfg.receipt_tax_rate || 0) / 100;
  // KDV "include" varsayımı — total zaten KDV'li. Geriye dönük formula:
  const total = order.total ?? (subtotal + subtotal * taxRate);
  const tax = taxRate > 0 ? total - total / (1 + taxRate) : 0;
  const netSubtotal = total - tax;

  const sep = { borderTop: sepBorder, marginTop: 4, marginBottom: 4, height: 0, borderBottom: 0, borderLeft: 0, borderRight: 0 };
  const center = { textAlign: 'center' };

  // İki sütun layout (ad → fiyat) için flex
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

  // Ürün adı için sütun genişliği = toplam kolon - 11 (qty 3 + space + euro 7)
  const nameMaxCols = Math.max(10, cols - 11);

  return (
    <div style={containerStyle} className={isPreview ? 'shadow-lg rounded-sm' : ''}>
      {/* HEADER */}
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

      {cfg.receipt_header_extra && (
        <div style={{ ...center, fontSize: size.sm, marginTop: 1 }}>{cfg.receipt_header_extra}</div>
      )}

      {cfg.receipt_show_address && (cfg.address || cfg.phone) && (
        <div style={{ ...center, fontSize: size.sm, marginTop: 1 }}>
          {cfg.address && <div>{cfg.address}</div>}
          {cfg.phone && <div>Tel: {cfg.phone}</div>}
        </div>
      )}

      {cfg.receipt_show_vat && cfg.vat_number && (
        <div style={{ ...center, fontSize: size.sm }}>BTW/TVA: {cfg.vat_number}</div>
      )}

      <div style={sep} />

      {/* ORDER META — date / order# / table / staff */}
      <div style={{ fontSize: size.sm }}>
        {cfg.receipt_show_datetime && (
          <div style={row}><span>Datum:</span><span>{dateStr}</span></div>
        )}
        {cfg.receipt_show_order_number && orderNo && (
          <div style={row}><span>Bestelnr:</span><span style={{ fontWeight: 700 }}>#{orderNo}</span></div>
        )}
        {cfg.receipt_show_table && (
          <div style={row}>
            <span>Type:</span>
            <span style={{ fontWeight: 700 }}>
              {order.order_type === 'takeaway' ? 'AFHAAL' :
               order.order_type === 'delivery' ? 'BEZORGEN' :
               order.order_type === 'phone' ? 'TELEFOON' :
               (order.table_name || 'TAFEL').toUpperCase()}
            </span>
          </div>
        )}
        {cfg.receipt_show_staff && order.staff_name && (
          <div style={row}><span>Bediening:</span><span>{order.staff_name}</span></div>
        )}
        {order.customer_name && (
          <div style={row}><span>Klant:</span><span>{order.customer_name}</span></div>
        )}
      </div>

      <div style={sep} />

      {/* ITEMS — sabit 3 sütun: ad / adet / fiyat */}
      <div style={{ fontSize: size.base }}>
        <div style={{ ...row, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 2 }}>
          <span style={{ flex: 1 }}>Artikel</span>
          <span style={{ width: 30, textAlign: 'center' }}>Qty</span>
          <span style={{ width: 60, textAlign: 'right' }}>EUR</span>
        </div>

        {items.map((item, i) => {
          const lines = wrapText(item.product_name, nameMaxCols);
          const unitPrice = (item.subtotal || 0);
          return (
            <div key={i} style={{ marginBottom: 2 }}>
              {/* İlk satır: ad + qty + tutar */}
              <div style={{ ...row, alignItems: 'flex-start' }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{lines[0]}</span>
                <span style={{ width: 30, textAlign: 'center' }}>{item.quantity}x</span>
                <span style={{ width: 60, textAlign: 'right' }}>€{unitPrice.toFixed(2)}</span>
              </div>
              {/* Devamı satırlar (uzun ad) */}
              {lines.slice(1).map((l, j) => (
                <div key={j} style={{ paddingLeft: 0 }}>{l}</div>
              ))}
              {/* Ekstralar */}
              {cfg.receipt_show_extras && item.extras?.map((e, j) => (
                <div key={j} style={{ ...row, fontSize: size.sm, opacity: 0.9 }}>
                  <span style={{ flex: 1, paddingLeft: 8 }}>+ {e.name}</span>
                  {e.price ? (
                    <span style={{ width: 60, textAlign: 'right' }}>€{Number(e.price).toFixed(2)}</span>
                  ) : null}
                </div>
              ))}
              {item.note && (
                <div style={{ fontSize: size.sm, fontStyle: 'italic', paddingLeft: 8, opacity: 0.85 }}>
                  ★ {item.note}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={sep} />

      {/* TOTALS */}
      <div style={{ fontSize: size.base }}>
        {cfg.receipt_show_subtotal && (
          <div style={row}><span>Subtotaal</span><span>€{netSubtotal.toFixed(2)}</span></div>
        )}
        {cfg.receipt_show_tax && taxRate > 0 && (
          <div style={row}><span>BTW ({cfg.receipt_tax_rate}%)</span><span>€{tax.toFixed(2)}</span></div>
        )}
      </div>

      <div style={{ ...sep, marginTop: 4 }} />

      <div style={{ ...row, fontWeight: 700, fontSize: size.total, padding: '2px 0' }}>
        <span>TOTAAL</span>
        <span>€{Number(total).toFixed(2)}</span>
      </div>

      {order.payment_method && (
        <div style={{ ...row, fontSize: size.sm, marginTop: 3 }}>
          <span>Betaling:</span>
          <span style={{ fontWeight: 700 }}>
            {order.payment_method === 'card' ? 'KAART' : 'CONTANT'}
          </span>
        </div>
      )}

      {order.notes && (
        <>
          <div style={sep} />
          <div style={{ fontSize: size.sm, fontStyle: 'italic' }}>Opm: {order.notes}</div>
        </>
      )}

      <div style={{ ...sep, marginTop: 8 }} />

      {/* FOOTER */}
      {cfg.receipt_footer && (
        <div style={{ ...center, fontSize: size.base, marginTop: 2 }}>{cfg.receipt_footer}</div>
      )}
      {cfg.receipt_footer_2 && (
        <div style={{ ...center, fontSize: size.sm, opacity: 0.85 }}>{cfg.receipt_footer_2}</div>
      )}

      {/* Bottom whitespace — termal kesicinin temiz kesmesi için */}
      <div style={{ height: 18 }} />
    </div>
  );
}