import { Link } from 'react-router-dom';
import {
  Settings,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  Ruler,
  Building2,
  Package,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function Configurations() {
  const { t } = useLanguage();
  const configModules = [
    {
      name: t('generalParams'),
      description: t('generalParamsDescription'),
      icon: SlidersHorizontal,
      path: '/configurations/general',
      color: '#0ea5e9',
    },
    {
      name: t('companyInformation'),
      description: t('companyInformationDescription'),
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
      color: 'var(--primary-color)',
    },
    {
      name: t('printers'),
      description: t('printersDescription'),
      icon: Printer,
      path: '/configurations/printers',
      color: '#8b5cf6',
    },
  ];

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Settings}
          title={t('configurations')}
          subtitle={t('manageSystemConfigurations')}
          actions={undefined}
        />

        <div className="config-modules-grid">
          {configModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className="config-module-card"
                style={{ '--module-color': module.color } as React.CSSProperties}
              >
                <div className="config-module-icon">
                  <Icon
                    style={{ width: '1.5rem', height: '1.5rem', color: 'var(--text-on-primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem',
                      margin: '0 0 0.25rem',
                    }}
                  >
                    {module.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-label)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {module.description}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ color: '#cbd5e1', flexShrink: 0, marginTop: '0.25rem' }}
                >
                  <path
                    d="M6 12l4-4-4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        .config-modules-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .config-module-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--erp-surface);
          border-radius: 0.875rem;
          border: 1.5px solid var(--erp-border);
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          box-shadow: var(--erp-shadow-sm);
          height: 100%;
          min-height: 5.5rem;
        }
        .config-module-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--erp-shadow);
          border-color: color-mix(in srgb, var(--module-color, var(--primary-color)) 40%, transparent);
        }
        .config-module-card:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring);
          border-color: color-mix(in srgb, var(--module-color, var(--primary-color)) 50%, transparent);
        }
        .config-module-icon {
          width: 3rem;
          height: 3rem;
          background: var(--module-color, var(--primary-color));
          border-radius: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 8px color-mix(in srgb, var(--module-color, var(--primary-color)) 35%, transparent);
        }
        @media (max-width: 1023px) { .config-modules-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 639px)  { .config-modules-grid { grid-template-columns: 1fr; } }
      `}</style>
    </AdminLayout>
  );
}
