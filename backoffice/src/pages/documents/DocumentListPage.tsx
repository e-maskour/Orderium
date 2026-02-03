import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, FileText, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import { DocumentTable } from '../../components/documents';
import { documentsService, DocumentItem } from '../../modules/documents/services/documents.service';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import AlertDialog from '../../components/AlertDialog';
import { DocumentType, DocumentDirection, DocumentConfig } from '../../modules/documents/types';
import { useLanguage } from '@/context/LanguageContext';

interface DocumentListPageProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  config: DocumentConfig;
  createRoute: string;
  editRoute: string;
}

export default function DocumentListPage({
  documentType,
  direction,
  config,
  createRoute,
  editRoute
}: DocumentListPageProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
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

  const isVente = direction === 'vente';
  const partnerLabel = config.partnerLabel;

  // Load documents from API
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsService.getDocuments(documentType, direction);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [documentType, direction]);

  // Documents are already in the correct format
  const transformedFactures = documents.map(doc => ({
    id: doc.id,
    number: doc.number,
    date: doc.date,
    dueDate: doc.dueDate,
    validationDate: doc.validationDate,
    partnerName: doc.partnerName,
    subtotal: doc.subtotal || 0,
    tax: doc.tax || 0,
    total: doc.total || 0,
    paidAmount: doc.paidAmount || 0,
    remainingAmount: doc.remainingAmount || 0,
    status: doc.status as 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue',
    isValidated: doc.isValidated,
    itemsCount: doc.itemsCount
  }));

  const handleEdit = (id: number) => {
    navigate(`${editRoute}/${id}`);
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
      await documentsService.validateDocument(documentType, confirmInvoiceId);
      await loadDocuments();
      setShowValidateConfirm(false);
      setConfirmInvoiceId(null);
    } catch (error) {
      console.error('Error validating document:', error);
      setShowValidateConfirm(false);
      setAlertMessage({
        title: t('error'),
        message: t('errorValidatingDocument'),
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const confirmDevalidate = async () => {
    if (confirmInvoiceId === null) return;
    
    try {
      await documentsService.devalidateDocument(documentType, confirmInvoiceId);
      await loadDocuments();
      setShowDevalidateConfirm(false);
      setConfirmInvoiceId(null);
    } catch (error) {
      console.error('Error devalidating document:', error);
      setShowDevalidateConfirm(false);
      setAlertMessage({
        title: t('error'),
        message: t('errorDevalidatingDocument'),
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
      await documentsService.deleteDocument(documentType, confirmInvoiceId);
      await loadDocuments();
      setShowDeleteConfirm(false);
      setConfirmInvoiceId(null);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      setShowDeleteConfirm(false);
      setAlertMessage({
        title: t('deletionImpossible'),
        message: error.message || t('errorDeletingDocument'),
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
    if (!config.features.hasPayments) return;
    
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setSelectedInvoice({
        id: doc.id,
        number: doc.number,
        total: doc.total
      });
      setShowPaymentModal(true);
    }
  };

  const tabs = [
    { key: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { key: 'list', label: `${t('listOf')} ${config.title.toLowerCase()}`, icon: List },
  ];

  // Calculate statistics
  const totalInvoices = documents.length;
  const draftInvoices = documents.filter(doc => doc.status === 'draft').length;
  const unpaidInvoices = documents.filter(doc => doc.status === 'unpaid' || doc.status === 'overdue').length;
  const partialInvoices = documents.filter(doc => doc.status === 'partial').length;
  const paidInvoices = documents.filter(doc => doc.status === 'paid' || doc.status === 'accepted').length;
  const totalAmount = documents.reduce((sum, doc) => sum + doc.total, 0);

  const Icon = config.icon;
  const TrendIcon = isVente ? TrendingUp : TrendingDown;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto w-full">
        <PageHeader
          icon={Icon}
          title={config.title}
          subtitle={`${t('manageYour')} ${config.title.toLowerCase()}`}
          actions={
            <button
              onClick={() => navigate(createRoute)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-amber-500 text-white rounded-lg sm:rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
            >
              <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden sm:inline">{t('nouveau')}</span>
              <span className="sm:hidden">+</span>
            </button>
          }
        />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 mb-4 sm:mb-6">
          <div className="flex items-center gap-1 sm:gap-2 p-2 border-b border-slate-200 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.key
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <TabIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-2 sm:p-3 pt-2">
            {activeTab === 'dashboard' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {/* Stats Cards */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-blue-200">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{t('total')}</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-blue-900 mb-0.5 sm:mb-1">{totalInvoices}</h3>
                    <p className="text-xs sm:text-sm text-blue-700">{t('total')}</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-amber-200">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{t('partial')}</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-amber-900 mb-0.5 sm:mb-1">{partialInvoices}</h3>
                    <p className="text-xs sm:text-sm text-amber-700">{t('partiallyPaid')}</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-emerald-200">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{t('paid')}</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-emerald-900 mb-0.5 sm:mb-1">{paidInvoices}</h3>
                    <p className="text-xs sm:text-sm text-emerald-700">{t('paid')}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-purple-200">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendIcon className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-purple-600 bg-purple-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{t('amount')}</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-purple-900 mb-0.5 sm:mb-1">{totalAmount.toFixed(2)} {language === 'ar' ? 'د.م' : 'DH'}</h3>
                    <p className="text-xs sm:text-sm text-purple-700">{isVente ? t('totalRevenue') : t('totalExpenses')} {t('total').toLowerCase()}</p>
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {/* Recent Documents */}
                  <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border border-slate-200">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3 sm:mb-4">
                      {t('lastThree')} {config.titleShort.toLowerCase()}
                    </h3>
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
                            <span className="text-sm font-bold text-emerald-600 w-24 text-right">{facture.total.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {transformedFactures.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">{t('noRecentDocument')} {config.titleShort.toLowerCase()} {t('recentSuffix')}</p>
                      )}
                    </div>
                  </div>

                  {/* Draft Documents */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-bold text-slate-800">{t('drafts')}</h3>
                        <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">{draftInvoices}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {draftInvoices === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">{t('noDrafts')}</p>
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
                            <span className="text-sm font-bold text-slate-600">{facture.total.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-1">
                <DocumentTable
                  documentType={documentType}
                  direction={direction}
                  documents={transformedFactures}
                  partnerLabel={config.partnerLabel}
                  itemLabel={documentType === 'facture' ? 'facture' : documentType === 'devis' ? 'devis' : 'bon de livraison'}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDownload={config.features.canDownloadPDF ? handleDownload : undefined}
                  onViewPayments={config.features.hasPayments ? handleViewPayments : undefined}
                  onValidate={config.features.hasValidation ? handleValidate : undefined}
                  onDevalidate={config.features.hasValidation ? handleDevalidate : undefined}
                  loading={loading}
                  showPaymentColumns={config.features.hasPayments}
                  showValidationColumn={config.features.hasValidation}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {config.features.hasPayments && selectedInvoice && (
        <PaymentHistoryModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.number}
          invoiceTotal={selectedInvoice.total}
          onPaymentUpdate={loadDocuments}
        />
      )}

      {config.features.hasValidation && (
        <>
          <ConfirmDialog
            isOpen={showValidateConfirm}
            onClose={() => {
              setShowValidateConfirm(false);
              setConfirmInvoiceId(null);
            }}
            onConfirm={confirmValidate}
            title={t('validateDocument')}
            message={t('confirmValidate')}
            type="warning"
            confirmText={t('validate')}
            cancelText={t('cancel')}
          />

          <ConfirmDialog
            isOpen={showDevalidateConfirm}
            onClose={() => {
              setShowDevalidateConfirm(false);
              setConfirmInvoiceId(null);
            }}
            onConfirm={confirmDevalidate}
            title={t('devalidateDocument')}
            message={t('confirmDevalidate')}
            type="warning"
            confirmText={t('devalidate')}
            cancelText={t('cancel')}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setConfirmInvoiceId(null);
        }}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        message={t('confirmDeleteDocument')}
        type="danger"
        confirmText={t('delete')}
        cancelText={t('cancel')}
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
