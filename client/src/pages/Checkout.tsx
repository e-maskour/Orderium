import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { checkoutSchema, CheckoutFormValues } from '@/modules/checkout/checkout.schema';
import { TranslationKey } from '@/lib/i18n';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { notify } from '@orderium/ui';
import { partnersService, ordersService } from '@/modules';
import { authService } from '@/modules/auth';
import { AddressInput } from '@/components/AddressInput';

const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http')) return imageUrl;
  const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${minioPublicUrl}/orderium-media/${imageUrl}`;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { language, t, dir } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [existingCustomerId, setExistingCustomerId] = useState<number | null>(null);
  const [mapsLink, setMapsLink] = useState<string | null>(null);
  const [wazeLink, setWazeLink] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      phone: user?.phoneNumber || '',
      address: '',
      note: '',
    },
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const nameValue = watch('name');
  const addressValue = watch('address');

  const isFormValid = nameValue?.trim().length > 0 && addressValue?.trim().length > 0;

  const isCustomerInfoComplete =
    nameValue?.trim().length > 0 &&
    addressValue?.trim().length > 0 &&
    (mapsLink != null || wazeLink != null || (latitude != null && longitude != null));

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const loadCustomerInfo = useCallback(async (portalUserId: number) => {
    setIsSearchingCustomer(true);
    try {
      const result = await authService.getPortalUserById(portalUserId);
      if (result && (result.exists || result.customerId)) {
        setExistingCustomerId(result.customerId ?? null);
        setValue('name', result.name || result.customerName || '');
        setValue('address', result.deliveryAddress || result.address || '');
        setValue('note', '');
        setLatitude(result.latitude);
        setLongitude(result.longitude);
        if (result.googleMapsUrl) setMapsLink(result.googleMapsUrl);
        if (result.wazeUrl) setWazeLink(result.wazeUrl);
      } else {
        setExistingCustomerId(null);
      }
    } catch {
      setExistingCustomerId(null);
    } finally {
      setIsSearchingCustomer(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) loadCustomerInfo(user.id);
  }, [user?.id, loadCustomerInfo]);

  const handleAddressChange = (address: string, lat?: number, lng?: number) => {
    setValue('address', address, { shouldValidate: true });
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleMapsLinksChange = (googleMaps: string | null, waze: string | null) => {
    setMapsLink(googleMaps);
    setWazeLink(waze);
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      let customerId: number | undefined = existingCustomerId ?? undefined;
      try {
        const partnerResult = await partnersService.upsert({
          phoneNumber: data.phone,
          name: data.name,
          deliveryAddress: data.address,
          latitude,
          longitude,
          googleMapsUrl: mapsLink || undefined,
          wazeUrl: wazeLink || undefined,
          portalPhoneNumber: user?.phoneNumber,
        });
        customerId = partnerResult.id;
      } catch {
        // upsert failed — keep existingCustomerId if available
      }

      if (!customerId) {
        notify.error(t('orderCreationError'));
        return;
      }

      const orderItems = items.map((item) => ({
        productId: item.product.id,
        description: item.product.name || '',
        quantity: item.quantity,
        unitPrice: item.product.price,
        discount: 0,
        discountType: 0,
        tax: 0,
        total: item.quantity * item.product.price,
      }));

      const orderResult = await ordersService.create({
        customerId,
        customerPhone: data.phone,
        customerName: data.name,
        customerAddress: data.address,
        items: orderItems,
        note: data.note,
        subtotal,
        tax: 0,
        discount: 0,
        discountType: 0,
        total: subtotal,
        originType: 'CLIENT_POS',
      });

      navigate('/success', {
        state: {
          orderNumber: orderResult.data.orderNumber,
          orderId: orderResult.data.id,
          total: subtotal,
          customerName: data.name,
          customerPhone: data.phone,
          customerAddress: data.address,
          items,
        },
      });
      clearCart();
    } catch {
      notify.error(t('orderCreationError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#f8fafc',
        }}
        dir={dir}
      >
        <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '50%',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Package size={32} color="#d1d5db" />
          </div>
          <h2 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {t('emptyCart')}
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{t('emptyCartMessage')}</p>
          <Link to="/">
            <button
              style={{
                padding: '0.9375rem 2rem',
                borderRadius: '0.875rem',
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('continueShopping')}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }} dir={dir}>
      {/* Sticky header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          paddingTop: 'env(safe-area-inset-top, 0)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0 1rem',
            height: '3.75rem',
          }}
        >
          <Link to="/">
            <button
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
              }}
            >
              <BackIcon size={18} />
            </button>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} color="#059669" />
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#0f172a' }}>
              {t('checkoutTitle')}
            </h1>
          </div>
        </div>
      </header>

      <main style={{ padding: '1rem', maxWidth: '72rem', margin: '0 auto' }}>
        <div className="grid">
          {/* Form column */}
          <div className="col-12 lg:col-6">
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              {/* Customer info card */}
              <div
                style={{
                  background: 'white',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  border: '1px solid #f0f0f0',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 1.125rem',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <User size={16} color="#059669" /> {t('customerInfo')}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* Phone */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <label
                        htmlFor="phone"
                        style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        <Phone size={13} color="#059669" /> {t('phone')}
                      </label>
                      {isSearchingCustomer && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {t('searching')}…
                        </span>
                      )}
                      {existingCustomerId && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            background: '#d1fae5',
                            color: '#059669',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontWeight: 700,
                          }}
                        >
                          {t('existingCustomer')}
                        </span>
                      )}
                    </div>
                    <InputText
                      id="phone"
                      type="tel"
                      {...register('phone')}
                      placeholder={t('phonePlaceholder')}
                      className={`w-full${errors.phone ? ' p-invalid' : ''}`}
                      style={{
                        height: '3.25rem',
                        fontSize: '1rem',
                        borderColor: existingCustomerId ? '#059669' : undefined,
                      }}
                      dir="ltr"
                      disabled
                    />
                    {errors.phone && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>
                        {t(errors.phone.message as TranslationKey)}
                      </p>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <User size={13} color="#059669" /> {t('name')}{' '}
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <InputText
                      id="name"
                      {...register('name')}
                      placeholder={t('namePlaceholder')}
                      className={`w-full${errors.name ? ' p-invalid' : ''}`}
                      style={{ height: '3.25rem', fontSize: '1rem' }}
                    />
                    {errors.name && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>
                        {t(errors.name.message as TranslationKey)}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label
                      htmlFor="address"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <MapPin size={13} color="#059669" /> {t('address')}{' '}
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <AddressInput
                      value={watch('address')}
                      onChange={handleAddressChange}
                      onMapsLinksChange={handleMapsLinksChange}
                      error={
                        errors.address?.message
                          ? t(errors.address.message as TranslationKey)
                          : undefined
                      }
                      placeholder={t('addressPlaceholder')}
                      googleMapsUrl={mapsLink}
                      wazeUrl={wazeLink}
                    />
                    {errors.address && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>
                        {t(errors.address.message as TranslationKey)}
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label
                      htmlFor="note"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <FileText size={13} color="#059669" /> {t('note')}
                    </label>
                    <InputTextarea
                      id="note"
                      {...register('note')}
                      placeholder={t('notePlaceholder')}
                      rows={3}
                      autoResize
                      className="w-full"
                      style={{ fontSize: '0.9375rem', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit (mobile only) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  style={{
                    width: '100%',
                    padding: '1.0625rem',
                    borderRadius: '0.875rem',
                    border: 'none',
                    background:
                      isSubmitting || !isFormValid
                        ? '#9ca3af'
                        : 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.0625rem',
                    cursor: isSubmitting || !isFormValid ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow:
                      isSubmitting || !isFormValid ? 'none' : '0 4px 16px rgba(5,150,105,0.4)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        style={{
                          width: '1.125rem',
                          height: '1.125rem',
                          border: '2px solid rgba(255,255,255,0.35)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'cl-spin 0.75s linear infinite',
                        }}
                      />
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      {t('placeOrder')} · <strong>{formatCurrency(subtotal, language)}</strong>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order summary column */}
          <div className="col-12 lg:col-6">
            <div
              style={{
                background: 'white',
                borderRadius: '1rem',
                padding: '1.25rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                border: '1px solid #f0f0f0',
                position: 'sticky',
                top: '5rem',
              }}
            >
              <h2
                style={{
                  margin: '0 0 1rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShoppingBag size={16} color="#059669" /> {t('orderSummary')}
              </h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                  maxHeight: '18rem',
                  overflowY: 'auto',
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.product.imageUrl ? (
                        <img
                          src={getImageUrl(item.product.imageUrl)}
                          alt={item.product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <Package size={16} color="#d1d5db" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: '0 0 0.125rem',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.product.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                        {item.quantity} × {formatCurrency(item.product.price, language)}
                      </p>
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: '#0f172a',
                        flexShrink: 0,
                      }}
                    >
                      {formatCurrency(item.product.price * item.quantity, language)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.875rem',
                  background: '#f0fdf4',
                  borderRadius: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#374151', fontWeight: 700 }}>{t('total')}</span>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    color: '#059669',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatCurrency(subtotal, language)}
                </span>
              </div>

              {/* Submit (desktop) */}
              <div className="hidden lg:block" style={{ marginTop: '1.125rem' }}>
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting || !isFormValid}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '0.875rem',
                    border: 'none',
                    background:
                      isSubmitting || !isFormValid
                        ? '#9ca3af'
                        : 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: isSubmitting || !isFormValid ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow:
                      isSubmitting || !isFormValid ? 'none' : '0 4px 16px rgba(5,150,105,0.35)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        style={{
                          width: '1.125rem',
                          height: '1.125rem',
                          border: '2px solid rgba(255,255,255,0.35)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'cl-spin 0.75s linear infinite',
                        }}
                      />
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      {t('placeOrder')} · {formatCurrency(subtotal, language)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
