import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound, Lock, LockOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { apiErrorMessage, apiKeyStore } from '../api/client';
import { authApi } from '../api/auth';

/** Current platform API key (null until entered). Re-renders on change. */
export function useApiKey(): string | null {
  return useSyncExternalStore(apiKeyStore.subscribe, apiKeyStore.get, apiKeyStore.get);
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Enter / replace / remove the super-admin API key. By default it is kept for
 * this browser session; "remember on this device" stores a signed 30-day grant
 * instead (the key itself is never persisted).
 */
export function ApiKeyDialog({ open, onClose }: DialogProps) {
  const qc = useQueryClient();
  const current = useApiKey();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const remembered = Boolean(current) && apiKeyStore.isRemembered();

  useEffect(() => {
    if (open) {
      setValue('');
      setShow(false);
      setRemember(apiKeyStore.isRemembered());
    }
  }, [open]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    try {
      const res = await authApi.verifyApiKey(key, remember);
      if (remember && res.grant) {
        apiKeyStore.remember(res.grant);
        toast.success('API key accepted — remembered on this device for 30 days');
      } else {
        apiKeyStore.clear(); // drop any older remembered grant
        apiKeyStore.set(key);
        toast.success('API key accepted — admin tools unlocked');
      }
      onClose();
      void qc.invalidateQueries(); // reload everything that failed while locked
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not verify the API key'));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    apiKeyStore.clear();
    qc.clear();
    toast.success(
      remembered
        ? 'This device is forgotten — admin tools locked'
        : 'API key removed — admin tools locked',
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      icon={<KeyRound />}
      title="Super-admin API key"
      description={
        remembered
          ? 'The key is remembered on this device. Enter a new one to replace it.'
          : current
            ? 'The key is set for this browser session. Enter a new one to replace it.'
            : 'Tenant data and admin tools are locked until you enter the platform API key.'
      }
    >
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="api-key-input" className="label">
            API key
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="api-key-input"
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk_admin_••••••••••••"
              autoComplete="off"
              autoFocus
              className="input pl-9 pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              tabIndex={-1}
              aria-label={show ? 'Hide key' : 'Show key'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Wrong keys count toward the account lockout.
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <span className="block font-medium text-slate-700 dark:text-slate-200">
              Remember on this device for 30 days
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Otherwise the key is asked again when the browser closes. Don&apos;t use on a shared
              computer.
            </span>
          </span>
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {current && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="btn-secondary sm:mr-auto"
            >
              {remembered ? 'Forget this device' : 'Remove key'}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={busy || !value.trim()} className="btn-primary">
            {busy ? 'Verifying…' : current ? 'Replace key' : 'Unlock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Lock/unlock status button for the sidebar footer. */
export function ApiKeyButton({ onClick }: { onClick: () => void }) {
  const key = useApiKey();
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        key
          ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'
          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20'
      }`}
    >
      {key ? <LockOpen className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
      <span className="flex-1 text-left">{key ? 'API key set' : 'Enter API key'}</span>
      <span
        className={`h-2 w-2 rounded-full ${key ? 'bg-emerald-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
    </button>
  );
}

/** Full-width notice shown above page content while no key is set. */
export function ApiKeyBanner({ onClick }: { onClick: () => void }) {
  const key = useApiKey();
  if (key) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:px-6">
      <Lock className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">
        Admin tools are locked. Enter the super-admin API key to load tenant data.
      </span>
      <button
        onClick={onClick}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        Enter API key
      </button>
    </div>
  );
}
