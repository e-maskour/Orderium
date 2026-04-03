import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ConfirmDialog, type ConfirmVariant } from './ConfirmDialog';

export interface ConfirmOptions {
    title: string;
    description?: string;
    /** Secondary detail line — e.g. record name, reference, or bulk count */
    detail?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Imperative singleton — set by ConfirmProvider on mount.
 * Allows calling confirmAction() from anywhere (event handlers, services, etc.)
 * without needing useConfirm() inside a React component.
 */
let _imperativeConfirm: ConfirmFn | null = null;

/**
 * Open the global ConfirmDialog imperatively from anywhere in the app.
 * Resolves to `true` when the user clicks Confirm, `false` on Cancel/Escape.
 *
 * @example
 * confirmAction({ variant: 'destructive', title: 'Supprimer ?', confirmLabel: 'Supprimer', onConfirm: () => deleteFn() })
 */
export async function confirmAction(
    options: ConfirmOptions & { onConfirm?: () => void | Promise<void> },
): Promise<boolean> {
    if (!_imperativeConfirm) {
        // Fallback: ConfirmProvider not yet mounted — should not happen in normal usage
        return Promise.resolve(false);
    }
    const confirmed = await _imperativeConfirm(options);
    if (confirmed && options.onConfirm) {
        await options.onConfirm();
    }
    return confirmed;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ConfirmOptions & { open: boolean }>({
        open: false,
        title: '',
    });

    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            setState({ ...options, open: true });
        });
    }, []);

    // Register/deregister this provider as the global imperative instance
    useEffect(() => {
        _imperativeConfirm = confirm;
        return () => { _imperativeConfirm = null; };
    }, [confirm]);

    const handleConfirm = useCallback(() => {
        setState((s: ConfirmOptions & { open: boolean }) => ({ ...s, open: false }));
        resolveRef.current?.(true);
        resolveRef.current = null;
    }, []);

    const handleCancel = useCallback(() => {
        setState((s: ConfirmOptions & { open: boolean }) => ({ ...s, open: false }));
        resolveRef.current?.(false);
        resolveRef.current = null;
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmDialog
                open={state.open}
                title={state.title}
                description={state.description}
                detail={state.detail}
                confirmLabel={state.confirmLabel}
                cancelLabel={state.cancelLabel}
                variant={state.variant}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
    return ctx;
}
