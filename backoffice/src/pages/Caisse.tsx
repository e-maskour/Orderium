import { AdminLayout } from '../components/AdminLayout';
import { DecimalInput } from '@orderium/ui';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Banknote,
  Search,
  Edit2,
  Trash2,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Plus,
  X,
  Clock,
  CircleDollarSign,
  ChevronDown,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Sidebar } from 'primereact/sidebar';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Paginator, PaginatorPageChangeEvent } from 'primereact/paginator';
import { Column } from 'primereact/column';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import {
  orderPaymentsService,
  ORDER_PAYMENT_TYPE_LABELS,
  OrderPayment,
  ICaisseOrder,
  CaissePaymentStatus,
  CaissePage,
  CaisseSortField,
  OrderPaymentType,
} from '../modules/order-payments';
import { toastConfirm, toastError, toastSuccess } from '../services/toast.service';
import { formatAmount, formatDateTime } from '@orderium/ui';

/* ─── Constants ──────────────────────────────────────────────── */

const PAYMENT_METHOD_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  check: Wallet,
  bank_transfer: Building2,
  credit_card: CreditCard,
  mobile_payment: Smartphone,
  other: CircleDollarSign,
};

const METHODS: { key: OrderPaymentType; icon: React.ElementType }[] = [
  { key: 'cash', icon: Banknote },
  { key: 'credit_card', icon: CreditCard },
  { key: 'bank_transfer', icon: Building2 },
  { key: 'check', icon: Wallet },
  { key: 'mobile_payment', icon: Smartphone },
  { key: 'other', icon: CircleDollarSign },
];

type StatusFilter = 'all' | CaissePaymentStatus;

/* ─── Helpers ────────────────────────────────────────────────── */

function fmtDatetime(d: string) {
  return formatDateTime(d);
}

/** Same date format as the Orders table "Commande" column. */
function formatOrderDate(dateString: string, language: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (language?.startsWith('fr')) {
    const m = [
      'Jan',
      'Fev',
      'Mar',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Aou',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${date.getDate()} ${m[date.getMonth()]} ${date.getFullYear()} ${time}`;
  }
  return new Intl.DateTimeFormat('ar-MA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function initials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Component ──────────────────────────────────────────────── */

export default function Caisse() {
  const { t, language } = useLanguage();
  const currency = language === 'ar' ? 'د.م' : 'DH';

  // Data
  const [orders, setOrders] = useState<ICaisseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [first, setFirst] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  // Server-side sort (undefined → API default: newest first)
  const [sort, setSort] = useState<{ field?: CaisseSortField; order?: 'ASC' | 'DESC' }>({});
  const [counts, setCounts] = useState<CaissePage['counts']>({
    all: 0,
    paid: 0,
    partial: 0,
    unpaid: 0,
  });
  const [summary, setSummary] = useState<CaissePage['summary']>({
    totalDue: 0,
    totalCollected: 0,
    totalRemaining: 0,
  });

  // Debounce the search box before it hits the API
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Back to page 1 whenever the filters change
  useEffect(() => {
    setFirst(0);
  }, [searchTerm, statusFilter]);

  // Add-payment drawer
  const [payDrawer, setPayDrawer] = useState(false);
  const [payOrder, setPayOrder] = useState<ICaisseOrder | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<OrderPaymentType>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit-payment drawer
  const [editDrawer, setEditDrawer] = useState(false);
  const [editPayment, setEditPayment] = useState<OrderPayment | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMethod, setEditMethod] = useState<OrderPaymentType>('cash');
  const [editNotes, setEditNotes] = useState('');

  // History drawer
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<ICaisseOrder | null>(null);
  const [historyPayments, setHistoryPayments] = useState<OrderPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  /* ─ Data loading ─ */
  // Search, status and pagination are applied by the API; counts and
  // summary totals come back for the whole filtered set.
  const caisseFilters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    page: Math.floor(first / pageSize) + 1,
    limit: pageSize,
    sortField: sort.field,
    sortOrder: sort.order,
  };

  const applyPage = (data: CaissePage) => {
    setOrders(data.orders);
    setTotalRecords(data.total);
    setCounts(data.counts);
    setSummary(data.summary);
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      applyPage(await orderPaymentsService.getCaissePage(caisseFilters));
    } catch {
      toastError(t('error'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, first, pageSize, sort.field, sort.order]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    orderPaymentsService
      .getCaissePage(caisseFilters, controller.signal)
      .then((data) => {
        if (!cancelled) applyPage(data);
      })
      .catch(() => {
        if (!cancelled) toastError(t('error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, first, pageSize, sort.field, sort.order]);

  /* ─ Filtering (server-side) ─ */
  const filtered = orders;

  const summaryDue = summary.totalDue;
  const summaryCollected = summary.totalCollected;
  const summaryRemaining = summary.totalRemaining;

  /* ─ Add payment ─ */
  const openPayDrawer = (order: ICaisseOrder) => {
    setPayOrder(order);
    setPayAmount(order.remainingAmount);
    setPayMethod('cash');
    setPayNotes('');
    setPayDrawer(true);
  };

  const handlePay = async () => {
    if (!payOrder || !payAmount || payAmount <= 0) {
      toastError(t('error'));
      return;
    }
    try {
      setSaving(true);
      await orderPaymentsService.create({
        orderId: payOrder.id,
        amount: payAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentType: payMethod,
        notes: payNotes || undefined,
      });
      toastSuccess(t('paymentRecorded'));
      setPayDrawer(false);
      await loadOrders();

      // If history drawer is open for same order, refresh it
      if (historyDrawer && historyOrder?.id === payOrder.id) {
        const freshOrder = orders.find((o) => o.id === payOrder.id);
        if (freshOrder) loadHistory(freshOrder);
      }
    } catch {
      toastError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  /* ─ Payment history ─ */
  const loadHistory = async (order: ICaisseOrder) => {
    setHistoryOrder(order);
    setHistoryDrawer(true);
    setHistoryLoading(true);
    try {
      const payments = await orderPaymentsService.getByOrder(order.id);
      setHistoryPayments(payments);
    } catch {
      toastError(t('error'));
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ─ Edit payment ─ */
  const openEditDrawer = (payment: OrderPayment) => {
    setEditPayment(payment);
    setEditAmount(payment.amount);
    setEditMethod(payment.paymentType);
    setEditNotes(payment.notes ?? '');
    setEditDrawer(true);
  };

  const handleEdit = async () => {
    if (!editPayment || !editAmount || editAmount <= 0) return;
    try {
      setSaving(true);
      await orderPaymentsService.update(editPayment.id, {
        amount: editAmount,
        paymentType: editMethod,
        notes: editNotes || undefined,
      });
      toastSuccess(t('paymentUpdated'));
      setEditDrawer(false);
      await loadOrders();
      if (historyOrder) loadHistory(historyOrder);
    } catch {
      toastError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  /* ─ Delete payment ─ */
  const handleDeletePayment = (paymentId: number) => {
    toastConfirm(
      t('deletePayment'),
      async () => {
        try {
          await orderPaymentsService.delete(paymentId);
          toastSuccess(t('paymentDeleted'));
          await loadOrders();
          if (historyOrder) loadHistory(historyOrder);
        } catch {
          toastError(t('error'));
        }
      },
      { description: t('confirmDeletePayment'), confirmLabel: t('delete') },
    );
  };

  /* ─ Status helpers ─ */
  const statusLabel = (s: CaissePaymentStatus) => {
    if (s === 'paid') return t('fullyPaid');
    if (s === 'partial') return t('partiallyPaid');
    return t('unpaid');
  };

  const remainingClass = (v: number) =>
    v > 0 ? 'caisse-card__amount-value--remaining' : 'caisse-card__amount-value--remaining-zero';

  const amountCell = (value: number, cls: string) => (
    <span className={`caisse-card__amount-value ${cls}`}>
      {formatAmount(value, 2)} <span className="caisse-card__amount-currency">{currency}</span>
    </span>
  );

  /* ─ Mobile card ─ */
  const renderCard = (order: ICaisseOrder) => {
    const pct = order.total > 0 ? Math.min((order.paidAmount / order.total) * 100, 100) : 0;
    const st = order.paymentStatus;
    return (
      <div key={order.id} className={`caisse-card caisse-card--${st}`}>
        <div className="caisse-progress">
          <div
            className={`caisse-progress__fill caisse-progress__fill--${st}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="caisse-card__header">
          <div className="caisse-card__order-info">
            <div className="caisse-card__avatar">{initials(order.customerName)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="caisse-card__name">{order.customerName || '—'}</div>
              <span className="caisse-card__order-num">{order.orderNumber || '—'}</span>
            </div>
          </div>
          <span className={`caisse-card__status caisse-card__status--${st}`}>
            {statusLabel(st)}
          </span>
        </div>
        <div className="caisse-card__amounts">
          <div className="caisse-card__amount-item">
            <span className="caisse-card__amount-label">{t('orderTotal')}</span>
            {amountCell(order.total, 'caisse-card__amount-value--total')}
          </div>
          <div className="caisse-card__amount-item">
            <span className="caisse-card__amount-label">{t('amountPaid')}</span>
            {amountCell(order.paidAmount, 'caisse-card__amount-value--paid')}
          </div>
          <div className="caisse-card__amount-item">
            <span className="caisse-card__amount-label">{t('remaining')}</span>
            {amountCell(order.remainingAmount, remainingClass(order.remainingAmount))}
          </div>
        </div>
        <div className="caisse-card__actions">
          {(st === 'partial' || st === 'unpaid') && (
            <button
              className="caisse-action-btn caisse-action-btn--pay"
              onClick={() => openPayDrawer(order)}
            >
              <Plus />
              {t('addPayment')}
            </button>
          )}
          <button
            className="caisse-action-btn caisse-action-btn--history"
            onClick={() => loadHistory(order)}
          >
            <Clock />
            {t('viewHistory')}
          </button>
        </div>
      </div>
    );
  };

  /* ═════════════════════════════════════════════════════════════
       RENDER
       ═════════════════════════════════════════════════════════════ */
  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader icon={Banknote} title={t('caisse')} subtitle={t('manageOrderPayments')} />

        {/* ── Summary Bar ── */}
        <div className="caisse-summary">
          <div className="caisse-summary__item">
            <span className="caisse-summary__label">{t('totalDue')}</span>
            <span className="caisse-summary__value caisse-summary__value--due">
              {formatAmount(summaryDue, 2)}
              <span className="caisse-summary__currency">{currency}</span>
            </span>
          </div>
          <div className="caisse-summary__item">
            <span className="caisse-summary__label">{t('totalCollected')}</span>
            <span className="caisse-summary__value caisse-summary__value--collected">
              {formatAmount(summaryCollected, 2)}
              <span className="caisse-summary__currency">{currency}</span>
            </span>
          </div>
          <div className="caisse-summary__item">
            <span className="caisse-summary__label">{t('totalRemaining')}</span>
            <span className="caisse-summary__value caisse-summary__value--remaining">
              {formatAmount(summaryRemaining, 2)}
              <span className="caisse-summary__currency">{currency}</span>
            </span>
          </div>
        </div>

        {/* ── Search + Status Tabs ── */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}
        >
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1rem',
                height: '1rem',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <InputText
              ref={searchRef}
              type="text"
              placeholder={t('searchCaisse')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                height: '2.75rem',
                fontSize: '0.9375rem',
                borderRadius: '0.75rem',
                border: '1.5px solid #e2e8f0',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  searchRef.current?.focus();
                }}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  color: '#94a3b8',
                  padding: 0,
                }}
              >
                <X style={{ width: '1rem', height: '1rem' }} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="caisse-filters">
            {(['all', 'unpaid', 'partial', 'paid'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                className={`caisse-tab ${statusFilter === s ? 'caisse-tab--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? t('allStatuses') : statusLabel(s as CaissePaymentStatus)}
                <span className="caisse-tab__count">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Orders: cards on mobile, DataTable on desktop ── */}
        {loading && orders.length === 0 ? (
          <div className="caisse-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="caisse-card"
                style={{
                  height: '12rem',
                  background: 'linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title={t('noOrdersWithPayments') as string}
            description={
              (searchTerm || statusFilter !== 'all'
                ? t('noOrdersMatchFilter')
                : t('noOrdersYet')) as string
            }
          />
        ) : (
          <>
            <div className="responsive-table-mobile">
              <div className="caisse-grid">{filtered.map((order) => renderCard(order))}</div>
              {totalRecords > pageSize && (
                <Paginator
                  first={first}
                  rows={pageSize}
                  totalRecords={totalRecords}
                  onPageChange={(e: PaginatorPageChangeEvent) => {
                    setFirst(e.first);
                    setPageSize(e.rows);
                  }}
                  template="PrevPageLink CurrentPageReport NextPageLink"
                  currentPageReportTemplate="{first} - {last} / {totalRecords}"
                />
              )}
            </div>

            <div
              className="responsive-table-desktop"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              <DataTable
                className="ord-datatable caisse-datatable"
                value={filtered}
                dataKey="id"
                scrollable
                lazy
                loading={loading}
                totalRecords={totalRecords}
                paginator
                paginatorPosition="bottom"
                first={first}
                rows={pageSize}
                onPage={(e: DataTablePageEvent) => {
                  setFirst(e.first);
                  setPageSize(e.rows);
                }}
                removableSort
                sortField={sort.field}
                sortOrder={sort.order === 'ASC' ? 1 : sort.order === 'DESC' ? -1 : 0}
                onSort={(e: DataTableSortEvent) => {
                  const field = e.sortOrder ? (e.sortField as CaisseSortField) : undefined;
                  setSort(field ? { field, order: e.sortOrder === -1 ? 'DESC' : 'ASC' } : {});
                  setFirst(0);
                }}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                currentPageReportTemplate={t('pageReportTemplate')}
                emptyMessage={t('noOrdersWithPayments')}
                rowClassName={(o: ICaisseOrder) =>
                  `ord-row-clickable caisse-row--${o.paymentStatus}`
                }
                onRowClick={(e) => {
                  const target = e.originalEvent.target as HTMLElement;
                  if (target.closest('button') || target.closest('a')) return;
                  loadHistory(e.data as ICaisseOrder);
                }}
              >
                <Column
                  header={t('orderNumber')}
                  sortField="orderNumber"
                  sortable
                  style={{ minWidth: '9rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.625rem',
                        background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                        borderRadius: '999px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem' }}>Σ</span>
                      {t('total')}
                    </span>
                  }
                  body={(o: ICaisseOrder) => (
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                        {o.orderNumber || '—'}
                      </span>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                        {formatOrderDate(o.dateCreated, language)}
                      </p>
                    </div>
                  )}
                />
                <Column
                  header={t('customer')}
                  sortField="customerName"
                  sortable
                  style={{ minWidth: '13rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(o: ICaisseOrder) => (
                    <div
                      className={`caisse-card--${o.paymentStatus}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        minWidth: 0,
                      }}
                    >
                      <div className="caisse-card__avatar">{initials(o.customerName)}</div>
                      <span className="caisse-card__name">{o.customerName || '—'}</span>
                    </div>
                  )}
                />
                <Column
                  header={t('status')}
                  sortField="paymentStatus"
                  sortable
                  style={{ minWidth: '10rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(o: ICaisseOrder) => {
                    const pct = o.total > 0 ? Math.min((o.paidAmount / o.total) * 100, 100) : 0;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span
                          className={`caisse-card__status caisse-card__status--${o.paymentStatus}`}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {statusLabel(o.paymentStatus)}
                        </span>
                        <div
                          className="caisse-progress"
                          style={{ borderRadius: '9999px', width: '100%', maxWidth: '8rem' }}
                          title={`${Math.round(pct)}%`}
                        >
                          <div
                            className={`caisse-progress__fill caisse-progress__fill--${o.paymentStatus}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }}
                />
                <Column
                  header={t('orderTotal')}
                  sortField="total"
                  sortable
                  style={{ minWidth: '8rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={amountCell(summaryDue, 'caisse-card__amount-value--total')}
                  body={(o: ICaisseOrder) =>
                    amountCell(o.total, 'caisse-card__amount-value--total')
                  }
                />
                <Column
                  header={t('amountPaid')}
                  sortField="paidAmount"
                  sortable
                  style={{ minWidth: '8rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={amountCell(summaryCollected, 'caisse-card__amount-value--paid')}
                  body={(o: ICaisseOrder) =>
                    amountCell(o.paidAmount, 'caisse-card__amount-value--paid')
                  }
                />
                <Column
                  header={t('remaining')}
                  sortField="remainingAmount"
                  sortable
                  style={{ minWidth: '8rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={amountCell(summaryRemaining, remainingClass(summaryRemaining))}
                  body={(o: ICaisseOrder) =>
                    amountCell(o.remainingAmount, remainingClass(o.remainingAmount))
                  }
                />
                <Column
                  header={t('actions')}
                  style={{ minWidth: '15rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(o: ICaisseOrder) => (
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {(o.paymentStatus === 'partial' || o.paymentStatus === 'unpaid') && (
                        <button
                          type="button"
                          className="caisse-action-btn caisse-action-btn--pay"
                          onClick={() => openPayDrawer(o)}
                        >
                          <Plus />
                          {t('addPayment')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="caisse-action-btn caisse-action-btn--history"
                        style={{ flex: '0 0 auto' }}
                        onClick={() => loadHistory(o)}
                        title={t('viewHistory')}
                      >
                        <Clock />
                        {t('viewHistory')}
                      </button>
                    </div>
                  )}
                />
              </DataTable>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ADD PAYMENT DRAWER
         ══════════════════════════════════════════════════════════ */}
      <Sidebar
        visible={payDrawer}
        onHide={() => setPayDrawer(false)}
        position={language === 'ar' ? 'left' : 'right'}
        className="caisse-drawer"
        style={{ width: '26rem', maxWidth: '100vw' }}
        showCloseIcon={false}
        blockScroll
        pt={{
          header: { style: { display: 'none' } },
          content: {
            style: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <div className="caisse-drawer-header">
          <span className="caisse-drawer-header__title">
            <Plus
              style={{
                width: '1rem',
                height: '1rem',
                display: 'inline',
                verticalAlign: '-2px',
                marginRight: '0.375rem',
              }}
            />
            {t('addPayment')}
          </span>
          <button className="caisse-drawer-header__close" onClick={() => setPayDrawer(false)}>
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        <div className="caisse-drawer-body">
          {payOrder && (
            <>
              {/* Order context */}
              <div
                style={{
                  background: '#fafaf9',
                  borderRadius: '0.75rem',
                  padding: '0.875rem 1rem',
                  marginBottom: '1.25rem',
                  border: '1px solid #e7e5e4',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>
                    {payOrder.customerName || '—'}
                  </span>
                  <span className="caisse-card__order-num">{payOrder.orderNumber}</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('orderTotal')}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                      {formatAmount(payOrder.total, 2)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('amountPaid')}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                      {formatAmount(payOrder.paidAmount, 2)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('remaining')}
                    </div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: payOrder.remainingAmount > 0 ? '#dc2626' : '#10b981',
                      }}
                    >
                      {formatAmount(payOrder.remainingAmount, 2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div className="caisse-form-group">
                <label className="caisse-form-label">{t('paymentAmount')} *</label>
                <div className="caisse-amount-input">
                  <DecimalInput
                    value={payAmount}
                    onValueChange={(v) => setPayAmount(v ?? 0)}
                    minFractionDigits={2}
                    maxFractionDigits={2}
                    min={0.01}
                    max={payOrder.remainingAmount > 0 ? payOrder.remainingAmount : undefined}
                    suffix={currency}
                    className="p-inputtext p-component"
                    style={{ width: '100%' }}
                  />
                </div>
                {/* Quick amounts */}
                <div className="caisse-quick-amounts">
                  {payOrder.remainingAmount > 0 && (
                    <button
                      className="caisse-quick-amount-btn caisse-quick-amount-btn--full"
                      onClick={() => setPayAmount(payOrder.remainingAmount)}
                    >
                      {t('quickPay')} ({formatAmount(payOrder.remainingAmount, 2)})
                    </button>
                  )}
                  {[100, 200, 500].map(
                    (v) =>
                      v < payOrder.remainingAmount && (
                        <button
                          key={v}
                          className="caisse-quick-amount-btn"
                          onClick={() => setPayAmount(v)}
                        >
                          {v}
                        </button>
                      ),
                  )}
                </div>
              </div>

              {/* Payment method */}
              <div className="caisse-form-group">
                <label className="caisse-form-label">{t('paymentMethod')} *</label>
                <div className="caisse-methods">
                  {METHODS.map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      className={`caisse-method-btn ${payMethod === key ? 'caisse-method-btn--active' : ''}`}
                      onClick={() => setPayMethod(key)}
                    >
                      <Icon />
                      <span>{ORDER_PAYMENT_TYPE_LABELS[key]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="caisse-form-group">
                <label className="caisse-form-label">{t('notes')}</label>
                <InputTextarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', resize: 'none', borderRadius: '0.75rem' }}
                  autoResize
                />
              </div>
            </>
          )}
        </div>

        <div className="caisse-drawer-footer">
          <button
            className="caisse-action-btn caisse-action-btn--pay"
            style={{
              width: '100%',
              height: '3rem',
              fontSize: '0.9375rem',
              borderRadius: '0.75rem',
            }}
            onClick={handlePay}
            disabled={saving || !payAmount || payAmount <= 0}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ChevronDown
                  style={{
                    animation: 'spin 1s linear infinite',
                    width: '1rem',
                    height: '1rem',
                  }}
                />
                {t('saving')}
              </span>
            ) : (
              <>
                <Plus />
                {t('recordPayment')} —{' '}
                {payAmount > 0 ? `${formatAmount(payAmount, 2)}\u00A0${currency}` : ''}
              </>
            )}
          </button>
        </div>
      </Sidebar>

      {/* ══════════════════════════════════════════════════════════
          EDIT PAYMENT DRAWER
         ══════════════════════════════════════════════════════════ */}
      <Sidebar
        visible={editDrawer}
        onHide={() => setEditDrawer(false)}
        position={language === 'ar' ? 'left' : 'right'}
        className="caisse-drawer"
        style={{ width: '26rem', maxWidth: '100vw' }}
        showCloseIcon={false}
        blockScroll
        pt={{
          header: { style: { display: 'none' } },
          content: {
            style: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <div className="caisse-drawer-header">
          <span className="caisse-drawer-header__title">
            <Edit2
              style={{
                width: '1rem',
                height: '1rem',
                display: 'inline',
                verticalAlign: '-2px',
                marginRight: '0.375rem',
              }}
            />
            {t('editPayment')}
          </span>
          <button className="caisse-drawer-header__close" onClick={() => setEditDrawer(false)}>
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        <div className="caisse-drawer-body">
          {editPayment && (
            <>
              <div className="caisse-form-group">
                <label className="caisse-form-label">{t('paymentAmount')} *</label>
                <div className="caisse-amount-input">
                  <DecimalInput
                    value={editAmount}
                    onValueChange={(v) => setEditAmount(v ?? 0)}
                    minFractionDigits={2}
                    maxFractionDigits={2}
                    min={0.01}
                    suffix={currency}
                    className="p-inputtext p-component"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="caisse-form-group">
                <label className="caisse-form-label">{t('paymentMethod')} *</label>
                <div className="caisse-methods">
                  {METHODS.map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      className={`caisse-method-btn ${editMethod === key ? 'caisse-method-btn--active' : ''}`}
                      onClick={() => setEditMethod(key)}
                    >
                      <Icon />
                      <span>{ORDER_PAYMENT_TYPE_LABELS[key]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="caisse-form-group">
                <label className="caisse-form-label">{t('notes')}</label>
                <InputTextarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', resize: 'none', borderRadius: '0.75rem' }}
                  autoResize
                />
              </div>
            </>
          )}
        </div>

        <div className="caisse-drawer-footer">
          <button
            className="caisse-action-btn caisse-action-btn--pay"
            style={{
              width: '100%',
              height: '3rem',
              fontSize: '0.9375rem',
              borderRadius: '0.75rem',
            }}
            onClick={handleEdit}
            disabled={saving || !editAmount || editAmount <= 0}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </Sidebar>

      {/* ══════════════════════════════════════════════════════════
          PAYMENT HISTORY DRAWER
         ══════════════════════════════════════════════════════════ */}
      <Sidebar
        visible={historyDrawer}
        onHide={() => setHistoryDrawer(false)}
        position={language === 'ar' ? 'left' : 'right'}
        className="caisse-drawer"
        style={{ width: '28rem', maxWidth: '100vw' }}
        showCloseIcon={false}
        blockScroll
        pt={{
          header: { style: { display: 'none' } },
          content: {
            style: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        <div className="caisse-drawer-header">
          <div>
            <span className="caisse-drawer-header__title">
              <Clock
                style={{
                  width: '1rem',
                  height: '1rem',
                  display: 'inline',
                  verticalAlign: '-2px',
                  marginRight: '0.375rem',
                }}
              />
              {t('paymentHistory')}
            </span>
            {historyOrder && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                {historyOrder.customerName} —{' '}
                <span className="caisse-card__order-num" style={{ fontSize: '0.6875rem' }}>
                  {historyOrder.orderNumber}
                </span>
              </div>
            )}
          </div>
          <button className="caisse-drawer-header__close" onClick={() => setHistoryDrawer(false)}>
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        {/* Order totals summary inside history */}
        {historyOrder && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#fafaf9',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                }}
              >
                {t('orderTotal')}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                {formatAmount(historyOrder.total, 2)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                }}
              >
                {t('amountPaid')}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                {formatAmount(historyOrder.paidAmount, 2)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                }}
              >
                {t('remaining')}
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: historyOrder.remainingAmount > 0 ? '#dc2626' : '#10b981',
                }}
              >
                {formatAmount(historyOrder.remainingAmount, 2)}
              </div>
            </div>
          </div>
        )}

        <div className="caisse-drawer-body">
          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              {t('loading')}
            </div>
          ) : historyPayments.length === 0 ? (
            <EmptyState icon={Clock} title={t('noPaymentsYet') as string} compact />
          ) : (
            <div className="caisse-timeline">
              {historyPayments.map((p) => {
                const MethodIcon = PAYMENT_METHOD_ICONS[p.paymentType] || CircleDollarSign;
                return (
                  <div key={p.id} className="caisse-timeline-item">
                    <div className={`caisse-timeline-dot caisse-timeline-dot--${p.paymentType}`}>
                      <MethodIcon />
                    </div>
                    <div className="caisse-timeline-content">
                      <div className="caisse-timeline-amount">
                        +{formatAmount(p.amount, 2)}
                        {'\u00A0'}
                        {currency}
                      </div>
                      <div className="caisse-timeline-meta">
                        {ORDER_PAYMENT_TYPE_LABELS[p.paymentType]} · {fmtDatetime(p.dateCreated)}
                        {p.referenceNumber && <> · {p.referenceNumber}</>}
                      </div>
                      {p.notes && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            marginTop: '0.25rem',
                            fontStyle: 'italic',
                          }}
                        >
                          {p.notes}
                        </div>
                      )}
                    </div>
                    {historyOrder?.paymentStatus !== 'paid' && (
                      <div className="caisse-timeline-actions">
                        <button
                          className="caisse-timeline-action-btn"
                          onClick={() => openEditDrawer(p)}
                          title={t('editPayment')}
                        >
                          <Edit2 />
                        </button>
                        <button
                          className="caisse-timeline-action-btn caisse-timeline-action-btn--danger"
                          onClick={() => handleDeletePayment(p.id)}
                          title={t('deletePayment')}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add payment from history drawer */}
        {historyOrder && historyOrder.remainingAmount > 0 && (
          <div className="caisse-drawer-footer">
            <button
              className="caisse-action-btn caisse-action-btn--pay"
              style={{
                width: '100%',
                height: '2.75rem',
                fontSize: '0.875rem',
                borderRadius: '0.75rem',
              }}
              onClick={() => {
                setHistoryDrawer(false);
                const freshOrder = orders.find((o) => o.id === historyOrder.id);
                if (freshOrder) openPayDrawer(freshOrder);
              }}
            >
              <Plus />
              {t('addPayment')} — {formatAmount(historyOrder.remainingAmount, 2)}
              {'\u00A0'}
              {currency}
            </button>
          </div>
        )}
      </Sidebar>
    </AdminLayout>
  );
}
