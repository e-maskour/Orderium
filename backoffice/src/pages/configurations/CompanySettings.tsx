import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Save, ArrowLeft, MapPin, FileText, Mail, Phone, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toastUpdated, toastError } from '../../services/toast.service';
import { companyService, ICompany } from '../../modules/company';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

const MOROCCAN_CITIES = [
    'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Agadir', 'Tanger', 'Meknès',
    'Oujda', 'Kénitra', 'Tétouan', 'Safi', 'El Jadida', 'Nador', 'Settat',
    'Mohammedia', 'Khouribga', 'Béni Mellal', 'Salé', 'Essaouira', 'Larache'
];

const LEGAL_STRUCTURES = [
    'SARL', 'SA', 'SAS', 'SASU', 'SNC', 'SCS', 'Entreprise Individuelle', 'Auto-Entrepreneur'
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

    const { data: company, isLoading } = useQuery({
        queryKey: ['company', 'info'],
        queryFn: () => companyService.getCompanyInfo(),
    });

    useEffect(() => {
        if (company) {
            setFormData(company.toJSON());
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            updateMutation.mutate(formData);
        }
    };

    const handleChange = (field: keyof ICompany, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    if (isLoading || !formData) {
        return (
            <AdminLayout>
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
                    <Loader2 className="animate-spin" style={{ width: '1.5rem', height: '1.5rem', color: '#475569' }} />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <PageHeader
                icon={Building2}
                title={t('companyInformation')}
                subtitle={t('manageCompanyInfo')}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button
                            onClick={() => { if (formData) updateMutation.mutate(formData); }}
                            icon={updateMutation.isPending ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Save style={{ width: 16, height: 16 }} />}
                            label={t('save')}
                            disabled={updateMutation.isPending || !formData}
                            size="small"
                        />
                    </div>
                }
            />

            <style>{`
                .cs-form { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
                @media (min-width: 768px) { .cs-form { padding: 1.5rem; } }
                .cs-card { background: #ffffff; border-radius: 0.75rem; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03); }
                .cs-card-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }
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
                .cs-sep { border: none; border-top: 1px solid #f1f5f9; margin: 0.25rem 0; }
                .cs-identity-wrap { display: flex; gap: 1.25rem; align-items: flex-start; }
                @media (max-width: 480px) { .cs-identity-wrap { flex-direction: column; align-items: stretch; } }
                .cs-avatar { flex-shrink: 0; width: 4.5rem; height: 4.5rem; border-radius: 1rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; font-size: 1.375rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; box-shadow: 0 4px 14px rgba(99,102,241,0.3); }
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
                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>Identité de l'entreprise</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Nom officiel et secteur d'activité</p>
                        </div>
                    </div>
                    <div className="cs-card-body">
                        <div className="cs-identity-wrap">
                            <div className="cs-avatar">
                                {(formData.companyName || 'EN').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'E'}
                            </div>
                            <div className="cs-identity-fields">
                                <div>
                                    <label className="cs-label" htmlFor="cs-cname">Nom de l'entreprise <span className="cs-req">*</span></label>
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
                                    <label className="cs-label" htmlFor="cs-professions">Professions / Activités</label>
                                    <InputText
                                        id="cs-professions"
                                        type="text"
                                        value={formData.professions || ''}
                                        onChange={(e) => handleChange('professions', e.target.value)}
                                        placeholder="Ex: Distribution, Vente en gros..."
                                        style={{ width: '100%' }}
                                    />
                                    <p className="cs-hint">Apparaît sur vos documents commerciaux</p>
                                </div>
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
                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>Contact & Localisation</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Adresse postale et coordonnées</p>
                        </div>
                    </div>
                    <div className="cs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="cs-grid">
                            <div className="cs-col-2">
                                <label className="cs-label" htmlFor="cs-address">Adresse</label>
                                <InputText
                                    id="cs-address"
                                    type="text"
                                    value={formData.address || ''}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-zip">Code postal</label>
                                <InputText
                                    id="cs-zip"
                                    type="text"
                                    value={formData.zipCode || ''}
                                    onChange={(e) => handleChange('zipCode', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-city">Ville</label>
                                <Dropdown
                                    id="cs-city"
                                    value={formData.city || ''}
                                    onChange={(e) => handleChange('city', e.value)}
                                    options={[{ label: 'Sélectionner une ville', value: '' }, ...MOROCCAN_CITIES.map(city => ({ label: city, value: city }))]}
                                    optionLabel="label"
                                    optionValue="value"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-state">État / Province</label>
                                <InputText
                                    id="cs-state"
                                    type="text"
                                    value={formData.state || ''}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-country">Pays</label>
                                <InputText
                                    id="cs-country"
                                    type="text"
                                    value={formData.country || 'Maroc'}
                                    readOnly
                                    style={{ width: '100%', background: '#f8fafc', color: '#64748b' }}
                                />
                            </div>
                        </div>

                        <hr className="cs-sep" />

                        <div className="cs-grid">
                            <div>
                                <label className="cs-label" htmlFor="cs-phone">
                                    <Phone style={{ display: 'inline', width: '0.75rem', height: '0.75rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                    Téléphone
                                </label>
                                <InputText
                                    id="cs-phone"
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-fax">Fax</label>
                                <InputText
                                    id="cs-fax"
                                    type="tel"
                                    value={formData.fax || ''}
                                    onChange={(e) => handleChange('fax', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-email">
                                    <Mail style={{ display: 'inline', width: '0.75rem', height: '0.75rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                    Email
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
                                    <Globe style={{ display: 'inline', width: '0.75rem', height: '0.75rem', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                    Site web
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
                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>Informations légales & administratives</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Identifiants fiscaux et structure juridique</p>
                        </div>
                    </div>
                    <div className="cs-card-body">
                        <div className="cs-grid">
                            <div>
                                <label className="cs-label" htmlFor="cs-vat">Numéro de TVA</label>
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
                                <label className="cs-label" htmlFor="cs-ice">ICE — Identifiant Commun de l'Entreprise</label>
                                <InputText
                                    id="cs-ice"
                                    type="text"
                                    value={formData.ice || ''}
                                    onChange={(e) => handleChange('ice', e.target.value)}
                                    placeholder="000000000000000"
                                    maxLength={15}
                                    style={{ width: '100%' }}
                                />
                                <p className="cs-hint">15 chiffres obligatoires</p>
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-taxid">IF — Identifiant Fiscal</label>
                                <InputText
                                    id="cs-taxid"
                                    type="text"
                                    value={formData.taxId || ''}
                                    onChange={(e) => handleChange('taxId', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-rc">RC — Registre de Commerce</label>
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
                                <label className="cs-label" htmlFor="cs-legal">Forme juridique</label>
                                <Dropdown
                                    id="cs-legal"
                                    value={formData.legalStructure || ''}
                                    onChange={(e) => handleChange('legalStructure', e.value)}
                                    options={[{ label: 'Sélectionner', value: '' }, ...LEGAL_STRUCTURES.map(structure => ({ label: structure, value: structure }))]}
                                    optionLabel="label"
                                    optionValue="value"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-capital">Capital (MAD)</label>
                                <InputText
                                    id="cs-capital"
                                    type="number"
                                    value={String(formData.capital || '')}
                                    onChange={(e) => handleChange('capital', parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="cs-label" htmlFor="cs-fiscal">Début de l'exercice fiscal</label>
                                <Dropdown
                                    id="cs-fiscal"
                                    value={formData.fiscalYearStartMonth || 1}
                                    onChange={(e) => handleChange('fiscalYearStartMonth', e.value)}
                                    options={MONTHS.map(month => ({ label: month.label(t), value: month.value }))}
                                    optionLabel="label"
                                    optionValue="value"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </form>
        </AdminLayout>
    );
}
