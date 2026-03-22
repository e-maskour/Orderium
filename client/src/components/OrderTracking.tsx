import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { ordersService } from '@/modules/orders';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface OrderTrackingProps {
  orderNumber: string;
  customerId: number;
}

interface OrderStatus {
  status: 'pending' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled';
  createdAt: Date;
}

const STEPS = [
  { key: 'pending', icon: Clock, color: '#3b82f6' },
  { key: 'to_delivery', icon: Package, color: '#f97316' },
  { key: 'in_delivery', icon: Truck, color: '#eab308' },
  { key: 'delivered', icon: CheckCircle, color: '#059669' },
] as const;

export const OrderTracking = ({ orderNumber, customerId }: OrderTrackingProps) => {
  const { t, language, dir } = useLanguage();
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!orderNumber || !customerId) { setIsLoading(false); return; }
      setIsLoading(true);
      setError(null);
      try {
        const order = await ordersService.getByOrderNumber(orderNumber, customerId);
        let status: OrderStatus['status'] = 'pending';
        if (order.status === 'delivered') status = 'delivered';
        else if (order.status === 'canceled') status = 'canceled';
        else if (order.status === 'in_transit' || order.status === 'in_delivery') status = 'in_delivery';
        else if (order.status === 'to_delivery') status = 'to_delivery';
        setOrderStatus({ status, createdAt: new Date(order.dateCreated) });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) setError(t('orderNotFound'));
        else setError(t('failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrderStatus();
  }, [orderNumber, customerId, language]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <ProgressSpinner style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  if (error || !orderStatus) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <Package size={36} color="#d1d5db" style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 700, color: '#374151', margin: '0 0 0.25rem' }}>{error || t('noData')}</p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{t('checkNumberAndRetry')}</p>
      </div>
    );
  }

  if (orderStatus.status === 'canceled') {
    return (
      <div style={{ background: '#fef2f2', borderRadius: '0.875rem', padding: '1.5rem', textAlign: 'center', border: '1px solid #fecaca' }} dir={dir}>
        <XCircle size={40} color="#dc2626" style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 700, color: '#7f1d1d', margin: '0 0 0.25rem', fontSize: '1rem' }}>{t('orderCanceled')}</p>
        <p style={{ fontSize: '0.875rem', color: '#b91c1c', margin: 0 }}>{t('orderWasCanceled')}</p>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex(s => s.key === orderStatus.status);
  const stepLabels: Record<string, string> = {
    pending: t('statusPending'),
    to_delivery: t('readyToDeliver'),
    in_delivery: t('statusInDelivery'),
    delivered: t('statusDelivered'),
  };

  return (
    <div dir={dir} style={{ padding: '0.5rem 0' }}>
      {/* Horizontal step track */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Connector lines */}
        {STEPS.map((_, i) => i < STEPS.length - 1 && (
          <div key={`line-${i}`} style={{
            position: 'absolute',
            top: '1.25rem',
            left: dir === 'rtl' ? undefined : `calc(${(i / (STEPS.length - 1)) * 100}% + 1.25rem)`,
            right: dir === 'rtl' ? `calc(${(i / (STEPS.length - 1)) * 100}% + 1.25rem)` : undefined,
            width: `calc(${100 / (STEPS.length - 1)}% - 2.5rem)`,
            height: '3px',
            background: i < currentIndex ? '#059669' : '#e5e7eb',
            borderRadius: '9999px',
            transition: 'background 0.4s',
            zIndex: 0,
          }} />
        ))}

        {/* Steps */}
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const StepIcon = step.icon;
          const dotColor = isCompleted ? '#059669' : isCurrent ? step.color : '#e5e7eb';
          const textColor = isCompleted || isCurrent ? '#0f172a' : '#9ca3af';
          const iconColor = isCompleted ? 'white' : isCurrent ? 'white' : '#9ca3af';
          const dotBg = isCompleted ? '#059669' : isCurrent ? step.color : '#f3f4f6';

          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '2.75rem', height: '2.75rem', borderRadius: '50%',
                background: dotBg,
                border: `3px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isCurrent ? `0 0 0 5px ${step.color}22` : 'none',
                transition: 'all 0.4s',
              }}>
                <StepIcon size={16} color={iconColor} strokeWidth={2.5} />
              </div>
              <p style={{
                margin: '0.5rem 0 0', fontSize: '0.6875rem', fontWeight: isCurrent ? 800 : 600,
                color: textColor, textAlign: 'center', lineHeight: 1.3,
                transition: 'color 0.4s',
              }}>
                {stepLabels[step.key]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current status description */}
      {currentIndex >= 0 && (
        <div style={{ marginTop: '1.5rem', background: `${STEPS[currentIndex].color}14`, borderRadius: '0.875rem', padding: '0.875rem 1rem', border: `1px solid ${STEPS[currentIndex].color}30` }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
            {stepLabels[STEPS[currentIndex].key]}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
            {t('orderReceived')} · {new Date(orderStatus.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-MA', { day: '2-digit', month: 'long' })}
          </p>
        </div>
      )}
    </div>
  );
};
