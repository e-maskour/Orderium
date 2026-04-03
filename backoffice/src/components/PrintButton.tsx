import { Printer, Loader2 } from 'lucide-react';
import { usePrinter } from '../hooks/usePrinter';
import { PrintableReceipt } from '@shared-print/PrintableReceipt';
import type { ReceiptData } from '@shared-print/PrintManager';

interface Props {
  data: ReceiptData;
  label?: string;
  variant?: 'button' | 'icon';
  className?: string;
}

export function PrintButton({
  data,
  label = 'Imprimer',
  variant = 'button',
  className = '',
}: Props) {
  const { print, isPrinting, receipt } = usePrinter();

  return (
    <>
      <button
        onClick={() => print(data)}
        disabled={isPrinting}
        title={label}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border
          text-sm font-medium transition-colors disabled:opacity-50
          bg-white hover:bg-gray-50 border-gray-200 text-gray-700 ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: isPrinting ? 'not-allowed' : 'pointer',
          opacity: isPrinting ? 0.5 : 1,
          backgroundColor: '#fff',
          color: '#374151',
        }}
      >
        {isPrinting ? (
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Printer style={{ width: 16, height: 16 }} />
        )}
        {variant === 'button' && (isPrinting ? 'Impression...' : label)}
      </button>

      <PrintableReceipt data={receipt} />
    </>
  );
}
