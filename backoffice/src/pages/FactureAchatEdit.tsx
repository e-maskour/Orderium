import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit, Wallet, ArrowLeft } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FactureForm } from '../components/FactureForm';
import { invoicesService } from '../modules/invoices/invoices.service';
import { InvoiceWithDetails } from '../modules/invoices/invoices.model';
import { InvoiceStatus } from '../types';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { paymentsService } from '../modules/payments';

export default function FactureAchatEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDevalidateConfirm, setShowDevalidateConfirm] = useState(false);
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);

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
      
      // Fetch total paid
      const paid = await paymentsService.getTotalPaid(invoiceId);
      setTotalPaid(paid);
    } catch (error) {
      console.error('Error loading invoice:', error);
      // TODO: Show error toast
      navigate('/facture-achat');
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
      // Reload invoice data instead of navigating away
      await loadInvoice(parseInt(id));
    } catch (error) {
      console.error('Error updating invoice:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/facture-achat');
  };

  const handleDevalidate = async () => {
    setShowDevalidateConfirm(true);
  };

  const handleValidate = async () => {
    setShowValidateConfirm(true);
  };

  const confirmValidate = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      await invoicesService.validate(parseInt(id));
      await loadInvoice(parseInt(id)); // Reload invoice
      setShowValidateConfirm(false);
    } catch (error) {
      console.error('Error validating invoice:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const confirmDevalidate = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      await invoicesService.devalidate(parseInt(id));
      await loadInvoice(parseInt(id)); // Reload invoice
      setShowDevalidateConfirm(false);
    } catch (error) {
      console.error('Error devalidating invoice:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
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
          title="Modifier Facture d'Achat"
          subtitle={`Facture N° ${invoice.invoice.invoiceNumber}${invoice.invoice.isValidated ? ' (Validée - Lecture seule)' : ''}`}
          actions={
            <button
              onClick={() => navigate('/facture-achat')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          }
        />

        {/* Validation Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-semibold text-slate-800">Statut de la facture</h3>
                <p className="text-sm text-slate-600">
                  {invoice.invoice.isValidated ? (
                    <>Cette facture est validée et en lecture seule. Pour la modifier, vous devez d'abord la dévalider.</>
                  ) : (
                    <>Cette facture est en brouillon et peut être modifiée.</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!invoice.invoice.isValidated ? (
                <button
                  onClick={() => handleValidate()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Valider
                </button>
              ) : (
                <button
                  onClick={() => handleDevalidate()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Dévalider
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment Status - Only for non-draft invoices */}
        {invoice.invoice.status !== InvoiceStatus.DRAFT && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Informations de paiement</p>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <p className="text-sm text-slate-600 mb-1">Statut de paiement</p>
                  <div className="flex items-center gap-2">
                    {invoice.invoice.status === InvoiceStatus.PAID ? (
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
                <div className="border-l border-slate-200 pl-4">
                  <p className="text-sm text-slate-600 mb-1">Total payé</p>
                  <p className="text-lg font-bold text-emerald-600">{totalPaid.toFixed(2)} MAD</p>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <p className="text-sm text-slate-600 mb-1">Reste à payer</p>
                  <p className="text-lg font-bold text-amber-600">{(invoice.invoice.total - totalPaid).toFixed(2)} MAD</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Gérer les paiements
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <FactureForm
            type="achat"
            initialData={{
              partnerId: invoice.invoice.supplierId,
              partnerName: invoice.invoice.supplierName,
              partnerPhone: invoice.invoice.supplierPhone,
              partnerAddress: invoice.invoice.supplierAddress,
              date: invoice.invoice.date,
              dueDate: invoice.invoice.dueDate,
              notes: invoice.invoice.notes,
              items: invoice.items
            }}
            onSubmit={handleUpdateInvoice}
            onCancel={handleCancel}
            loading={saving}
            readOnly={invoice.invoice.isValidated}
          />
        </div>
      </div>

      <PaymentHistoryModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoiceId={invoice.invoice.id}
        invoiceNumber={invoice.invoice.invoiceNumber}
        invoiceTotal={invoice.invoice.total}
        supplierId={invoice.invoice.supplierId || undefined}
        onPaymentUpdate={() => loadInvoice(parseInt(id!))}
      />

      <ConfirmDialog
        isOpen={showValidateConfirm}
        onClose={() => setShowValidateConfirm(false)}
        onConfirm={confirmValidate}
        title="Valider la facture"
        message="Êtes-vous sûr de vouloir valider cette facture ? Elle deviendra en lecture seule et recevra un numéro définitif."
        type="warning"
        confirmText="Valider"
        cancelText="Annuler"
      />

      <ConfirmDialog
        isOpen={showDevalidateConfirm}
        onClose={() => setShowDevalidateConfirm(false)}
        onConfirm={confirmDevalidate}
        title="Dévalider la facture"
        message="Êtes-vous sûr de vouloir dévalider cette facture ? Elle redeviendra un brouillon modifiable."
        type="warning"
        confirmText="Dévalider"
        cancelText="Annuler"
      />
    </AdminLayout>
  );
}
