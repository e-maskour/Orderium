import { useState, useEffect, useRef } from 'react';
import { Partner } from '../../modules/partners/partners.interface';
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
  
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const partnerSearchRef = useRef<HTMLDivElement>(null);

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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partnerSearchRef.current && !partnerSearchRef.current.contains(event.target as Node)) {
        setShowPartnerSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPartner = (partner: Partner) => {
    onPartnerChange(partner);
    setShowPartnerSearch(false);
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
          <div className="relative" ref={partnerSearchRef}>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => {
                onPartnerChange({ name: e.target.value });
                setShowPartnerSearch(true);
              }}
              onFocus={() => setShowPartnerSearch(true)}
              placeholder={t('invoice.partnerNamePlaceholder').replace('{partner}', partnerLabel.toLowerCase())}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
              required
              disabled={readOnly}
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
            {showPartnerSearch && !readOnly && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {partners.length > 0 ? (
                  <div>
                    {partners
                      .filter(p => 
                        p.name.toLowerCase().includes(partnerName.toLowerCase()) ||
                        p.phoneNumber.includes(partnerName)
                      )
                      .map(partner => (
                        <div
                          key={partner.id}
                          onClick={() => handleSelectPartner(partner)}
                          className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                        >
                          <div className="font-medium text-slate-800">{partner.name}</div>
                          <div className="text-sm text-slate-500">{partner.phoneNumber}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    {t('invoice.noPartnerFound').replace('{partner}', partnerLabel.toLowerCase())}
                  </div>
                )}
              </div>
            )}
          </div>
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
