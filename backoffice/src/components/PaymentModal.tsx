import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, FileText, Hash } from 'lucide-react';
import { Payment, CreatePaymentDTO, UpdatePaymentDTO, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import { useLanguage } from '../context/LanguageContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId: number;
  invoiceTotal: number;
  customerId?: number;
  supplierId?: number;
  payment?: Payment | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  invoiceTotal,
  customerId,
  supplierId,
  payment,
}) => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'cash' as const,
    notes: '',
    referenceNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        setFormData({
          amount: payment.amount.toString(),
          paymentDate: payment.paymentDate,
          paymentType: payment.paymentType,
          notes: payment.notes || '',
          referenceNumber: payment.referenceNumber || '',
        });
      } else {
        setFormData({
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'cash',
          notes: '',
          referenceNumber: '',
        });
      }
      fetchTotalPaid();
    }
  }, [isOpen, payment]);

  const fetchTotalPaid = async () => {
    try {
      const total = await paymentsService.getTotalPaid(invoiceId);
      setTotalPaid(total);
    } catch (err) {
      console.error('Error fetching total paid:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        throw new Error(t('invoice.amountMustBeGreaterThanZero'));
      }

      // Check if total would exceed invoice total (only for new payments)
      if (!payment) {
        const newTotal = totalPaid + amount;
        if (newTotal > invoiceTotal) {
          throw new Error(`${t('errorPaymentExceedsInvoice')} (${newTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${language === 'ar' ? 'د.م' : 'DH'} > ${invoiceTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${language === 'ar' ? 'د.م' : 'DH'})`);
        }
      }

      const paymentData = {
        amount,
        paymentDate: formData.paymentDate,
        paymentType: formData.paymentType,
        notes: formData.notes || undefined,
        referenceNumber: formData.referenceNumber || undefined,
      };

      if (payment) {
        await paymentsService.update(payment.id, paymentData as UpdatePaymentDTO);
      } else {
        await paymentsService.create({
          ...paymentData,
          invoiceId,
          customerId,
          supplierId,
        } as CreatePaymentDTO);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const remainingAmount = invoiceTotal - totalPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-slate-800">
            {payment ? t('invoice.editPayment') : t('invoice.addPayment')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t('invoice.totalInvoice')}:</span>
              <span className="font-semibold text-slate-900">{invoiceTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{t('invoice.totalPaid')}:</span>
              <span className="font-semibold text-emerald-600">{totalPaid.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-medium">{t('invoice.remaining')}:</span>
              <span className="font-semibold text-amber-600">{remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                {t('invoice.paymentAmount')} *
              </label>
              {remainingAmount > 0 && !payment && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                  className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors"
                >
                  {t('invoice.payRemainingAmount')} ({remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'})
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="block w-full pl-10 pr-12 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-slate-500 text-sm">{language === 'ar' ? 'د.م' : 'DH'}</span>
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.paymentDate')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.paymentMethod')} *
            </label>
            <select
              required
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.referenceNumber')}
              <span className="text-slate-500 text-xs ml-1">{t('referenceNumberHint')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('referenceNumberPlaceholder')}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.additionalNotes')}
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('invoice.notesPlaceholder2')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('saving') : payment ? t('edit') : t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
