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
import { presetRange, type DatePreset } from '../utils/datePresets';
import { PeriodFilter } from '../components/PeriodFilter';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Payment, PaymentFilters, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import PaymentModal from '../components/PaymentModal';
import { toastConfirm } from '../services/toast.service';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { formatAmount, formatDate } from '@orderium/ui';
import { EmptyState } from '../components/EmptyState';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { AutoCompleteSelect } from '../components/ui/AutoCompleteSelect';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { PartnerAvatar, RefLink } from '@/components/ui';
import { entityRoutes } from '@/lib/entityRoutes';

/** Local calendar day as YYYY-MM-DD (toISOString() would shift to UTC). */
function toLocalYMD(d?: Date): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function PaiementsVente() {
  const { t, language, dir } = useLanguage();
  const queryClient = useQueryClient();

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<PaymentFilters['sortField']>(undefined);
  const [sortOrder, setSortOrder] = useState<1 | -1 | 0 | null | undefined>(undefined);

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

  const dateFrom = toLocalYMD(getDateRange.start);
  const dateTo = toLocalYMD(getDateRange.end);
  const paymentType = paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined;
  const search = debouncedSearch.trim() || undefined;

  // Back to page 1 (and drop the selection) whenever a filter changes
  useEffect(() => {
    setPage(1);
    setSelectedRows([]);
  }, [search, paymentType, dateFrom, dateTo]);

  // All filters, pagination and sorting are applied by the API
  const { data: listData, isLoading: loading } = useQuery({
    queryKey: [
      'payments-vente',
      { search, paymentType, dateFrom, dateTo, page, pageSize, sortField, sortOrder },
    ],
    queryFn: () =>
      paymentsService.getPage({
        direction: 'vente',
        search,
        paymentType,
        dateFrom,
        dateTo,
        page,
        limit: pageSize,
        sortField: sortOrder ? sortField : undefined,
        sortOrder: sortOrder ? (sortOrder === 1 ? 'ASC' : 'DESC') : undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const filteredPayments = listData?.payments ?? [];
  const totalRecords = listData?.total ?? 0;
  const totalAmount = listData?.totalAmount ?? 0;

  // "This month" KPI: fixed current-month range, aggregated server-side
  const monthRange = presetRange('month');
  const monthFrom = toLocalYMD(monthRange.start);
  const monthTo = toLocalYMD(monthRange.end);
  const { data: monthData } = useQuery({
    queryKey: ['payments-vente-kpi', monthFrom, monthTo],
    queryFn: () =>
      paymentsService.getPage({
        direction: 'vente',
        dateFrom: monthFrom,
        dateTo: monthTo,
        page: 1,
        limit: 1,
      }),
    staleTime: 60_000,
  });
  const thisMonthCount = monthData?.total ?? 0;
  const thisMonthAmount = monthData?.totalAmount ?? 0;

  const clearSelection = () => setSelectedRows([]);
  const toggleSelectAll = () =>
    selectedRows.length === filteredPayments.length
      ? setSelectedRows([])
      : setSelectedRows(filteredPayments);

  const getPartnerId = (p: Payment): number | undefined =>
    p.customerId ?? p.invoice?.customerId ?? undefined;
  const getInvoiceNumber = (p: Payment) => p.invoice?.documentNumber || '#' + p.invoiceId;
  const getCustomerName = (p: Payment) => p.invoice?.customerName || '-';
  const getInvoiceTotal = (p: Payment) => p.invoice?.total || 0;

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

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
              value={totalRecords}
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
              subtitle={thisMonthCount + ' paiements'}
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
            <PeriodFilter
              value={dateFilterType}
              range={dateRange}
              onChange={(preset, range) => {
                setDateFilterType(preset);
                setDateRange(range);
              }}
            />

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
              <AutoCompleteSelect
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
              totalCount={totalRecords}
              hasMore={page * pageSize < totalRecords}
              onLoadMore={() => {
                // Mobile shows a growing list: widen page 1 instead of replacing rows
                setPageSize(Math.min(page * pageSize + DEFAULT_PAGE_SIZE, 500));
                setPage(1);
              }}
              countLabel="paiements"
              emptyMessage="Aucun paiement trouvé"
              config={{
                topLeft: (p: Payment) => (
                  <RefLink to={entityRoutes.invoice(p.invoiceId, 'vente')}>
                    {getInvoiceNumber(p)}
                  </RefLink>
                ),
                topRight: (p: Payment) =>
                  '+' + formatAmount(p.amount, 2) + ' ' + (language === 'ar' ? 'د.م' : 'DH'),
                bottomLeft: (p: Payment) => getCustomerName(p) + ' · ' + formatDate(p.paymentDate),
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
            lazy
            paginator
            paginatorPosition="bottom"
            first={(page - 1) * pageSize}
            rows={pageSize}
            totalRecords={totalRecords}
            onPage={(e: DataTablePageEvent) => {
              setPage(Math.floor(e.first / e.rows) + 1);
              setPageSize(e.rows);
            }}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={(e: DataTableSortEvent) => {
              setSortField((e.sortField || undefined) as PaymentFilters['sortField']);
              setSortOrder(e.sortOrder);
              setPage(1);
            }}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
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
                    {formatDate(p.paymentDate)}
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
                  <RefLink to={entityRoutes.invoice(p.invoiceId, 'vente')}>
                    {getInvoiceNumber(p)}
                  </RefLink>
                </span>
              )}
            />
            <Column
              header={t('client')}
              body={(p: Payment) => {
                const name = getCustomerName(p);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PartnerAvatar name={name !== '-' ? name : null} size="sm" shape="circle" />
                    <span style={{ color: '#334155', fontWeight: 500, minWidth: 0 }}>
                      <RefLink
                        to={(() => {
                          const pid = getPartnerId(p);
                          return pid ? entityRoutes.partner(pid, 'vente') : null;
                        })()}
                      >
                        {name}
                      </RefLink>
                    </span>
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
        totalCount={totalRecords}
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
          invoiceTotal={getInvoiceTotal(selectedPayment)}
          payment={selectedPayment}
        />
      )}
    </AdminLayout>
  );
}
