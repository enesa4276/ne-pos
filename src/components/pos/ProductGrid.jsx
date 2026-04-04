import React from 'react';
import { cn } from '@/lib/utils';

export default function ProductGrid({ products, onProductClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          className={cn(
            "flex flex-col items-center justify-center p-4 rounded-2xl",
            "bg-card border border-border hover:border-primary/50",
            "hover:shadow-lg hover:shadow-primary/10 transition-all active:scale-95",
            "min-h-[100px] text-center group"
          )}
        >
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-14 h-14 rounded-xl object-cover mb-2 group-hover:scale-105 transition-transform"
            />
          )}
          <span className="font-semibold text-sm text-foreground leading-tight">
            {product.name}
          </span>
          <span className="text-primary font-bold text-base mt-1">
            €{product.base_price?.toFixed(2)}
          </span>
        </button>
      ))}
      {products.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          Bu kategoride ürün bulunmuyor
        </div>
      )}
    </div>
  );
}