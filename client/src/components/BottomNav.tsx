import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { Home, ClipboardList, ShoppingBag, Settings, User } from 'lucide-react';

export const BottomNav = () => {
  const { t, dir } = useLanguage();
  const { itemCount, openCart } = useCart();
  const location = useLocation();

  const tabs = [
    { to: '/', icon: Home, label: t('catalog') || 'Catalogue' },
    { to: '/my-orders', icon: ClipboardList, label: t('orders') || 'Commandes' },
  ];

  return (
    <nav
      className="cl-bottom-nav lg:hidden"
      dir={dir}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4.25rem',
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {/* Home tab */}
      <Link
        to="/"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          padding: '0.5rem 0',
          textDecoration: 'none',
          color: location.pathname === '/' ? '#059669' : '#9ca3af',
          fontWeight: 600,
          fontSize: '0.625rem',
          letterSpacing: '0.02em',
          transition: 'color 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Home
          size={22}
          strokeWidth={location.pathname === '/' ? 2.5 : 2}
          style={{ transition: 'stroke-width 0.15s' }}
        />
        <span>{tabs[0].label}</span>
      </Link>

      {/* Orders tab */}
      <Link
        to="/my-orders"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          padding: '0.5rem 0',
          textDecoration: 'none',
          color: location.pathname === '/my-orders' ? '#059669' : '#9ca3af',
          fontWeight: 600,
          fontSize: '0.625rem',
          letterSpacing: '0.02em',
          transition: 'color 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ClipboardList size={22} strokeWidth={location.pathname === '/my-orders' ? 2.5 : 2} />
        <span>{tabs[1].label}</span>
      </Link>

      {/* Cart FAB — center raised button */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button
          onClick={openCart}
          aria-label={t('cart') || 'Panier'}
          style={{
            position: 'relative',
            width: '3.25rem',
            height: '3.25rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669, #047857)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(5,150,105,0.45)',
            transform: 'translateY(-8px)',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onTouchStart={(e) => (e.currentTarget.style.transform = 'translateY(-6px) scale(0.95)')}
          onTouchEnd={(e) => (e.currentTarget.style.transform = 'translateY(-8px) scale(1)')}
        >
          <ShoppingBag size={22} color="white" />
          {itemCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-0.125rem',
                right: '-0.125rem',
                minWidth: '1.25rem',
                height: '1.25rem',
                padding: '0 0.25rem',
                borderRadius: '9999px',
                background: '#ef4444',
                color: 'white',
                fontSize: '0.625rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                lineHeight: 1,
              }}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Settings tab */}
      <Link
        to="/settings"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          padding: '0.5rem 0',
          textDecoration: 'none',
          color: location.pathname === '/settings' ? '#059669' : '#9ca3af',
          fontWeight: 600,
          fontSize: '0.625rem',
          letterSpacing: '0.02em',
          transition: 'color 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Settings size={22} strokeWidth={location.pathname === '/settings' ? 2.5 : 2} />
        <span>{t('settings')}</span>
      </Link>

      {/* Profile tab */}
      <Link
        to="/profile"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          padding: '0.5rem 0',
          textDecoration: 'none',
          color: location.pathname === '/profile' ? '#059669' : '#9ca3af',
          fontWeight: 600,
          fontSize: '0.625rem',
          letterSpacing: '0.02em',
          transition: 'color 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <User size={22} strokeWidth={location.pathname === '/profile' ? 2.5 : 2} />
        <span>{t('profile') || 'Profil'}</span>
      </Link>
    </nav>
  );
};
