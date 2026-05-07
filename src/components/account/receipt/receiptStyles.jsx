// Termal fiş tasarım stilleri için ortak helper.
// Tüm fiş bileşenleri (önizleme + yazıcıya basılan) bu helper'ı kullanmalı.

export const FONT_MAP = {
  default: 'ui-sans-serif, system-ui, sans-serif',
  monospace: 'ui-monospace, "Courier New", monospace',
  serif: 'ui-serif, Georgia, serif',
};

export const SIZE_MAP = {
  small:  { base: 11, title: 16, total: 14 },
  medium: { base: 13, title: 19, total: 17 },
  large:  { base: 15, title: 22, total: 20 },
  xlarge: { base: 17, title: 26, total: 24 },
};

export const WIDTH_MAP = { '58mm': 220, '80mm': 304 };

export const SEPARATOR_BORDER = {
  dashed: '1px dashed #000',
  solid: '1px solid #000',
  double: '3px double #000',
  none: '0',
};

// Ortak default ayarlar (tasarım kaydedilmemiş tenantlar için fallback)
export const RECEIPT_DEFAULTS = {
  receipt_font: 'default',
  receipt_paper_size: '80mm',
  receipt_font_size: 'medium',
  receipt_font_weight: 'normal',
  receipt_align: 'left',
  receipt_separator: 'dashed',
  receipt_show_logo: true,
  receipt_show_company: true,
  receipt_show_address: true,
  receipt_show_vat: true,
  receipt_show_table: true,
  receipt_show_datetime: true,
  receipt_show_order_number: true,
  receipt_show_extras: true,
  receipt_show_subtotal: true,
  receipt_show_tax: true,
  receipt_show_staff: true,
  receipt_show_qr: false,
  receipt_tax_rate: 21,
  receipt_footer: 'Bedankt voor uw bezoek!',
  receipt_footer_2: '',
  receipt_header_extra: '',
};

export function getReceiptStyle(form = {}) {
  const f = { ...RECEIPT_DEFAULTS, ...form };
  return {
    fontFamily: FONT_MAP[f.receipt_font] || FONT_MAP.default,
    size: SIZE_MAP[f.receipt_font_size] || SIZE_MAP.medium,
    width: WIDTH_MAP[f.receipt_paper_size] || WIDTH_MAP['80mm'],
    fontWeight: f.receipt_font_weight === 'bold' ? 700 : 400,
    textAlign: f.receipt_align || 'left',
    sepBorder: SEPARATOR_BORDER[f.receipt_separator] || SEPARATOR_BORDER.dashed,
    cfg: f,
  };
}