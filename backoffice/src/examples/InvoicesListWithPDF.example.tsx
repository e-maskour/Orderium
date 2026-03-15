/**
 * Example: How to integrate PDF Action Buttons in Invoice List Page
 * 
 * This is a reference implementation showing how to add PDF preview/download
 * functionality to an invoice list page.
 * 
 * Copy the relevant parts to your actual invoice list page.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Filter } from 'lucide-react';
import { invoicesService } from '../modules/invoices';
import PDFActionButtons, { PDFIconButtons } from '../components/PDFActionButtons';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';

export default function InvoicesListExample() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch invoices
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesService.getAll(),
  });
  const invoices = data?.invoices || [];

  // Filter invoices based on search
  const filteredInvoices = invoices.filter((item: any) => {
    const invoice = item.invoice;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
      invoice.customerName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Factures</h1>
        <Button
          label="Nouvelle facture"
          icon={<Plus size={20} />}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="p-input-icon-left w-full">
              <i className="pi pi-search" />
              <InputText
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par numéro ou client..."
                className="w-full"
              />
            </span>
          </div>
          <Button
            outlined
            label="Filtres"
            icon={<Filter size={20} />}
            className="p-button-secondary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          value={filteredInvoices}
          loading={isLoading}
          size="small"
          emptyMessage="Aucune facture trouvée"
          tableStyle={{ width: '100%' }}
        >
          <Column
            field="invoice.invoiceNumber"
            header="N° Facture"
            headerStyle={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}
            body={(item: any) => item.invoice.invoiceNumber}
          />
          <Column
            field="invoice.customerName"
            header="Client"
            headerStyle={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ padding: '0.75rem 1rem', color: '#334155' }}
            body={(item: any) => item.invoice.customerName || item.invoice.customer?.name || 'N/A'}
          />
          <Column
            field="invoice.date"
            header="Date"
            headerStyle={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ padding: '0.75rem 1rem', color: '#475569' }}
            body={(item: any) => new Date(item.invoice.date).toLocaleDateString('fr-FR')}
          />
          <Column
            field="invoice.total"
            header="Montant"
            headerStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}
            body={(item: any) => `${Number(item.invoice.total).toLocaleString('de-DE', { minimumFractionDigits: 2 })} DH`}
          />
          <Column
            field="invoice.status"
            header="Statut"
            headerStyle={{ textAlign: 'center', padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ textAlign: 'center', padding: '0.75rem 1rem' }}
            body={(item: any) => {
              const status = item.invoice.status;
              const severity = status === 'paid' ? 'success' : status === 'partial' ? 'warning' : status === 'unpaid' ? 'danger' : 'secondary';
              const label = status === 'paid' ? 'Payée' : status === 'partial' ? 'Partiel' : status === 'unpaid' ? 'Impayée' : 'Brouillon';
              return <Tag severity={severity} value={label} />;
            }}
          />
          <Column
            header="Actions PDF"
            headerStyle={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}
            bodyStyle={{ padding: '0.75rem 1rem' }}
            body={(item: any) => (
              <div className="flex justify-content-end">
                <PDFIconButtons
                  documentType="invoice"
                  documentId={item.invoice.id}
                  documentNumber={item.invoice.invoiceNumber}
                />
              </div>
            )}
          />
        </DataTable>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Total Factures</div>
          <div className="text-2xl font-bold text-slate-900">{invoices.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Payées</div>
          <div className="text-2xl font-bold text-green-600">
            {invoices.filter((i: any) => i.invoice.status === 'paid').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Impayées</div>
          <div className="text-2xl font-bold text-orange-600">
            {invoices.filter((i: any) => i.invoice.status === 'unpaid').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-600 mb-1">Montant Total</div>
          <div className="text-2xl font-bold text-blue-600">
            {invoices
              .reduce((sum: number, i: any) => sum + Number(i.invoice.total), 0)
              .toLocaleString('de-DE', { minimumFractionDigits: 2 })}{' '}
            DH
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST:
 * 
 * 1. ✅ Import PDFActionButtons or PDFIconButtons
 * 2. ✅ Add to table actions column
 * 3. ✅ Pass documentType (invoice, quote, delivery-note)
 * 4. ✅ Pass documentId (invoice.id)
 * 5. ✅ Optionally pass documentNumber for better toast messages
 * 
 * That's it! The service handles:
 * - API calls
 * - Preview in new window
 * - Download with proper filename
 * - Toast notifications
 * - Error handling
 */

/**
 * QUICK COPY-PASTE:
 * 
 * For Invoice List:
 * ```tsx
 * <PDFIconButtons
 *   documentType="invoice"
 *   documentId={invoice.id}
 *   documentNumber={invoice.invoiceNumber}
 * />
 * ```
 * 
 * For Quote List:
 * ```tsx
 * <PDFIconButtons
 *   documentType="quote"
 *   documentId={quote.id}
 *   documentNumber={quote.quoteNumber}
 * />
 * ```
 * 
 * For Delivery Notes / Orders List:
 * ```tsx
 * <PDFIconButtons
 *   documentType="delivery-note"
 *   documentId={order.id}
 *   documentNumber={order.orderNumber}
 * />
 * ```
 */
