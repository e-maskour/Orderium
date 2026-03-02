import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { ordersService } from '@/modules/orders';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';

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
  const { t, language, dir } = useLanguage();
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!orderNumber || !customerId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const order = await ordersService.getByOrderNumber(orderNumber, customerId);

        let status: 'pending' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled' = 'pending';

        if (order.status) {
          if (order.status === 'delivered') status = 'delivered';
          else if (order.status === 'canceled') status = 'canceled';
          else if (order.status === 'in_transit' || order.status === 'in_delivery') status = 'in_delivery';
          else if (order.status === 'to_delivery') status = 'to_delivery';
        }

        setOrderStatus({
          status,
          createdAt: new Date(order.dateCreated),
          confirmedAt: undefined,
          pickedUpAt: undefined,
          deliveredAt: undefined,
          canceledAt: undefined,
        });
      } catch (err: any) {
        console.error('Failed to fetch order:', err);
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
      <div className="flex align-items-center justify-content-center py-6">
        <ProgressSpinner style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  if (error || !orderStatus) {
    return (
      <div className="text-center py-5">
        <div className="flex align-items-center justify-content-center mx-auto mb-3 border-circle surface-200" style={{ width: '3.5rem', height: '3.5rem' }}>
          <Package style={{ width: '1.75rem', height: '1.75rem', color: 'var(--text-color-secondary)' }} />
        </div>
        <h3 className="text-lg font-semibold text-color mb-2">
          {error || t('noData')}
        </h3>
        <p className="text-sm text-color-secondary">
          {t('checkNumberAndRetry')}
        </p>
      </div>
    );
  }

  const statuses = [
    { key: 'pending', label: t('statusPending'), description: t('orderReceived'), icon: Clock, iconColor: '#3b82f6', bgColor: '#dbeafe', borderColor: '#3b82f6' },
    { key: 'to_delivery', label: t('readyToDeliver'), description: t('deliveryAssigned'), icon: Package, iconColor: '#f97316', bgColor: '#ffedd5', borderColor: '#f97316' },
    { key: 'in_delivery', label: t('statusInDelivery'), description: t('onTheWay'), icon: Truck, iconColor: '#eab308', bgColor: '#fef9c3', borderColor: '#eab308' },
    { key: 'delivered', label: t('statusDelivered'), description: t('deliveredSuccessfully'), icon: CheckCircle, iconColor: '#22c55e', bgColor: '#dcfce7', borderColor: '#22c55e' },
  ];

  if (orderStatus.status === 'canceled') {
    return (
      <div className="w-full">
        <div className="text-center p-4 border-round-xl border-1" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex align-items-center justify-content-center mx-auto mb-3 border-circle" style={{ width: '3.5rem', height: '3.5rem', background: '#fee2e2' }}>
            <CheckCircle style={{ width: '1.75rem', height: '1.75rem', color: '#dc2626' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#7f1d1d' }}>
            {t('orderCanceled')}
          </h3>
          <p className="text-sm" style={{ color: '#b91c1c' }}>
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
    <div className="w-full" dir={dir}>
      <div className="relative">
        {statuses.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const StatusIcon = status.icon;

          return (
            <div key={status.key} className="relative" style={{ paddingBottom: index < statuses.length - 1 ? '2rem' : 0 }}>
              {/* Connecting line */}
              {index < statuses.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    [dir === 'rtl' ? 'right' : 'left']: '1.25rem',
                    top: '3rem',
                    height: 'calc(100% - 0.5rem)',
                    width: '2px',
                    background: isCompleted ? 'linear-gradient(to bottom, var(--primary-color), rgba(var(--primary-color-rgb, 16,185,129), 0.3))' : '#e5e7eb',
                    transition: 'all 0.5s',
                  }}
                />
              )}

              <div className="relative flex align-items-start gap-3">
                {/* Icon */}
                <div
                  className="relative flex-shrink-0 flex align-items-center justify-content-center border-circle"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    zIndex: 1,
                    border: `2px solid ${isCompleted ? status.borderColor : '#d1d5db'}`,
                    background: isCompleted ? status.bgColor : '#ffffff',
                    boxShadow: isCompleted ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                    ...(isCurrent ? { boxShadow: `0 0 0 4px rgba(var(--primary-color-rgb, 16,185,129), 0.2)` } : {}),
                  }}
                >
                  <StatusIcon
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      color: isCompleted ? status.iconColor : '#9ca3af',
                      transition: 'color 0.5s',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1" style={{ minWidth: 0, paddingTop: '0.125rem' }}>
                  <div className="flex align-items-start justify-content-between gap-2">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: isCompleted ? 'var(--text-color)' : 'var(--text-color-secondary)', transition: 'color 0.5s' }}
                    >
                      {status.label}
                    </h3>
                    {isCompleted && (
                      <span className="white-space-nowrap flex-shrink-0 text-color-secondary" style={{ fontSize: '0.625rem' }}>
                        {formatDate(
                          status.key === 'pending'
                            ? orderStatus.createdAt
                            : status.key === 'to_delivery'
                              ? orderStatus.confirmedAt || orderStatus.createdAt
                              : status.key === 'in_delivery'
                                ? orderStatus.pickedUpAt || orderStatus.confirmedAt || orderStatus.createdAt
                                : status.key === 'delivered'
                                  ? orderStatus.deliveredAt || orderStatus.pickedUpAt || orderStatus.createdAt
                                  : orderStatus.createdAt
                        )}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: isCompleted ? 'var(--text-color-secondary)' : 'rgba(var(--text-color-secondary-rgb, 108,117,125), 0.6)', transition: 'color 0.5s' }}
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
        <div className="mt-4 p-3 border-round-xl border-1" style={{ background: 'linear-gradient(to right, rgba(var(--primary-color-rgb, 16,185,129), 0.1), rgba(var(--primary-color-rgb, 16,185,129), 0.05))', borderColor: 'rgba(var(--primary-color-rgb, 16,185,129), 0.2)' }}>
          <div className="flex align-items-center gap-2">
            <MapPin style={{ width: '1.125rem', height: '1.125rem', color: 'var(--primary-color)', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-medium text-color">
                {t('currentStatus')}
              </p>
              <p className="text-xs text-color-secondary mt-1">
                {statuses[currentStatusIndex].description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
