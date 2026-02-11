import { useState, useEffect } from 'react';
import { Partner } from '../../modules/partners/partners.interface';
import { partnersService } from '../../modules/partners/partners.service';
import { useLanguage } from '../../context/LanguageContext';
import { Phone, MapPin, Truck, CreditCard } from 'lucide-react';
import { Autocomplete } from '../ui/autocomplete';

interface DocumentPartnerBoxProps {
  direction: 'vente' | 'achat';
  partnerId?: number;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerIce?: string;
  deliveryAddress?: string;
  onPartnerChange: (partner: Partial<Partner>) => void;
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
  
  const [partners, setPartners] = useState<Partner[]>([]);

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
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              {t('invoice.iceLabel')}
            </label>
            <input
              type="text"
              value={partnerIce}
              readOnly
              className="w-full px-3 py-1.5 text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-600"
            />
          </div>
        )}

        {deliveryAddress && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              {t('invoice.deliveryAddressLabel')}
            </label>
            <input
              type="text"
              value={deliveryAddress}
              readOnly
              className="w-full px-3 py-1.5 text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}
