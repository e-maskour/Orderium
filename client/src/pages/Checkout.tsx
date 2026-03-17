import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, validateMoroccanPhone } from '@/lib/i18n';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--surface-ground)' }} dir={dir}>
        <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--surface-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Package style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-color-secondary)', opacity: 0.5 }} />
          </div>
          <h2 style={{ fontWeight: 700, color: 'var(--text-color)', marginBottom: '0.5rem' }}>{t('emptyCart')}</h2>
          <p style={{ color: 'var(--text-color-secondary)', marginBottom: '1.5rem' }}>{t('emptyCartMessage')}</p>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button className="cl-btn-primary" style={{ padding: '0.875rem 2rem' }}>{t('continueShopping')}</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground)' }} dir={dir}>
      {/* Sticky header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', height: '3.5rem' }}>
          <Link to="/">
            <button style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', border: 'none', background: 'var(--surface-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={t('goBack')}>
              <BackIcon style={{ width: '1.125rem', height: '1.125rem', color: 'var(--text-color)' }} />
            </button>
          </Link>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-color)' }}>{t('checkoutTitle')}</h1>
        </div>
      </header>

      <main style={{ padding: '1rem', maxWidth: '72rem', margin: '0 auto' }}>
        <div className="grid">
          {/* Form column */}
          <div className="col-12 lg:col-6">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--surface-card)', borderRadius: '1.25rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h2 style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-color)' }}>{t('customerInfo')}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Phone */}
                  <div className="cl-field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <label className="cl-label" htmlFor="phone">{t('phone')} *</label>
                      {isSearchingCustomer && <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{t('searching')}…</span>}
                      {existingCustomer && <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>{t('existingCustomer')}</span>}
                    </div>
                    <InputText
                      id="phone" type="tel"
                      value={formData.phone}
                      onChange={e => updateField('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className={`w-full${errors.phone ? ' p-invalid' : ''}${existingCustomer ? ' border-green-500' : ''}`}
                      style={{ height: '3rem' }}
                      dir="ltr" autoFocus disabled
                    />
                    {errors.phone && <small className="cl-error-msg">{errors.phone}</small>}
                  </div>

                  {/* Name */}
                  <div className="cl-field">
                    <label className="cl-label" htmlFor="name">{t('name')} *</label>
                    <InputText
                      id="name" value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder={t('namePlaceholder')}
                      className={errors.name ? 'p-invalid w-full' : 'w-full'}
                      style={{ height: '3rem' }} required
                    />
                    {errors.name && <small className="cl-error-msg">{errors.name}</small>}
                  </div>

                  {/* Address */}
                  <div className="cl-field">
                    <label className="cl-label" htmlFor="address">{t('address')} *</label>
                    <AddressInput
                      value={formData.address}
                      onChange={handleAddressChange}
                      onMapsLinksChange={handleMapsLinksChange}
                      error={errors.address}
                      placeholder={t('addressPlaceholder')}
                      googleMapsUrl={mapsLink}
                      wazeUrl={wazeLink}
                    />
                    {errors.address && <small className="cl-error-msg">{errors.address}</small>}
                  </div>

                  {/* Note */}
                  <div className="cl-field">
                    <label className="cl-label" htmlFor="note">{t('note')}</label>
                    <InputTextarea
                      id="note" value={formData.note}
                      onChange={e => updateField('note', e.target.value)}
                      placeholder={t('notePlaceholder')}
                      rows={3} autoResize className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Submit (mobile only) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  className="cl-btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9375rem', opacity: (isSubmitting || !isFormValid) ? 0.6 : 1, cursor: (isSubmitting || !isFormValid) ? 'not-allowed' : 'pointer' }}
                  disabled={isSubmitting || !isFormValid}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '1.125rem', height: '1.125rem', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
                      {t('processing')}
                    </span>
                  ) : (
                    <>
                      {t('placeOrder')}
                      <strong style={{ marginInlineStart: '0.25rem' }}>{formatCurrency(subtotal, language)}</strong>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order summary column */}
          <div className="col-12 lg:col-6">
            <div style={{ background: 'var(--surface-card)', borderRadius: '1.25rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'sticky', top: '5rem' }}>
              <h2 style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-color)' }}>{t('orderSummary')}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '18rem', overflowY: 'auto' }}>
                {items.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '0.625rem', overflow: 'hidden', background: 'var(--surface-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.product.imageUrl ? (
                        <img src={getImageUrl(item.product.imageUrl)} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Package style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-color-secondary)', opacity: 0.4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.125rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{item.quantity} × {formatCurrency(item.product.price, language)}</p>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-color)', flexShrink: 0 }}>{formatCurrency(item.product.price * item.quantity, language)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--surface-border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-color-secondary)' }}>{t('total')}</span>
                <span style={{ fontWeight: 800, fontSize: '1.375rem', color: 'var(--text-color)' }}>{formatCurrency(subtotal, language)}</span>
              </div>

              {/* Submit (desktop) */}
              <div className="hidden lg:block" style={{ marginTop: '1.25rem' }}>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="cl-btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9375rem', opacity: (isSubmitting || !isFormValid) ? 0.6 : 1, cursor: (isSubmitting || !isFormValid) ? 'not-allowed' : 'pointer' }}
                  disabled={isSubmitting || !isFormValid}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{ width: '1.125rem', height: '1.125rem', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
                      {t('processing')}
                    </>
                  ) : (
                    <>{t('placeOrder')} · <strong>{formatCurrency(subtotal, language)}</strong></>
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
