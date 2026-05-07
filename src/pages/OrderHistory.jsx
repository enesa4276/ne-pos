import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Search, Calendar, Globe, UtensilsCrossed, Package, Phone } from 'lucide-react';
import moment from 'moment';
import { exportOrdersToCSV, exportOrdersToPDF } from '@/lib/exportOrders';
import { NORMALIZE_STATUS } from '@/components/orders/OrderKanban';

const SOURCE_ICONS = {
  pos_dine_in: UtensilsCrossed,
  pos_takeaway: Package,
  ai_phone: Phone,
  wix: Globe,
  takeaway_com: Globe,
  uber_eats: Globe,
};

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-600 border-amber-500/40',
  preparing: 'bg-blue-500/20 text-blue-600 border-blue-500/40',
  ready: 'bg-green-500/20 text-green-600 border-green-500/40',
  completed: 'bg-gray-500/20 text-gray-500 border-gray-500/40',
};

const STATUS_LABELS = {
  pending: 'Bekliyor',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  completed: 'Tamamlandı',
};

export default function OrderHistory() {
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState('week'); // today | week | month | all
  const [minAmount, setMinAmount] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders-history', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user?.email }, '-created_date', 1000),
    enabled: !!user?.email,
  });

  const filtered = useMemo(() => {
    let list = orders;

    // Tarih
    if (dateRange !== 'all') {
      const start = moment();
      if (dateRange === 'today') start.startOf('day');
      else if (dateRange === 'week') start.subtract(7, 'days');
      else if (dateRange === 'month') start.subtract(30, 'days');
      list = list.filter((o) => moment(o.created_date).isAfter(start));
    }

    if (source !== 'all') list = list.filter((o) => (o.order_source || 'pos_dine_in') === source);
    if (status !== 'all') list = list.filter((o) => NORMALIZE_STATUS(o.status) === status);

    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) list = list.filter((o) => (o.total || 0) >= min);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.table_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').includes(q) ||
        (o.notes || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [orders, source, status, dateRange, minAmount, search]);

  const totalRevenue = filtered.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full pb-20 md:pb-6 overflow-y-auto h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Sipariş Geçmişi</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} sipariş · Toplam <span className="font-bold text-primary">€{totalRevenue.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => exportOrdersToCSV(filtered)}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => exportOrdersToPDF(filtered)}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Müşteri / masa / telefon"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-9"
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">7 gün</SelectItem>
              <SelectItem value="month">30 gün</SelectItem>
              <SelectItem value="all">Tümü</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-40 rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kaynaklar</SelectItem>
              <SelectItem value="pos_dine_in">POS — Masa</SelectItem>
              <SelectItem value="pos_takeaway">POS — Gel-Al</SelectItem>
              <SelectItem value="ai_phone">AI Telefon</SelectItem>
              <SelectItem value="wix">Wix</SelectItem>
              <SelectItem value="takeaway_com">Takeaway.com</SelectItem>
              <SelectItem value="uber_eats">Uber Eats</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36 rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="pending">Bekliyor</SelectItem>
              <SelectItem value="preparing">Hazırlanıyor</SelectItem>
              <SelectItem value="ready">Hazır</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Min € tutar"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-28 rounded-xl h-9"
          />
        </CardContent>
      </Card>

      {/* Card View */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Sipariş bulunamadı.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((o) => {
            const Icon = SOURCE_ICONS[o.order_source] || Package;
            const norm = NORMALIZE_STATUS(o.status);
            return (
              <Card key={o.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          {o.table_name || o.customer_name || 'Sipariş'}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {moment(o.created_date).format('DD.MM HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[norm]}`}>
                      {STATUS_LABELS[norm]}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {o.items?.map((i) => `${i.quantity}× ${i.product_name}`).join(', ') || '—'}
                  </div>

                  {(o.customer_phone || o.notes) && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5 mb-2">
                      {o.customer_phone && <p>📞 {o.customer_phone}</p>}
                      {o.notes && <p className="line-clamp-1">📝 {o.notes}</p>}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {o.order_source?.replace('_', ' ') || 'POS'}
                    </span>
                    <span className="text-primary font-black">€{(o.total || 0).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}