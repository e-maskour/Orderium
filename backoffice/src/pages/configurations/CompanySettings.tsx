import { useState, useEffect, useRef } from 'react';
import {
  DecimalInput,
  getMoroccanPhoneError,
  normalizeMoroccanPhone,
  phoneInputProps,
} from '@orderium/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Loader2,
  Save,
  ArrowLeft,
  MapPin,
  FileText,
  Mail,
  Phone,
  Globe,
  Camera,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toastUpdated, toastError } from '../../services/toast.service';
import { companyService, Company, ICompany } from '../../modules/company';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { AutoCompleteSelect } from '../../components/ui/AutoCompleteSelect';

const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Fès',
  'Marrakech',
  'Agadir',
  'Tanger',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Safi',
  'El Jadida',
  'Nador',
  'Settat',
  'Mohammedia',
  'Khouribga',
  'Béni Mellal',
  'Salé',
  'Essaouira',
  'Larache',
];

// Mirrors the API limits on POST /configurations/entity/my_company/logo.
const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const LEGAL_STRUCTURES = [
  'SARL',
  'SA',
  'SAS',
  'SASU',
  'SNC',
  'SCS',
  'Entreprise Individuelle',
  'Auto-Entrepreneur',
];

const MONTHS: { value: number; label: (t: (key: TranslationKey) => string) => string }[] = [
  { value: 1, label: (t) => t('monthJanuary') },
  { value: 2, label: (t) => t('monthFebruary') },
  { value: 3, label: (t) => t('monthMarch') },
  { value: 4, label: (t) => t('monthApril') },
  { value: 5, label: (t) => t('monthMay') },
  { value: 6, label: (t) => t('monthJune') },
  { value: 7, label: (t) => t('monthJuly') },
  { value: 8, label: (t) => t('monthAugust') },
  { value: 9, label: (t) => t('monthSeptember') },
  { value: 10, label: (t) => t('monthOctober') },
  { value: 11, label: (t) => t('monthNovember') },
  { value: 12, label: (t) => t('monthDecember') },
];

export default function CompanySettings() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ICompany | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', 'info'],
    queryFn: () => companyService.getCompanyInfo(),
  });

  // Seed the form once; later refetches (e.g. after a logo change) must not
  // clobber edits the user hasn't saved yet.
  useEffect(() => {
    if (company) {
      setFormData((prev) => prev ?? company.toJSON());
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: ICompany) => companyService.updateCompanyInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toastUpdated(t('informationSavedSuccess'));
    },
    onError: (error: Error) => {
      toastError(error.message || t('errorSaving'));
    },
  });

  // The logo is saved on its own endpoint, immediately. Only `logo` is
  // patched into the form so unsaved edits to other fields are kept, and the
  // next "Save" (which sends every field) carries the new value.
  const applyLogo = (updated: Company) => {
    setFormData((prev) => (prev ? { ...prev, logo: updated.logo } : prev));
    queryClient.invalidateQueries({ queryKey: ['company'] });
  };

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => companyService.uploadLogo(file),
    onSuccess: (updated) => {
      applyLogo(updated);
      toastUpdated(t('logoUploaded' as any));
    },
    onError: (error: Error) => toastError(error.message || t('errorSaving')),
  });

  const removeLogoMutation = useMutation({
    mutationFn: () => companyService.removeLogo(),
    onSuccess: (updated) => {
      applyLogo(updated);
      toastUpdated(t('logoRemoved' as any));
    },
    onError: (error: Error) => toastError(error.message || t('errorSaving')),
  });

  const logoBusy = uploadLogoMutation.isPending || removeLogoMutation.isPending;

  const handleLogoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!LOGO_MIME_TYPES.includes(file.type)) {
      toastError(t('logoInvalidType' as any));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toastError(t('logoTooLarge' as any));
      return;
    }
    uploadLogoMutation.mutate(file);
  };

  const phoneError = getMoroccanPhoneError(formData?.phone || '');
  const faxError = getMoroccanPhoneError(formData?.fax || '');

  const saveCompany = () => {
    if (!formData) return;
    const error = phoneError || faxError;
    if (error) {
      toastError(t(error));
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompany();
  };

  const handleChange = (field: keyof ICompany, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (isLoading || !formData) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '16rem',
            }}
          >
            <Loader2
              className="animate-spin"
              style={{ width: '1.5rem', height: '1.5rem', color: 'var(--text-secondary)' }}
            />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Building2}
          title={t('companyInformation')}
          subtitle={t('manageCompanyInfo')}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/configurations')}
              style={{
                width: '2.25rem',
                height: '2.25rem',
                flexShrink: 0,
                background: 'var(--erp-border-light)',
                border: '1.5px solid var(--erp-border)',
                color: 'var(--text-label)',
                borderRadius: '0.625rem',
                padding: 0,
              }}
            />
          }
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                onClick={saveCompany}
                icon={
                  updateMutation.isPending ? (
                    <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  ) : (
                    <Save style={{ width: 16, height: 16 }} />
                  )
                }
                label={t('save')}
                disabled={updateMutation.isPending || !formData}
                size="small"
              />
            </div>
          }
        />

        <style>{`
                .cs-form { padding: 0; display: flex; flex-direction: column; gap: 1.25rem; }
                .cs-card { background: var(--erp-surface); border-radius: 0.75rem; border: 1px solid var(--erp-border); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03); }
                .cs-card-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--erp-border-light); background: linear-gradient(135deg, var(--erp-border-light) 0%, var(--erp-surface) 100%); }
                .cs-icon-badge { width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .cs-card-body { padding: 1.25rem; }
                @media (min-width: 768px) { .cs-card-body { padding: 1.5rem; } }
                .cs-grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }
                @media (min-width: 600px) { .cs-grid { grid-template-columns: repeat(2, 1fr); } }
                .cs-col-2 { grid-column: span 1; }
                @media (min-width: 600px) { .cs-col-2 { grid-column: span 2; } }
                .cs-label { display: block; font-size: 0.8125rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
                .cs-req { color: #f43f5e; }
                .cs-hint { font-size: 0.75rem; color: #9ca3af; margin-top: 0.3rem; }
                .cs-sep { border: none; border-top: 1px solid var(--erp-border-light); margin: 0.25rem 0; }
                .cs-identity-wrap { display: flex; gap: 1.25rem; align-items: flex-start; }
                @media (max-width: 480px) { .cs-identity-wrap { flex-direction: column; align-items: stretch; } }
                .cs-avatar { flex-shrink: 0; width: 4.5rem; height: 4.5rem; border-radius: 1rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; font-size: 1.375rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; box-shadow: 0 4px 14px rgba(99,102,241,0.3); }
                .cs-avatar { position: relative; border: none; padding: 0; cursor: pointer; font-family: inherit; }
                .cs-avatar:disabled { cursor: progress; }
                .cs-avatar:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
                .cs-avatar-logo { background: #fff; border: 1px solid var(--erp-border); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
                .cs-avatar-logo img { width: 100%; height: 100%; object-fit: contain; padding: 0.375rem; border-radius: 1rem; }
                .cs-avatar-badge { position: absolute; right: -0.25rem; bottom: -0.25rem; width: 1.5rem; height: 1.5rem; border-radius: 999px; background: #fff; color: #4f46e5; border: 1px solid var(--erp-border); display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
                .cs-logo-col { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
                @media (max-width: 480px) { .cs-logo-col { flex-direction: row; align-items: center; gap: 1rem; } }
                .cs-logo-actions { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
                @media (max-width: 480px) { .cs-logo-actions { align-items: flex-start; } }
                .cs-link { background: none; border: none; padding: 0.25rem 0; font: inherit; font-size: 0.75rem; font-weight: 500; color: #4f46e5; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; min-height: 1.75rem; }
                .cs-link:disabled { opacity: 0.5; cursor: progress; }
                .cs-link-danger { color: #e11d48; }
                .cs-identity-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.875rem; }
            `}</style>

        <form onSubmit={handleSubmit} className="cs-form">
          {/* Identity */}
          <div className="cs-card">
            <div className="cs-card-header">
              <div className="cs-icon-badge" style={{ background: '#ede9fe' }}>
                <Building2 style={{ width: '1rem', height: '1rem', color: '#7c3aed' }} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#111827',
                    lineHeight: 1.4,
                  }}
                >
                  {t('companyIdentitySection' as any)}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                  {t('officialNameSubtitle' as any)}
                </p>
              </div>
            </div>
            <div className="cs-card-body">
              <div className="cs-identity-wrap">
                <div className="cs-logo-col">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={LOGO_MIME_TYPES.join(',')}
                    onChange={handleLogoSelected}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className={`cs-avatar${formData.logo ? ' cs-avatar-logo' : ''}`}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoBusy}
                    aria-label={formData.logo ? t('changeLogo' as any) : t('uploadLogo' as any)}
                    title={formData.logo ? t('changeLogo' as any) : t('uploadLogo' as any)}
                  >
                    {logoBusy ? (
                      <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
                    ) : formData.logo ? (
                      <img src={formData.logo} alt={t('companyLogo' as any)} />
                    ) : (
                      (formData.companyName || 'EN')
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() || '')
                        .join('') || 'E'
                    )}
                    {!logoBusy && (
                      <span className="cs-avatar-badge" aria-hidden="true">
                        <Camera style={{ width: 12, height: 12 }} />
                      </span>
                    )}
                  </button>
                  <div className="cs-logo-actions">
                    <button
                      type="button"
                      className="cs-link"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoBusy}
                    >
                      {formData.logo ? t('changeLogo' as any) : t('uploadLogo' as any)}
                    </button>
                    {formData.logo && (
                      <button
                        type="button"
                        className="cs-link cs-link-danger"
                        onClick={() => removeLogoMutation.mutate()}
                        disabled={logoBusy}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                        {t('removeLogo' as any)}
                      </button>
                    )}
                  </div>
                </div>
                <div className="cs-identity-fields">
                  <div>
                    <label className="cs-label" htmlFor="cs-cname">
                      {t('companyName' as any)} <span className="cs-req">*</span>
                    </label>
                    <InputText
                      id="cs-cname"
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="cs-label" htmlFor="cs-professions">
                      {t('professions' as any)}
                    </label>
                    <InputText
                      id="cs-professions"
                      type="text"
                      value={formData.professions || ''}
                      onChange={(e) => handleChange('professions', e.target.value)}
                      placeholder={t('professionsPlaceholder' as any)}
                      style={{ width: '100%' }}
                    />
                    <p className="cs-hint">{t('appearsOnDocs' as any)}</p>
                  </div>
                  <p className="cs-hint" style={{ margin: 0 }}>
                    {t('logoDocumentsHint' as any)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Localisation */}
          <div className="cs-card">
            <div className="cs-card-header">
              <div className="cs-icon-badge" style={{ background: '#dbeafe' }}>
                <MapPin style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#111827',
                    lineHeight: 1.4,
                  }}
                >
                  {t('contactSection' as any)}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                  {t('postalAddressSubtitle' as any)}
                </p>
              </div>
            </div>
            <div
              className="cs-card-body"
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div className="cs-grid">
                <div className="cs-col-2">
                  <label className="cs-label" htmlFor="cs-address">
                    {t('address')}
                  </label>
                  <InputText
                    id="cs-address"
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-zip">
                    {t('zipCode')}
                  </label>
                  <InputText
                    id="cs-zip"
                    type="text"
                    value={formData.zipCode || ''}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-city">
                    {t('city')}
                  </label>
                  <AutoCompleteSelect
                    id="cs-city"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.value)}
                    options={[
                      { label: t('selectCity' as any), value: '' },
                      ...MOROCCAN_CITIES.map((city) => ({ label: city, value: city })),
                    ]}
                    optionLabel="label"
                    optionValue="value"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-state">
                    {t('state' as any)}
                  </label>
                  <InputText
                    id="cs-state"
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-country">
                    {t('country' as any)}
                  </label>
                  <InputText
                    id="cs-country"
                    type="text"
                    value={formData.country || 'Maroc'}
                    readOnly
                    style={{
                      width: '100%',
                      background: 'var(--erp-border-light)',
                      color: 'var(--text-label)',
                    }}
                  />
                </div>
              </div>

              <hr className="cs-sep" />

              <div className="cs-grid">
                <div>
                  <label className="cs-label" htmlFor="cs-phone">
                    <Phone
                      style={{
                        display: 'inline',
                        width: '0.75rem',
                        height: '0.75rem',
                        marginRight: '0.25rem',
                        verticalAlign: 'middle',
                      }}
                    />
                    {t('phone')}
                  </label>
                  <InputText
                    id="cs-phone"
                    {...phoneInputProps}
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', normalizeMoroccanPhone(e.target.value))}
                    className={phoneError ? 'p-invalid' : ''}
                    style={{ width: '100%' }}
                  />
                  {phoneError && (
                    <small
                      style={{
                        display: 'block',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      {t(phoneError)}
                    </small>
                  )}
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-fax">
                    {t('fax' as any)}
                  </label>
                  <InputText
                    id="cs-fax"
                    {...phoneInputProps}
                    placeholder="05XXXXXXXX"
                    value={formData.fax || ''}
                    onChange={(e) => handleChange('fax', normalizeMoroccanPhone(e.target.value))}
                    className={faxError ? 'p-invalid' : ''}
                    style={{ width: '100%' }}
                  />
                  {faxError && (
                    <small
                      style={{
                        display: 'block',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      {t(faxError)}
                    </small>
                  )}
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-email">
                    <Mail
                      style={{
                        display: 'inline',
                        width: '0.75rem',
                        height: '0.75rem',
                        marginRight: '0.25rem',
                        verticalAlign: 'middle',
                      }}
                    />
                    {t('email')}
                  </label>
                  <InputText
                    id="cs-email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-website">
                    <Globe
                      style={{
                        display: 'inline',
                        width: '0.75rem',
                        height: '0.75rem',
                        marginRight: '0.25rem',
                        verticalAlign: 'middle',
                      }}
                    />
                    {t('website' as any)}
                  </label>
                  <InputText
                    id="cs-website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informations légales */}
          <div className="cs-card">
            <div className="cs-card-header">
              <div className="cs-icon-badge" style={{ background: '#dcfce7' }}>
                <FileText style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#111827',
                    lineHeight: 1.4,
                  }}
                >
                  {t('legalSection' as any)}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                  {t('fiscalIdentifiers' as any)}
                </p>
              </div>
            </div>
            <div className="cs-card-body">
              <div className="cs-grid">
                <div>
                  <label className="cs-label" htmlFor="cs-vat">
                    {t('vatNumber' as any)}
                  </label>
                  <InputText
                    id="cs-vat"
                    type="text"
                    value={formData.vatNumber || ''}
                    onChange={(e) => handleChange('vatNumber', e.target.value)}
                    placeholder="MA12345678"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-ice">
                    {t('ice' as any)}
                  </label>
                  <InputText
                    id="cs-ice"
                    type="text"
                    value={formData.ice || ''}
                    onChange={(e) => handleChange('ice', e.target.value)}
                    placeholder="000000000000000"
                    maxLength={15}
                    style={{ width: '100%' }}
                  />
                  <p className="cs-hint">{t('iceHint' as any)}</p>
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-taxid">
                    {t('taxId' as any)}
                  </label>
                  <InputText
                    id="cs-taxid"
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-rc">
                    {t('registrationNumber' as any)}
                  </label>
                  <InputText
                    id="cs-rc"
                    type="text"
                    value={formData.registrationNumber || ''}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                    placeholder="RC123456"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-legal">
                    {t('legalStructure' as any)}
                  </label>
                  <AutoCompleteSelect
                    id="cs-legal"
                    value={formData.legalStructure || ''}
                    onChange={(e) => handleChange('legalStructure', e.value)}
                    options={[
                      { label: t('select'), value: '' },
                      ...LEGAL_STRUCTURES.map((structure) => ({
                        label: structure,
                        value: structure,
                      })),
                    ]}
                    optionLabel="label"
                    optionValue="value"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-capital">
                    {t('capital' as any)}
                  </label>
                  <DecimalInput
                    id="cs-capital"
                    min={0}
                    maxFractionDigits={2}
                    value={formData.capital || null}
                    onValueChange={(v) => handleChange('capital', v ?? undefined)}
                    className="p-inputtext p-component"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="cs-label" htmlFor="cs-fiscal">
                    {t('fiscalYearStart' as any)}
                  </label>
                  <AutoCompleteSelect
                    id="cs-fiscal"
                    value={formData.fiscalYearStartMonth || 1}
                    onChange={(e) => handleChange('fiscalYearStartMonth', e.value)}
                    options={MONTHS.map((month) => ({ label: month.label(t), value: month.value }))}
                    optionLabel="label"
                    optionValue="value"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
