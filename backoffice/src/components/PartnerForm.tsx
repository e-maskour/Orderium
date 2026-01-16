import { useState, useEffect } from 'react';
import { X, Building2, User, MapPin, Phone, Mail, Globe, Hash, FileText } from 'lucide-react';
import { Partner, CreatePartnerDTO } from '../modules/partners/partners.interface';
import { useLanguage } from '../context/LanguageContext';

interface PartnerFormProps {
  partner?: Partner | null;
  type: 'customer' | 'supplier';
  onSubmit: (data: CreatePartnerDTO) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PartnerForm({ partner, type, onSubmit, onCancel, isSubmitting }: PartnerFormProps) {
  const { t } = useLanguage();
  const isEdit = !!partner;

  const [formData, setFormData] = useState<CreatePartnerDTO>({
    name: partner?.name || '',
    phoneNumber: partner?.phoneNumber || '',
    email: partner?.email || null,
    address: partner?.address || null,
    ice: partner?.ice || null,
    if: partner?.if || null,
    cnss: partner?.cnss || null,
    rc: partner?.rc || null,
    patente: partner?.patente || null,
    tvaNumber: partner?.tvaNumber || null,
    deliveryAddress: partner?.deliveryAddress || null,
    isCompany: partner?.isCompany ?? false,
    latitude: partner?.latitude || null,
    longitude: partner?.longitude || null,
    googleMapsUrl: partner?.googleMapsUrl || null,
    wazeUrl: partner?.wazeUrl || null,
    isEnabled: partner?.isEnabled ?? true,
    isCustomer: type === 'customer' ? true : (partner?.isCustomer ?? false),
    isSupplier: type === 'supplier' ? true : (partner?.isSupplier ?? false),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        phoneNumber: partner.phoneNumber || '',
        email: partner.email || null,
        address: partner.address || null,
        ice: partner.ice || null,
        if: partner.if || null,
        cnss: partner.cnss || null,
        rc: partner.rc || null,
        patente: partner.patente || null,
        tvaNumber: partner.tvaNumber || null,
        deliveryAddress: partner.deliveryAddress || null,
        isCompany: partner.isCompany ?? false,
        latitude: partner.latitude || null,
        longitude: partner.longitude || null,
        googleMapsUrl: partner.googleMapsUrl || null,
        wazeUrl: partner.wazeUrl || null,
        isEnabled: partner.isEnabled ?? true,
        isCustomer: partner.isCustomer ?? (type === 'customer'),
        isSupplier: partner.isSupplier ?? (type === 'supplier'),
      });
    }
  }, [partner, type]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('phoneNumberRequired');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Prepare data based on company type
      const submitData: CreatePartnerDTO = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        address: formData.address,
        isEnabled: formData.isEnabled,
        isCustomer: formData.isCustomer,
        isSupplier: formData.isSupplier,
      };

      // Only include company-specific fields if it's a company
      if (formData.isCompany) {
        submitData.isCompany = true;
        submitData.deliveryAddress = formData.deliveryAddress;
        submitData.ice = formData.ice;
        submitData.if = formData.if;
        submitData.cnss = formData.cnss;
        submitData.rc = formData.rc;
        submitData.patente = formData.patente;
        submitData.tvaNumber = formData.tvaNumber;
      }

      onSubmit(submitData);
    }
  };

  const handleChange = (field: keyof CreatePartnerDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEdit 
                ? `${t('edit')} ${type === 'customer' ? t('customer') : t('supplier')}`
                : `${t('add')} ${type === 'customer' ? t('customer') : t('supplier')}`
              }
            </h2>
            <p className="text-sm text-slate-600 mt-1">{t('fillInformation')}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            
            {/* Partner Type Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">{t('partnerType')}</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('isCompany', false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      !formData.isCompany
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {t('individual')}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('isCompany', true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.isCompany
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {t('company')}
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Status Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">{t('status')}</label>
                <button
                  type="button"
                  onClick={() => handleChange('isEnabled', !formData.isEnabled)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    formData.isEnabled ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      formData.isEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${formData.isEnabled ? 'text-green-600' : 'text-slate-600'}`}>
                  {formData.isEnabled ? t('active') : t('inactive')}
                </span>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('basicInformation')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${
                      errors.name ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder={t('enterName')}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('phone')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${
                        errors.phoneNumber ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="+212 6XX XXX XXX"
                    />
                  </div>
                  {errors.phoneNumber && <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value || null)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none ${
                        errors.email ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="email@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('address')}</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value || null)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
                    placeholder={t('enterAddress')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('deliveryAddress')}</label>
                  <textarea
                    value={formData.deliveryAddress || ''}
                    onChange={(e) => handleChange('deliveryAddress', e.target.value || null)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
                    placeholder={t('enterDeliveryAddress')}
                  />
                </div>
              </div>
            </div>

            {/* Business Identifiers - Only for Companies */}
            {formData.isCompany && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('businessIdentifiers')}
                </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('tvaNumber')}</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.tvaNumber || ''}
                      onChange={(e) => handleChange('tvaNumber', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      placeholder={t('enterTvaNumber')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('ice')}</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.ice || ''}
                      onChange={(e) => handleChange('ice', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      placeholder={t('enterICE')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('if')}</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.if || ''}
                      onChange={(e) => handleChange('if', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      placeholder={t('enterIF')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('cnss')}</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.cnss || ''}
                      onChange={(e) => handleChange('cnss', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      placeholder={t('enterCNSS')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('rc')}</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.rc || ''}
                      onChange={(e) => handleChange('rc', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      placeholder={t('enterRC')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('patente')}</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.patente || ''}
                      onChange={(e) => handleChange('patente', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      placeholder={t('enterPatente')}
                    />
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('saving') : isEdit ? t('updatePartner') : t('createPartner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
