import { AdminLayout } from '../components/AdminLayout';
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
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Sidebar } from 'primereact/sidebar';
import {
  orderPaymentsService,
  ORDER_PAYMENT_TYPE_LABELS,
  OrderPayment,
  ICaisseOrder,
  CaissePaymentStatus,
  OrderPaymentType,
} from '../modules/order-payments';
import { toastConfirm, toastError, toastSuccess } from '../services/toast.service';
import { formatAmount } from '@orderium/ui';

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
  const dt = new Date(d);
  return `${dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
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
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderPaymentsService.getCaisseSummary();
      setOrders(data);
    } catch {
      toastError(t('error'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    orderPaymentsService
      .getCaisseSummary(controller.signal)
      .then((data) => {
        if (!cancelled) setOrders(data);
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
  }, []);

  /* ─ Filtering ─ */
  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.paymentStatus !== statusFilter) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (o.orderNumber ?? '').toLowerCase().includes(s) ||
      (o.customerName ?? '').toLowerCase().includes(s)
    );
  });

  const counts = {
    all: orders.length,
    paid: orders.filter((o) => o.paymentStatus === 'paid').length,
    partial: orders.filter((o) => o.paymentStatus === 'partial').length,
    unpaid: orders.filter((o) => o.paymentStatus === 'unpaid').length,
  };

  const summaryDue = filtered.reduce((s, o) => s + o.total, 0);
  const summaryCollected = filtered.reduce((s, o) => s + o.paidAmount, 0);
  const summaryRemaining = filtered.reduce((s, o) => s + o.remainingAmount, 0);

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

        {/* ── Order Cards Grid ── */}
        {loading ? (
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
          <div className="caisse-grid">
            {filtered.map((order) => {
              const pct =
                order.total > 0 ? Math.min((order.paidAmount / order.total) * 100, 100) : 0;
              const st = order.paymentStatus;

              return (
                <div key={order.id} className={`caisse-card caisse-card--${st}`}>
                  {/* Progress bar */}
                  <div className="caisse-progress">
                    <div
                      className={`caisse-progress__fill caisse-progress__fill--${st}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Header */}
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

                  {/* Amounts */}
                  <div className="caisse-card__amounts">
                    <div className="caisse-card__amount-item">
                      <span className="caisse-card__amount-label">{t('orderTotal')}</span>
                      <span className="caisse-card__amount-value caisse-card__amount-value--total">
                        {formatAmount(order.total, 2)}{' '}
                        <span className="caisse-card__amount-currency">{currency}</span>
                      </span>
                    </div>
                    <div className="caisse-card__amount-item">
                      <span className="caisse-card__amount-label">{t('amountPaid')}</span>
                      <span className="caisse-card__amount-value caisse-card__amount-value--paid">
                        {formatAmount(order.paidAmount, 2)}{' '}
                        <span className="caisse-card__amount-currency">{currency}</span>
                      </span>
                    </div>
                    <div className="caisse-card__amount-item">
                      <span className="caisse-card__amount-label">{t('remaining')}</span>
                      <span
                        className={`caisse-card__amount-value ${
                          order.remainingAmount > 0
                            ? 'caisse-card__amount-value--remaining'
                            : 'caisse-card__amount-value--remaining-zero'
                        }`}
                      >
                        {formatAmount(order.remainingAmount, 2)}{' '}
                        <span className="caisse-card__amount-currency">{currency}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
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
            })}
          </div>
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
                  <InputNumber
                    value={payAmount}
                    onValueChange={(e) => setPayAmount(e.value ?? 0)}
                    mode="decimal"
                    minFractionDigits={2}
                    maxFractionDigits={2}
                    min={0.01}
                    max={payOrder.remainingAmount > 0 ? payOrder.remainingAmount : undefined}
                    suffix={` ${currency}`}
                    style={{ width: '100%' }}
                    inputStyle={{ width: '100%' }}
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
                {payAmount > 0 ? `${formatAmount(payAmount, 2)} ${currency}` : ''}
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
                  <InputNumber
                    value={editAmount}
                    onValueChange={(e) => setEditAmount(e.value ?? 0)}
                    mode="decimal"
                    minFractionDigits={2}
                    maxFractionDigits={2}
                    min={0.01}
                    suffix={` ${currency}`}
                    style={{ width: '100%' }}
                    inputStyle={{ width: '100%' }}
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
                        +{formatAmount(p.amount, 2)} {currency}
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
              {t('addPayment')} — {formatAmount(historyOrder.remainingAmount, 2)} {currency}
            </button>
          </div>
        )}
      </Sidebar>
    </AdminLayout>
  );
}
