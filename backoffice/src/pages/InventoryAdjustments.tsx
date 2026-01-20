import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ClipboardCheck } from 'lucide-react';

export default function InventoryAdjustments() {
  return (
    <AdminLayout>
      <PageHeader
        icon={ClipboardCheck}
        title="Inventory Adjustments"
        subtitle="Manage inventory counts and adjustments"
      />
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">Inventory adjustments interface</p>
        <p className="text-sm text-slate-500">Feature coming soon</p>
      </div>
    </AdminLayout>
  );
}
