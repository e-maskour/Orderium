import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit2, Calendar, CreditCard, FileText, Hash, Plus, AlertCircle } from 'lucide-react';
import { Payment, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import PaymentModal from './PaymentModal';
import { toastConfirm, toastError } from '../services/toast.service';
import { useLanguage } from '@/context/LanguageContext';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  invoiceTotal: number;
  customerId?: number;
  supplierId?: number;
  onPaymentUpdate: () => void;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  invoiceTotal,
  customerId,
  supplierId,
  onPaymentUpdate,
}) => {
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchPayments();
    }
  }, [isOpen, invoiceId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentsService.getByInvoice(invoiceId);
      setPayments(data);

      const total = data.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      setTotalPaid(total);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    toastConfirm(t('deleteTitle'), async () => {
      try {
        await paymentsService.delete(id);
        await fetchPayments();
        onPaymentUpdate();
      } catch (error) {
        console.error('Error deleting payment:', error);
        toastError(t('error'), { description: t('errorDeletingPayment') });
      }
    }, { description: t('confirmDeletePayment'), confirmLabel: t('delete') });
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchPayments();
    onPaymentUpdate();
  };

  if (!isOpen) return null;

  const remainingAmount = invoiceTotal - totalPaid;
  const isFullyPaid = remainingAmount <= 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                {t('invoice.paymentHistory')}
              </h2>
              <p className="text-sm text-slate-600 mt-1">{t('invoice')} {invoiceNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Payment Summary */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t('totalInvoice')}</p>
                  <p className="text-2xl font-bold text-slate-900">{invoiceTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t('totalPaid')}</p>
                  <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t('remainingToPay')}</p>
                  <p className={`text-2xl font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                  </p>
                </div>
              </div>

              {isFullyPaid && (
                <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('invoiceFullyPaid')}</span>
                </div>
              )}
            </div>

            {/* Add Payment Button */}
            {!isFullyPaid && (
              <div className="mb-4">
                <button
                  onClick={handleAddPayment}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('addPayment')}
                </button>
              </div>
            )}

            {/* Payments List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{t('noPaymentsRecorded')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{t('amount')}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {parseFloat(payment.amount.toString()).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{t('invoice.date')}</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <p className="text-sm text-slate-700">
                              {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{t('paymentMethod')}</p>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                            <p className="text-sm text-slate-700">
                              {PAYMENT_TYPE_LABELS[payment.paymentType]}
                            </p>
                          </div>
                        </div>
                        {payment.referenceNumber && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">{t('reference')}</p>
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-slate-400" />
                              <p className="text-sm text-slate-700">{payment.referenceNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                          <p className="text-sm text-slate-600">{payment.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          onSuccess={handlePaymentSuccess}
          invoiceId={invoiceId}
          invoiceTotal={invoiceTotal}
          customerId={customerId}
          supplierId={supplierId}
          payment={selectedPayment}
        />
      )}
    </>
  );
};

export default PaymentHistoryModal;
