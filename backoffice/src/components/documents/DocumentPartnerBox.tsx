import { useState, useEffect } from 'react';
import { IPartner } from '../../modules/partners/partners.interface';
import { partnersService } from '../../modules/partners/partners.service';
import { useLanguage } from '../../context/LanguageContext';
import { Phone, MapPin, Truck, CreditCard } from 'lucide-react';
import { Autocomplete } from '../ui/autocomplete';
import { Input } from '../ui/input';
import { FormField } from '../ui/form-field';

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
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-base font-bold text-slate-800 mb-3">
        {t('invoice.customerInfo').replace('client', partnerLabel)}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {partnerLabel} *
          </label>
          <Autocomplete
            options={partners.map(partner => ({
              value: String(partner.id),
              label: partner.name
            }))}
            value={partnerId ? String(partnerId) : ''}
            onValueChange={handlePartnerSelect}
            placeholder={t('invoice.partnerNamePlaceholder').replace('{partner}', partnerLabel.toLowerCase())}
            emptyMessage={t('invoice.noPartnerFound').replace('{partner}', partnerLabel.toLowerCase())}
            disabled={readOnly}
            allowCustomValue={false}
          />
          {(partnerPhone || partnerAddress) && (
            <div className="mt-2 space-y-1.5">
              {partnerPhone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{partnerPhone}</span>
                </div>
              )}
              {partnerAddress && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{partnerAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {partnerIce && (
          <div>
            <FormField label={<span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-slate-500" />{t('invoice.iceLabel')}</span>}>
              <Input
                type="text"
                value={partnerIce}
                readOnly
                className="bg-slate-50 text-slate-600"
                inputSize="sm"
                fullWidth
              />
            </FormField>
          </div>
        )}

        {deliveryAddress && (
          <div>
            <FormField label={<span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-500" />{t('invoice.deliveryAddressLabel')}</span>}>
              <Input
                type="text"
                value={deliveryAddress}
                readOnly
                className="bg-slate-50 text-slate-600"
                inputSize="sm"
                fullWidth
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
}
