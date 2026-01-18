import { useState, useEffect } from 'react';
import { Building2, User, Phone, Mail, Hash, FileText } from 'lucide-react';
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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Partner Type & Status Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-4 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Partner Type Section */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t('partnerType')}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('isCompany', false)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    !formData.isCompany
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{t('individual')}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('isCompany', true)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    formData.isCompany
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{t('company')}</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Divider */}
            <div className="hidden lg:block w-px h-12 bg-slate-300"></div>
            
            {/* Status Toggle Section */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t('status')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('isEnabled', !formData.isEnabled)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 shadow-inner ${
                    formData.isEnabled 
                      ? 'bg-gradient-to-r from-green-400 to-green-500' 
                      : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                      formData.isEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${formData.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                  <span className={`text-xs font-semibold ${formData.isEnabled ? 'text-green-600' : 'text-slate-600'}`}>
                    {formData.isEnabled ? t('active') : t('inactive')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 py-2.5 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-md">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span>{t('basicInformation')}</span>
            </h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Field */}
              <div className="group">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm ${
                    errors.name 
                      ? 'border-red-300 bg-red-50/50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  placeholder={t('enterName')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-600"></span>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="group">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('phone')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-slate-500 transition-colors" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm ${
                      errors.phoneNumber 
                        ? 'border-red-300 bg-red-50/50' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    placeholder="+212 6XX XXX XXX"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-600"></span>
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="group">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('email')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-slate-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value || null)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm ${
                      errors.email 
                        ? 'border-red-300 bg-red-50/50' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    placeholder="email@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-600"></span>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Address Field */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('address')}
                </label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value || null)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none hover:border-slate-300 transition-all bg-white text-sm"
                  placeholder={t('enterAddress')}
                />
              </div>

              {/* Delivery Address Field */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('deliveryAddress')}
                </label>
                <textarea
                  value={formData.deliveryAddress || ''}
                  onChange={(e) => handleChange('deliveryAddress', e.target.value || null)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none hover:border-slate-300 transition-all bg-white text-sm"
                  placeholder={t('enterDeliveryAddress')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Identifiers Card - Only for Companies */}
        {formData.isCompany && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-4 py-2.5 border-b border-amber-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 rounded-md">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <span>{t('businessIdentifiers')}</span>
              </h3>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TVA Number */}
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('tvaNumber')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Hash className="w-4 h-4 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.tvaNumber || ''}
                      onChange={(e) => handleChange('tvaNumber', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none hover:border-slate-300 transition-all bg-white text-sm"
                      placeholder={t('enterTvaNumber')}
                    />
                  </div>
                </div>

                {/* ICE */}
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('ice')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Hash className="w-4 h-4 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.ice || ''}
                      onChange={(e) => handleChange('ice', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none hover:border-slate-300 transition-all bg-white text-sm"
                      placeholder={t('enterICE')}
                    />
                  </div>
                </div>

                {/* IF */}
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('if')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Hash className="w-4 h-4 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.if || ''}
                      onChange={(e) => handleChange('if', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none hover:border-slate-300 transition-all bg-white text-sm"
                      placeholder={t('enterIF')}
                    />
                  </div>
                </div>

                {/* CNSS */}
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('cnss')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Hash className="w-4 h-4 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.cnss || ''}
                      onChange={(e) => handleChange('cnss', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none hover:border-slate-300 transition-all bg-white text-sm"
                      placeholder={t('enterCNSS')}
                    />
                  </div>
                </div>

                {/* RC */}
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('rc')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Hash className="w-4 h-4 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.rc || ''}
                      onChange={(e) => handleChange('rc', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none hover:border-slate-300 transition-all bg-white text-sm"
                      placeholder={t('enterRC')}
                    />
                  </div>
                </div>

                {/* Patente */}
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('patente')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Hash className="w-4 h-4 text-amber-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.patente || ''}
                      onChange={(e) => handleChange('patente', e.target.value || null)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 outline-none hover:border-slate-300 transition-all bg-white text-sm"
                      placeholder={t('enterPatente')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all font-semibold"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? t('saving') : isEdit ? t('updatePartner') : t('createPartner')}
          </button>
        </div>
      </form>
    </div>
  );
}
