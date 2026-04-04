import React from 'react';
import { cn } from '@/lib/utils';

const statusConfig = {
  empty: { color: 'emerald', label: 'Boş' },
  occupied: { color: 'red', label: 'Dolu' },
  bill_requested: { color: 'amber', label: 'Hesap İstendi' },
};

export default function TableGrid({ tables, onTableClick }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {tables.map((table) => {
        const cfg = statusConfig[table.status] || statusConfig.empty;
        return (
          <button
            key={table.id}
            onClick={() => onTableClick(table)}
            className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
              "hover:shadow-lg active:scale-95 min-h-[100px]",
              `bg-${cfg.color}-500/20 border-${cfg.color}-500/40`
            )}
          >
            <div className={cn("w-3 h-3 rounded-full mb-2", `bg-${cfg.color}-500`)} />
            <span className="font-bold text-base">{table.name}</span>
            <span className={cn("text-xs mt-0.5", `text-${cfg.color}-400`)}>{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}