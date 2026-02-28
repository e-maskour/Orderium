import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Save } from 'lucide-react';
import { toastUpdated, toastError } from '../../services/toast.service';
import { companyService, ICompany } from '../../modules/company';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';
import { Input } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { FormField } from '../../components/ui/form-field';
import { Button } from '../../components/ui/button';

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
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
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

      <div className="p-6">
        <form onSubmit={handleSubmit} className="max-w-5xl">
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Informations de base</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nom de l'entreprise *" htmlFor="company-name" className="col-span-2">
                  <Input
                    id="company-name"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                  />
                </FormField>

                <FormField label="Adresse" htmlFor="company-address" className="col-span-2">
                  <Input
                    id="company-address"
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </FormField>

                <FormField label="Code postal" htmlFor="company-zip">
                  <Input
                    id="company-zip"
                    type="text"
                    value={formData.zipCode || ''}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                  />
                </FormField>

                <FormField label="Ville" htmlFor="company-city">
                  <NativeSelect
                    id="company-city"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                  >
                    <option value="">Sélectionner une ville</option>
                    {MOROCCAN_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </NativeSelect>
                </FormField>

                <FormField label="État/Province" htmlFor="company-state">
                  <Input
                    id="company-state"
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </FormField>

                <FormField label="Pays" htmlFor="company-country">
                  <Input
                    id="company-country"
                    type="text"
                    value={formData.country || 'Maroc'}
                    readOnly
                  />
                </FormField>

                <FormField label="Téléphone" htmlFor="company-phone">
                  <Input
                    id="company-phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </FormField>

                <FormField label="Fax" htmlFor="company-fax">
                  <Input
                    id="company-fax"
                    type="tel"
                    value={formData.fax || ''}
                    onChange={(e) => handleChange('fax', e.target.value)}
                  />
                </FormField>

                <FormField label="Email" htmlFor="company-email">
                  <Input
                    id="company-email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </FormField>

                <FormField label="Site web" htmlFor="company-website">
                  <Input
                    id="company-website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://www.exemple.com"
                  />
                </FormField>

                <FormField label="Professions / Mots-clés" htmlFor="company-professions" className="col-span-2">
                  <Input
                    id="company-professions"
                    type="text"
                    value={formData.professions || ''}
                    onChange={(e) => handleChange('professions', e.target.value)}
                    placeholder="Ex: Distribution, Vente en gros"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Legal & Administrative Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Informations légales et administratives</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Numéro de TVA" htmlFor="company-vat">
                  <Input
                    id="company-vat"
                    type="text"
                    value={formData.vatNumber || ''}
                    onChange={(e) => handleChange('vatNumber', e.target.value)}
                    placeholder="MA12345678"
                  />
                </FormField>

                <FormField label="ICE (Identifiant Commun de l'Entreprise)" htmlFor="company-ice">
                  <Input
                    id="company-ice"
                    type="text"
                    value={formData.ice || ''}
                    onChange={(e) => handleChange('ice', e.target.value)}
                    placeholder="000000000000000"
                    maxLength={15}
                  />
                </FormField>

                <FormField label="IF (Identifiant Fiscal)" htmlFor="company-tax-id">
                  <Input
                    id="company-tax-id"
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                  />
                </FormField>

                <FormField label="RC (Registre de Commerce)" htmlFor="company-rc">
                  <Input
                    id="company-rc"
                    type="text"
                    value={formData.registrationNumber || ''}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                    placeholder="RC123456"
                  />
                </FormField>

                <FormField label="Forme juridique" htmlFor="company-legal">
                  <NativeSelect
                    id="company-legal"
                    value={formData.legalStructure || ''}
                    onChange={(e) => handleChange('legalStructure', e.target.value)}
                  >
                    <option value="">Sélectionner</option>
                    {LEGAL_STRUCTURES.map(structure => (
                      <option key={structure} value={structure}>{structure}</option>
                    ))}
                  </NativeSelect>
                </FormField>

                <FormField label="Capital (MAD)" htmlFor="company-capital">
                  <Input
                    id="company-capital"
                    type="number"
                    value={formData.capital || ''}
                    onChange={(e) => handleChange('capital', parseFloat(e.target.value))}
                  />
                </FormField>

                <FormField label="Début de l'exercice fiscal" htmlFor="company-fiscal">
                  <NativeSelect
                    id="company-fiscal"
                    value={formData.fiscalYearStartMonth || 1}
                    onChange={(e) => handleChange('fiscalYearStartMonth', parseInt(e.target.value))}
                  >
                    {MONTHS.map(month => (
                      <option key={month.value} value={month.value}>{month.label(t)}</option>
                    ))}
                  </NativeSelect>
                </FormField>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              loading={updateMutation.isPending}
              loadingText="Enregistrement..."
              leadingIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
