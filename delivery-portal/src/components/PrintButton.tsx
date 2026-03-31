import { useState } from 'react';
import { Printer } from 'lucide-react';
import { usePrinter } from '../hooks/usePrinter';
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
            <div id="morocom-receipt">
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 16 }}>{data.storeName}</strong>
                    {data.storePhone && <div>{data.storePhone}</div>}
                </div>
                <div>Commande : {data.orderNumber}</div>
                <div>Date : {data.date}</div>
                <div>Client : {data.clientName}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 6 }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Article</th>
                            <th style={{ textAlign: 'right' }}>Qté</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, i) => (
                            <tr key={i}>
                                <td>{item.name}</td>
                                <td style={{ textAlign: 'right' }}>{item.qty}</td>
                                <td style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ textAlign: 'right' }}><strong>Total : {data.total.toFixed(2)}</strong></div>
                {data.footer && <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10 }}>{data.footer}</div>}
            </div>
        </>
    );
}
