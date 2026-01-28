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
import { Search, Plus, Filter } from 'lucide-react';
import { invoicesService } from '../modules/invoices';
import PDFActionButtons, { PDFIconButtons } from '../components/PDFActionButtons';

export default function InvoicesListExample() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesService.getAll(),
  });

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
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus size={20} />
          Nouvelle facture
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Filter size={20} />
            Filtres
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Facture</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  Aucune facture trouvée
                </td>
              </tr>
            ) : (
              filteredInvoices.map((item: any) => {
                const invoice = item.invoice;
                return (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {invoice.customerName || invoice.customer?.name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {Number(invoice.total).toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      DH
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : invoice.status === 'unpaid'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {invoice.status === 'paid'
                          ? 'Payée'
                          : invoice.status === 'partial'
                          ? 'Partiel'
                          : invoice.status === 'unpaid'
                          ? 'Impayée'
                          : 'Brouillon'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        {/* METHOD 1: Using Icon Buttons (Recommended for tables) */}
                        <PDFIconButtons
                          documentType="invoice"
                          documentId={invoice.id}
                          documentNumber={invoice.invoiceNumber}
                        />

                        {/* METHOD 2: Using Full Buttons (Alternative, takes more space) */}
                        {/* 
                        <PDFActionButtons
                          documentType="invoice"
                          documentId={invoice.id}
                          documentNumber={invoice.invoiceNumber}
                          size="sm"
                        />
                        */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
              .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
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
