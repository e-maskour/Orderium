import { useState, useEffect } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { IPartner } from '../../modules/partners/partners.interface';
import { partnersService } from '../../modules/partners/partners.service';
import { useLanguage } from '../../context/LanguageContext';
import { Phone, MapPin, Truck, CreditCard } from 'lucide-react';

interface DocumentPartnerBoxProps {
  direction: 'vente' | 'achat';
  partnerId?: number;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerIce?: string;
  deliveryAddress?: string;
  onPartnerChange: (partner: Partial<IPartner>) => void;
  readOnly?: boolean;
}

export function DocumentPartnerBox({
  direction,
  partnerId,
  partnerName = '',
  partnerPhone = '',
  partnerAddress = '',
  partnerIce = '',
  deliveryAddress = '',
  onPartnerChange,
  readOnly = false
}: DocumentPartnerBoxProps) {
  const { t } = useLanguage();
  const partnerLabel = direction === 'vente' ? t('invoice.customer') : t('invoice.supplier');

  const [partners, setPartners] = useState<IPartner[]>([]);

  // Load partners
  useEffect(() => {
    const loadPartners = async () => {
      try {
        const response = await partnersService.getAll();
        const filtered = response.partners.filter(p =>
          direction === 'vente' ? p.isCustomer : p.isSupplier
        );
        setPartners(filtered);
      } catch (error) {
        console.error('Error loading partners:', error);
        setPartners([]);
      }
    };

    loadPartners();
  }, [direction]);

  const handlePartnerSelect = (selectedValue: string) => {
    const selectedPartner = partners.find(p => String(p.id) === selectedValue);
    if (selectedPartner) {
      onPartnerChange(selectedPartner);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
        {t('invoice.customerInfo').replace('client', partnerLabel)}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#334155', marginBottom: '0.375rem' }}>
            {partnerLabel} *
          </label>
          <Dropdown
            value={partnerId ? String(partnerId) : null}
            options={partners.map(partner => ({
              value: String(partner.id),
              label: partner.name
            }))}
            onChange={(e) => handlePartnerSelect(e.value)}
            optionLabel="label"
            optionValue="value"
            placeholder={t('invoice.partnerNamePlaceholder').replace('{partner}', partnerLabel.toLowerCase())}
            emptyFilterMessage={t('invoice.noPartnerFound').replace('{partner}', partnerLabel.toLowerCase())}
            disabled={readOnly}
            filter
            showClear
            style={{ width: '100%' }}
          />
          {(partnerPhone || partnerAddress) && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {partnerPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                  <Phone style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} />
                  <span>{partnerPhone}</span>
                </div>
              )}
              {partnerAddress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                  <MapPin style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} />
                  <span>{partnerAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {partnerIce && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
              <CreditCard style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
              {t('invoice.iceLabel')}
            </label>
            <InputText
              value={partnerIce}
              readOnly
              style={{ width: '100%', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}
            />
          </div>
        )}

        {deliveryAddress && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
              <Truck style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
              {t('invoice.deliveryAddressLabel')}
            </label>
            <InputText
              value={deliveryAddress}
              readOnly
              style={{ width: '100%', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
