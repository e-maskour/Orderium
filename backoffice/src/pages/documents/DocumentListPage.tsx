import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Download, Search } from 'lucide-react';
import { DocumentTable } from '../../components/documents';
import {
  ShareDocumentDialog,
  ShareDocumentType,
} from '../../components/documents/ShareDocumentDialog';
import { documentsService } from '../../modules/documents/services/documents.service';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';
import { DocumentType, DocumentDirection, DocumentConfig } from '../../modules/documents/types';
import { useLanguage } from '@/context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { presetRange, type DatePreset } from '../../utils/datePresets';
import { PeriodFilter } from '../../components/PeriodFilter';
import { Button } from 'primereact/button';
import { useQuery } from '@tanstack/react-query';
import { quotesService } from '../../modules/quotes/quotes.service';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { ordersService } from '../../modules/orders/orders.service';
import { AutoCompleteSelect } from '../../components/ui/AutoCompleteSelect';
import {
  toastExported,
  toastError,
  toastDeleteError,
  toastConfirm,
  toastDocument,
  toastSuccess,
} from '../../services/toast.service';

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
  editRoute,
}: DocumentListPageProps) {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{
    id: number;
    number: string;
    total: number;
  } | null>(null);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingDoc, setSharingDoc] = useState<{
    id: number;
    number: string;
    partnerName: string;
  } | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenExpiry, setShareTokenExpiry] = useState<Date | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter states
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const getDateRange = useMemo(() => {
    if (dateFilterType !== 'custom') return presetRange(dateFilterType);
    if (dateRange.start && dateRange.end) return { start: dateRange.start, end: dateRange.end };
    if (dateRange.start) {
      const e2 = new Date(dateRange.start);
      e2.setHours(23, 59, 59, 999);
      return { start: dateRange.start, end: e2 };
    }
    return {};
  }, [dateFilterType, dateRange]);

  const statusOptions = useMemo(() => {
    if (documentType === 'devis')
      return [
        { label: t('all'), value: 'all' },
        { label: t('draft'), value: 'draft' },
        { label: t('statusOpen'), value: 'open' },
        { label: t('statusSigned'), value: 'signed' },
        { label: t('statusClosed'), value: 'closed' },
        { label: t('statusInvoiced'), value: 'invoiced' },
      ];
    if (documentType === 'bon_livraison')
      return [
        { label: t('all'), value: 'all' },
        { label: t('draft'), value: 'draft' },
        { label: t('statusValidated'), value: 'validated' },
        { label: t('statusInProgress'), value: 'in_progress' },
        { label: t('statusDeliveredBon'), value: 'delivered' },
        { label: t('statusCancelled'), value: 'cancelled' },
        { label: t('statusInvoicedBon'), value: 'invoiced' },
      ];
    return [
      { label: t('all'), value: 'all' },
      { label: t('draft'), value: 'draft' },
      { label: t('statusUnpaid'), value: 'unpaid' },
      { label: t('statusPartial'), value: 'partial' },
      { label: t('statusPaid'), value: 'paid' },
      { label: t('invoice.overdue'), value: 'overdue' },
    ];
  }, [documentType, t]);

  // Fetch documents with filters
  const {
    data: documentsData = { documents: [], count: 0, totalCount: 0 },
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: [
      'documents',
      documentType,
      direction,
      debouncedSearch,
      statusFilter,
      dateFilterType,
      getDateRange.start,
      getDateRange.end,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      documentsService.getDocuments(documentType, direction, {
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dateFrom: getDateRange.start ? getDateRange.start.toISOString().split('T')[0] : undefined,
        dateTo: getDateRange.end ? getDateRange.end.toISOString().split('T')[0] : undefined,
        page: currentPage,
        pageSize,
      }),
  });

  const {
    data: documentAggregates = {
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
      totalSubtotal: 0,
    },
  } = useQuery({
    queryKey: [
      'documents-aggregates',
      documentType,
      direction,
      debouncedSearch,
      statusFilter,
      dateFilterType,
      getDateRange.start,
      getDateRange.end,
    ],
    queryFn: () =>
      documentsService.getAggregates(documentType, direction, {
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dateFrom: getDateRange.start ? getDateRange.start.toISOString().split('T')[0] : undefined,
        dateTo: getDateRange.end ? getDateRange.end.toISOString().split('T')[0] : undefined,
      }),
  });

  const documents = documentsData.documents || [];
  const totalCount = documentsData.totalCount || 0;

  const transformedFactures = documents.map((doc) => ({
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
    itemsCount: doc.itemsCount,
  }));

  const handleEdit = (id: number) => navigate(`${editRoute}/${id}`);

  const handleValidate = async (id: number) => {
    toastConfirm(
      t('validateDocument'),
      async () => {
        try {
          await documentsService.validateDocument(documentType, id);
          await refetch();
          toastDocument(t('pdfGenerated'));
        } catch (_error) {
          toastError(t('error'), { description: t('errorValidatingDocument') });
        }
      },
      { description: t('confirmValidate'), confirmLabel: t('validate') },
    );
  };

  const handleDevalidate = async (id: number) => {
    toastConfirm(
      t('devalidateDocument'),
      async () => {
        try {
          await documentsService.devalidateDocument(documentType, id);
          await refetch();
        } catch (_error) {
          toastError(t('error'), { description: t('errorDevalidatingDocument') });
        }
      },
      { description: t('confirmDevalidate'), confirmLabel: t('devalidate') },
    );
  };

  const handleDelete = async (id: number) => {
    toastConfirm(
      t('deleteTitle'),
      async () => {
        try {
          await documentsService.deleteDocument(documentType, id);
          await refetch();
        } catch (error: any) {
          toastDeleteError(error, t);
        }
      },
      {
        description: t('confirmDeleteDocument'),
        confirmLabel: t('delete'),
        variant: 'destructive',
      },
    );
  };

  const handleDownload = (id: number) => {
    // TODO: Implement PDF download
    void id;
  };

  const handleViewPayments = (id: number) => {
    if (!config.features.hasPayments) return;
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      setSelectedInvoice({ id: doc.id, number: doc.number, total: doc.total });
      setShowPaymentModal(true);
    }
  };

  const handleShare = (id: number) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    setSharingDoc({ id: doc.id, number: doc.number, partnerName: doc.partnerName });
    setShareToken(null);
    setShareTokenExpiry(null);
    setShowShareDialog(true);
  };

  const handleWhatsApp = (id: number) => handleShare(id);

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
      toastSuccess(t('shareLinkRevoked'));
    } catch (error: any) {
      toastError(error.message || t('shareLinkRevokeError'));
    }
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
    } catch (_error) {
      toastError(t('exportError'));
    }
  };

  const Icon = config.icon;

  return (
    <AdminLayout>
      <div
        dir={dir}
        style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
          <PageHeader
            icon={Icon}
            title={config.title}
            subtitle={`${t('manageYour')} ${config.title.toLowerCase()}`}
            actions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
        </div>

        {/* Inline filter bar */}
        <div
          className="page-quick-search products-filter-row"
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            width: '100%',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          {/* Search */}
          <div
            style={{
              flex: 1,
              minWidth: '12rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('search')}
            </span>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  insetInlineStart: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  width: '1rem',
                  height: '1rem',
                  pointerEvents: 'none',
                }}
              />
              <InputText
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('searchByNumberOrName')}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '0.875rem',
                  paddingInlineStart: '2.5rem',
                  paddingInlineEnd: searchInput ? '2.5rem' : '0.875rem',
                  borderRadius: '0.625rem',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                }}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                  }}
                >
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>
              )}
            </div>
          </div>

          <div className="orders-filter-bar">
            <PeriodFilter
              value={dateFilterType}
              range={dateRange}
              onChange={(preset, range) => {
                setDateFilterType(preset);
                setDateRange(range);
                setCurrentPage(1);
              }}
            />

            {/* Status dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('status')}
              </span>
              <AutoCompleteSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.value);
                  setCurrentPage(1);
                }}
                options={statusOptions}
                style={{ height: '3rem', minWidth: '9rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        <DocumentTable
          documentType={documentType}
          direction={direction}
          documents={transformedFactures}
          partnerLabel={config.partnerLabel}
          itemLabel={
            documentType === 'facture'
              ? 'facture'
              : documentType === 'devis'
                ? 'devis'
                : 'bon de livraison'
          }
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
          aggregates={documentAggregates}
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
          onClose={() => {
            setShowShareDialog(false);
            setSharingDoc(null);
          }}
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
