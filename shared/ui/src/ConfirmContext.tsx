import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmDialog, type ConfirmVariant } from './ConfirmDialog';

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

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
