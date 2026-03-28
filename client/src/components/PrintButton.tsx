import { useState } from 'react';
import { Printer } from 'lucide-react';
import { usePrinter } from '../hooks/usePrinter';
import { PrintableReceipt } from '@shared-print/PrintableReceipt';
import type { ReceiptData } from '@shared-print/PrintManager';

interface PrintButtonProps {
    data: ReceiptData;
    printerId?: string;
    label?: string;
}

export function PrintButton({ data, printerId, label }: PrintButtonProps) {
    const { print } = usePrinter();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await print(data, printerId);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                disabled={loading}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                }}
            >
                <Printer style={{ width: 16, height: 16 }} />
                {loading ? '...' : label ?? 'Imprimer'}
            </button>
            <PrintableReceipt data={data} />
        </>
    );
}
