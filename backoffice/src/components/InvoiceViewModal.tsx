import React, { useState } from 'react';
import { InvoiceWithDetails } from '../types';
import { X, FileText, User, DollarSign, Package, Download } from 'lucide-react';

interface InvoiceViewModalProps {
  invoice: InvoiceWithDetails;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  getPaymentBadge: (paymentStatus: string) => JSX.Element;
  t: (key: string) => string;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoice,
  onClose,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getPaymentBadge,
  t
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'payments'>('details');
  
  const subtotal = invoice.items?.reduce((sum, item) => sum + (item.Quantity * item.UnitPrice), 0) || 0;
  const taxAmount = invoice.invoice.TaxAmount || 0;
  const discount = invoice.invoice.DiscountAmount || 0;
  const total = subtotal + taxAmount - discount;
  
  const isOverdue = invoice.invoice.paymentStatus !== 'paid' && 
                   new Date(invoice.invoice.DueDate) < new Date();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t('invoice.number')} #{invoice.invoice.invoiceNumber}
              </h2>
              <p className="text-sm text-slate-500">
                {t('invoice.createdAt')} {formatDate(invoice.invoice.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4" />
              {t('invoice.download')}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusBadge(invoice.invoice.status)}
              {getPaymentBadge(invoice.invoice.paymentStatus)}
              {isOverdue && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {t('invoice.overdue')}
                </span>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-sm text-slate-600">{t('invoice.total')}</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.invoice.Total)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            {([
              { id: 'details', label: t('details') },
              { id: 'items', label: `${t('items')} (${invoice.items?.length || 0})` },
              { id: 'payments', label: t('invoice.payments') }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  {t('invoice.information')}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('invoice.number')}</span>
                    <span className="font-medium">#{invoice.invoice.invoiceNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('invoice.issueDate')}</span>
                    <span className="font-medium">{formatDate(invoice.invoice.Date)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('invoice.dueDate')}</span>
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {formatDate(invoice.invoice.DueDate)}
                    </span>
                  </div>
                  
                  {invoice.invoice.Note && (
                    <div>
                      <span className="block text-slate-600 mb-1">{t('invoice.notes')}</span>
                      <p className="text-sm bg-slate-50 p-3 rounded-lg">{invoice.invoice.Note}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  {t('customer.information')}
                </h3>
                
                {invoice.customer ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">{invoice.customer.name}</p>
                        {invoice.customer.email && (
                          <p className="text-sm text-slate-600">{invoice.customer.email}</p>
                        )}
                        {invoice.customer.phone && (
                          <p className="text-sm text-slate-600">{invoice.customer.phone}</p>
                        )}
                      </div>
                    </div>
                    
                    {invoice.customer.address && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-700">{invoice.customer.address}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">{t('invoice.noCustomer')}</p>
                )}
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {invoice.items && invoice.items.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                            {t('product')}
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                            {t('quantity')}
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                            {t('price')}
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                            {t('total')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoice.items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Package className="w-4 h-4 text-slate-400" />
                                <div>
                                  <p className="font-medium text-slate-900">{item.ProductName}</p>
                                  {item.description && (
                                    <p className="text-sm text-slate-500">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-900">{item.Quantity}</td>
                            <td className="px-4 py-3 text-slate-900">{formatCurrency(item.UnitPrice)}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {formatCurrency(item.Quantity * item.UnitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-end">
                      <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-slate-600">
                          <span>{t('invoice.subtotal')}</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        
                        {taxAmount > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>{t('invoice.tax')}</span>
                            <span>{formatCurrency(taxAmount)}</span>
                          </div>
                        )}
                        
                        {discount > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>{t('invoice.discount')}</span>
                            <span>-{formatCurrency(discount)}</span>
                          </div>
                        )}
                        
                        <hr />
                        
                        <div className="flex justify-between font-semibold text-lg text-slate-900">
                          <span>{t('invoice.total')}</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p>{t('invoice.noItems')}</p>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">{t('invoice.total')}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(invoice.invoice.Total)}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">{t('invoice.paid')}</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(invoice.invoice.PaidAmount)}</p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600">{t('invoice.remaining')}</p>
                  <p className="text-xl font-bold text-orange-700">
                    {formatCurrency(invoice.invoice.Total - invoice.invoice.PaidAmount)}
                  </p>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">{t('invoice.paymentHistory')}</h4>
                
                {/* Payment history would need to be fetched separately or added to the interface */}
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p>{t('invoice.noPayments')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};