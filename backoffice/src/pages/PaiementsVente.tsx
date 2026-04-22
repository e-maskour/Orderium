import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { KpiCard, KpiGrid } from '../components/KpiCard';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wallet,
  Search,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  FileCheck,
  X,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { OverlayPanel } from 'primereact/overlaypanel';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Payment, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import { invoicesService } from '../modules/invoices';
import PaymentModal from '../components/PaymentModal';
import { toastConfirm, toastError } from '../services/toast.service';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { formatAmount } from '@orderium/ui';
import { EmptyState } from '../components/EmptyState';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

export default function PaiementsVente() {
  const { t, language, dir } = useLanguage();
  const queryClient = useQueryClient();
  const dateOverlayRef = useRef<OverlayPanel>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedRows, setSelectedRows] = useState<Payment[]>([]);

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

  const { data: filteredPayments = [], isLoading: loading } = useQuery({
    queryKey: [
      'payments-vente',
      debouncedSearch,
      paymentTypeFilter,
      dateFilterType,
      getDateRange.start,
      getDateRange.end,
    ],
    queryFn: async () => {
      const all = await paymentsService.getAll({
        search: debouncedSearch || undefined,
        paymentType: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
        dateFrom: getDateRange.start ? getDateRange.start.toISOString().split('T')[0] : undefined,
        dateTo: getDateRange.end ? getDateRange.end.toISOString().split('T')[0] : undefined,
      });
      return all.filter((p: Payment) => p.customerId != null);
    },
  });

  const { data: allSalesPayments = [] } = useQuery({
    queryKey: ['payments-vente-kpi'],
    queryFn: async () =>
      (await paymentsService.getAll({})).filter((p: Payment) => p.customerId != null),
    staleTime: 60_000,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: () => invoicesService.getAll(),
  });
  const invoices: any[] = invoicesData?.invoices || [];

  const clearSelection = () => setSelectedRows([]);
  const toggleSelectAll = () =>
    selectedRows.length === filteredPayments.length
      ? setSelectedRows([])
      : setSelectedRows(filteredPayments);

  const getInvoiceNumber = (invoiceId: number) => {
    const inv = invoices.find((i: any) => i.invoice.id === invoiceId);
    return inv?.invoice.invoiceNumber || '#' + invoiceId;
  };
  const getCustomerName = (invoiceId: number) => {
    const inv = invoices.find((i: any) => i.invoice.id === invoiceId);
    return inv?.invoice.customerName || '-';
  };
  const getInvoiceTotal = (invoiceId: number) => {
    const inv = invoices.find((i: any) => i.invoice.id === invoiceId);
    return inv?.invoice.total || 0;
  };

  const handleDelete = async (id: number) => {
    toastConfirm(
      t('deletePayment'),
      async () => {
        try {
          await paymentsService.delete(id);
          queryClient.invalidateQueries({ queryKey: ['payments-vente'] });
          queryClient.invalidateQueries({ queryKey: ['payments-vente-kpi'] });
        } catch {
          toastError(t('error'), { description: t('errorDeletingPayment') });
        }
      },
      { description: t('confirmDeletePayment'), confirmLabel: t('delete') },
    );
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const totalAmount = allSalesPayments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthPayments = allSalesPayments.filter((p) => {
    const d = new Date(p.paymentDate);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  const PAYMENT_METHOD_CONFIG: Record<string, { cls: string; icon: React.ElementType }> = {
    cash: { cls: 'pm-badge pm-badge--cash', icon: Banknote },
    check: { cls: 'pm-badge pm-badge--check', icon: FileCheck },
    bank_transfer: { cls: 'pm-badge pm-badge--bank-transfer', icon: Building2 },
    credit_card: { cls: 'pm-badge pm-badge--credit-card', icon: CreditCard },
    mobile_payment: { cls: 'pm-badge pm-badge--mobile', icon: Smartphone },
    other: { cls: 'pm-badge pm-badge--other', icon: Wallet },
  };

  return (
    <AdminLayout>
      <div
        dir={dir}
        style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
          <PageHeader
            icon={Wallet}
            title={t('salesPayments')}
            subtitle={t('manageSalesPayments')}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <KpiGrid count={3}>
            <KpiCard
              label={t('totalPayments')}
              value={allSalesPayments.length}
              icon={CreditCard}
              color="blue"
            />
            <KpiCard
              label={t('totalAmount')}
              value={formatAmount(totalAmount, 2) + ' ' + (language === 'ar' ? 'د.م' : 'DH')}
              icon={Wallet}
              color="emerald"
            />
            <KpiCard
              label={t('thisMonth')}
              value={formatAmount(thisMonthAmount, 2) + ' ' + (language === 'ar' ? 'د.م' : 'DH')}
              icon={CalendarIcon}
              color="purple"
              subtitle={thisMonthPayments.length + ' paiements'}
            />
          </KpiGrid>
        </div>

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
                placeholder={t('search') + '...'}
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
                {t('paymentMethod')}
              </span>
              <Dropdown
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.value)}
                options={[
                  { label: t('all'), value: 'all' },
                  ...Object.entries(PAYMENT_TYPE_LABELS).map(([key, label]) => ({
                    label,
                    value: key,
                  })),
                ]}
                style={{ height: '3rem', minWidth: '9rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div className="responsive-table-mobile" style={{ padding: '0.75rem' }}>
            <MobileList
              items={filteredPayments}
              keyExtractor={(p: Payment) => p.id}
              loading={loading}
              totalCount={filteredPayments.length}
              countLabel="paiements"
              emptyMessage="Aucun paiement trouvé"
              config={{
                topLeft: (p: Payment) => getInvoiceNumber(p.invoiceId),
                topRight: (p: Payment) =>
                  '+' + formatAmount(p.amount, 2) + ' ' + (language === 'ar' ? 'د.م' : 'DH'),
                bottomLeft: (p: Payment) =>
                  getCustomerName(p.invoiceId) +
                  ' · ' +
                  new Date(p.paymentDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }),
                bottomRight: (p: Payment) => (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    {PAYMENT_TYPE_LABELS[p.paymentType]}
                  </span>
                ),
              }}
            />
          </div>

          <DataTable
            className="pv-datatable responsive-table-desktop"
            value={filteredPayments}
            selection={selectedRows}
            onSelectionChange={(e) => setSelectedRows(e.value as Payment[])}
            selectionMode="checkbox"
            dataKey="id"
            paginator
            paginatorPosition="top"
            rows={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            removableSort
            loading={loading}
            emptyMessage={
              <EmptyState
                icon={Wallet}
                title="Aucun paiement trouvé"
                description="Aucun paiement de vente ne correspond à votre recherche"
              />
            }
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            currentPageReportTemplate={t('pageReportTemplate')}
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
            <Column
              field="paymentDate"
              header={t('invoice.date')}
              sortable
              body={(p: Payment) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '1.875rem',
                      height: '1.875rem',
                      borderRadius: '0.4rem',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CalendarIcon
                      style={{ width: '0.875rem', height: '0.875rem', color: '#3b82f6' }}
                    />
                  </div>
                  <span style={{ fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                    {new Date(p.paymentDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            />
            <Column
              header={t('invoice')}
              body={(p: Payment) => (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    borderRadius: '0.375rem',
                    padding: '0.1875rem 0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    letterSpacing: '0.02em',
                  }}
                >
                  {getInvoiceNumber(p.invoiceId)}
                </span>
              )}
            />
            <Column
              header={t('client')}
              body={(p: Payment) => {
                const name = getCustomerName(p.invoiceId);
                const initials =
                  name !== '-'
                    ? name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '1.875rem',
                        height: '1.875rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{name}</span>
                  </div>
                );
              }}
            />
            <Column
              field="paymentType"
              header={t('paymentMethod')}
              sortable
              body={(p: Payment) => {
                const cfg = PAYMENT_METHOD_CONFIG[p.paymentType] || PAYMENT_METHOD_CONFIG.other;
                const MethodIcon = cfg.icon;
                return (
                  <span className={cfg.cls}>
                    <MethodIcon />
                    {PAYMENT_TYPE_LABELS[p.paymentType]}
                  </span>
                );
              }}
            />
            <Column
              field="referenceNumber"
              header={t('reference')}
              sortable
              body={(p: Payment) =>
                p.referenceNumber ? (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8125rem',
                      color: '#475569',
                      background: '#f8fafc',
                      padding: '0.125rem 0.4375rem',
                      borderRadius: '0.25rem',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {p.referenceNumber}
                  </span>
                ) : (
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>—</span>
                )
              }
            />
            <Column
              field="amount"
              header={t('amount')}
              sortable
              align="right"
              headerStyle={{ textAlign: 'right' }}
              body={(p: Payment) => (
                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#059669' }}>
                    +{formatAmount(p.amount, 2)}
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        marginLeft: '0.25rem',
                      }}
                    >
                      {language === 'ar' ? 'د.م' : 'DH'}
                    </span>
                  </div>
                </div>
              )}
            />
          </DataTable>
        </div>
      </div>

      <FloatingActionBar
        selectedCount={selectedRows.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={
          selectedRows.length === filteredPayments.length && filteredPayments.length > 0
        }
        totalCount={filteredPayments.length}
        itemLabel="paiement"
        actions={[
          ...(selectedRows.length === 1
            ? [
                {
                  id: 'edit',
                  label: t('modify'),
                  icon: <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => handleEdit(selectedRows[0]),
                  variant: 'secondary' as const,
                },
              ]
            : []),
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () =>
              toastConfirm(
                t('delete') + ' ' + selectedRows.length + ' paiement(s)?',
                async () => {
                  for (const p of selectedRows) await paymentsService.delete(p.id);
                  queryClient.invalidateQueries({ queryKey: ['payments-vente'] });
                  queryClient.invalidateQueries({ queryKey: ['payments-vente-kpi'] });
                  clearSelection();
                },
                { confirmLabel: t('delete') },
              ),
            variant: 'danger' as const,
          },
        ]}
      />

      {selectedPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['payments-vente'] });
            queryClient.invalidateQueries({ queryKey: ['payments-vente-kpi'] });
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          invoiceId={selectedPayment.invoiceId}
          invoiceTotal={getInvoiceTotal(selectedPayment.invoiceId)}
          payment={selectedPayment}
        />
      )}
    </AdminLayout>
  );
}
