import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin } from 'lucide-react';
import { SiGooglemaps, SiWaze } from 'react-icons/si';
import { cn } from '@/lib/utils';

interface AddressInputProps {
  value: string;
  onChange: (address: string, latitude?: number, longitude?: number) => void;
  onMapsLinksChange?: (googleMaps: string | null, waze: string | null) => void;
  className?: string;
  error?: string;
  placeholder?: string;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
}

export function AddressInput({
  value,
  onChange,
  onMapsLinksChange,
  className,
  error,
  placeholder,
  googleMapsUrl,
  wazeUrl,
}: AddressInputProps) {
  const { language, dir, t } = useLanguage();
  const { toast } = useToast();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [mapsLink, setMapsLink] = useState<string | null>(googleMapsUrl || null);
  const [wazeLink, setWazeLink] = useState<string | null>(wazeUrl || null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: t('error'),
        description: t('geolocationNotSupported'),
        variant: 'destructive',
      });
      return;
    }

    setIsDetectingLocation(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Create Google Maps and Waze links
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
        setMapsLink(googleMapsUrl);
        setWazeLink(wazeUrl);
        setCoordinates({ lat: latitude, lon: longitude });

        // Notify parent of map links
        if (onMapsLinksChange) {
          onMapsLinksChange(googleMapsUrl, wazeUrl);
        }

        try {
          // Use OpenStreetMap Nominatim for reverse geocoding - get full address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${language}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Orderium POS',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Geocoding failed');
          }

          const data = await response.json();

          // Build complete address with all available details
          const addressParts = [];
          if (data.address) {
            // Street number and name
            if (data.address.house_number) addressParts.push(data.address.house_number);
            if (data.address.road) addressParts.push(data.address.road);

            // Neighborhood/Quarter
            if (data.address.neighbourhood || data.address.suburb || data.address.quarter) {
              addressParts.push(
                data.address.neighbourhood || data.address.suburb || data.address.quarter
              );
            }

            // City
            if (data.address.city || data.address.town || data.address.village) {
              addressParts.push(data.address.city || data.address.town || data.address.village);
            }

            // Postal code
            if (data.address.postcode) addressParts.push(data.address.postcode);

            // Country
            if (data.address.country) addressParts.push(data.address.country);
          }

          const formattedAddress =
            addressParts.length > 0
              ? addressParts.join(', ')
              : data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          onChange(formattedAddress, latitude, longitude);

          toast({
            title: t('locationDetected'),
            description: t('locationSuccess'),
          });
        } catch (error) {
          // Still save coordinates even if geocoding fails
          const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          onChange(fallbackAddress, latitude, longitude);

          toast({
            title: t('warning'),
            description: t('coordinatesSaved'),
          });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      async (error) => {
        setIsDetectingLocation(false);

        let errorMessage = t('locationDetectionFailed');

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t('permissionDenied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t('positionUnavailable');
            break;
          case error.TIMEOUT:
            errorMessage = t('timeout');
            break;
          default:
            errorMessage = t('locationError');
        }

        toast({
          title: t('error'),
          description: errorMessage,
          variant: 'destructive',
        });
      },
      options
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t('enterYourAddress')}
          className={cn('h-12 flex-1', error && 'border-destructive focus-visible:ring-destructive', className)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDetectLocation}
          disabled={isDetectingLocation}
          className="h-12 w-12 flex-shrink-0"
          title={t('detectMyLocation')}
        >
          {isDetectingLocation ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {coordinates && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {`${t('coordinates')}: ${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`}
          </p>
          <div className="flex items-center gap-2">
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm group"
              >
                <div className="w-8 h-8 bg-[#4285F4] rounded-full flex items-center justify-center">
                  <SiGooglemaps className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {t('googleMaps')}
                </span>
              </a>
            )}
            {wazeLink && (
              <a
                href={wazeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm group"
              >
                <div className="w-8 h-8 bg-[#33CCFF] rounded-full flex items-center justify-center">
                  <SiWaze className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {t('waze')}
                </span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
