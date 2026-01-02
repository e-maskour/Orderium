import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageToggle } from './LanguageToggle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OrderTracking } from './OrderTracking';
import { ShoppingBag, LogOut, User, Package, MapPin, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { orderService } from '@/services/orderService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onCartClick: () => void;
}

export const Header = ({ onCartClick }: HeaderProps) => {
  const { t, dir, language } = useLanguage();
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [showTracking, setShowTracking] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState('');
  const [hasActiveOrders, setHasActiveOrders] = useState(false);

  // Check for active orders
  useEffect(() => {
    const checkActiveOrders = async () => {
      if (!user?.CustomerId) {
        setHasActiveOrders(false);
        return;
      }

      try {
        const response = await orderService.getCustomerOrders(user.CustomerId, 10);
        if (response.success && response.orders) {
          // Check if there are any orders with active status
          // Orders without DeliveryStatus or with pending/to_delivery/in_delivery are considered active
          const activeStatuses = ['pending', 'to_delivery', 'in_delivery'];
          const hasActive = response.orders.some(order => 
            !order.DeliveryStatus || activeStatuses.includes(order.DeliveryStatus)
          );
          setHasActiveOrders(hasActive);
        }
      } catch (error) {
        console.error('Failed to check active orders:', error);
        setHasActiveOrders(false);
      }
    };

    checkActiveOrders();
    // Recheck every 30 seconds
    const interval = setInterval(checkActiveOrders, 30000);
    return () => clearInterval(interval);
  }, [user?.CustomerId]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all flex-shrink-0">
            <span className="text-white font-bold text-lg sm:text-xl">O</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block truncate">
            {t('appName')}
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <LanguageToggle />
          
          {/* Track Order Button - Animated - Only show if there are active orders */}
          {hasActiveOrders && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTracking(true)}
              className="relative h-10 w-10 sm:h-11 sm:w-11 hover:bg-blue-50 group"
              title={t('trackOrder')}
            >
              <div className="absolute inset-0 bg-blue-500/10 rounded-full scale-0 group-hover:scale-100 transition-transform"></div>
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 relative z-10 group-hover:scale-110 transition-transform" />
              {/* Animated pulse indicator */}
              <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </Button>
          )}
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-11 sm:w-11 hover:bg-gray-100"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
              <DropdownMenuLabel>
                {user?.CustomerName || user?.PhoneNumber}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/my-orders'}>
                <List className="mr-2 h-4 w-4" />
                {t('myOrders')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                <User className="mr-2 h-4 w-4" />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                {t('disconnect')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            className="relative lg:hidden hover:bg-gray-100 h-10 w-10 sm:h-11 sm:w-11"
            aria-label={t('cart')}
          >
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 px-1 sm:px-1.5 bg-primary text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Track Order Modal */}
      <Dialog open={showTracking} onOpenChange={setShowTracking}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {t('trackOrder')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('enterOrderNumber')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('orderNumber')}
              </label>
              <input
                type="text"
                value={trackingOrderNumber}
                onChange={(e) => setTrackingOrderNumber(e.target.value)}
                placeholder={t('enterOrderNumber')}
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            {trackingOrderNumber && user?.CustomerId && (
              <>
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono font-bold text-primary">{trackingOrderNumber}</p>
                </div>
                <OrderTracking orderNumber={trackingOrderNumber} customerId={user.CustomerId} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};
