import { useState, useEffect } from 'react';
import { Building2, User, Phone, Mail, Hash, FileText, Save } from 'lucide-react';
import { IPartner, CreatePartnerDTO } from '../modules/partners/partners.interface';
import { useLanguage } from '../context/LanguageContext';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FormField } from './ui/form-field';
import { Button } from './ui/button';
import { Toggle } from './ui/toggle';
import { SegmentedControl } from './ui/segmented-control';

interface PartnerFormProps {
  partner?: IPartner | null;
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
            <FormField label={t('partnerType')} className="flex-1">
              <SegmentedControl
                value={formData.isCompany ? 'company' : 'individual'}
                onValueChange={(val) => handleChange('isCompany', val === 'company')}
                options={[
                  { value: 'individual', label: t('individual'), icon: <User className="w-3.5 h-3.5" /> },
                  { value: 'company', label: t('company'), icon: <Building2 className="w-3.5 h-3.5" /> },
                ]}
              />
            </FormField>

            {/* Divider */}
            <div className="hidden lg:block w-px h-12 bg-slate-300"></div>

            {/* Status Toggle Section */}
            <FormField label={t('status')} className="flex-1">
              <Toggle
                checked={formData.isEnabled ?? true}
                onCheckedChange={(val) => handleChange('isEnabled', val)}
                label={formData.isEnabled ? t('active') : t('inactive')}
              />
            </FormField>
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
              <FormField label={t('name')} htmlFor="partner-name" required error={errors.name}>
                <Input
                  id="partner-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  error={!!errors.name}
                  placeholder={t('enterName')}
                />
              </FormField>

              {/* Phone Field */}
              <FormField label={t('phone')} htmlFor="partner-phone" required error={errors.phoneNumber}>
                <Input
                  id="partner-phone"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  error={!!errors.phoneNumber}
                  leadingIcon={<Phone className="w-4 h-4" />}
                  placeholder="+212 6XX XXX XXX"
                />
              </FormField>

              {/* Email Field */}
              <FormField label={t('email')} htmlFor="partner-email" error={errors.email}>
                <Input
                  id="partner-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value || null)}
                  error={!!errors.email}
                  leadingIcon={<Mail className="w-4 h-4" />}
                  placeholder="email@example.com"
                />
              </FormField>

              {/* Address Field */}
              <FormField label={t('address')} htmlFor="partner-address" className="md:col-span-2">
                <Textarea
                  id="partner-address"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value || null)}
                  rows={2}
                  placeholder={t('enterAddress')}
                />
              </FormField>

              {/* Delivery Address Field */}
              <FormField label={t('deliveryAddress')} htmlFor="partner-delivery-address" className="md:col-span-2">
                <Textarea
                  id="partner-delivery-address"
                  value={formData.deliveryAddress || ''}
                  onChange={(e) => handleChange('deliveryAddress', e.target.value || null)}
                  rows={2}
                  placeholder={t('enterDeliveryAddress')}
                />
              </FormField>
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
                <FormField label={t('tvaNumber')} htmlFor="partner-tva">
                  <Input
                    id="partner-tva"
                    type="text"
                    value={formData.tvaNumber || ''}
                    onChange={(e) => handleChange('tvaNumber', e.target.value || null)}
                    leadingIcon={<Hash className="w-4 h-4" />}
                    placeholder={t('enterTvaNumber')}
                  />
                </FormField>

                {/* ICE */}
                <FormField label={t('ice')} htmlFor="partner-ice">
                  <Input
                    id="partner-ice"
                    type="text"
                    value={formData.ice || ''}
                    onChange={(e) => handleChange('ice', e.target.value || null)}
                    leadingIcon={<Hash className="w-4 h-4" />}
                    placeholder={t('enterICE')}
                  />
                </FormField>

                {/* IF */}
                <FormField label={t('if')} htmlFor="partner-if">
                  <Input
                    id="partner-if"
                    type="text"
                    value={formData.if || ''}
                    onChange={(e) => handleChange('if', e.target.value || null)}
                    leadingIcon={<Hash className="w-4 h-4" />}
                    placeholder={t('enterIF')}
                  />
                </FormField>

                {/* CNSS */}
                <FormField label={t('cnss')} htmlFor="partner-cnss">
                  <Input
                    id="partner-cnss"
                    type="text"
                    value={formData.cnss || ''}
                    onChange={(e) => handleChange('cnss', e.target.value || null)}
                    leadingIcon={<Hash className="w-4 h-4" />}
                    placeholder={t('enterCNSS')}
                  />
                </FormField>

                {/* RC */}
                <FormField label={t('rc')} htmlFor="partner-rc">
                  <Input
                    id="partner-rc"
                    type="text"
                    value={formData.rc || ''}
                    onChange={(e) => handleChange('rc', e.target.value || null)}
                    leadingIcon={<Hash className="w-4 h-4" />}
                    placeholder={t('enterRC')}
                  />
                </FormField>

                {/* Patente */}
                <FormField label={t('patente')} htmlFor="partner-patente">
                  <Input
                    id="partner-patente"
                    type="text"
                    value={formData.patente || ''}
                    onChange={(e) => handleChange('patente', e.target.value || null)}
                    leadingIcon={<Hash className="w-4 h-4" />}
                    placeholder={t('enterPatente')}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            loadingText={t('saving')}
            leadingIcon={<Save className="w-4 h-4" />}
          >
            {isEdit ? t('updatePartner') : t('createPartner')}
          </Button>
        </div>
      </form>
    </div>
  );
}
