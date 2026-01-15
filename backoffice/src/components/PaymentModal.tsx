import React from 'react';
import { InvoiceWithDetails } from '../types';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  invoice: InvoiceWithDetails;
  amount: string;
  onAmountChange: (amount: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  formatCurrency: (amount: number) => string;
  t: (key: string) => string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  amount,
  onAmountChange,
  onSubmit,
  onClose,
  isSubmitting,
  formatCurrency,
  t
}) => {
  const remainingAmount = invoice.invoice.Total - invoice.invoice.PaidAmount;
  const amountValue = parseFloat(amount) || 0;
  const isValidAmount = amountValue > 0 && amountValue <= remainingAmount;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidAmount) {
      onSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('invoice.recordPayment')}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('invoice.number')} #{invoice.invoice.invoiceNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Payment Summary */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t('invoice.total')}</span>
              <span className="font-medium text-slate-900">{formatCurrency(invoice.invoice.Total)}</span>
            </div>
            
            {invoice.invoice.PaidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t('invoice.paid')}</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.invoice.PaidAmount)}</span>
              </div>
            )}
            
            <hr className="border-slate-200" />
            
            <div className="flex justify-between">
              <span className="text-slate-600">{t('invoice.remaining')}</span>
              <span className="font-semibold text-orange-600">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label htmlFor="payment-amount" className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.paymentAmount')}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                max={remainingAmount}
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                className={`w-full pl-9 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  amount && !isValidAmount
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
                placeholder="0.00"
                required
              />
            </div>
            
            {amount && !isValidAmount && (
              <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {amountValue <= 0 
                    ? t('invoice.amountMustBePositive')
                    : t('invoice.amountExceedsRemaining')
                  }
                </span>
              </div>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">{t('invoice.quickAmounts')}</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onAmountChange((remainingAmount * 0.25).toFixed(2))}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => onAmountChange((remainingAmount * 0.5).toFixed(2))}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => onAmountChange(remainingAmount.toFixed(2))}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                {t('invoice.payInFull')}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={isSubmitting}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValidAmount || isSubmitting}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('invoice.recording')}
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  {t('invoice.recordPayment')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};