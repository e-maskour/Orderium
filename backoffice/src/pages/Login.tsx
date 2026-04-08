import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getOnboardingStatus } from '../api/onboarding';
import { LanguageToggle } from '../components/LanguageToggle';
import { Shield, Phone, Lock, BarChart3, Package, Users, TrendingUp } from 'lucide-react';
import orderiumLogo from '../assets/logo-backoffice.svg';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { loginSchema, type LoginFormValues } from '../modules/auth/schemas/login.schema';
import { useApiErrors } from '../hooks/useApiErrors';
import type { TranslationKey } from '../lib/i18n';

const BRAND = '#235ae4';
const BRAND_DARK = '#1a47b8';
const BRAND_DEEP = '#0f2d7a';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { phoneNumber: '', password: '' },
  });
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
  } = form;
  const { handleApiErrors } = useApiErrors(form);

  // If the tenant hasn't been onboarded yet, redirect to /onboarding
  useEffect(() => {
    getOnboardingStatus()
      .then((status) => {
        if (!status.is_onboarded) {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch(() => {
        /* ignore — fail open */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featureCards = [
    { icon: BarChart3, label: t('loginFeatureAnalytics') },
    { icon: Package, label: t('loginFeatureInventory') },
    { icon: Users, label: t('loginFeatureCustomers') },
    { icon: TrendingUp, label: t('loginFeatureSales') },
  ];

  const onSubmit = async (data: LoginFormValues) => {
    setApiError('');
    setIsLoading(true);
    try {
      await login({
        ...data,
        phoneNumber: data.phoneNumber.replace(/[\s\-().]/g, ''),
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      handleApiErrors(err);
      setApiError((err as any)?.message || t('invalidCredentials' as TranslationKey));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes login-breathe {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes login-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-blob {
          0%, 100% { transform: scale(1) translate(0, 0); }
          33%       { transform: scale(1.08) translate(20px, -15px); }
          66%       { transform: scale(0.94) translate(-15px, 10px); }
        }
        @keyframes login-ring-pulse {
          0%   { box-shadow: 0 0 36px rgba(255,255,255,0.14), 0 4px 16px rgba(0,0,0,0.25), 0 0 0 0 rgba(255,255,255,0.22); }
          70%  { box-shadow: 0 0 36px rgba(255,255,255,0.14), 0 4px 16px rgba(0,0,0,0.25), 0 0 0 14px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 36px rgba(255,255,255,0.14), 0 4px 16px rgba(0,0,0,0.25), 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes login-icon-breathe {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50%       { transform: scale(1.08) rotate(4deg); }
        }
        .login-panel-left  { animation: login-fade-in 0.6s ease both; }
        .login-panel-right { animation: login-fade-in 0.6s ease 0.15s both; }
        .login-feature-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .login-feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }
        .login-submit-btn:hover:not(:disabled) {
          filter: brightness(1.08);
          box-shadow: 0 8px 24px rgba(35,90,228,0.4);
          transform: translateY(-1px);
        }
        .login-submit-btn { transition: filter 0.2s, box-shadow 0.2s, transform 0.2s; }
        .login-input-wrap { position: relative; }
        .login-input-wrap .login-input-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }
        .login-input-wrap .p-inputtext {
          padding-left: 2.75rem !important;
        }
        @media (max-width: 767px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { border-radius: 1.25rem !important; }
        }
      `}</style>

      {/* Page shell */}
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, #0a1535 100%)`,
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Card wrapper */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: '960px',
            minHeight: '580px',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* ── LEFT BRAND PANEL ─────────────────────────────── */}
          <div
            className="login-left-panel login-panel-left"
            style={{
              flex: '1 1 45%',
              background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND_DARK} 50%, ${BRAND_DEEP} 100%)`,
              padding: '3rem 2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative blobs */}
            <div
              style={{
                position: 'absolute',
                top: '-80px',
                right: '-80px',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                animation: 'login-blob 8s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-60px',
                left: '-60px',
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                animation: 'login-blob 11s ease-in-out infinite reverse',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '60%',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                animation: 'login-blob 14s ease-in-out infinite',
              }}
            />

            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '2.5rem',
                }}
              >
                <img
                  src={orderiumLogo}
                  alt="Morocom"
                  style={{
                    width: '4.25rem',
                    height: '4.25rem',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.25))',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '1.625rem',
                      color: '#fff',
                      lineHeight: 1.1,
                    }}
                  >
                    {t('appName')}
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.82)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <Shield style={{ width: '0.875rem', height: '0.875rem' }} />
                    {t('adminBackoffice')}
                  </div>
                </div>
              </div>

              {/* Hero text */}
              <div
                style={{
                  animation: 'login-breathe 7s ease-in-out infinite',
                  marginBottom: '2rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.2,
                    marginBottom: '0.75rem',
                    margin: '0 0 0.75rem',
                  }}
                >
                  {t('loginHeroTitle')}
                  <br />
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('loginHeroSubtitle')}</span>
                </h2>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {t('loginHeroDesc')}
                </p>
              </div>
            </div>

            {/* Feature cards */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {featureCards.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="login-feature-card"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: '0.875rem',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      cursor: 'default',
                    }}
                  >
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.85)',
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL ─────────────────────────────── */}
          <div
            className="login-right-panel login-panel-right"
            style={{
              flex: '1 1 55%',
              background: '#fff',
              padding: '3rem 2.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  background: `rgba(35,90,228,0.08)`,
                  borderRadius: '999px',
                  padding: '0.25rem 0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <Shield style={{ width: '0.875rem', height: '0.875rem', color: BRAND }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: BRAND }}>
                  {t('secureAdminAccess')}
                </span>
              </div>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 0.375rem',
                  lineHeight: 1.2,
                }}
              >
                {t('welcomeBack')} 👋
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.925rem', margin: 0 }}>
                {t('loginSignInDesc')}
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={rhfHandleSubmit(onSubmit)}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {/* Phone */}
              <div>
                <label
                  htmlFor="login-phone"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.5rem',
                    letterSpacing: '0.01em',
                  }}
                >
                  {t('phoneNumber')}
                </label>
                <div className="login-input-wrap">
                  <Phone className="login-input-icon" style={{ width: '1rem', height: '1rem' }} />
                  <InputText
                    id="login-phone"
                    type="tel"
                    {...register('phoneNumber')}
                    placeholder="0600000000"
                    disabled={isLoading}
                    className={errors.phoneNumber ? 'p-invalid' : ''}
                    aria-invalid={!!errors.phoneNumber}
                    aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
                    style={{
                      width: '100%',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${errors.phoneNumber ? '#ef4444' : '#e2e8f0'}`,
                      fontSize: '0.9375rem',
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {errors.phoneNumber && (
                  <small
                    id="phone-error"
                    role="alert"
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}
                  >
                    {t(errors.phoneNumber.message as TranslationKey)}
                  </small>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.5rem',
                    letterSpacing: '0.01em',
                  }}
                >
                  {t('password')}
                </label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" style={{ width: '1rem', height: '1rem' }} />
                  <InputText
                    id="login-password"
                    type="password"
                    {...register('password')}
                    placeholder={t('enterYourPassword')}
                    disabled={isLoading}
                    className={errors.password ? 'p-invalid' : ''}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    style={{
                      width: '100%',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${errors.password ? '#ef4444' : '#e2e8f0'}`,
                      fontSize: '0.9375rem',
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {errors.password && (
                  <small
                    id="password-error"
                    role="alert"
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}
                  >
                    {t(errors.password.message as TranslationKey)}
                  </small>
                )}
              </div>

              {/* API/server error banner */}
              {apiError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      color: '#ef4444',
                      fontSize: '1rem',
                      lineHeight: 1,
                      marginTop: '0.05rem',
                    }}
                  >
                    ⚠
                  </span>
                  <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>{apiError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.875rem',
                  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
                  color: '#fff',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  letterSpacing: '0.02em',
                  marginTop: '0.25rem',
                  boxShadow: `0 4px 16px rgba(35,90,228,0.3)`,
                }}
              >
                {isLoading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    {t('loggingIn')}
                  </>
                ) : (
                  t('login')
                )}
              </button>
            </form>

            {/* Footer */}
            <div
              style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                © {new Date().getFullYear()} {t('appName')}. {t('allRightsReserved')}
              </p>
              <LanguageToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Spinner keyframe (global) */}
      <style> {`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
