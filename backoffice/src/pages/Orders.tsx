import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ordersService,
  deliveryPersonService,
  partnersService,
  orderPaymentsService,
  ORDER_PAYMENT_TYPE_LABELS,
} from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Phone,
  X,
  Search,
  Package,
  Eye,
  Check,
  Square,
  UserPlus,
  UserMinus,
  ShoppingCart,
  Trash2,
  Info,
  Receipt,
  Truck,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  Navigation,
  Plus,
  CreditCard,
  Share2,
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
import { Calendar } from 'primereact/calendar';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { Dialog } from 'primereact/dialog';
import { pdfService } from '../services/pdf.service';
import { PDFPreviewModal, prefetchPDF } from '../components/PDFPreviewModal';
import { MobileList } from '../components/MobileList';
import { formatAmount } from '@orderium/ui';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
  const { t, language } = useLanguage();
  const { admin } = useAuth();
  const dateOverlayRef = useRef<OverlayPanel>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [searchInput, setSearchInput] = useState('');
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

  const getDateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    switch (appliedFilters.dateFilterType) {
      case 'today':
        return { start: startOfDay, end: endOfDay };
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
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          start: new Date(lm.getFullYear(), lm.getMonth(), 1),
          end: new Date(lm.getFullYear(), lm.getMonth() + 1, 0, 23, 59, 59, 999),
        };
      }
      case 'last_year':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
        };
      case 'all':
        return { start: undefined, end: undefined };
      case 'custom':
        if (appliedFilters.dateRange.start && appliedFilters.dateRange.end)
          return { start: appliedFilters.dateRange.start, end: appliedFilters.dateRange.end };
        if (appliedFilters.dateRange.start) {
          const e2 = new Date(appliedFilters.dateRange.start);
          e2.setHours(23, 59, 59, 999);
          return { start: appliedFilters.dateRange.start, end: e2 };
        }
        return { start: undefined, end: undefined };
      default:
        return { start: undefined, end: undefined };
    }
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
    queryKey: ['orders', JSON.stringify(appliedFilters), currentPage, pageSize],
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
      ),
  });

  const {
    data: orderAggregates = { totalAmount: 0, totalPaid: 0, totalRemaining: 0, totalSubtotal: 0 },
  } = useQuery({
    queryKey: ['orders-aggregates', JSON.stringify(appliedFilters)],
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
  const orderStatusCounts = ordersData.orderStatusCounts || {};
  const totalCount = ordersData.totalCount || 0;

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: () => deliveryPersonService.getAll(),
  });
  const { data: partnersData } = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnersService.getAll(),
  });
  const partners = partnersData?.partners || [];

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

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => ordersService.unassignOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('orderUnassigned'));
    },
    onError: (error: Error) => {
      toastError(`${t('failedToUnassign')}: ${error.message}`);
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
      toastDeleteError(error, t as (key: string) => string);
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

  const changeStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      ordersService.changeStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
    },
    onError: (error: Error) => {
      toastError(`${t('error')}: ${error.message}`);
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

  const ORDER_STATUS_WORKFLOW: Record<
    string,
    { value: string; label: string; bg: string; color: string; border: string }[]
  > = {
    confirmed: [
      {
        value: 'picked_up',
        label: t('pickedUp'),
        bg: '#f5f3ff',
        color: '#6d28d9',
        border: '#ddd6fe',
      },
      {
        value: 'delivered',
        label: t('delivered'),
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
      },
      {
        value: 'cancelled',
        label: t('cancelled'),
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
      },
    ],
    picked_up: [
      {
        value: 'delivered',
        label: t('delivered'),
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
      },
      {
        value: 'cancelled',
        label: t('cancelled'),
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
      },
    ],
    delivered: [
      {
        value: 'cancelled',
        label: t('cancelled'),
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
      },
    ],
    cancelled: [],
  };

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

  // Pre-warm blob cache when a single order is selected so preview opens instantly
  useEffect(() => {
    if (selectedOrders.length !== 1) return;
    const orderId = selectedOrders[0];
    prefetchPDF(pdfService.getPDFUrl('receipt', orderId, 'preview', language));
    prefetchPDF(pdfService.getPDFUrl('delivery-note', orderId, 'preview', language));
  }, [selectedOrders, language]);

  const handleSendWhatsApp = async () => {
    if (selectedOrders.length !== 1) return;
    const orderId = selectedOrders[0];
    const order = orders.find((o: any) => o.id === orderId);
    const rawPhone = order?.customerPhone ?? '';
    const phone = rawPhone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
    const orderRef = order?.displayOrderNumber || `#${orderId}`;
    const total = order?.totalAmount != null ? `${Number(order.totalAmount).toFixed(2)} DH` : '';
    const isAr = language?.startsWith('ar');
    const message = isAr
      ? `مرحباً، يرجى الاطلاع على وصل التسليم الخاص بطلبكم ${orderRef}${total ? ` بمبلغ ${total}` : ''}.`
      : `Bonjour, veuillez trouver ci-joint le bon de livraison de votre commande ${orderRef}${total ? ` d'un montant de ${total}` : ''}.`;

    try {
      const token = localStorage.getItem('adminToken');
      const tenantMatch = window.location.hostname.match(/^([a-z0-9-]+)\.(localhost|.+\..+)$/i);
      const tenantId = tenantMatch
        ? tenantMatch[1].replace(/-(admin|app|delivery)$/i, '').toLowerCase()
        : null;
      const url = pdfService.getPDFUrl('delivery-note', orderId, 'download', language);
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        },
      });
      if (!response.ok) throw new Error(`${response.status}`);
      const blob = await response.blob();
      const fileName = `BonLivraison_${order?.displayOrderNumber || orderId}.pdf`;
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

  const getDeliveryStatusBadge = (deliveryStatus: string | null | undefined) => {
    const map: Record<
      string,
      { label: string; icon: JSX.Element; bg: string; color: string; border: string }
    > = {
      pending: {
        label: t('pending'),
        icon: <Clock style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#f8fafc',
        color: '#334155',
        border: '#e2e8f0',
      },
      assigned: {
        label: t('assigned'),
        icon: <User style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#faf5ff',
        color: '#7e22ce',
        border: '#e9d5ff',
      },
      confirmed: {
        label: t('confirmed'),
        icon: <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
      },
      picked_up: {
        label: t('pickedUp'),
        icon: <Package style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#eef2ff',
        color: '#4338ca',
        border: '#c7d2fe',
      },
      to_delivery: {
        label: t('toDelivery'),
        icon: <AlertCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#fffbeb',
        color: '#b45309',
        border: '#fde68a',
      },
      in_delivery: {
        label: t('inDelivery'),
        icon: <Navigation style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#ecfeff',
        color: '#0e7490',
        border: '#a5f3fc',
      },
      delivered: {
        label: t('delivered'),
        icon: <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
      },
      canceled: {
        label: t('canceled'),
        icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
      },
    };
    return map[deliveryStatus || ''] || map.pending;
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
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');

  const { data: orderPayments = [], refetch: refetchPayments } = useQuery({
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
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentType('cash');
    setPaymentNote('');
  };

  const isOrderAssigned = (order: any) => order && order.deliveryStatus === 'assigned';
  const canAssignOrder = (order: any) =>
    order && !['delivered', 'canceled', 'assigned'].includes(order.deliveryStatus);

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
              <Button
                onClick={() => navigate('/pos')}
                icon={<Plus style={{ width: 16, height: 16 }} />}
                label={t('newOrder')}
              />
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
            {/* Date period — OverlayPanel trigger */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {t('period')}
              </span>
              <div
                className={`p-dropdown p-component${dateFilterType !== 'all' ? ' p-focus' : ''}`}
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
                        applyDateFilter('all');
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
                          applyDateFilter(opt.value as typeof dateFilterType);
                          if (opt.value !== 'custom') dateOverlayRef.current?.hide();
                        }}
                        style={{
                          padding: '0.4rem 0.625rem',
                          borderRadius: '0.4rem',
                          border: `1.5px solid ${dateFilterType === opt.value ? '#235ae4' : '#e2e8f0'}`,
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
              {/* Custom date range */}
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
                      applyDateFilter('custom', {
                        start: val[0] ?? undefined,
                        end: val[1] ?? undefined,
                      });
                      if (val[0] && val[1]) dateOverlayRef.current?.hide();
                    } else {
                      applyDateFilter('custom', {});
                    }
                  }}
                  selectionMode="range"
                  dateFormat="dd/mm/yy"
                  placeholder={`${t('start')} – ${t('end')}`}
                  numberOfMonths={isMobile ? 1 : 2}
                  inputStyle={{ fontSize: '0.75rem', height: '2rem' }}
                  style={{ width: '100%' }}
                />
              </div>
            </OverlayPanel>

            {/* Source */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {t('orderSource')}
              </span>
              <Dropdown
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
              <Dropdown
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
                appliedFilters.originType !== 'all' ||
                appliedFilters.dateRange.start ||
                appliedFilters.dateRange.end
                  ? t('noOrdersMatchFilter')
                  : t('noOrdersYet')}
              </p>
              {(appliedFilters.search ||
                appliedFilters.orderNumber ||
                appliedFilters.deliveryStatus?.length > 0 ||
                appliedFilters.originType !== 'all' ||
                appliedFilters.dateRange.start ||
                appliedFilters.dateRange.end) && (
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
                  setCurrentPage(Math.floor(e.first / e.rows) + 1);
                  setPageSize(e.rows);
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
                paginatorPosition="top"
                rows={pageSize}
                rowsPerPageOptions={[10, 25, 50, 100]}
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
                  header={t('status')}
                  style={{ minWidth: '9rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(order: any) => {
                    const osb = getOrderStatusBadge(order.status);
                    const nextStatuses = ORDER_STATUS_WORKFLOW[order.status] || [];
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
                  header={t('customer')}
                  style={{ minWidth: '14rem' }}
                  headerStyle={{ fontSize: '0.8125rem', fontWeight: 700 }}
                  body={(order: any) => {
                    const initial = order.customerName?.trim()?.[0]?.toUpperCase() || '?';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '2rem',
                            height: '2rem',
                            background: 'linear-gradient(to bottom right, #4f8ef7, #235ae4)',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {initial}
                        </div>
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
                  header={t('total')}
                  style={{ minWidth: '8rem' }}
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
                  header={t('paidAmount')}
                  style={{ minWidth: '9rem' }}
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
                  header={t('remainingAmount')}
                  style={{ minWidth: '11rem' }}
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
            hidden: true,
          },
          {
            id: 'preview-delivery-note',
            label: t('previewDeliveryNote'),
            icon: <Truck style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () => handlePreview('delivery-note'),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'send-whatsapp',
            label: t('share'),
            icon: <Share2 style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: handleSendWhatsApp,
            variant: 'whatsapp' as const,
            hidden: selectedOrders.length !== 1,
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
            if (selectedOrders.length === 0) return [];
            const allClientPos = selectedOrders.every((id) => {
              const o = orders.find((o: any) => o.id === id);
              return o?.originType === 'CLIENT_POS';
            });
            if (!allClientPos) return [];
            const statusSet = new Set(
              selectedOrders.map((id) => orders.find((o: any) => o.id === id)?.status),
            );
            if (statusSet.size !== 1) return [];
            const commonStatus = [...statusSet][0] as string;
            const actions: import('../components/FloatingActionBar').FloatingAction[] = [];
            if (commonStatus === 'confirmed') {
              actions.push({
                id: 'pos-mark-delivered',
                label: t('markAsDelivered'),
                icon: <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () =>
                  toastConfirm(
                    t('markAsDelivered'),
                    () =>
                      bulkChangeOrderStatusMutation.mutate({
                        orderIds: selectedOrders,
                        status: 'delivered',
                      }),
                    {
                      description: t('confirmMarkDelivered'),
                      confirmLabel: t('markAsDelivered'),
                    },
                  ),
                variant: 'primary' as const,
              });
            }
            return actions;
          })(),
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
            <InputNumber
              value={paymentAmount}
              onValueChange={(e) => setPaymentAmount(e.value ?? 0)}
              mode="decimal"
              minFractionDigits={2}
              maxFractionDigits={2}
              min={0}
              style={{ width: '100%' }}
              inputStyle={{ width: '100%' }}
              placeholder="0.00"
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
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              {t('paymentType')} *
            </label>
            <Dropdown
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
