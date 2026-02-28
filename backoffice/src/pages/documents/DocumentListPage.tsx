import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, FileText, TrendingUp, TrendingDown, Clock, CheckCircle, Filter, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { DocumentTable, DocumentAnalysisChart } from '../../components/documents';
import { documentsService, DocumentItem } from '../../modules/documents/services/documents.service';
import { partnersService } from '../../modules';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';
import { DocumentType, DocumentDirection, DocumentConfig } from '../../modules/documents/types';
import { useLanguage } from '@/context/LanguageContext';
import { DateRangePicker } from '../../components/ui/date-range-picker';
import { Autocomplete } from '../../components/ui/autocomplete';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { FormField } from '../../components/ui/form-field';
import { useQuery } from '@tanstack/react-query';
import { quotesService } from '../../modules/quotes/quotes.service';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { ordersService } from '../../modules/orders/orders.service';
import { toastExported, toastError, toastConfirm } from '../../services/toast.service';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: number; number: string; total: number } | null>(null);

  // Filter states
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [documentNumberSearch, setDocumentNumberSearch] = useState('');
  const [partnerIdSearch, setPartnerIdSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({ start: undefined, end: undefined });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Applied filters - triggers API requests
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'all',
    partnerId: undefined as number | undefined,
    dateRange: { start: undefined as Date | undefined, end: undefined as Date | undefined },
  });

  // Year selection for analytics
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Fetch partners for autocomplete
  const { data: partnersData } = useQuery({
    queryKey: ['partners'],
    queryFn: partnersService.getAll,
  });

  const isVente = direction === 'vente';
  const partnerLabel = config.partnerLabel;

  // Fetch documents with filters and pagination
  const { data: documentsData = { documents: [], count: 0, totalCount: 0 }, isLoading: loading, refetch } = useQuery({
    queryKey: ['documents', documentType, direction, JSON.stringify(appliedFilters), currentPage, pageSize],
    queryFn: () => documentsService.getDocuments(documentType, direction, {
      search: appliedFilters.search,
      status: appliedFilters.status,
      partnerId: appliedFilters.partnerId,
      dateFrom: appliedFilters.dateRange.start ? appliedFilters.dateRange.start.toISOString().split('T')[0] : undefined,
      dateTo: appliedFilters.dateRange.end ? appliedFilters.dateRange.end.toISOString().split('T')[0] : undefined,
      page: currentPage,
      pageSize: pageSize
    }),
  });

  // Fetch analytics from API
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['documents-analytics', documentType, direction, selectedYear],
    queryFn: () => documentsService.getAnalytics(documentType, direction, selectedYear),
  });

  const documents = documentsData.documents || [];
  const totalCount = documentsData.totalCount || 0;

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
    toastConfirm(t('validateDocument'), async () => {
      try {
        await documentsService.validateDocument(documentType, id);
        await refetch();
      } catch (error) {
        console.error('Error validating document:', error);
        toastError(t('error'), { description: t('errorValidatingDocument') });
      }
    }, { description: t('confirmValidate'), confirmLabel: t('validate') });
  };

  const handleDevalidate = async (id: number) => {
    toastConfirm(t('devalidateDocument'), async () => {
      try {
        await documentsService.devalidateDocument(documentType, id);
        await refetch();
      } catch (error) {
        console.error('Error devalidating document:', error);
        toastError(t('error'), { description: t('errorDevalidatingDocument') });
      }
    }, { description: t('confirmDevalidate'), confirmLabel: t('devalidate') });
  };

  const handleDelete = async (id: number) => {
    toastConfirm(t('deleteTitle'), async () => {
      try {
        await documentsService.deleteDocument(documentType, id);
        await refetch();
      } catch (error: any) {
        console.error('Error deleting document:', error);
        toastError(t('deletionImpossible'), { description: error.message || t('errorDeletingDocument') });
      }
    }, { description: t('confirmDeleteDocument'), confirmLabel: t('delete') });
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

  // Reset page when filters change
  const handleApplyFilters = () => {
    setAppliedFilters({
      search: documentNumberSearch,
      status: statusFilter,
      partnerId: partnerIdSearch ? parseInt(partnerIdSearch) : undefined,
      dateRange: { start: dateRange.start, end: dateRange.end },
    });
    setCurrentPage(1);
    setFiltersExpanded(false);
  };

  const handleResetFilters = () => {
    setDocumentNumberSearch('');
    setPartnerIdSearch('');
    setDateRange({ start: undefined, end: undefined });
    setStatusFilter('all');
    setAppliedFilters({
      search: '',
      status: 'all',
      partnerId: undefined,
      dateRange: { start: undefined, end: undefined },
    });
    setCurrentPage(1);
  };

  const tabs = [
    { key: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { key: 'list', label: `${t('listOf')} ${config.title.toLowerCase()}`, icon: List },
  ];

  // Color mapping for KPI cards
  const colorClasses = {
    blue: {
      border: 'hover:border-blue-300',
      bg: 'bg-blue-100',
      text: 'text-blue-600'
    },
    emerald: {
      border: 'hover:border-emerald-300',
      bg: 'bg-emerald-100',
      text: 'text-emerald-600'
    },
    amber: {
      border: 'hover:border-amber-300',
      bg: 'bg-amber-100',
      text: 'text-amber-600'
    },
    purple: {
      border: 'hover:border-purple-300',
      bg: 'bg-purple-100',
      text: 'text-purple-600'
    },
    red: {
      border: 'hover:border-red-300',
      bg: 'bg-red-100',
      text: 'text-red-600'
    }
  };

  // Document type specific KPIs from API analytics
  let kpi1, kpi2, kpi3, kpi4;

  if (analytics && analytics.kpis) {
    if (documentType === 'devis') {
      // Devis-specific KPIs from API
      const { totalQuotes, acceptedCount, pendingCount, conversionRate } = analytics.kpis;

      kpi1 = { count: totalQuotes, label: t('totalQuotes'), icon: FileText, color: 'blue' };
      kpi2 = { count: acceptedCount, label: t('acceptedQuotes'), icon: CheckCircle, color: 'emerald' };
      kpi3 = { count: pendingCount, label: t('pendingQuotes'), icon: Clock, color: 'amber' };
      kpi4 = { count: `${conversionRate.toFixed(1)}%`, label: t('conversionRate'), icon: TrendingUp, color: 'purple' };

    } else if (documentType === 'bon_livraison') {
      // Bon de livraison-specific KPIs from API
      const { totalOrders, deliveredCount, inProgressCount, totalItems } = analytics.kpis;

      kpi1 = { count: totalOrders, label: t('totalDeliveries'), icon: FileText, color: 'blue' };
      kpi2 = { count: deliveredCount, label: t('delivered'), icon: CheckCircle, color: 'emerald' };
      kpi3 = { count: inProgressCount, label: t('inProgress'), icon: Clock, color: 'amber' };
      kpi4 = { count: totalItems, label: t('totalItems'), icon: TrendingUp, color: 'purple' };

    } else {
      // Facture-specific KPIs from API
      const { totalInvoices, unpaidCount, paidCount, unpaidAmount } = analytics.kpis;

      kpi1 = { count: totalInvoices, label: t('totalInvoices'), icon: FileText, color: 'blue' };
      kpi2 = { count: unpaidCount, label: t('unpaidInvoices'), icon: Clock, color: 'amber' };
      kpi3 = { count: paidCount, label: t('paidInvoices'), icon: CheckCircle, color: 'emerald' };
      kpi4 = { count: `${unpaidAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${language === 'ar' ? 'د.م' : 'DH'}`, label: t('unpaidAmount'), icon: TrendingDown, color: 'red' };
    }
  } else {
    // Fallback to empty KPIs while loading
    kpi1 = { count: 0, label: t('total'), icon: FileText, color: 'blue' };
    kpi2 = { count: 0, label: t('pending'), icon: Clock, color: 'amber' };
    kpi3 = { count: 0, label: t('completed'), icon: CheckCircle, color: 'emerald' };
    kpi4 = { count: 0, label: t('amount'), icon: TrendingUp, color: 'purple' };
  }

  // Calculate draft count from current documents (for the draft section)
  const draftInvoices = documents.filter(doc => doc.status === 'draft').length;

  const Icon = config.icon;

  // Export to XLSX
  const handleExport = async () => {
    try {
      let blob: Blob;
      let filename: string;

      const supplierId = direction === 'achat' ? 1 : undefined; // Use appropriate supplierId logic

      if (documentType === 'devis') {
        blob = await quotesService.exportToXlsx(supplierId);
        filename = direction === 'achat' ? 'demandes-prix' : 'devis';
      } else if (documentType === 'facture') {
        blob = await invoicesService.exportToXlsx(supplierId);
        filename = direction === 'achat' ? 'factures-achat' : 'factures-vente';
      } else if (documentType === 'bon_livraison') {
        blob = await ordersService.exportToXlsx(supplierId);
        filename = direction === 'achat' ? 'bons-achat' : 'bons-livraison';
      } else {
        toastError(t('unsupportedDocumentType'));
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastExported(t('exportSuccess'));
    } catch (error) {
      toastError(t('exportError'));
      console.error(error);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto w-full">
        <PageHeader
          icon={Icon}
          title={config.title}
          subtitle={`${t('manageYour')} ${config.title.toLowerCase()}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                leadingIcon={Download}
              >
                <span className="hidden sm:inline">Exporter</span>
              </Button>
              <Button
                onClick={() => navigate(createRoute)}
                size="sm"
                leadingIcon={Plus}
              >
                <span className="hidden sm:inline">{t('nouveau')}</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>
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
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.key
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
                  {/* KPI 1 */}
                  <div className={`bg-white rounded-lg p-3 sm:p-4 border border-slate-200 ${colorClasses[kpi1.color as keyof typeof colorClasses].border} transition-colors`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-10 sm:w-12 h-10 sm:h-12 ${colorClasses[kpi1.color as keyof typeof colorClasses].bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <kpi1.icon className={`w-5 sm:w-6 h-5 sm:h-6 ${colorClasses[kpi1.color as keyof typeof colorClasses].text}`} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">{kpi1.label}</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{kpi1.count}</h3>
                      </div>
                    </div>
                  </div>

                  {/* KPI 2 */}
                  <div className={`bg-white rounded-lg p-3 sm:p-4 border border-slate-200 ${colorClasses[kpi2.color as keyof typeof colorClasses].border} transition-colors`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-10 sm:w-12 h-10 sm:h-12 ${colorClasses[kpi2.color as keyof typeof colorClasses].bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <kpi2.icon className={`w-5 sm:w-6 h-5 sm:h-6 ${colorClasses[kpi2.color as keyof typeof colorClasses].text}`} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">{kpi2.label}</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{kpi2.count}</h3>
                      </div>
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className={`bg-white rounded-lg p-3 sm:p-4 border border-slate-200 ${colorClasses[kpi3.color as keyof typeof colorClasses].border} transition-colors`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-10 sm:w-12 h-10 sm:h-12 ${colorClasses[kpi3.color as keyof typeof colorClasses].bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <kpi3.icon className={`w-5 sm:w-6 h-5 sm:h-6 ${colorClasses[kpi3.color as keyof typeof colorClasses].text}`} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">{kpi3.label}</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{kpi3.count}</h3>
                      </div>
                    </div>
                  </div>

                  {/* KPI 4 */}
                  <div className={`bg-white rounded-lg p-3 sm:p-4 border border-slate-200 ${colorClasses[kpi4.color as keyof typeof colorClasses].border} transition-colors`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-10 sm:w-12 h-10 sm:h-12 ${colorClasses[kpi4.color as keyof typeof colorClasses].bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <kpi4.icon className={`w-5 sm:w-6 h-5 sm:h-6 ${colorClasses[kpi4.color as keyof typeof colorClasses].text}`} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">{kpi4.label}</p>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">{kpi4.count}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Chart - Full Width */}
                <DocumentAnalysisChart
                  documents={documents}
                  documentType={documentType}
                  analytics={analytics}
                  onYearChange={setSelectedYear}
                />

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
                            <span className="text-sm font-bold text-emerald-600 w-24 text-right">{facture.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            <span className="text-sm font-bold text-slate-600">{facture.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                {/* Filters Overlay Panel */}
                {filtersExpanded && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                      onClick={() => setFiltersExpanded(false)}
                    />

                    {/* Slide-in Panel */}
                    <div className="fixed inset-y-0 end-0 w-full sm:w-[520px] md:w-[560px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                      {/* Panel Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-amber-600">
                        <div className="flex items-center gap-3">
                          <Filter className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">{t('filters')}</h2>
                        </div>
                        <button
                          onClick={() => setFiltersExpanded(false)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>

                      {/* Panel Content - Scrollable */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Document Number Search */}
                        <FormField label={documentType === 'devis' ? t('quoteNumber') : documentType === 'bon_livraison' ? t('deliveryNumber') : t('invoiceNumber')}>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder={documentType === 'devis' ? 'DEV-001' : documentType === 'bon_livraison' ? 'BL-001' : 'FAC-001'}
                              value={documentNumberSearch}
                              onChange={(e) => setDocumentNumberSearch(e.target.value)}
                              fullWidth
                            />
                            {documentNumberSearch && (
                              <button
                                onClick={() => setDocumentNumberSearch('')}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </FormField>

                        {/* Partner Autocomplete */}
                        <FormField label={config.partnerLabel}>
                          <Autocomplete
                            options={(partnersData?.partners || [])
                              .filter((p: any) => direction === 'vente' ? p.isCustomer : p.isSupplier)
                              .map((partner: any) => ({
                                value: String(partner.id),
                                label: `${partner.name}${partner.phoneNumber ? ` (${partner.phoneNumber})` : ''}`
                              }))}
                            value={partnerIdSearch}
                            onValueChange={setPartnerIdSearch}
                            placeholder={`${t('selectPartner')} ${config.partnerLabel.toLowerCase()}`}
                            emptyMessage={`${t('noPartnerFound').replace('{partner}', config.partnerLabel.toLowerCase())}`}
                            allowCustomValue={false}
                          />
                        </FormField>

                        {/* Date Range */}
                        <div>
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            {documentType === 'devis' ? t('quoteDate') : documentType === 'bon_livraison' ? t('deliveryDate') : t('invoiceDate')}
                          </div>
                          <DateRangePicker
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            placeholder={t('selectDate')}
                          />
                        </div>

                        {/* Status Filter */}
                        <div>
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-amber-600" />
                            {t('status')}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(documentType === 'devis' ? [
                              { key: 'all', label: t('all'), icon: '📋' },
                              { key: 'draft', label: t('draft'), icon: '📝' },
                              { key: 'open', label: t('statusOpen'), icon: '🔓' },
                              { key: 'signed', label: t('statusSigned'), icon: '✍️' },
                              { key: 'closed', label: t('statusClosed'), icon: '🔒' },
                              { key: 'invoiced', label: t('statusInvoiced'), icon: '✅' },
                            ] : documentType === 'bon_livraison' ? [
                              { key: 'all', label: t('all'), icon: '📋' },
                              { key: 'draft', label: t('draft'), icon: '📝' },
                              { key: 'validated', label: t('statusValidated'), icon: '✓' },
                              { key: 'in_progress', label: t('statusInProgress'), icon: '🔄' },
                              { key: 'delivered', label: t('statusDeliveredBon'), icon: '✅' },
                              { key: 'cancelled', label: t('statusCancelled'), icon: '❌' },
                              { key: 'invoiced', label: t('statusInvoicedBon'), icon: '📄' },
                            ] : [
                              { key: 'all', label: t('all'), icon: '📋' },
                              { key: 'draft', label: t('draft'), icon: '📝' },
                              { key: 'unpaid', label: t('statusUnpaid'), icon: '⏳' },
                              { key: 'partial', label: t('statusPartial'), icon: '⚠️' },
                              { key: 'paid', label: t('statusPaid'), icon: '✅' },
                              { key: 'overdue', label: t('invoice.overdue'), icon: '🔴' },
                            ]).map((filter) => (
                              <button
                                key={filter.key}
                                onClick={() => setStatusFilter(filter.key)}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === filter.key
                                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                                  }`}
                              >
                                <span>{filter.icon}</span>
                                <span>{filter.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Panel Footer */}
                      <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleResetFilters}
                        >
                          {t('reset')}
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleApplyFilters}
                        >
                          {t('apply')}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <DocumentTable
                  documentType={documentType}
                  direction={direction}
                  documents={transformedFactures}
                  partnerLabel={config.partnerLabel}
                  itemLabel={documentType === 'facture' ? 'facture' : documentType === 'devis' ? 'devis' : 'bon de livraison'}
                  onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
                  filtersExpanded={filtersExpanded}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDownload={config.features.canDownloadPDF ? handleDownload : undefined}
                  onViewPayments={config.features.hasPayments ? handleViewPayments : undefined}
                  onValidate={config.features.hasValidation ? handleValidate : undefined}
                  onDevalidate={config.features.hasValidation ? handleDevalidate : undefined}
                  loading={loading}
                  showPaymentColumns={config.features.hasPayments}
                  showValidationColumn={config.features.hasValidation}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
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
          onPaymentUpdate={refetch}
        />
      )}
    </AdminLayout>
  );
}
