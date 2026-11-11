import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';
import { DecimalInput, formatAmount, formatQuantity } from '@orderium/ui';
import { ordersService } from '../modules/orders';
import { orderPaymentsService, ORDER_PAYMENT_TYPE_LABELS } from '../modules';
import type { IOrderPayment } from '../modules';
import { productsService } from '../modules/products';
import { pdfService } from '../services/pdf.service';
import { PDFPreviewModal, prefetchPDF } from '../components/PDFPreviewModal';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar as PrimeCalendar } from 'primereact/calendar';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { AutoCompleteSelect } from '../components/ui/AutoCompleteSelect';
import { RefLink } from '../components/ui/RefLink';
import { entityRoutes } from '../lib/entityRoutes';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { OrderStatusBanner } from '../components/order-detail/OrderStatusBanner';
import { OrderMoneySummary } from '../components/order-detail/OrderMoneySummary';
import { getOrderStage, toWhatsAppNumber } from '../components/order-detail/orderStage';
import '../components/order-detail/order-detail.css';
import {
  ArrowLeft,
  Banknote,
  Package,
  PackageCheck,
  Phone,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Printer,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  XCircle,
  User,
  Receipt,
  Truck,
  Calendar,
  Home,
  RefreshCw,
  StickyNote,
  Wallet,
} from 'lucide-react';

/** Statuses a user can set by hand on POS orders (mirrors the API's POS_SETTABLE_STATUSES). */
const POS_STATUS_OPTIONS: { value: string; labelKey: TranslationKey; Icon: typeof Check }[] = [
  { value: 'confirmed', labelKey: 'confirmed', Icon: Check },
  { value: 'picked_up', labelKey: 'pickedUp', Icon: PackageCheck },
  { value: 'delivered', labelKey: 'delivered', Icon: Home },
  { value: 'cancelled', labelKey: 'cancelled', Icon: XCircle },
];

/** 'yyyy-MM-dd' → local Date (no timezone shift). */
function isoToLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Local Date → 'yyyy-MM-dd' (built from local parts, not toISOString). */
function localDateToIso(d: Date | null | undefined): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/** "Appeler" + "WhatsApp" — the two ways shop owners actually reach people. */
function ContactButtons({ phone, t }: { phone: string; t: (k: TranslationKey) => string }) {
  const wa = toWhatsAppNumber(phone);
  return (
    <div className="od-duo">
      <a className="od-btn" href={`tel:${phone}`}>
        <Phone aria-hidden="true" />
        {t('odCall')}
      </a>
      {wa && (
        <a
          className="od-btn od-btn--wa"
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle aria-hidden="true" />
          {t('odWhatsapp')}
        </a>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { goBack } = useBackNavigation('/orders');
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const isAr = language?.startsWith('ar');

  // ── Data fetching ──────────────────────────────────────────
  const { data: orderWithDetails, isLoading } = useQuery({
    queryKey: ['orderDetails', Number(id)],
    queryFn: () => ordersService.getById(Number(id)),
    enabled: !!id,
    retry: (failureCount, error) => {
      if ((error as any)?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const order = orderWithDetails?.order;

  const { data: payments = [] } = useQuery({
    queryKey: ['orderPayments', Number(id)],
    queryFn: () => orderPaymentsService.getByOrder(Number(id)),
    enabled: !!id,
  });

  // ── Lifecycle actions ──────────────────────────────────────
  // draft → validate() → in_progress → (delivery) confirmed/picked_up → deliver() → delivered
  const lifecycleMutation = useMutation({
    mutationFn: (action: 'validate' | 'deliver' | 'pickUp' | 'cancel') => {
      switch (action) {
        case 'validate':
          return ordersService.validate(Number(id));
        case 'deliver':
          return ordersService.deliver(Number(id));
        case 'pickUp':
          return ordersService.changeStatus(Number(id), 'picked_up');
        default:
          return ordersService.cancel(Number(id));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetails', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
    },
    onError: (e: Error) => toastError(e.message),
  });

  // POS orders: any status can be set by hand, even once paid or delivered
  const posStatusMutation = useMutation({
    mutationFn: (status: string) => ordersService.changeStatus(Number(id), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetails', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
    },
    onError: (e: Error) => toastError(e.message),
  });

  // ── Items edit mode ────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState<{
    description: string;
    quantity: string;
    unitPrice: string;
    productId?: number;
  } | null>(null);
  const [productSuggestions, setProductSuggestions] = useState<
    { id: number; name: string; price: number }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateItemsMutation = useMutation({
    mutationFn: (data: any) => ordersService.updateValidated(Number(id), data),
    onSuccess: async () => {
      toastSuccess(t('orderUpdated') || 'Commande mise à jour');
      // Await the refetch so fresh items are in cache before we exit edit mode.
      // Without this, cancelEditMode() would switch computedItems back to the
      // stale cache and the UI would briefly show the old qty/prices.
      await queryClient.invalidateQueries({ queryKey: ['orderDetails', Number(id)] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      cancelEditMode();
    },
    onError: (e: Error) => toastError(e.message),
  });

  const items: any[] = orderWithDetails?.items ?? [];
  const globalDiscount = order?.discount ?? 0;

  const computedItems = editMode ? editItems : items;
  const computedSubtotal = editMode
    ? editItems.reduce(
        (s: number, i: any) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
        0,
      )
    : (order?.subtotal ?? order?.total ?? 0);
  const computedTotal = editMode
    ? Math.max(0, computedSubtotal - globalDiscount)
    : (order?.total ?? 0);

  const enterEditMode = () => {
    setEditItems(
      items.map((i: any) => ({
        ...i,
        quantity: String(parseFloat(i.quantity || 0)),
        unitPrice: String(parseFloat(i.unitPrice || 0)),
      })),
    );
    setNewItem(null);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditItems([]);
    setNewItem(null);
    setProductSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIdx(null);
  };

  const handleSave = () => {
    const allItems = [
      ...editItems,
      ...(newItem && newItem.description
        ? [
            {
              description: newItem.description,
              quantity: newItem.quantity,
              unitPrice: newItem.unitPrice,
              productId: newItem.productId,
              discount: 0,
              discountType: 0,
              tax: 0,
            },
          ]
        : []),
    ];
    const mappedItems = allItems.map((item: any) => ({
      productId: item.productId || undefined,
      description: item.description || item.product?.name || '',
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
      discount: parseFloat(item.discount || 0),
      discountType: item.discountType || 0,
      tax: parseFloat(item.tax || 0),
      total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    }));
    const subtotal = mappedItems.reduce((s: number, i: any) => s + i.total, 0);
    const total = Math.max(0, subtotal - globalDiscount);
    updateItemsMutation.mutate({
      items: mappedItems,
      subtotal,
      total,
      discount: globalDiscount,
      discountType: order?.discountType ?? 0,
      tax: 0,
    });
  };

  // ── Payments ───────────────────────────────────────────────
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(localDateToIso(new Date()));
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [showPayForm, setShowPayForm] = useState(false);
  const paymentsRef = useRef<HTMLElement | null>(null);
  const paymentMenuRef = useRef<Menu>(null);
  const moreMenuRef = useRef<Menu>(null);
  const [menuPayment, setMenuPayment] = useState<IOrderPayment | null>(null);

  const createPaymentMutation = useMutation({
    mutationFn: () =>
      orderPaymentsService.create({
        orderId: Number(id),
        amount: paymentAmount,
        paymentDate,
        paymentType: paymentType as any,
        notes: paymentNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetails', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orderPayments', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setPaymentAmount(0);
      setPaymentNote('');
      setShowPayForm(false);
      toastSuccess(t('paymentAdded') || 'Paiement enregistré');
    },
    onError: (e: Error) => toastError(e.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => orderPaymentsService.delete(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetails', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orderPayments', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: Error) => toastError(e.message),
  });

  // ── PDF ────────────────────────────────────────────────────
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [regeneratingPdf, setRegeneratingPdf] = useState(false);

  const handlePrint = (type: 'receipt' | 'delivery-note') => {
    const url = pdfService.getPDFUrl(type, Number(id), 'preview', language);
    const label = pdfService.getDocumentLabel(type);
    setPdfUrl(url);
    setPdfTitle(`${label} ${order?.displayOrderNumber || ''}`.trim());
    setShowPDFPreview(true);
  };

  /**
   * Share the order's PDF through the native share sheet on mobile, falling
   * back to WhatsApp Web on desktop (files can't be attached via a wa.me URL).
   */
  const handleShare = async (type: 'receipt' | 'delivery-note') => {
    if (!id) return;
    const isReceipt = type === 'receipt';
    const orderRef = order?.displayOrderNumber || `#${id}`;
    const total = order?.total != null ? `${formatAmount(Number(order.total), 2)}\u00A0DH` : '';
    const message = isAr
      ? `مرحباً، يرجى الاطلاع على ${isReceipt ? 'إيصال' : 'وصل التسليم'} الخاص بطلبكم ${orderRef}${total ? ` بمبلغ ${total}` : ''}.`
      : `Bonjour, veuillez trouver ci-joint ${isReceipt ? 'le reçu' : 'le bon de livraison'} de votre commande ${orderRef}${total ? ` d'un montant de ${total}` : ''}.`;

    try {
      const token = localStorage.getItem('adminToken');
      const tenantMatch = window.location.hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
      const tenantId = tenantMatch
        ? tenantMatch[1].replace(/-(admin|app|delivery)$/i, '').toLowerCase()
        : null;
      const response = await fetch(pdfService.getPDFUrl(type, Number(id), 'download', language), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        },
      });
      if (!response.ok) throw new Error(`${response.status}`);
      const blob = await response.blob();
      const fileName = `${isReceipt ? 'Recu' : 'BonLivraison'}_${orderRef.replace(/[^\w-]/g, '')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName, text: message });
        return;
      }

      const phone = toWhatsAppNumber(order?.customerPhone);
      if (phone) {
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer',
        );
      } else {
        toastError(
          isAr ? 'لا يوجد رقم هاتف لهذا الزبون.' : 'Aucun numéro de téléphone pour ce client.',
        );
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        toastError(isAr ? 'خطأ أثناء توليد PDF' : 'Erreur lors de la génération du PDF');
      }
    }
  };

  // Pre-warm blob cache as soon as the order page loads
  useEffect(() => {
    if (!id) return;
    prefetchPDF(pdfService.getPDFUrl('receipt', Number(id), 'preview', language));
    prefetchPDF(pdfService.getPDFUrl('delivery-note', Number(id), 'preview', language));
  }, [id, language]);

  const handleRegeneratePdf = async () => {
    if (!id) return;
    try {
      setRegeneratingPdf(true);
      await pdfService.regeneratePdf('delivery-note', Number(id));
      toastSuccess(isAr ? 'تم إعادة توليد PDF بنجاح' : 'PDF régénéré avec succès');
    } catch (error) {
      console.error('Error regenerating PDF:', error);
      toastError(isAr ? 'خطأ أثناء إعادة توليد PDF' : 'Erreur lors de la génération du PDF');
    } finally {
      setRegeneratingPdf(false);
    }
  };

  // ── Loading / error ────────────────────────────────────────
  if (isLoading) {
    return (
      <AdminLayout>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '20rem',
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              borderBottom: '2px solid #235ae4',
            }}
            className="animate-spin"
          />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Package
            style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#cbd5e1' }}
          />
          <p>{t('orderNotFound') || 'Commande introuvable'}</p>
          <Button label={t('back') || 'Retour'} onClick={goBack} style={{ marginTop: '1rem' }} />
        </div>
      </AdminLayout>
    );
  }

  const status: string = order.status || 'draft';
  /** POS-issued order (admin till or customer portal) — prints a receipt, not just a BL. */
  const isPosOrder = order.originType === 'CLIENT_POS' || order.originType === 'ADMIN_POS';
  /** POS orders stay editable after payment/delivery; only cancelled/invoiced ones are locked. */
  const isPosLocked = ['invoiced', 'cancelled', 'canceled'].includes(status);
  const isEditable = isPosOrder
    ? !isPosLocked
    : !['delivered', 'invoiced', 'cancelled', 'canceled'].includes(status);

  const orderDate = new Date(order.date || order.dateCreated);
  const formattedDate = orderDate.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const paidAmount = payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, (order?.total ?? 0) - paidAmount);

  /** Payment method in words ("Espèces"), never the raw value ("cash"). */
  const paymentTypeLabel = (value: string) => {
    const key = `odPay_${value}` as TranslationKey;
    const label = t(key);
    return label === key
      ? (ORDER_PAYMENT_TYPE_LABELS as Record<string, string>)[value] || value
      : label;
  };
  const paymentTypeOptions = Object.keys(ORDER_PAYMENT_TYPE_LABELS).map((value) => ({
    value,
    label: paymentTypeLabel(value),
  }));

  /** "8 sept. 2026" — plain-date strings are read as local dates so they don't shift a day. */
  const formatDay = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  };

  const stage = getOrderStage(status, order.deliveryStatus, remainingAmount);

  const openPaymentForm = () => {
    setPaymentAmount(Math.round(remainingAmount * 100) / 100);
    setShowPayForm(true);
    requestAnimationFrame(() =>
      paymentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  };

  const runLifecycle = (
    action: 'validate' | 'deliver' | 'pickUp' | 'cancel',
    question: string,
    confirmLabel: string,
  ) =>
    toastConfirm(question, () => lifecycleMutation.mutate(action), {
      confirmLabel,
      ...(action === 'cancel' ? { variant: 'destructive' as const } : {}),
    });

  // The single "next thing to do" for this order.
  let primaryAction: ReactNode = null;
  if (!editMode) {
    const busy = lifecycleMutation.isPending;
    if (stage === 'draft') {
      primaryAction = (
        <button
          type="button"
          className="od-primary"
          disabled={busy}
          onClick={() => runLifecycle('validate', t('odValidateConfirm'), t('odActionValidate'))}
        >
          <Check aria-hidden="true" />
          {t('odActionValidate')}
        </button>
      );
    } else if (stage === 'ready' || stage === 'delivering') {
      primaryAction = (
        <button
          type="button"
          className="od-primary"
          disabled={busy}
          onClick={() => runLifecycle('deliver', t('odDeliverConfirm'), t('odActionDeliver'))}
        >
          <Home aria-hidden="true" />
          {t('odActionDeliver')}
        </button>
      );
    } else if (stage === 'deliveredUnpaid') {
      primaryAction = (
        <button type="button" className="od-primary" onClick={openPaymentForm}>
          <Plus aria-hidden="true" />
          {t('addPayment')}
        </button>
      );
    } else if (stage === 'done' || stage === 'invoiced') {
      primaryAction = (
        <button
          type="button"
          className="od-primary od-primary--wa"
          onClick={() => handleShare(isPosOrder ? 'receipt' : 'delivery-note')}
        >
          <MessageCircle aria-hidden="true" />
          {isPosOrder ? t('odActionSendReceipt') : t('odActionSendNote')}
        </button>
      );
    }
  }

  // Rare actions live in the "Plus" menu so they can't be tapped by mistake.
  const posStatusItems: MenuItem[] =
    isPosOrder && !isPosLocked
      ? POS_STATUS_OPTIONS.filter((o) => o.value !== status).map((o) => ({
          label: t('odStatusMenu').replace('{status}', t(o.labelKey)),
          icon: <o.Icon size={16} style={{ marginInlineEnd: '0.5rem' }} />,
          disabled: posStatusMutation.isPending,
          ...(o.value === 'cancelled' ? { style: { color: 'var(--status-unpaid)' } } : {}),
          command: () =>
            o.value === 'cancelled'
              ? toastConfirm(t('odCancelConfirm'), () => posStatusMutation.mutate(o.value), {
                  confirmLabel: t('odCancelOrder'),
                  variant: 'destructive' as const,
                })
              : posStatusMutation.mutate(o.value),
        }))
      : [];

  const moreMenuItems: MenuItem[] = [
    ...posStatusItems,
    ...(status === 'confirmed' && !isPosOrder
      ? [
          {
            label: t('odMarkPickedUp'),
            icon: <PackageCheck size={16} style={{ marginInlineEnd: '0.5rem' }} />,
            command: () => lifecycleMutation.mutate('pickUp'),
          },
        ]
      : []),
    ...(order.isValidated
      ? [
          {
            label: t('odRegeneratePdf'),
            icon: <RefreshCw size={16} style={{ marginInlineEnd: '0.5rem' }} />,
            disabled: regeneratingPdf,
            command: handleRegeneratePdf,
          },
        ]
      : []),
    ...(!isPosOrder && !['delivered', 'invoiced', 'cancelled', 'canceled'].includes(status)
      ? [
          {
            label: t('odCancelOrder'),
            icon: <XCircle size={16} style={{ marginInlineEnd: '0.5rem' }} />,
            style: { color: 'var(--status-unpaid)' },
            command: () => runLifecycle('cancel', t('odCancelConfirm'), t('odCancelOrder')),
          },
        ]
      : []),
  ];

  const paymentMenuItems: MenuItem[] = [
    {
      label: t('odDeletePayment'),
      icon: <Trash2 size={16} style={{ marginInlineEnd: '0.5rem' }} />,
      style: { color: 'var(--status-unpaid)' },
      command: () => {
        const p = menuPayment;
        if (!p) return;
        toastConfirm(
          t('odDeletePaymentConfirm').replace(
            '{amount}',
            `${formatAmount(p.amount, 2)}\u00A0${t('currency')}`,
          ),
          () => deletePaymentMutation.mutate(p.id),
          { variant: 'destructive', confirmLabel: t('delete') },
        );
      },
    },
  ];

  return (
    <AdminLayout>
      {/* Edit-mode item rows only — the read-only layout lives in order-detail.css */}
      <style>{`
        .ord-items-thead {
          display: grid;
          grid-template-columns: 3fr 1fr 1fr 1fr;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .ord-item-row {
          display: grid;
          grid-template-columns: 3fr 1fr 1fr 1fr;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          transition: background 0.5s;
        }
        .ord-item-row > * { min-width: 0; }
        /* Edit-mode inputs — large, readable, finger-sized (44px) */
        .ord-item-name-input,
        .ord-item-qty-input,
        .ord-item-price-input {
          height: 2.75rem;
          padding: 0 0.75rem;
          border-radius: 0.625rem;
          font-size: 1.0625rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: #0f172a;
          background: #fff;
          border: 1.5px solid #cbd5e1;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ord-item-qty-input {
          width: 5.5rem;
          text-align: center;
          font-weight: 700;
          color: #92400e;
          background: #fffbeb;
          border-color: #fcd34d;
        }
        .ord-item-price-input { width: 7.5rem; text-align: end; }
        .ord-item-name-input { width: 100%; font-weight: 500; }
        .ord-item-qty-input:hover,
        .ord-item-price-input:hover { border-color: #94a3b8; }
        .ord-item-qty-input:hover { border-color: #f59e0b; }
        .ord-item-name-input:focus,
        .ord-item-qty-input:focus,
        .ord-item-price-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }
        .ord-item-delete-btn,
        .ord-item-icon-btn {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 0.625rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          justify-self: end;
        }
        .ord-item-delete-btn:hover { background: #fee2e2; }
        .ord-item-icon-btn--ok { background: #dcfce7; border-color: #86efac; color: #16a34a; }
        .ord-item-icon-btn--ok:hover { background: #bbf7d0; }
        .ord-item-icon-btn--muted { background: #f1f5f9; border-color: #e2e8f0; color: #64748b; }
        .ord-item-icon-btn--muted:hover { background: #e2e8f0; }
        .ord-new-item-inputs { display: contents; }
        .ord-new-item-btns   { display: contents; }
        @media (max-width: 767px) {
          .ord-items-thead { display: none !important; }
          .ord-item-row {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 0.375rem 0.75rem !important;
            align-items: center !important;
            padding: 0.875rem 1rem !important;
          }
          .ord-item-row > *:first-child { flex: 0 0 100%; margin-bottom: 0.125rem; }
          .ord-item-qty-input { flex: 0 0 6rem !important; width: 6rem !important; }
          .ord-item-price-input { flex: 1 1 8rem !important; width: auto !important; min-width: 0 !important; }
          .ord-item-delete-btn { margin-inline-start: auto !important; }
          .ord-new-item-row { flex-direction: column !important; align-items: stretch !important; gap: 0.625rem !important; }
          .ord-new-item-row > *:first-child { width: 100%; }
          .ord-new-item-inputs { display: flex !important; gap: 0.5rem; }
          .ord-new-item-inputs > input:last-child { flex: 1; width: auto !important; }
          .ord-new-item-btns { display: flex !important; gap: 0.5rem; justify-content: flex-end; }
        }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0 3rem' }}>
        <PageHeader
          title={order.displayOrderNumber}
          crumbs={[{ label: t('orders'), to: '/orders' }]}
          backButton={
            <Button
              className="page-header__back"
              icon={<ArrowLeft size={18} className="od-flip" aria-hidden="true" />}
              onClick={goBack}
              aria-label={t('orders')}
            />
          }
          actions={
            <>
              <span className="page-header__badge">
                <Calendar aria-hidden="true" />
                {formattedDate}
              </span>
              {isPosOrder && (
                <span className="page-header__badge">
                  <Receipt aria-hidden="true" />
                  {t('odPosSale')}
                </span>
              )}
              {order.convertedToInvoiceId && (
                <RefLink
                  className="page-header__badge"
                  to={entityRoutes.invoice(
                    order.convertedToInvoiceId,
                    order.direction === 'ACHAT' ? 'achat' : 'vente',
                  )}
                  fromLabel={order.displayOrderNumber}
                >
                  {t('invoice')}
                </RefLink>
              )}
              {moreMenuItems.length > 0 && (
                <>
                  <Menu model={moreMenuItems} popup ref={moreMenuRef} popupAlignment="right" />
                  <button
                    type="button"
                    className="od-btn od-btn--sm"
                    onClick={(e) => moreMenuRef.current?.toggle(e)}
                    aria-haspopup="menu"
                  >
                    <MoreVertical aria-hidden="true" />
                    {t('odMore')}
                  </button>
                </>
              )}
            </>
          }
        />

        <div className="od-page">
          <OrderStatusBanner
            stage={stage}
            remainingAmount={remainingAmount}
            remainingLabel={`${formatAmount(remainingAmount, 2)}\u00A0${t('currency')}`}
            action={primaryAction}
          />

          <OrderMoneySummary
            total={computedTotal}
            paid={paidAmount}
            remaining={remainingAmount}
            neutral={stage === 'draft' || stage === 'cancelled'}
          />

          <div className="od-grid">
            {/* ═══ LEFT COLUMN ═══════════════════════════════ */}
            <div className="od-col">
              {order.notes && (
                <div className="od-note">
                  <b>
                    <StickyNote aria-hidden="true" />
                    {t('odClientNote')}
                  </b>
                  <span>{order.notes}</span>
                </div>
              )}

              {/* Products, read like a paper receipt */}
              <section className="od-card">
                <div className="od-card__head">
                  <span className="od-ico" aria-hidden="true">
                    <Package />
                  </span>
                  <h3>{t('orderItems')}</h3>
                  <span className="od-card__count">
                    {t('odProductsCount').replace('{n}', String(computedItems.length))}
                  </span>
                  <div className="od-card__head-actions">
                    {editMode ? (
                      <>
                        <button
                          type="button"
                          className="od-btn od-btn--sm"
                          onClick={() =>
                            setNewItem({ description: '', quantity: '1', unitPrice: '0' })
                          }
                        >
                          <Plus aria-hidden="true" />
                          {isAr ? 'إضافة' : 'Ajouter'}
                        </button>
                        <button
                          type="button"
                          className="od-btn od-btn--sm"
                          onClick={cancelEditMode}
                        >
                          <X aria-hidden="true" />
                          {isAr ? 'إلغاء' : 'Annuler'}
                        </button>
                        <button
                          type="button"
                          className="od-primary"
                          style={{
                            minHeight: '2.75rem',
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem',
                          }}
                          onClick={handleSave}
                          disabled={updateItemsMutation.isPending}
                        >
                          <Check aria-hidden="true" />
                          {isAr ? 'حفظ' : 'Enregistrer'}
                        </button>
                      </>
                    ) : (
                      isEditable && (
                        <button type="button" className="od-btn od-btn--sm" onClick={enterEditMode}>
                          <Pencil aria-hidden="true" />
                          {isAr ? 'تعديل' : 'Modifier'}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="ord-items-thead">
                    {[
                      isAr ? 'المنتج' : 'Produit',
                      isAr ? 'الكمية' : 'Qté',
                      isAr ? 'السعر' : 'Prix unit.',
                      '',
                    ].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {computedItems.length === 0 && !newItem ? (
                  <div className="od-empty">
                    <Package aria-hidden="true" />
                    {t('odNoProducts')}
                  </div>
                ) : (
                  <div>
                    {computedItems.map((item: any, idx: number) => {
                      const qty = parseFloat(item.quantity || 0);
                      const unitPrice = parseFloat(item.unitPrice || 0);
                      const disc = parseFloat(item.discount || 0);
                      const lineTotal = editMode ? qty * unitPrice : parseFloat(item.total || 0);
                      const name = item.description || item.product?.name || `#${item.productId}`;

                      return (
                        <div
                          key={idx}
                          ref={(el) => {
                            itemRowRefs.current[idx] = el;
                          }}
                          className={editMode ? 'ord-item-row' : 'od-line'}
                          style={
                            editMode
                              ? {
                                  borderBottom:
                                    idx < computedItems.length - 1 ? '1px solid #e2e8f0' : 'none',
                                  background: highlightedIdx === idx ? '#fef9c3' : 'transparent',
                                }
                              : undefined
                          }
                        >
                          {editMode ? (
                            <>
                              {/* Name */}
                              <div style={{ paddingInlineEnd: '0.5rem' }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: '#0f172a',
                                  }}
                                >
                                  {name}
                                </p>
                              </div>
                              {/* Qty */}
                              <DecimalInput
                                min={0}
                                value={item.quantity === '' ? null : parseFloat(item.quantity)}
                                onValueChange={(v) =>
                                  setEditItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? { ...it, quantity: v == null ? '' : String(v) }
                                        : it,
                                    ),
                                  )
                                }
                                className="ord-item-qty-input"
                                aria-label={isAr ? 'الكمية' : 'Quantité'}
                              />
                              {/* Unit price */}
                              <DecimalInput
                                min={0}
                                value={item.unitPrice === '' ? null : parseFloat(item.unitPrice)}
                                onValueChange={(v) =>
                                  setEditItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? { ...it, unitPrice: v == null ? '' : String(v) }
                                        : it,
                                    ),
                                  )
                                }
                                className="ord-item-price-input"
                                aria-label={isAr ? 'السعر' : 'Prix unitaire'}
                              />
                              {/* Delete */}
                              <button
                                type="button"
                                className="ord-item-delete-btn"
                                aria-label={isAr ? 'حذف' : 'Supprimer'}
                                onClick={() =>
                                  setEditItems((prev) => prev.filter((_, i) => i !== idx))
                                }
                              >
                                <Trash2 style={{ width: '1.125rem', height: '1.125rem' }} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="od-line__thumb" aria-hidden="true">
                                <Package />
                              </span>
                              <div className="od-line__what">
                                <span className="od-line__name">
                                  <RefLink
                                    to={
                                      item.productId ? entityRoutes.product(item.productId) : null
                                    }
                                    fromLabel={order.displayOrderNumber}
                                  >
                                    {name}
                                  </RefLink>
                                </span>
                                <span className="od-line__calc">
                                  <span className="od-qty">{formatQuantity(qty, 2)}</span>×{' '}
                                  {formatAmount(unitPrice, 2)}
                                  {'\u00A0'}
                                  {t('currency')}
                                </span>
                                {disc > 0 && (
                                  <span className="od-line__discount">
                                    {t('discount')} − {formatAmount(disc, 2)}
                                  </span>
                                )}
                              </div>
                              <span className="od-line__sum">
                                {formatAmount(lineTotal, 2)}
                                {'\u00A0'}
                                {t('currency')}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* New item row */}
                    {editMode && newItem !== null && (
                      <div
                        className="ord-new-item-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          background: '#f0fdf4',
                          borderTop: '1px solid #bbf7d0',
                        }}
                      >
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type="text"
                            placeholder={isAr ? 'ابحث عن مقال...' : 'Rechercher un produit...'}
                            value={newItem.description}
                            autoFocus
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewItem((prev) =>
                                prev ? { ...prev, description: val, productId: undefined } : null,
                              );
                              if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                              if (val.trim().length < 1) {
                                setProductSuggestions([]);
                                setShowSuggestions(false);
                                return;
                              }
                              searchTimerRef.current = setTimeout(async () => {
                                try {
                                  const res = await productsService.getProducts({
                                    search: val,
                                    limit: 10,
                                  });
                                  setProductSuggestions(
                                    res.products.map((p) => ({
                                      id: p.id,
                                      name: p.name,
                                      price: p.price,
                                    })),
                                  );
                                  setShowSuggestions(true);
                                } catch {
                                  setProductSuggestions([]);
                                  setShowSuggestions(false);
                                }
                              }, 280);
                            }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            onFocus={() => {
                              if (productSuggestions.length > 0) setShowSuggestions(true);
                            }}
                            className="ord-item-name-input"
                          />
                          {showSuggestions && productSuggestions.length > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '3.25rem',
                                left: 0,
                                right: 0,
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.5rem',
                                boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
                                zIndex: 50,
                                maxHeight: '12rem',
                                overflowY: 'auto',
                              }}
                            >
                              {productSuggestions.map((p) => (
                                <div
                                  key={p.id}
                                  onMouseDown={() => {
                                    const existingIndex = editItems.findIndex(
                                      (ei) => ei.productId === p.id,
                                    );
                                    if (existingIndex !== -1) {
                                      setShowSuggestions(false);
                                      setProductSuggestions([]);
                                      setNewItem(null);
                                      setHighlightedIdx(existingIndex);
                                      setTimeout(() => {
                                        itemRowRefs.current[existingIndex]?.scrollIntoView({
                                          behavior: 'smooth',
                                          block: 'nearest',
                                        });
                                      }, 50);
                                      setTimeout(() => setHighlightedIdx(null), 2000);
                                    } else {
                                      setNewItem((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              description: p.name,
                                              unitPrice: String(p.price),
                                              productId: p.id,
                                            }
                                          : null,
                                      );
                                      setShowSuggestions(false);
                                      setProductSuggestions([]);
                                    }
                                  }}
                                  style={{
                                    padding: '0.75rem 0.875rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    fontSize: '0.9375rem',
                                    borderBottom: '1px solid #f1f5f9',
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = '#f0fdf4')
                                  }
                                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                                >
                                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                                  <span
                                    style={{
                                      color: '#64748b',
                                      fontSize: '0.875rem',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {formatAmount(p.price, 2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="ord-new-item-inputs">
                          <DecimalInput
                            min={0}
                            placeholder="Qté"
                            value={newItem.quantity === '' ? null : parseFloat(newItem.quantity)}
                            onValueChange={(v) =>
                              setNewItem((prev) =>
                                prev ? { ...prev, quantity: v == null ? '' : String(v) } : null,
                              )
                            }
                            className="ord-item-qty-input"
                            aria-label={isAr ? 'الكمية' : 'Quantité'}
                          />
                          <DecimalInput
                            min={0}
                            placeholder="PU"
                            value={newItem.unitPrice === '' ? null : parseFloat(newItem.unitPrice)}
                            onValueChange={(v) =>
                              setNewItem((prev) =>
                                prev ? { ...prev, unitPrice: v == null ? '' : String(v) } : null,
                              )
                            }
                            className="ord-item-price-input"
                            aria-label={isAr ? 'السعر' : 'Prix unitaire'}
                          />
                        </div>
                        <div className="ord-new-item-btns">
                          <button
                            type="button"
                            onClick={() => {
                              if (newItem.description && parseFloat(newItem.quantity) > 0) {
                                setEditItems((prev) => [
                                  ...prev,
                                  {
                                    description: newItem.description,
                                    quantity: newItem.quantity,
                                    unitPrice: newItem.unitPrice,
                                    productId: newItem.productId,
                                    discount: 0,
                                    discountType: 0,
                                    tax: 0,
                                  },
                                ]);
                                setNewItem(null);
                                setProductSuggestions([]);
                              }
                            }}
                            className="ord-item-icon-btn ord-item-icon-btn--ok"
                            aria-label={isAr ? 'إضافة' : 'Ajouter'}
                          >
                            <Check style={{ width: '1.125rem', height: '1.125rem' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewItem(null);
                              setProductSuggestions([]);
                              setShowSuggestions(false);
                            }}
                            className="ord-item-icon-btn ord-item-icon-btn--muted"
                            aria-label={isAr ? 'إلغاء' : 'Annuler'}
                          >
                            <X style={{ width: '1.125rem', height: '1.125rem' }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="od-totals">
                  {globalDiscount > 0 && (
                    <div className="od-totals__row od-totals__row--discount">
                      <span>{t('discount')}</span>
                      <span>
                        − {formatAmount(globalDiscount, 2)}
                        {'\u00A0'}
                        {t('currency')}
                      </span>
                    </div>
                  )}
                  <div className="od-totals__row od-totals__row--grand">
                    <span>{t('odTotalToPay')}</span>
                    <span>
                      {formatAmount(computedTotal, 2)}
                      {'\u00A0'}
                      {t('currency')}
                    </span>
                  </div>
                </div>
              </section>

              {/* Payments: a dated list, delete hidden behind the ⋯ menu */}
              <section className="od-card" ref={paymentsRef}>
                <div className="od-card__head">
                  <span className="od-ico" aria-hidden="true">
                    <Banknote />
                  </span>
                  <h3>{t('odPaymentsReceived')}</h3>
                </div>

                {payments.length === 0 ? (
                  <div className="od-empty">
                    <Wallet aria-hidden="true" />
                    {t('odNoPayments')}
                  </div>
                ) : (
                  payments.map((p: any) => (
                    <div className="od-pay" key={p.id}>
                      <span className="od-pay__icon" aria-hidden="true">
                        <Banknote />
                      </span>
                      <div className="od-pay__what">
                        <span className="od-pay__amount">
                          {formatAmount(p.amount, 2)}
                          {'\u00A0'}
                          {t('currency')}
                        </span>
                        <span className="od-pay__meta">
                          {paymentTypeLabel(p.paymentType)} · {formatDay(p.paymentDate)}
                          {p.notes ? ` · ${p.notes}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="od-icon-btn"
                        aria-label={t('odMore')}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          setMenuPayment(p);
                          paymentMenuRef.current?.toggle(e);
                        }}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </button>
                    </div>
                  ))
                )}
                <Menu model={paymentMenuItems} popup ref={paymentMenuRef} popupAlignment="right" />

                {remainingAmount > 0 &&
                  stage !== 'cancelled' &&
                  (showPayForm ? (
                    <div className="od-pay-form">
                      <div className="od-pay-form__grid">
                        <div>
                          <label htmlFor="od-pay-amount">{t('amount')}</label>
                          <DecimalInput
                            id="od-pay-amount"
                            value={paymentAmount}
                            onValueChange={(v) => setPaymentAmount(v ?? 0)}
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            min={0}
                            suffix={t('currency')}
                            className="p-inputtext p-component"
                            style={{ width: '100%', fontSize: '1.0625rem', fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label htmlFor="od-pay-type">{t('paymentType')}</label>
                          <AutoCompleteSelect
                            inputId="od-pay-type"
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.value)}
                            options={paymentTypeOptions}
                            optionLabel="label"
                            optionValue="value"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label htmlFor="od-pay-date">{t('paymentDate')}</label>
                          <PrimeCalendar
                            inputId="od-pay-date"
                            dateFormat="dd/mm/yy"
                            value={isoToLocalDate(paymentDate)}
                            onChange={(e) => setPaymentDate(localDateToIso(e.value as Date | null))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label htmlFor="od-pay-note">{t('notes')}</label>
                          <InputText
                            id="od-pay-note"
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                            placeholder={t('optional')}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      <div className="od-pay-form__actions">
                        <button
                          type="button"
                          className="od-btn od-btn--ghost"
                          onClick={() => setShowPayForm(false)}
                        >
                          <X aria-hidden="true" />
                          {isAr ? 'إلغاء' : 'Annuler'}
                        </button>
                        <button
                          type="button"
                          className="od-primary"
                          onClick={() => createPaymentMutation.mutate()}
                          disabled={
                            createPaymentMutation.isPending || !paymentAmount || paymentAmount <= 0
                          }
                        >
                          <Check aria-hidden="true" />
                          {t('odSavePayment')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="od-add-pay" onClick={openPaymentForm}>
                      <Plus aria-hidden="true" />
                      {t('addPayment')}
                    </button>
                  ))}
              </section>
            </div>

            {/* ═══ RIGHT COLUMN ══════════════════════════════ */}
            <div className="od-col">
              {/* Client: call or WhatsApp in one tap */}
              <section className="od-card">
                <div className="od-card__head">
                  <span className="od-ico" aria-hidden="true">
                    <User />
                  </span>
                  <h3>{t('customer')}</h3>
                </div>
                <div className="od-person">
                  {order.customerName || order.customerPhone || order.customerAddress ? (
                    <>
                      <div className="od-who">
                        <span className="od-avatar" aria-hidden="true">
                          {initials(order.customerName)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <span className="od-who__name">
                            <RefLink
                              to={
                                order.customerId
                                  ? entityRoutes.customer(order.customerId)
                                  : order.supplierId
                                    ? entityRoutes.supplier(order.supplierId)
                                    : null
                              }
                              fromLabel={order.displayOrderNumber}
                            >
                              {order.customerName || '—'}
                            </RefLink>
                          </span>
                          {order.customerPhone && (
                            <span className="od-who__phone">{order.customerPhone}</span>
                          )}
                        </div>
                      </div>
                      {order.customerPhone && <ContactButtons phone={order.customerPhone} t={t} />}
                      {order.customerAddress && (
                        <div className="od-address">
                          <MapPin aria-hidden="true" />
                          {order.customerAddress}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>{t('odNoCustomer')}</span>
                  )}
                </div>
              </section>

              {order.deliveryPersonName && (
                <section className="od-card">
                  <div className="od-card__head">
                    <span className="od-ico" aria-hidden="true">
                      <Truck />
                    </span>
                    <h3>{t('deliveryPerson')}</h3>
                  </div>
                  <div className="od-person">
                    <div className="od-who">
                      <span className="od-avatar" aria-hidden="true">
                        {initials(order.deliveryPersonName)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <span className="od-who__name">{order.deliveryPersonName}</span>
                        {order.deliveryPersonPhone && (
                          <span className="od-who__phone">{order.deliveryPersonPhone}</span>
                        )}
                      </div>
                    </div>
                    {order.deliveryPersonPhone && (
                      <ContactButtons phone={order.deliveryPersonPhone} t={t} />
                    )}
                  </div>
                </section>
              )}

              {/* Documents: one row per document, two verbs */}
              <section className="od-card">
                <div className="od-card__head">
                  <span className="od-ico" aria-hidden="true">
                    <Printer />
                  </span>
                  <h3>{t('odDocuments')}</h3>
                </div>
                {isPosOrder && (
                  <div className="od-doc">
                    <span className="od-doc__name">
                      <Receipt aria-hidden="true" />
                      {t('odReceipt')}
                    </span>
                    <span className="od-doc__actions">
                      <button
                        type="button"
                        className="od-btn od-btn--sm"
                        onClick={() => handlePrint('receipt')}
                      >
                        <Printer aria-hidden="true" />
                        {t('odPrint')}
                      </button>
                      <button
                        type="button"
                        className="od-btn od-btn--sm od-btn--wa-text"
                        onClick={() => handleShare('receipt')}
                      >
                        <MessageCircle aria-hidden="true" />
                        {t('odSend')}
                      </button>
                    </span>
                  </div>
                )}
                <div className="od-doc">
                  <span className="od-doc__name">
                    <Truck aria-hidden="true" />
                    {t('odDeliveryNote')}
                  </span>
                  <span className="od-doc__actions">
                    <button
                      type="button"
                      className="od-btn od-btn--sm"
                      onClick={() => handlePrint('delivery-note')}
                    >
                      <Printer aria-hidden="true" />
                      {t('odPrint')}
                    </button>
                    <button
                      type="button"
                      className="od-btn od-btn--sm od-btn--wa-text"
                      onClick={() => handleShare('delivery-note')}
                    >
                      <MessageCircle aria-hidden="true" />
                      {t('odSend')}
                    </button>
                  </span>
                </div>
              </section>

              <div className="od-meta">
                <div>
                  <span>{t('odCreatedOn')}</span>
                  <span>{formatDay(order.dateCreated)}</span>
                </div>
                <div>
                  <span>{t('odUpdatedOn')}</span>
                  <span>{formatDay(order.dateUpdated)}</span>
                </div>
                {order.deliveryStatus && (
                  <div>
                    <span>{t('deliveryStatus')}</span>
                    <span>
                      {t(
                        ((
                          {
                            pending: 'pending',
                            assigned: 'assigned',
                            confirmed: 'confirmed',
                            picked_up: 'pickedUp',
                            to_delivery: 'toDelivery',
                            in_delivery: 'inDelivery',
                            delivered: 'delivered',
                            canceled: 'canceled',
                          } as Record<string, string>
                        )[order.deliveryStatus] || order.deliveryStatus) as TranslationKey,
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* ═══ END GRID ══════════════════════════════════ */}
          </div>
        </div>
      </div>

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />
    </AdminLayout>
  );
}
