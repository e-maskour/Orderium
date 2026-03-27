import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FileText, Calendar, User, Phone, MapPin, AlertCircle, Download, Printer } from 'lucide-react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { invoicesService } from '../modules/invoices/invoices.service';
import { ordersService } from '../modules/orders/orders.service';
import { quotesService } from '../modules/quotes/quotes.service';
import { formatAmount } from '@orderium/ui';

function getDocType(pathname: string): 'invoice' | 'order' | 'quote' {
  if (pathname.includes('/invoice/')) return 'invoice';
  if (pathname.includes('/order/')) return 'order';
  return 'quote';
}

const DOC_LABELS: Record<string, { title: (ref: string) => string; partnerLabel: string }> = {
  invoice: { title: (ref) => `Facture ${ref}`, partnerLabel: 'Client' },
  order: { title: (ref) => `Bon de livraison ${ref}`, partnerLabel: 'Client' },
  quote: { title: (ref) => `Devis ${ref}`, partnerLabel: 'Client' },
};

export default function SharedDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const docType = getDocType(location.pathname);

  const [doc, setDoc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: any;
      if (docType === 'invoice') {
        data = await invoicesService.getByShareToken(token!);
        setDoc(data);
        setItems(data.items || []);
      } else if (docType === 'order') {
        data = await ordersService.getByShareToken(token!);
        setDoc(data);
        setItems(data.items || []);
      } else {
        const result = await quotesService.getByShareToken(token!);
        setDoc(result.quote);
        setItems(result.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Document introuvable ou lien expiré.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderRadius: '9999px', height: '3rem', width: '3rem', borderBottom: '2px solid #2563eb', borderTop: '2px solid transparent', borderLeft: '2px solid transparent', borderRight: '2px solid transparent', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#475569' }}>Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '2rem', maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <AlertCircle style={{ width: '4rem', height: '4rem', color: '#ef4444', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Lien invalide</h2>
          <p style={{ color: '#475569' }}>{error || 'Ce document n\'est pas disponible ou le lien a expiré.'}</p>
        </div>
      </div>
    );
  }

  const docRef = doc.invoiceNumber || doc.orderNumber || doc.quoteNumber || '';
  const partnerName = doc.customerName || doc.supplierName || '';
  const partnerPhone = doc.customerPhone || doc.supplierPhone || '';
  const partnerAddress = doc.customerAddress || doc.supplierAddress || '';
  const subtotal: number = Number(doc.subtotal) || 0;
  const tax: number = Number(doc.tax) || 0;
  const total: number = Number(doc.total) || 0;
  const docDate: string = doc.date || doc.dateCreated || '';

  const labels = DOC_LABELS[docType];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>

        {/* Header Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Top accent */}
          <div style={{ height: '3px', background: 'linear-gradient(to right, #235ae4, #818cf8)', borderRadius: '0.375rem', marginBottom: '1.25rem' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ padding: '0.875rem', background: 'linear-gradient(135deg, #eff6ff, #eef2ff)', borderRadius: '0.75rem', border: '1px solid rgba(35,90,228,0.15)' }}>
                <FileText style={{ width: '1.75rem', height: '1.75rem', color: '#235ae4' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.025em' }}>
                  {labels.title(docRef)}
                </h1>
                {docDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', fontSize: '0.875rem' }}>
                    <Calendar style={{ width: '0.875rem', height: '0.875rem' }} />
                    {new Date(docDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <Button
                onClick={handlePrint}
                outlined
                icon={<Printer style={{ width: '1rem', height: '1rem' }} />}
                label="Imprimer"
                style={{ fontSize: '0.875rem' }}
              />
            </div>
          </div>
        </div>

        {/* Partner Info */}
        {partnerName && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #f1f5f9' }}>
              {labels.partnerLabel}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <User style={{ width: '1.125rem', height: '1.125rem', color: '#94a3b8', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{partnerName}</span>
              </div>
              {partnerPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Phone style={{ width: '1.125rem', height: '1.125rem', color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: '#334155' }}>{partnerPhone}</span>
                </div>
              )}
              {partnerAddress && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <MapPin style={{ width: '1.125rem', height: '1.125rem', color: '#94a3b8', flexShrink: 0, marginTop: '0.125rem' }} />
                  <span style={{ color: '#334155' }}>{partnerAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #f1f5f9' }}>
            Articles
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <DataTable value={items} size="small" tableStyle={{ width: '100%', minWidth: '36rem' }}>
              <Column
                field="description"
                header="Description"
                headerStyle={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
                bodyStyle={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#0f172a' }}
                body={(item: any) => item.description || item.product?.name || '—'}
              />
              <Column
                field="quantity"
                header="Qté"
                headerStyle={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', width: '6rem' }}
                bodyStyle={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155' }}
              />
              <Column
                field="unitPrice"
                header="P.U. HT"
                headerStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', width: '9rem' }}
                bodyStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155' }}
                body={(item: any) => `${formatAmount(Number(item.unitPrice || item.priceBeforeTax || 0), 2)} DH`}
              />
              <Column
                field="total"
                header="Total TTC"
                headerStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', width: '9rem' }}
                bodyStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}
                body={(item: any) => `${formatAmount(Number(item.total || 0), 2)} DH`}
              />
            </DataTable>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <div style={{ width: '100%', maxWidth: '18rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.375rem 0' }}>
                <span style={{ color: '#64748b' }}>Sous-total HT</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{formatAmount(subtotal, 2)} DH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.375rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>TVA</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{formatAmount(tax, 2)} DH</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                borderRadius: '0.5rem',
                border: '1.5px solid rgba(35,90,228,0.18)',
                marginTop: '0.25rem',
              }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Total TTC</span>
                <span style={{ fontWeight: 800, color: '#235ae4', fontSize: '1.125rem' }}>{formatAmount(total, 2)} DH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {doc.notes && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Notes</h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.6 }}>{doc.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          Document partagé via Orderium
        </div>
      </div>
    </div>
  );
}
