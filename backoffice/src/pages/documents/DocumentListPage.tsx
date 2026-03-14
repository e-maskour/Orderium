import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { KpiCard, KpiGrid } from '../../components/KpiCard';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, FileText, TrendingUp, TrendingDown, Clock, CheckCircle, Filter, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { DocumentTable, DocumentAnalysisChart } from '../../components/documents';
import { documentsService, DocumentItem } from '../../modules/documents/services/documents.service';
import { partnersService } from '../../modules';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';
import { DocumentType, DocumentDirection, DocumentConfig } from '../../modules/documents/types';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Sidebar } from 'primereact/sidebar';
import { useQuery } from '@tanstack/react-query';
import { quotesService } from '../../modules/quotes/quotes.service';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { ordersService } from '../../modules/orders/orders.service';
import { toastExported, toastError, toastConfirm, toastDocument } from '../../services/toast.service';

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
        toastDocument(t('pdfGenerated'));
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
      <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          icon={Icon}
          title={config.title}
          subtitle={`${t('manageYour')} ${config.title.toLowerCase()}`}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                icon={<Filter style={{ width: 16, height: 16 }} />}
                label={t('filters')}
                severity="secondary"
                outlined
                size="small"
              />
              <Button
                onClick={handleExport}
                icon={<Download style={{ width: 16, height: 16 }} />}
                label="Exporter"
                severity="secondary"
                outlined
                size="small"
              />
              <Button
                onClick={() => navigate(createRoute)}
                icon={<Plus style={{ width: 16, height: 16 }} />}
                label={t('nouveau')}
                size="small"
              />
            </div>
          }
        />

        {/* Tabs Navigation */}
        <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  icon={<TabIcon style={{ width: 16, height: 16 }} />}
                  label={tab.label}
                  text={activeTab !== tab.key}
                  style={{
                    whiteSpace: 'nowrap', flexShrink: 0,
                    ...(activeTab === tab.key
                      ? { backgroundColor: '#f59e0b', color: '#fff', boxShadow: '0 4px 6px rgba(245,158,11,0.25)', border: 'none' }
                      : { color: '#475569' })
                  }}
                />
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '0.75rem', paddingTop: '0.5rem' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <style>{`
                  .doc-dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
                  @media (max-width: 768px) { .doc-dash-grid { grid-template-columns: 1fr !important; } }
                `}</style>
                <KpiGrid count={4}>
                  <KpiCard label={kpi1.label} value={kpi1.count} icon={kpi1.icon} color={kpi1.color as any} loading={analyticsLoading} />
                  <KpiCard label={kpi2.label} value={kpi2.count} icon={kpi2.icon} color={kpi2.color as any} loading={analyticsLoading} />
                  <KpiCard label={kpi3.label} value={kpi3.count} icon={kpi3.icon} color={kpi3.color as any} loading={analyticsLoading} />
                  <KpiCard label={kpi4.label} value={kpi4.count} icon={kpi4.icon} color={kpi4.color as any} loading={analyticsLoading} />
                </KpiGrid>

                {/* Analysis Chart - Full Width */}
                <DocumentAnalysisChart
                  documents={documents}
                  documentType={documentType}
                  analytics={analytics}
                  onYearChange={setSelectedYear}
                />

                {/* Dashboard Grid */}
                <div className="doc-dash-grid">
                  {/* Recent Documents */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
                      {t('lastThree')} {config.titleShort.toLowerCase()}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {transformedFactures.slice(0, 3).map((facture) => (
                        <div key={facture.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText style={{ width: 16, height: 16, color: '#3b82f6' }} />
                            <Button
                              label={facture.number}
                              link
                              onClick={() => handleEdit(facture.id)}
                              style={{ fontSize: '0.875rem', fontWeight: 500, padding: 0 }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{facture.partnerName}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', width: '6rem' }}>{new Date(facture.date).toLocaleDateString('fr-FR')}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669', width: '6rem', textAlign: 'right' }}>{facture.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      ))}
                      {transformedFactures.length === 0 && (
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>{t('noRecentDocument')} {config.titleShort.toLowerCase()} {t('recentSuffix')}</p>
                      )}
                    </div>
                  </div>

                  {/* Draft Documents */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{t('drafts')}</h3>
                        <span style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>{draftInvoices}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {draftInvoices === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>{t('noDrafts')}</p>
                      ) : (
                        transformedFactures.filter(f => f.status === 'draft').slice(0, 3).map((facture) => (
                          <div key={facture.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText style={{ width: 16, height: 16, color: '#64748b' }} />
                              <Button
                                label={facture.number}
                                link
                                onClick={() => handleEdit(facture.id)}
                                style={{ fontSize: '0.875rem', fontWeight: 500, padding: 0, color: '#475569' }}
                              />
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>{facture.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {/* Filters Overlay Panel */}
                <Sidebar
                  visible={filtersExpanded}
                  onHide={() => setFiltersExpanded(false)}
                  position="right"
                  style={{ width: '560px' }}
                  showCloseIcon={false}
                  blockScroll
                  pt={{ header: { style: { display: 'none' } }, content: { style: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } } }}
                >
                  {/* Panel Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f59e0b, #d97706)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Filter style={{ width: 20, height: 20, color: '#fff' }} />
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>{t('filters')}</h2>
                    </div>
                    <Button
                      onClick={() => setFiltersExpanded(false)}
                      icon={<X style={{ width: 20, height: 20, color: '#fff' }} />}
                      text
                      rounded
                    />
                  </div>

                  {/* Panel Content - Scrollable */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Document Number Search */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>{documentType === 'devis' ? t('quoteNumber') : documentType === 'bon_livraison' ? t('deliveryNumber') : t('invoiceNumber')}</label>
                      <div style={{ position: 'relative' }}>
                        <InputText
                          type="text"
                          placeholder={documentType === 'devis' ? 'DEV-001' : documentType === 'bon_livraison' ? 'BL-001' : 'FAC-001'}
                          value={documentNumberSearch}
                          onChange={(e) => setDocumentNumberSearch(e.target.value)}
                          style={{ width: '100%' }}
                        />
                        {documentNumberSearch && (
                          <Button
                            onClick={() => setDocumentNumberSearch('')}
                            icon={<X style={{ width: 16, height: 16 }} />}
                            text
                            rounded
                            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 10, padding: '0.25rem' }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Partner Autocomplete */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>{config.partnerLabel}</label>
                      <Dropdown
                        options={(partnersData?.partners || [])
                          .filter((p: any) => direction === 'vente' ? p.isCustomer : p.isSupplier)
                          .map((partner: any) => ({
                            value: String(partner.id),
                            label: `${partner.name}${partner.phoneNumber ? ` (${partner.phoneNumber})` : ''}`
                          }))}
                        value={partnerIdSearch}
                        onChange={(e) => setPartnerIdSearch(e.value)}
                        placeholder={`${t('selectPartner')} ${config.partnerLabel.toLowerCase()}`}
                        filter
                        showClear={partnerIdSearch !== ''}
                        optionLabel="label"
                        optionValue="value"
                        emptyFilterMessage={`${t('noPartnerFound').replace('{partner}', config.partnerLabel.toLowerCase())}`}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Date Range */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock style={{ width: 16, height: 16, color: '#d97706' }} />
                        {documentType === 'devis' ? t('quoteDate') : documentType === 'bon_livraison' ? t('deliveryDate') : t('invoiceDate')}
                      </div>
                      <Calendar
                        value={dateRange.start ? [dateRange.start, dateRange.end as Date] : null}
                        onChange={(e) => { const v = e.value as Date[]; setDateRange({ start: v?.[0], end: v?.[1] }); }}
                        selectionMode="range"
                        dateFormat="dd/mm/yy"
                        showIcon
                        placeholder={t('selectDate')}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Status Filter */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle style={{ width: 16, height: 16, color: '#d97706' }} />
                        {t('status')}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                          <Button
                            key={filter.key}
                            onClick={() => setStatusFilter(filter.key)}
                            label={`${filter.icon} ${filter.label}`}
                            outlined={statusFilter !== filter.key}
                            style={{
                              fontSize: '0.75rem',
                              ...(statusFilter === filter.key
                                ? { backgroundColor: '#f59e0b', color: '#fff', boxShadow: '0 10px 15px rgba(245,158,11,0.3)', border: 'none' }
                                : { backgroundColor: '#f8fafc', color: '#334155' })
                            }}
                          />
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Panel Footer */}
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', gap: '0.75rem' }}>
                    <Button
                      label={t('reset')}
                      severity="secondary"
                      outlined
                      onClick={handleResetFilters}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label={t('apply')}
                      onClick={handleApplyFilters}
                      style={{ flex: 1 }}
                    />
                  </div>
                </Sidebar>

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
