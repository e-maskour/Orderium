import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Truck, Phone, Lock, Eye, EyeOff, AlertTriangle, Zap } from 'lucide-react';
import { LanguageToggle } from '../components/LanguageToggle';

const PRI = '#df7817';
const PRI_DARK = '#b86314';
const PRI_DEEP = '#7c420d';

export default function Login() {
  const [credentials, setCredentials] = useState({ phoneNumber: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(credentials);
      navigate('/orders');
    } catch {
      setError(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes dlv-spin { to { transform: rotate(360deg); } }
        .dlv-field-input:focus { border-color: ${PRI} !important; box-shadow: 0 0 0 3px rgba(223,120,23,0.14) !important; outline: none; }
        .dlv-submit-btn:active:not(:disabled) { transform: scale(0.97); }
        * { box-sizing: border-box; }
        html, body { overflow: hidden; height: 100%; margin: 0; }
      `}</style>

      <div dir={dir} style={{
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}>
        {/* ── Top brand section ── */}
        <div style={{
          background: `linear-gradient(160deg, ${PRI_DEEP} 0%, ${PRI_DARK} 48%, ${PRI} 100%)`,
          padding: '3.5rem 1.5rem 5.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Language toggle */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}>
            <LanguageToggle />
          </div>

          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '20px', left: '-60px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          {/* Logo icon */}
          <div style={{
            width: '90px', height: '90px',
            borderRadius: '26px',
            background: 'rgba(255,255,255,0.18)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.22)',
            position: 'relative', zIndex: 1,
          }}>
            <Truck size={44} color="#fff" strokeWidth={2} />
          </div>

          <h1 style={{ color: '#fff', fontSize: '2.4rem', fontWeight: 900, margin: '0', letterSpacing: '-0.5px', lineHeight: 1.05, position: 'relative', zIndex: 1 }}>
            Orderium
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', margin: '0.5rem 0 0', fontSize: '1.05rem', fontWeight: 500, position: 'relative', zIndex: 1 }}>
            {t('deliveryPortal')}
          </p>

          {/* Wave cutout */}
          <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0 }}>
            <svg viewBox="0 0 390 54" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '54px' }}>
              <path d="M0,28 C120,58 270,2 390,28 L390,54 L0,54 Z" fill="#ffffff" />
            </svg>
          </div>
        </div>

        {/* ── Form section ── */}
        <div style={{
          flex: 1,
          padding: '2rem 1.5rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '480px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('welcomeBack')} <Zap size={22} color={PRI} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          </h2>
          <p style={{ color: '#6b7280', margin: '0 0 2rem', fontSize: '0.95rem', lineHeight: 1.55 }}>
            {t('loginSignInDesc')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Phone number */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {t('phoneNumber')}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  className="dlv-field-input"
                  type="tel"
                  autoComplete="tel"
                  value={credentials.phoneNumber}
                  onChange={e => { setCredentials(p => ({ ...p, phoneNumber: e.target.value })); setError(''); }}
                  placeholder={t('enterPhoneNumber')}
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '56px',
                    paddingLeft: '2.875rem',
                    paddingRight: '1rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    background: '#f9fafb',
                    color: '#111827',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.18s',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {t('password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  className="dlv-field-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={e => { setCredentials(p => ({ ...p, password: e.target.value })); setError(''); }}
                  placeholder={t('enterPassword')}
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '56px',
                    paddingLeft: '2.875rem',
                    paddingRight: '3.5rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    background: '#f9fafb',
                    color: '#111827',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.18s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: '0.375rem',
                    cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', padding: '0.875rem 1rem',
                borderRadius: '12px', fontSize: '0.9rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="dlv-submit-btn"
              style={{
                height: '58px',
                width: '100%',
                background: isLoading
                  ? 'rgba(223,120,23,0.55)'
                  : `linear-gradient(135deg, ${PRI} 0%, ${PRI_DARK} 100%)`,
                color: '#fff',
                fontSize: '1.1rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(223,120,23,0.4)',
                transition: 'box-shadow 0.18s, transform 0.15s',
                marginTop: '0.5rem',
                WebkitTapHighlightColor: 'transparent',
                letterSpacing: '0.02em',
              }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    border: '2.5px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    animation: 'dlv-spin 0.75s linear infinite',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  {t('loading')}
                </>
              ) : (
                <>
                  <Truck size={22} strokeWidth={2.5} />
                  {t('login')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
