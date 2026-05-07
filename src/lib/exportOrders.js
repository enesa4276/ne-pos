import jsPDF from 'jspdf';
import moment from 'moment';

// CSV export
export function exportOrdersToCSV(orders) {
  const headers = ['ID', 'Tarih', 'Tip', 'Kaynak', 'Masa/Müşteri', 'Durum', 'Toplam', 'Ödeme'];
  const rows = orders.map((o) => [
    o.id,
    moment(o.created_date).format('YYYY-MM-DD HH:mm'),
    o.order_type,
    o.order_source || '-',
    o.table_name || o.customer_name || '-',
    o.status,
    (o.total || 0).toFixed(2),
    o.payment_method || o.external_payment_method || '-',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `siparisler-${moment().format('YYYYMMDD-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportOrdersToPDF(orders) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Sipariş Raporu', 14, 16);
  doc.setFontSize(10);
  doc.text(`Oluşturulma: ${moment().format('DD/MM/YYYY HH:mm')}`, 14, 22);
  doc.text(`Toplam sipariş: ${orders.length}`, 14, 28);

  let y = 36;
  doc.setFontSize(9);
  doc.text('Tarih', 14, y);
  doc.text('Tip', 50, y);
  doc.text('Müşteri/Masa', 75, y);
  doc.text('Durum', 130, y);
  doc.text('Toplam', 170, y, { align: 'right' });
  y += 4;
  doc.line(14, y, 196, y);
  y += 4;

  orders.forEach((o) => {
    if (y > 280) { doc.addPage(); y = 16; }
    doc.text(moment(o.created_date).format('DD/MM HH:mm'), 14, y);
    doc.text(String(o.order_type || '-').slice(0, 12), 50, y);
    doc.text(String(o.table_name || o.customer_name || '-').slice(0, 24), 75, y);
    doc.text(String(o.status).slice(0, 14), 130, y);
    doc.text(`€${(o.total || 0).toFixed(2)}`, 196, y, { align: 'right' });
    y += 6;
  });

  const totalRev = orders.reduce((s, o) => s + (o.total || 0), 0);
  y += 6;
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFontSize(11);
  doc.text(`Genel Toplam: €${totalRev.toFixed(2)}`, 196, y, { align: 'right' });

  doc.save(`siparisler-${moment().format('YYYYMMDD-HHmm')}.pdf`);
}