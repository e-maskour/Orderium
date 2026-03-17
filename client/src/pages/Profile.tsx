import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { partnersService } from '@/modules';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { toastSuccess, toastError } from '@/services/toast.service';
import { useNavigate } from 'react-router-dom';
import { AddressInput } from '@/components/AddressInput';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const { language, dir, t } = useLanguage();
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
      <div className="mx-auto px-3 py-4" style={{ maxWidth: '42rem' }}>
        <div className="mb-4">
          <Button
            icon="pi pi-arrow-left"
            label={t('back')}
            text
            severity="secondary"
            onClick={() => navigate('/')}
          />
        </div>

        <Card title={<span className="text-2xl font-bold">{t('profile')}</span>}>
          <form onSubmit={handleSubmit} className="flex flex-column gap-4">
            {/* Phone (readonly) */}
            <div className="flex flex-column gap-2">
              <label htmlFor="phone" className="font-medium">{t('phoneNumber')}</label>
              <InputText id="phone" type="tel" value={user?.phoneNumber || ''} disabled className="surface-100" />
              <small className="text-color-secondary">{t('phoneCannotBeChanged')}</small>
            </div>

            {/* Name */}
            <div className="flex flex-column gap-2">
              <label htmlFor="name" className="font-medium">{t('name')}</label>
              <InputText id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('enterYourName')} required />
            </div>

            {/* Address */}
            <div className="flex flex-column gap-2">
              <label htmlFor="address" className="font-medium">{t('address')}</label>
              <AddressInput
                value={formData.address}
                onChange={handleAddressChange}
                onMapsLinksChange={handleMapsLinksChange}
                googleMapsUrl={mapsLink}
                wazeUrl={wazeLink}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              label={isLoading ? t('saving') : t('saveChanges')}
              icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
              className="w-full"
              disabled={isLoading}
              loading={isLoading}
            />

            {/* Logout */}
            <Button
              type="button"
              label={t('logout')}
              outlined
              severity="danger"
              className="w-full"
              onClick={() => { logout(); navigate('/login'); }}
            />
          </form>
        </Card>
      </div>
    </div>
  );
}

