import type { CSSProperties } from 'react';
import { AlertTriangle, Check, Loader2, Printer } from 'lucide-react';
import { usePrint, type PrintState } from '../hooks/usePrint';

interface Props {
  documentType: 'receipt' | 'bl' | 'devis' | 'bon_commande' | 'pos' | 'stock';
  documentRef: number;
  printerId?: string;
  warehouseId?: number;
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
  label = 'Imprimer',
  variant = 'button',
}: Props) {
  const { print, printHere, state, error, reset } = usePrint();
  const busy = state === 'queuing' || state === 'waiting';

  const LABELS: Record<PrintState, string> = {
    idle: label,
    queuing: 'Envoi…',
    waiting: 'Impression…',
    printed: 'Imprimé',
    offline: 'En attente',
    failed: 'Échec',
  };

  const title =
    state === 'offline'
      ? "Aucun agent n'a pris le travail. Il s'imprimera dès qu'un agent sera en ligne."
      : (error ?? label);

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
            printHere();
            reset();
          }}
          title="Ouvrir la boîte de dialogue d'impression du navigateur"
          style={{ ...BASE, borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}
        >
          Imprimer ici
        </button>
      )}
    </span>
  );
}
