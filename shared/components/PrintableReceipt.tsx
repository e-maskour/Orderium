import type { ReceiptData } from './PrintManager';

interface Props {
    data: ReceiptData | null;
}

/**
 * Hidden receipt rendered in DOM for window.print() / AirPrint / Mopria fallback.
 * Only visible during @media print.
 */
export function PrintableReceipt({ data }: Props) {
    if (!data) return null;

    return (
        <div id="morocom-receipt">
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
                            <td style={{ textAlign: 'right' }}>{item.qty}</td>
                            <td style={{ textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ textAlign: 'right' }}>
                <div>Sous-total : {data.subtotal.toFixed(2)} DH</div>
                {data.discount != null && data.discount > 0 && (
                    <div>Remise : -{data.discount.toFixed(2)} DH</div>
                )}
                <strong style={{ fontSize: 14 }}>TOTAL : {data.total.toFixed(2)} DH</strong>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
                {data.footer ?? 'Merci pour votre confiance !'}
            </div>
        </div>
    );
}
