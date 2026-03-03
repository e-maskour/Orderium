import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, FileText, Hash } from 'lucide-react';
import { Payment, CreatePaymentDTO, UpdatePaymentDTO, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import { useLanguage } from '../context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';

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
  const [formData, setFormData] = useState<{
    amount: string;
    paymentDate: string;
    paymentType: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
    notes: string;
    referenceNumber: string;
  }>({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'cash',
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

      if (isNaN(amount) || amount <= 0) {
        throw new Error(t('invoice.amountMustBeGreaterThanZero'));
      }

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

  const remainingAmount = invoiceTotal - totalPaid;
  const currency = language === 'ar' ? 'د.م' : 'DH';

  const paymentTypeOptions = Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({
    label: label as string,
    value,
  }));

  const footerContent = (
    <div className="flex justify-content-end gap-2">
      <Button label={t('cancel')} outlined onClick={onClose} />
      <Button
        label={payment ? t('edit') : t('add')}
        loading={loading}
        onClick={handleSubmit}
      />
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={payment ? t('invoice.editPayment') : t('invoice.addPayment')}
      footer={footerContent}
      modal
      style={{ width: '95vw', maxWidth: '42rem' }}
      breakpoints={{ '960px': '75vw', '640px': '95vw' }}
      contentStyle={{ overflowY: 'auto' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-column gap-4">
        {error && <Message severity="error" text={error} style={{ width: '100%' }} />}

        {/* Payment Summary */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }} className="flex flex-column gap-2">
          <div className="flex justify-content-between" style={{ fontSize: '0.875rem' }}>
            <span style={{ color: '#475569' }}>{t('invoice.totalInvoice')}:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{invoiceTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
          </div>
          <div className="flex justify-content-between" style={{ fontSize: '0.875rem' }}>
            <span style={{ color: '#475569' }}>{t('invoice.totalPaid')}:</span>
            <span style={{ fontWeight: 600, color: '#059669' }}>{totalPaid.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
          </div>
          <div className="flex justify-content-between" style={{ fontSize: '0.875rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>{t('invoice.remaining')}:</span>
            <span style={{ fontWeight: 600, color: '#d97706' }}>{remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('invoice.paymentAmount')} *</label>
          {remainingAmount > 0 && !payment && (
            <Button
              type="button"
              label={`${t('invoice.payRemainingAmount')} (${remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency})`}
              text
              size="small"
              onClick={() => setFormData({ ...formData, amount: remainingAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
              style={{ alignSelf: 'flex-start', color: '#b45309', background: '#fef3c7' }}
            />
          )}
          <span className="p-input-icon-left" style={{ width: '100%' }}>
            <CreditCard style={{ width: 16, height: 16, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1 }} />
            <InputText
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </span>
        </div>

        {/* Payment Date */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('invoice.paymentDate')} *</label>
          <span className="p-input-icon-left" style={{ width: '100%' }}>
            <Calendar style={{ width: 16, height: 16, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1 }} />
            <InputText
              type="date"
              required
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </span>
        </div>

        {/* Payment Type */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('invoice.paymentMethod')} *</label>
          <Dropdown
            value={formData.paymentType}
            options={paymentTypeOptions}
            onChange={(e) => setFormData({ ...formData, paymentType: e.value })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Reference Number */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('invoice.referenceNumber')}</label>
          <small style={{ color: '#64748b' }}>{t('referenceNumberHint')}</small>
          <span className="p-input-icon-left" style={{ width: '100%' }}>
            <Hash style={{ width: 16, height: 16, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1 }} />
            <InputText
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder={t('referenceNumberPlaceholder')}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </span>
        </div>

        {/* Notes */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('invoice.additionalNotes')}</label>
          <InputTextarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder={t('invoice.notesPlaceholder2')}
            style={{ width: '100%' }}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default PaymentModal;
