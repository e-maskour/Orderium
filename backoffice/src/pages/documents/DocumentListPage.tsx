import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Download, Search, Calendar as CalendarIcon } from 'lucide-react';
import { DocumentTable } from '../../components/documents';
import {
  ShareDocumentDialog,
  ShareDocumentType,
} from '../../components/documents/ShareDocumentDialog';
import { documentsService } from '../../modules/documents/services/documents.service';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';
import { DocumentType, DocumentDirection, DocumentConfig } from '../../modules/documents/types';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { useQuery } from '@tanstack/react-query';
import { quotesService } from '../../modules/quotes/quotes.service';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { ordersService } from '../../modules/orders/orders.service';
import {
  toastExported,
  toastError,
  toastDeleteError,
  toastConfirm,
  toastDocument,
  toastSuccess,
} from '../../services/toast.service';

type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last_month'
  | 'year'
  | 'last_year'
  | 'custom';

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
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const dateOverlayRef = useRef<OverlayPanel>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    const now = new Date();
    switch (dateFilterType) {
      case 'today': {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return {
          start: s,
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        };
      }
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return {
          start: new Date(y.getFullYear(), y.getMonth(), y.getDate()),
          end: new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999),
        };
      }
      case 'week': {
        const s = new Date(now);
        s.setDate(now.getDate() - now.getDay());
        s.setHours(0, 0, 0, 0);
        const e = new Date(s);
        e.setDate(s.getDate() + 6);
        e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
      }
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        };
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          start: lm,
          end: new Date(lm.getFullYear(), lm.getMonth() + 1, 0, 23, 59, 59, 999),
        };
      }
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
      case 'last_year':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
        };
      case 'custom':
        if (dateRange.start && dateRange.end) return { start: dateRange.start, end: dateRange.end };
        if (dateRange.start) {
          const e2 = new Date(dateRange.start);
          e2.setHours(23, 59, 59, 999);
          return { start: dateRange.start, end: e2 };
        }
        return {};
      default:
        return {};
    }
  }, [dateFilterType, dateRange]);

  const datePresetOptions = [
    { label: t('all'), value: 'all' },
    { label: t('today'), value: 'today' },
    { label: t('yesterday'), value: 'yesterday' },
    { label: t('thisWeek'), value: 'week' },
    { label: t('thisMonth'), value: 'month' },
    { label: t('lastMonth'), value: 'last_month' },
    { label: t('thisYear'), value: 'year' },
    { label: t('lastYear'), value: 'last_year' },
    { label: t('selectDates'), value: 'custom' },
  ];

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
        } catch (error) {
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
        } catch (error) {
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
          toastDeleteError(error, t as (key: string) => string);
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
      toastSuccess('Lien révoqué avec succès');
    } catch (error: any) {
      toastError(error.message || 'Erreur lors de la révocation du lien');
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
    } catch (error) {
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
            {/* Date range OverlayPanel */}
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
                {t('period')}
              </span>
              <div
                className={'p-dropdown p-component' + (dateFilterType !== 'all' ? ' p-focus' : '')}
                role="button"
                tabIndex={0}
                onClick={(e) => dateOverlayRef.current?.toggle(e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') dateOverlayRef.current?.toggle(e);
                }}
                style={{
                  height: '3rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: dateFilterType !== 'all' ? '#eff6ff' : undefined,
                  borderColor: dateFilterType !== 'all' ? '#235ae4' : undefined,
                  color: dateFilterType !== 'all' ? '#235ae4' : undefined,
                  width: '100%',
                  minWidth: '9.5rem',
                }}
              >
                <span
                  className="p-dropdown-label p-inputtext"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: dateFilterType !== 'all' ? '#235ae4' : undefined,
                  }}
                >
                  {dateFilterType === 'all'
                    ? t('period')
                    : dateFilterType === 'custom' && (dateRange.start || dateRange.end)
                      ? [
                          dateRange.start
                            ? dateRange.start.toLocaleDateString(
                                language === 'ar' ? 'ar-MA' : 'fr-FR',
                                { day: '2-digit', month: '2-digit', year: 'numeric' },
                              )
                            : '…',
                          dateRange.end
                            ? dateRange.end.toLocaleDateString(
                                language === 'ar' ? 'ar-MA' : 'fr-FR',
                                { day: '2-digit', month: '2-digit', year: 'numeric' },
                              )
                            : '…',
                        ].join(' – ')
                      : (datePresetOptions.find((o) => o.value === dateFilterType)?.label ??
                        t('period'))}
                </span>
                <div className="p-dropdown-trigger">
                  {dateFilterType !== 'all' ? (
                    <span
                      role="button"
                      aria-label="clear date"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateFilterType('all');
                        setDateRange({});
                      }}
                      style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}
                    >
                      <X style={{ width: '0.75rem', height: '0.75rem' }} />
                    </span>
                  ) : (
                    <span className="p-dropdown-trigger-icon p-icon">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ width: '1rem', height: '1rem' }}
                      >
                        <path
                          d="M7.01744 10.398C6.91269 10.3985 6.8089 10.378 6.71215 10.3379C6.61541 10.2977 6.52766 10.2386 6.45405 10.1641L1.13907 4.84913C1.03306 4.69404 0.985221 4.5065 1.00399 4.31958C1.02276 4.13266 1.10693 3.95838 1.24166 3.82747C1.37639 3.69655 1.55301 3.61742 1.74039 3.60402C1.92777 3.59062 2.11386 3.64382 2.26584 3.75424L7.01744 8.47394L11.769 3.75424C11.9189 3.65709 12.097 3.61306 12.2748 3.62921C12.4527 3.64535 12.6199 3.72073 12.7498 3.84328C12.8797 3.96582 12.9647 4.12842 12.9912 4.30502C13.0177 4.48162 12.9841 4.662 12.8958 4.81724L7.58083 10.1322C7.50996 10.2125 7.42344 10.2775 7.32656 10.3232C7.22968 10.3689 7.12449 10.3944 7.01744 10.398Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <OverlayPanel
              ref={dateOverlayRef}
              style={{
                width: isMobile ? '95vw' : '20rem',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 0,
              }}
              pt={{ content: { style: { padding: 0 } } }}
            >
              <div style={{ padding: '0.875rem 1rem 0.5rem' }}>
                <p
                  style={{
                    margin: '0 0 0.625rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('period')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                  {datePresetOptions
                    .filter((o) => o.value !== 'custom')
                    .map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setDateFilterType(opt.value as DatePreset);
                          if (opt.value !== 'custom') {
                            setDateRange({});
                            dateOverlayRef.current?.hide();
                          }
                        }}
                        style={{
                          padding: '0.4rem 0.625rem',
                          borderRadius: '0.4rem',
                          border:
                            '1.5px solid ' + (dateFilterType === opt.value ? '#235ae4' : '#e2e8f0'),
                          background: dateFilterType === opt.value ? '#eff6ff' : '#f8fafc',
                          color: dateFilterType === opt.value ? '#235ae4' : '#475569',
                          fontSize: '0.8125rem',
                          fontWeight: dateFilterType === opt.value ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                </div>
              </div>
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  padding: '0.625rem 1rem 0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <Calendar
                  value={
                    dateRange.start && dateRange.end
                      ? [dateRange.start, dateRange.end]
                      : dateRange.start
                        ? [dateRange.start]
                        : null
                  }
                  onChange={(e) => {
                    const val = e.value as Date[] | null;
                    if (Array.isArray(val)) {
                      setDateFilterType('custom');
                      setDateRange({ start: val[0] ?? undefined, end: val[1] ?? undefined });
                      if (val[0] && val[1]) dateOverlayRef.current?.hide();
                    } else {
                      setDateFilterType('custom');
                      setDateRange({});
                    }
                  }}
                  selectionMode="range"
                  dateFormat="dd/mm/yy"
                  placeholder={t('start') + ' – ' + t('end')}
                  numberOfMonths={isMobile ? 1 : 2}
                  inputStyle={{ fontSize: '0.75rem', height: '2rem' }}
                  style={{ width: '100%' }}
                />
              </div>
            </OverlayPanel>

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
              <Dropdown
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
