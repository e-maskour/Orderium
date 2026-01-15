import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { partnersService } from '@/modules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddressInput } from '@/components/AddressInput';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const { language, dir, t } = useLanguage();
  const { toast } = useToast();
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
    // Always load customer data on mount
    if (user?.phoneNumber) {
      loadCustomerData();
    }
  }, [user?.phoneNumber]);

  const loadCustomerData = async () => {
    if (!user?.phoneNumber) return;
    
    try {
      const partner = await partnersService.getByPhone(user.phoneNumber);
      if (partner) {
        setFormData({
          name: partner.name || '',
          address: partner.address || '',
          latitude: partner.latitude,
          longitude: partner.longitude,
        });
        
        // Set map links if available
        if (partner.googleMapsUrl) setMapsLink(partner.googleMapsUrl);
        else if (partner.latitude && partner.longitude) {
          setMapsLink(`https://www.google.com/maps?q=${partner.latitude},${partner.longitude}`);
        }
        
        if (partner.wazeUrl) setWazeLink(partner.wazeUrl);
        else if (partner.latitude && partner.longitude) {
          setWazeLink(`https://waze.com/ul?ll=${partner.latitude},${partner.longitude}&navigate=yes`);
        }
      }
    } catch (error: any) {
      // 404 is expected for new users who haven't filled their profile yet
      if (!error.message?.includes('404')) {
        console.error('Failed to load partner data:', error);
      }
    }
  };

  const handleAddressChange = (address: string, latitude?: number, longitude?: number) => {
    setFormData(prev => ({
      ...prev,
      address,
      latitude,
      longitude,
    }));
  };

  const handleMapsLinksChange = (googleMaps: string | null, waze: string | null) => {
    setMapsLink(googleMaps);
    setWazeLink(waze);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: t('error'),
        description: t('nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!user?.phoneNumber) return;

    setIsLoading(true);

    try {
      const mapsLinkToSave = formData.latitude && formData.longitude
        ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`
        : undefined;

      const wazeLinkToSave = formData.latitude && formData.longitude
        ? `https://waze.com/ul?ll=${formData.latitude},${formData.longitude}&navigate=yes`
        : undefined;

      await partnersService.upsert({
        phoneNumber: user.phoneNumber,
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        googleMapsUrl: mapsLinkToSave,
        wazeUrl: wazeLinkToSave,
        portalPhoneNumber: user.phoneNumber, // Link to portal account
      });

      // Refresh user data to get updated customerId
      await refreshUser();

      toast({
        title: t('saved'),
        description: t('profileUpdated'),
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: t('error'),
        description: t('updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {t('profile')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone (readonly) */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t('phoneNumber')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={user?.phoneNumber || ''}
                  disabled
                  className="bg-gray-100 h-11 sm:h-10 text-base sm:text-sm"
                />
                <p className="text-xs text-gray-500">
                  {t('phoneCannotBeChanged')}
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('name')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('enterYourName')}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                  required
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  {t('address')}
                </Label>
                <AddressInput
                  value={formData.address}
                  onChange={handleAddressChange}
                  onMapsLinksChange={handleMapsLinksChange}
                  googleMapsUrl={mapsLink}
                  wazeUrl={wazeLink}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 sm:h-10 text-base sm:text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('saveChanges')
                )}
              </Button>

              {/* Logout Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 sm:h-10 text-base sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                {t('logout')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

