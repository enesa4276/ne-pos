import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProductManager from '@/components/admin/ProductManager';
import CategoryManager from '@/components/admin/CategoryManager';
import ExtraManager from '@/components/admin/ExtraManager';
import DiscountManager from '@/components/admin/DiscountManager';
import MenuPhotoImport from '@/components/admin/MenuPhotoImport';

export default function Admin() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">Menü Yönetimi</h1>
      <Tabs defaultValue="products">
        <TabsList className="rounded-xl flex-wrap h-auto">
          <TabsTrigger value="products" className="rounded-lg">Ürünler</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg">Kategoriler</TabsTrigger>
          <TabsTrigger value="extras" className="rounded-lg">Ekstralar</TabsTrigger>
          <TabsTrigger value="discounts" className="rounded-lg">İndirimler</TabsTrigger>
          <TabsTrigger value="ai-import" className="rounded-lg gap-1">✨ AI ile İçe Aktar</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ProductManager /></TabsContent>
        <TabsContent value="categories" className="mt-4"><CategoryManager /></TabsContent>
        <TabsContent value="extras" className="mt-4"><ExtraManager /></TabsContent>
        <TabsContent value="discounts" className="mt-4"><DiscountManager /></TabsContent>
        <TabsContent value="ai-import" className="mt-4"><MenuPhotoImport /></TabsContent>
      </Tabs>
    </div>
  );
}