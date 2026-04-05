import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, ExternalLink, CheckCircle, ChefHat, Truck, PackageCheck, X } from 'lucide-react';
import { formatCurrency } from '@/lib/i18n';
import moment from 'moment';

const STATUS_CONFIG = {
  pending:                   { label: 'Bekliyor',       color: 'bg-amber-500/20 text-amber-600 border-amber-500/40',   next: 'accepted',                  nextLabel: 'Kabul Et',          icon: CheckCircle },
  accepted:                  { label: 'Kabul Edildi',   color: 'bg-blue-500/20 text-blue-600 border-blue-500/40',     next: 'preparing',                 nextLabel: 'Hazırlamaya Başla', icon: ChefHat },
  preparing:                 { label: 'Hazırlanıyor',   color: 'bg-purple-500/20 text-purple-600 border-purple-500/40', next: 'ready_for_delivery_pickup', nextLabel: 'Hazır',             icon: PackageCheck },
  ready_for_delivery_pickup: { label: 'Hazır',          color: 'bg-green-500/20 text-green-600 border-green-500/40',  next: 'out_for_delivery',          nextLabel: 'Teslimata Çıkar',   icon: Truck },
  out_for_delivery:          { label: 'Teslimatta',     color: 'bg-orange-500/20 text-orange-600 border-orange-500/40', next: 'fulfilled',               nextLabel: 'Teslim Edildi',     icon: CheckCircle },
  fulfilled:                 { label: 'Tamamlandı',     color: 'bg-gray-500/20 text-gray-500 border-gray-500/40',     next: null, nextLabel: null,         icon: CheckCircle },
  cancelled:                 { label: 'İptal',          color: 'bg-red-500/20 text-red-600 border-red-500/40',        next: null, nextLabel: null,         icon: X },
};

const SOURCE_CONFIG = {
  wix:          { label: 'Wix',          emoji: '🌐', headerColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  takeaway_com: { label: 'Takeaway',     emoji: '🛵', headerColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  uber_eats:    { label: 'Uber Eats',    emoji: '🟢', headerColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
};

export default function WixOrderCard({ order, onStatusChange, loading }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending'];
  const src = SOURCE_CONFIG[order.order_source] || SOURCE_CONFIG['wix'];
  const NextIcon = cfg.icon;

  const mapsUrl = order.delivery_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
    : null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Source badge header */}
      <div className={`px-3 py-1.5 flex items-center justify-between border-b ${src.headerColor}`}>
        <span className="text-xs font-semibold">{src.emoji} {src.label}</span>
        <span className="text-xs text-muted-foreground">{moment(order.created_date).format('DD.MM HH:mm')}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{order.customer_name || 'Online Sipariş'}</span>
            <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
            {(order.payment_status_wix || order.external_payment_status) && (
              <Badge variant="outline" className="text-xs">
                {(order.payment_status_wix === 'PAID' || order.external_payment_status === 'PAID') ? '✓ Ödendi' : '⚠ Ödenmedi'}
              </Badge>
            )}
          </div>
        </div>

        {/* Customer Info */}
        {(order.customer_phone || order.customer_email) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {order.customer_phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.customer_phone}</span>
            )}
            {order.customer_email && (
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {order.customer_email}</span>
            )}
          </div>
        )}

        {/* Delivery Address */}
        {order.delivery_address && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-2 border border-blue-200 dark:border-blue-800"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="flex-1">{order.delivery_address}</span>
            <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
          </a>
        )}

        {/* Items */}
        <div className="space-y-1">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.product_name}
                {item.extras?.length > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({item.extras.map(e => e.name).join(', ')})
                  </span>
                )}
              </span>
              <span className="font-medium">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
          <span className="font-bold text-primary text-lg">{formatCurrency(order.total)}</span>
          <div className="flex gap-1.5">
            {order.status === 'pending' && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 rounded-xl"
                onClick={() => onStatusChange(order.id, 'cancelled')}
                disabled={loading}
              >
                <X className="h-4 w-4" />
                Reddet
              </Button>
            )}
            {cfg.next && (
              <Button
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => onStatusChange(order.id, cfg.next)}
                disabled={loading}
              >
                <NextIcon className="h-4 w-4" />
                {cfg.nextLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}