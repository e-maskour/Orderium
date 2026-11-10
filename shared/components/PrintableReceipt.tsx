import { createPortal } from 'react-dom';
import type { ReceiptData } from './PrintManager';
import { formatAmount } from '../ui/src/formatAmount';
import { formatQuantity } from '../ui/src/numberFormat';

interface Props {
    data: ReceiptData | null;
}

/**
 * Hidden receipt rendered in DOM for window.print() / AirPrint / Mopria fallback.
 * Only visible during @media print.
 * Rendered via portal directly on <body> so the CSS selector
 * `body > *:not(#marnova-receipt)` correctly hides the app shell.
 */
export function PrintableReceipt({ data }: Props) {
    if (!data) return null;

    return createPortal(
        <div id="marnova-receipt">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 16 }}>{data.storeName}</strong>
                {data.storePhone && <div>{data.storePhone}</div>}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div>Commande : {data.orderNumber}</div>
            <div>Date : {data.date}</div>
            <div>Client : {data.clientName}</div>
            {data.clientPhone && <div>Tél : {data.clientPhone}</div>}

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left' }}>Article</th>
                        <th style={{ textAlign: 'right' }}>Qté</th>
                        <th style={{ textAlign: 'right' }}>PU</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, i) => (
                        <tr key={i}>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{formatQuantity(item.qty)}</td>
                            <td style={{ textAlign: 'right' }}>{formatAmount(item.unitPrice)}</td>
                            <td style={{ textAlign: 'right' }}>{formatAmount(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ textAlign: 'right' }}>
                <div>Sous-total : {formatAmount(data.subtotal)} DH</div>
                {data.discount != null && data.discount > 0 && (
                    <div>Remise : -{formatAmount(data.discount)} DH</div>
                )}
                <strong style={{ fontSize: 14 }}>TOTAL : {formatAmount(data.total)} DH</strong>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
                {data.footer ?? 'Merci pour votre confiance !'}
            </div>
        </div>,
        document.body,
    );
}
