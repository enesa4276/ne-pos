import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import CategoryManager from '@/components/admin/CategoryManager';
import ExtraManager from '@/components/admin/ExtraManager';
import ProductManager from '@/components/admin/ProductManager';
import TableManager from '@/components/admin/TableManager';
import DiscountManager from '@/components/admin/DiscountManager';

export default function Admin() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-12">
        <h1 className="text-2xl font-bold">Yönetim Paneli</h1>
        <div className="grid gap-6">
          <TableManager />
          <CategoryManager />
          <ExtraManager />
          <ProductManager />
          <div className="bg-card rounded-2xl border border-border p-4">
            <DiscountManager />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}