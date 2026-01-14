import React from 'react';
import { InvoiceWithDetails } from '../types';
import { 
  Eye, 
  Trash2, 
  DollarSign, 
  CheckSquare, 
  Square, 
  MoreHorizontal,
  Calendar,
  User,
  Edit,
  Send,
  CheckCircle2
} from 'lucide-react';

interface InvoiceCardProps {
  invoice: InvoiceWithDetails;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onRecordPayment: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  getPaymentBadge: (paymentStatus: string) => JSX.Element;
  isOverdue: boolean;
  t: (key: string) => string;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  isSelected,
  onToggleSelect,
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
  const canRecordPayment = invoice.Invoice.PaymentStatus !== 'paid' && invoice.Invoice.Status !== 'cancelled';
  const canChangeStatus = invoice.Invoice.Status !== 'cancelled';
  const customer = invoice.Customer;
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 relative ${
      isSelected ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
    } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onToggleSelect}
          className="w-6 h-6 rounded-md border-2 border-slate-300 flex items-center justify-center hover:border-blue-500 transition-colors bg-white"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-transparent" />
          )}
        </button>
      </div>

      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        {getStatusBadge(invoice.Invoice.Status)}
      </div>

      <div className="p-6 pt-12">
        {/* Invoice Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">
              {t('invoice.number')} #{invoice.Invoice.InvoiceNumber}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {t('invoice.createdAt')} {formatDate(invoice.Invoice.CreatedAt)}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        {customer && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
            <User className="w-4 h-4 text-slate-500" />
            <div>
              <p className="font-medium text-slate-900 text-sm">{customer.Name}</p>
              {customer.Email && (
                <p className="text-xs text-slate-500">{customer.Email}</p>
              )}
            </div>
          </div>
        )}

        {/* Financial Info */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">{t('invoice.total')}</span>
            <span className="font-semibold text-slate-900">{formatCurrency(invoice.Invoice.Total)}</span>
          </div>
          
          {invoice.Invoice.PaidAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">{t('invoice.paid')}</span>
              <span className="font-medium text-green-600">{formatCurrency(invoice.Invoice.PaidAmount)}</span>
            </div>
          )}
          
          {invoice.Invoice.Total - invoice.Invoice.PaidAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">{t('invoice.remaining')}</span>
              <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                {formatCurrency(invoice.Invoice.Total - invoice.Invoice.PaidAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Payment Status */}
        <div className="mb-4">
          {getPaymentBadge(invoice.Invoice.PaymentStatus)}
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>{t('invoice.dueDate')}: {formatDate(invoice.Invoice.DueDate)}</span>
          {isOverdue && (
            <span className="text-red-600 font-medium">({t('invoice.overdue')})</span>
          )}
        </div>

        {/* Items Count */}
        <div className="text-sm text-slate-500 mb-6">
          {invoice.Items?.length || 0} {t('invoice.items')}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            {t('view')}
          </button>
          
          {canRecordPayment && (
            <button
              onClick={onRecordPayment}
              className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <DollarSign className="w-4 h-4" />
              {t('invoice.recordPayment')}
            </button>
          )}
          
          <div className="relative group">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-1">
                {canChangeStatus && (
                  <>
                    {invoice.Invoice.Status === 'draft' && (
                      <button
                        onClick={() => onStatusChange('sent')}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {t('invoice.markAsSent')}
                      </button>
                    )}
                    
                    {invoice.Invoice.Status !== 'paid' && invoice.Invoice.PaymentStatus === 'paid' && (
                      <button
                        onClick={() => onStatusChange('paid')}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('invoice.markAsPaid')}
                      </button>
                    )}
                    
                    {invoice.Invoice.Status !== 'cancelled' && (
                      <button
                        onClick={() => onStatusChange('cancelled')}
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
                  onClick={onDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};