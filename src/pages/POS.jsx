import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import CategoryTabs from '@/components/pos/CategoryTabs';
import ProductGrid from '@/components/pos/ProductGrid';
import CartPanel from '@/components/pos/CartPanel';
import ExtrasPopup from '@/components/pos/ExtrasPopup';
import PaymentDialog from '@/components/pos/PaymentDialog';
import { KitchenReceipt, CustomerReceipt } from '@/components/pos/ReceiptPrint';

export default function POS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get('tableId');
  const tableName = urlParams.get('tableName');
  const isTakeaway = urlParams.get('type') === 'takeaway';

  const { data: user } = useCurrentUser();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [extrasProduct, setExtrasProduct] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [printMode, setPrintMode] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.email],
    queryFn: () => base44.entities.Category.filter({ created_by: user?.email }, 'sort_order'),
    enabled: !!user?.email,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', user?.email],
    queryFn: () => base44.entities.Product.filter({ created_by: user?.email }, 'name'),
    enabled: !!user?.email,
  });

  const { data: extraGroups = [] } = useQuery({
    queryKey: ['extraGroups', user?.email],
    queryFn: () => base44.entities.ExtraGroup.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { data: extras = [] } = useQuery({
    queryKey: ['extras', user?.email],
    queryFn: () => base44.entities.Extra.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const createOrder = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const updateTable = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantTable.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  });

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const orderLabel = isTakeaway ? 'Paket Sipariş' : tableName || 'Sipariş';

  const handleProductClick = (product) => {
    const hasExtras = product.extra_group_ids?.length > 0;
    if (hasExtras) {
      setExtrasProduct(product);
    } else {
      addToCart({
        product_id: product.id,
        product_name: product.name,
        base_price: product.base_price,
        extras: [],
        quantity: 1,
        subtotal: product.base_price,
      });
    }
  };

  const addToCart = (item) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        i => i.product_id === item.product_id &&
          JSON.stringify(i.extras) === JSON.stringify(item.extras)
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += item.quantity;
        const unitPrice = updated[existingIdx].base_price +
          updated[existingIdx].extras.reduce((s, e) => s + e.price, 0);
        updated[existingIdx].subtotal = unitPrice * updated[existingIdx].quantity;
        return updated;
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (idx, newQty) => {
    if (newQty <= 0) {
      setCartItems(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setCartItems(prev => {
      const updated = [...prev];
      updated[idx].quantity = newQty;
      const unitPrice = updated[idx].base_price +
        updated[idx].extras.reduce((s, e) => s + e.price, 0);
      updated[idx].subtotal = unitPrice * newQty;
      return updated;
    });
  };

  const removeItem = (idx) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSendKitchen = async () => {
    // Sadece mutfak fişi yazdır, sipariş oluşturma
    setPrintMode('kitchen');
    setTimeout(() => {
      window.print();
      setPrintMode(null);
      toast.success('Mutfağa gönderildi!');
    }, 200);
  };

  const handlePayment = (total) => {
    setPaymentTotal(total);
    setShowPayment(true);
  };

  const handlePayLater = async () => {
    setShowPayment(false);
    const subtotal = cartItems.reduce((s, i) => s + i.subtotal, 0);
    const total = subtotal + subtotal * 0.10;

    await createOrder.mutateAsync({
      order_type: isTakeaway ? 'takeaway' : 'dine_in',
      table_id: tableId || null,
      table_name: tableName || (isTakeaway ? 'Paket' : ''),
      items: cartItems,
      status: 'open',
      total,
      sent_to_kitchen: true,
    });

    if (tableId) {
      await updateTable.mutateAsync({ id: tableId, data: { status: 'occupied' } });
    }

    toast.success('Sipariş kaydedildi!');
    setCartItems([]);
    navigate('/');
  };

  const handlePaymentComplete = async (method) => {
    setShowPayment(false);
    const subtotal = cartItems.reduce((s, i) => s + i.subtotal, 0);
    const total = subtotal + subtotal * 0.10;

    await createOrder.mutateAsync({
      order_type: isTakeaway ? 'takeaway' : 'dine_in',
      table_id: tableId || null,
      table_name: tableName || (isTakeaway ? 'Paket' : ''),
      items: cartItems,
      status: 'paid',
      payment_method: method,
      total,
      sent_to_kitchen: true,
    });

    if (tableId) {
      await updateTable.mutateAsync({ id: tableId, data: { status: 'empty' } });
    }

    setPrintMode('customer');
    setTimeout(() => {
      window.print();
      setPrintMode(null);
      toast.success('Ödeme alındı!');
      setCartItems([]);
      navigate('/');
    }, 200);
  };

  const handleCancel = () => {
    setCartItems([]);
    toast('Sipariş iptal edildi');
  };

  const currentOrder = {
    order_type: isTakeaway ? 'takeaway' : 'dine_in',
    table_name: tableName || 'Paket',
    items: cartItems,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg">{orderLabel}</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Menu */}
        <div className="flex-[3] flex flex-col overflow-hidden border-r border-border">
          <div className="p-3 border-b border-border">
            <CategoryTabs
              categories={categories}
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ProductGrid products={filteredProducts} onProductClick={handleProductClick} />
          </div>
        </div>

        {/* Right - Cart */}
        <div className="flex-[2] flex flex-col min-w-[320px] max-w-[440px]">
          <CartPanel
            items={cartItems}
            orderLabel={orderLabel}
            onUpdateQty={updateQuantity}
            onRemove={removeItem}
            onPayment={handlePayment}
            onSendKitchen={handleSendKitchen}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Extras Popup */}
      <ExtrasPopup
        open={!!extrasProduct}
        onClose={() => setExtrasProduct(null)}
        product={extrasProduct}
        extraGroups={extraGroups}
        extras={extras}
        onAdd={addToCart}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        total={paymentTotal}
        onComplete={handlePaymentComplete}
        onPayLater={handlePayLater}
      />

      {/* Print Templates (hidden) */}
      {printMode === 'kitchen' && <KitchenReceipt order={currentOrder} />}
      {printMode === 'customer' && <CustomerReceipt order={currentOrder} total={paymentTotal} />}
    </div>
  );
}