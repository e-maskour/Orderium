import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { FactureTable } from '../components/FactureTable';
import { invoicesService } from '../modules/invoices/invoices.service';
import { InvoiceWithDetails } from '../modules/invoices/invoices.model';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';

export default function FactureVente() {

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: number; number: string; total: number } | null>(null);
  
  // Confirmation dialogs
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [showDevalidateConfirm, setShowDevalidateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInvoiceId, setConfirmInvoiceId] = useState<number | null>(null);
  
  // Alert dialog
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '', type: 'error' as const });

  // Load invoices from API
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesService.getAll(); // Get all invoices
      // Filter for sales invoices (those with customers)
      const salesInvoices = data.filter(inv => inv.invoice.customerId);
      setInvoices(salesInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Transform invoices for table display
  const transformedFactures = invoices.map(inv => ({
    id: inv.invoice.id,
    number: inv.invoice.invoiceNumber,
    date: inv.invoice.date,
    partnerName: inv.invoice.customerName || 'Client inconnu',
    amount: inv.invoice.total,
    status: inv.invoice.status === 'paid' ? 'paid' as const : 
             inv.invoice.status === 'partial' ? 'partial' as const :
             inv.invoice.status === 'draft' ? 'draft' as const :
             inv.invoice.status === 'unpaid' && inv.invoice.dueDate && new Date(inv.invoice.dueDate) < new Date() ? 'overdue' as const :
             inv.invoice.status === 'unpaid' ? 'unpaid' as const : 'unpaid' as const,
    isValidated: inv.invoice.isValidated,
    dueDate: inv.invoice.dueDate || undefined,
    itemsCount: inv.items.length
  }));

  const handleEdit = (id: number) => {
    navigate(`/facture-vente/edit/${id}`);
  };

  const handleValidate = async (id: number) => {
    setConfirmInvoiceId(id);
    setShowValidateConfirm(true);
  };

  const handleDevalidate = async (id: number) => {
    setConfirmInvoiceId(id);
    setShowDevalidateConfirm(true);
  };

  const confirmValidate = async () => {
    if (confirmInvoiceId === null) return;
    
    try {
      await invoicesService.validate(confirmInvoiceId);
      await loadInvoices(); // Reload list
      setShowValidateConfirm(false);
      setConfirmInvoiceId(null);
    } catch (error) {
      console.error('Error validating invoice:', error);
      setShowValidateConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors de la validation de la facture',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const confirmDevalidate = async () => {
    if (confirmInvoiceId === null) return;
    
    try {
      await invoicesService.devalidate(confirmInvoiceId);
      await loadInvoices(); // Reload list
      setShowDevalidateConfirm(false);
      setConfirmInvoiceId(null);
    } catch (error) {
      console.error('Error devalidating invoice:', error);
      setShowDevalidateConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors de la dévalidation de la facture',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmInvoiceId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (confirmInvoiceId === null) return;
    
    try {
      await invoicesService.delete(confirmInvoiceId);
      await loadInvoices(); // Reload list
      setShowDeleteConfirm(false);
      setConfirmInvoiceId(null);
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      setShowDeleteConfirm(false);
      setAlertMessage({
        title: 'Suppression impossible',
        message: error.message || 'Erreur lors de la suppression de la facture',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleDownload = (id: number) => {
    console.log('Download facture:', id);
    // TODO: Implement PDF download
  };

  const handleViewPayments = (id: number) => {
    const invoice = invoices.find(inv => inv.invoice.id === id);
    if (invoice) {
      setSelectedInvoice({
        id: invoice.invoice.id,
        number: invoice.invoice.invoiceNumber,
        total: invoice.invoice.total
      });
      setShowPaymentModal(true);
    }
  };

  const tabs = [
    { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'list', label: 'Liste des factures', icon: List },
  ];

  // Calculate statistics
  const totalInvoices = invoices.length;
  const draftInvoices = invoices.filter(inv => inv.invoice.status === 'draft').length;
  const unpaidInvoices = invoices.filter(inv => inv.invoice.status === 'unpaid').length;
  const partialInvoices = invoices.filter(inv => inv.invoice.status === 'partial').length;
  const paidInvoices = invoices.filter(inv => inv.invoice.status === 'paid').length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.invoice.total, 0);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={FileText}
          title="Factures de Vente"
          subtitle="Gérez vos factures de vente"
          actions={
            <button
              onClick={() => navigate('/facture-vente/create')}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvelle facture
            </button>
          }
        />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 p-2 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-3 pt-2">
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Stats Cards */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-1">{totalInvoices}</h3>
                    <p className="text-sm text-blue-700">Factures totales</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">Partielles</span>
                    </div>
                    <h3 className="text-2xl font-bold text-amber-900 mb-1">{partialInvoices}</h3>
                    <p className="text-sm text-amber-700">Partiellement payées</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">Payées</span>
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-900 mb-1">{paidInvoices}</h3>
                    <p className="text-sm text-emerald-700">Factures payées</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">Montant</span>
                    </div>
                    <h3 className="text-2xl font-bold text-purple-900 mb-1">{totalAmount.toFixed(2)} DH</h3>
                    <p className="text-sm text-purple-700">Revenu total</p>
                  </div>
                </div>

                {/* Dashboard Grid - 4 Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart Section - Validated Invoices */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Nombres de factures validées - Facture client</h3>
                    <div className="flex items-end justify-around h-48 px-4">
                      {/* Draft */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-12 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-lg transition-all hover:from-slate-500 hover:to-slate-400"
                          style={{ height: `${Math.min((draftInvoices / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">Brouillon</span>
                        <span className="text-sm font-bold text-slate-600">{draftInvoices}</span>
                      </div>
                      {/* Unpaid */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-12 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all hover:from-orange-600 hover:to-orange-500"
                          style={{ height: `${Math.min((unpaidInvoices / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">Impayée</span>
                        <span className="text-sm font-bold text-orange-600">{unpaidInvoices}</span>
                      </div>
                      {/* Overdue */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-12 bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg transition-all hover:from-red-600 hover:to-red-500"
                          style={{ height: `${Math.min((transformedFactures.filter(f => f.status === 'overdue').length / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">En retard</span>
                        <span className="text-sm font-bold text-red-600">{transformedFactures.filter(f => f.status === 'overdue').length}</span>
                      </div>
                      {/* Partial */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-12 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all hover:from-amber-600 hover:to-amber-500"
                          style={{ height: `${Math.min((partialInvoices / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">Partielle</span>
                        <span className="text-sm font-bold text-amber-600">{partialInvoices}</span>
                      </div>
                      {/* Paid */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-12 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-600 hover:to-emerald-500"
                          style={{ height: `${Math.min((paidInvoices / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">Payées</span>
                        <span className="text-sm font-bold text-emerald-600">{paidInvoices}</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className="text-xs text-slate-500">Nombre total de factures: <span className="font-semibold text-slate-700">{totalInvoices}</span></span>
                    </div>
                  </div>

                  {/* Recent Invoices - Last 3 */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-slate-800 mb-2">Les 3 dernières factures client</h3>
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-slate-500 w-32">Client</span>
                        <span className="text-xs text-slate-500 w-24">Date facture</span>
                        <span className="text-xs text-slate-500 w-24 text-right">Montant TTC</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {transformedFactures.slice(0, 3).map((facture) => (
                        <div key={facture.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <button
                              onClick={() => handleEdit(facture.id)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {facture.number}
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 truncate">{facture.partnerName}</span>
                            <span className="text-xs text-slate-500 w-24">{new Date(facture.date).toLocaleDateString('fr-FR')}</span>
                            <span className="text-sm font-bold text-emerald-600 w-24 text-right">{facture.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {transformedFactures.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune facture récente</p>
                      )}
                    </div>
                  </div>

                  {/* Draft Invoices */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-bold text-slate-800">Factures clients brouillons</h3>
                        <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">{draftInvoices}</span>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-slate-500 w-32">Client</span>
                        <span className="text-xs text-slate-500 w-24">Date facture</span>
                        <span className="text-xs text-slate-500 w-24 text-right">Montant TTC</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {draftInvoices === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">Aucune facture brouillon</p>
                      ) : (
                        transformedFactures.filter(f => f.status === 'draft').slice(0, 3).map((facture) => (
                          <div key={facture.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <button
                                onClick={() => handleEdit(facture.id)}
                                className="text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline transition-colors"
                              >
                                {facture.number}
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 w-32 truncate">{facture.partnerName}</span>
                              <span className="text-xs text-slate-500 w-24">{new Date(facture.date).toLocaleDateString('fr-FR')}</span>
                              <span className="text-sm font-bold text-slate-600 w-24 text-right">{facture.amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Total</span>
                        <span className="text-base font-bold text-slate-800">{transformedFactures.filter(f => f.status === 'draft').reduce((sum, f) => sum + f.amount, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Unpaid Invoices */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-bold text-slate-800">Factures clients impayées</h3>
                        <span className="bg-red-200 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {transformedFactures.filter(f => f.status === 'unpaid').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-slate-500 w-32">Client</span>
                        <span className="text-xs text-slate-500 w-24">Date facture</span>
                        <span className="text-xs text-slate-500 w-24 text-right">Montant TTC</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transformedFactures.filter(f => f.status === 'unpaid').slice(0, 3).map((facture) => (
                        <div key={facture.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            <button
                              onClick={() => handleEdit(facture.id)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {facture.number}
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 truncate">{facture.partnerName}</span>
                            <span className="text-xs text-slate-500 w-24">{new Date(facture.date).toLocaleDateString('fr-FR')}</span>
                            <span className="text-sm font-bold text-amber-600 w-24 text-right">{facture.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {transformedFactures.filter(f => f.status === 'unpaid').length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune facture impayée</p>
                      )}
                      {transformedFactures.filter(f => f.status === 'unpaid').length > 3 && (
                        <p className="text-xs text-slate-400 text-center py-2">Plus... ({transformedFactures.filter(f => f.status === 'unpaid').length - 3})</p>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Total</span>
                        <span className="text-base font-bold text-slate-800">{transformedFactures.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-1">

                <FactureTable
                  type="vente"
                  factures={transformedFactures}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onViewPayments={handleViewPayments}
                  onValidate={handleValidate}
                  onDevalidate={handleDevalidate}
                  loading={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <PaymentHistoryModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.number}
          invoiceTotal={selectedInvoice.total}
          onPaymentUpdate={loadInvoices}
        />
      )}

      <ConfirmDialog
        isOpen={showValidateConfirm}
        onClose={() => {
          setShowValidateConfirm(false);
          setConfirmInvoiceId(null);
        }}
        onConfirm={confirmValidate}
        title="Valider la facture"
        message="Êtes-vous sûr de vouloir valider cette facture ? Elle passera en statut impayée."
        type="warning"
        confirmText="Valider"
        cancelText="Annuler"
      />

      <ConfirmDialog
        isOpen={showDevalidateConfirm}
        onClose={() => {
          setShowDevalidateConfirm(false);
          setConfirmInvoiceId(null);
        }}
        onConfirm={confirmDevalidate}
        title="Dévalider la facture"
        message="Êtes-vous sûr de vouloir dévalider cette facture ? Elle redeviendra un brouillon modifiable."
        type="warning"
        confirmText="Dévalider"
        cancelText="Annuler"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setConfirmInvoiceId(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer la facture"
        message="Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible."
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        type={alertMessage.type}
      />
    </AdminLayout>
  );
}
