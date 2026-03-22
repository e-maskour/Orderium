import { type ReactNode, createElement } from 'react';
import { toast } from './toast';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Trash2,
    PlusCircle,
    Pencil,
    Download,
    Upload,
    Send,
    FileText,
    Link,
    Archive,
    ShieldCheck,
    ShieldOff,
    Truck,
    Ban,
    Copy,
} from 'lucide-react';

const icon = (Icon: typeof CheckCircle, color?: string) =>
    createElement(Icon, { size: 18, color });

interface ToastOptions {
    description?: ReactNode;
    icon?: ReactNode;
    duration?: number | null;
}

interface PromiseMessages<T = unknown> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
}

/**
 * Unified notification API for all Orderium apps.
 */
export const notify = {
    // ── Base toasts ──
    success(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(CheckCircle, '#16a34a'), ...opts });
    },
    error(title: string, opts?: ToastOptions) {
        return toast.error(title, { icon: icon(XCircle, '#dc2626'), ...opts });
    },
    warning(title: string, opts?: ToastOptions) {
        return toast.warning(title, { icon: icon(AlertTriangle, '#d97706'), ...opts });
    },
    info(title: string, opts?: ToastOptions) {
        return toast.info(title, { icon: icon(Info, '#2563eb'), ...opts });
    },

    // ── Action-specific toasts ──
    created(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(PlusCircle, '#16a34a'), ...opts });
    },
    updated(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Pencil, '#2563eb'), ...opts });
    },
    deleted(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Trash2, '#dc2626'), ...opts });
    },
    exported(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Download, '#16a34a'), ...opts });
    },
    imported(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Upload, '#2563eb'), ...opts });
    },
    sent(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Send, '#16a34a'), ...opts });
    },
    validated(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(ShieldCheck, '#16a34a'), ...opts });
    },
    devalidated(title: string, opts?: ToastOptions) {
        return toast.warning(title, { icon: icon(ShieldOff, '#d97706'), ...opts });
    },
    delivered(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Truck, '#16a34a'), ...opts });
    },
    cancelled(title: string, opts?: ToastOptions) {
        return toast.warning(title, { icon: icon(Ban, '#d97706'), ...opts });
    },
    archived(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Archive, '#6b7280'), ...opts });
    },
    copied(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Copy, '#16a34a'), ...opts });
    },
    document(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(FileText, '#2563eb'), ...opts });
    },
    linked(title: string, opts?: ToastOptions) {
        return toast.success(title, { icon: icon(Link, '#2563eb'), ...opts });
    },

    // ── Action toast with button ──
    action(
        title: string,
        buttonLabel: string,
        onClick: () => void,
        opts?: Omit<ToastOptions, 'duration'>,
    ) {
        return toast.action(title, {
            description: opts?.description,
            icon: opts?.icon ?? icon(AlertTriangle, '#d97706'),
            button: { title: buttonLabel, onClick },
        });
    },

    // ── Promise toast ──
    promise<T>(promise: Promise<T>, messages: PromiseMessages<T>) {
        return toast.promise(promise, messages);
    },

    dismiss(id: string) {
        toast.dismiss(id);
    },

    clear() {
        toast.clear();
    },
};
