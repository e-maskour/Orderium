import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingBag,
  Tag,
  DollarSign,
  Percent,
  CreditCard,
  Banknote,
  CheckCircle2,
  User,
  Phone,
  MapPin,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { toastError } from '../services/toast.service';
import {
  posService,
  IPosCartItem as CartItem,
  ICheckoutCustomer as Customer,
  ICheckoutState,
} from '../modules/pos';
import { orderPaymentsService } from '../modules';
import { formatCurrency } from '@orderium/ui';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, dir } = useLanguage();
  const queryClient = useQueryClient();
  const state = location.state as ICheckoutState;

  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState(0);
  const [paidAmount, setPaidAmount] = useState('');

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const order = await posService.createOrder(orderData);
      if (paid > 0) {
        await orderPaymentsService.create({
          orderId: order.id,
          customerId: order.customerId ?? undefined,
          amount: Math.min(paid, order.total),
          paymentDate: new Date().toISOString(),
          paymentType: 'cash',
        });
      }
      return order;
    },
    onSuccess: (data: any) => {
      const orderNumber = data?.order?.orderNumber || data?.orderNumber || data?.documentNumber;
      const orderId = data?.order?.id || data?.id;
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/checkout/success', {
        state: {
          orderNumber,
          orderId,
          customer: state?.customer,
          items: state?.cart,
          total,
          paidAmount: paid,
          change,
          orderDate: new Date(),
        },
      });
    },
    onError: (error: any) => {
      toastError(error.message || t('error'));
    },
  });

  useEffect(() => {
    if (!state || !state.cart || !state.customer) {
      navigate('/pos');
    }
  }, [state, navigate]);

  if (!state || !state.cart || !state.customer) {
    return null;
  }

  const itemsSubtotal = state.cart.reduce((sum, item) => {
    const itemSubtotal = item.product.price * item.quantity;
    const itemDiscount =
      item.discountType === 1 ? (itemSubtotal * item.discount) / 100 : item.discount;
    return sum + (itemSubtotal - itemDiscount);
  }, 0);

  const globalDiscountAmount =
    globalDiscountType === 1 ? (itemsSubtotal * globalDiscount) / 100 : globalDiscount;

  const total = itemsSubtotal - globalDiscountAmount;
  const totalItemsCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const handleConfirmOrder = () => {
    const items = state.cart.map((item) => {
      const quantity = item.quantity;
      const unitPrice = item.product.price;
      const itemSubtotal = quantity * unitPrice;
      const itemDiscountAmount =
        item.discountType === 1 ? (itemSubtotal * item.discount) / 100 : item.discount;
      const tax = 0;
      const itemTotal = itemSubtotal - itemDiscountAmount;

      return {
        productId: item.product.id,
        description: item.product.name || '',
        quantity,
        unitPrice,
        discount: itemDiscountAmount,
        discountType: item.discountType,
        tax,
        total: itemTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalTax = 0;
    const totalAmount = subtotal - globalDiscountAmount;

    const orderData = {
      customerId: state.customer.id,
      customerName: state.customer.name || undefined,
      customerPhone: state.customer.phone || undefined,
      originType: 'ADMIN_POS',
      deliveryStatus: 'pending',
      date: new Date().toISOString(),
      subtotal,
      tax: totalTax,
      discount: globalDiscountAmount,
      discountType: globalDiscountType,
      total: totalAmount,
      notes: '',
      items,
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button
              icon={<ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />}
              onClick={() => navigate('/pos')}
              text
              rounded
              style={{ width: '2.5rem', height: '2.5rem', backgroundColor: '#f3f4f6' }}
            />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {t('cart')}
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                {t('reviewAndConfirmOrder')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* Left Column - Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Customer Info */}
            <p
              style={{
                fontSize: '0.875rem',
                color: '#374151',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.75rem',
                margin: 0,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User style={{ width: '1rem', height: '1rem', color: '#9ca3af' }} />
                <span style={{ fontWeight: 500 }}>{state.customer.name}</span>
              </span>
              <span style={{ color: '#d1d5db' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Phone style={{ width: '1rem', height: '1rem', color: '#9ca3af' }} />
                <span>{state.customer.phone}</span>
              </span>
              {state.customer.address && (
                <>
                  <span style={{ color: '#d1d5db' }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin style={{ width: '1rem', height: '1rem', color: '#9ca3af' }} />
                    <span>{state.customer.address}</span>
                  </span>
                </>
              )}
            </p>

            {/* Cart Items */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: 0,
                  }}
                >
                  <ShoppingBag style={{ width: '1.25rem', height: '1.25rem' }} />
                  {t('items')}
                </h2>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {totalItemsCount} {totalItemsCount === 1 ? t('piece') : t('pieces')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {state.cart.map((item) => {
                  const itemSubtotal = item.product.price * item.quantity;
                  const itemDiscountAmount =
                    item.discountType === 1 ? (itemSubtotal * item.discount) / 100 : item.discount;
                  const itemTotal = itemSubtotal - itemDiscountAmount;

                  return (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontWeight: 500,
                            color: '#111827',
                            marginBottom: '0.25rem',
                            margin: 0,
                          }}
                        >
                          {item.product.name}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.875rem',
                            color: '#4b5563',
                          }}
                        >
                          <span>
                            {formatCurrency(item.product.price, language as 'fr' | 'ar')} ×{' '}
                            {item.quantity}
                          </span>
                          {item.discount > 0 && (
                            <span
                              style={{
                                color: '#ea580c',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Tag style={{ width: '0.75rem', height: '0.75rem' }} />-
                              {item.discountType === 1
                                ? `${item.discount}%`
                                : formatCurrency(item.discount, language as 'fr' | 'ar')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {formatCurrency(itemTotal, language as 'fr' | 'ar')}
                        </div>
                        {item.discount > 0 && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                              textDecoration: 'line-through',
                            }}
                          >
                            {formatCurrency(itemSubtotal, language as 'fr' | 'ar')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Payment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Order Summary */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
                position: 'sticky',
                top: '6rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#111827',
                  margin: '0 0 1rem 0',
                }}
              >
                {t('orderSummary')}
              </h2>

              {/* Global Discount */}
              <div
                style={{
                  paddingTop: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <h3
                  style={{
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Tag style={{ width: '1.25rem', height: '1.25rem', color: '#f97316' }} />
                  {t('discount')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      icon={<DollarSign style={{ width: '1rem', height: '1rem' }} />}
                      label={t('amount')}
                      onClick={() => {
                        setGlobalDiscountType(0);
                        setGlobalDiscount(0);
                      }}
                      style={{
                        flex: 1,
                        height: '2.25rem',
                        borderRadius: '0.5rem',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        backgroundColor: globalDiscountType === 0 ? '#f97316' : '#f3f4f6',
                        borderColor: globalDiscountType === 0 ? '#f97316' : '#f3f4f6',
                        color: globalDiscountType === 0 ? '#ffffff' : '#374151',
                      }}
                    />
                    <Button
                      icon={<Percent style={{ width: '1rem', height: '1rem' }} />}
                      label={t('percentage')}
                      onClick={() => {
                        setGlobalDiscountType(1);
                        setGlobalDiscount(0);
                      }}
                      style={{
                        flex: 1,
                        height: '2.25rem',
                        borderRadius: '0.5rem',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        backgroundColor: globalDiscountType === 1 ? '#f97316' : '#f3f4f6',
                        borderColor: globalDiscountType === 1 ? '#f97316' : '#f3f4f6',
                        color: globalDiscountType === 1 ? '#ffffff' : '#374151',
                      }}
                    />
                  </div>

                  <div>
                    <InputText
                      type="number"
                      value={String(globalDiscount || '')}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const max = globalDiscountType === 1 ? 100 : itemsSubtotal;
                        setGlobalDiscount(Math.min(value, max));
                      }}
                      placeholder={`${t('discount')} ${globalDiscountType === 1 ? '(%)' : `(${t('currency')})`}`}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                {globalDiscount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: '#4b5563' }}>{t('discount')}</span>
                    <span style={{ fontWeight: 500, color: '#ea580c' }}>
                      -{formatCurrency(globalDiscountAmount, language as 'fr' | 'ar')}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: '#4b5563' }}>{t('subtotal')}</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>
                    {formatCurrency(itemsSubtotal, language as 'fr' | 'ar')}
                  </span>
                </div>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#111827' }}>{t('total')}</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {formatCurrency(total, language as 'fr' | 'ar')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div
                style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <h3
                  style={{
                    fontWeight: 600,
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: 0,
                  }}
                >
                  <CreditCard style={{ width: '1.25rem', height: '1.25rem' }} />
                  {t('payment')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Banknote
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    />
                    <InputText
                      type="number"
                      value={String(paidAmount)}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={t('paidAmount')}
                      style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '1.125rem' }}
                    />
                  </div>

                  {paid > 0 && (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: change >= 0 ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${change >= 0 ? '#bbf7d0' : '#fecaca'}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.875rem',
                        }}
                      >
                        <span style={{ color: '#4b5563' }}>{t('change')}</span>
                        <span
                          style={{ fontWeight: 600, color: change >= 0 ? '#16a34a' : '#dc2626' }}
                        >
                          {formatCurrency(Math.abs(change), language as 'fr' | 'ar')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                label={
                  createOrderMutation.isPending
                    ? t('loading') || 'Loading...'
                    : t('confirm') || 'Confirm Order'
                }
                icon={<CheckCircle2 style={{ width: '1rem', height: '1rem' }} />}
                onClick={handleConfirmOrder}
                disabled={createOrderMutation.isPending}
                loading={createOrderMutation.isPending}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  height: '3rem',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
