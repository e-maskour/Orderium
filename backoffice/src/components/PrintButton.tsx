import type { CSSProperties } from 'react';
import { AlertTriangle, Check, Loader2, Printer } from 'lucide-react';
import { usePrint, type PrintState } from '../hooks/usePrint';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  documentType: 'receipt' | 'bl' | 'devis' | 'bon_commande' | 'pos' | 'stock';
  documentRef: number;
  printerId?: string;
  warehouseId?: number;
  /** Defaults to the translated "Imprimer". */
  label?: string;
  variant?: 'button' | 'icon';
}

const BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  fontSize: '0.875rem',
  fontWeight: 500,
  backgroundColor: '#fff',
  color: '#374151',
};

const ICONS: Record<PrintState, JSX.Element> = {
  idle: <Printer style={{ width: 16, height: 16 }} />,
  queuing: <Loader2 className="spin" style={{ width: 16, height: 16 }} />,
  waiting: <Loader2 className="spin" style={{ width: 16, height: 16 }} />,
  printed: <Check style={{ width: 16, height: 16, color: '#059669' }} />,
  offline: <AlertTriangle style={{ width: 16, height: 16, color: '#d97706' }} />,
  failed: <AlertTriangle style={{ width: 16, height: 16, color: '#dc2626' }} />,
};

/**
 * Queues a document for printing and shows what actually happened.
 *
 * There is deliberately no automatic browser fallback: that is what made the
 * old implementation appear to work while silently printing nothing useful.
 */
export function PrintButton({
  documentType,
  documentRef,
  printerId,
  warehouseId,
  label,
  variant = 'button',
}: Props) {
  const { t } = useLanguage();
  const { print, printHere, state, error, reset } = usePrint();
  const busy = state === 'queuing' || state === 'waiting';
  const idleLabel = label ?? t('print');

  const LABELS: Record<PrintState, string> = {
    idle: idleLabel,
    queuing: t('printSending'),
    waiting: t('printPrinting'),
    printed: t('printDone'),
    offline: t('printQueued'),
    failed: t('printFailed'),
  };

  const title =
    state === 'offline' ? t('printQueuedTooltip') : (error ?? idleLabel);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={() => void print({ documentType, documentRef, printerId, warehouseId })}
        disabled={busy}
        title={title}
        style={{
          ...BASE,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {ICONS[state]}
        {variant === 'button' && LABELS[state]}
      </button>

      {(state === 'offline' || state === 'failed') && (
        <button
          type="button"
          onClick={() => {
            printHere(documentRef, documentType);
            reset();
          }}
          title={t('printHereTooltip')}
          style={{ ...BASE, borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}
        >
          {t('printHere')}
        </button>
      )}
    </span>
  );
}
