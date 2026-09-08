import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal, type ModalTone } from './Modal';

type Variant = 'danger' | 'warning' | 'default';

interface Props {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmVariant?: Variant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** Extra input the confirmation depends on, e.g. a reason or a typed phrase. */
  children?: ReactNode;
  /** Gates the confirm button on top of `loading`. */
  confirmDisabled?: boolean;
  /** Overrides the "Processing…" label shown while `loading`. */
  loadingLabel?: string;
}

const TONE: Record<Variant, ModalTone> = {
  danger: 'danger',
  warning: 'warning',
  default: 'default',
};

const CONFIRM_CLASS: Record<Variant, string> = {
  danger: 'btn-danger',
  warning: 'btn-warning',
  default: 'btn-primary',
};

/**
 * Confirmation prompt built on `Modal`, so it inherits viewport centering,
 * the focus trap, Escape-to-close and the scroll lock.
 *
 * Cancel comes first in the DOM: it takes initial focus, and the footer
 * reverses on mobile so the confirm action still sits on top.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
  children,
  confirmDisabled = false,
  loadingLabel = 'Processing…',
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      size="sm"
      tone={TONE[confirmVariant]}
      busy={loading}
      icon={
        confirmVariant === 'default' ? (
          <Info className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )
      }
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={CONFIRM_CLASS[confirmVariant]}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
