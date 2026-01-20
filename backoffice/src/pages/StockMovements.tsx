import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ArrowLeftRight } from 'lucide-react';

export default function StockMovements() {
  return (
    <AdminLayout>
      <PageHeader
        icon={ArrowLeftRight}
        title="Stock Movements"
        subtitle="Track and manage stock movements"
      />
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <ArrowLeftRight className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">Stock movements interface</p>
        <p className="text-sm text-slate-500">Feature coming soon</p>
      </div>
    </AdminLayout>
  );
}
