import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit, Wallet } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FactureForm } from '../components/FactureForm';
import { invoicesService } from '../modules/invoices/invoices.service';
import { InvoiceWithDetails } from '../modules/invoices/invoices.model';
import { InvoiceStatus } from '../types';
import PaymentHistoryModal from '../components/PaymentHistoryModal';

export default function FactureVenteEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoice(parseInt(id));
    }
  }, [id]);

  const loadInvoice = async (invoiceId: number) => {
    try {
      setLoading(true);
      const data = await invoicesService.getById(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      // TODO: Show error toast
      navigate('/facture-vente');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvoice = async (data: any) => {
    if (!id) return;
    
    try {
      setSaving(true);
      await invoicesService.update(parseInt(id), data);
      // TODO: Show success toast
      navigate('/facture-vente');
    } catch (error) {
      console.error('Error updating invoice:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/facture-vente');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!invoice) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Facture introuvable</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Edit}
          title="Modifier Facture de Vente"
          subtitle={`Facture N° ${invoice.invoice.invoiceNumber}`}
        />

        {/* Payment Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Statut de paiement</p>
                <div className="flex items-center gap-2">
                  {invoice.invoice.status === InvoiceStatus.DRAFT ? (
                    <span className="px-3 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-sm font-medium">
                      Brouillon
                    </span>
                  ) : invoice.invoice.status === InvoiceStatus.PAID ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-medium">
                      Payée
                    </span>
                  ) : invoice.invoice.status === InvoiceStatus.PARTIAL ? (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium">
                      Partiellement payée
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-sm font-medium">
                      Impayée
                    </span>
                  )}
                </div>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <p className="text-sm text-slate-600 mb-1">Total facture</p>
                <p className="text-lg font-bold text-slate-900">{invoice.invoice.total.toFixed(2)} MAD</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Gérer les paiements
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <FactureForm
            type="vente"
            initialData={{
              partnerId: invoice.invoice.customerId,
              partnerName: invoice.invoice.customerName,
              partnerPhone: invoice.invoice.customerPhone,
              partnerAddress: invoice.invoice.customerAddress,
              date: invoice.invoice.date,
              dueDate: invoice.invoice.dueDate,
              notes: invoice.invoice.notes,
              items: invoice.items
            }}
            onSubmit={handleUpdateInvoice}
            onCancel={handleCancel}
            onPaymentClick={() => setShowPaymentModal(true)}
            loading={saving}
          />
        </div>
      </div>

      <PaymentHistoryModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoiceId={invoice.invoice.id}
        invoiceNumber={invoice.invoice.invoiceNumber}
        invoiceTotal={invoice.invoice.total}
        customerId={invoice.invoice.customerId}
        onPaymentUpdate={() => loadInvoice(parseInt(id!))}
      />
    </AdminLayout>
  );
}
