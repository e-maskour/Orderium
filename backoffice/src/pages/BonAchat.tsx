import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingBag } from 'lucide-react';

export default function BonAchat() {
  const { t } = useLanguage();

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={ShoppingBag}
          title="Bon d'Achat"
          subtitle="Gérez vos bons d'achat"
        />
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-slate-600">Page en construction...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
