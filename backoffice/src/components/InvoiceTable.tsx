import React from 'react';
import { InvoiceWithDetails } from '../types';
import { 
  Eye, 
  Trash2, 
  DollarSign, 
  CheckSquare, 
  Square, 
  MoreHorizontal,
  User,
  Calendar,
  Send,
  CheckCircle2,
  Edit
} from 'lucide-react';

interface InvoiceTableProps {
  invoices: InvoiceWithDetails[];
  selectedInvoices: number[];
  onToggleSelect: (invoiceId: number) => void;
  onToggleSelectAll: () => void;
  onView: (invoice: InvoiceWithDetails) => void;
  onRecordPayment: (invoice: InvoiceWithDetails) => void;
  onDelete: (invoiceId: number) => void;
  onStatusChange: (invoiceId: number, status: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  getPaymentBadge: (paymentStatus: string) => JSX.Element;
  isOverdue: (invoice: InvoiceWithDetails) => boolean;
  t: (key: string) => string;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  selectedInvoices,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onRecordPayment,
  onDelete,
  onStatusChange,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getPaymentBadge,
  isOverdue,
  t
}) => {
  const allSelected = invoices.length > 0 && selectedInvoices.length === invoices.length;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-3">
                <button
                  onClick={onToggleSelectAll}
                  className="w-6 h-6 rounded-md border-2 border-slate-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-transparent" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('invoice.number')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('customer')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('invoice.total')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('invoice.status')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('invoice.payment')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('invoice.dueDate')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoices.map((invoice) => {
              const isSelected = selectedInvoices.includes(invoice.Invoice.Id);
              const overdue = isOverdue(invoice);
              const canRecordPayment = invoice.Invoice.PaymentStatus !== 'paid' && invoice.Invoice.Status !== 'cancelled';
              const canChangeStatus = invoice.Invoice.Status !== 'cancelled';
              
              return (
                <tr 
                  key={invoice.Invoice.Id}
                  className={`hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${overdue ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <button
                      onClick={() => onToggleSelect(invoice.Invoice.Id)}
                      className="w-6 h-6 rounded-md border-2 border-slate-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-transparent" />
                      )}
                    </button>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-medium text-slate-900">#{invoice.Invoice.InvoiceNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(invoice.Invoice.CreatedAt)}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    {invoice.Customer ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{invoice.Customer.Name}</p>
                          {invoice.Customer.Email && (
                            <p className="text-xs text-slate-500">{invoice.Customer.Email}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">{t('invoice.noCustomer')}</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{formatCurrency(invoice.Invoice.Total)}</p>
                      {invoice.Invoice.PaidAmount > 0 && (
                        <p className="text-xs text-green-600">
                          {t('invoice.paid')}: {formatCurrency(invoice.Invoice.PaidAmount)}
                        </p>
                      )}
                      {invoice.Invoice.Total - invoice.Invoice.PaidAmount > 0 && (
                        <p className={`text-xs ${overdue ? 'text-red-600' : 'text-orange-600'}`}>
                          {t('invoice.remaining')}: {formatCurrency(invoice.Invoice.Total - invoice.Invoice.PaidAmount)}
                        </p>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    {getStatusBadge(invoice.Invoice.Status)}
                  </td>
                  
                  <td className="px-4 py-4">
                    {getPaymentBadge(invoice.Invoice.PaymentStatus)}
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
                        {formatDate(invoice.Invoice.DueDate)}
                      </span>
                    </div>
                    {overdue && (
                      <p className="text-xs text-red-500 mt-1">{t('invoice.overdue')}</p>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView(invoice)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {canRecordPayment && (
                        <button
                          onClick={() => onRecordPayment(invoice)}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title={t('invoice.recordPayment')}
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="relative group">
                        <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <div className="py-1">
                            {canChangeStatus && (
                              <>
                                {invoice.Invoice.Status === 'draft' && (
                                  <button
                                    onClick={() => onStatusChange(invoice.Invoice.Id, 'sent')}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    {t('invoice.markAsSent')}
                                  </button>
                                )}
                                
                                {invoice.Invoice.Status !== 'paid' && invoice.Invoice.PaymentStatus === 'paid' && (
                                  <button
                                    onClick={() => onStatusChange(invoice.Invoice.Id, 'paid')}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {t('invoice.markAsPaid')}
                                  </button>
                                )}
                                
                                {invoice.Invoice.Status !== 'cancelled' && (
                                  <button
                                    onClick={() => onStatusChange(invoice.Invoice.Id, 'cancelled')}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    {t('invoice.cancel')}
                                  </button>
                                )}
                              </>
                            )}
                            
                            <hr className="my-1" />
                            
                            <button
                              onClick={() => onDelete(invoice.Invoice.Id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};