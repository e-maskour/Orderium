import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { Phone, MapPin, Package, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { SiGooglemaps, SiWaze } from 'react-icons/si';
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
      deliveryPerson ? deliveryService.updateOrderStatus(order.OrderId, status, deliveryPerson.Id) : Promise.reject('Not authenticated'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsUpdating(false);
    },
    onError: () => {
      setIsUpdating(false);
      alert(t('updateFailed'));
    },
  });

  const handleStatusUpdate = (status: 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled') => {
    setIsUpdating(true);
    updateStatusMutation.mutate(status);
  };

  const getStatusColor = () => {
    switch (order.Status) {
      case 'to_delivery': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'in_delivery': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'delivered': return 'bg-green-100 text-green-700 border border-green-200';
      case 'canceled': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getStatusLabel = () => {
    switch (order.Status) {
      case 'to_delivery': return t('toDeliveryStatus');
      case 'in_delivery': return t('inDeliveryStatus');
      case 'delivered': return t('deliveredStatus');
      case 'canceled': return t('canceledStatus');
      default: return order.Status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? 'ar-MA' : 'fr-MA';
    return date.toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-card border border-border overflow-hidden hover:shadow-medium transition-all">
      {/* Header */}
      <div className="p-2.5 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">#{order.OrderNumber}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(order.CreatedAt)}</p>
      </div>

      {/* Customer Info */}
      <div className="p-2.5 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
            <Package className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{order.CustomerName}</p>
            <a 
              href={`tel:${order.CustomerPhone}`}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
            >
              <Phone className="w-3 h-3" />
              {order.CustomerPhone}
            </a>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground flex-1">{order.CustomerAddress}</p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-1.5">
          <a
            href={order.GoogleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <SiGooglemaps className="w-3 h-3" />
            {t('googleMaps')}
          </a>
          <a
            href={order.WazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600 transition-colors"
          >
            <SiWaze className="w-3 h-3" />
            {t('waze')}
          </a>
        </div>

        {/* Order Summary */}
        <div className="border-t border-border pt-2 mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('orderSummary')}:</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('uniqueProducts')}</span>
              <span className="text-foreground font-medium">{order.Items.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('totalItems')}</span>
              <span className="text-foreground font-medium">
                {order.Items.reduce((sum, item) => sum + item.Quantity, 0)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-border">
              <span>{t('totalAmount')}</span>
              <span className="text-primary">{formatCurrency(order.TotalAmount, language)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {order.Status !== 'delivered' && order.Status !== 'canceled' && (
          <div className="border-t border-border pt-2 mt-2 space-y-1.5">
            {order.Status === 'to_delivery' && (
              <button
                onClick={() => handleStatusUpdate('in_delivery')}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 gradient-primary text-white rounded-lg text-xs font-medium hover:shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('updating')}
                  </>
                ) : (
                  <>
                    <Truck className="w-3 h-3" />
                    {t('startDelivery')}
                  </>
                )}
              </button>
            )}
            {order.Status === 'in_delivery' && (
              <button
                onClick={() => handleStatusUpdate('delivered')}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 hover:shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('updating')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    {t('markAsDelivered')}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
