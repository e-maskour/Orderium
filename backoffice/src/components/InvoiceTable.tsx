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
              const isSelected = selectedInvoices.includes(invoice.invoice.id);
              const overdue = isOverdue(invoice);
              const canRecordPayment = invoice.invoice.paymentStatus !== 'paid' && invoice.invoice.status !== 'cancelled';
              const canChangeStatus = invoice.invoice.status !== 'cancelled';
              
              return (
                <tr 
                  key={invoice.invoice.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${overdue ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <button
                      onClick={() => onToggleSelect(invoice.invoice.id)}
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
                        <p className="text-sm font-medium text-slate-900">#{invoice.invoice.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(invoice.invoice.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    {invoice.customer ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{invoice.customer.name}</p>
                          {invoice.customer.email && (
                            <p className="text-xs text-slate-500">{invoice.customer.email}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">{t('invoice.noCustomer')}</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{formatCurrency(invoice.invoice.Total)}</p>
                      {invoice.invoice.PaidAmount > 0 && (
                        <p className="text-xs text-green-600">
                          {t('invoice.paid')}: {formatCurrency(invoice.invoice.PaidAmount)}
                        </p>
                      )}
                      {invoice.invoice.Total - invoice.invoice.PaidAmount > 0 && (
                        <p className={`text-xs ${overdue ? 'text-red-600' : 'text-orange-600'}`}>
                          {t('invoice.remaining')}: {formatCurrency(invoice.invoice.Total - invoice.invoice.PaidAmount)}
                        </p>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    {getStatusBadge(invoice.invoice.status)}
                  </td>
                  
                  <td className="px-4 py-4">
                    {getPaymentBadge(invoice.invoice.paymentStatus)}
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
                        {formatDate(invoice.invoice.DueDate)}
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
                                {invoice.invoice.status === 'draft' && (
                                  <button
                                    onClick={() => onStatusChange(invoice.invoice.id, 'sent')}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Send className="w-4 h-4" />
                                    {t('invoice.markAsSent')}
                                  </button>
                                )}
                                
                                {invoice.invoice.status !== 'paid' && invoice.invoice.paymentStatus === 'paid' && (
                                  <button
                                    onClick={() => onStatusChange(invoice.invoice.id, 'paid')}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {t('invoice.markAsPaid')}
                                  </button>
                                )}
                                
                                {invoice.invoice.status !== 'cancelled' && (
                                  <button
                                    onClick={() => onStatusChange(invoice.invoice.id, 'cancelled')}
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
                              onClick={() => onDelete(invoice.invoice.id)}
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