import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/modules/auth';
import { LanguageToggle } from '@/components/LanguageToggle';
import orderiumLogo from '../assets/logo-client.svg';
import { ShoppingCart, Phone, Lock, Eye, EyeOff, Loader2, Clock, ShieldX, HandMetal, AlertTriangle } from 'lucide-react';
import { toastSuccess, toastError } from '@/services/toast.service';
import { useNavigate } from 'react-router-dom';

const PRI = '#059669';
const PRI_DARK = '#047857';
const PRI_DEEP = '#064e3b';

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+2126')) return '0' + cleaned.slice(4);
    if (cleaned.startsWith('2126')) return '0' + cleaned.slice(3);
    return cleaned;
  };

  const isValidMoroccanPhone = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    return /^0[67]\d{8}$/.test(normalized);
  };

  useEffect(() => {
    const checkPhone = async () => {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      if (isValidMoroccanPhone(formData.phone)) {
        setIsCheckingPhone(true);
        try {
          const result = await authService.checkPhoneExists(normalizedPhone);
          setPhoneExists(result.exists);
          setCustomerName(result.customerName || '');
          setCustomerId(result.customerId);
          setAccountStatus(result.status ?? null);
        } catch (error) {
          setPhoneExists(false);
          setCustomerName('');
          setCustomerId(undefined);
          setAccountStatus(null);
        } finally {
          setIsCheckingPhone(false);
        }
      } else {
        setPhoneExists(null);
        setCustomerName('');
        setCustomerId(undefined);
        setAccountStatus(null);
      }
    };
    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

  const validateForm = () => {
    const newErrors = { phone: '', password: '' };
    let isValid = true;

    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneNumberRequired');
      isValid = false;
    } else if (!isValidMoroccanPhone(formData.phone)) {
      newErrors.phone = t('phoneNumberInvalidFormat');
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired');
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('passwordMinLength');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      if (phoneExists === false) {
        await register({ phoneNumber: normalizedPhone, password: formData.password, customerId, isCustomer: true });
        setAccountStatus('pending');
        toastSuccess(t('accountCreatedPending'));
      } else {
        await login({ phoneNumber: normalizedPhone, password: formData.password });
        toastSuccess(t('loginSuccess'));
      }
    } catch (error: unknown) {
      console.error('Authentication failed:', error);
      // Parse API error body to detect pending/rejected status
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('403')) {
        try {
          const bodyJson = errMsg.substring(errMsg.indexOf('{'));
          const body = JSON.parse(bodyJson);
          if (body.message?.toLowerCase().includes('pending')) {
            setAccountStatus('pending');
            return;
          }
          if (body.message?.toLowerCase().includes('rejected')) {
            setAccountStatus('rejected');
            return;
          }
        } catch { /* couldn't parse, fall through */ }
        setAccountStatus('pending');
      } else {
        toastError(phoneExists === false ? t('registrationFailed') : t('loginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isNewAccount = phoneExists === false;
  const isExistingAccount = phoneExists === true;

  const headingText = isCheckingPhone
    ? t('verifying')
    : isNewAccount
      ? t('createNewAccount')
      : isExistingAccount
        ? t('login')
        : t('appAccess');

  const subText = isNewAccount
    ? t('createPasswordForNewAccount')
    : isExistingAccount
      ? t('enterPasswordToContinue')
      : t('enterPhoneToStart');

  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <style>{`
        @keyframes clt-spin { to { transform: rotate(360deg); } }
        .clt-field-input:focus { border-color: ${PRI} !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.14) !important; outline: none; }
        .clt-submit-btn:active:not(:disabled) { transform: scale(0.97); }
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
          <img
            src={orderiumLogo}
            alt="Orderium"
            style={{
              width: '90px',
              height: '90px',
              marginBottom: '1.25rem',
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.22))',
            }}
          />

          <h1 style={{ color: '#fff', fontSize: '2.4rem', fontWeight: 900, margin: '0', letterSpacing: '-0.5px', lineHeight: 1.05, position: 'relative', zIndex: 1 }}>
            Orderium
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', margin: '0.5rem 0 0', fontSize: '1.05rem', fontWeight: 500, position: 'relative', zIndex: 1 }}>
            {t('clientPortal')}
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '0 0 0.4rem', display: 'flex', alignItems: 'center' }}>
            {headingText}{isExistingAccount && <HandMetal size={20} color={PRI} strokeWidth={2} style={{ marginLeft: '0.4rem', flexShrink: 0 }} />}
          </h2>
          {isExistingAccount && customerName && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: '#ecfdf5', border: '1px solid #a7f3d0',
              borderRadius: '0.75rem', padding: '0.4rem 0.875rem', marginBottom: '0.5rem',
              width: 'fit-content',
            }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: PRI_DARK }}>{customerName}</span>
            </div>
          )}
          <p style={{ color: '#6b7280', margin: '0 0 2rem', fontSize: '0.95rem', lineHeight: 1.55 }}>
            {subText}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Account status banner */}
            {(accountStatus === 'pending' || accountStatus === 'rejected') && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '1rem 1.125rem',
                borderRadius: '12px',
                background: accountStatus === 'pending' ? '#fffbeb' : '#fef2f2',
                border: `1.5px solid ${accountStatus === 'pending' ? '#fde68a' : '#fecaca'}`,
              }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', flexShrink: 0,
                  background: accountStatus === 'pending' ? '#fef3c7' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {accountStatus === 'pending'
                    ? <Clock style={{ width: '1.125rem', height: '1.125rem', color: '#d97706' }} />
                    : <ShieldX style={{ width: '1.125rem', height: '1.125rem', color: '#dc2626' }} />
                  }
                </div>
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.875rem', color: accountStatus === 'pending' ? '#92400e' : '#991b1b' }}>
                    {accountStatus === 'pending' ? t('accountPendingTitle') : t('accountRejectedTitle')}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.5, color: accountStatus === 'pending' ? '#a16207' : '#b91c1c' }}>
                    {accountStatus === 'pending' ? t('accountPendingDesc') : t('accountRejectedDesc')}
                  </p>
                </div>
              </div>
            )}

            {/* Phone number */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {t('phoneNumber')}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  className="clt-field-input"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={e => { setFormData({ ...formData, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
                  placeholder={t('phonePlaceholder')}
                  disabled={isLoading}
                  style={{
                    width: '100%', height: '56px',
                    paddingLeft: '2.875rem', paddingRight: '1rem',
                    fontSize: '1rem', fontWeight: 500,
                    border: errors.phone ? '2px solid #ef4444' : '2px solid #e5e7eb',
                    borderRadius: '14px', background: '#f9fafb', color: '#111827',
                    boxSizing: 'border-box', transition: 'border-color 0.18s',
                  }}
                />
              </div>
              {isCheckingPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.375rem' }}>
                  <Loader2 style={{ width: '0.875rem', height: '0.875rem', color: PRI, animation: 'clt-spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('verifying')}…</span>
                </div>
              )}
              {errors.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.3rem' }}>
                  <AlertTriangle size={14} color='#ef4444' strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.phone}</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {isNewAccount ? t('createPassword') : t('password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  className="clt-field-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isNewAccount ? 'new-password' : 'current-password'}
                  value={formData.password}
                  onChange={e => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                  placeholder="••••••"
                  disabled={isLoading}
                  style={{
                    width: '100%', height: '56px',
                    paddingLeft: '2.875rem', paddingRight: '3.5rem',
                    fontSize: '1rem', fontWeight: 500,
                    border: errors.password ? '2px solid #ef4444' : '2px solid #e5e7eb',
                    borderRadius: '14px', background: '#f9fafb', color: '#111827',
                    boxSizing: 'border-box', transition: 'border-color 0.18s',
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
              {errors.password && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.3rem' }}>
                  <AlertTriangle size={14} color='#ef4444' strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.password}</span>
                </div>
              )}
              {isNewAccount && (
                <p style={{ fontSize: '0.775rem', color: '#94a3b8', margin: '0.3rem 0 0' }}>{t('passwordMinLengthHint')}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || isCheckingPhone}
              className="clt-submit-btn"
              style={{
                height: '58px', width: '100%',
                background: (isLoading || isCheckingPhone)
                  ? 'rgba(5,150,105,0.55)'
                  : `linear-gradient(135deg, ${PRI} 0%, ${PRI_DARK} 100%)`,
                color: '#fff', fontSize: '1.1rem', fontWeight: 700,
                border: 'none', borderRadius: '16px',
                cursor: (isLoading || isCheckingPhone) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
                boxShadow: (isLoading || isCheckingPhone) ? 'none' : '0 4px 20px rgba(5,150,105,0.4)',
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
                    border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                    animation: 'clt-spin 0.75s linear infinite',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  {t('processing')}
                </>
              ) : (
                <>
                  <ShoppingCart size={22} strokeWidth={2.5} />
                  {isNewAccount ? t('createAccount') : t('signIn')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
