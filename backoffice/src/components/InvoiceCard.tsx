import React from 'react';
import { InvoiceWithDetails } from '../types';
import { 
  CheckSquare, 
  Square, 
  User,
  Calendar,
  AlertCircle
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
  formatCurrency,
  formatDate,
  getStatusBadge,
  getPaymentBadge,
  isOverdue,
  t
}) => {
  const customer = invoice.customer;
  
  return (
    <div 
      onClick={onView}
      className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md cursor-pointer relative ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
      } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
    >
      {/* Selection Checkbox */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className="absolute top-2 left-2 z-10"
      >
        <button className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 transition-colors">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      <div className="p-3 pt-8">
        {/* Header: Invoice Number & Status */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-sm truncate">
              #{invoice.invoice.invoiceNumber}
            </h3>
          </div>
          <div className="ml-2 flex-shrink-0">
            {getStatusBadge(invoice.invoice.status)}
          </div>
        </div>

        {/* Customer Name */}
        {customer && (
          <div className="flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-600 truncate font-medium">{customer.name}</p>
          </div>
        )}

        {/* Amount & Payment Status */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(invoice.invoice.Total)}</p>
            {invoice.invoice.PaidAmount > 0 && (
              <p className="text-xs text-green-600">
                {t('invoice.paid')}: {formatCurrency(invoice.invoice.PaidAmount)}
              </p>
            )}
          </div>
          <div>
            {getPaymentBadge(invoice.invoice.paymentStatus)}
          </div>
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{formatDate(invoice.invoice.DueDate)}</span>
          {isOverdue && (
            <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};
