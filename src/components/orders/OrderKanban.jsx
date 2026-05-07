import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, UtensilsCrossed, Phone, Globe } from 'lucide-react';
import moment from 'moment';

const COLUMNS = [
  { id: 'pending', label: 'Bekliyor', color: 'amber' },
  { id: 'accepted', label: 'Kabul Edildi', color: 'blue' },
  { id: 'preparing', label: 'Hazırlanıyor', color: 'purple' },
  { id: 'ready_for_delivery_pickup', label: 'Hazır', color: 'orange' },
  { id: 'out_for_delivery', label: 'Yolda', color: 'green' },
  { id: 'fulfilled', label: 'Tamamlandı', color: 'gray' },
];

const SOURCE_ICONS = {
  pos_dine_in: UtensilsCrossed,
  pos_takeaway: Package,
  ai_phone: Phone,
  wix: Globe,
  takeaway_com: Globe,
  uber_eats: Globe,
};

export default function OrderKanban({ orders, onStatusChange, onCardClick }) {
  return (
    <div className="flex gap-3 overflow-x-auto p-4 h-full">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.id);
        return (
          <div key={col.id} className="min-w-[280px] flex-1 max-w-[320px] flex flex-col">
            <div className={`bg-${col.color}-500/10 border border-${col.color}-500/30 rounded-2xl p-3 mb-2 backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{col.label}</h3>
                <Badge variant="outline" className="text-xs">{colOrders.length}</Badge>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {colOrders.map((o) => {
                const Icon = SOURCE_ICONS[o.order_source] || Package;
                return (
                  <Card
                    key={o.id}
                    onClick={() => onCardClick?.(o)}
                    className="p-3 cursor-pointer hover:shadow-md transition-all border-0 shadow-sm bg-card/80 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-bold">{o.table_name || o.customer_name || 'Sipariş'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{moment(o.created_date).format('HH:mm')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {o.items?.slice(0, 2).map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                      {o.items?.length > 2 ? `, +${o.items.length - 2}` : ''}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary font-bold text-sm">€{(o.total || 0).toFixed(2)}</span>
                      {col.id !== 'fulfilled' && (
                        <select
                          value={o.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onStatusChange(o, e.target.value)}
                          className="text-xs bg-secondary rounded-md px-1 py-0.5 border-0"
                        >
                          {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      )}
                    </div>
                  </Card>
                );
              })}
              {colOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}