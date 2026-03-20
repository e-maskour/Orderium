import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { partnersService } from '@/modules';
import { InputText } from 'primereact/inputtext';
import { toastSuccess, toastError } from '@/services/toast.service';
import { useNavigate, Link } from 'react-router-dom';
import { AddressInput } from '@/components/AddressInput';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';
import { useCart } from '@/context/CartContext';
import { LogOut, Save, User, Phone, MapPin, ArrowLeft } from 'lucide-react';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const { dir, t } = useLanguage();
  const navigate = useNavigate();
  const { isCartOpen, closeCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [mapsLink, setMapsLink] = useState<string | null>(null);
  const [wazeLink, setWazeLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  useEffect(() => {
    if (user?.customerId) loadCustomerData();
  }, [user?.customerId]);

  const loadCustomerData = async () => {
    if (!user?.customerId) return;
    try {
      const partner = await partnersService.getById(user.customerId);
      if (partner) {
        setFormData({ name: partner.name || '', address: partner.address || '', latitude: partner.latitude, longitude: partner.longitude });
        if (partner.googleMapsUrl) setMapsLink(partner.googleMapsUrl);
        else if (partner.latitude && partner.longitude) setMapsLink(`https://www.google.com/maps?q=${partner.latitude},${partner.longitude}`);
        if (partner.wazeUrl) setWazeLink(partner.wazeUrl);
        else if (partner.latitude && partner.longitude) setWazeLink(`https://waze.com/ul?ll=${partner.latitude},${partner.longitude}&navigate=yes`);
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes('404'))) console.error('Failed to load partner data:', error);
    }
  };

  const handleAddressChange = (address: string, latitude?: number, longitude?: number) => {
    setFormData(prev => ({ ...prev, address, latitude, longitude }));
  };

  const handleMapsLinksChange = (googleMaps: string | null, waze: string | null) => {
    setMapsLink(googleMaps);
    setWazeLink(waze);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toastError(t('nameRequired')); return; }
    if (!user?.phoneNumber) return;
    setIsLoading(true);
    try {
      const mapsLinkToSave = formData.latitude && formData.longitude ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}` : undefined;
      const wazeLinkToSave = formData.latitude && formData.longitude ? `https://waze.com/ul?ll=${formData.latitude},${formData.longitude}&navigate=yes` : undefined;
      await partnersService.upsert({ phoneNumber: user.phoneNumber, name: formData.name, address: formData.address, latitude: formData.latitude || undefined, longitude: formData.longitude || undefined, googleMapsUrl: mapsLinkToSave, wazeUrl: wazeLinkToSave, portalPhoneNumber: user.phoneNumber });
      await refreshUser();
      toastSuccess(t('profileUpdated'));
    } catch (error) {
      console.error('Failed to update profile:', error);
      toastError(t('updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", paddingBottom: '5rem' }} dir={dir}>

      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #059669 100%)',
        padding: '1rem 1.25rem 3.5rem',
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', textDecoration: 'none', color: 'white', flexShrink: 0, WebkitTapHighlightColor: 'transparent' as const }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <User size={26} strokeWidth={2.5} style={{ color: '#fff', flexShrink: 0 }} />
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
              {t('myProfile')}
            </h1>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 1rem', marginTop: '-2.25rem', maxWidth: '40rem', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Avatar card — overlaps header */}
        <div style={{
          background: '#fff', borderRadius: '22px',
          padding: '1.5rem 1.25rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          display: 'flex', alignItems: 'center', gap: '1.125rem',
          marginBottom: '0.875rem',
        }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #059669, #047857)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
              {(formData.name || user?.customerName || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem' }}>
              {formData.name || user?.customerName || t('myProfile')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280' }}>
              <Phone size={14} />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.phoneNumber}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Phone (readonly) */}
          <div style={{
            background: 'white', borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.125rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={18} color="#059669" />
              </div>
              <div>
                <p style={{ margin: '0 0 0.1rem', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{t('phoneNumber')}</p>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{user?.phoneNumber}</p>
              </div>
            </div>
            <p style={{ margin: 0, padding: '0.5rem 1.125rem', fontSize: '0.75rem', color: '#9ca3af' }}>{t('phoneCannotBeChanged')}</p>
          </div>

          {/* Name */}
          <div style={{
            background: 'white', borderRadius: '18px',
            padding: '1.125rem 1.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} color="#059669" />
              </div>
              <label htmlFor="name" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                {t('name')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
            </div>
            <InputText
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('enterYourName')}
              className="w-full"
              style={{ height: '3rem', fontSize: '1rem' }}
              required
            />
          </div>

          {/* Address */}
          <div style={{
            background: 'white', borderRadius: '18px',
            padding: '1.125rem 1.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={18} color="#059669" />
              </div>
              <label htmlFor="address" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{t('address')}</label>
            </div>
            <AddressInput
              value={formData.address}
              onChange={handleAddressChange}
              onMapsLinksChange={handleMapsLinksChange}
              googleMapsUrl={mapsLink}
              wazeUrl={wazeLink}
            />
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%', padding: '1rem',
              borderRadius: '14px', border: 'none',
              background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #047857)',
              color: 'white', fontWeight: 800, fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: isLoading ? 'none' : '0 4px 16px rgba(5,150,105,0.35)',
            }}
          >
            {isLoading ? (
              <span style={{ width: '1.125rem', height: '1.125rem', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
            ) : (
              <Save size={18} />
            )}
            {isLoading ? t('saving') : t('saveChanges')}
          </button>
        </form>

        {/* Settings card — language + logout */}
        <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginTop: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.125rem', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.1rem' }}>🌐</span>
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{t('language') || 'Langue'}</span>
            </div>
            <LanguageToggle />
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', textAlign: 'left' as const }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LogOut size={18} color="#dc2626" />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626' }}>{t('logout')}</span>
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: '0.8rem', fontWeight: 500, marginTop: '0.75rem', paddingBottom: '0.5rem' }}>
          Orderium · v1.0
        </p>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} isPanelMode={false} />
      <BottomNav />
    </div>
  );
}

