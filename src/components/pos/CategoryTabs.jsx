import React from 'react';
import { cn } from '@/lib/utils';

export default function CategoryTabs({ categories, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold transition-all",
          !selectedId
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "bg-card text-muted-foreground hover:bg-secondary border border-border"
        )}
      >
        Tümü
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
            selectedId === cat.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-card text-muted-foreground hover:bg-secondary border border-border"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}