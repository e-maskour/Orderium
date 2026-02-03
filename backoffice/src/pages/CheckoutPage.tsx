import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShoppingBag, Tag, DollarSign, Percent, CreditCard, Banknote, CheckCircle2, User, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  discountType: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
}

interface CheckoutState {
  cart: CartItem[];
  customer: Customer;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, dir } = useLanguage();
  const state = location.state as CheckoutState;

  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState(0); // 0 = amount, 1 = percentage
  const [paidAmount, setPaidAmount] = useState('');

  useEffect(() => {
    if (!state || !state.cart || !state.customer) {
      navigate('/pos');
    }
  }, [state, navigate]);

  if (!state || !state.cart || !state.customer) {
    return null;
  }

  const formatCurrency = (price: number) => {
    return language === 'ar' 
      ? `${price.toFixed(2)} د.م.`
      : `${price.toFixed(2)} DH`;
  };

  // Calculate items subtotal (with individual discounts)
  const itemsSubtotal = state.cart.reduce((sum, item) => {
    const itemSubtotal = item.product.price * item.quantity;
    const itemDiscount = item.discountType === 1 
      ? (itemSubtotal * item.discount) / 100 
      : item.discount;
    return sum + (itemSubtotal - itemDiscount);
  }, 0);

  // Calculate global discount amount
  const globalDiscountAmount = globalDiscountType === 1 
    ? (itemsSubtotal * globalDiscount) / 100 
    : globalDiscount;

  // Total after all discounts
  const total = itemsSubtotal - globalDiscountAmount;

  // Total items count
  const totalItemsCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Paid amount
  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: (data) => {
      const orderNumber = data?.order?.orderNumber || data?.orderNumber || data?.documentNumber;
      const orderId = data?.order?.id || data?.id;
      navigate('/checkout/success', {
        state: {
          orderNumber: orderNumber,
          orderId: orderId,
          customer: state.customer,
          items: state.cart,
          total: total,
          paidAmount: paid,
          change: change,
          orderDate: new Date(),
        }
      });
    },
    onError: (error: any) => {
      toast.error(error.message || t('error'));
    },
  });

  const handleConfirmOrder = () => {
    // Calculate items with proper structure
    const items = state.cart.map(item => {
      const quantity = item.quantity;
      const unitPrice = item.product.price;
      const itemSubtotal = quantity * unitPrice;
      const itemDiscountAmount = item.discountType === 1 
        ? (itemSubtotal * item.discount) / 100 
        : item.discount;
      const tax = 0;
      const itemTotal = itemSubtotal - itemDiscountAmount;
      
      return {
        productId: item.product.id,
        description: item.product.name || '',
        quantity: quantity,
        unitPrice: unitPrice,
        discount: itemDiscountAmount,
        discountType: item.discountType,
        tax: tax,
        total: itemTotal
      };
    });

    // Calculate order-level totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalTax = 0;
    const totalAmount = subtotal - globalDiscountAmount;

    const orderData = {
      customerId: state.customer.id,
      fromPortal: true,
      fromClient: false,
      deliveryStatus: 'pending',
      date: new Date().toISOString(),
      subtotal: subtotal,
      tax: totalTax,
      discount: globalDiscountAmount,
      discountType: globalDiscountType,
      total: totalAmount,
      notes: '',
      items: items
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/pos')}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{t('cart')}</h1>
              <p className="text-sm text-gray-500">Review and confirm order</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Info */}
            <p className="text-sm text-gray-700 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{state.customer.name}</span>
              </span>
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{state.customer.phone}</span>
              </span>
              {state.customer.address && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{state.customer.address}</span>
                  </span>
                </>
              )}
            </p>

            {/* Cart Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  {t('items')}
                </h2>
                <span className="text-sm text-gray-500">
                  {totalItemsCount} {totalItemsCount === 1 ? t('piece') : t('pieces')}
                </span>
              </div>

              <div className="space-y-3">
                {state.cart.map((item) => {
                  const itemSubtotal = item.product.price * item.quantity;
                  const itemDiscountAmount = item.discountType === 1 
                    ? (itemSubtotal * item.discount) / 100 
                    : item.discount;
                  const itemTotal = itemSubtotal - itemDiscountAmount;

                  return (
                    <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{item.product.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>{formatCurrency(item.product.price)} × {item.quantity}</span>
                          {item.discount > 0 && (
                            <span className="text-orange-600 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              -{item.discountType === 1 ? `${item.discount}%` : formatCurrency(item.discount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{formatCurrency(itemTotal)}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-gray-400 line-through">{formatCurrency(itemSubtotal)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


          </div>

          {/* Right Column - Summary & Payment */}
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

              {/* Global Discount */}
              <div className="pt-4 pb-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-orange-500" />
                  {t('discount')}
                </h3>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setGlobalDiscountType(0);
                        setGlobalDiscount(0);
                      }}
                      className={`flex-1 h-9 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                        globalDiscountType === 0
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      Amount
                    </button>
                    <button
                      onClick={() => {
                        setGlobalDiscountType(1);
                        setGlobalDiscount(0);
                      }}
                      className={`flex-1 h-9 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                        globalDiscountType === 1
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <Percent className="w-4 h-4" />
                      Percentage
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      value={globalDiscount || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const max = globalDiscountType === 1 ? 100 : itemsSubtotal;
                        setGlobalDiscount(Math.min(value, max));
                      }}
                      placeholder={`${t('discount')} ${globalDiscountType === 1 ? '(%)' : `(${t('currency')})`}`}
                      className="w-full h-10 px-4 text-sm border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {globalDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('discount')}</span>
                    <span className="font-medium text-orange-600">-{formatCurrency(globalDiscountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('subtotal')}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(itemsSubtotal)}</span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{t('total')}</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t('payment')}
                </h3>

                <div className="space-y-3">
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="Paid Amount"
                      className="w-full h-12 pl-10 pr-4 text-lg border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  {paid > 0 && (
                    <div className={`p-3 rounded-lg ${change >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('change')}</span>
                        <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(change))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmOrder}
                disabled={createOrderMutation.isPending || paid < total}
                className="w-full mt-6 h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {createOrderMutation.isPending ? t('loading') : t('confirm') || 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
