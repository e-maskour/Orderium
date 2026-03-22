import { type ReactNode, useCallback, createElement, useSyncExternalStore } from 'react';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Loader2,
    X,
} from 'lucide-react';

/* ================================================================
   Toast State Manager (framework-agnostic singleton)
   ================================================================ */

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: ReactNode;
    icon?: ReactNode;
    duration: number | null;
    button?: { title: string; onClick: () => void };
    createdAt: number;
    removing?: boolean;
}

type Listener = () => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
    listeners.forEach((l) => l());
}

function generateId(): string {
    return `toast-${++counter}-${Date.now()}`;
}

function addToast(toast: Toast): string {
    toasts = [toast, ...toasts];
    emit();

    if (toast.duration !== null && toast.duration > 0) {
        setTimeout(() => dismissToast(toast.id), toast.duration);
    }

    return toast.id;
}

function dismissToast(id: string) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, removing: true } : t));
    emit();
    setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id);
        emit();
    }, 300);
}

function clearAll() {
    toasts = [];
    emit();
}

function updateToast(id: string, updates: Partial<Toast>) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, ...updates } : t));
    emit();
}

/* ── Public Store API ── */

function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): Toast[] {
    return toasts;
}

/* ================================================================
   Imperative toast functions  (the public API)
   ================================================================ */

interface ToastOptions {
    description?: ReactNode;
    icon?: ReactNode;
    duration?: number | null;
}

interface ActionOptions extends Omit<ToastOptions, 'duration'> {
    button: { title: string; onClick: () => void };
}

interface PromiseMessages<T = unknown> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
}

export const toast = {
    success(title: string, opts?: ToastOptions): string {
        return addToast({
            id: generateId(),
            type: 'success',
            title,
            duration: 4000,
            createdAt: Date.now(),
            ...opts,
        });
    },

    error(title: string, opts?: ToastOptions): string {
        return addToast({
            id: generateId(),
            type: 'error',
            title,
            duration: 6000,
            createdAt: Date.now(),
            ...opts,
        });
    },

    warning(title: string, opts?: ToastOptions): string {
        return addToast({
            id: generateId(),
            type: 'warning',
            title,
            duration: 5000,
            createdAt: Date.now(),
            ...opts,
        });
    },

    info(title: string, opts?: ToastOptions): string {
        return addToast({
            id: generateId(),
            type: 'info',
            title,
            duration: 4000,
            createdAt: Date.now(),
            ...opts,
        });
    },

    loading(title: string, opts?: ToastOptions): string {
        return addToast({
            id: generateId(),
            type: 'loading',
            title,
            duration: null,
            createdAt: Date.now(),
            ...opts,
        });
    },

    action(title: string, opts: ActionOptions): string {
        return addToast({
            id: generateId(),
            type: 'info',
            title,
            duration: null,
            createdAt: Date.now(),
            description: opts.description,
            icon: opts.icon,
            button: opts.button,
        });
    },

    promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
        const id = toast.loading(messages.loading);
        return promise.then(
            (data) => {
                const msg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
                updateToast(id, { type: 'success', title: msg, duration: 4000 });
                setTimeout(() => dismissToast(id), 4000);
                return data;
            },
            (err) => {
                const msg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
                updateToast(id, { type: 'error', title: msg, duration: 6000 });
                setTimeout(() => dismissToast(id), 6000);
                throw err;
            },
        );
    },

    dismiss: dismissToast,
    clear: clearAll,
};

/* ================================================================
   Default Icons per type
   ================================================================ */

const DEFAULT_ICONS: Record<ToastType, ReactNode> = {
    success: createElement(CheckCircle, { size: 18, strokeWidth: 2 }),
    error: createElement(XCircle, { size: 18, strokeWidth: 2 }),
    warning: createElement(AlertTriangle, { size: 18, strokeWidth: 2 }),
    info: createElement(Info, { size: 18, strokeWidth: 2 }),
    loading: createElement(Loader2, { size: 18, strokeWidth: 2, className: 'ord-toast-spinner' }),
};

/* ================================================================
   <ToastItem /> — single toast card
   ================================================================ */

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
    return (
        <div
            className={`ord-toast ord-toast--${t.type}${t.removing ? ' ord-toast--removing' : ''}`}
            role="status"
            aria-live="polite"
        >
            <div className="ord-toast-main">
                <div className={`ord-toast-icon ord-toast-icon--${t.type}`}>
                    {t.icon ?? DEFAULT_ICONS[t.type]}
                </div>

                <div className="ord-toast-content">
                    <p className="ord-toast-title">{t.title}</p>
                    {t.description && <p className="ord-toast-desc">{t.description}</p>}
                </div>

                <div className="ord-toast-actions">
                    {t.button && (
                        <button
                            className={`ord-toast-btn ord-toast-btn--action ord-toast-btn--${t.type}`}
                            onClick={() => { t.button!.onClick(); onDismiss(t.id); }}
                            type="button"
                        >
                            {t.button.title}
                        </button>
                    )}
                    <button
                        className="ord-toast-btn ord-toast-btn--close"
                        onClick={() => onDismiss(t.id)}
                        aria-label="Dismiss"
                        type="button"
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   <Toaster /> — renders all active toasts
   ================================================================ */

export type ToasterPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToasterProps {
    position?: ToasterPosition;
    maxVisible?: number;
}

export function Toaster({ position = 'bottom-right', maxVisible = 5 }: ToasterProps) {
    const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const handleDismiss = useCallback((id: string) => {
        dismissToast(id);
    }, []);

    const visible = items.slice(0, maxVisible);

    if (visible.length === 0) return null;

    return (
        <div className={`ord-toaster ord-toaster--${position}`} aria-label="Notifications">
            {visible.map((t) => (
                <ToastItem key={t.id} t={t} onDismiss={handleDismiss} />
            ))}
        </div>
    );
}
