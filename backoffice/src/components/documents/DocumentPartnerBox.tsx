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
  readOnly = false,
}: DocumentPartnerBoxProps) {
  const { t } = useLanguage();
  const partnerLabel = direction === 'vente' ? t('invoice.customer') : t('invoice.supplier');

  const [partners, setPartners] = useState<IPartner[]>([]);

  // Load partners
  useEffect(() => {
    const loadPartners = async () => {
      try {
        const response = await partnersService.getAll();
        const filtered = response.partners.filter((p) =>
          direction === 'vente' ? p.isCustomer : p.isSupplier,
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
    const selectedPartner = partners.find((p) => String(p.id) === selectedValue);
    if (selectedPartner) {
      onPartnerChange(selectedPartner);
    }
  };

  return (
    <div
      className="doc-pbox"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.875rem',
        border: '1.5px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <style>{`
        .doc-pbox .p-dropdown { height: 2.5rem !important; }
        .doc-pbox .p-dropdown .p-dropdown-label { display: flex !important; align-items: center !important; }
        .doc-pbox .p-dropdown:not(.p-disabled).p-focus,
        .doc-pbox .p-dropdown:not(.p-disabled).p-inputwrapper-focus {
          border-color: var(--form-input-border-focus) !important;
          box-shadow: var(--form-input-shadow-focus) !important;
        }
      `}</style>
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.875rem 1.125rem',
          background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
          borderBottom: '1.5px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
            borderRadius: '0.5rem',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(35,90,228,0.4)',
          }}
        >
          <Phone style={{ width: '1rem', height: '1rem', color: '#fff' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
            {t('invoice.customerInfo').replace('client', partnerLabel)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
            {partnerId ? partnerName : `${t('pleaseSelect')} ${partnerLabel.toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div
        style={{
          padding: '1rem 1.125rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.375rem',
            }}
          >
            {partnerLabel} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          {readOnly ? (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1e293b',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '6px',
                minHeight: '2.5rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {partnerName || <span style={{ color: '#94a3b8' }}>—</span>}
            </div>
          ) : (
            <Dropdown
              value={partnerId ? String(partnerId) : null}
              options={partners.map((partner) => ({
                value: String(partner.id),
                label: partner.name,
              }))}
              onChange={(e) => handlePartnerSelect(e.value)}
              optionLabel="label"
              optionValue="value"
              placeholder={t('invoice.partnerNamePlaceholder').replace(
                '{partner}',
                partnerLabel.toLowerCase(),
              )}
              emptyFilterMessage={t('invoice.noPartnerFound').replace(
                '{partner}',
                partnerLabel.toLowerCase(),
              )}
              filter
              showClear
              style={{ width: '100%', height: '2.5rem' }}
            />
          )}
        </div>

        {(partnerPhone || partnerAddress) && (
          <div
            style={{
              background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
              borderRadius: '0.625rem',
              border: '1px solid #e2e8f0',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {partnerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    background: '#eff6ff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Phone style={{ width: '0.75rem', height: '0.75rem', color: '#3b82f6' }} />
                </div>
                <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                  {partnerPhone}
                </span>
              </div>
            )}
            {partnerAddress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    background: '#f0fdf4',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MapPin style={{ width: '0.75rem', height: '0.75rem', color: '#16a34a' }} />
                </div>
                <span style={{ fontSize: '0.875rem', color: '#334155' }}>{partnerAddress}</span>
              </div>
            )}
          </div>
        )}

        {partnerIce && (
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.375rem',
              }}
            >
              <CreditCard style={{ width: '0.75rem', height: '0.75rem' }} />
              {t('invoice.iceLabel')}
            </label>
            <InputText
              value={partnerIce}
              readOnly
              style={{
                width: '100%',
                height: '2.5rem',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            />
          </div>
        )}

        {deliveryAddress && (
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.375rem',
              }}
            >
              <Truck style={{ width: '0.75rem', height: '0.75rem' }} />
              {t('invoice.deliveryAddressLabel')}
            </label>
            <InputText
              value={deliveryAddress}
              readOnly
              style={{
                width: '100%',
                height: '2.5rem',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '0.875rem',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
