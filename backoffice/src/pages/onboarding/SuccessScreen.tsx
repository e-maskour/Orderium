import { useState } from 'react';
import { CheckCircle, Copy, ExternalLink, MessageCircle, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';

interface SuccessScreenProps {
  companyName: string;
  companyLogo?: string;
}

// Derive sibling portal URLs from the current hostname so tenant subdomains
// (e.g. demo.localhost) are preserved automatically.
function portalUrl(port: number): string {
  if (import.meta.env.PROD) {
    // In production, each portal has its own env var
    return '';
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${port}`;
}

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || window.location.origin;
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || portalUrl(3002);
const DELIVERY_URL = import.meta.env.VITE_DELIVERY_URL || portalUrl(3003);

interface PortalCard {
  labelKey: TranslationKey;
  url: string;
  icon: string;
}

function CopyButton({ text }: { text: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={t('copyUrl')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.375rem 0.625rem',
        borderRadius: '0.375rem',
        background: copied ? '#dcfce7' : '#f1f5f9',
        border: copied ? '1px solid #86efac' : '1px solid #e2e8f0',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: copied ? '#16a34a' : '#64748b',
        transition: 'all 0.15s',
      }}
    >
      <Copy size={12} />
      {copied ? t('onboardingCopied') : t('copy')}
    </button>
  );
}

function PortalLinkCard({ labelKey, url, icon }: PortalCard) {
  const { t } = useLanguage();
  const label = t(labelKey);
  const hasUrl = Boolean(url);

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '0.75rem',
        padding: '1rem',
        background: hasUrl ? '#fff' : '#f8fafc',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem' }}>{icon}</span>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {hasUrl && (
            <>
              <CopyButton text={url} />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.375rem 0.625rem',
                  borderRadius: '0.375rem',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={12} />
                {t('open')}
              </a>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: '0.8125rem',
          color: hasUrl ? '#235ae4' : '#94a3b8',
          wordBreak: 'break-all',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {hasUrl ? url : 'Configure VITE_CLIENT_URL / VITE_DELIVERY_URL in .env'}
      </div>
    </div>
  );
}

export default function SuccessScreen({ companyName, companyLogo }: SuccessScreenProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const portals: PortalCard[] = [
    { labelKey: 'onboardingAdminPanel', url: ADMIN_URL, icon: '🏢' },
    { labelKey: 'onboardingClientPortal', url: CLIENT_URL, icon: '👤' },
    { labelKey: 'onboardingDeliveryPortal', url: DELIVERY_URL, icon: '🚚' },
  ];

  const whatsappMessage = encodeURIComponent(
    `🎉 ${companyName} is now live on Morocom!\n\nAccess your portals:\n• Admin: ${ADMIN_URL}\n${CLIENT_URL ? `• Client: ${CLIENT_URL}\n` : ''}${DELIVERY_URL ? `• Delivery: ${DELIVERY_URL}` : ''}`,
  );

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Animated checkmark */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '5rem',
            height: '5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
            animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <CheckCircle size={36} style={{ color: '#fff' }} />
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
        {t('onboardingAllSet')}
      </h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        {t('onboardingSuccessSubtitle')
          .split('{company}')
          .flatMap((part, i) =>
            i === 0 ? [part] : [<strong key={i}>{companyName}</strong>, part],
          )}
      </p>

      {/* Company badge */}
      {companyLogo && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1rem',
            borderRadius: '0.75rem',
            background: '#f0f4ff',
            border: '1px solid #c7d7fd',
            marginBottom: '1.5rem',
          }}
        >
          <img
            src={companyLogo}
            alt={t('onboardingCompanyLogoAlt')}
            style={{
              height: '2rem',
              maxWidth: '6rem',
              objectFit: 'contain',
              borderRadius: '0.25rem',
            }}
          />
          <span style={{ fontWeight: 600, color: '#235ae4' }}>{companyName}</span>
        </div>
      )}

      {/* Portal links */}
      <div
        style={{
          textAlign: 'left',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.75rem',
          }}
        >
          {t('onboardingShareLinks')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {portals.map((p) => (
            <PortalLinkCard key={p.labelKey} {...p} />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          onClick={() => {
            navigate('/dashboard');
          }}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(35,90,228,0.4)',
          }}
        >
          <LayoutDashboard size={18} />
          {t('onboardingGoToDashboard')}
        </button>

        {(CLIENT_URL || DELIVERY_URL || ADMIN_URL) && (
          <a
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              padding: '0.875rem',
              borderRadius: '0.75rem',
              background: '#dcfce7',
              color: '#166534',
              fontWeight: 600,
              fontSize: '0.9375rem',
              border: '1px solid #bbf7d0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <MessageCircle size={18} />
            {t('onboardingShareWhatsapp')}
          </a>
        )}
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
