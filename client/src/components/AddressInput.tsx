import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { notify } from '@orderium/ui';
import { MapPin } from 'lucide-react';

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
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [mapsLink, setMapsLink] = useState<string | null>(googleMapsUrl || null);
  const [wazeLink, setWazeLink] = useState<string | null>(wazeUrl || null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (googleMapsUrl) setMapsLink(googleMapsUrl);
  }, [googleMapsUrl]);

  useEffect(() => {
    if (wazeUrl) setWazeLink(wazeUrl);
  }, [wazeUrl]);

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      notify.error(t('geolocationNotSupported'));
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

        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
        setMapsLink(googleMapsUrl);
        setWazeLink(wazeUrl);
        setCoordinates({ lat: latitude, lon: longitude });

        if (onMapsLinksChange) {
          onMapsLinksChange(googleMapsUrl, wazeUrl);
        }

        try {
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

          const addressParts = [];
          if (data.address) {
            if (data.address.house_number) addressParts.push(data.address.house_number);
            if (data.address.road) addressParts.push(data.address.road);

            if (data.address.neighbourhood || data.address.suburb || data.address.quarter) {
              addressParts.push(
                data.address.neighbourhood || data.address.suburb || data.address.quarter
              );
            }

            if (data.address.city || data.address.town || data.address.village) {
              addressParts.push(data.address.city || data.address.town || data.address.village);
            }

            if (data.address.postcode) addressParts.push(data.address.postcode);
            if (data.address.country) addressParts.push(data.address.country);
          }

          const formattedAddress =
            addressParts.length > 0
              ? addressParts.join(', ')
              : data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          onChange(formattedAddress, latitude, longitude);
          notify.success(t('locationDetected'));
        } catch (error) {
          const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          onChange(fallbackAddress, latitude, longitude);
          notify.warning(t('coordinatesSaved'));
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

        notify.error(errorMessage);
      },
      options
    );
  };

  return (
    <div className="flex flex-column gap-2">
      <div className="flex gap-2">
        <InputText
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t('enterYourAddress')}
          className={`flex-1 ${error ? 'p-invalid' : ''} ${className || ''}`}
          style={{ height: '3rem' }}
        />
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isDetectingLocation}
          title={t('detectMyLocation')}
          style={{ width: '3rem', height: '3rem', flexShrink: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: isDetectingLocation ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDetectingLocation ? 0.7 : 1 }}
        >
          {isDetectingLocation ? (
            <span style={{ width: '1.25rem', height: '1.25rem', border: '2px solid rgba(5,150,105,0.3)', borderTopColor: '#059669', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite', display: 'inline-block' }} />
          ) : (
            <MapPin style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
          )}
        </button>
      </div>
      {error && <small className="p-error">{error}</small>}
      {coordinates && (
        <p className="text-xs text-color-secondary flex align-items-center gap-1 m-0 mt-1">
          <MapPin style={{ width: '0.75rem', height: '0.75rem' }} />
          {`${t('coordinates')}: ${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`}
        </p>
      )}
      {(mapsLink || wazeLink) && (
        <div className="flex flex-column gap-2 mt-1">
          <div className="flex align-items-center gap-2">
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex align-items-center justify-content-center gap-2 surface-card border-1 surface-border border-round-lg px-3 no-underline"
                style={{ padding: '0.625rem', transition: 'background 0.2s' }}
              >
                <div className="flex align-items-center justify-content-center border-circle" style={{ width: '2rem', height: '2rem', background: '#4285F4' }}>
                  <i className="pi pi-map-marker" style={{ color: 'white', fontSize: '0.875rem' }} />
                </div>
                <span className="text-sm font-medium text-color">{t('googleMaps')}</span>
              </a>
            )}
            {wazeLink && (
              <a
                href={wazeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex align-items-center justify-content-center gap-2 surface-card border-1 surface-border border-round-lg px-3 no-underline"
                style={{ padding: '0.625rem', transition: 'background 0.2s' }}
              >
                <div className="flex align-items-center justify-content-center border-circle" style={{ width: '2rem', height: '2rem', background: '#33CCFF' }}>
                  <i className="pi pi-directions" style={{ color: 'white', fontSize: '0.875rem' }} />
                </div>
                <span className="text-sm font-medium text-color">{t('waze')}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
