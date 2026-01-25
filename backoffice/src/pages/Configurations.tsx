import { Link } from 'react-router-dom';
import { Settings, Percent, DollarSign, Calendar, Hash, Ruler, ArrowLeft } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function Configurations() {
  const { t } = useLanguage();
  const configModules = [
    {
      name: t('taxes'),
      description: t('manageTaxRatesDescription'),
      icon: Percent,
      path: '/configurations/taxes',
      color: 'bg-blue-500',
    },
    {
      name: t('currencies'),
      description: t('manageCurrenciesDescription'),
      icon: DollarSign,
      path: '/configurations/currencies',
      color: 'bg-green-500',
    },
    {
      name: t('paymentTerms'),
      description: t('managePaymentTermsDescription'),
      icon: Calendar,
      path: '/configurations/payment-terms',
      color: 'bg-purple-500',
    },
    {
      name: t('sequences'),
      description: t('manageSequencesDescription'),
      icon: Hash,
      path: '/configurations/sequences',
      color: 'bg-orange-500',
    },
    {
      name: t('unitsOfMeasure') || 'Units of Measure',
      description: t('manageUomDescription') || 'Manage units of measure for inventory',
      icon: Ruler,
      path: '/configurations/uom',
      color: 'bg-teal-500',
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
            className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-500"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.path}
              to={module.path}
              className="block p-6 bg-white rounded-lg border border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 ${module.color} rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1 group-hover:text-amber-500 transition-colors">
                    {module.name}
                  </h3>
                  <p className="text-sm text-slate-600">
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
