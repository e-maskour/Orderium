import { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';

interface Props {
  onLogin: (key: string) => void;
}

export function Login({ onLogin }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    try {
      await apiClient.get('/admin/tenants?limit=1', {
        headers: { 'X-Super-Admin-Key': key.trim() },
      });
      onLogin(key.trim());
      toast.success('Authenticated successfully');
    } catch {
      toast.error('Invalid admin key. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 items-center justify-center p-12">
        {/* Background rings */}
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
            Morocom
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

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
              Morocom Admin
            </h1>
          </div>

          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your super-admin key to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Super Admin Key</label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sk_admin_••••••••••••"
                  autoComplete="current-password"
                  autoFocus
                  className="input pl-9 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  tabIndex={-1}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying…
                </>
              ) : (
                'Sign in to Admin Portal'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Morocom Tenant Management &mdash; Admin only
          </p>
        </div>
      </div>
    </div>
  );
}
