import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, validateMoroccanPhone } from '@/lib/i18n';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ArrowLeft, ArrowRight, Package, ShoppingBag, User, Phone, MapPin, FileText } from 'lucide-react';
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
  const [existingCustomerId, setExistingCustomerId] = useState<number | null>(null);
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

  const isCustomerInfoComplete =
    formData.name.trim().length > 0 &&
    formData.address.trim().length > 0 &&
    (mapsLink != null || wazeLink != null || (formData.latitude != null && formData.longitude != null));

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const loadCustomerInfo = useCallback(async (portalUserId: number) => {
    setIsSearchingCustomer(true);
    try {
      const result = await authService.getPortalUserById(portalUserId);
      if (result && (result.exists || result.customerId)) {
        setExistingCustomerId(result.customerId ?? null);
        setFormData(prev => ({ ...prev, name: result.name || result.customerName || '', address: result.deliveryAddress || result.address || '', note: '', latitude: result.latitude, longitude: result.longitude }));
        if (result.googleMapsUrl) setMapsLink(result.googleMapsUrl);
        if (result.wazeUrl) setWazeLink(result.wazeUrl);
        setErrors({});
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

  const handleAddressChange = (address: string, latitude?: number, longitude?: number) => {
    setFormData(prev => ({ ...prev, address, latitude, longitude }));
    if (errors.address) setErrors(prev => ({ ...prev, address: undefined }));
  };

  const handleMapsLinksChange = (googleMaps: string | null, waze: string | null) => {
    setMapsLink(googleMaps); setWazeLink(waze);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = t('nameRequired');
    if (!formData.phone.trim()) newErrors.phone = t('phoneRequired');
    else if (!validateMoroccanPhone(formData.phone)) newErrors.phone = t('phoneInvalid');
    if (!formData.address.trim()) newErrors.address = t('addressRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || items.length === 0) return;
    setIsSubmitting(true);
    try {
      let customerId: number | undefined = existingCustomerId ?? undefined;
      if (!customerId) {
        try {
          const partnerResult = await partnersService.upsert({ phoneNumber: formData.phone, name: formData.name, deliveryAddress: formData.address, latitude: formData.latitude, longitude: formData.longitude, googleMapsUrl: mapsLink || undefined, wazeUrl: wazeLink || undefined, portalPhoneNumber: user?.phoneNumber });
          customerId = partnerResult.id;
        } catch { /* non-critical */ }
      }

      const orderItems = items.map(item => ({
        productId: item.product.id, description: item.product.name || '',
        quantity: item.quantity, unitPrice: item.product.price, discount: 0,
        discountType: 0, tax: 0, total: item.quantity * item.product.price,
      }));

      const orderResult = await ordersService.create({
        customerId, customerPhone: formData.phone,
        items: orderItems, note: formData.note,
        subtotal, tax: 0, discount: 0, discountType: 0, total: subtotal,
        fromPortal: true, fromClient: true,
      });

      navigate('/success', { state: { orderNumber: orderResult.data.orderNumber, orderId: orderResult.data.id, total: subtotal, customerName: formData.name, customerPhone: formData.phone, customerAddress: formData.address, items } });
      clearCart();
    } catch {
      notify.error(t('orderCreationError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc' }} dir={dir}>
        <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Package size={32} color="#d1d5db" />
          </div>
          <h2 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>{t('emptyCart')}</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{t('emptyCartMessage')}</p>
          <Link to="/">
            <button style={{ padding: '0.9375rem 2rem', borderRadius: '0.875rem', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
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
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', paddingTop: 'env(safe-area-inset-top, 0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', height: '3.75rem' }}>
          <Link to="/">
            <button style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
              <BackIcon size={18} />
            </button>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} color="#059669" />
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#0f172a' }}>{t('checkoutTitle')}</h1>
          </div>
        </div>
      </header>

      <main style={{ padding: '1rem', maxWidth: '72rem', margin: '0 auto' }}>
        <div className="grid">
          {/* Form column */}
          <div className="col-12 lg:col-6">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Customer info card */}
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                <h2 style={{ margin: '0 0 1.125rem', fontWeight: 700, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} color="#059669" /> {t('customerInfo')}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* Phone */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label htmlFor="phone" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Phone size={13} color="#059669" /> {t('phone')}
                      </label>
                      {isSearchingCustomer && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('searching')}…</span>}
                      {existingCustomerId && (
                        <span style={{ fontSize: '0.75rem', background: '#d1fae5', color: '#059669', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                          {t('existingCustomer')}
                        </span>
                      )}
                    </div>
                    <InputText
                      id="phone" type="tel"
                      value={formData.phone}
                      onChange={e => updateField('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className={`w-full${errors.phone ? ' p-invalid' : ''}`}
                      style={{ height: '3.25rem', fontSize: '1rem', borderColor: existingCustomerId ? '#059669' : undefined }}
                      dir="ltr" disabled
                    />
                    {errors.phone && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>{errors.phone}</p>}
                  </div>

                  {/* Name */}
                  <div>
                    <label htmlFor="name" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <User size={13} color="#059669" /> {t('name')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <InputText
                      id="name" value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder={t('namePlaceholder')}
                      className={`w-full${errors.name ? ' p-invalid' : ''}`}
                      style={{ height: '3.25rem', fontSize: '1rem' }}
                      required
                    />
                    {errors.name && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>{errors.name}</p>}
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <MapPin size={13} color="#059669" /> {t('address')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <AddressInput value={formData.address} onChange={handleAddressChange} onMapsLinksChange={handleMapsLinksChange} error={errors.address} placeholder={t('addressPlaceholder')} googleMapsUrl={mapsLink} wazeUrl={wazeLink} />
                    {errors.address && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>{errors.address}</p>}
                  </div>

                  {/* Note */}
                  <div>
                    <label htmlFor="note" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <FileText size={13} color="#059669" /> {t('note')}
                    </label>
                    <InputTextarea
                      id="note" value={formData.note}
                      onChange={e => updateField('note', e.target.value)}
                      placeholder={t('notePlaceholder')}
                      rows={3} autoResize className="w-full"
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
                    width: '100%', padding: '1.0625rem',
                    borderRadius: '0.875rem', border: 'none',
                    background: (isSubmitting || !isFormValid) ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white', fontWeight: 800, fontSize: '1.0625rem',
                    cursor: (isSubmitting || !isFormValid) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: (isSubmitting || !isFormValid) ? 'none' : '0 4px 16px rgba(5,150,105,0.4)',
                  }}
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
            </form>
          </div>

          {/* Order summary column */}
          <div className="col-12 lg:col-6">
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', position: 'sticky', top: '5rem' }}>
              <h2 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={16} color="#059669" /> {t('orderSummary')}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '18rem', overflowY: 'auto' }}>
                {items.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flexShrink: 0, width: '3.25rem', height: '3.25rem', borderRadius: '0.75rem', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.product.imageUrl
                        ? <img src={getImageUrl(item.product.imageUrl)} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <Package size={16} color="#d1d5db" />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.125rem', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{item.quantity} × {formatCurrency(item.product.price, language)}</p>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', flexShrink: 0 }}>{formatCurrency(item.product.price * item.quantity, language)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ marginTop: '1rem', padding: '0.875rem', background: '#f0fdf4', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#374151', fontWeight: 700 }}>{t('total')}</span>
                <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#059669', letterSpacing: '-0.02em' }}>{formatCurrency(subtotal, language)}</span>
              </div>

              {/* Submit (desktop) */}
              <div className="hidden lg:block" style={{ marginTop: '1.125rem' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isFormValid}
                  style={{
                    width: '100%', padding: '1rem',
                    borderRadius: '0.875rem', border: 'none',
                    background: (isSubmitting || !isFormValid) ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white', fontWeight: 800, fontSize: '1rem',
                    cursor: (isSubmitting || !isFormValid) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: (isSubmitting || !isFormValid) ? 'none' : '0 4px 16px rgba(5,150,105,0.35)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{ width: '1.125rem', height: '1.125rem', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
                      {t('processing')}
                    </>
                  ) : (
                    <>{t('placeOrder')} · {formatCurrency(subtotal, language)}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div >
      </main >
    </div >
  );
};

export default Checkout;
