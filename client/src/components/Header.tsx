import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBell } from './NotificationBell';
import { ShoppingBag, ClipboardList, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import orderiumLogo from '../assets/logo-client.svg';

interface HeaderProps {
  onCartClick?: () => void;
}

export const Header = ({ onCartClick }: HeaderProps) => {
  const { t, dir } = useLanguage();
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();

  const handleCartClick = onCartClick ?? openCart;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          height: '3.75rem',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}
        >
          <img
            src={orderiumLogo}
            alt="Morocom"
            style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0 }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: '1.125rem',
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
            className="hidden sm:block"
          >
            {t('appName')}
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: '0.25rem' }}>
          <Link
            to="/my-orders"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.875rem', borderRadius: '0.625rem',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem',
              color: '#374151', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ClipboardList size={16} />
            {t('myOrders')}
          </Link>
          <Link
            to="/profile"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.875rem', borderRadius: '0.625rem',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem',
              color: '#374151', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <User size={16} />
            {t('profile')}
          </Link>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {user?.customerId && <NotificationBell customerId={user.customerId} />}
          <LanguageToggle />

          {/* Cart button — desktop only (mobile uses bottom nav FAB) */}
          <button
            onClick={handleCartClick}
            aria-label={t('cart')}
            className="lg:hidden"
            style={{
              position: 'relative',
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: itemCount > 0 ? 'rgba(5,150,105,0.08)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ShoppingBag
              size={20}
              color={itemCount > 0 ? '#059669' : '#6b7280'}
            />
            {itemCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  minWidth: '1.125rem',
                  height: '1.125rem',
                  padding: '0 0.2rem',
                  borderRadius: '9999px',
                  background: '#059669',
                  color: 'white',
                  fontSize: '0.5625rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
