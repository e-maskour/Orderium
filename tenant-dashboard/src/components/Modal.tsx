import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalTone = 'default' | 'danger' | 'warning';
export type ModalSize = 'sm' | 'md' | 'lg';

interface Props {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  /** Optional body. Omit for a compact header + footer confirmation. */
  children?: ReactNode;
  /** Rendered in the footer row: right-aligned on desktop, stacked on mobile. */
  footer?: ReactNode;
  size?: ModalSize;
  /** Colours the header icon badge. */
  tone?: ModalTone;
  /** Leading icon badge, sized by the modal (pass a bare lucide icon). */
  icon?: ReactNode;
  /** While true, Escape and backdrop clicks will not dismiss the dialog. */
  busy?: boolean;
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const TONE_BADGE: Record<ModalTone, string> = {
  default: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ── Body scroll lock ──────────────────────────────────────────────────────
   Reference-counted so stacked dialogs (or a dialog opened over the mobile
   sidebar) do not restore scrolling while another one is still open. The
   scrollbar width is compensated so the page behind does not shift.
   ──────────────────────────────────────────────────────────────────────── */
let lockCount = 0;
let prevOverflow = '';
let prevPaddingRight = '';

function lockScroll() {
  if (lockCount === 0) {
    const { body } = document;
    prevOverflow = body.style.overflow;
    prevPaddingRight = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
  }
  lockCount += 1;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = prevOverflow;
    document.body.style.paddingRight = prevPaddingRight;
  }
}

/**
 * The single dialog shell for the whole app.
 *
 * Rendered through a portal on `document.body` deliberately: every page root
 * carries `.animate-fade-in`, whose `animation-fill-mode: both` leaves a
 * `transform` on the element permanently. A transform establishes a containing
 * block for `position: fixed` descendants, so a modal rendered inside the page
 * tree would centre on the scrollable page box instead of the viewport.
 *
 * Layout is the overlay-scrolls pattern: the fixed layer scrolls, an inner
 * `min-h-full` flex row centres the panel, and the panel caps at the dynamic
 * viewport height. Content taller than the screen therefore scrolls inside the
 * body instead of being clipped off-screen — at any viewport size or aspect.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  tone = 'default',
  icon,
  busy = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Kept in a ref so the focus/keyboard effect does not re-run — and steal
  // focus back from the user — every time the parent re-renders.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const dismiss = useCallback(() => {
    if (!busyRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Prefer an explicit target, then the first control that is not the close
    // button, so opening a form dialog lands on its first field rather than "X".
    const initial =
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      focusable().find((el) => !el.hasAttribute('data-modal-close')) ??
      panelRef.current;
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (busyRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      // Focus can sit outside the panel (e.g. on the panel itself); pull it back.
      if (!panelRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    lockScroll();

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      unlockScroll();
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/65"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* pointer-events-none lets clicks in the gutter fall through to the backdrop */}
      <div className="pointer-events-none relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={`modal-panel animate-scale-in pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-card-xl outline-none ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${SIZES[size]}`}
        >
          {/* ── Header ── */}
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            {icon && (
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_BADGE[tone]}`}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base font-bold leading-6 text-slate-900 dark:text-slate-100"
              >
                {title}
              </h2>
              {description && (
                <p
                  id={descId}
                  className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
                >
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              data-modal-close
              onClick={onClose}
              disabled={busy}
              className="icon-btn -mr-1.5 -mt-1 h-8 w-8 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ── */}
          {/* flex-auto, not flex-1: with a content-based basis the body sizes
              to its content when the panel is uncapped (very short viewports)
              and still shrinks to scroll when the panel is capped. */}
          {children && (
            <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {children}
            </div>
          )}

          {/* ── Footer ── */}
          {footer && (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
