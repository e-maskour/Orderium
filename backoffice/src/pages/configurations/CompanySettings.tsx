import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Save } from 'lucide-react';
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
            />

            <div style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSubmit} style={{ maxWidth: '64rem' }}>
                    {/* Basic Information Section */}
                    <div style={{ background: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>Informations de base</h2>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Nom de l'entreprise *</label>
                                    <InputText
                                        id="company-name"
                                        type="text"
                                        required
                                        value={formData.companyName}
                                        onChange={(e) => handleChange('companyName', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Adresse</label>
                                    <InputText
                                        id="company-address"
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Code postal</label>
                                    <InputText
                                        id="company-zip"
                                        type="text"
                                        value={formData.zipCode || ''}
                                        onChange={(e) => handleChange('zipCode', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Ville</label>
                                    <Dropdown
                                        id="company-city"
                                        value={formData.city || ''}
                                        onChange={(e) => handleChange('city', e.value)}
                                        options={[{ label: 'Sélectionner une ville', value: '' }, ...MOROCCAN_CITIES.map(city => ({ label: city, value: city }))]}
                                        optionLabel="label"
                                        optionValue="value"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>État/Province</label>
                                    <InputText
                                        id="company-state"
                                        type="text"
                                        value={formData.state || ''}
                                        onChange={(e) => handleChange('state', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Pays</label>
                                    <InputText
                                        id="company-country"
                                        type="text"
                                        value={formData.country || 'Maroc'}
                                        readOnly
                                        style={{ width: '100%', background: '#f8fafc' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Téléphone</label>
                                    <InputText
                                        id="company-phone"
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Fax</label>
                                    <InputText
                                        id="company-fax"
                                        type="tel"
                                        value={formData.fax || ''}
                                        onChange={(e) => handleChange('fax', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Email</label>
                                    <InputText
                                        id="company-email"
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Site web</label>
                                    <InputText
                                        id="company-website"
                                        type="url"
                                        value={formData.website || ''}
                                        onChange={(e) => handleChange('website', e.target.value)}
                                        placeholder="https://www.exemple.com"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Professions / Mots-clés</label>
                                    <InputText
                                        id="company-professions"
                                        type="text"
                                        value={formData.professions || ''}
                                        onChange={(e) => handleChange('professions', e.target.value)}
                                        placeholder="Ex: Distribution, Vente en gros"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal & Administrative Section */}
                    <div style={{ background: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>Informations légales et administratives</h2>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Numéro de TVA</label>
                                    <InputText
                                        id="company-vat"
                                        type="text"
                                        value={formData.vatNumber || ''}
                                        onChange={(e) => handleChange('vatNumber', e.target.value)}
                                        placeholder="MA12345678"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>ICE (Identifiant Commun de l'Entreprise)</label>
                                    <InputText
                                        id="company-ice"
                                        type="text"
                                        value={formData.ice || ''}
                                        onChange={(e) => handleChange('ice', e.target.value)}
                                        placeholder="000000000000000"
                                        maxLength={15}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>IF (Identifiant Fiscal)</label>
                                    <InputText
                                        id="company-tax-id"
                                        type="text"
                                        value={formData.taxId || ''}
                                        onChange={(e) => handleChange('taxId', e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>RC (Registre de Commerce)</label>
                                    <InputText
                                        id="company-rc"
                                        type="text"
                                        value={formData.registrationNumber || ''}
                                        onChange={(e) => handleChange('registrationNumber', e.target.value)}
                                        placeholder="RC123456"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Forme juridique</label>
                                    <Dropdown
                                        id="company-legal"
                                        value={formData.legalStructure || ''}
                                        onChange={(e) => handleChange('legalStructure', e.value)}
                                        options={[{ label: 'Sélectionner', value: '' }, ...LEGAL_STRUCTURES.map(structure => ({ label: structure, value: structure }))]}
                                        optionLabel="label"
                                        optionValue="value"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Capital (MAD)</label>
                                    <InputText
                                        id="company-capital"
                                        type="number"
                                        value={String(formData.capital || '')}
                                        onChange={(e) => handleChange('capital', parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Début de l'exercice fiscal</label>
                                    <Dropdown
                                        id="company-fiscal"
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

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <Button
                            type="submit"
                            loading={updateMutation.isPending}
                            icon={<Save style={{ width: '1rem', height: '1rem' }} />}
                            label="Enregistrer"
                        />
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
