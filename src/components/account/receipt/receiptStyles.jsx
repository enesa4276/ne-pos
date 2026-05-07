// Termal fiş tasarım stilleri için ortak helper.
// Profesyonel ESC/POS termal yazıcılar için optimize edildi (58mm / 80mm).
// Tüm fiş bileşenleri (önizleme + yazıcıya basılan) bu helper'ı kullanır.

// Termal yazıcılar monospace fontlarla en iyi sonucu verir (Wix, Takeaway, UberEats POS standardı).
export const FONT_MAP = {
  default: '"Courier New", "Lucida Console", Consolas, monospace',
  monospace: '"Courier New", "Lucida Console", Consolas, monospace',
  serif: 'ui-serif, Georgia, serif',
  sans: 'ui-sans-serif, system-ui, sans-serif',
};

// Boyutlar termal printer için optimize: base font monospace 12-14px aralığında en net.
export const SIZE_MAP = {
  small:  { base: 11, title: 15, total: 14, sm: 9 },
  medium: { base: 12, title: 17, total: 16, sm: 10 },
  large:  { base: 13, title: 19, total: 18, sm: 11 },
  xlarge: { base: 14, title: 22, total: 20, sm: 12 },
};

// Termal kağıt genişlikleri:
// 58mm yazıcı = 32 karakter / satır
// 80mm yazıcı = 48 karakter / satır
export const WIDTH_MAP  = { '58mm': 220, '80mm': 304 };
export const COLS_MAP   = { '58mm': 32,  '80mm': 48 };

export const SEPARATOR_BORDER = {
  dashed: '1px dashed #000',
  solid: '1px solid #000',
  double: '3px double #000',
  none: '0',
};

// Ortak default ayarlar (tasarım kaydedilmemiş tenantlar için fallback)
export const RECEIPT_DEFAULTS = {
  receipt_font: 'monospace',
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
    fontFamily: FONT_MAP[f.receipt_font] || FONT_MAP.monospace,
    size: SIZE_MAP[f.receipt_font_size] || SIZE_MAP.medium,
    width: WIDTH_MAP[f.receipt_paper_size] || WIDTH_MAP['80mm'],
    cols: COLS_MAP[f.receipt_paper_size] || COLS_MAP['80mm'],
    fontWeight: f.receipt_font_weight === 'bold' ? 700 : 400,
    textAlign: f.receipt_align || 'left',
    sepBorder: SEPARATOR_BORDER[f.receipt_separator] || SEPARATOR_BORDER.dashed,
    cfg: f,
  };
}

// Termal printer uyumlu metin sarma — uzun ürün adlarını sütun genişliğine böler.
export function wrapText(text, maxCols) {
  if (!text) return [''];
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxCols) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w.length > maxCols ? w.slice(0, maxCols) : w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}