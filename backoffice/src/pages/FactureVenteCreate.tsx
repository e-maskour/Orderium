import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FactureForm } from '../components/FactureForm';
import { invoicesService } from '../modules/invoices/invoices.service';

export default function FactureVenteCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreateInvoice = async (data: any) => {
    try {
      setLoading(true);
      const newInvoice = await invoicesService.create(data);
      // TODO: Show success toast
      navigate(`/facture-vente/edit/${newInvoice.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/facture-vente');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={FileText}
          title="Nouvelle Facture de Vente"
          subtitle="Créer une nouvelle facture client"
          actions={
            <button
              onClick={() => navigate('/facture-vente')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <FactureForm
            type="vente"
            onSubmit={handleCreateInvoice}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
