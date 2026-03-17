import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { partnersService } from '@/modules';
import { InputText } from 'primereact/inputtext';
import { toastSuccess, toastError } from '@/services/toast.service';
import { useNavigate } from 'react-router-dom';
import { AddressInput } from '@/components/AddressInput';
import { LogOut, Save, User, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const { language: _lang, dir, t } = useLanguage();
  const navigate = useNavigate();
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
    if (user?.phoneNumber) loadCustomerData();
  }, [user?.phoneNumber]);

  const loadCustomerData = async () => {
    if (!user?.phoneNumber) return;
    try {
      const partner = await partnersService.getByPhone(user.phoneNumber);
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
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground)' }} dir={dir}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1e1e2d, #16213e)', padding: '1.25rem 1rem' }}>
        <div style={{ maxWidth: '40rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User style={{ width: '1.25rem', height: '1.25rem', color: '#34d399' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1.0625rem' }}>{t('profile')}</h1>
            {user?.phoneNumber && <p style={{ margin: 0, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>{user.phoneNumber}</p>}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '40rem', margin: '1.5rem auto', padding: '0 1rem 6rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Phone (readonly) */}
          <div style={{ background: 'var(--surface-card)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <Phone style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)', flexShrink: 0 }} />
              <label style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-color)' }}>{t('phoneNumber')}</label>
            </div>
            <InputText value={user?.phoneNumber || ''} disabled className="w-full surface-100" style={{ height: '3rem' }} />
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{t('phoneCannotBeChanged')}</p>
          </div>

          {/* Name */}
          <div style={{ background: 'var(--surface-card)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <User style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)', flexShrink: 0 }} />
              <label htmlFor="name" style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-color)' }}>{t('name')} *</label>
            </div>
            <InputText id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={t('enterYourName')} className="w-full" style={{ height: '3rem' }} required />
          </div>

          {/* Address */}
          <div style={{ background: 'var(--surface-card)', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <MapPin style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)', flexShrink: 0 }} />
              <label htmlFor="address" style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-color)' }}>{t('address')}</label>
            </div>
            <AddressInput value={formData.address} onChange={handleAddressChange} onMapsLinksChange={handleMapsLinksChange} googleMapsUrl={mapsLink} wazeUrl={wazeLink} />
          </div>

          {/* Save */}
          <button
            type="submit"
            className="cl-btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9375rem', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ width: '1.125rem', height: '1.125rem', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
            ) : (
              <Save style={{ width: '1.125rem', height: '1.125rem' }} />
            )}
            {isLoading ? t('saving') : t('saveChanges')}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.875rem', borderRadius: '1rem', border: '1px solid #fca5a5',
              background: 'transparent', color: '#ef4444', fontWeight: 600, fontSize: '0.9375rem',
              cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut style={{ width: '1.125rem', height: '1.125rem' }} />
            {t('logout')}
          </button>
        </form>
      </div>
    </div>
  );
}
