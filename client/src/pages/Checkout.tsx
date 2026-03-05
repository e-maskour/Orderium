import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, validateMoroccanPhone } from '@/lib/i18n';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { toastError } from '@/services/toast.service';
import { partnersService, ordersService, Partner } from '@/modules';
import { AddressInput } from '@/components/AddressInput';

const getImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined;
  // Full URL (MinIO or any absolute URL): use directly
  if (imageUrl.startsWith('http')) return imageUrl;
  // Legacy fallback: construct from MinIO public URL
  const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${minioPublicUrl}/orderium-media/${imageUrl}`;
};

interface FormData {
  name: string;
  phone: string;
  address: string;
  note: string;
  latitude?: number;
  longitude?: number;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { language, t, dir } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<Partner | null>(null);
  const [mapsLink, setMapsLink] = useState<string | null>(null);
  const [wazeLink, setWazeLink] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: user?.phoneNumber || '',
    address: '',
    note: '',
    latitude: undefined,
    longitude: undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const isFormValid =
    formData.name.trim().length > 0 &&
    formData.phone.trim().length > 0 &&
    validateMoroccanPhone(formData.phone) &&
    formData.address.trim().length > 0;

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const searchCustomerByPhone = useCallback(async (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (cleanPhone.length < 10) {
      setExistingCustomer(null);
      return;
    }

    setIsSearchingCustomer(true);
    try {
      const result = await partnersService.searchByPhone(cleanPhone);
      if (result && result.length > 0) {
        const customer = result[0];
        setExistingCustomer(customer);
        setFormData(prev => ({
          ...prev,
          name: customer.name,
          address: customer.address || '',
          note: '',
          latitude: customer.latitude,
          longitude: customer.longitude,
        }));
        if (customer.googleMapsUrl) setMapsLink(customer.googleMapsUrl);
        if (customer.wazeUrl) setWazeLink(customer.wazeUrl);
        setErrors({});
      } else {
        setExistingCustomer(null);
        setFormData(prev => ({
          ...prev,
          name: '',
          address: '',
          note: '',
          latitude: undefined,
          longitude: undefined,
        }));
        setMapsLink(null);
        setWazeLink(null);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setExistingCustomer(null);
    } finally {
      setIsSearchingCustomer(false);
    }
  }, []);

  useEffect(() => {
    if (user?.phoneNumber) {
      searchCustomerByPhone(user.phoneNumber);
    }
  }, [user?.phoneNumber, searchCustomerByPhone]);

  const handleAddressChange = (address: string, latitude?: number, longitude?: number) => {
    setFormData(prev => ({ ...prev, address, latitude, longitude }));
    if (errors.address) {
      setErrors(prev => ({ ...prev, address: undefined }));
    }
  };

  const handleMapsLinksChange = (googleMaps: string | null, waze: string | null) => {
    setMapsLink(googleMaps);
    setWazeLink(waze);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = t('nameRequired');
    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneRequired');
    } else if (!validateMoroccanPhone(formData.phone)) {
      newErrors.phone = t('phoneInvalid');
    }
    if (!formData.address.trim()) newErrors.address = t('addressRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      let customerId: number | undefined;
      try {
        const partnerResult = await partnersService.upsert({
          phoneNumber: formData.phone,
          name: formData.name,
          deliveryAddress: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          googleMapsUrl: mapsLink || undefined,
          wazeUrl: wazeLink || undefined,
          portalPhoneNumber: user?.phoneNumber,
        });
        customerId = partnerResult.id;
      } catch (error) {
        console.error('Failed to save partner:', error);
      }

      const orderItems = items.map(item => {
        const itemSubtotal = item.quantity * item.product.price;
        const itemDiscount = 0;
        const itemTotal = itemSubtotal - itemDiscount;
        return {
          productId: item.product.id,
          description: item.product.name || '',
          quantity: item.quantity,
          unitPrice: item.product.price,
          discount: itemDiscount,
          discountType: 0,
          tax: 0,
          total: itemTotal,
        };
      });

      const orderSubtotal = subtotal;
      const orderTax = 0;
      const orderDiscount = 0;
      const orderTotal = orderSubtotal + orderTax - orderDiscount;

      const orderResult = await ordersService.create({
        customerId,
        customerPhone: formData.phone,
        items: orderItems,
        note: formData.note,
        subtotal: orderSubtotal,
        tax: orderTax,
        discount: orderDiscount,
        discountType: 0,
        total: orderTotal,
        fromPortal: true,
        fromClient: true,
        deliveryStatus: 'pending',
      });

      navigate('/success', {
        state: {
          orderNumber: orderResult.documentNumber,
          orderId: orderResult.order.id,
          total: subtotal,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          items,
        }
      });

      clearCart();
    } catch (error) {
      console.error('Order creation failed:', error);
      toastError(t('orderCreationError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex align-items-center justify-content-center p-4 surface-ground" style={{ minHeight: '100vh' }} dir={dir}>
        <div className="text-center">
          <div className="flex align-items-center justify-content-center border-circle mx-auto mb-4" style={{ width: '5rem', height: '5rem', background: 'var(--surface-100)' }}>
            <Package style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-color-secondary)' }} />
          </div>
          <h2 className="text-xl font-semibold text-color mb-2">{t('emptyCart')}</h2>
          <p className="text-color-secondary mb-4">{t('emptyCartMessage')}</p>
          <Link to="/">
            <Button label={t('continueShopping')} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-ground" style={{ minHeight: '100vh' }} dir={dir}>
      {/* Header */}
      <header className="sticky surface-card shadow-1 border-bottom-1 surface-border" style={{ top: 0, zIndex: 40, backdropFilter: 'blur(8px)' }}>
        <div className="px-3 sm:px-4 flex align-items-center gap-3" style={{ height: '3.5rem' }}>
          <Link to="/">
            <Button icon={<BackIcon style={{ width: '1.125rem', height: '1.125rem' }} />} text rounded aria-label={t('goBack')} />
          </Link>
          <h1 className="text-lg font-bold text-color">{t('checkoutTitle')}</h1>
        </div>
      </header>

      <main className="px-3 sm:px-4 py-4 sm:py-5">
        <div className="grid">
          {/* Form */}
          <div className="col-12 lg:col-6">
            <form onSubmit={handleSubmit} className="flex flex-column gap-4">
              <div className="surface-card border-round-xl sm:border-round-2xl p-4 sm:p-5 shadow-1">
                <h2 className="text-base sm:text-lg font-semibold text-color mb-3">{t('customerInfo')}</h2>

                <div className="flex flex-column gap-4">
                  {/* Phone */}
                  <div className="flex flex-column gap-2">
                    <div className="flex align-items-center justify-content-between">
                      <label htmlFor="phone" className="font-medium">{t('phone')} *</label>
                      {isSearchingCustomer && (
                        <span className="text-xs text-color-secondary flex align-items-center gap-1">
                          <ProgressSpinner style={{ width: '0.75rem', height: '0.75rem' }} strokeWidth="6" />
                          {t('searching')}
                        </span>
                      )}
                      {existingCustomer && (
                        <span className="text-xs px-2 py-1 border-round-xl" style={{ background: '#dcfce7', color: '#15803d' }}>
                          {t('existingCustomer')}
                        </span>
                      )}
                    </div>
                    <InputText
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className={[
                        'w-full',
                        errors.phone ? 'p-invalid' : '',
                        existingCustomer ? 'border-green-500' : '',
                      ].filter(Boolean).join(' ')}
                      style={{ height: '3rem', background: 'var(--surface-100)' }}
                      dir="ltr"
                      autoFocus
                      disabled
                    />
                    {errors.phone && (
                      <small className="p-error">{errors.phone}</small>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex flex-column gap-2">
                    <label htmlFor="name" className="font-medium">{t('name')} *</label>
                    <InputText
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder={t('namePlaceholder')}
                      className={errors.name ? 'p-invalid w-full' : 'w-full'}
                      style={{ height: '3rem' }}
                      required
                    />
                    {errors.name && (
                      <small className="p-error">{errors.name}</small>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex flex-column gap-2">
                    <label htmlFor="address" className="font-medium">{t('address')} *</label>
                    <AddressInput
                      value={formData.address}
                      onChange={handleAddressChange}
                      onMapsLinksChange={handleMapsLinksChange}
                      error={errors.address}
                      placeholder={t('addressPlaceholder')}
                      googleMapsUrl={mapsLink}
                      wazeUrl={wazeLink}
                    />
                  </div>

                  {/* Note */}
                  <div className="flex flex-column gap-2">
                    <label htmlFor="note" className="font-medium">{t('note')}</label>
                    <InputTextarea
                      id="note"
                      value={formData.note}
                      onChange={(e) => updateField('note', e.target.value)}
                      placeholder={t('notePlaceholder')}
                      rows={3}
                      autoResize
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Submit button (mobile) */}
              <div className="lg:hidden">
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  style={{ height: '3rem' }}
                  disabled={isSubmitting || !isFormValid}
                  label={isSubmitting ? t('processing') : t('placeOrder')}
                  icon={isSubmitting ? <ProgressSpinner style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth="6" /> : undefined}
                >
                  {!isSubmitting && (
                    <span className="font-bold ml-2">{formatCurrency(subtotal, language)}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order summary */}
          <div className="col-12 lg:col-6">
            <div className="surface-card border-round-xl sm:border-round-2xl p-4 sm:p-5 shadow-1 lg:sticky" style={{ top: '6rem' }}>
              <h2 className="text-base sm:text-lg font-semibold text-color mb-3">{t('orderSummary')}</h2>

              <div className="flex flex-column gap-2 overflow-y-auto" style={{ maxHeight: '18rem' }}>
                {items.map((item) => {
                  const displayName = item.product.name;
                  return (
                    <div key={item.product.id} className="flex gap-2 py-2">
                      <div className="flex-shrink-0 border-round-lg overflow-hidden" style={{ width: '3rem', height: '3rem', background: 'var(--surface-100)' }}>
                        {item.product.imageUrl ? (
                          <img
                            src={getImageUrl(item.product.imageUrl)}
                            alt={displayName}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div className="w-full h-full flex align-items-center justify-content-center">
                            <Package style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-color-secondary)', opacity: 0.4 }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <p className="font-medium text-color text-sm line-clamp-1 m-0">{displayName}</p>
                        <p className="text-xs text-color-secondary m-0">
                          {item.quantity} × {formatCurrency(item.product.price, language)}
                        </p>
                      </div>
                      <span className="font-semibold text-color text-sm">
                        {formatCurrency(item.product.price * item.quantity, language)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-top-1 surface-border mt-3 pt-3">
                <div className="flex align-items-center justify-content-between">
                  <span className="text-color-secondary text-base">{t('total')}</span>
                  <span className="text-xl font-bold text-color">
                    {formatCurrency(subtotal, language)}
                  </span>
                </div>
              </div>

              {/* Submit button (desktop) */}
              <div className="hidden lg:block mt-5">
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  style={{ height: '3rem' }}
                  disabled={isSubmitting || !isFormValid}
                  onClick={handleSubmit}
                  label={isSubmitting ? t('processing') : t('placeOrder')}
                  icon={isSubmitting ? <ProgressSpinner style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth="6" /> : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
