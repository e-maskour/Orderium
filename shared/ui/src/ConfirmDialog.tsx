import { useEffect, useRef, useCallback } from 'react';
import { Trash2, Info, X, CheckCircle, ShieldAlert } from 'lucide-react';

export type ConfirmVariant = 'destructive' | 'warning' | 'neutral' | 'info';

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    onConfirm: () => void;
    onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
    icon: typeof Trash2;
    className: string;
}> = {
    destructive: {
        icon: Trash2,
        className: 'ord-confirm--destructive',
    },
    warning: {
        icon: ShieldAlert,
        className: 'ord-confirm--warning',
    },
    neutral: {
        icon: CheckCircle,
        className: 'ord-confirm--neutral',
    },
    info: {
        icon: Info,
        className: 'ord-confirm--info',
    },
};

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    variant = 'neutral',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    const config = VARIANT_CONFIG[variant];
    const Icon = config.icon;

    useEffect(() => {
        if (!open) return;

        const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onCancel(); return; }
            if (e.key === 'Tab' && dialogRef.current) {
                const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, onCancel]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onCancel();
    }, [onCancel]);

    if (!open) return null;

    return (
        <div
            className="ord-confirm-backdrop"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ord-confirm-title"
            aria-describedby={description ? 'ord-confirm-desc' : undefined}
        >
            <div className={`ord-confirm-panel ${config.className}`} ref={dialogRef}>
                <button
                    className="ord-confirm-close"
                    onClick={onCancel}
                    aria-label="Close"
                    type="button"
                >
                    <X size={20} />
                </button>

                <div className="ord-confirm-icon-ring">
                    <div className="ord-confirm-icon">
                        <Icon size={28} strokeWidth={2} />
                    </div>
                </div>

                <h2 id="ord-confirm-title" className="ord-confirm-title">{title}</h2>
                {description && (
                    <p id="ord-confirm-desc" className="ord-confirm-desc">{description}</p>
                )}

                <div className="ord-confirm-divider" />

                <div className="ord-confirm-actions">
                    <button
                        className="ord-confirm-btn ord-confirm-btn--cancel"
                        onClick={onCancel}
                        type="button"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        className="ord-confirm-btn ord-confirm-btn--confirm"
                        onClick={onConfirm}
                        type="button"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
