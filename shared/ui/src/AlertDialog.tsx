import { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Info, X, ShieldAlert } from 'lucide-react';

export type AlertVariant = 'destructive' | 'warning' | 'info';

export interface AlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  closeLabel?: string;
  variant?: AlertVariant;
  onClose: () => void;
}

interface VariantTokens {
  icon: typeof AlertTriangle;
  accentGradient: string;
  ringColor: string;
  iconBg: string;
  iconColor: string;
  closeBg: string;
  closeHoverBg: string;
}

const VARIANTS: Record<AlertVariant, VariantTokens> = {
  destructive: {
    icon: AlertTriangle,
    accentGradient: 'linear-gradient(90deg, #ef4444, #dc2626)',
    ringColor: 'rgba(239, 68, 68, 0.12)',
    iconBg: '#fef2f2',
    iconColor: '#dc2626',
    closeBg: '#dc2626',
    closeHoverBg: '#b91c1c',
  },
  warning: {
    icon: ShieldAlert,
    accentGradient: 'linear-gradient(90deg, #f59e0b, #d97706)',
    ringColor: 'rgba(245, 158, 11, 0.12)',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    closeBg: '#d97706',
    closeHoverBg: '#b45309',
  },
  info: {
    icon: Info,
    accentGradient: 'linear-gradient(90deg, #3b82f6, #2563eb)',
    ringColor: 'rgba(59, 130, 246, 0.12)',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    closeBg: '#2563eb',
    closeHoverBg: '#1d4ed8',
  },
};

export function AlertDialog({
  open,
  title,
  description,
  closeLabel = 'OK',
  variant = 'destructive',
  onClose,
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const tokens = VARIANTS[variant];
  const Icon = tokens.icon;

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
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
  }, [open, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="ord-confirm-backdrop"
      onClick={handleBackdropClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ord-alert-title"
      aria-describedby={description ? 'ord-alert-desc' : undefined}
    >
      <div className="ord-confirm-panel" ref={dialogRef}>
        {/* Accent bar */}
        <div
          className="ord-confirm-accent"
          style={{ background: tokens.accentGradient }}
          aria-hidden="true"
        />

        <button
          className="ord-confirm-close"
          onClick={onClose}
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

        <h2 id="ord-alert-title" className="ord-confirm-title">{title}</h2>

        {description && (
          <p id="ord-alert-desc" className="ord-confirm-desc">{description}</p>
        )}

        <div className="ord-confirm-divider" />

        <div className="ord-confirm-actions" style={{ justifyContent: 'center' }}>
          <button
            ref={closeBtnRef}
            className="ord-confirm-btn ord-confirm-btn--confirm"
            onClick={onClose}
            type="button"
            style={{
              background: tokens.closeBg,
              color: '#ffffff',
              border: 'none',
              minHeight: '48px',
              minWidth: '160px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = tokens.closeHoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = tokens.closeBg;
            }}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
