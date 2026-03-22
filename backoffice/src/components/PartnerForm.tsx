import { useState, useEffect } from 'react';
import { Building2, User, Phone, Mail, Hash, FileText, Save } from 'lucide-react';
import { IPartner, CreatePartnerDTO } from '../modules/partners/partners.interface';
import { useLanguage } from '../context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';

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
      const submitData: CreatePartnerDTO = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        address: formData.address,
        isEnabled: formData.isEnabled,
        isCustomer: formData.isCustomer,
        isSupplier: formData.isSupplier,
      };

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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const partnerTypeOptions = [
    { value: 'individual', label: t('individual'), icon: <User style={{ width: 14, height: 14 }} /> },
    { value: 'company', label: t('company'), icon: <Building2 style={{ width: 14, height: 14 }} /> },
  ];

  const partnerTypeTemplate = (option: any) => (
    <span className="flex align-items-center gap-1">
      {option.icon}
      <span>{option.label}</span>
    </span>
  );

  return (
    <div style={{ width: '100%' }}>
      <form onSubmit={handleSubmit} className="flex flex-column gap-4">
        {/* Partner Type & Status Card */}
        <div style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: '0.875rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div className="partner-form-type-row">
            {/* Partner Type Section */}
            <div className="flex flex-column gap-2 flex-1">
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('partnerType')}</label>
              <SelectButton
                value={formData.isCompany ? 'company' : 'individual'}
                onChange={(e) => handleChange('isCompany', e.value === 'company')}
                options={partnerTypeOptions}
                optionLabel="label"
                optionValue="value"
                itemTemplate={partnerTypeTemplate}
              />
            </div>

            {/* Status Toggle Section */}
            <div className="flex flex-column gap-2 flex-1">
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('status')}</label>
              <div className="flex align-items-center gap-2">
                <InputSwitch
                  checked={formData.isEnabled ?? true}
                  onChange={(e) => handleChange('isEnabled', e.value)}
                />
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  {formData.isEnabled ? t('active') : t('inactive')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information Card */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f8fafc)', padding: '0.75rem 1.25rem', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ padding: '0.375rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '0.5rem', flexShrink: 0 }}>
              <User style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e3a5f', margin: 0 }}>{t('basicInformation')}</h3>
          </div>

          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1rem' }}>
              {/* Name Field */}
              <div className="flex flex-column gap-2">
                <label htmlFor="partner-name" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  {t('name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <InputText
                  id="partner-name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={errors.name ? 'p-invalid' : ''}
                  placeholder={t('enterName')}
                />
                {errors.name && <small style={{ color: '#ef4444' }}>{errors.name}</small>}
              </div>

              {/* Phone Field */}
              <div className="flex flex-column gap-2">
                <label htmlFor="partner-phone" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  {t('phone')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span className="p-input-icon-left">
                  <i><Phone style={{ width: 16, height: 16 }} /></i>
                  <InputText
                    id="partner-phone"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className={errors.phoneNumber ? 'p-invalid' : ''}
                    placeholder="+212 6XX XXX XXX"
                  />
                </span>
                {errors.phoneNumber && <small style={{ color: '#ef4444' }}>{errors.phoneNumber}</small>}
              </div>

              {/* Email Field */}
              <div className="flex flex-column gap-2">
                <label htmlFor="partner-email" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  {t('email')}
                </label>
                <span className="p-input-icon-left">
                  <i><Mail style={{ width: 16, height: 16 }} /></i>
                  <InputText
                    id="partner-email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value || null)}
                    className={errors.email ? 'p-invalid' : ''}
                    placeholder="email@example.com"
                  />
                </span>
                {errors.email && <small style={{ color: '#ef4444' }}>{errors.email}</small>}
              </div>

              {/* Address Field */}
              <div className="flex flex-column gap-2" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="partner-address" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  {t('address')}
                </label>
                <InputTextarea
                  id="partner-address"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value || null)}
                  rows={2}
                  placeholder={t('enterAddress')}
                />
              </div>

              {/* Delivery Address Field */}
              <div className="flex flex-column gap-2" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="partner-delivery-address" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  {t('deliveryAddress')}
                </label>
                <InputTextarea
                  id="partner-delivery-address"
                  value={formData.deliveryAddress || ''}
                  onChange={(e) => handleChange('deliveryAddress', e.target.value || null)}
                  rows={2}
                  placeholder={t('enterDeliveryAddress')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Identifiers Card - Only for Companies */}
        {formData.isCompany && (
          <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #eff6ff, #e0eaff)', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(35,90,228,0.15)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ padding: '0.375rem', background: 'linear-gradient(135deg, #235ae4, #1a47b8)', borderRadius: '0.5rem', flexShrink: 0 }}>
                <FileText style={{ width: 14, height: 14, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>{t('businessIdentifiers')}</h3>
            </div>

            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '1rem' }}>
                {/* TVA Number */}
                <div className="flex flex-column gap-2">
                  <label htmlFor="partner-tva" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('tvaNumber')}</label>
                  <span className="p-input-icon-left">
                    <i><Hash style={{ width: 16, height: 16 }} /></i>
                    <InputText id="partner-tva" value={formData.tvaNumber || ''} onChange={(e) => handleChange('tvaNumber', e.target.value || null)} placeholder={t('enterTvaNumber')} />
                  </span>
                </div>

                {/* ICE */}
                <div className="flex flex-column gap-2">
                  <label htmlFor="partner-ice" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('ice')}</label>
                  <span className="p-input-icon-left">
                    <i><Hash style={{ width: 16, height: 16 }} /></i>
                    <InputText id="partner-ice" value={formData.ice || ''} onChange={(e) => handleChange('ice', e.target.value || null)} placeholder={t('enterICE')} />
                  </span>
                </div>

                {/* IF */}
                <div className="flex flex-column gap-2">
                  <label htmlFor="partner-if" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('if')}</label>
                  <span className="p-input-icon-left">
                    <i><Hash style={{ width: 16, height: 16 }} /></i>
                    <InputText id="partner-if" value={formData.if || ''} onChange={(e) => handleChange('if', e.target.value || null)} placeholder={t('enterIF')} />
                  </span>
                </div>

                {/* CNSS */}
                <div className="flex flex-column gap-2">
                  <label htmlFor="partner-cnss" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('cnss')}</label>
                  <span className="p-input-icon-left">
                    <i><Hash style={{ width: 16, height: 16 }} /></i>
                    <InputText id="partner-cnss" value={formData.cnss || ''} onChange={(e) => handleChange('cnss', e.target.value || null)} placeholder={t('enterCNSS')} />
                  </span>
                </div>

                {/* RC */}
                <div className="flex flex-column gap-2">
                  <label htmlFor="partner-rc" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('rc')}</label>
                  <span className="p-input-icon-left">
                    <i><Hash style={{ width: 16, height: 16 }} /></i>
                    <InputText id="partner-rc" value={formData.rc || ''} onChange={(e) => handleChange('rc', e.target.value || null)} placeholder={t('enterRC')} />
                  </span>
                </div>

                {/* Patente */}
                <div className="flex flex-column gap-2">
                  <label htmlFor="partner-patente" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('patente')}</label>
                  <span className="p-input-icon-left">
                    <i><Hash style={{ width: 16, height: 16 }} /></i>
                    <InputText id="partner-patente" value={formData.patente || ''} onChange={(e) => handleChange('patente', e.target.value || null)} placeholder={t('enterPatente')} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="partner-form-actions" style={{ paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <Button type="button" label={t('cancel')} outlined onClick={onCancel} />
          <Button
            type="submit"
            label={isEdit ? t('updatePartner') : t('createPartner')}
            icon={<Save style={{ width: 16, height: 16 }} />}
            loading={isSubmitting}
          />
        </div>

        <style>{`
          .partner-form-type-row {
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
            flex-wrap: wrap;
          }
          .partner-form-type-row > * {
            flex: 1;
            min-width: 200px;
          }
          .partner-form-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
            flex-wrap: wrap;
          }
          @media (max-width: 479px) {
            .partner-form-actions {
              flex-direction: column-reverse;
              align-items: stretch;
            }
            .partner-form-actions .p-button {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </form>
    </div>
  );
}
