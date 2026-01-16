import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, FileText, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import { FactureTable } from '../components/FactureTable';
import { invoicesService } from '../modules/invoices/invoices.service';
import { InvoiceWithDetails } from '../modules/invoices/invoices.model';
import PaymentHistoryModal from '../components/PaymentHistoryModal';

export default function FactureAchat() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: number; number: string; total: number } | null>(null);

  // Load invoices from API
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesService.getAll(); // Get all invoices
      // Filter for purchase invoices (those with suppliers)
      const achatInvoices = data.filter(inv => inv.invoice.supplierId);
      setInvoices(achatInvoices);
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
    partnerName: inv.invoice.supplierName || 'Fournisseur inconnu',
    amount: inv.invoice.total,
    status: inv.invoice.status === 'paid' ? 'paid' as const : 
             inv.invoice.status === 'partial' ? 'pending' as const : 
             new Date(inv.invoice.dueDate || inv.invoice.date) < new Date() ? 'overdue' as const : 'pending' as const,
    dueDate: inv.invoice.dueDate,
    itemsCount: inv.items.length
  }));

  const handleEdit = (id: number) => {
    navigate(`/facture-achat/edit/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      try {
        await invoicesService.delete(id);
        await loadInvoices(); // Reload list
        // TODO: Show success toast
      } catch (error) {
        console.error('Error deleting invoice:', error);
        // TODO: Show error toast
      }
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
  const paidInvoices = invoices.filter(inv => inv.invoice.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => inv.invoice.status === 'partial').length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.invoice.total, 0);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={FileText}
          title="Factures d'Achat"
          subtitle="Gérez vos factures d'achat"
          actions={
            <button
              onClick={() => navigate('/facture-achat/create')}
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
          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
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
                      <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">En attente</span>
                    </div>
                    <h3 className="text-2xl font-bold text-amber-900 mb-1">{pendingInvoices}</h3>
                    <p className="text-sm text-amber-700">En attente</p>
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

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-red-600 bg-red-200 px-2 py-1 rounded-full">Montant</span>
                    </div>
                    <h3 className="text-2xl font-bold text-red-900 mb-1">{totalAmount.toFixed(2)} DH</h3>
                    <p className="text-sm text-red-700">Dépenses totales</p>
                  </div>
                </div>

                {/* Dashboard Grid - 4 Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart Section - Validated Invoices */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Nombres de factures validées - Facture fournisseur</h3>
                    <div className="flex items-end justify-around h-48 px-4">
                      {/* Overdue */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-16 bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg transition-all hover:from-red-600 hover:to-red-500"
                          style={{ height: `${Math.min((transformedFactures.filter(f => f.status === 'overdue').length / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">En retard</span>
                        <span className="text-sm font-bold text-red-600">{transformedFactures.filter(f => f.status === 'overdue').length}</span>
                      </div>
                      {/* Pending */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-16 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all hover:from-amber-600 hover:to-amber-500"
                          style={{ height: `${Math.min((pendingInvoices / Math.max(totalInvoices, 1)) * 100, 100)}%` }}
                        ></div>
                        <span className="text-xs text-slate-600 font-medium">En attente</span>
                        <span className="text-sm font-bold text-amber-600">{pendingInvoices}</span>
                      </div>
                      {/* Paid */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-16 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-600 hover:to-emerald-500"
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-800">Les 3 dernières factures fournisseur</h3>
                      <span className="text-xs text-slate-500">Montant TTC</span>
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
                            <span className="text-xs text-slate-500">{new Date(facture.date).toLocaleDateString('fr-FR')}</span>
                            <span className="text-sm font-bold text-red-600">{facture.amount.toFixed(2)}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              facture.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                              facture.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {facture.status === 'paid' ? 'Payée' : facture.status === 'overdue' ? 'En retard' : 'En attente'}
                            </span>
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">Factures fournisseurs brouillons</h3>
                        <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">0</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400 text-center py-8">Aucune facture brouillon</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Total</span>
                        <span className="text-base font-bold text-slate-800">0,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Unpaid Invoices */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">Factures fournisseurs impayées</h3>
                        <span className="bg-red-200 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {transformedFactures.filter(f => f.status !== 'paid').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Date échéance</span>
                        <span className="text-xs text-slate-500">Montant TTC</span>
                        <span className="text-xs text-slate-500">Payé</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transformedFactures.filter(f => f.status !== 'paid').slice(0, 3).map((facture) => (
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
                            <span className="text-xs text-slate-500">{facture.dueDate ? new Date(facture.dueDate).toLocaleDateString('fr-FR') : '-'}</span>
                            <span className="text-sm font-bold text-red-600">{facture.amount.toFixed(2)}</span>
                            <span className="text-sm text-slate-500">0,00</span>
                          </div>
                        </div>
                      ))}
                      {transformedFactures.filter(f => f.status !== 'paid').length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune facture impayée</p>
                      )}
                      {transformedFactures.filter(f => f.status !== 'paid').length > 3 && (
                        <p className="text-xs text-slate-400 text-center py-2">Plus... ({transformedFactures.filter(f => f.status !== 'paid').length - 3})</p>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Total (Montant restant à payer: {transformedFactures.filter(f => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0).toFixed(2)})</span>
                        <div className="flex items-center gap-8">
                          <span className="text-base font-bold text-slate-800">{transformedFactures.filter(f => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0).toFixed(2)}</span>
                          <span className="text-base font-bold text-slate-800">0,00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Liste des factures</h3>
                  <button
                    onClick={() => navigate('/facture-achat/create')}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle facture
                  </button>
                </div>
                <FactureTable
                  type="achat"
                  factures={transformedFactures}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onViewPayments={handleViewPayments}
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
    </AdminLayout>
  );
}
