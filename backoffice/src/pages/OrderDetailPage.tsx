import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { formatAmount } from '@orderium/ui';
import { ordersService } from '../modules/orders';
import { orderPaymentsService, ORDER_PAYMENT_TYPE_LABELS } from '../modules';
import { productsService } from '../modules/products';
import { pdfService } from '../services/pdf.service';
import { PDFPreviewModal } from '../components/PDFPreviewModal';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import {
  ArrowLeft,
  Package,
  Phone,
  MapPin,
  Printer,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  CreditCard,
  ChevronRight,
  Clock,
  User,
  Receipt,
  Truck,
  Calendar,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  string,
  { label_fr: string; label_ar: string; bg: string; color: string; border: string; icon: string }
> = {
  pending: {
    label_fr: 'En attente',
    label_ar: 'في الانتظار',
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
    icon: '⏳',
  },
  confirmed: {
    label_fr: 'Confirmé',
    label_ar: 'مؤكد',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
    icon: '✅',
  },
  in_progress: {
    label_fr: 'En cours',
    label_ar: 'قيد التنفيذ',
    bg: '#fffbeb',
    color: '#92400e',
    border: '#fde68a',
    icon: '⚙️',
  },
  picked_up: {
    label_fr: 'Récupéré',
    label_ar: 'تم الاستلام',
    bg: '#f5f3ff',
    color: '#6d28d9',
    border: '#ddd6fe',
    icon: '📦',
  },
  to_delivery: {
    label_fr: 'À livrer',
    label_ar: 'للتوصيل',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
    icon: '🚚',
  },
  in_delivery: {
    label_fr: 'En livraison',
    label_ar: 'في التوصيل',
    bg: '#ecfeff',
    color: '#0e7490',
    border: '#a5f3fc',
    icon: '🚴',
  },
  delivered: {
    label_fr: 'Livré',
    label_ar: 'تم التوصيل',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
    icon: '✔️',
  },
  cancelled: {
    label_fr: 'Annulé',
    label_ar: 'ملغى',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca',
    icon: '❌',
  },
  canceled: {
    label_fr: 'Annulé',
    label_ar: 'ملغى',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca',
    icon: '❌',
  },
};

const NEXT_ACTIONS: Record<
  string,
  { value: string; label_fr: string; label_ar: string; bg: string; color: string; border: string }[]
> = {
  pending: [
    {
      value: 'confirmed',
      label_fr: 'Confirmer',
      label_ar: 'تأكيد',
      bg: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
    },
    {
      value: 'cancelled',
      label_fr: 'Annuler',
      label_ar: 'إلغاء',
      bg: '#fef2f2',
      color: '#b91c1c',
      border: '#fecaca',
    },
  ],
  confirmed: [
    {
      value: 'picked_up',
      label_fr: 'Récupéré',
      label_ar: 'تم الاستلام',
      bg: '#f5f3ff',
      color: '#6d28d9',
      border: '#ddd6fe',
    },
    {
      value: 'delivered',
      label_fr: 'Livré',
      label_ar: 'تم التسليم',
      bg: '#ecfdf5',
      color: '#047857',
      border: '#a7f3d0',
    },
    {
      value: 'cancelled',
      label_fr: 'Annuler',
      label_ar: 'إلغاء',
      bg: '#fef2f2',
      color: '#b91c1c',
      border: '#fecaca',
    },
  ],
  picked_up: [
    {
      value: 'delivered',
      label_fr: 'Marquer livré',
      label_ar: 'تم التسليم',
      bg: '#ecfdf5',
      color: '#047857',
      border: '#a7f3d0',
    },
    {
      value: 'cancelled',
      label_fr: 'Annuler',
      label_ar: 'إلغاء',
      bg: '#fef2f2',
      color: '#b91c1c',
      border: '#fecaca',
    },
  ],
  in_delivery: [
    {
      value: 'delivered',
      label_fr: 'Marquer livré',
      label_ar: 'تم التسليم',
      bg: '#ecfdf5',
      color: '#047857',
      border: '#a7f3d0',
    },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['orderPayments', Number(id)],
    queryFn: () => orderPaymentsService.getByOrder(Number(id)),
    enabled: !!id,
  });

  // ── Status mutation ────────────────────────────────────────
  const changeStatusMutation = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetails', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('orderUpdated') || 'Commande mise à jour');
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
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');

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
    const url = pdfService.getPDFUrl(type, Number(id), 'preview');
    const label = pdfService.getDocumentLabel(type);
    setPdfUrl(url);
    setPdfTitle(`${label} ${order?.displayOrderNumber || ''}`.trim());
    setShowPDFPreview(true);
  };

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
          <Button
            label={t('back') || 'Retour'}
            onClick={() => navigate('/orders')}
            style={{ marginTop: '1rem' }}
          />
        </div>
      </AdminLayout>
    );
  }

  const status = order.status || 'pending';
  const statusCfg = STATUS_CFG[status] || STATUS_CFG.pending;
  const statusLabel = isAr ? statusCfg.label_ar : statusCfg.label_fr;
  const nextActions = NEXT_ACTIONS[status] || [];
  const isEditable = !['delivered', 'cancelled', 'canceled'].includes(status);

  const orderDate = new Date(order.date || order.dateCreated);
  const formattedDate = orderDate.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const paidAmount = payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, (order?.total ?? 0) - paidAmount);

  const paymentTypeOptions = Object.entries(ORDER_PAYMENT_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <AdminLayout>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ord-detail-grid {
          display: grid;
          grid-template-columns: 1fr 22rem;
          gap: 1.25rem;
          align-items: start;
        }
        .ord-items-thead {
          display: grid;
          grid-template-columns: 3fr 1fr 1fr 1fr;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .ord-item-row {
          display: grid;
          grid-template-columns: 3fr 1fr 1fr 1fr;
          align-items: center;
          padding: 0.625rem 1rem;
          transition: background 0.5s;
        }
        .ord-item-row > * { min-width: 0; }
        .ord-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ord-items-card-hdr { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .ord-items-card-hdr-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
        .ord-new-item-inputs { display: contents; }
        .ord-new-item-btns   { display: contents; }
        /* ── Document-style page header ── */
        .doc-detail-hdr { display: flex; align-items: center; gap: 0.875rem; flex-wrap: nowrap; position: relative; margin-bottom: 1.5rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.72); backdrop-filter: blur(8px); border-radius: 1rem; border: 1px solid rgba(226,232,240,0.6); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; }
        .doc-detail-hdr__icon { width: 3rem; height: 3rem; flex-shrink: 0; background: linear-gradient(135deg, #235ae4 0%, #818cf8 100%); border-radius: 0.875rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(35,90,228,0.35); }
        .doc-detail-hdr__body { flex: 1; min-width: 0; overflow: hidden; }
        .doc-detail-hdr__crumb { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.2rem; }
        .doc-detail-hdr__title { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .doc-detail-hdr__badges { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
        @media (max-width: 767px) {
          .ord-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .ord-items-card-hdr { flex-direction: column; align-items: stretch; gap: 0.5rem; }
          .ord-items-card-hdr-actions { flex-wrap: wrap; }
          .ord-items-thead {
            display: none !important;
          }
          .ord-item-row {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 0.375rem 0.75rem !important;
            align-items: center !important;
            padding: 0.875rem 1rem !important;
          }
          .ord-item-row > *:first-child {
            flex: 0 0 100%;
            margin-bottom: 0.125rem;
          }
          .ord-item-total {
            margin-inline-start: auto;
          }
          .ord-item-qty-input {
            flex: 0 0 5.5rem !important;
            width: 5.5rem !important;
          }
          .ord-item-price-input {
            flex: 0 0 8rem !important;
            width: 8rem !important;
            min-width: 0 !important;
          }
          .ord-item-delete-btn {
            margin-inline-start: auto !important;
          }
          .ord-new-item-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.625rem !important;
          }
          .ord-new-item-row > *:first-child {
            width: 100%;
          }
          .ord-new-item-inputs {
            display: flex !important;
            gap: 0.5rem;
          }
          .ord-new-item-inputs > input:last-child {
            flex: 1;
            width: auto !important;
          }
          .ord-new-item-btns {
            display: flex !important;
            gap: 0.5rem;
            justify-content: flex-end;
          }
          .ord-pay-progress-labels {
            flex-direction: column !important;
            gap: 0.25rem !important;
            align-items: flex-start !important;
          }
          /* header mobile overrides */
          .doc-detail-hdr { padding: 0.625rem 0.75rem; gap: 0.5rem; border-radius: 0.875rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
          .doc-detail-hdr__icon { display: none !important; }
          .doc-detail-hdr__title { display: none !important; }
          .doc-detail-hdr__crumb { margin-bottom: 0; }
          .doc-detail-hdr__badges { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 0.4375rem; width: 100%; }
          .doc-detail-hdr__badges::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0 3rem' }}>
        {/* ── Page Header ─────────────────────────────────── */}
        <div className="doc-detail-hdr">
          {/* Back button */}
          <Button
            icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
            onClick={() => navigate('/orders')}
            style={{
              width: '2.25rem',
              height: '2.25rem',
              flexShrink: 0,
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              color: '#64748b',
              borderRadius: '0.625rem',
              padding: 0,
            }}
          />
          {/* Icon box */}
          <div className="doc-detail-hdr__icon">
            <ShoppingBag style={{ width: '1.5rem', height: '1.5rem', color: '#fff' }} />
          </div>
          {/* Title + breadcrumb */}
          <div className="doc-detail-hdr__body">
            <div className="doc-detail-hdr__crumb">
              <span
                onClick={() => navigate('/orders')}
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  cursor: 'pointer',
                }}
              >
                {t('orders')}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>›</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#235ae4',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                {order.displayOrderNumber}
              </span>
            </div>
            <h1 className="doc-detail-hdr__title">
              <span style={{ color: '#235ae4' }}>{order.displayOrderNumber}</span>
            </h1>
          </div>
          {/* Badges */}
          <div className="doc-detail-hdr__badges">
            {/* Status badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4375rem',
                padding: '0.4375rem 0.875rem',
                borderRadius: '9999px',
                background: statusCfg.bg,
                border: `1.5px solid ${statusCfg.border}`,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '0.875rem', lineHeight: 1 }}>{statusCfg.icon}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: statusCfg.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {statusLabel}
              </span>
            </div>
            {/* Date badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4375rem',
                padding: '0.4375rem 0.875rem',
                borderRadius: '9999px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Calendar
                style={{ width: '0.75rem', height: '0.75rem', color: '#94a3b8', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.02em',
                }}
              >
                {formattedDate}
              </span>
            </div>
            {/* Print buttons */}
            <Button
              icon={<Receipt style={{ width: '0.875rem', height: '0.875rem' }} />}
              label={isAr ? 'وصل' : 'Reçu'}
              onClick={() => handlePrint('receipt')}
              outlined
              size="small"
              style={{ flexShrink: 0 }}
            />
            <Button
              icon={<Truck style={{ width: '0.875rem', height: '0.875rem' }} />}
              label={isAr ? 'بون التسليم' : 'Bon de livraison'}
              onClick={() => handlePrint('delivery-note')}
              outlined
              size="small"
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>

        {/* Status workflow chips */}
        {nextActions.length > 0 && (
          <div
            style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
          >
            {nextActions.map((action) => (
              <button
                key={action.value}
                type="button"
                onClick={() => {
                  const isDestructive = action.value === 'cancelled';
                  if (isDestructive) {
                    toastConfirm(
                      isAr ? action.label_ar : action.label_fr,
                      () => changeStatusMutation.mutate(action.value),
                      {
                        variant: 'destructive',
                        confirmLabel: isAr ? action.label_ar : action.label_fr,
                      },
                    );
                  } else {
                    changeStatusMutation.mutate(action.value);
                  }
                }}
                disabled={changeStatusMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.4rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1.5px solid ${action.border}`,
                  backgroundColor: action.bg,
                  color: action.color,
                  transition: 'opacity 0.15s',
                }}
              >
                <ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />
                {isAr ? action.label_ar : action.label_fr}
              </button>
            ))}
          </div>
        )}

        {/* ── Body grid ───────────────────────────────────── */}
        <div className="ord-detail-grid">
          {/* ═══ LEFT COLUMN ═══════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Note */}
            {order.notes && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  color: '#92400e',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>📝</span>
                <span>{order.notes}</span>
              </div>
            )}

            {/* Items card */}
            <div
              style={{
                background: '#fff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Items header */}
              <div className="ord-items-card-hdr">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Package style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    {t('orderItems')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      background: '#e2e8f0',
                      borderRadius: '9999px',
                      padding: '0.1rem 0.5rem',
                      fontWeight: 600,
                    }}
                  >
                    {computedItems.length}
                  </span>
                </div>
                <div className="ord-items-card-hdr-actions">
                  {editMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setNewItem({ description: '', quantity: '1', unitPrice: '0' })
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          background: '#eff6ff',
                          border: '1.5px solid #bfdbfe',
                          color: '#1d4ed8',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus style={{ width: '0.75rem', height: '0.75rem' }} />
                        {isAr ? 'إضافة' : 'Ajouter'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateItemsMutation.isPending}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          background: '#dcfce7',
                          border: '1.5px solid #86efac',
                          color: '#16a34a',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Check style={{ width: '0.75rem', height: '0.75rem' }} />
                        {isAr ? 'حفظ' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditMode}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          background: '#f1f5f9',
                          border: '1.5px solid #e2e8f0',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <X style={{ width: '0.75rem', height: '0.75rem' }} />
                        {isAr ? 'إلغاء' : 'Annuler'}
                      </button>
                    </>
                  ) : (
                    isEditable && (
                      <button
                        type="button"
                        onClick={enterEditMode}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          background: '#f8fafc',
                          border: '1.5px solid #e2e8f0',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil style={{ width: '0.75rem', height: '0.75rem' }} />
                        {isAr ? 'تعديل' : 'Modifier'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Items table header */}
              <div className="ord-items-thead">
                {[
                  isAr ? 'المقال' : 'Article',
                  isAr ? 'الكمية' : 'Qté',
                  isAr ? 'السعر' : 'Prix unit.',
                  isAr ? 'الإجمالي' : 'Total',
                ].map((h) => (
                  <span
                    key={h}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {computedItems.length === 0 && !newItem ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                  }}
                >
                  {isAr ? 'لا توجد مقالات' : 'Aucun article'}
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
                        className="ord-item-row"
                        style={{
                          borderBottom:
                            idx < computedItems.length - 1 ? '1px solid #e2e8f0' : 'none',
                          background: highlightedIdx === idx ? '#fef9c3' : 'transparent',
                        }}
                      >
                        {editMode ? (
                          <>
                            {/* Name */}
                            <div style={{ paddingInlineEnd: '0.5rem' }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                }}
                              >
                                {name}
                              </p>
                            </div>
                            {/* Qty */}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                setEditItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, quantity: e.target.value } : it,
                                  ),
                                )
                              }
                              className="ord-item-qty-input"
                              style={{
                                width: '4rem',
                                height: '2rem',
                                padding: '0 0.4rem',
                                borderRadius: '0.375rem',
                                border: '1.5px solid #fde68a',
                                fontWeight: 700,
                                color: '#b45309',
                                background: '#fef3c7',
                                textAlign: 'center',
                                fontSize: '0.8125rem',
                              }}
                            />
                            {/* Unit price */}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                setEditItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, unitPrice: e.target.value } : it,
                                  ),
                                )
                              }
                              className="ord-item-price-input"
                              style={{
                                width: '5rem',
                                height: '2rem',
                                padding: '0 0.4rem',
                                borderRadius: '0.375rem',
                                border: '1.5px solid #e2e8f0',
                                textAlign: 'right',
                                fontSize: '0.8125rem',
                              }}
                            />
                            {/* Delete */}
                            <button
                              type="button"
                              className="ord-item-delete-btn"
                              onClick={() =>
                                setEditItems((prev) => prev.filter((_, i) => i !== idx))
                              }
                              style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: '0.375rem',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Name */}
                            <div style={{ minWidth: 0 }}>
                              <p
                                className="ord-item-name"
                                style={{
                                  margin: 0,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                }}
                              >
                                {name}
                              </p>
                              {disc > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                  - {formatAmount(disc, 2)}
                                </span>
                              )}
                            </div>
                            {/* Qty badge */}
                            <div
                              style={{
                                width: '2rem',
                                height: '2rem',
                                background: '#fef3c7',
                                borderRadius: '0.375rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span
                                style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}
                              >
                                {Number.isInteger(qty) ? qty : qty.toFixed(1)}
                              </span>
                            </div>
                            {/* Unit price */}
                            <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                              {formatAmount(unitPrice, 2)}
                            </span>
                            {/* Total */}
                            <span
                              className="ord-item-total"
                              style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}
                            >
                              {formatAmount(lineTotal, 2)}{' '}
                              <span
                                style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}
                              >
                                {t('currency')}
                              </span>
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
                          style={{
                            width: '100%',
                            height: '2rem',
                            padding: '0 0.5rem',
                            borderRadius: '0.375rem',
                            border: '1.5px solid #86efac',
                            fontSize: '0.8125rem',
                          }}
                        />
                        {showSuggestions && productSuggestions.length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '2.25rem',
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
                                  padding: '0.5rem 0.75rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.8125rem',
                                  borderBottom: '1px solid #f1f5f9',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                              >
                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                  {formatAmount(p.price, 2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ord-new-item-inputs">
                        <input
                          type="number"
                          min="0"
                          placeholder="Qté"
                          value={newItem.quantity}
                          onChange={(e) =>
                            setNewItem((prev) =>
                              prev ? { ...prev, quantity: e.target.value } : null,
                            )
                          }
                          style={{
                            width: '3.5rem',
                            height: '2rem',
                            padding: '0 0.4rem',
                            borderRadius: '0.375rem',
                            border: '1.5px solid #86efac',
                            fontSize: '0.8125rem',
                            textAlign: 'center',
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="PU"
                          value={newItem.unitPrice}
                          onChange={(e) =>
                            setNewItem((prev) =>
                              prev ? { ...prev, unitPrice: e.target.value } : null,
                            )
                          }
                          style={{
                            width: '5rem',
                            height: '2rem',
                            padding: '0 0.4rem',
                            borderRadius: '0.375rem',
                            border: '1.5px solid #86efac',
                            fontSize: '0.8125rem',
                            textAlign: 'right',
                          }}
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
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.375rem',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            color: '#16a34a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItem(null);
                            setProductSuggestions([]);
                            setShowSuggestions(false);
                          }}
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.375rem',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <X style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Totals footer */}
              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderTop: '2px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {globalDiscount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      color: '#dc2626',
                    }}
                  >
                    <span>{t('discount')}</span>
                    <span>
                      − {formatAmount(globalDiscount, 2)} {t('currency')}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg,#1d4ed8,#235ae4)',
                    borderRadius: '0.625rem',
                    padding: '0.625rem 0.875rem',
                  }}
                >
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                    {t('grandTotal')}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                    {formatAmount(computedTotal, 2)}{' '}
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('currency')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Payment progress bar */}
            {(paidAmount > 0 || remainingAmount > 0) && !editMode && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="ord-pay-progress-labels"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#047857' }}>
                    {t('paidAmount')}: {formatAmount(paidAmount, 2)} {t('currency')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: remainingAmount > 0 ? '#dc2626' : '#047857',
                    }}
                  >
                    {t('remainingAmount')}: {formatAmount(remainingAmount, 2)} {t('currency')}
                  </span>
                </div>
                <div
                  style={{
                    height: '0.5rem',
                    borderRadius: '9999px',
                    background: '#fee2e2',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '9999px',
                      background: 'linear-gradient(to right, #10b981, #047857)',
                      width: `${Math.min(100, computedTotal > 0 ? (paidAmount / computedTotal) * 100 : 0)}%`,
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN ══════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Customer card */}
            <div
              style={{
                background: '#fff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'linear-gradient(135deg, #1d4ed8, #235ae4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User
                    style={{
                      width: '0.875rem',
                      height: '0.875rem',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t('customer')}
                  </span>
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                {order.customerName && (
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {order.customerName}
                  </p>
                )}
                {order.customerPhone && (
                  <a
                    href={`tel:${order.customerPhone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.875rem',
                      color: '#235ae4',
                      textDecoration: 'none',
                      marginBottom: '0.375rem',
                    }}
                  >
                    <Phone style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
                    {order.customerPhone}
                  </a>
                )}
                {order.customerAddress && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.375rem',
                      fontSize: '0.8125rem',
                      color: '#475569',
                    }}
                  >
                    <MapPin
                      style={{
                        width: '0.875rem',
                        height: '0.875rem',
                        flexShrink: 0,
                        marginTop: '0.1rem',
                      }}
                    />
                    {order.customerAddress}
                  </div>
                )}
                {!order.customerName && !order.customerPhone && !order.customerAddress && (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>—</p>
                )}
              </div>
            </div>

            {/* Delivery info */}
            {order.deliveryPersonName && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #7e22ce, #a855f7)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Truck
                      style={{
                        width: '0.875rem',
                        height: '0.875rem',
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.9)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {t('deliveryPerson')}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '1rem' }}>
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {order.deliveryPersonName}
                  </p>
                  {order.deliveryPersonPhone && (
                    <a
                      href={`tel:${order.deliveryPersonPhone}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.875rem',
                        color: '#7e22ce',
                        textDecoration: 'none',
                      }}
                    >
                      <Phone style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
                      {order.deliveryPersonPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Payments card */}
            <div
              style={{
                background: '#fff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard style={{ width: '0.875rem', height: '0.875rem', color: '#047857' }} />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t('payments') || 'Paiements'}
                  </span>
                </div>
              </div>
              <div
                style={{
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                }}
              >
                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.625rem',
                      padding: '0.625rem',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 0.125rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#047857',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('paidAmount')}
                    </p>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#047857' }}>
                      {formatAmount(paidAmount, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{t('currency')}</span>
                    </p>
                  </div>
                  <div
                    style={{
                      background: remainingAmount > 0 ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${remainingAmount > 0 ? '#fecaca' : '#bbf7d0'}`,
                      borderRadius: '0.625rem',
                      padding: '0.625rem',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 0.125rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: remainingAmount > 0 ? '#dc2626' : '#047857',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('remainingAmount')}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: remainingAmount > 0 ? '#dc2626' : '#047857',
                      }}
                    >
                      {formatAmount(remainingAmount, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{t('currency')}</span>
                    </p>
                  </div>
                </div>

                {/* Payment history */}
                {payments.length > 0 && (
                  <div>
                    <p
                      style={{
                        margin: '0 0 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      {t('paymentHistory')}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem',
                        maxHeight: '10rem',
                        overflowY: 'auto',
                      }}
                    >
                      {payments.map((p: any) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.625rem',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '0.5rem',
                          }}
                        >
                          <div>
                            <span
                              style={{ fontSize: '0.875rem', fontWeight: 700, color: '#047857' }}
                            >
                              {formatAmount(p.amount, 2)} {t('currency')}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#64748b',
                                marginInlineStart: '0.5rem',
                              }}
                            >
                              {p.paymentDate} · {p.paymentType}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              toastConfirm(
                                t('deletePayment') || 'Supprimer ?',
                                () => deletePaymentMutation.mutate(p.id),
                                { confirmLabel: t('delete') },
                              )
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc2626',
                              padding: '0.125rem',
                              display: 'flex',
                            }}
                          >
                            <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add payment form */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.875rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                  }}
                >
                  <p
                    style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}
                  >
                    {t('addPayment')}
                  </p>
                  <div>
                    <label
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {t('amount')}
                    </label>
                    <InputNumber
                      value={paymentAmount}
                      onValueChange={(e) => setPaymentAmount(e.value ?? 0)}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      min={0}
                      inputStyle={{ width: '100%' }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {t('paymentDate')}
                    </label>
                    <InputText
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {t('paymentType')}
                    </label>
                    <Dropdown
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.value)}
                      options={paymentTypeOptions}
                      optionLabel="label"
                      optionValue="value"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#64748b',
                        display: 'block',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {t('notes')}
                    </label>
                    <InputText
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder={t('optional')}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <Button
                    label={t('addPayment')}
                    icon={
                      <CreditCard
                        style={{
                          width: '0.875rem',
                          height: '0.875rem',
                          marginInlineEnd: '0.375rem',
                        }}
                      />
                    }
                    onClick={() => createPaymentMutation.mutate()}
                    loading={createPaymentMutation.isPending}
                    disabled={!paymentAmount || paymentAmount <= 0}
                    severity="success"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Print actions */}
            <div
              style={{
                background: '#fff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '0.875rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Printer
                  style={{
                    width: '0.8rem',
                    height: '0.8rem',
                    display: 'inline',
                    marginInlineEnd: '0.375rem',
                  }}
                />
                {isAr ? 'طباعة المستندات' : 'Documents'}
              </p>
              <button
                type="button"
                onClick={() => handlePrint('receipt')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <Receipt
                  style={{ width: '1.125rem', height: '1.125rem', color: '#235ae4', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  {isAr ? 'طباعة الوصل' : 'Imprimer le reçu'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handlePrint('delivery-note')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <Truck
                  style={{ width: '1.125rem', height: '1.125rem', color: '#235ae4', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                  {isAr ? 'بون التسليم' : 'Bon de livraison'}
                </span>
              </button>
              {order.isValidated && (
                <button
                  type="button"
                  onClick={handleRegeneratePdf}
                  disabled={regeneratingPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: regeneratingPdf ? 'not-allowed' : 'pointer',
                    opacity: regeneratingPdf ? 0.6 : 1,
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <RefreshCw
                    style={{
                      width: '1.125rem',
                      height: '1.125rem',
                      color: '#64748b',
                      flexShrink: 0,
                      animation: regeneratingPdf ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                    {isAr ? 'إعادة توليد PDF' : 'Régénérer le PDF'}
                  </span>
                </button>
              )}
            </div>

            {/* Meta info */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{isAr ? 'تاريخ الإنشاء' : 'Créée le'}</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {new Date(order.dateCreated).toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR')}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{isAr ? 'آخر تحديث' : 'Modifiée le'}</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {new Date(order.dateUpdated).toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR')}
                  </span>
                </div>
                {order.deliveryStatus && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>{t('deliveryStatus')}</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {t(
                        (
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
                        )[order.deliveryStatus] || order.deliveryStatus,
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ═══ END GRID ══════════════════════════════════ */}
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
