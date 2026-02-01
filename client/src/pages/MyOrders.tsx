import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { ordersService } from '@/modules/orders';
import { Order, OrderItem } from '@/modules/orders/orders.interface';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Package, Loader2, MapPin, Calendar, ArrowLeft, ShoppingBag, Eye, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function MyOrders() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('all');
  
  // Date filter states
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(() => {
    // Initialize with today's date
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: startOfDay, end: endOfDay };
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.customerId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await ordersService.getCustomerOrders(user.customerId);
        if (response.success) {
          setOrders(response.orders);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // Filter orders by search, date, and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Date filter
      if (dateRange.start && dateRange.end) {
        const orderDate = new Date(order.dateCreated);
        if (orderDate < dateRange.start || orderDate > dateRange.end) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const matchesOrderNumber = order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCustomer = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPhone = order.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesOrderNumber && !matchesCustomer && !matchesPhone) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        const normalizedStatus = order.status || 'pending';
        if (normalizedStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, dateRange, statusFilter]);

  // Count orders by status
  const statusCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      to_delivery: 0,
      in_delivery: 0,
      delivered: 0,
      canceled: 0,
    };

    orders.forEach(order => {
      const status = order.status || 'pending';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [orders]);

  const getStatusLabel = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: t('statusPending'), color: 'bg-blue-100 text-blue-700' },
      to_delivery: { label: t('statusToDelivery'), color: 'bg-orange-100 text-orange-700' },
      in_delivery: { label: t('statusInDelivery'), color: 'bg-yellow-100 text-yellow-700' },
      delivered: { label: t('statusDelivered'), color: 'bg-green-100 text-green-700' },
      canceled: { label: t('statusCanceled'), color: 'bg-red-100 text-red-700' },
      assigned: { label: t('statusAssigned'), color: 'bg-purple-100 text-purple-700' },
    };

    // If no status, default to pending
    const normalizedStatus = status || 'pending';
    const statusInfo = statusMap[normalizedStatus] || statusMap.pending;
    
    return statusInfo;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? 'ar-MA' : 'fr-MA';
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewItems = async (order: Order) => {
    try {
      const orderDetails = await ordersService.getById(order.id);
      setSelectedOrderItems({
        order,
        items: orderDetails.items || []
      });
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  const handlePreview = (documentType: 'receipt' | 'invoice') => {
    if (!selectedOrderItems) return;

    const orderId = selectedOrderItems.order.id;
    if (!orderId) {
      toast.error(t('orderIdMissing'));
      return;
    }

    const endpoint = documentType === 'receipt' 
      ? `/api/pdf/receipt/${orderId}?mode=preview`
      : `/api/pdf/delivery-note/${orderId}?mode=preview`;
    
    const title = documentType === 'receipt'
      ? t('receipt')
      : t('deliveryNote');
    
    setPdfUrl(endpoint);
    setPdfTitle(`${title} ${selectedOrderItems.order.orderNumber}`);
    
    // Close order details modal before opening preview
    setSelectedOrderItems(null);
    setShowPDFPreview(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user?.customerId) {
    return (
      <div className="min-h-screen bg-background py-6 px-4" dir={dir}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            {t('myOrders')}
          </h1>
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('cannotLoadOrders')}
            </h3>
            <p className="text-muted-foreground">
              {t('noCustomerId')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-6 px-3 sm:px-4" dir={dir}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="h-10 w-10 p-0"
              >
                <ArrowLeft className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-7 h-7 text-primary" />
                  {t('myOrders')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('trackAndManage')}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Date Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5`} />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`w-full ${dir === 'rtl' ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background`}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className={`absolute ${dir === 'rtl' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder={t('filterByDate')}
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { key: 'all', label: t('all') },
              { key: 'pending', label: t('statusPending') },
              { key: 'to_delivery', label: t('statusToDelivery') },
              { key: 'in_delivery', label: t('statusInDelivery') },
              { key: 'delivered', label: t('statusDelivered') },
              { key: 'canceled', label: t('statusCanceled') }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === filter.key
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-foreground hover:bg-muted border border-border'
                }`}
              >
                {filter.label}
                <span className={`ml-2 rtl:mr-2 rtl:ml-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusFilter === filter.key 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('noOrdersFound')}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery ? t('noResultsMessage') : t('noOrdersYet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredOrders.map((order) => {
              const status = getStatusLabel(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all group"
                >
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('orderNumber')}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="font-mono font-bold text-lg text-foreground">
                      {order.orderNumber}
                    </p>
                  </div>

                  {/* Order Details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(order.dateCreated)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('totalAmount')}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(order.total || 0, language)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3">
                      {/* View Items Button */}
                      <Button
                        onClick={() => handleViewItems(order)}
                        className="flex-1"
                        variant="outline"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t('viewDetails')}
                      </Button>

                      {/* Track Button */}
                      {(order.status !== 'delivered' && order.status !== 'canceled') && (
                        <Button
                          onClick={() => setSelectedOrder(order.orderNumber)}
                          className="flex-1"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {t('track')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {t('trackOrder')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('trackAndManage')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedOrder && user?.customerId && (
              <>
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono font-bold text-primary">{selectedOrder}</p>
                </div>
                <OrderTracking orderNumber={selectedOrder} customerId={user.customerId} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Items Modal */}
      <Dialog open={!!selectedOrderItems} onOpenChange={() => setSelectedOrderItems(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-3">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {t('orderDetails')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('products')}
            </DialogDescription>
          </DialogHeader>
          {selectedOrderItems && (
            <>
              {/* Order Info - Fixed */}
              <div className="px-4 sm:px-6 pb-3">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('orderNumber')}
                      </p>
                      <p className="font-mono font-bold text-primary">{selectedOrderItems.order.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('date')}
                      </p>
                      <p className="font-medium">{formatDate(selectedOrderItems.order.dateCreated)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List - Scrollable */}
              <div className="px-4 sm:px-6 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3 pb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 sticky top-0 bg-background py-2">
                    <Package className="w-4 h-4" />
                    {t('products')}
                    <span className="text-sm text-muted-foreground">
                      ({selectedOrderItems.items.length})
                    </span>
                  </h3>
                  
                  {selectedOrderItems.items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t('noProductsInCategory')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrderItems.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {item.productName || `${t('cartProduct')} ${item.productId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('quantity')}: {item.quantity} × {formatCurrency(item.unitPrice, language)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatCurrency(item.total, language)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total - Fixed */}
              <div className="px-4 sm:px-6 py-4 border-t border-border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">
                    {t('total')}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedOrderItems.order.total || 0, language)}
                  </span>
                </div>

                {/* Preview Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handlePreview('receipt')}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('receipt')}
                  </Button>
                  <Button
                    onClick={() => handlePreview('invoice')}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('deliveryNote')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />
    </div>
  );
}
