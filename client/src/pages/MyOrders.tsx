import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { orderService } from '@/services/orderService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OrderTracking } from '@/components/OrderTracking';
import { Package, Loader2, MapPin, Calendar, ArrowLeft, ShoppingBag, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Order {
  Id: number;
  Number: string;
  DateCreated: string;
  Total: number;
  DeliveryStatus?: string;
}

interface OrderItem {
  Id: number;
  ProductId: number;
  ProductName?: string;
  Quantity: number;
  Price: number;
  Total: number;
}

export default function MyOrders() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<{ order: Order; items: OrderItem[] } | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.CustomerId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await orderService.getCustomerOrders(user.CustomerId);
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
      const response = await orderService.getById(order.Id);
      if (response.success && response.order) {
        setSelectedOrderItems({
          order,
          items: response.order.Items || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user?.CustomerId) {
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
      <div className="max-w-5xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            <span className="ml-2">{t('backToHome')}</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            {t('myOrders')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('trackAndManage')}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('noOrders')}
            </h3>
            <p className="text-muted-foreground">
              {t('noOrdersYet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {orders.map((order) => {
              const status = getStatusLabel(order.DeliveryStatus);
              return (
                <div
                  key={order.Id}
                  className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-lg transition-all group"
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
                      {order.Number}
                    </p>
                  </div>

                  {/* Order Details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(order.DateCreated)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('totalAmount')}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(order.Total || 0, language)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      {/* View Items Button */}
                      <Button
                        onClick={() => handleViewItems(order)}
                        className="w-full"
                        variant="outline"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t('viewDetails')}
                      </Button>

                      {/* Track Button */}
                      {order.DeliveryStatus !== 'delivered' && order.DeliveryStatus !== 'canceled' && (
                        <Button
                          onClick={() => setSelectedOrder(order.Number)}
                          className="w-full"
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
            {selectedOrder && user?.CustomerId && (
              <>
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono font-bold text-primary">{selectedOrder}</p>
                </div>
                <OrderTracking orderNumber={selectedOrder} customerId={user.CustomerId} />
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
                      <p className="font-mono font-bold text-primary">{selectedOrderItems.order.Number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('date')}
                      </p>
                      <p className="font-medium">{formatDate(selectedOrderItems.order.DateCreated)}</p>
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
                          key={item.Id}
                          className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {item.ProductName || `${t('product')} ${item.ProductId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('quantity')}: {item.Quantity} × {formatCurrency(item.Price, language)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatCurrency(item.Total, language)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total - Fixed */}
              <div className="px-4 sm:px-6 py-4 border-t border-border bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">
                    {t('total')}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedOrderItems.order.Total || 0, language)}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
