import { Link } from 'react-router-dom';
import { Settings, Percent, DollarSign, Calendar, Hash, Ruler, ArrowLeft, Building2, Package } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function Configurations() {
  const { t } = useLanguage();
  const configModules = [
    {
      name: 'Informations Entreprise',
      description: 'Gérer les informations de votre entreprise',
      icon: Building2,
      path: '/configurations/company',
      color: '#6366f1',
    },
    {
      name: t('taxes'),
      description: t('manageTaxRatesDescription'),
      icon: Percent,
      path: '/configurations/taxes',
      color: '#3b82f6',
    },
    {
      name: t('currencies'),
      description: t('manageCurrenciesDescription'),
      icon: DollarSign,
      path: '/configurations/currencies',
      color: '#22c55e',
    },
    {
      name: t('paymentTerms'),
      description: t('managePaymentTermsDescription'),
      icon: Calendar,
      path: '/configurations/payment-terms',
      color: '#a855f7',
    },
    {
      name: t('sequences'),
      description: t('manageSequencesDescription'),
      icon: Hash,
      path: '/configurations/sequences',
      color: '#f97316',
    },
    {
      name: t('unitsOfMeasure') || 'Units of Measure',
      description: t('manageUomDescription') || 'Manage units of measure for inventory',
      icon: Ruler,
      path: '/configurations/uom',
      color: '#14b8a6',
    },
    {
      name: t('inventorySettings'),
      description: t('inventorySettingsSubtitle'),
      icon: Package,
      path: '/configurations/inventory',
      color: '#235ae4',
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        icon={Settings}
        title={t('configurations')}
        subtitle={t('manageSystemConfigurations')}
        actions={
          <Link
            to="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#475569', textDecoration: 'none' }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            {t('backToDashboard')}
          </Link>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {configModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.path}
              to={module.path}
              style={{ display: 'block', padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: module.color, borderRadius: '0.5rem' }}>
                  <Icon style={{ width: '1.5rem', height: '1.5rem', color: '#ffffff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                    {module.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#475569' }}>
                    {module.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AdminLayout>
  );
}
