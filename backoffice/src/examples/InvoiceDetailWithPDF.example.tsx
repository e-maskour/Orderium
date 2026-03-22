/**
 * Example: How to integrate PDF Action Buttons in Invoice Detail Page
 * 
 * This shows how to use the full-sized PDF buttons on a detail page
 * where there's more space available.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { invoicesService } from '../modules/invoices';
import PDFActionButtons from '../components/PDFActionButtons';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { formatAmount } from '@orderium/ui';

export default function InvoiceDetailExample() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();

  // Fetch invoice details
  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesService.getById(Number(invoiceId)),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">Chargement...</div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 text-red-600">Facture introuvable</div>
      </div>
    );
  }

  const invoice = invoiceData.invoice;
  const items = invoiceData.items || [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with PDF Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            text
            rounded
            icon={<ArrowLeft size={20} />}
            onClick={() => navigate('/invoices')}
            className="p-button-plain"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Facture {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-slate-500">
              Créée le {new Date(invoice.dateCreated).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {/* METHOD 1: Full PDF Buttons (Recommended for detail pages) */}
          <PDFActionButtons
            documentType="invoice"
            documentId={invoice.id}
            documentNumber={invoice.invoiceNumber}
            size="md"
            showPreview={true}
            showDownload={true}
          />

          <Button
            outlined
            label="Modifier"
            icon={<Edit size={16} />}
            className="p-button-secondary"
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${invoice.status === 'paid'
            ? 'bg-green-100 text-green-700'
            : invoice.status === 'partial'
              ? 'bg-yellow-100 text-yellow-700'
              : invoice.status === 'unpaid'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-slate-100 text-slate-700'
            }`}
        >
          {invoice.status === 'paid'
            ? '✓ Payée'
            : invoice.status === 'partial'
              ? '◐ Partiellement payée'
              : invoice.status === 'unpaid'
                ? '○ Impayée'
                : '✎ Brouillon'}
        </span>
      </div>

      {/* Invoice Details Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Informations Générales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-600">Client</label>
            <div className="font-semibold text-slate-900">
              {invoice.customerName || 'N/A'}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Date de facture</label>
            <div className="font-semibold text-slate-900">
              {new Date(invoice.date).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Téléphone</label>
            <div className="font-semibold text-slate-900">
              {invoice.customerPhone || 'N/A'}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-600">Date d'échéance</label>
            <div className="font-semibold text-slate-900">
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString('fr-FR')
                : 'N/A'}
            </div>
          </div>
          {invoice.customerAddress && (
            <div className="col-span-2">
              <label className="text-sm text-slate-600">Adresse</label>
              <div className="font-semibold text-slate-900">{invoice.customerAddress}</div>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Articles</h2>
        </div>
        <DataTable value={items} size="small" tableStyle={{ width: '100%' }}>
          <Column
            field="description"
            header="Description"
            headerStyle={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ padding: '0.75rem 1rem', color: '#0f172a' }}
            body={(item: any) => item.description || item.product?.name || 'N/A'}
          />
          <Column
            field="quantity"
            header="Quantité"
            headerStyle={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ textAlign: 'center', padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}
          />
          <Column
            field="unitPrice"
            header="Prix Unitaire"
            headerStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#334155' }}
            body={(item: any) => `${NumberformatAmount(item.unitPrice, 2)} DH`}
          />
          <Column
            field="total"
            header="Total"
            headerStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}
            body={(item: any) => `${NumberformatAmount(item.total, 2)} DH`}
          />
        </DataTable>
      </div>

      {/* Totals Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="max-w-md ml-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Sous-total HT:</span>
            <span className="font-semibold text-slate-900">
              {formatAmount(Number(invoice.subtotal), 2)}{' '}
              DH
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">TVA (20%):</span>
            <span className="font-semibold text-slate-900">
              {formatAmount(Number(invoice.tax), 2)}{' '}
              DH
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-slate-200">
            <span className="font-bold text-slate-900">Total TTC:</span>
            <span className="font-bold text-xl text-blue-600">
              {formatAmount(Number(invoice.total), 2)}{' '}
              DH
            </span>
          </div>
          {invoice.status !== 'draft' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Montant payé:</span>
                <span className="font-semibold text-green-600">
                  {formatAmount(Number(invoice.paidAmount || 0), 2)}{' '}
                  DH
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Montant restant:</span>
                <span className="font-semibold text-orange-600">
                  {formatAmount(Number(invoice.remainingAmount || invoice.total), 2)}{' '}
                  DH
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Notes</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Action Buttons at Bottom */}
      <div className="flex justify-between items-center">
        <Button
          severity="danger"
          outlined
          label="Supprimer"
          icon={<Trash2 size={16} />}
        />

        {/* Alternative: Large PDF Buttons at bottom */}
        <PDFActionButtons
          documentType="invoice"
          documentId={invoice.id}
          documentNumber={invoice.invoiceNumber}
          size="lg"
        />
      </div>
    </div>
  );
}

/**
 * INTEGRATION TIPS FOR DETAIL PAGES:
 * 
 * 1. Use size="md" or size="lg" for better visibility
 * 2. Place buttons in header for quick access
 * 3. Can also place at bottom for secondary action
 * 4. showPreview and showDownload both true gives users choice
 * 5. documentNumber improves user feedback in toast messages
 * 
 * VARIATIONS:
 * 
 * // Only preview button (e.g., for quotes that shouldn't be downloaded yet)
 * <PDFActionButtons
 *   documentType="quote"
 *   documentId={quote.id}
 *   documentNumber={quote.quoteNumber}
 *   showDownload={false}
 *   size="md"
 * />
 * 
 * // Only download button (e.g., for finalized invoices)
 * <PDFActionButtons
 *   documentType="invoice"
 *   documentId={invoice.id}
 *   documentNumber={invoice.invoiceNumber}
 *   showPreview={false}
 *   size="md"
 * />
 * 
 * // Custom styling
 * <PDFActionButtons
 *   documentType="delivery-note"
 *   documentId={order.id}
 *   documentNumber={order.orderNumber}
 *   className="custom-class"
 *   size="md"
 * />
 */
