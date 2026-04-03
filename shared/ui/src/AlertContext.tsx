import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertDialog, type AlertVariant } from './AlertDialog';

export interface AlertOptions {
  title: string;
  description?: string;
  closeLabel?: string;
  variant?: AlertVariant;
}

export type AlertFn = (options: AlertOptions) => Promise<void>;

const AlertContext = createContext<AlertFn | null>(null);

/**
 * Imperative singleton — set by AlertProvider on mount.
 * Allows calling alertAction() from anywhere (services, event handlers, etc.)
 */
let _imperativeAlert: AlertFn | null = null;

/**
 * Open the global AlertDialog imperatively from anywhere in the app.
 * Resolves when the user closes the dialog.
 *
 * @example
 * alertAction({ variant: 'destructive', title: 'Suppression impossible', description: '...' })
 */
export async function alertAction(options: AlertOptions): Promise<void> {
  if (!_imperativeAlert) return Promise.resolve();
  return _imperativeAlert(options);
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertOptions & { open: boolean }>({
    open: false,
    title: '',
  });

  const resolveRef = useRef<(() => void) | null>(null);

  const alert = useCallback<AlertFn>((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  useEffect(() => {
    _imperativeAlert = alert;
    return () => { _imperativeAlert = null; };
  }, [alert]);

  const handleClose = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <AlertDialog
        open={state.open}
        title={state.title}
        description={state.description}
        closeLabel={state.closeLabel}
        variant={state.variant}
        onClose={handleClose}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertFn {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used inside <AlertProvider>');
  return ctx;
}
