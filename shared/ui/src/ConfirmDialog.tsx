import { useEffect, useRef, useCallback } from 'react';
import { Trash2, Info, X, CheckCircle, ShieldAlert } from 'lucide-react';

export type ConfirmVariant = 'destructive' | 'warning' | 'neutral' | 'info';

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: string;
    /** Optional secondary detail line — e.g. record name, reference, or affected count */
    detail?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    onConfirm: () => void;
    onCancel: () => void;
}

interface VariantTokens {
    icon: typeof Trash2;
    accentGradient: string;
    ringColor: string;         // outer ring background
    iconBg: string;            // inner icon circle background
    iconColor: string;         // icon stroke color
    confirmBg: string;         // confirm button background
    confirmHoverBg: string;    // confirm button hover background
}

const VARIANTS: Record<ConfirmVariant, VariantTokens> = {
    destructive: {
        icon: Trash2,
        accentGradient: 'linear-gradient(90deg, #ef4444, #dc2626)',
        ringColor: 'rgba(239, 68, 68, 0.12)',
        iconBg: '#fef2f2',
        iconColor: '#dc2626',
        confirmBg: '#dc2626',
        confirmHoverBg: '#b91c1c',
    },
    warning: {
        icon: ShieldAlert,
        accentGradient: 'linear-gradient(90deg, #f59e0b, #d97706)',
        ringColor: 'rgba(245, 158, 11, 0.12)',
        iconBg: '#fffbeb',
        iconColor: '#d97706',
        confirmBg: '#d97706',
        confirmHoverBg: '#b45309',
    },
    neutral: {
        icon: CheckCircle,
        accentGradient: 'linear-gradient(90deg, #10b981, #059669)',
        ringColor: 'rgba(16, 185, 129, 0.12)',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        confirmBg: '#059669',
        confirmHoverBg: '#047857',
    },
    info: {
        icon: Info,
        accentGradient: 'linear-gradient(90deg, #3b82f6, #2563eb)',
        ringColor: 'rgba(59, 130, 246, 0.12)',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        confirmBg: '#2563eb',
        confirmHoverBg: '#1d4ed8',
    },
};

export function ConfirmDialog({
    open,
    title,
    description,
    detail,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    variant = 'neutral',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    const tokens = VARIANTS[variant];
    const Icon = tokens.icon;

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
            <div className="ord-confirm-panel" ref={dialogRef}>
                {/* Accent bar — inline so PrimeReact ::before resets can't touch it */}
                <div
                    className="ord-confirm-accent"
                    style={{ background: tokens.accentGradient }}
                    aria-hidden="true"
                />

                <button
                    className="ord-confirm-close"
                    onClick={onCancel}
                    aria-label="Close"
                    type="button"
                >
                    <X size={20} />
                </button>

                {/* Icon ring */}
                <div
                    className="ord-confirm-icon-ring"
                    style={{ background: tokens.ringColor }}
                >
                    <div
                        className="ord-confirm-icon"
                        style={{ background: tokens.iconBg, color: tokens.iconColor }}
                    >
                        <Icon size={28} strokeWidth={2} />
                    </div>
                </div>

                <h2 id="ord-confirm-title" className="ord-confirm-title">{title}</h2>

                {description && (
                    <p id="ord-confirm-desc" className="ord-confirm-desc">{description}</p>
                )}
                {detail && (
                    <p className="ord-confirm-detail">{detail}</p>
                )}

                <div className="ord-confirm-divider" />

                <div className="ord-confirm-actions">
                    <button
                        className="ord-confirm-btn ord-confirm-btn--cancel"
                        onClick={onCancel}
                        type="button"
                        style={{ minHeight: '48px' }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        className="ord-confirm-btn ord-confirm-btn--confirm"
                        onClick={onConfirm}
                        type="button"
                        style={{
                            background: tokens.confirmBg,
                            color: '#ffffff',
                            border: 'none',
                            minHeight: '48px',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = tokens.confirmHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = tokens.confirmBg;
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
