import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FactureForm } from '../components/FactureForm';
import { invoicesService } from '../modules/invoices/invoices.service';

export default function FactureAchatCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreateInvoice = async (data: any) => {
    try {
      setLoading(true);
      await invoicesService.create(data);
      // TODO: Show success toast
      navigate('/facture-achat');
    } catch (error) {
      console.error('Error creating invoice:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/facture-achat');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={FileText}
          title="Nouvelle Facture d'Achat"
          subtitle="Créer une nouvelle facture fournisseur"
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <FactureForm
            type="achat"
            onSubmit={handleCreateInvoice}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
