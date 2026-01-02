import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import OrderCard from '../components/OrderCard';
import { Loader2, Package, LogOut, Search } from 'lucide-react';
import type { Order } from '../types';

export default function Orders() {
  const { deliveryPerson, logout } = useAuth();
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<'all' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('to_delivery');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders', deliveryPerson?.Id, searchQuery],
    queryFn: () => deliveryPerson ? deliveryService.getMyOrders(deliveryPerson.Id, searchQuery) : Promise.resolve([]),
    enabled: !!deliveryPerson,
  });

  const filteredOrders = orders?.filter((order: Order) => 
    statusFilter === 'all' || order.Status === statusFilter
  ) || [];

  const statusCounts = {
    all: orders?.length || 0,
    to_delivery: orders?.filter((o: Order) => o.Status === 'to_delivery').length || 0,
    in_delivery: orders?.filter((o: Order) => o.Status === 'in_delivery').length || 0,
    delivered: orders?.filter((o: Order) => o.Status === 'delivered').length || 0,
    canceled: orders?.filter((o: Order) => o.Status === 'canceled').length || 0,
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'to_delivery': return t('toDelivery');
      case 'in_delivery': return t('inDelivery');
      case 'delivered': return t('delivered');
      case 'canceled': return t('canceled');
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">O</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('myDeliveries')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('welcomeBack')}, {deliveryPerson?.Name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchOrders')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: t('allOrders') },
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
                    ? 'gradient-primary text-white shadow-soft'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {filter.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  statusFilter === filter.key ? 'bg-white/20' : 'bg-background'
                }`}>
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
            <p className="text-destructive">{t('error')}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('noOrdersFound')}</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all' 
                ? t('noOrdersAssigned')
                : t('noOrdersMessage').replace('{status}', getStatusLabel(statusFilter))
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order: Order) => (
              <OrderCard key={order.OrderId} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
