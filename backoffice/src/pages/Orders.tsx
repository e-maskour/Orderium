import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ordersService,
  deliveryPersonService,
  orderPaymentsService,
  ORDER_PAYMENT_TYPE_LABELS,
} from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  X,
  Search,
  Package,
  UserPlus,
  UserMinus,
  ShoppingCart,
  Trash2,
  Info,
  Receipt,
  Truck,
  User,
  CheckCircle,
  XCircle,
  Plus,
  CreditCard,
  Share2,
  Layers,
} from 'lucide-react';
import {
  toastSuccess,
  toastDeleted,
  toastCancelled,
  toastError,
  toastDeleteError,
  toastWarning,
  toastConfirm,
} from '../services/toast.service';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { Dialog } from 'primereact/dialog';
import { pdfService } from '../services/pdf.service';
import { PDFPreviewModal, prefetchPDF } from '../components/PDFPreviewModal';
import { OrdersMergeModal } from '../components/OrdersMergeModal';
import type { OrdersMergeView } from '../components/OrdersMergeModal';
import { MobileList } from '../components/MobileList';
import { DecimalInput, formatAmount } from '@orderium/ui';
import { useNavigate } from 'react-router-dom';
import { AutoCompleteSelect } from '../components/ui/AutoCompleteSelect';
import { PeriodFilter } from '../components/PeriodFilter';
import { presetRange } from '../utils/datePresets';
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination';
import { PartnerAvatar } from '@/components/ui';
import { useTenantModules } from '../components/TenantStatusGuard';

/** 'yyyy-MM-dd' → local Date (no timezone shift). */
/** Statuses a user can set by hand on POS orders (mirrors the API's POS_SETTABLE_STATUSES). */
const POS_SETTABLE_STATUSES = ['confirmed', 'picked_up', 'delivered', 'cancelled'] as const;

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

export default function Orders() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  // "New order" opens the POS — hidden when the subscription excludes it.
  const { pos: posEnabled } = useTenantModules();
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [_searchInput, setSearchInput] = useState('');
  const [quickSearch, setQuickSearch] = useState('');

  // Debounce quick search → triggers API call
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setAppliedFilters((prev) => ({ ...prev, search: quickSearch }));
    }, 400);
    return () => clearTimeout(timer);
  }, [quickSearch]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [appliedFilters, setAppliedFilters] = useState<{
    search: string;
    orderNumber: string;
    deliveryStatus: any;
    orderStatus: string[];
    originType: 'all' | 'BACKOFFICE' | 'CLIENT_POS' | 'ADMIN_POS';
    dateFilterType:
      | 'all'
      | 'today'
      | 'yesterday'
      | 'week'
      | 'month'
      | 'last_month'
      | 'year'
      | 'last_year'
      | 'custom';
    dateRange: { start: Date | undefined; end: Date | undefined };
  }>({
    search: '',
    orderNumber: '',
    deliveryStatus: [] as string[],
    orderStatus: [] as string[],
    originType: 'all' as any,
    dateFilterType: 'all',
    dateRange: { start: undefined, end: undefined },
  });

  const [dateFilterType, setDateFilterType] = useState<
    | 'all'
    | 'today'
    | 'yesterday'
    | 'week'
    | 'month'
    | 'last_month'
    | 'year'
    | 'last_year'
    | 'custom'
  >('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({
    start: undefined,
    end: undefined,
  });
  const [originTypeFilter, setOriginTypeFilter] = useState<'all' | 'ADMIN_POS' | 'CLIENT_POS'>(
    'all',
  );
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  // Server-side sort (undefined → API default: newest first)
  const [sort, setSort] = useState<{ field?: string; order?: 'ASC' | 'DESC' }>({});

  // A new result set (filters or sort changed) invalidates the row selection
  const filtersKey = JSON.stringify(appliedFilters);
  useEffect(() => {
    setSelectedOrders([]);
  }, [filtersKey, sort.field, sort.order]);

  const getDateRange = useMemo(() => {
    if (appliedFilters.dateFilterType !== 'custom') {
      return presetRange(appliedFilters.dateFilterType);
    }
    if (appliedFilters.dateRange.start && appliedFilters.dateRange.end)
      return { start: appliedFilters.dateRange.start, end: appliedFilters.dateRange.end };
    if (appliedFilters.dateRange.start) {
      const e2 = new Date(appliedFilters.dateRange.start);
      e2.setHours(23, 59, 59, 999);
      return { start: appliedFilters.dateRange.start, end: e2 };
    }
    return { start: undefined, end: undefined };
  }, [appliedFilters.dateFilterType, appliedFilters.dateRange]);

  const {
    data: ordersData = {
      orders: [],
      count: 0,
      totalCount: 0,
      statusCounts: {},
      orderStatusCounts: {},
    },
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['orders', filtersKey, sort.field, sort.order, currentPage, pageSize],
    queryFn: () =>
      ordersService.getAll(
        appliedFilters.search,
        getDateRange.start,
        getDateRange.end,
        appliedFilters.originType === 'all'
          ? ['CLIENT_POS', 'ADMIN_POS']
          : appliedFilters.originType,
        appliedFilters.deliveryStatus?.length > 0 ? appliedFilters.deliveryStatus : undefined,
        appliedFilters.orderNumber,
        currentPage,
        pageSize,
        undefined,
        appliedFilters.orderStatus?.length > 0 ? appliedFilters.orderStatus : undefined,
        sort.field ? { field: sort.field, order: sort.order } : undefined,
      ),
  });

  const {
    data: orderAggregates = { totalAmount: 0, totalPaid: 0, totalRemaining: 0, totalSubtotal: 0 },
  } = useQuery({
    queryKey: ['orders-aggregates', filtersKey],
    queryFn: () =>
      ordersService.getAggregates(
        appliedFilters.search,
        getDateRange.start,
        getDateRange.end,
        appliedFilters.originType === 'all'
          ? ['CLIENT_POS', 'ADMIN_POS']
          : appliedFilters.originType,
        appliedFilters.deliveryStatus?.length > 0 ? appliedFilters.deliveryStatus : undefined,
        appliedFilters.orderNumber,
        undefined,
        appliedFilters.orderStatus?.length > 0 ? appliedFilters.orderStatus : undefined,
      ),
  });

  const orders = ordersData.orders || [];
  const totalCount = ordersData.totalCount || 0;

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: () => deliveryPersonService.getAll(),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      ordersService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('orderAssigned'));
    },
    onError: (error: Error) => {
      toastError(`${t('failedToAssign')}: ${error.message}`);
    },
  });

  const bulkUnassignMutation = useMutation({
    mutationFn: async (orderIds: number[]) =>
      Promise.all(orderIds.map((id) => ordersService.unassignOrder(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('orderUnassigned'));
      clearSelection();
    },
    onError: (error: Error) => {
      toastError(`${t('failedToUnassign')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => ordersService.bulkDelete(orderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastDeleted(t('ordersDeleted'));
      clearSelection();
    },
    onError: (error: Error) => {
      toastDeleteError(error, t);
    },
  });

  const cancelDeliveryMutation = useMutation({
    mutationFn: async (orderIds: number[]) =>
      Promise.all(
        orderIds.map(async (id) => ordersService.update(id, { deliveryStatus: 'canceled' })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastCancelled(t('deliveryCanceled'));
      clearSelection();
    },
    onError: (error: Error) => {
      toastError(`${t('failedToCancelDelivery')}: ${error.message}`);
    },
  });

  const bulkChangeOrderStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: number[]; status: string }) =>
      Promise.all(orderIds.map((id) => ordersService.changeStatus(id, status))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
      clearSelection();
    },
    onError: (error: Error) => {
      toastError(`${t('error')}: ${error.message}`);
    },
  });

  const getOrderStatusBadge = (status: string | null | undefined) => {
    const map: Record<
      string,
      { label: string; icon: string; bg: string; color: string; border: string }
    > = {
      confirmed: {
        label: t('confirmed'),
        icon: '✅',
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
      },
      picked_up: {
        label: t('pickedUp'),
        icon: '📦',
        bg: '#f5f3ff',
        color: '#6d28d9',
        border: '#ddd6fe',
      },
      delivered: {
        label: t('delivered'),
        icon: '✔️',
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
      },
      invoiced: {
        label: t('invoiced'),
        icon: '🧾',
        bg: '#faf5ff',
        color: '#7e22ce',
        border: '#e9d5ff',
      },
      cancelled: {
        label: t('cancelled'),
        icon: '❌',
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
      },
      pending: {
        label: t('pending'),
        icon: '⏳',
        bg: '#f8fafc',
        color: '#334155',
        border: '#e2e8f0',
      },
      in_progress: {
        label: t('inProgress'),
        icon: '⚙️',
        bg: '#fffbeb',
        color: '#92400e',
        border: '#fde68a',
      },
      canceled: {
        label: t('canceled'),
        icon: '❌',
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
      },
    };
    return (
      map[status || ''] || {
        label: status || '—',
        icon: '•',
        bg: '#f1f5f9',
        color: '#334155',
        border: '#e2e8f0',
      }
    );
  };

  const handleAssign = (orderId: number, deliveryPersonId: string) => {
    if (!deliveryPersonId) return;
    assignMutation.mutate({ orderId, deliveryPersonId: parseInt(deliveryPersonId) });
  };

  const handlePreview = (documentType: 'receipt' | 'delivery-note') => {
    if (selectedOrders.length !== 1) {
      toastError(t('selectOneOrder'));
      return;
    }
    const orderId = selectedOrders[0];
    const order = orders.find((o: any) => o.id === orderId);
    const label = pdfService.getDocumentLabel(documentType);
    const url = pdfService.getPDFUrl(documentType, orderId, 'preview', language);
    setPdfUrl(url);
    setPdfTitle(`${label} ${order?.displayOrderNumber || ''}`.trim());
    setShowPDFPreview(true);
  };

  // Consolidated recap of the current selection — read-only, prints the tab
  // the user is currently looking at.
  const handleMergePrint = (title: string, view: OrdersMergeView) => {
    const url = pdfService.getOrdersMergePDFUrl(selectedOrders, 'preview', language, view);
    setPdfUrl(url);
    setPdfTitle(title);
    setShowMergeModal(false);
    setShowPDFPreview(true);
  };

  // Pre-warm blob cache when a single order is selected so preview opens instantly
  useEffect(() => {
    if (selectedOrders.length !== 1) return;
    const orderId = selectedOrders[0];
    prefetchPDF(pdfService.getPDFUrl('receipt', orderId, 'preview', language));
    prefetchPDF(pdfService.getPDFUrl('delivery-note', orderId, 'preview', language));
  }, [selectedOrders, language]);

  /**
   * Share the order's PDF (delivery note or POS receipt) through the native
   * share sheet on mobile, falling back to WhatsApp Web on desktop.
   */
  const handleShareDocument = async (documentType: 'receipt' | 'delivery-note') => {
    if (selectedOrders.length !== 1) return;
    const orderId = selectedOrders[0];
    const order = orders.find((o: any) => o.id === orderId);
    const rawPhone = order?.customerPhone ?? '';
    const phone = rawPhone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
    const orderRef = order?.displayOrderNumber || `#${orderId}`;
    const total =
      order?.totalAmount != null ? `${formatAmount(Number(order.totalAmount), 2)} DH` : '';
    const isAr = language?.startsWith('ar');
    const isReceipt = documentType === 'receipt';
    const message = isAr
      ? `مرحباً، يرجى الاطلاع على ${isReceipt ? 'إيصال' : 'وصل التسليم'} الخاص بطلبكم ${orderRef}${total ? ` بمبلغ ${total}` : ''}.`
      : `Bonjour, veuillez trouver ci-joint ${isReceipt ? 'le reçu' : 'le bon de livraison'} de votre commande ${orderRef}${total ? ` d'un montant de ${total}` : ''}.`;

    try {
      const token = localStorage.getItem('adminToken');
      const tenantMatch = window.location.hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
      const tenantId = tenantMatch
        ? tenantMatch[1].replace(/-(admin|app|delivery)$/i, '').toLowerCase()
        : null;
      const url = pdfService.getPDFUrl(documentType, orderId, 'download', language);
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        },
      });
      if (!response.ok) throw new Error(`${response.status}`);
      const blob = await response.blob();
      const prefix = isReceipt ? 'Recu' : 'BonLivraison';
      const fileName = `${prefix}_${order?.displayOrderNumber || orderId}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Mobile: native share sheet — lets user pick WhatsApp (or any app) with PDF attached
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName, text: message });
        return;
      }

      // Desktop fallback: open WhatsApp Web with pre-filled text (files can't be sent via URL)
      if (phone) {
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer',
        );
      } else {
        toastWarning('Aucun numéro de téléphone pour ce client.');
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        toastError(t('errorGeneratingPDF'));
      }
    }
  };

  const getSourceBadge = (order: any) => {
    if (order?.originType === 'CLIENT_POS') {
      return {
        label: t('client'),
        icon: <ShoppingCart style={{ width: '0.75rem', height: '0.75rem' }} />,
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
      };
    }
    return {
      label: t('local'),
      icon: <Package style={{ width: '0.75rem', height: '0.75rem' }} />,
      bg: '#f1f5f9',
      color: '#334155',
      border: '#e2e8f0',
    };
  };

  const formatOrderDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;
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
  };

  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };
  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o: any) => o.id));
    }
  };
  const clearSelection = () => setSelectedOrders([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deliveryModalSearch, setDeliveryModalSearch] = useState('');

  // ── Order payment state ────────────────────────────────────
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(localDateToIso(new Date()));
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');

  const { data: orderPayments = [] } = useQuery({
    queryKey: ['orderPayments', paymentOrderId],
    queryFn: () => orderPaymentsService.getByOrder(paymentOrderId!),
    enabled: !!paymentOrderId,
  });

  const createPaymentMutation = useMutation({
    mutationFn: () =>
      orderPaymentsService.create({
        orderId: paymentOrderId!,
        amount: paymentAmount,
        paymentDate,
        paymentType: paymentType as any,
        notes: paymentNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderPayments', paymentOrderId] });
      setPaymentAmount(0);
      setPaymentNote('');
      toastSuccess('Paiement enregistré');
    },
    onError: (e: Error) => toastError(e.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) => orderPaymentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderPayments', paymentOrderId] });
    },
    onError: (e: Error) => toastError(e.message),
  });

  const openPaymentModal = (orderId: number) => {
    setPaymentOrderId(orderId);
    setPaymentAmount(0);
    setPaymentDate(localDateToIso(new Date()));
    setPaymentType('cash');
    setPaymentNote('');
  };

  const isOrderAssigned = (order: any) => order && order.deliveryStatus === 'assigned';
  const canAssignOrder = (order: any) =>
    order && !['delivered', 'canceled', 'assigned'].includes(order.deliveryStatus);

  /** POS-issued orders (admin till or customer portal) — these print a receipt, not a BL. */
  const isPosOrder = (order: any) =>
    order?.originType === 'CLIENT_POS' || order?.originType === 'ADMIN_POS';

  /** Exactly one order selected and it was issued by a POS — gates the receipt actions. */
  const singleSelectedIsPos =
    selectedOrders.length === 1 && isPosOrder(orders.find((o: any) => o.id === selectedOrders[0]));

  const handleBulkAssign = (deliveryPersonId: string) => {
    let assigned = 0;
    let skipped = 0;
    selectedOrders.forEach((orderId) => {
      const order = orders.find((o: any) => o.id === orderId);
      if (canAssignOrder(order)) {
        handleAssign(orderId, deliveryPersonId);
        assigned++;
      } else {
        skipped++;
      }
    });
    if (assigned > 0) toastSuccess(`${assigned} ${t('ordersAssigned')}`);
    if (skipped > 0) toastWarning(`${skipped} ${t('ordersSkippedNotPending')}`);
    setShowAssignModal(false);
    setDeliveryModalSearch('');
    clearSelection();
  };

  const applyDateFilter = (
    newType: typeof dateFilterType,
    newRange?: { start?: Date; end?: Date },
  ) => {
    const range =
      newRange !== undefined
        ? newRange
        : newType !== 'custom'
          ? { start: undefined, end: undefined }
          : dateRange;
    setDateFilterType(newType);
    if (newRange !== undefined) setDateRange(newRange);
    setCurrentPage(1);
    setAppliedFilters((prev) => ({
      ...prev,
      dateFilterType: newType,
      dateRange: { start: range.start, end: range.end },
    }));
  };

  const originTypeOptions = [
    { label: t('all'), value: 'all' },
    { label: t('local'), value: 'ADMIN_POS' },
    { label: t('client'), value: 'CLIENT_POS' },
  ];

  const orderStatusOptions = [
    { label: t('all'), value: '' },
    { label: t('confirmed'), value: 'confirmed' },
    { label: t('pickedUp'), value: 'picked_up' },
    { label: t('delivered'), value: 'delivered' },
    { label: t('invoiced'), value: 'invoiced' },
    { label: t('cancelled'), value: 'cancelled' },
  ];

  const applyOriginFilter = (value: 'all' | 'ADMIN_POS' | 'CLIENT_POS') => {
    setOriginTypeFilter(value);
    setCurrentPage(1);
    setAppliedFilters((prev) => ({ ...prev, originType: value }));
  };

  const applyOrderStatusFilter = (value: string) => {
    setOrderStatusFilter(value);
    setCurrentPage(1);
    setAppliedFilters((prev) => ({ ...prev, orderStatus: value ? [value] : [] }));
  };

  const resetFilters = () => {
    setQuickSearch('');
    setSearchInput('');
    setOriginTypeFilter('all');
    setDateFilterType('all');
    setDateRange({ start: undefined, end: undefined });
    setOrderStatusFilter('');
    setCurrentPage(1);
    setPageSize(50);
    setAppliedFilters({
      search: '',
      orderNumber: '',
      deliveryStatus: [],
      orderStatus: [],
      originType: 'all',
      dateFilterType: 'all',
      dateRange: { start: undefined, end: undefined },
    });
  };

  return (
    <AdminLayout>
      <div
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
          <PageHeader
            icon={ShoppingCart}
            title={t('orders')}
            subtitle={t('viewAndAssignOrders')}
            actions={
              posEnabled ? (
                <Button
                  onClick={() => navigate('/pos')}
                  icon={<Plus style={{ width: 16, height: 16 }} />}
                  label={t('newOrder')}
                />
              ) : undefined
            }
          />
        </div>

        {/* Search Bar + Filters */}
        <div
          className="page-quick-search"
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          {/* Search input */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              flex: 1,
              minWidth: '12rem',
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
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setSearchInput(e.target.value);
                }}
                placeholder={t('searchPlaceholder')}
                style={{
                  width: '100%',
                  paddingLeft: '2.5rem',
                  paddingRight: quickSearch ? '2.5rem' : '0.875rem',
                  height: '3rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.625rem',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                }}
              />
              {quickSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickSearch('');
                    setSearchInput('');
                    setCurrentPage(1);
                    setAppliedFilters((prev) => ({ ...prev, search: '' }));
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.625rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    padding: '0.25rem',
                  }}
                >
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>
              )}
            </div>
          </div>

          {/* Date / Source / Status filters */}
          <div className="orders-filter-bar">
            {/* Date period — opens the centered period dialog */}
            <PeriodFilter
              value={dateFilterType}
              range={dateRange}
              onChange={(preset, range) =>
                applyDateFilter(preset, preset === 'custom' ? range : undefined)
              }
            />

            {/* Source */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {t('orderSource')}
              </span>
              <AutoCompleteSelect
                value={originTypeFilter}
                onChange={(e) => applyOriginFilter(e.value)}
                options={originTypeOptions}
                optionLabel="label"
                optionValue="value"
                style={{ height: '3rem', minWidth: '8rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {t('orderStatus')}
              </span>
              <AutoCompleteSelect
                value={orderStatusFilter}
                onChange={(e) => applyOrderStatusFilter(e.value)}
                options={orderStatusOptions}
                optionLabel="label"
                optionValue="value"
                style={{ height: '3rem', minWidth: '9rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Mobile card list — always rendered, handles loading internally */}
        <div className="responsive-table-mobile">
          <MobileList
            items={orders}
            keyExtractor={(o: any) => o.id}
            onTap={(o: any) => navigate(`/orders/${o.id}`)}
            loading={ordersLoading}
            totalCount={totalCount}
            countLabel={t('orders')}
            emptyMessage={t('noOrdersFound')}
            hasMore={currentPage * pageSize < totalCount}
            onLoadMore={() => setCurrentPage((prev) => prev + 1)}
            selectedKeys={new Set(selectedOrders)}
            onToggleSelect={(key) => toggleSelectOrder(key as number)}
            config={{
              topLeft: (o: any) => `${o.displayOrderNumber}`, // uses displayOrderNumber getter (orderNumber ?? documentNumber ?? #id)
              topRight: (o: any) => `${formatAmount(o.total || 0, 2)} ${t('currency')}`,
              bottomLeft: (o: any) => [o.customerName, o.customerPhone].filter(Boolean).join(' · '),
              bottomRight: (o: any) => {
                const osb = getOrderStatusBadge(o.status);
                return (
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: osb.bg,
                      color: osb.color,
                      border: `1px solid ${osb.border}`,
                    }}
                  >
                    {osb.label}
                  </span>
                );
              },
            }}
          />
        </div>

        {/* Aggregates summary — mobile only, shown below the card list */}
        {orders.length > 0 && (
          <div
            className="responsive-table-mobile"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
              marginTop: '0.75rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            {[
              {
                label: t('totalAmount'),
                value: orderAggregates.totalAmount,
                color: '#1e293b',
                bold: true,
              },
              {
                label: t('alreadyPaid'),
                value: orderAggregates.totalPaid,
                color: '#15803d',
                bold: false,
              },
              {
                label: t('remainingToPay'),
                value: orderAggregates.totalRemaining,
                color: orderAggregates.totalRemaining > 0 ? '#b91c1c' : '#64748b',
                bold: false,
              },
            ].map((stat, idx, arr) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                  {stat.label}
                </span>
                <span
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: stat.bold ? 700 : 600,
                    color: stat.color,
                  }}
                >
                  {formatAmount(stat.value, 2)} {language === 'ar' ? 'د.م' : 'DH'}
                </span>
              </div>
            ))}
          </div>
        )}

        {ordersLoading ? (
          <div
            className="responsive-table-desktop animate-pulse"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      height: '2.5rem',
                      width: '2.5rem',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div
                      style={{
                        height: '1rem',
                        width: '8rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '0.25rem',
                      }}
                    />
                    <div
                      style={{
                        height: '0.75rem',
                        width: '12rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '0.25rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      height: '1.5rem',
                      width: '5rem',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div
            className="responsive-table-desktop"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '4rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    borderRadius: '1rem',
                    padding: '2rem',
                    border: '2px solid #fef3c7',
                  }}
                >
                  <Package
                    style={{
                      width: '4rem',
                      height: '4rem',
                      color: '#235ae4',
                      margin: '0 auto',
                      display: 'block',
                    }}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
              <h3
                style={{
                  marginTop: '1.5rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                {t('noOrdersFound')}
              </h3>
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  maxWidth: '24rem',
                  textAlign: 'center',
                }}
              >
                {appliedFilters.search ||
                appliedFilters.orderNumber ||
                appliedFilters.deliveryStatus?.length > 0 ||
                appliedFilters.orderStatus?.length > 0 ||
                appliedFilters.originType !== 'all' ||
                appliedFilters.dateFilterType !== 'all'
                  ? t('noOrdersMatchFilter')
                  : t('noOrdersYet')}
              </p>
              {(appliedFilters.search ||
                appliedFilters.orderNumber ||
                appliedFilters.deliveryStatus?.length > 0 ||
                appliedFilters.orderStatus?.length > 0 ||
                appliedFilters.originType !== 'all' ||
                appliedFilters.dateFilterType !== 'all') && (
                <Button
                  label={t('resetFilters')}
                  onClick={resetFilters}
                  style={{ marginTop: '1.5rem' }}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              className="responsive-table-desktop"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: '0.875rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              <DataTable
                className="ord-datatable"
                value={orders}
                lazy
                scrollable
                totalRecords={totalCount}
                first={(currentPage - 1) * pageSize}
                onPage={(e: DataTablePageEvent) => {
                  if (e.rows !== pageSize) {
                    setPageSize(e.rows);
                    setCurrentPage(1);
                  } else {
                    setCurrentPage(Math.floor(e.first / e.rows) + 1);
                  }
                }}
                removableSort
                sortField={sort.field}
                sortOrder={sort.order === 'ASC' ? 1 : sort.order === 'DESC' ? -1 : 0}
                onSort={(e: DataTableSortEvent) => {
                  const field = e.sortOrder ? (e.sortField as string) : undefined;
                  setSort(field ? { field, order: e.sortOrder === -1 ? 'DESC' : 'ASC' } : {});
                  setCurrentPage(1);
                }}
                selection={orders.filter((o: any) => selectedOrders.includes(o.id))}
                onSelectionChange={(e) => setSelectedOrders((e.value as any[]).map((o) => o.id))}
                selectionMode="checkbox"
                onRowClick={(e) => {
                  const target = e.originalEvent.target as HTMLElement;
                  if (
                    target.closest('button') ||
                    target.closest('a') ||
                    target.closest('.p-checkbox')
                  )
                    return;
                  const selCol = target.closest('.p-selection-column');
                  if (selCol) {
                    (selCol.querySelector('.p-checkbox-box') as HTMLElement)?.click();
                    return;
                  }
                  navigate(`/orders/${e.data.id}`);
                }}
                rowClassName={() => 'ord-row-clickable'}
                dataKey="id"
                paginator
                paginatorPosition="bottom"
                rows={pageSize}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                loading={ordersLoading}
                emptyMessage={t('noOrdersFound')}
                paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                currentPageReportTemplate={t('pageReportTemplate')}
              >
                <Column
                  selectionMode="multiple"
                  headerStyle={{ width: '2.5rem' }}
                  style={{ width: '2.5rem', minWidth: '2.5rem' }}
                />
                <Column
                  field="dateCreated"
                  sortField="dateCreated"
                  sortable
                  header={t('orderNumber')}
                  style={{ minWidth: '10rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.625rem',
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        borderRadius: '999px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        boxShadow: '0 1px 4px rgba(59,130,246,0.35)',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem' }}>Σ</span>
                      {t('total')}
                    </span>
                  }
                  body={(order: any) => (
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                        {order.displayOrderNumber}
                      </span>
                      {order.receiptNumber && (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                          {order.receiptNumber}
                        </p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                        {formatOrderDate(order.dateCreated)}
                      </p>
                    </div>
                  )}
                />
                <Column
                  field="status"
                  sortField="status"
                  sortable
                  header={t('status')}
                  style={{ minWidth: '9rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(order: any) => {
                    const osb = getOrderStatusBadge(order.status);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: osb.bg,
                            color: osb.color,
                            border: `1px solid ${osb.border}`,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem' }}>{osb.icon}</span>
                          {osb.label}
                        </span>
                      </div>
                    );
                  }}
                />
                <Column
                  field="originType"
                  sortField="originType"
                  sortable
                  header={t('orderSource')}
                  style={{ minWidth: '8rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(order: any) => {
                    const sb = getSourceBadge(order);
                    return (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: sb.bg,
                          color: sb.color,
                          border: `1px solid ${sb.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sb.icon}
                        {sb.label}
                      </span>
                    );
                  }}
                />
                <Column
                  field="partnerName"
                  sortField="partnerName"
                  sortable
                  header={t('customer')}
                  style={{ minWidth: '14rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(order: any) => {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PartnerAvatar name={order.customerName} />
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              margin: 0,
                            }}
                          >
                            {order.customerName}
                          </p>
                          <a
                            href={`tel:${order.customerPhone}`}
                            style={{
                              fontSize: '0.75rem',
                              color: '#235ae4',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.125rem',
                              textDecoration: 'none',
                            }}
                          >
                            <Phone style={{ width: '0.625rem', height: '0.625rem' }} />
                            {order.customerPhone}
                          </a>
                        </div>
                      </div>
                    );
                  }}
                />
                <Column
                  field="total"
                  sortField="total"
                  sortable
                  header={t('total')}
                  style={{ minWidth: '8rem', whiteSpace: 'nowrap' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#235ae4' }}>
                      {formatAmount(orderAggregates.totalAmount, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{t('currency')}</span>
                    </span>
                  }
                  body={(order: any) => (
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#235ae4' }}>
                      {formatAmount(order.total, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{t('currency')}</span>
                    </span>
                  )}
                />
                <Column
                  field="paidAmount"
                  sortField="paidAmount"
                  sortable
                  header={t('paidAmount')}
                  style={{ minWidth: '9rem', whiteSpace: 'nowrap' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#047857' }}>
                      {formatAmount(orderAggregates.totalPaid, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{t('currency')}</span>
                    </span>
                  }
                  body={(order: any) => (
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#047857' }}>
                      {formatAmount(order.paidAmount ?? 0, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{t('currency')}</span>
                    </span>
                  )}
                />
                <Column
                  field="remainingAmount"
                  sortField="remainingAmount"
                  sortable
                  header={t('remainingAmount')}
                  style={{ minWidth: '11rem', whiteSpace: 'nowrap' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  footer={
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: orderAggregates.totalRemaining > 0 ? '#dc2626' : '#047857',
                      }}
                    >
                      {formatAmount(orderAggregates.totalRemaining, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{t('currency')}</span>
                    </span>
                  }
                  body={(order: any) => {
                    const remaining = order.remainingAmount ?? 0;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: remaining > 0 ? '#dc2626' : '#047857',
                          }}
                        >
                          {formatAmount(remaining, 2)}{' '}
                          <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                            {t('currency')}
                          </span>
                        </span>
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaymentModal(order.id);
                            }}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <CreditCard style={{ width: '0.7rem', height: '0.7rem' }} />
                            {t('pay')}
                          </button>
                        )}
                      </div>
                    );
                  }}
                />
              </DataTable>
            </div>
          </>
        )}
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedOrders.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedOrders.length === orders.length}
        totalCount={orders.length}
        actions={[
          ...(() => {
            const allAssigned =
              selectedOrders.length > 0 &&
              selectedOrders.every((id) => {
                const o = orders.find((o: any) => o.id === id);
                return isOrderAssigned(o);
              });
            const allUnassignable =
              selectedOrders.length > 0 &&
              selectedOrders.every((id) => {
                const o = orders.find((o: any) => o.id === id);
                return !isOrderAssigned(o) && canAssignOrder(o);
              });
            return [
              {
                id: 'assign',
                label: t('assignToDelivery'),
                icon: <UserPlus style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => setShowAssignModal(true),
                hidden: !allUnassignable,
              },
              {
                id: 'unassign',
                label: t('unassign'),
                icon: <UserMinus style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () =>
                  toastConfirm(
                    t('unassignOrder'),
                    () => bulkUnassignMutation.mutate(selectedOrders),
                    { description: t('unassignOrderConfirm'), confirmLabel: t('unassign') },
                  ),
                hidden: !allAssigned,
              },
            ];
          })(),
          {
            id: 'details',
            label: t('details'),
            icon: <Info style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () => navigate(`/orders/${selectedOrders[0]}`),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'preview-receipt',
            label: t('previewReceipt'),
            icon: <Receipt style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () => handlePreview('receipt'),
            // POS orders (admin till / customer portal) are the ones that have a receipt
            hidden: !singleSelectedIsPos,
          },
          {
            id: 'preview-delivery-note',
            label: t('previewDeliveryNote'),
            icon: <Truck style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () => handlePreview('delivery-note'),
            hidden: selectedOrders.length !== 1,
          },
          {
            // One share button; the menu lets the user pick which document to send.
            id: 'share',
            label: t('share'),
            icon: <Share2 style={{ width: '0.875rem', height: '0.875rem' }} />,
            variant: 'whatsapp' as const,
            hidden: selectedOrders.length !== 1,
            items: [
              {
                id: 'share-receipt',
                label: t('receipt'),
                icon: <Receipt style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => handleShareDocument('receipt'),
                // Only POS orders (admin till / customer portal) have a receipt
                hidden: !singleSelectedIsPos,
              },
              {
                id: 'share-delivery-note',
                label: t('deliveryNote'),
                icon: <Truck style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => handleShareDocument('delivery-note'),
              },
            ],
          },
          {
            id: 'cancel-delivery',
            label: t('cancelDelivery'),
            icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () =>
              toastConfirm(
                t('cancelDelivery'),
                () => cancelDeliveryMutation.mutate(selectedOrders),
                { description: t('confirmCancelDelivery'), confirmLabel: t('cancelDelivery') },
              ),
            variant: 'danger' as const,
            hidden: !selectedOrders.every((orderId) => {
              const order = orders.find((o: any) => o.id === orderId);
              return order && ['pending', 'assigned', 'confirmed'].includes(order.deliveryStatus);
            }),
          },
          ...(() => {
            // POS orders (admin till / customer portal) — status can be set freely,
            // even when paid or delivered. Backoffice orders keep their workflow.
            if (selectedOrders.length === 0) return [];
            const selected = selectedOrders.map((id) => orders.find((o: any) => o.id === id));
            const allEditablePos = selected.every(
              (o: any) => isPosOrder(o) && !['cancelled', 'invoiced'].includes(o.status),
            );
            if (!allEditablePos) return [];
            const statusSet = new Set(selected.map((o: any) => o.status));
            const commonStatus = statusSet.size === 1 ? ([...statusSet][0] as string) : null;
            const items = POS_SETTABLE_STATUSES.filter((s) => s !== commonStatus).map((status) => {
              const badge = getOrderStatusBadge(status);
              return {
                id: `pos-status-${status}`,
                label: badge.label,
                onClick: () =>
                  toastConfirm(
                    t('changeStatus'),
                    () =>
                      bulkChangeOrderStatusMutation.mutate({
                        orderIds: selectedOrders,
                        status,
                      }),
                    {
                      description: t('confirmChangeStatus')
                        .replace('{n}', String(selectedOrders.length))
                        .replace('{status}', badge.label),
                      confirmLabel: t('changeStatus'),
                      ...(status === 'cancelled' ? { variant: 'destructive' as const } : {}),
                    },
                  ),
              };
            });
            return [
              {
                id: 'pos-change-status',
                label: t('changeStatus'),
                icon: <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
                variant: 'primary' as const,
                items,
              },
            ];
          })(),
          {
            id: 'merge',
            label: t('mergeOrders'),
            icon: <Layers style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () => setShowMergeModal(true),
            variant: 'secondary' as const,
            hidden: selectedOrders.length < 2,
          },
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () =>
              toastConfirm(t('deleteOrders'), () => deleteMutation.mutate(selectedOrders), {
                description: t('confirmDeleteOrders'),
                confirmLabel: t('delete'),
              }),
            variant: 'danger' as const,
            hidden: !selectedOrders.every((id) => {
              const order = orders.find((o: any) => o.id === id);
              if (!order) return false;
              const isPosOrder =
                order.originType === 'CLIENT_POS' || order.originType === 'ADMIN_POS';
              if (isPosOrder) return true;
              return !order.isValidated;
            }),
          },
        ]}
      />

      {/* Assign to Delivery Modal */}
      <Dialog
        visible={showAssignModal}
        onHide={() => {
          setShowAssignModal(false);
          setDeliveryModalSearch('');
        }}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Truck style={{ width: '1rem', height: '1rem', color: '#fff' }} />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                {t('assignToDelivery')}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                {selectedOrders.length} {t('ordersSelected')}
              </p>
            </div>
          </div>
        }
        style={{ width: '26rem', maxWidth: '95vw' }}
        contentStyle={{ padding: '1rem 1.25rem 1.25rem' }}
        modal
        draggable={false}
        resizable={false}
        pt={{
          header: { style: { padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid #f1f5f9' } },
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search
            style={{
              width: '0.875rem',
              height: '0.875rem',
              color: '#94a3b8',
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <InputText
            value={deliveryModalSearch}
            onChange={(e) => setDeliveryModalSearch(e.target.value)}
            placeholder={t('search')}
            style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.875rem' }}
          />
        </div>

        {/* Delivery person list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '20rem',
            overflowY: 'auto',
          }}
        >
          {deliveryPersons
            .filter((p: any) => p.isActive)
            .filter(
              (p: any) =>
                !deliveryModalSearch ||
                p.name.toLowerCase().includes(deliveryModalSearch.toLowerCase()),
            )
            .map((person: any) => (
              <button
                key={person.id}
                type="button"
                onClick={() => handleBulkAssign(String(person.id))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.625rem',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.14s, border-color 0.14s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#bfdbfe';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                }}
              >
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {person.name}
                  </p>
                  {person.phone && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                      {person.phone}
                    </p>
                  )}
                </div>
                <UserPlus
                  style={{ width: '1rem', height: '1rem', color: '#94a3b8', flexShrink: 0 }}
                />
              </button>
            ))}
          {deliveryPersons
            .filter((p: any) => p.isActive)
            .filter(
              (p: any) =>
                !deliveryModalSearch ||
                p.name.toLowerCase().includes(deliveryModalSearch.toLowerCase()),
            ).length === 0 && (
            <p
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.875rem',
                padding: '1.5rem 0',
                margin: 0,
              }}
            >
              {t('noDeliveryPersons')}
            </p>
          )}
        </div>
      </Dialog>

      <OrdersMergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        orderIds={selectedOrders}
        onPrint={handleMergePrint}
      />

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />

      {/* Order Payment Dialog */}
      <Dialog
        visible={!!paymentOrderId}
        onHide={() => setPaymentOrderId(null)}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #047857, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard style={{ width: '1rem', height: '1rem', color: '#fff' }} />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                {t('addPayment')}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                {t('orderNumber')}{' '}
                {orders.find((o: any) => o.id === paymentOrderId)?.displayOrderNumber}
              </p>
            </div>
          </div>
        }
        style={{ width: '32rem', maxWidth: '95vw' }}
        contentStyle={{ padding: '0 1.25rem 1.25rem' }}
        modal
        draggable={false}
        resizable={false}
        pt={{
          header: { style: { padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid #f1f5f9' } },
        }}
      >
        {/* Existing payments list */}
        {orderPayments.length > 0 && (
          <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 0.5rem',
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
              {orderPayments.map((p: any) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#047857' }}>
                      {formatAmount(p.amount, 2)} {t('currency')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      {p.paymentDate} · {p.paymentType}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toastConfirm(t('deletePayment'), () => deletePaymentMutation.mutate(p.id), {
                        confirmLabel: t('delete'),
                      })
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc2626',
                      padding: '0.125rem',
                    }}
                  >
                    <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New payment form */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            marginTop: orderPayments.length > 0 ? 0 : '1rem',
          }}
        >
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              {t('amount')} *
            </label>
            <DecimalInput
              className="p-inputtext p-component"
              value={paymentAmount}
              onValueChange={(v) => setPaymentAmount(v ?? 0)}
              minFractionDigits={2}
              maxFractionDigits={2}
              min={0}
              style={{ width: '100%' }}
              placeholder="0,00"
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              {t('paymentDate')} *
            </label>
            <Calendar
              dateFormat="dd/mm/yy"
              value={isoToLocalDate(paymentDate)}
              onChange={(e) => setPaymentDate(localDateToIso(e.value as Date | null))}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              {t('paymentType')} *
            </label>
            <AutoCompleteSelect
              value={paymentType}
              onChange={(e) => setPaymentType(e.value)}
              options={Object.entries(ORDER_PAYMENT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              optionLabel="label"
              optionValue="value"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              {t('notes')}
            </label>
            <InputText
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              style={{ width: '100%' }}
              placeholder={t('optional')}
            />
          </div>
          <Button
            label={t('addPayment')}
            icon={
              <CreditCard
                style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem' }}
              />
            }
            onClick={() => createPaymentMutation.mutate()}
            loading={createPaymentMutation.isPending}
            disabled={!paymentAmount || paymentAmount <= 0}
            style={{ width: '100%', marginTop: '0.25rem' }}
            severity="success"
          />
        </div>
      </Dialog>
    </AdminLayout>
  );
}
