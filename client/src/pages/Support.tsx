import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useCompany } from '@/hooks/useCompany';
import { formatCompanyAddress } from '@/modules/company';
import { resolveMediaUrl } from '@/lib/media';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';

/**
 * Builds a `wa.me` number from a configured phone. WhatsApp wants digits only
 * with the country code, while the back-office usually stores the local
 * Moroccan form (`06XXXXXXXX`) — promote those to `212…`.
 */
const toWhatsAppNumber = (phone: string): string | null => {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `212${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
};

/** Company websites are often saved without a scheme; `href` needs one. */
const toWebsiteUrl = (website: string): string =>
  /^https?:\/\//i.test(website) ? website : `https://${website}`;

interface ContactAction {
  key: string;
  href: string;
  external: boolean;
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  tint: string;
}

export default function Support() {
  const { t, dir } = useLanguage();
  const { isCartOpen, closeCart } = useCart();
  const { company, loading } = useCompany();

  const BackIcon: LucideIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const whatsappNumber = company?.phone ? toWhatsAppNumber(company.phone) : null;

  const actions: ContactAction[] = [];
  if (company?.phone) {
    actions.push({
      key: 'call',
      href: `tel:${company.phone.replace(/\s/g, '')}`,
      external: false,
      icon: Phone,
      label: t('callAction'),
      value: company.phone,
      color: '#059669',
      tint: '#ecfdf5',
    });
  }
  if (whatsappNumber) {
    actions.push({
      key: 'whatsapp',
      href: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        t('supportWhatsappMessage'),
      )}`,
      external: true,
      icon: MessageCircle,
      label: t('whatsappAction'),
      value: company?.phone ?? '',
      color: '#25d366',
      tint: '#f0fdf4',
    });
  }
  if (company?.email) {
    actions.push({
      key: 'email',
      href: `mailto:${company.email}`,
      external: false,
      icon: Mail,
      label: t('emailAction'),
      value: company.email,
      color: '#2563eb',
      tint: '#eff6ff',
    });
  }
  if (company?.website) {
    actions.push({
      key: 'website',
      href: toWebsiteUrl(company.website),
      external: true,
      icon: Globe,
      label: t('websiteAction'),
      value: company.website,
      color: '#7c3aed',
      tint: '#f5f3ff',
    });
  }

  const logoUrl = resolveMediaUrl(company?.logo);
  const address = company ? formatCompanyAddress(company) : null;

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        paddingBottom: '5rem',
      }}
    >
      {/* Gradient header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #15803d 0%, #059669 100%)',
          padding: '1rem 1.25rem 3.5rem',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/"
            aria-label={t('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              textDecoration: 'none',
              color: 'white',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <BackIcon size={18} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Headset size={26} strokeWidth={2.5} style={{ color: '#fff', flexShrink: 0 }} />
            <h1
              style={{
                color: '#fff',
                fontSize: '1.5rem',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              {t('support')}
            </h1>
          </div>
        </div>
      </div>

      {/* Content — overlaps header */}
      <div
        style={{
          padding: '0 1rem',
          marginTop: '-2.25rem',
          maxWidth: '40rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}
      >
        {/* Company identity card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '18px',
            padding: '1.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={company?.companyName ?? ''}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Building2 size={26} color="#059669" />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 800,
                color: '#111827',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? t('loading') : (company?.companyName ?? t('appName'))}
            </h2>
            <p
              style={{
                margin: '0.25rem 0 0',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#6b7280',
                lineHeight: 1.4,
              }}
            >
              {company?.professions ?? t('supportIntro')}
            </p>
          </div>
        </div>

        {/* Contact actions */}
        {!loading && (
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            }}
          >
            <div
              style={{
                padding: '0.875rem 1.125rem',
                borderBottom: '1px solid #f3f4f6',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: '#9ca3af',
              }}
            >
              {t('contactUs')}
            </div>

            {actions.length === 0 && (
              <p
                style={{
                  margin: 0,
                  padding: '1.25rem 1.125rem',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                {company ? t('noContactDetails') : t('companyUnavailable')}
              </p>
            )}

            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.key}
                  href={action.href}
                  {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.125rem',
                    textDecoration: 'none',
                    borderBottom: index < actions.length - 1 ? '1px solid #f3f4f6' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: action.tint,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={action.color} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
                      {action.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                        direction: 'ltr' as const,
                        textAlign: dir === 'rtl' ? ('right' as const) : ('left' as const),
                      }}
                    >
                      {action.value}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Address */}
        {!loading && address && (
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              padding: '1rem 1.125rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fff7ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={18} color="#ea580c" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
                {t('address')}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: '#6b7280',
                  lineHeight: 1.5,
                  marginTop: '0.125rem',
                }}
              >
                {address}
              </div>
            </div>
          </div>
        )}
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} isPanelMode={false} />
      <BottomNav />
    </div>
  );
}
