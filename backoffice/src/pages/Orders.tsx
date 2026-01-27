import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, deliveryPersonService } from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Phone, MapPin, X, Search, Package, Eye, Download, CheckSquare, Square, UserPlus, Grid3x3, List, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { FloatingActionBar, FloatingAction } from '../components/FloatingActionBar';
import html2pdf from 'html2pdf.js';
import { Receipt } from '../../../client/src/components/Receipt';
import { Invoice } from '../../../client/src/components/Invoice';

// Helper functions for generating HTML content
const generateInvoiceHTML = (props: any) => {
  const totalTVA = props.subtotal * 0.2;
  const totalTTC = props.subtotal * 1.2;
  
  // Calculate pagination
  const itemsPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(props.items.length / itemsPerPage));
  
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    const startIndex = i * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, props.items.length);
    pages.push({
      pageNumber: i + 1,
      items: props.items.slice(startIndex, endIndex),
      isLast: i === totalPages - 1
    });
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${props.orderNumber}</title>
        <style>
          @page {
            size: A5;
            margin: 0;
          }
          
          @media print {
            .page-break {
              page-break-before: always;
            }
            .no-break {
              page-break-inside: avoid;
            }
          }
          
          body {
            font-family: "DejaVu Sans", "Helvetica", "Arial", sans-serif;
            background-color: #ffffff;
            width: 148mm;
            margin: 0;
            padding: 0;
            font-size: 9pt;
            color: #000000;
            line-height: 1.3;
            box-sizing: border-box;
          }
          
          .invoice-page {
            min-height: 210mm;
            display: flex;
            flex-direction: column;
            background-color: #ffffff;
          }
          
          .header {
            padding: 5mm 6mm 3mm 6mm;
            background-color: #ffffff;
          }
          
          .company-info {
            width: 70mm;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 1mm;
            color: #000000;
            letter-spacing: 0.3pt;
          }
          
          .footer {
            border-top: 0.5pt solid #DDDDDD;
            padding: 2.5mm 8mm 5mm 8mm;
            font-size: 6.5pt;
            color: #777777;
            line-height: 1.3;
            background-color: #ffffff;
            margin-top: auto;
          }
          
          /* More styles... */
        </style>
      </head>
      <body>
        ${pages.map((page, pageIndex) => `
          <div class="invoice-page ${pageIndex > 0 ? 'page-break' : ''}">
            <div class="header">
              <div style="display: flex; justify-content: space-between;">
                <div class="company-info">ORDERIUM</div>
                <div>
                  <div style="font-size: 15pt; font-weight: bold;">FACTURE</div>
                  <div style="font-size: 8pt; color: #666;">N° ${props.orderNumber}</div>
                </div>
              </div>
            </div>
            
            <!-- Content goes here -->
            
            <div class="footer">
              <div style="display: flex; justify-content: space-between;">
                <div>ORDERIUM - Système de gestion des commandes</div>
                <div>Page ${page.pageNumber}/${totalPages}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </body>
    </html>
  `;
};

const generateReceiptHTML = (props: any) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt ${props.orderNumber}</title>
        <style>
          @page {
            size: 80mm 297mm;
            margin: 0;
          }
          
          body {
            font-family: "Courier New", monospace;
            background-color: #ffffff;
            width: 80mm;
            margin: 0;
            padding: 3mm;
            font-size: 8pt;
            color: #000000;
            line-height: 1.2;
          }
          
          .receipt-header {
            text-align: center;
            margin-bottom: 3mm;
            font-weight: bold;
          }
          
          .divider {
            border-top: 1px dashed #000;
            margin: 2mm 0;
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <div style="font-size: 12pt;">ORDERIUM</div>
          <div>Reçu N° ${props.orderNumber}</div>
        </div>
        
        <div class="divider"></div>
        
        <div>
          Date: ${props.orderDate.toLocaleDateString('fr-FR')}<br/>
          Client: ${props.customerName}<br/>
          Tel: ${props.customerPhone}
        </div>
        
        <div class="divider"></div>
        
        ${props.items.map((item: any) => {
          const itemTotal = item.product.price * item.quantity;
          return `
            <div style="margin-bottom: 2mm;">
              <div style="font-weight: bold;">${item.product.name}</div>
              <div style="display: flex; justify-content: space-between;">
                <span>${item.quantity} x ${item.product.price.toFixed(2)}</span>
                <span>${itemTotal.toFixed(2)} MAD</span>
              </div>
            </div>
          `;
        }).join('')}
        
        <div class="divider"></div>
        
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Total TTC:</span>
          <span>${(props.subtotal * 1.2).toFixed(2)} MAD</span>
        </div>
        
        <div style="text-align: center; margin-top: 5mm; font-size: 6pt;">
          Merci pour votre commande!
        </div>
      </body>
    </html>
  `;
};
import { LanguageProvider } from '../context/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// Preview Content Component
function PreviewContent({ orderId, type, filteredOrders }: { orderId: number; type: 'receipt' | 'invoice'; filteredOrders: any[] }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderData = filteredOrders.find((o: any) => o.id === orderId);
        if (!orderData) return;

        const orderDetails = await ordersService.getById(orderId);
        
        const formattedItems = (orderDetails.items || []).map((item: any) => ({
          product: {
            id: item.productId || 0,
            name: item.product?.name || item.productName || 'Product',
            price: item.price || 0,
            description: item.product?.description || '',
            CategoryId: 0,
            imageUrl: '',
            code: item.product?.code || '',
            stock: 0,
            cost: 0,
            isService: false,
            isEnabled: true,
            DateCreated: '',
            DateUpdated: '',
          },
          quantity: item.quantity
        }));

        setOrder({
          ...orderData,
          items: formattedItems
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, filteredOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-500">Order not found</div>;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <LanguageProvider>
        {type === 'receipt' ? (
          <Receipt
            orderNumber={order.orderNumber}
            customerName={order.customerName}
            customerPhone={order.customerPhone}
            items={order.items}
            subtotal={order.total}
            orderDate={new Date(order.dateCreated)}
          />
        ) : (
          <Invoice
            orderNumber={order.orderNumber}
            customerName={order.customerName}
            customerPhone={order.customerPhone}
            customerAddress={order.customerAddress || ''}
            items={order.items}
            subtotal={order.total}
            orderDate={new Date(order.dateCreated)}
          />
        )}
      </LanguageProvider>
    </div>
  );
}

export default function Orders() {
  const { t } = useLanguage();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [unassignOrderId, setUnassignOrderId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; type: 'receipt' | 'invoice' | null; orderId: number | null }>({ isOpen: false, type: null, orderId: null });
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('all');
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(() => {
    // Initialize with today's date
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: startOfDay, end: endOfDay };
  });

  // Get date range based on filter type
  const getDateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dateFilterType) {
      case 'today':
        return { start: startOfDay, end: endOfDay };
      
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        return { start: startYesterday, end: endYesterday };
      
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
      
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start: startOfYear, end: endOfYear };
      
      case 'custom':
        if (dateRange.start && dateRange.end) {
          return { start: dateRange.start, end: dateRange.end };
        } else if (dateRange.start) {
          const endCustom = new Date(dateRange.start);
          endCustom.setHours(23, 59, 59, 999);
          return { start: dateRange.start, end: endCustom };
        }
        return { start: startOfDay, end: endOfDay };
      
      default:
        return { start: startOfDay, end: endOfDay };
    }
  }, [dateFilterType, dateRange]);

  // Enable real-time notifications
  useOrderNotifications({
    token: localStorage.getItem('adminToken'),
    enabled: !!admin,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', searchQuery, dateFilterType, dateRange],
    queryFn: () => ordersService.getAll(searchQuery, getDateRange.start, getDateRange.end, true),
  });

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
  });

  const { data: orderDetails, isLoading: orderDetailsLoading } = useQuery({
    queryKey: ['orderDetails', selectedOrderId],
    queryFn: () => ordersService.getById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      ordersService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderAssigned'));
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToAssign')}: ${error.message}`);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => ordersService.unassignOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderUnassigned'));
      setUnassignOrderId(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUnassign')}: ${error.message}`);
    },
  });

  const handleAssign = (orderId: number, deliveryPersonId: string) => {
    if (!deliveryPersonId) return;
    assignMutation.mutate({ orderId, deliveryPersonId: parseInt(deliveryPersonId) });
  };

  const handleUnassign = () => {
    if (unassignOrderId) {
      unassignMutation.mutate(unassignOrderId);
    }
  };

  const handlePreview = (documentType: 'receipt' | 'invoice') => {
    if (selectedOrders.length !== 1) {
      toast.error(t('selectOneOrder') || 'Please select only one order to preview');
      return;
    }
    setPreviewModal({ isOpen: true, type: documentType, orderId: selectedOrders[0] });
  };

  const handleDownloadDocuments = async (documentType: 'receipt' | 'invoice') => {
    if (selectedOrders.length === 0) return;

    const toastId = toast.loading(`${t('generating')} ${selectedOrders.length} ${documentType === 'receipt' ? t('receipts') : t('invoices')}...`);

    try {
      for (const orderId of selectedOrders) {
        const order = filteredOrders.find((o: any) => o.id === orderId);
        if (!order) continue;

        // Try server-side PDF generation first
        try {
          const response = await fetch(`/api/pdf/${documentType}/${orderId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
          });

          if (response.ok) {
            // Server-side generation successful
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${documentType === 'receipt' ? 'Receipt' : 'Invoice'}_${order.orderNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            continue; // Move to next order
          }
        } catch (serverError) {
          console.warn('Server-side PDF generation failed, falling back to client-side:', serverError);
        }

        // Fallback to client-side browser print
        const orderDetails = await ordersService.getById(orderId);
        
        // Format items for components
        const formattedItems = (orderDetails.items || []).map((item: any) => ({
          product: {
            id: item.productId || 0,
            name: item.product?.name || item.productName || 'Product',
            price: item.price || 0,
            description: item.product?.description || '',
            CategoryId: 0,
            imageUrl: '',
            code: item.product?.code || '',
            stock: 0,
            cost: 0,
            isService: false,
            isEnabled: true,
            DateCreated: '',
            DateUpdated: '',
          },
          quantity: item.quantity
        }));

        // Create print window
        const printWindow = window.open('', '_blank', 
          documentType === 'receipt' 
            ? 'width=320,height=800,scrollbars=no'
            : 'width=595,height=842,scrollbars=no'
        );
        
        if (!printWindow) {
          throw new Error('Popup blocked - please allow popups for this site');
        }

        // Generate HTML content
        const htmlContent = documentType === 'receipt' 
          ? generateReceiptHTML({
              orderNumber: order.orderNumber || '',
              customerName: order.customerName || '',
              customerPhone: order.customerPhone || '',
              items: formattedItems,
              subtotal: order.total || 0,
              orderDate: new Date(order.dateCreated)
            })
          : generateInvoiceHTML({
              orderNumber: order.orderNumber || '',
              customerName: order.customerName || '',
              customerPhone: order.customerPhone || '',
              customerAddress: order.customerAddress || '',
              items: formattedItems,
              subtotal: order.total || 0,
              orderDate: new Date(order.dateCreated)
            });

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Auto-print and close
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
          }, 1000);
        };

        // Small delay between orders
        if (selectedOrders.indexOf(orderId) < selectedOrders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      toast.success(`${selectedOrders.length} ${documentType === 'receipt' ? t('receipts') : t('invoices')} ready for download`, { id: toastId });
      clearSelection();
    } catch (error) {
      console.error('Failed to generate documents:', error);
      toast.error(t('failedToGenerate'), { id: toastId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_delivery': return 'bg-amber-50 text-amber-700 border border-amber-200/50';
      case 'in_delivery': return 'bg-blue-50 text-blue-700 border border-blue-200/50';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
      case 'canceled': return 'bg-red-50 text-red-700 border border-red-200/50';
      default: return 'bg-slate-50 text-slate-600 border border-slate-200/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'to_delivery': return '📋';
      case 'in_delivery': return '🚚';
      case 'delivered': return '✅';
      case 'canceled': return '❌';
      default: return '⏳';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'to_delivery': return t('toDelivery');
      case 'in_delivery': return t('inDelivery');
      case 'delivered': return t('delivered');
      case 'canceled': return t('canceled');
      default: return status || t('unassigned');
    }
  };

  // Filter orders by status (no date filtering on client - done on server)
  const filteredOrders = orders.filter((order: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unassigned') return !order.status;
    return order.status === statusFilter;
  });

  // Count orders by status - use full orders list, not filtered
  const statusCounts = {
    all: orders.length,
    unassigned: orders.filter((o: any) => !o.status).length,
    to_delivery: orders.filter((o: any) => o.status === 'to_delivery').length,
    in_delivery: orders.filter((o: any) => o.status === 'in_delivery').length,
    delivered: orders.filter((o: any) => o.status === 'delivered').length,
    canceled: orders.filter((o: any) => o.status === 'canceled').length,
  };

  // Selection handlers
  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o: any) => o.id));
    }
  };

  const clearSelection = () => setSelectedOrders([]);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto">
        {/* Header with Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
          <PageHeader
            icon={ShoppingCart}
            title={t('orders')}
            subtitle={t('viewAndAssignOrders')}
            actions={
              <>
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'card'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full sm:w-80 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                if (range.start || range.end) {
                  setDateFilterType('custom');
                }
              }}
              placeholder={t('selectDate')}
            />
              </>
            }
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { key: 'all', label: t('all'), color: 'slate' },
              { key: 'unassigned', label: t('unassigned'), color: 'slate' },
              { key: 'to_delivery', label: t('toDelivery'), color: 'amber' },
              { key: 'in_delivery', label: t('inDelivery'), color: 'blue' },
              { key: 'delivered', label: t('delivered'), color: 'emerald' },
              { key: 'canceled', label: t('canceled'), color: 'red' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    statusFilter === filter.key
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {filter.label}
                  <span className={`ml-2 rtl:mr-2 rtl:ml-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    statusFilter === filter.key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {statusCounts[filter.key as keyof typeof statusCounts]}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Orders Content - Scrollable */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {ordersLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center flex-1 p-16">
              <div className="text-center">
                <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-800 font-semibold text-lg mb-2">{t('noOrdersFound')}</p>
                <p className="text-sm text-slate-500">
                  {statusFilter === 'all' 
                    ? t('noOrdersFound')
                    : `${t('noOrdersFound')}`
                  }
                </p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                {filteredOrders.map((order: any) => (
              <div
                key={order.id}
                onClick={() => toggleSelectOrder(order.id)}
                className={`relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                  selectedOrders.includes(order.id)
                    ? 'border-amber-500 ring-2 ring-amber-500/20'
                    : 'border-slate-200/60 hover:border-slate-300/60'
                }`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedOrders.includes(order.id)
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {selectedOrders.includes(order.id) && (
                          <CheckSquare className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Order Number & Status */}
                    <div className="flex-shrink-0 w-32">
                      <span className="text-sm font-semibold text-slate-500">#{order.orderNumber}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(order.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getStatusColor(order.status)}`}>
                        <span className="text-base">{getStatusIcon(order.status)}</span>
                        <span>{getStatusLabel(order.status)}</span>
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="w-48 min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{order.customerName}</p>
                        <a href={`tel:${order.customerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 transition-colors">
                          <Phone className="w-3 h-3" />
                          {order.customerPhone}
                        </a>
                      </div>
                    </div>

                    {/* Address */}
                    {order.customerAddress && (
                      <div className="flex-1 min-w-0 flex items-center gap-2" title={order.customerAddress}>
                        <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3 h-3 text-amber-600" />
                        </div>
                        <p className="text-xs text-slate-600 truncate">{order.customerAddress}</p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">{t('total')}</span>
                      <span className="text-base font-bold text-amber-600 block mt-0.5">
                        {order.total?.toFixed(2)} <span className="text-xs">{t('currency')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order: any) => (
              <div 
                key={order.id} 
                onClick={() => toggleSelectOrder(order.id)}
                className={`relative bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  selectedOrders.includes(order.id) 
                    ? 'border-amber-500 ring-2 ring-amber-500/20' 
                    : 'border-slate-200/60 hover:border-slate-300/60'
                }`}
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedOrders.includes(order.id)
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {selectedOrders.includes(order.id) && (
                        <CheckSquare className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2 ml-8">
                    <span className="text-xs font-semibold text-slate-500 tracking-wide">#{order.orderNumber}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getStatusColor(order.status)}`}>
                      <span className="text-base">{getStatusIcon(order.status)}</span>
                      <span>{getStatusLabel(order.status)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {new Date(order.dateCreated).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Customer - Most Prominent */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{order.customerName}</p>
                      <a href={`tel:${order.customerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 mt-0.5 transition-colors">
                        <Phone className="w-3 h-3" />
                        {order.customerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {order.customerAddress && (
                    <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100" title={order.customerAddress}>
                      <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-amber-600" />
                      </div>
                      <p className="text-xs text-slate-600 flex-1 line-clamp-1 leading-relaxed">{order.customerAddress}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('total')}</span>
                      <span className="text-base font-bold text-amber-600">{order.total?.toFixed(2)} <span className="text-xs">{t('currency')}</span></span>
                    </div>
                  </div>
                </div>
              </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && orderDetails && (
        <OrderDetailsModal
          order={orderDetails.order || orderDetails}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedOrders.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedOrders.length === filteredOrders.length}
        totalCount={filteredOrders.length}
        actions={[
          {
            id: 'details',
            label: t('details'),
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: () => setSelectedOrderId(selectedOrders[0]),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'preview-receipt',
            label: t('previewReceipt') || 'Aperçu Reçu',
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: () => handlePreview('receipt'),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'preview-invoice',
            label: t('previewInvoice') || 'Aperçu Facture',
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: () => handlePreview('invoice'),
            hidden: selectedOrders.length !== 1,
          },
        ]}
      >
        {/* Assign to Delivery - Custom Dropdown */}
        <div className="relative group">
          <select
            onChange={(e) => {
              if (e.target.value) {
                selectedOrders.forEach(orderId => {
                  const order = filteredOrders.find((o: any) => o.id === orderId);
                  if (order && order.status !== 'delivered') {
                    handleAssign(orderId, e.target.value);
                  }
                });
                clearSelection();
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 bg-white text-amber-600 rounded-lg hover:bg-amber-50 transition-all shadow-md font-semibold text-sm cursor-pointer appearance-none pr-8"
          >
            <option value="">
              {t('assignToDelivery')}
            </option>
            {deliveryPersons.filter((p: any) => p.isActive).map((person: any) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </div>
      </FloatingActionBar>

      {/* Preview Modal */}
      {previewModal.isOpen && previewModal.orderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-[900px] w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {previewModal.type === 'receipt' ? t('receipt') : t('invoice')} - {t('preview')}
              </h3>
              <div className="flex items-center gap-3">
                {/* Print Button */}
                <button
                  onClick={async () => {
                    if (!previewModal.orderId) return;
                    
                    try {
                      const element = document.getElementById(previewModal.type === 'receipt' ? 'receipt-content' : 'invoice-content');
                      if (!element) {
                        toast.error('Preview content not found');
                        return;
                      }

                      // Configure html2pdf options for printing
                      const options = {
                        margin: 0,
                        image: { type: 'jpeg' as const, quality: 0.98 },
                        html2canvas: { 
                          scale: 2,
                          useCORS: true,
                          allowTaint: true,
                          backgroundColor: '#ffffff',
                          logging: false
                        },
                        jsPDF: { 
                          unit: 'mm', 
                          format: previewModal.type === 'receipt' ? [80, 200] : 'a5', 
                          orientation: 'portrait' 
                        }
                      };

                      // Generate PDF blob and open for printing
                      const pdfBlob = await html2pdf().set(options).from(element).outputPdf('blob');
                      const url = URL.createObjectURL(pdfBlob);
                      const printWindow = window.open(url, '_blank');
                      if (printWindow) {
                        printWindow.onload = () => {
                          printWindow.print();
                        };
                      }
                    } catch (error) {
                      console.error('Failed to generate PDF for printing:', error);
                      toast.error('Failed to generate PDF for printing');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="text-sm font-semibold">{t('print') || 'Imprimer'}</span>
                </button>
                
                {/* Download Button */}
                <button
                  onClick={() => {
                    if (previewModal.orderId) {
                      handleDownloadDocuments(previewModal.type!);
                      setPreviewModal({ isOpen: false, type: null, orderId: null });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">{t('download') || 'Télécharger'}</span>
                </button>
                
                {/* Close Button */}
                <button
                  onClick={() => setPreviewModal({ isOpen: false, type: null, orderId: null })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 flex justify-center">
              <PreviewContent
                orderId={previewModal.orderId}
                type={previewModal.type!}
                filteredOrders={filteredOrders}
              />
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={unassignOrderId !== null} onOpenChange={(open) => !open && setUnassignOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unassignOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('unassignOrderConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign}>{t('unassign')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
