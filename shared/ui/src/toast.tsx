import { type ReactNode } from 'react';
import { Toast as PrimeToast } from 'primereact/toast';
import type { ToastMessage } from 'primereact/toast';

/* ================================================================
   Types — kept identical to preserve all callers
   ================================================================ */

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/** Kept for back-compat — not used internally by PrimeReact implementation */
export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: ReactNode;
}

export type ToasterPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

/* ================================================================
   Singleton PrimeReact Toast ref
   ================================================================ */

let _prime: PrimeToast | null = null;
const _msgMap = new Map<string, ToastMessage>();
let _ctr = 0;

function _register(el: PrimeToast | null) {
    _prime = el;
}

function _nextId(): string {
    return `t${++_ctr}`;
}

function _show(msg: ToastMessage): string {
    const id = msg.id as string;
    _msgMap.set(id, msg);
    _prime?.show(msg);
    return id;
}

/* ================================================================
   Options — icon kept for back-compat with notify.ts (ignored here,
   PrimeReact uses its built-in severity icons)
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

/* ================================================================
   Imperative toast API
   ================================================================ */

export const toast = {
    success(title: string, opts?: ToastOptions): string {
        const life = opts?.duration === null ? undefined : (opts?.duration ?? 3000);
        return _show({
            id: _nextId(),
            severity: 'success',
            summary: title,
            detail: opts?.description,
            life,
            sticky: !life,
        });
    },

    error(title: string, opts?: ToastOptions): string {
        const life = opts?.duration === null ? undefined : (opts?.duration ?? 4000);
        return _show({
            id: _nextId(),
            severity: 'error',
            summary: title,
            detail: opts?.description,
            life,
            sticky: !life,
        });
    },

    warning(title: string, opts?: ToastOptions): string {
        const life = opts?.duration === null ? undefined : (opts?.duration ?? 4000);
        return _show({
            id: _nextId(),
            severity: 'warn',
            summary: title,
            detail: opts?.description,
            life,
            sticky: !life,
        });
    },

    info(title: string, opts?: ToastOptions): string {
        const life = opts?.duration === null ? undefined : (opts?.duration ?? 3000);
        return _show({
            id: _nextId(),
            severity: 'info',
            summary: title,
            detail: opts?.description,
            life,
            sticky: !life,
        });
    },

    loading(title: string, opts?: ToastOptions): string {
        return _show({
            id: _nextId(),
            severity: 'info',
            summary: title,
            detail: opts?.description,
            sticky: true,
        });
    },

    action(title: string, opts: ActionOptions): string {
        return _show({
            id: _nextId(),
            severity: 'info',
            summary: title,
            detail: opts.description,
            sticky: true,
        });
    },

    promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
        const id = _nextId();
        const loadingMsg: ToastMessage = { id, severity: 'info', summary: messages.loading, sticky: true };
        _msgMap.set(id, loadingMsg);
        _prime?.show(loadingMsg);

        return promise.then(
            (data) => {
                const stored = _msgMap.get(id);
                if (stored) { _prime?.remove(stored); _msgMap.delete(id); }
                const msg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
                toast.success(msg);
                return data;
            },
            (err) => {
                const stored = _msgMap.get(id);
                if (stored) { _prime?.remove(stored); _msgMap.delete(id); }
                const msg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
                toast.error(msg);
                throw err;
            },
        );
    },

    dismiss(id: string) {
        const m = _msgMap.get(id);
        if (m) {
            _prime?.remove(m);
            _msgMap.delete(id);
        }
    },

    clear() {
        _prime?.clear();
        _msgMap.clear();
    },
};

/* ================================================================
   <Toaster /> — drop-in replacement, same props as before
   ================================================================ */

interface ToasterProps {
    position?: ToasterPosition;
    maxVisible?: number; // kept for API back-compat, ignored (PrimeReact controls this)
}

export function Toaster({ position = 'bottom-right' }: ToasterProps) {
    return (
        <PrimeToast
            ref={(el) => { _register(el); }}
            position={position}
            baseZIndex={99999}
        />
    );
}

