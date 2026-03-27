import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, CheckCircle, Filter, X, Download } from 'lucide-react';
import { DocumentTable } from '../../components/documents';
import { ShareDocumentDialog, ShareDocumentType } from '../../components/documents/ShareDocumentDialog';
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
import { toastExported, toastError, toastConfirm, toastDocument, toastSuccess } from '../../services/toast.service';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: number; number: string; total: number } | null>(null);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingDoc, setSharingDoc] = useState<{ id: number; number: string; partnerName: string } | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenExpiry, setShareTokenExpiry] = useState<Date | null>(null);

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

  const handleShare = (id: number) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    setSharingDoc({ id: doc.id, number: doc.number, partnerName: doc.partnerName });
    setShareToken(null);
    setShareTokenExpiry(null);
    setShowShareDialog(true);
  };

  const handleWhatsApp = (id: number) => {
    handleShare(id);
  };

  const handleGenerateShareLink = async () => {
    if (!sharingDoc) return;
    try {
      let result: { shareToken: string; expiresAt: Date };
      if (documentType === 'facture') {
        result = await invoicesService.generateShareLink(sharingDoc.id);
      } else if (documentType === 'bon_livraison') {
        result = await ordersService.generateShareLink(sharingDoc.id);
      } else {
        result = await quotesService.generateShareLink(sharingDoc.id);
      }
      setShareToken(result.shareToken);
      setShareTokenExpiry(result.expiresAt);
      toastSuccess(t('successLinkGenerated'));
    } catch (error: any) {
      toastError(error.message || t('errorGeneratingLink'));
    }
  };

  const handleRevokeShareLink = async () => {
    if (!sharingDoc) return;
    try {
      if (documentType === 'facture') {
        await invoicesService.revokeShareLink(sharingDoc.id);
      } else if (documentType === 'bon_livraison') {
        await ordersService.revokeShareLink(sharingDoc.id);
      }
      setShareToken(null);
      setShareTokenExpiry(null);
      toastSuccess('Lien révoqué avec succès');
    } catch (error: any) {
      toastError(error.message || 'Erreur lors de la révocation du lien');
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

  const handleExport = async () => {
    try {
      let blob: Blob;
      let filename: string;

      if (documentType === 'devis') {
        blob = await quotesService.exportToXlsx(undefined);
        filename = direction === 'achat' ? 'demandes-prix' : 'devis';
      } else if (documentType === 'facture') {
        blob = await invoicesService.exportToXlsx(undefined);
        filename = direction === 'achat' ? 'factures-achat' : 'factures-vente';
      } else if (documentType === 'bon_livraison') {
        blob = await ordersService.exportToXlsx(undefined);
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

  const Icon = config.icon;

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #235ae4, #1a47b8)' }}>
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
                <Clock style={{ width: 16, height: 16, color: '#235ae4' }} />
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
                <CheckCircle style={{ width: 16, height: 16, color: '#235ae4' }} />
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
                        ? { backgroundColor: '#235ae4', color: '#fff', boxShadow: '0 10px 15px rgba(35,90,228,0.3)', border: 'none' }
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
          onShare={handleShare}
          onWhatsApp={handleWhatsApp}
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

      {sharingDoc && (
        <ShareDocumentDialog
          isOpen={showShareDialog}
          onClose={() => { setShowShareDialog(false); setSharingDoc(null); }}
          documentType={documentType as ShareDocumentType}
          documentNumber={sharingDoc.number}
          partnerName={sharingDoc.partnerName}
          shareToken={shareToken}
          expiresAt={shareTokenExpiry}
          onGenerateLink={handleGenerateShareLink}
          onRevokeLink={documentType !== 'devis' ? handleRevokeShareLink : undefined}
        />
      )}
    </AdminLayout>
  );
}
