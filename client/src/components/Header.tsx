import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBell } from './NotificationBell';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { InputText } from 'primereact/inputtext';
import { toastInfo } from '@/services/toast.service';
import { OrderTracking } from './OrderTracking';
import { ShoppingBag, LogOut, User, Package, MapPin, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ordersService } from '@/modules/orders';

interface HeaderProps {
  onCartClick: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Header = ({ onCartClick }: HeaderProps) => {
  const { t, dir, language } = useLanguage();
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [showTracking, setShowTracking] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState('');
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const userMenuRef = useRef<Menu>(null);

  useEffect(() => {
    const checkActiveOrders = async () => {
      if (!user?.customerId) {
        setHasActiveOrders(false);
        return;
      }

      try {
        const response = await ordersService.getCustomerOrders(user.customerId, 10);
        if (response.success && response.orders) {
          const activeStatuses = ['pending', 'to_delivery', 'in_delivery'];
          const hasActive = response.orders.some(order =>
            !order.status || activeStatuses.includes(order.status)
          );
          setHasActiveOrders(hasActive);
        }
      } catch (error) {
        console.error('Failed to check active orders:', error);
        setHasActiveOrders(false);
      }
    };

    checkActiveOrders();
    const interval = setInterval(checkActiveOrders, 30000);
    return () => clearInterval(interval);
  }, [user?.customerId]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const iOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    if (iOS) {
      setCanInstall(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      if (isIOS) {
        toastInfo('To install on iOS, tap Share and choose "Add to Home Screen".');
      }
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
        setInstallPrompt(null);
      }
    } catch {
      setCanInstall(false);
      setInstallPrompt(null);
    }
  };

  const userMenuItems = [
    {
      label: user?.customerName || user?.phoneNumber || '',
      items: [
        {
          label: t('myOrders'),
          icon: 'pi pi-list',
          command: () => { window.location.href = '/my-orders'; },
        },
        {
          label: t('profile'),
          icon: 'pi pi-user',
          command: () => { window.location.href = '/profile'; },
        },
        {
          separator: true,
        },
        {
          label: t('disconnect'),
          icon: 'pi pi-sign-out',
          className: 'text-red-600',
          command: () => logout(),
        },
      ],
    },
  ];

  return (
    <header className="sticky surface-card border-bottom-1 surface-border shadow-1 w-full" style={{ top: 0, zIndex: 40 }}>
      <div className="px-3 sm:px-4 flex align-items-center justify-content-between" style={{ height: '3.5rem' }}>
        {/* Logo */}
        <Link to="/" className="flex align-items-center gap-2 no-underline" style={{ minWidth: 0 }}>
          <div
            className="flex align-items-center justify-content-center border-round-xl shadow-1 flex-shrink-0"
            style={{ width: '2.25rem', height: '2.25rem', background: 'linear-gradient(to bottom right, var(--primary-color), rgba(var(--primary-color-rgb,16,185,129),0.8))' }}
          >
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-lg font-bold text-color hidden sm:block" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('appName')}
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex align-items-center gap-2 flex-shrink-0">
          {canInstall && (
            <Button
              label="Install"
              size="small"
              onClick={handleInstallClick}
              style={{ background: '#d97706', borderColor: '#d97706' }}
            />
          )}
          {user?.customerId && <NotificationBell customerId={user.customerId} />}
          <LanguageToggle />

          {/* Track Order Button */}
          {hasActiveOrders && (
            <Button
              text
              rounded
              onClick={() => setShowTracking(true)}
              className="relative flex align-items-center justify-content-center border-circle"
              style={{ width: '2.5rem', height: '2.5rem', background: 'transparent', transition: 'background 0.2s', padding: 0 }}
              title={t('trackOrder')}
              aria-label={t('trackOrder')}
            >
              <Package style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
              <span className="absolute animate-pulse border-circle" style={{ top: '0.25rem', right: '0.25rem', width: '0.5rem', height: '0.5rem', background: '#3b82f6' }} />
            </Button>
          )}

          {/* User Menu */}
          <Menu model={userMenuItems} popup ref={userMenuRef} />
          <Button
            icon={<User style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-color)' }} />}
            text
            rounded
            onClick={(e) => userMenuRef.current?.toggle(e)}
            aria-label={t('profile')}
          />

          {/* Mobile Cart Button */}
          <Button
            text
            rounded
            onClick={onCartClick}
            className="relative flex align-items-center justify-content-center border-circle lg:hidden"
            style={{ width: '2.5rem', height: '2.5rem', background: 'transparent', padding: 0 }}
            aria-label={t('cart')}
          >
            <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-color)' }} />
            {itemCount > 0 && (
              <span
                className="absolute flex align-items-center justify-content-center border-round-xl font-bold"
                style={{
                  top: '-0.125rem',
                  insetInlineEnd: '-0.125rem',
                  minWidth: '1.125rem',
                  height: '1.125rem',
                  padding: '0 0.25rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  fontSize: '0.625rem',
                }}
              >
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Track Order Modal */}
      <Dialog
        visible={showTracking}
        onHide={() => setShowTracking(false)}
        header={
          <div className="flex align-items-center gap-2">
            <MapPin style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
            <span>{t('trackOrder')}</span>
          </div>
        }
        modal
        style={{ width: '95vw', maxWidth: '42rem' }}
        contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
      >
        <div className="mt-3">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">{t('orderNumber')}</label>
            <InputText
              value={trackingOrderNumber}
              onChange={(e) => setTrackingOrderNumber(e.target.value)}
              placeholder={t('enterOrderNumber')}
              className="w-full"
            />
          </div>
          {trackingOrderNumber && user?.customerId && (
            <>
              <div className="border-round-lg p-3 mb-3" style={{ background: 'var(--surface-100)' }}>
                <p className="text-xs text-color-secondary m-0">{t('orderNumber')}</p>
                <p className="font-bold text-primary m-0" style={{ fontFamily: 'monospace' }}>{trackingOrderNumber}</p>
              </div>
              <OrderTracking orderNumber={trackingOrderNumber} customerId={user.customerId} />
            </>
          )}
        </div>
      </Dialog>
    </header>
  );
};
