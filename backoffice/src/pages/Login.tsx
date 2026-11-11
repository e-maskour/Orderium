import { useState, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizePhoneInputEvent, phoneInputProps } from '@orderium/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getOnboardingStatus } from '../api/onboarding';
import { LanguageToggle } from '../components/LanguageToggle';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Package,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react';
import marnovaLogo from '../assets/marnova-logo.svg';
import { loginSchema, type LoginFormValues } from '../modules/auth/schemas/login.schema';
import { useApiErrors } from '../hooks/useApiErrors';
import type { TranslationKey } from '../lib/i18n';

const LOGIN_STYLES = `
  .lg-root {
    --lg-brand: #235ae4;
    --lg-brand-hover: #1c4ccc;
    --lg-brand-ring: rgba(35, 90, 228, 0.12);
    --lg-tint: #eef3ff;
    --lg-tint-line: #dbe5fd;
    --lg-ink: #0f172a;
    --lg-ink-2: #334155;
    --lg-muted: #64748b;
    --lg-line: #e2e8f0;
    --lg-field: #f8fafc;
    --lg-danger: #dc2626;
    --lg-warn: #b45309;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    background: #fff;
    color: var(--lg-ink);
    font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  /* ── Form column ───────────────────────────── */
  .lg-main {
    flex: 999 1 560px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 1.25rem 1rem;
  }
  .lg-topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .lg-brand { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; min-width: 0; }
  .lg-brand-logo { display: block; height: 3.25rem; width: auto; max-width: 100%; }
  @media (min-width: 640px) { .lg-brand-logo { height: 4.25rem; } }
  .lg-brand-sub { font-size: 0.8125rem; font-weight: 600; color: var(--lg-muted); padding-inline-start: 0.25rem; }

  .lg-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 0; }
  .lg-card { width: 100%; max-width: 400px; animation: lg-rise 0.4s ease both; }

  .lg-title { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; margin: 0 0 0.5rem; }
  .lg-subtitle { font-size: 1rem; color: var(--lg-muted); margin: 0 0 2rem; line-height: 1.5; }

  .lg-form { display: flex; flex-direction: column; gap: 1.25rem; }
  .lg-label { display: block; font-size: 0.9375rem; font-weight: 600; color: var(--lg-ink-2); margin-bottom: 0.5rem; }

  .lg-field {
    display: flex;
    align-items: center;
    height: 3.5rem;
    border: 1.5px solid var(--lg-line);
    border-radius: 0.875rem;
    background: var(--lg-field);
    transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
  }
  .lg-field:hover { border-color: #cbd5e1; }
  .lg-field:focus-within { border-color: var(--lg-brand); background: #fff; box-shadow: 0 0 0 4px var(--lg-brand-ring); }
  .lg-field.is-invalid { border-color: var(--lg-danger); background: #fff; }
  .lg-field.is-invalid:focus-within { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12); }
  .lg-field.is-disabled { opacity: 0.6; }

  .lg-field-icon { flex-shrink: 0; width: 1.25rem; height: 1.25rem; margin-inline: 1rem 0.75rem; color: #94a3b8; }
  .lg-field:focus-within .lg-field-icon { color: var(--lg-brand); }

  .lg-prefix {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 100%;
    padding-inline: 1rem 0.875rem;
    margin-inline-end: 0.75rem;
    border-inline-end: 1.5px solid var(--lg-line);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--lg-ink-2);
    flex-shrink: 0;
  }
  .lg-prefix svg { width: 1.125rem; height: 1.125rem; color: var(--lg-muted); }
  .lg-field:focus-within .lg-prefix svg { color: var(--lg-brand); }

  .lg-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: 1.0625rem;
    color: var(--lg-ink);
    padding-inline-end: 1rem;
  }
  .lg-input::placeholder { color: #a0aec0; }
  /* Browser autofill paints its own background on the <input> only, which
     breaks the field at the prefix divider. Keep it transparent so the
     whole .lg-field keeps one consistent background. */
  .lg-input:-webkit-autofill,
  .lg-input:-webkit-autofill:hover,
  .lg-input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--lg-ink);
    caret-color: var(--lg-ink);
    transition: background-color 600000s 0s, color 600000s 0s;
  }
  .lg-input:autofill { background: transparent; }
  .lg-input.is-phone { letter-spacing: 0.06em; font-variant-numeric: tabular-nums; }
  [dir='rtl'] .lg-input.is-phone { text-align: right; }

  .lg-eye {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-inline-end: 0.375rem;
    border: 0;
    border-radius: 0.625rem;
    background: transparent;
    color: var(--lg-muted);
    cursor: pointer;
  }
  .lg-eye:hover:not(:disabled) { background: #eef2f7; color: var(--lg-ink); }
  .lg-eye:focus-visible { outline: 2px solid var(--lg-brand); outline-offset: 1px; }
  .lg-eye svg { width: 1.25rem; height: 1.25rem; }

  .lg-msg { display: flex; align-items: center; gap: 0.375rem; margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.35; }
  .lg-msg.is-error { color: var(--lg-danger); }
  .lg-msg.is-warn { color: var(--lg-warn); }
  .lg-msg svg { width: 1rem; height: 1rem; flex-shrink: 0; }

  .lg-alert {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-radius: 0.875rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    font-size: 0.9375rem;
    line-height: 1.45;
    animation: lg-shake 0.35s ease;
  }
  .lg-alert svg { width: 1.25rem; height: 1.25rem; flex-shrink: 0; color: var(--lg-danger); }

  .lg-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    height: 3.5rem;
    margin-top: 0.5rem;
    border: 0;
    border-radius: 0.875rem;
    background: var(--lg-brand);
    color: #fff;
    font: inherit;
    font-size: 1.0625rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.15s, transform 0.1s;
  }
  .lg-submit:hover:not(:disabled) { background: var(--lg-brand-hover); }
  .lg-submit:active:not(:disabled) { transform: translateY(1px); }
  .lg-submit:focus-visible { outline: 3px solid rgba(35, 90, 228, 0.4); outline-offset: 2px; }
  .lg-submit:disabled { cursor: progress; opacity: 0.8; }
  .lg-submit svg { width: 1.25rem; height: 1.25rem; }
  [dir='rtl'] .lg-submit-arrow { transform: scaleX(-1); }

  .lg-spinner {
    width: 1.125rem;
    height: 1.125rem;
    border: 2.5px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: lg-spin 0.7s linear infinite;
  }

  .lg-help { margin: 1.5rem 0 0; text-align: center; font-size: 0.875rem; color: var(--lg-muted); line-height: 1.5; }
  .lg-secure {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    margin-top: 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #15803d;
  }
  .lg-secure svg { width: 1rem; height: 1rem; }
  .lg-footer { font-size: 0.8125rem; color: var(--lg-muted); text-align: center; }

  /* ── Light showcase panel (desktop) ────────── */
  .lg-aside { display: none; }

  @media (min-width: 640px) {
    .lg-main { padding: 1.5rem 2.5rem; }
    .lg-title { font-size: 2rem; }
  }

  @media (min-width: 1024px) {
    .lg-aside {
      flex: 0 1 520px;
      min-width: 360px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.75rem;
      margin: 1rem;
      padding: 3rem 2.5rem;
      border-radius: 1.5rem;
      background: var(--lg-tint);
      border: 1px solid var(--lg-tint-line);
    }
  }

  .lg-aside-title { margin: 0 0 0.625rem; font-size: 1.75rem; line-height: 1.2; font-weight: 800; letter-spacing: -0.02em; }
  .lg-aside-desc { margin: 0; font-size: 1rem; line-height: 1.55; color: #475569; }

  .lg-preview {
    padding: 1.25rem;
    border-radius: 1.125rem;
    background: #fff;
    border: 1px solid var(--lg-tint-line);
    box-shadow: 0 20px 40px -24px rgba(35, 90, 228, 0.35);
    animation: lg-rise 0.5s ease 0.1s both;
  }
  .lg-preview-label { font-size: 0.875rem; font-weight: 600; color: var(--lg-ink-2); margin-bottom: 1rem; }
  .lg-bars {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    height: 5.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--lg-line);
  }
  .lg-bar {
    flex: 1;
    border-radius: 0.375rem 0.375rem 0.125rem 0.125rem;
    background: var(--lg-tint-line);
    transform-origin: bottom;
    animation: lg-grow 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  .lg-bar.is-active { background: var(--lg-brand); }
  .lg-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.625rem; margin-top: 1rem; }
  .lg-tile {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: var(--lg-field);
    border: 1px solid #eef2f7;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--lg-ink-2);
  }
  .lg-tile svg { width: 1.125rem; height: 1.125rem; color: var(--lg-brand); }

  @keyframes lg-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes lg-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes lg-spin { to { transform: rotate(360deg); } }
  @keyframes lg-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .lg-root * { animation: none !important; transition: none !important; }
  }
`;

const PREVIEW_BARS = [40, 55, 46, 68, 60, 85, 72];
const ACTIVE_BAR = 5;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
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

  const phoneField = register('phoneNumber');
  const passwordField = register('password');

  const clearApiError = () => {
    if (apiError) setApiError('');
  };

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState?.('CapsLock') ?? false);
  };

  const tiles = [
    { icon: ShoppingCart, label: t('loginTileOrders') },
    { icon: Users, label: t('loginTileCustomers') },
    { icon: Package, label: t('loginTileStock') },
  ];

  const passwordDescribedBy =
    [errors.password && 'password-error', capsLockOn && 'password-caps']
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="lg-root">
      <style>{LOGIN_STYLES}</style>

      {/* ── Form column ─────────────────────────── */}
      <div className="lg-main">
        <header className="lg-topbar">
          <div className="lg-brand">
            <img className="lg-brand-logo" src={marnovaLogo} alt={t('appName')} />
            <div className="lg-brand-sub">{t('adminBackoffice')}</div>
          </div>
          <LanguageToggle />
        </header>

        <main className="lg-center">
          <div className="lg-card">
            <h1 className="lg-title">{t('welcomeBack')}</h1>
            <p className="lg-subtitle">{t('loginPhoneSubtitle')}</p>

            <form className="lg-form" onSubmit={rhfHandleSubmit(onSubmit)} noValidate>
              {/* Phone */}
              <div>
                <label htmlFor="login-phone" className="lg-label">
                  {t('phoneNumber')}
                </label>
                <div
                  className={`lg-field${errors.phoneNumber ? ' is-invalid' : ''}${
                    isLoading ? ' is-disabled' : ''
                  }`}
                >
                  <span className="lg-prefix" aria-hidden="true">
                    <Phone />
                  </span>
                  <input
                    id="login-phone"
                    className="lg-input is-phone"
                    {...phoneInputProps}
                    {...phoneField}
                    onChange={(e) => {
                      clearApiError();
                      phoneField.onChange(normalizePhoneInputEvent(e));
                    }}
                    autoFocus
                    disabled={isLoading}
                    aria-invalid={!!errors.phoneNumber}
                    aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
                  />
                </div>
                {errors.phoneNumber && (
                  <p id="phone-error" role="alert" className="lg-msg is-error">
                    <AlertCircle aria-hidden="true" />
                    {t(errors.phoneNumber.message as TranslationKey)}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="lg-label">
                  {t('password')}
                </label>
                <div
                  className={`lg-field${errors.password ? ' is-invalid' : ''}${
                    isLoading ? ' is-disabled' : ''
                  }`}
                >
                  <Lock className="lg-field-icon" aria-hidden="true" />
                  <input
                    id="login-password"
                    className="lg-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t('enterYourPassword')}
                    {...passwordField}
                    onChange={(e) => {
                      clearApiError();
                      passwordField.onChange(e);
                    }}
                    onKeyDown={trackCapsLock}
                    onKeyUp={trackCapsLock}
                    onBlur={(e) => {
                      setCapsLockOn(false);
                      passwordField.onBlur(e);
                    }}
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    aria-describedby={passwordDescribedBy}
                  />
                  <button
                    type="button"
                    className="lg-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="lg-msg is-error">
                    <AlertCircle aria-hidden="true" />
                    {t(errors.password.message as TranslationKey)}
                  </p>
                )}
                {capsLockOn && !errors.password && (
                  <p id="password-caps" className="lg-msg is-warn" aria-live="polite">
                    <AlertCircle aria-hidden="true" />
                    {t('capsLockOn')}
                  </p>
                )}
              </div>

              {apiError && (
                <div className="lg-alert" role="alert" aria-live="assertive">
                  <AlertCircle aria-hidden="true" />
                  <span>{apiError}</span>
                </div>
              )}

              <button type="submit" className="lg-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="lg-spinner" aria-hidden="true" />
                    {t('loggingIn')}
                  </>
                ) : (
                  <>
                    {t('login')}
                    <ArrowRight className="lg-submit-arrow" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p className="lg-help">{t('loginHelp')}</p>
            <div className="lg-secure">
              <ShieldCheck aria-hidden="true" />
              {t('loginSecureConnection')}
            </div>
          </div>
        </main>

        <footer className="lg-footer">
          © {new Date().getFullYear()} {t('appName')}. {t('allRightsReserved')}
        </footer>
      </div>

      {/* ── Light showcase panel (desktop only, decorative) ── */}
      <aside className="lg-aside" aria-hidden="true">
        <div>
          <h2 className="lg-aside-title">{t('loginShowcaseTitle')}</h2>
          <p className="lg-aside-desc">{t('loginShowcaseDesc')}</p>
        </div>

        <div className="lg-preview">
          <div className="lg-preview-label">{t('loginWeeklySales')}</div>
          <div className="lg-bars">
            {PREVIEW_BARS.map((h, i) => (
              <div
                key={i}
                className={`lg-bar${i === ACTIVE_BAR ? ' is-active' : ''}`}
                style={{ height: `${h}%`, animationDelay: `${0.2 + i * 0.05}s` }}
              />
            ))}
          </div>
          <div className="lg-tiles">
            {tiles.map(({ icon: Icon, label }) => (
              <div key={label} className="lg-tile">
                <Icon />
                {label}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
