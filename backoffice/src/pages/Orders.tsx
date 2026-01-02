import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, deliveryPersonService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Package, Phone, MapPin, X, Search } from 'lucide-react';
import { toast } from 'sonner';
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

export default function Orders() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [unassignOrderId, setUnassignOrderId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('all');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', searchQuery],
    queryFn: () => orderService.getAll(searchQuery),
  });

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      orderService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderAssigned'));
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToAssign')}: ${error.message}`);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => orderService.unassignOrder(orderId),
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_delivery': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'in_delivery': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'delivered': return 'bg-green-100 text-green-700 border border-green-200';
      case 'canceled': return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'to_delivery': return '📋';
      case 'in_delivery': return '🚚';
      case 'delivered': return '🎉';
      case 'canceled': return '❌';
      default: return '•';
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

  // Filter orders by status
  const filteredOrders = orders.filter((order: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unassigned') return !order.Status;
    return order.Status === statusFilter;
  });

  // Count orders by status
  const statusCounts = {
    all: orders.length,
    unassigned: orders.filter((o: any) => !o.Status).length,
    to_delivery: orders.filter((o: any) => o.Status === 'to_delivery').length,
    in_delivery: orders.filter((o: any) => o.Status === 'in_delivery').length,
    delivered: orders.filter((o: any) => o.Status === 'delivered').length,
    canceled: orders.filter((o: any) => o.Status === 'canceled').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-foreground hover:text-primary font-semibold flex items-center gap-2 transition-colors">
                <Package className="w-5 h-5" />
                ← {t('dashboard')}
              </Link>
              <h1 className="text-xl font-bold text-foreground">{t('orderManagement')}</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Search and Filter */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: t('all') },
              { key: 'unassigned', label: t('unassigned') },
              { key: 'to_delivery', label: t('toDelivery') },
              { key: 'in_delivery', label: t('inDelivery') },
              { key: 'delivered', label: t('delivered') },
              { key: 'canceled', label: t('canceled') }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === filter.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {filter.label}
                <span className={`ml-2 rtl:mr-2 rtl:ml-0 px-2 py-0.5 rounded-full text-xs ${
                  statusFilter === filter.key ? 'bg-primary-foreground/20' : 'bg-background'
                }`}>
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {ordersLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card rounded-lg shadow-card p-12 text-center border border-border">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">{t('noOrdersFound')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {statusFilter === 'all' 
                ? t('noOrdersFound')
                : `${t('noOrdersFound')}`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order: any) => (
              <div key={order.OrderId} className="bg-card rounded-lg shadow-card border border-border overflow-hidden hover:shadow-medium transition-all">
                {/* Card Header */}
                <div className="p-2.5 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">#{order.OrderNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(order.Status)}`}>
                      <span>{getStatusIcon(order.Status)}</span> <span>{getStatusLabel(order.Status)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-2.5 space-y-2">
                  {/* Customer */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{order.CustomerName}</p>
                      <a href={`tel:${order.CustomerPhone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {order.CustomerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {order.CustomerAddress && (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{order.CustomerAddress}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground">{t('total')}</span>
                      <span className="text-primary">{order.TotalAmount?.toFixed(2)} {t('currency')}</span>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="border-t border-border pt-2 mt-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {t('assignTo')}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={order.DeliveryPersonId || ''}
                        onChange={(e) => handleAssign(order.OrderId, e.target.value)}
                        className="flex-1 border border-input rounded-lg px-2 py-1.5 text-xs bg-background focus:ring-2 focus:ring-ring focus:border-input text-foreground"
                        disabled={order.Status === 'delivered'}
                      >
                        <option value="">{t('selectDeliveryPerson')}</option>
                        {deliveryPersons.filter((p: any) => p.IsActive).map((person: any) => (
                          <option key={person.Id} value={person.Id}>{person.Name}</option>
                        ))}
                      </select>
                      {order.DeliveryPersonId && (
                        <button
                          onClick={() => setUnassignOrderId(order.OrderId)}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground p-1.5 rounded-lg transition-colors"
                          title={t('unassign')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
