import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/modules/auth';
import { InputText } from 'primereact/inputtext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ShoppingCart, Phone, Lock, Package, Truck, Star, ArrowRight, Loader2, Clock, ShieldX } from 'lucide-react';
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

  return (
    <>
      <style>{`
        @keyframes clt-fade-in  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes clt-blob     { 0%,100% { transform:scale(1) translate(0,0); } 33% { transform:scale(1.07) translate(18px,-12px); } 66% { transform:scale(0.95) translate(-12px,8px); } }
        @keyframes clt-breathe  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
        @keyframes clt-spin     { to { transform:rotate(360deg); } }
        @keyframes clt-ring-pulse { 0% { box-shadow:0 0 36px rgba(255,255,255,0.14),0 4px 16px rgba(0,0,0,0.25),0 0 0 0 rgba(255,255,255,0.22); } 70% { box-shadow:0 0 36px rgba(255,255,255,0.14),0 4px 16px rgba(0,0,0,0.25),0 0 0 14px rgba(255,255,255,0); } 100% { box-shadow:0 0 36px rgba(255,255,255,0.14),0 4px 16px rgba(0,0,0,0.25),0 0 0 0 rgba(255,255,255,0); } }
        @keyframes clt-icon-levitate { 0%,100% { transform:translateY(0); filter:drop-shadow(0 2px 8px rgba(255,255,255,0.2)); } 50% { transform:translateY(-7px); filter:drop-shadow(0 10px 18px rgba(255,255,255,0.35)); } }
        .clt-left  { animation: clt-fade-in 0.55s ease both; }
        .clt-right { animation: clt-fade-in 0.55s ease 0.12s both; }
        .clt-feature:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.18) !important; }
        .clt-feature { transition: transform 0.2s, box-shadow 0.2s; }
        .clt-btn:hover:not(:disabled) { filter:brightness(1.07); box-shadow:0 8px 24px rgba(5,150,105,0.45) !important; transform:translateY(-1px); }
        .clt-btn { transition: filter 0.18s, box-shadow 0.18s, transform 0.18s; }
        .clt-input-wrap { position:relative; }
        .clt-input-wrap .clt-ico { position:absolute; left:0.875rem; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; z-index:1; }
        .clt-input-wrap .p-inputtext { padding-left:2.75rem !important; border-radius:0.75rem !important; }
        @media(max-width:767px){ .clt-left{ display:none !important; } .clt-right{ border-radius:1.25rem !important; } }
      `}</style>

      <div dir={dir} style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${PRI_DEEP} 0%, #011a12 100%)`,
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          display: 'flex', width: '100%', maxWidth: '960px', minHeight: '580px',
          borderRadius: '1.5rem', overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.45)',
        }}>

          {/* ── LEFT BRAND PANEL ── */}
          <div className="clt-left" style={{
            flex: '1 1 45%',
            background: `linear-gradient(145deg, ${PRI} 0%, ${PRI_DARK} 55%, ${PRI_DEEP} 100%)`,
            padding: '3rem 2.5rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Blobs */}
            <div style={{ position: 'absolute', top: '-70px', right: '-70px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', animation: 'clt-blob 9s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'clt-blob 12s ease-in-out infinite reverse' }} />
            <div style={{ position: 'absolute', top: '38%', left: '62%', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'clt-blob 14s ease-in-out infinite' }} />

            {/* Logo row */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                <div style={{
                  width: '4.25rem', height: '4.25rem', borderRadius: '1.125rem',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'clt-ring-pulse 2.5s ease-out infinite',
                  flexShrink: 0,
                }}>
                  <ShoppingCart style={{ width: '2.125rem', height: '2.125rem', color: '#fff', animation: 'clt-icon-levitate 3.5s ease-in-out infinite' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.625rem', color: '#fff', lineHeight: 1.1 }}>Orderium</div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.82)', marginTop: '0.2rem' }}>
                    {t('clientPortal')}
                  </div>
                </div>
              </div>

              <div style={{ animation: 'clt-breathe 7s ease-in-out infinite', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '0 0 0.75rem' }}>
                  {t('loginHeroTitle')}<br />
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('loginHeroSubtitle')}</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                  {t('loginHeroDesc')}
                </p>
              </div>
            </div>

            {/* Feature pills */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { icon: ShoppingCart, label: t('loginFeatureEasyOrdering') },
                  { icon: Package, label: t('loginFeatureOrderTracking') },
                  { icon: Truck, label: t('loginFeatureFastDelivery') },
                  { icon: Star, label: t('loginFeatureLoyalty') },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="clt-feature" style={{
                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.18)', borderRadius: '0.875rem',
                    padding: '0.875rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'default',
                  }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.5rem',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL ── */}
          <div className="clt-right" style={{
            flex: '1 1 55%',
            background: '#fff',
            padding: '3rem 2.75rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: `rgba(5,150,105,0.09)`, borderRadius: '999px',
                padding: '0.25rem 0.75rem', marginBottom: '1rem',
              }}>
                <ShoppingCart style={{ width: '0.875rem', height: '0.875rem', color: PRI }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: PRI }}>{t('secureCustomerAccess')}</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.375rem', lineHeight: 1.2 }}>
                {headingText} {isExistingAccount && customerName ? `👋` : ''}
              </h1>
              {isExistingAccount && customerName && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#ecfdf5', border: '1px solid #a7f3d0',
                  borderRadius: '0.75rem', padding: '0.5rem 0.875rem', marginBottom: '0.625rem',
                }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: PRI_DARK }}>{customerName}</span>
                </div>
              )}
              <p style={{ color: '#64748b', fontSize: '0.925rem', margin: 0 }}>{subText}</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Account status banner */}
              {(accountStatus === 'pending' || accountStatus === 'rejected') && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '1rem 1.125rem',
                  borderRadius: '0.875rem',
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
                    <p style={{
                      margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.875rem',
                      color: accountStatus === 'pending' ? '#92400e' : '#991b1b',
                    }}>
                      {accountStatus === 'pending' ? t('accountPendingTitle') : t('accountRejectedTitle')}
                    </p>
                    <p style={{
                      margin: 0, fontSize: '0.8125rem', lineHeight: 1.5,
                      color: accountStatus === 'pending' ? '#a16207' : '#b91c1c',
                    }}>
                      {accountStatus === 'pending' ? t('accountPendingDesc') : t('accountRejectedDesc')}
                    </p>
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <label htmlFor="phone" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  {t('phoneNumber')}
                </label>
                <div className="clt-input-wrap">
                  <Phone className="clt-ico" style={{ width: '1rem', height: '1rem' }} />
                  <InputText
                    id="phone"
                    type="tel"
                    placeholder={t('phonePlaceholder')}
                    value={formData.phone}
                    onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
                    className={errors.phone ? 'p-invalid' : ''}
                    disabled={isLoading}
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem' }}
                  />
                </div>
                {errors.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.3rem' }}>
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>⚠</span>
                    <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.phone}</span>
                  </div>
                )}
                {isCheckingPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.375rem' }}>
                    <Loader2 style={{ width: '0.875rem', height: '0.875rem', color: PRI, animation: 'clt-spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('verifying')}…</span>
                  </div>
                )}
                {!isNewAccount && !isExistingAccount && formData.phone.length > 0 && !isValidMoroccanPhone(formData.phone) && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>{t('enterValidMoroccanPhone')}</span>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  {isNewAccount ? t('createPassword') : t('password')}
                </label>
                <div className="clt-input-wrap">
                  <Lock className="clt-ico" style={{ width: '1rem', height: '1rem' }} />
                  <InputText
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                    className={errors.password ? 'p-invalid' : ''}
                    disabled={isLoading}
                    style={{ width: '100%', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem' }}
                  />
                </div>
                {errors.password && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.3rem' }}>
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>⚠</span>
                    <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.password}</span>
                  </div>
                )}
                {isNewAccount && (
                  <p style={{ fontSize: '0.775rem', color: '#94a3b8', margin: '0.3rem 0 0' }}>{t('passwordMinLengthHint')}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || isCheckingPhone}
                className="clt-btn"
                style={{
                  width: '100%', padding: '0.875rem 1.5rem', border: 'none',
                  borderRadius: '0.875rem',
                  background: (isLoading || isCheckingPhone)
                    ? '#94a3b8'
                    : `linear-gradient(135deg, ${PRI} 0%, ${PRI_DARK} 100%)`,
                  color: '#fff', fontSize: '0.9375rem', fontWeight: 700,
                  cursor: (isLoading || isCheckingPhone) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  letterSpacing: '0.02em', marginTop: '0.25rem',
                  boxShadow: `0 4px 16px rgba(5,150,105,0.3)`,
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'clt-spin 0.7s linear infinite' }} />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    {isNewAccount ? t('createAccount') : t('signIn')}
                    <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: '2rem', paddingTop: '1.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                © {new Date().getFullYear()} {t('appName')}
              </p>
              <LanguageToggle />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
