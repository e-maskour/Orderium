import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { orderService } from '@/services/orderService';
import { Package, Truck, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react';

interface OrderTrackingProps {
  orderNumber: string;
  customerId: number;
}

interface OrderStatus {
  status: 'pending' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';
  createdAt: Date;
  confirmedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  canceledAt?: Date;
}

export const OrderTracking = ({ orderNumber, customerId }: OrderTrackingProps) => {
  const { t, language } = useLanguage();
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order status from API
  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!orderNumber || !customerId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await orderService.getByOrderNumber(orderNumber, customerId);
        if (response.success && response.order) {
          const order = response.order.Document;
          
          // Map order delivery status to tracking status
          let status: 'pending' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled' = 'pending';
          
          if (order.DeliveryStatus) {
            status = order.DeliveryStatus;
          }

          setOrderStatus({
            status,
            createdAt: new Date(order.DateCreated),
            confirmedAt: order.ConfirmedAt ? new Date(order.ConfirmedAt) : undefined,
            pickedUpAt: order.PickedUpAt ? new Date(order.PickedUpAt) : undefined,
            deliveredAt: order.DeliveredAt ? new Date(order.DeliveredAt) : undefined,
            canceledAt: order.CanceledAt ? new Date(order.CanceledAt) : undefined,
          });
        } else {
          setError(t('orderNotFound'));
        }
      } catch (err: any) {
        console.error('Failed to fetch order:', err);
        // Check if it's a 404 error (order not found)
        if (err?.message?.includes('404')) {
          setError(t('orderNotFound'));
        } else {
          setError(t('failedToLoad'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderStatus();
  }, [orderNumber, customerId, language]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !orderStatus) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {error || t('noData')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('checkNumberAndRetry')}
        </p>
      </div>
    );
  }

  const statuses = [
    {
      key: 'pending',
      label: t('statusPending'),
      description: t('orderReceived'),
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-500',
    },
    {
      key: 'to_delivery',
      label: t('readyToDeliver'),
      description: t('deliveryAssigned'),
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-500',
    },
    {
      key: 'in_delivery',
      label: t('statusInDelivery'),
      description: t('onTheWay'),
      icon: Truck,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-500',
    },
    {
      key: 'delivered',
      label: t('statusDelivered'),
      description: t('deliveredSuccessfully'),
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-500',
    },
  ];

  // Handle canceled status
  if (orderStatus.status === 'canceled') {
    return (
      <div className="w-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {t('orderCanceled')}
          </h3>
          <p className="text-sm text-red-700">
            {t('orderWasCanceled')}
          </p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = statuses.findIndex(s => s.key === orderStatus.status);

  const formatDate = (date?: Date) => {
    if (!date) return '';
    const locale = language === 'ar' ? 'ar-MA' : 'fr-MA';
    return new Date(date).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full">
      {/* Timeline */}
      <div className="relative">
        {statuses.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const StatusIcon = status.icon;

          return (
            <div key={status.key} className="relative pb-8 last:pb-0">
              {/* Connecting line */}
              {index < statuses.length - 1 && (
                <div
                  className={`absolute left-6 rtl:left-auto rtl:right-6 top-12 h-full w-0.5 -ml-px rtl:ml-0 rtl:-mr-px transition-all duration-500 ${
                    isCompleted ? 'bg-gradient-to-b from-primary to-primary/30' : 'bg-gray-200'
                  }`}
                  style={{
                    height: 'calc(100% - 0.5rem)',
                  }}
                />
              )}

              {/* Status item */}
              <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    isCompleted
                      ? `${status.bgColor} ${status.borderColor} shadow-lg scale-110`
                      : 'bg-white border-gray-300'
                  } ${isCurrent ? 'animate-pulse ring-4 ring-primary/20' : ''}`}
                >
                  <StatusIcon
                    className={`w-6 h-6 transition-colors duration-500 ${
                      isCompleted ? status.color : 'text-gray-400'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-base font-semibold transition-colors duration-500 ${
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {status.label}
                    </h3>
                    {isCompleted && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(
                          status.key === 'pending'
                            ? orderStatus.createdAt
                            : status.key === 'to_delivery'
                            ? orderStatus.confirmedAt || orderStatus.createdAt
                            : status.key === 'in_delivery'
                            ? orderStatus.pickedUpAt || orderStatus.confirmedAt || orderStatus.createdAt
                            : status.key === 'delivered'
                            ? orderStatus.deliveredAt || orderStatus.pickedUpAt || orderStatus.createdAt
                            : status.key === 'canceled'
                            ? orderStatus.canceledAt || orderStatus.createdAt
                            : orderStatus.createdAt
                        )}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-1 transition-colors duration-500 ${
                      isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    }`}
                  >
                    {status.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Status Badge */}
      {currentStatusIndex >= 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {t('currentStatus')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {statuses[currentStatusIndex].description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
