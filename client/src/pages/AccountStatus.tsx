import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, ShieldX, RefreshCw, ArrowLeft, ArrowRight, Phone } from 'lucide-react';
import { notify } from '@orderium/ui';
import { useLanguage } from '@/context/LanguageContext';
import {
  authService,
  AccountStatus as Status,
  getPendingPhone,
  clearPendingPhone,
} from '@/modules/auth';
import { formatPhone } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import orderiumLogo from '../assets/logo-client.svg';

const PRI = '#059669';
const PRI_DARK = '#047857';
const PRI_DEEP = '#064e3b';

interface AccountStatusState {
  status?: Status;
  phone?: string;
  name?: string;
}

/**
 * Landing screen for an account that cannot log in yet: freshly registered
 * (pending admin approval) or turned down. Reachable without a token — the
 * phone number is carried in router state and mirrored to localStorage so a
 * reload or a later visit comes back here instead of the login form.
 */
export default function AccountStatus() {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: AccountStatusState | null };

  const phone = state?.phone ?? getPendingPhone() ?? '';
  const [status, setStatus] = useState<Status>(state?.status ?? 'pending');
  const [name, setName] = useState(state?.name ?? '');
  const [isChecking, setIsChecking] = useState(false);

  const isRejected = status === 'rejected';
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const goToLogin = useCallback(() => {
    clearPendingPhone();
    navigate('/login', { replace: true });
  }, [navigate]);

  const refreshStatus = useCallback(
    async (announce: boolean) => {
      if (!phone) return;
      setIsChecking(true);
      try {
        const result = await authService.checkPhoneExists(phone);
        if (result.name) setName(result.name);
        const current = (result.status as Status | undefined) ?? 'pending';
        if (current === 'approved') {
          clearPendingPhone();
          notify.success(t('accountApprovedToast'));
          navigate('/login', { replace: true });
          return;
        }
        setStatus(current);
        if (announce && current === 'pending') {
          notify.info(t('stillPending'));
        }
      } finally {
        setIsChecking(false);
      }
    },
    [phone, navigate, t],
  );

  // No phone to report on — nothing to show, send the visitor back to login.
  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
      return;
    }
    void refreshStatus(false);
  }, [phone, navigate, refreshStatus]);

  return (
    <>
      <style>{`
        @keyframes clt-spin { to { transform: rotate(360deg); } }
        .clt-status-btn:active:not(:disabled) { transform: scale(0.97); }
        * { box-sizing: border-box; }
        html, body { overflow: hidden; height: 100%; margin: 0; }
      `}</style>

      <div
        dir={dir}
        style={{
          height: '100dvh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {/* ── Top brand section ── */}
        <div
          style={{
            background: `linear-gradient(160deg, ${PRI_DEEP} 0%, ${PRI_DARK} 48%, ${PRI} 100%)`,
            padding: '3rem 1.5rem 5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}>
            <LanguageToggle variant="dark" />
          </div>

          <div
            style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }}
          />

          <img
            src={orderiumLogo}
            alt="Morocom"
            style={{
              width: '72px',
              height: '72px',
              marginBottom: '1rem',
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.22))',
            }}
          />
          <h1
            style={{
              color: '#fff',
              fontSize: '2rem',
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.5px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            Morocom
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.78)',
              margin: '0.4rem 0 0',
              fontSize: '1rem',
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {t('clientPortal')}
          </p>

          <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0 }}>
            <svg
              viewBox="0 0 390 54"
              preserveAspectRatio="none"
              style={{ display: 'block', width: '100%', height: '54px' }}
            >
              <path d="M0,28 C120,58 270,2 390,28 L390,54 L0,54 Z" fill="#ffffff" />
            </svg>
          </div>
        </div>

        {/* ── Status card ── */}
        <div
          style={{
            flex: 1,
            padding: '1.5rem 1.5rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '480px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              padding: '2rem 1.5rem',
              borderRadius: '20px',
              background: isRejected ? '#fef2f2' : '#fffbeb',
              border: `1.5px solid ${isRejected ? '#fecaca' : '#fde68a'}`,
            }}
          >
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '50%',
                background: isRejected ? '#fee2e2' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isRejected ? (
                <ShieldX size={34} color="#dc2626" strokeWidth={2} />
              ) : (
                <Clock size={34} color="#d97706" strokeWidth={2} />
              )}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '1.375rem',
                fontWeight: 800,
                color: isRejected ? '#991b1b' : '#92400e',
              }}
            >
              {isRejected ? t('accountRejectedTitle') : t('accountPendingTitle')}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                color: isRejected ? '#b91c1c' : '#a16207',
              }}
            >
              {isRejected ? t('accountRejectedDesc') : t('accountPendingDesc')}
            </p>

            {name && (
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
                {name}
              </span>
            )}

            {phone && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '999px',
                  padding: '0.4rem 0.875rem',
                }}
              >
                <Phone size={14} color="#6b7280" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                  {formatPhone(phone)}
                </span>
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}
          >
            {!isRejected && (
              <button
                type="button"
                onClick={() => void refreshStatus(true)}
                disabled={isChecking}
                className="clt-status-btn"
                style={{
                  height: '56px',
                  width: '100%',
                  background: isChecking
                    ? 'rgba(5,150,105,0.55)'
                    : `linear-gradient(135deg, ${PRI} 0%, ${PRI_DARK} 100%)`,
                  color: '#fff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '16px',
                  cursor: isChecking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  boxShadow: isChecking ? 'none' : '0 4px 20px rgba(5,150,105,0.4)',
                  transition: 'box-shadow 0.18s, transform 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <RefreshCw
                  size={20}
                  strokeWidth={2.5}
                  style={isChecking ? { animation: 'clt-spin 0.9s linear infinite' } : undefined}
                />
                {isChecking ? t('verifying') : t('checkAgain')}
              </button>
            )}

            {isRejected && (
              <p
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  lineHeight: 1.6,
                }}
              >
                {t('contactSupport')}
              </p>
            )}

            <button
              type="button"
              onClick={goToLogin}
              className="clt-status-btn"
              style={{
                height: '52px',
                width: '100%',
                background: '#f9fafb',
                color: '#374151',
                fontSize: '1rem',
                fontWeight: 600,
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'transform 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <BackIcon size={18} strokeWidth={2.5} />
              {t('backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
