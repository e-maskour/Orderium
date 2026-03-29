import { useState, useEffect } from 'react';
import { Building2, User, Phone, Mail, FileText, SlidersHorizontal, MapPin, Truck } from 'lucide-react';
import { IPartner, CreatePartnerDTO } from '../modules/partners/partners.interface';
import { useLanguage } from '../context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { SelectButton } from 'primereact/selectbutton';
import { Message } from 'primereact/message';

interface PartnerFormProps {
  partner?: IPartner | null;
  type: 'customer' | 'supplier';
  onSubmit: (data: CreatePartnerDTO) => void;
  isSubmitting?: boolean;
}

export function PartnerForm({ partner, type, onSubmit, isSubmitting }: PartnerFormProps) {
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t('nameRequired');
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = t('phoneNumberRequired');
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('invalidEmail');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData: CreatePartnerDTO = {
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      address: formData.address,
      deliveryAddress: formData.deliveryAddress,
      isEnabled: formData.isEnabled,
      isCustomer: formData.isCustomer,
      isSupplier: formData.isSupplier,
      isCompany: formData.isCompany,
    };

    if (formData.isCompany) {
      submitData.ice = formData.ice;
      submitData.if = formData.if;
      submitData.cnss = formData.cnss;
      submitData.rc = formData.rc;
      submitData.patente = formData.patente;
      submitData.tvaNumber = formData.tvaNumber;
    }

    onSubmit(submitData);
  };

  const handleChange = (field: keyof CreatePartnerDTO, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const panel: React.CSSProperties = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0.875rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const iconBox = (bg: string, color: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
    background: bg,
    flexShrink: 0,
    color,
  });

  const sectionHeader = (bg: string, color: string, icon: React.ReactNode, title: string, subtitle: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div style={iconBox(bg, color)}>{icon}</div>
      <div>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</p>
      </div>
    </div>
  );

  const partnerTypeOptions = [
    { value: 'individual', label: t('individual') },
    { value: 'company', label: t('company') },
  ];

  return (
    <form id="partner-form" onSubmit={handleSubmit}>
      <style>{`
        .partner-type-select .p-selectbutton {
          display: flex;
          gap: 0.5rem;
        }
        .partner-type-select .p-selectbutton .p-button {
          border-radius: 0.5rem !important;
          flex: 1;
          justify-content: center;
        }
        .partner-id-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 599px) {
          .partner-id-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 900px) {
          .partner-sidebar {
            order: -1;
          }
        }
      `}</style>
      <div className="product-form-grid">

        {/* ── Main column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Basic Information */}
          <div style={panel}>
            {sectionHeader('#eff6ff', '#235ae4', <User style={{ width: '1rem', height: '1rem' }} />, t('basicInformation'), t('namePhoneEmailAddress'))}

            <div className="product-two-col" style={{ marginBottom: '1.25rem' }}>
              <div className="p-field">
                <label className="p-label">{t('name')} <span style={{ color: '#ef4444' }}>*</span></label>
                <InputText
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={errors.name ? 'p-invalid' : ''}
                  placeholder={t('enterName')}
                  style={{ width: '100%' }}
                />
                {errors.name && <Message severity="error" text={errors.name} style={{ marginTop: '0.25rem' }} />}
              </div>
              <div className="p-field">
                <label className="p-label">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Phone style={{ width: '0.875rem', height: '0.875rem' }} />
                    {t('phone')} <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                </label>
                <InputText
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className={errors.phoneNumber ? 'p-invalid' : ''}
                  placeholder="+212 6XX XXX XXX"
                  style={{ width: '100%' }}
                />
                {errors.phoneNumber && <Message severity="error" text={errors.phoneNumber} style={{ marginTop: '0.25rem' }} />}
              </div>
            </div>

            <div className="p-field" style={{ marginBottom: '1.25rem' }}>
              <label className="p-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Mail style={{ width: '0.875rem', height: '0.875rem' }} />
                  {t('email')}
                </span>
              </label>
              <InputText
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value || null)}
                className={errors.email ? 'p-invalid' : ''}
                placeholder="email@example.com"
                style={{ width: '100%' }}
              />
              {errors.email && <Message severity="error" text={errors.email} style={{ marginTop: '0.25rem' }} />}
            </div>

            <div className="p-field" style={{ marginBottom: '1.25rem' }}>
              <label className="p-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MapPin style={{ width: '0.875rem', height: '0.875rem' }} />
                  {t('address')}
                </span>
              </label>
              <InputTextarea
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value || null)}
                rows={2}
                autoResize
                placeholder={t('enterAddress')}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>

            <div className="p-field">
              <label className="p-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Truck style={{ width: '0.875rem', height: '0.875rem' }} />
                  {t('deliveryAddress')}
                </span>
              </label>
              <InputTextarea
                value={formData.deliveryAddress || ''}
                onChange={(e) => handleChange('deliveryAddress', e.target.value || null)}
                rows={2}
                autoResize
                placeholder={t('enterDeliveryAddress')}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>
          </div>

          {/* Business Identifiers — companies only */}
          {formData.isCompany && (
            <div style={panel}>
              {sectionHeader('#ecfdf5', '#059669', <FileText style={{ width: '1rem', height: '1rem' }} />, t('businessIdentifiers'), t('legalAndTaxNumbers'))}

              <div className="partner-id-grid">
                <div className="p-field">
                  <label className="p-label">{t('tvaNumber')}</label>
                  <InputText value={formData.tvaNumber || ''} onChange={(e) => handleChange('tvaNumber', e.target.value || null)} placeholder={t('enterTvaNumber')} style={{ width: '100%', fontFamily: 'monospace' }} />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('ice')}</label>
                  <InputText value={formData.ice || ''} onChange={(e) => handleChange('ice', e.target.value || null)} placeholder={t('enterICE')} style={{ width: '100%', fontFamily: 'monospace' }} />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('if')}</label>
                  <InputText value={formData.if || ''} onChange={(e) => handleChange('if', e.target.value || null)} placeholder={t('enterIF')} style={{ width: '100%', fontFamily: 'monospace' }} />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('cnss')}</label>
                  <InputText value={formData.cnss || ''} onChange={(e) => handleChange('cnss', e.target.value || null)} placeholder={t('enterCNSS')} style={{ width: '100%', fontFamily: 'monospace' }} />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('rc')}</label>
                  <InputText value={formData.rc || ''} onChange={(e) => handleChange('rc', e.target.value || null)} placeholder={t('enterRC')} style={{ width: '100%', fontFamily: 'monospace' }} />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('patente')}</label>
                  <InputText value={formData.patente || ''} onChange={(e) => handleChange('patente', e.target.value || null)} placeholder={t('enterPatente')} style={{ width: '100%', fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Sidebar ── */}
        <div className="partner-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Settings */}
          <div style={panel}>
            {sectionHeader('#f5f3ff', '#7c3aed', <SlidersHorizontal style={{ width: '1rem', height: '1rem' }} />, t('settings'), t('typeAndStatus'))}

            <div className="p-field" style={{ marginBottom: '1.5rem' }}>
              <label className="p-label">{t('partnerType')}</label>
              <div className="partner-type-select">
                <SelectButton
                  value={formData.isCompany ? 'company' : 'individual'}
                  onChange={(e) => handleChange('isCompany', e.value === 'company')}
                  options={partnerTypeOptions}
                  optionLabel="label"
                  optionValue="value"
                  style={{ width: '100%' }}
                />
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                {formData.isCompany ? t('companyTypeDescription') : t('individualTypeDescription')}
              </p>
            </div>

            <div className="p-field">
              <label className="p-label">{t('status')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: formData.isEnabled ? '#f0fdf4' : '#fafafa', borderRadius: '0.5rem', border: `1px solid ${formData.isEnabled ? '#bbf7d0' : '#e2e8f0'}` }}>
                <InputSwitch checked={formData.isEnabled ?? true} onChange={(e) => handleChange('isEnabled', e.value)} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: formData.isEnabled ? '#15803d' : '#64748b' }}>
                    {formData.isEnabled ? t('active') : t('inactive')}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    {formData.isEnabled ? t('visibleInSystem') : t('hiddenFromSystem')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips card (edit mode shows partner info) */}
          {isEdit && partner && (
            <div style={{ ...panel, background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('partnerInfo')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: t('createdAt'), value: new Date(partner.dateCreated).toLocaleDateString() },
                  { label: t('updatedAt'), value: new Date(partner.dateUpdated).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
