import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Calendar, CreditCard, FileText, Hash, Plus, AlertCircle } from 'lucide-react';
import { Payment, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import PaymentModal from './PaymentModal';
import { toastConfirm, toastError } from '../services/toast.service';
import { useLanguage } from '@/context/LanguageContext';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { formatAmount } from '@orderium/ui';

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

  const remainingAmount = invoiceTotal - totalPaid;
  const isFullyPaid = remainingAmount <= 0;
  const currency = language === 'ar' ? 'د.م' : 'DH';

  const headerContent = (
    <div>
      <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{t('invoice.paymentHistory')}</div>
      <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem' }}>{t('invoice')} {invoiceNumber}</div>
    </div>
  );

  const footerContent = (
    <Button label={t('close')} outlined onClick={onClose} />
  );

  return (
    <>
      <Dialog
        visible={isOpen}
        onHide={onClose}
        header={headerContent}
        footer={footerContent}
        modal
        style={{ width: '95vw', maxWidth: '56rem' }}
        breakpoints={{ '960px': '75vw', '640px': '95vw' }}
        contentStyle={{ padding: '1.5rem', overflowY: 'auto' }}
      >
        {/* Payment Summary */}
        <div style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{t('totalInvoice')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{formatAmount(invoiceTotal, 2)} {currency}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{t('totalPaid')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{formatAmount(totalPaid, 2)} {currency}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{t('remainingToPay')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isFullyPaid ? '#059669' : '#d97706' }}>
                {formatAmount(remainingAmount, 2)} {currency}
              </div>
            </div>
          </div>

          {isFullyPaid && (
            <div className="flex align-items-center gap-2" style={{ marginTop: '1rem', background: '#ecfdf5', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: '#047857' }}>
              <AlertCircle style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('invoiceFullyPaid')}</span>
            </div>
          )}
        </div>

        {/* Add Payment Button */}
        {!isFullyPaid && (
          <div style={{ marginBottom: '1rem' }}>
            <Button
              label={t('addPayment')}
              icon={<Plus style={{ width: 16, height: 16, marginRight: 6 }} />}
              onClick={handleAddPayment}
              size="small"
            />
          </div>
        )}

        {/* Payments List */}
        {loading ? (
          <div className="flex align-items-center justify-content-center" style={{ padding: '2rem 0' }}>
            <ProgressSpinner style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-column align-items-center" style={{ padding: '3rem 0' }}>
            <CreditCard style={{ width: 48, height: 48, color: '#cbd5e1', marginBottom: '0.75rem' }} />
            <span style={{ color: '#64748b' }}>{t('noPaymentsRecorded')}</span>
          </div>
        ) : (
          <div className="flex flex-column gap-3">
            {payments.map((p) => (
              <div
                key={p.id}
                style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', transition: 'box-shadow 0.2s' }}
              >
                <div className="flex align-items-start justify-content-between">
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('amount')}</div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                        {formatAmount(parseFloat(p.amount.toString()), 2)} {currency}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('invoice.date')}</div>
                      <div className="flex align-items-center gap-2">
                        <Calendar style={{ width: 16, height: 16, color: '#94a3b8' }} />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('paymentMethod')}</div>
                      <div className="flex align-items-center gap-2">
                        <CreditCard style={{ width: 16, height: 16, color: '#94a3b8' }} />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                          {PAYMENT_TYPE_LABELS[p.paymentType]}
                        </span>
                      </div>
                    </div>
                    {p.referenceNumber && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{t('reference')}</div>
                        <div className="flex align-items-center gap-2">
                          <Hash style={{ width: 16, height: 16, color: '#94a3b8' }} />
                          <span style={{ fontSize: '0.875rem', color: '#334155' }}>{p.referenceNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1" style={{ marginLeft: '1rem' }}>
                    <Button
                      icon={<Edit2 style={{ width: 16, height: 16 }} />}
                      text
                      rounded
                      severity="info"
                      onClick={() => handleEdit(p)}
                      tooltip={t('edit')}
                    />
                    <Button
                      icon={<Trash2 style={{ width: 16, height: 16 }} />}
                      text
                      rounded
                      severity="danger"
                      onClick={() => handleDelete(p.id)}
                      tooltip={t('delete')}
                    />
                  </div>
                </div>
                {p.notes && (
                  <div className="flex align-items-start gap-2" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <FileText style={{ width: 16, height: 16, color: '#94a3b8', marginTop: 2 }} />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>{p.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Dialog>

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
