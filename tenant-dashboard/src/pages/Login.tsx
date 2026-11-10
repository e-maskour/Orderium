import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../api/client';
import { authApi, type TwoFactorMethod } from '../api/auth';

interface Props {
  onLogin: (token: string) => void;
}

/**
 * Sign-in: 1) email + password → 2) authenticator app or e-mail code
 * (enrolled on first sign-in). The platform API key is entered afterwards,
 * from inside the dashboard.
 */
type Step =
  | { kind: 'credentials' }
  | { kind: 'enroll'; token: string }
  | { kind: 'totp-setup'; token: string; qr: string; secret: string }
  | { kind: 'code'; token: string; method: TwoFactorMethod; sentTo?: string };

const RESEND_COOLDOWN = 60;

function stageOf(step: Step): 1 | 2 {
  if (step.kind === 'credentials') return 1;
  return 2;
}

export function Login({ onLogin }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'credentials' });
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const restart = () => {
    setStep({ kind: 'credentials' });
    setPassword('');
    setCode('');
  };

  /** Runs a step; an expired challenge sends the admin back to step 1. */
  const run = async (fn: () => Promise<void>, fallback: string) => {
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      const msg = apiErrorMessage(err, fallback);
      toast.error(msg);
      if (/expired|start again|locked/i.test(msg)) restart();
    } finally {
      setLoading(false);
    }
  };

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    void run(async () => {
      const res = await authApi.login(email.trim(), password);
      setPassword('');
      if (res.step === 'enroll') setStep({ kind: 'enroll', token: res.challengeToken });
      else if (res.step === 'totp')
        setStep({ kind: 'code', token: res.challengeToken, method: 'totp' });
      else {
        setStep({ kind: 'code', token: res.challengeToken, method: 'email', sentTo: res.sentTo });
        setResendIn(RESEND_COOLDOWN);
      }
    }, 'Sign-in failed');
  };

  const chooseMethod = (token: string, method: TwoFactorMethod) =>
    run(async () => {
      const res = await authApi.setupTwoFactor(token, method);
      setCode('');
      if (res.method === 'totp') {
        setStep({ kind: 'totp-setup', token, qr: res.qrCodeDataUrl, secret: res.secret });
      } else {
        setStep({ kind: 'code', token, method: 'email', sentTo: res.sentTo });
        setResendIn(RESEND_COOLDOWN);
      }
    }, 'Could not start two-factor setup');

  const submitCode = (e: React.FormEvent, token: string) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return;
    void run(async () => {
      const res = await authApi.verifyCode(token, code);
      setCode('');
      onLogin(res.accessToken);
      toast.success(`Welcome${res.admin.name ? `, ${res.admin.name}` : ''}`);
    }, 'Invalid code');
  };

  const resend = (token: string) =>
    run(async () => {
      const res = await authApi.resendEmailCode(token);
      toast.success(`New code sent to ${res.sentTo}`);
      setResendIn(RESEND_COOLDOWN);
    }, 'Could not resend the code');

  const codeInput = (
    <input
      id="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      autoFocus
      className="input text-center font-mono text-lg tracking-[0.5em]"
    />
  );

  const submitButton = (label: string, disabled: boolean) => (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Verifying…
        </>
      ) : (
        label
      )}
    </button>
  );

  const heading: Record<Step['kind'], [string, string]> = {
    credentials: ['Welcome back', 'Sign in with your admin account'],
    enroll: ['Secure your account', 'Choose how you will confirm each sign-in'],
    'totp-setup': ['Set up authenticator', 'Scan the QR code with your authenticator app'],
    code: [
      'Two-factor verification',
      step.kind === 'code' && step.method === 'email'
        ? `Enter the 6-digit code sent to ${step.sentTo ?? 'your e-mail'}`
        : 'Enter the 6-digit code from your authenticator app',
    ],
  };
  const [title, subtitle] = heading[step.kind];
  const stage = stageOf(step);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-20 w-96 h-96 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10 max-w-md text-white">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Marnova
            <br />
            Admin Portal
          </h1>
          <p className="mt-4 text-lg text-indigo-200">
            Manage all tenants, subscriptions, and infrastructure from one place.
          </p>
          <div className="mt-10 space-y-3">
            {[
              {
                icon: <Zap className="h-4 w-4" />,
                text: 'Provision new tenant databases instantly',
              },
              {
                icon: <ShieldCheck className="h-4 w-4" />,
                text: 'Manage lifecycle: activate, suspend, archive',
              },
              {
                icon: <Lock className="h-4 w-4" />,
                text: 'Track subscriptions, payments & renewals',
              },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  {icon}
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sign-in form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
              Marnova Admin
            </h1>
          </div>

          {/* Progress */}
          <ol
            className="mb-6 flex items-center gap-2 text-xs font-medium"
            aria-label="Sign-in steps"
          >
            {['Account', 'Verify'].map((label, i) => {
              const n = i + 1;
              const state = n < stage ? 'done' : n === stage ? 'current' : 'todo';
              return (
                <li
                  key={label}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className="flex flex-1 items-center gap-2"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      state === 'todo'
                        ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {n}
                  </span>
                  <span
                    className={
                      state === 'todo'
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200'
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          {step.kind === 'credentials' && (
            <form onSubmit={submitCredentials} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="username"
                    autoFocus
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="input pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {submitButton('Continue', !email.trim() || !password)}
            </form>
          )}

          {step.kind === 'enroll' && (
            <div className="space-y-3">
              {(
                [
                  {
                    method: 'totp',
                    icon: <Smartphone className="h-5 w-5" />,
                    title: 'Authenticator app',
                    text: 'Google Authenticator, Authy, 1Password… Recommended.',
                  },
                  {
                    method: 'email',
                    icon: <Mail className="h-5 w-5" />,
                    title: 'E-mail code',
                    text: 'A 6-digit code is e-mailed to you at each sign-in.',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.method}
                  type="button"
                  disabled={loading}
                  onClick={() => void chooseMethod(step.token, opt.method)}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {opt.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {opt.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {opt.text}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step.kind === 'totp-setup' && (
            <form onSubmit={(e) => submitCode(e, step.token)} className="space-y-4">
              <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700">
                <img src={step.qr} alt="Authenticator QR code" width={200} height={200} />
              </div>
              <div>
                <p className="label">Can&apos;t scan? Enter this key manually</p>
                <code className="block break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700 select-all dark:bg-slate-800 dark:text-slate-200">
                  {step.secret}
                </code>
              </div>
              <div>
                <label htmlFor="code" className="label">
                  6-digit code from the app
                </label>
                {codeInput}
              </div>
              {submitButton('Verify & continue', code.length !== 6)}
            </form>
          )}

          {step.kind === 'code' && (
            <form onSubmit={(e) => submitCode(e, step.token)} className="space-y-4">
              <div>
                <label htmlFor="code" className="label">
                  Verification code
                </label>
                {codeInput}
              </div>
              {submitButton('Verify', code.length !== 6)}
              {step.method === 'email' && (
                <button
                  type="button"
                  disabled={loading || resendIn > 0}
                  onClick={() => void resend(step.token)}
                  className="w-full text-center text-xs font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-indigo-400"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
              )}
            </form>
          )}

          {step.kind !== 'credentials' && (
            <button
              type="button"
              onClick={restart}
              className="mt-5 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Start over
            </button>
          )}

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Marnova Tenant Management &mdash; Admin only
          </p>
        </div>
      </div>
    </div>
  );
}
