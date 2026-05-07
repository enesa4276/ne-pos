import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, UtensilsCrossed, Phone, Globe, Printer, ArrowRight } from 'lucide-react';
import moment from 'moment';

// Sadeleştirilmiş 4 aşamalı pipeline
const COLUMNS = [
  { id: 'pending',    label: 'Bekliyor',     color: 'amber',  next: 'preparing' },
  { id: 'preparing',  label: 'Hazırlanıyor', color: 'blue',   next: 'ready' },
  { id: 'ready',      label: 'Hazır',        color: 'green',  next: 'completed' },
  { id: 'completed',  label: 'Tamamlandı',   color: 'gray',   next: null },
];

// Eski statüleri yeni 4 kolona haritalandır
export const NORMALIZE_STATUS = (s) => {
  if (['open', 'pending', 'accepted'].includes(s)) return 'pending';
  if (['preparing'].includes(s)) return 'preparing';
  if (['ready_for_delivery_pickup', 'out_for_delivery'].includes(s)) return 'ready';
  if (['paid', 'fulfilled', 'completed', 'cancelled'].includes(s)) return 'completed';
  return s || 'pending';
};

const SOURCE_ICONS = {
  pos_dine_in: UtensilsCrossed,
  pos_takeaway: Package,
  ai_phone: Phone,
  wix: Globe,
  takeaway_com: Globe,
  uber_eats: Globe,
  menupro: Globe,
};

export default function OrderKanban({ orders, onStatusChange, onPrint }) {
  return (
    <div className="flex gap-3 overflow-x-auto p-4 h-full">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => NORMALIZE_STATUS(o.status) === col.id);
        return (
          <div key={col.id} className="min-w-[280px] flex-1 max-w-[340px] flex flex-col">
            <div className={`bg-${col.color}-500/10 border border-${col.color}-500/30 rounded-2xl p-3 mb-2`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{col.label}</h3>
                <Badge variant="outline" className="text-xs">{colOrders.length}</Badge>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {colOrders.map((o) => {
                const Icon = SOURCE_ICONS[o.order_source] || Package;
                return (
                  <Card key={o.id} className="p-3 border-0 shadow-sm bg-card/90 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-bold">{o.table_name || o.customer_name || 'Sipariş'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {moment(o.created_date).format('HH:mm')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {o.items?.slice(0, 2).map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                      {o.items?.length > 2 ? `, +${o.items.length - 2}` : ''}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-primary font-bold text-sm">€{(o.total || 0).toFixed(2)}</span>
                      <div className="flex gap-1">
                        {onPrint && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => onPrint(o)}
                            title="Yazdır"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {col.next && (
                          <Button
                            size="sm"
                            className="h-7 rounded-lg gap-1 text-xs px-2"
                            onClick={() => onStatusChange(o, col.next)}
                          >
                            İlerlet <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {colOrders.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}