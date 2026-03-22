import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { toastError } from '../services/toast.service';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

export default function OrderCard({ order }: OrderCardProps) {
  const queryClient = useQueryClient();
  const { deliveryPerson } = useAuth();
  const { t, language } = useLanguage();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: (status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled') =>
      deliveryPerson ? deliveryService.updateOrderStatus(order.orderId, status, deliveryPerson.id) : Promise.reject('Not authenticated'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsUpdating(false);
    },
    onError: () => {
      setIsUpdating(false);
      toastError(t('updateFailed'));
    },
  });

  const handleStatusUpdate = (status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled') => {
    setIsUpdating(true);
    updateStatusMutation.mutate(status);
  };

  const getStatusSeverity = (): 'info' | 'warning' | 'success' | 'danger' | null => {
    switch (order.status) {
      case 'to_delivery': return 'info';
      case 'in_delivery': return 'warning';
      case 'delivered': return 'success';
      case 'canceled': return 'danger';
      default: return null;
    }
  };

  const getStatusLabel = () => {
    switch (order.status) {
      case 'to_delivery': return t('toDeliveryStatus');
      case 'in_delivery': return t('inDeliveryStatus');
      case 'delivered': return t('deliveredStatus');
      case 'canceled': return t('canceledStatus');
      default: return order.status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? 'ar-MA' : 'fr-MA';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="h-full">
      {/* Header */}
      <div className="flex align-items-center justify-content-between mb-2">
        <span className="text-sm" style={{ color: 'var(--orderium-text-muted)' }}>#{order.orderNumber}</span>
        <Tag value={getStatusLabel()} severity={getStatusSeverity()} rounded />
      </div>
      <div className="text-xs mb-3" style={{ color: 'var(--orderium-text-muted)' }}>{formatDate(order.createdAt)}</div>

      {/* Customer Info */}
      <div className="flex align-items-start gap-2 mb-2">
        <i className="pi pi-box text-white border-circle flex align-items-center justify-content-center" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.7rem', background: 'var(--orderium-primary)' }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{order.customerName}</div>
          <a href={`tel:${order.customerPhone}`} className="text-xs flex align-items-center gap-1 mt-1" style={{ color: 'var(--orderium-primary)' }}>
            <i className="pi pi-phone" style={{ fontSize: '0.7rem' }} />
            {order.customerPhone}
          </a>
        </div>
      </div>

      {/* Address */}
      <div className="flex align-items-start gap-2 mb-3">
        <i className="pi pi-map-marker border-circle flex align-items-center justify-content-center" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.7rem', color: 'var(--orderium-primary)', background: 'rgba(223, 120, 23, 0.1)' }} />
        <span className="text-xs flex-1" style={{ color: 'var(--orderium-text-muted)' }}>{order.customerAddress}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-2 mb-3">
        <a href={order.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button label={t('googleMaps')} icon="pi pi-map" severity="info" size="small" className="w-full text-xs" />
        </a>
        <a href={order.wazeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button label={t('waze')} icon="pi pi-directions" severity="help" size="small" className="w-full text-xs" />
        </a>
      </div>

      <Divider />

      {/* Order Summary */}
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--orderium-text-muted)' }}>{t('orderSummary')}:</div>
      <div className="flex justify-content-between text-xs mb-1">
        <span style={{ color: 'var(--orderium-text-muted)' }}>{t('uniqueProducts')}</span>
        <span className="font-medium">{order.items?.length || 0}</span>
      </div>
      <div className="flex justify-content-between text-xs mb-1">
        <span style={{ color: 'var(--orderium-text-muted)' }}>{t('totalItems')}</span>
        <span className="font-medium">{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</span>
      </div>
      <Divider />
      <div className="flex justify-content-between text-xs font-bold">
        <span>{t('totalAmount')}</span>
        <span style={{ color: 'var(--orderium-primary)' }}>{formatCurrency(order.totalAmount || 0, language)}</span>
      </div>

      {/* Action Buttons */}
      {order.status !== 'delivered' && order.status !== 'canceled' && (
        <div className="mt-3">
          {order.status === 'to_delivery' && (
            <Button
              label={isUpdating ? t('updating') : t('startDelivery')}
              icon={isUpdating ? 'pi pi-spin pi-spinner' : 'pi pi-truck'}
              className="w-full"
              size="small"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('in_delivery')}
            />
          )}
          {order.status === 'in_delivery' && (
            <Button
              label={isUpdating ? t('updating') : t('markAsDelivered')}
              icon={isUpdating ? 'pi pi-spin pi-spinner' : 'pi pi-check-circle'}
              severity="success"
              className="w-full"
              size="small"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('delivered')}
            />
          )}
        </div>
      )}
    </Card>
  );
}
