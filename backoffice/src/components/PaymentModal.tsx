import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, Hash, Banknote, Building2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Payment, CreatePaymentDTO, UpdatePaymentDTO, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import { useLanguage } from '../context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { formatAmount } from '@orderium/ui';

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
    amount: number | null;
    paymentDate: Date;
    paymentType: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mobile_payment' | 'other';
    notes: string;
    referenceNumber: string;
  }>({
    amount: null,
    paymentDate: new Date(),
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
          amount: payment.amount,
          paymentDate: new Date(payment.paymentDate + 'T00:00:00'),
          paymentType: payment.paymentType,
          notes: payment.notes || '',
          referenceNumber: payment.referenceNumber || '',
        });
      } else {
        setFormData({
          amount: null,
          paymentDate: new Date(),
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
      const amount = formData.amount ?? 0;

      if (amount <= 0) {
        throw new Error(t('invoice.amountMustBeGreaterThanZero'));
      }

      if (!payment) {
        const newTotal = totalPaid + amount;
        if (newTotal > invoiceTotal) {
          throw new Error(`${t('errorPaymentExceedsInvoice')} (${formatAmount(newTotal, 2)} ${language === 'ar' ? 'د.م' : 'DH'} > ${formatAmount(invoiceTotal, 2)} ${language === 'ar' ? 'د.م' : 'DH'})`);
        }
      }

      const d = formData.paymentDate;
      const paymentDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const paymentData = {
        amount,
        paymentDate: paymentDateStr,
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
  const paidPercent = invoiceTotal > 0 ? Math.min(100, (totalPaid / invoiceTotal) * 100) : 0;
  const currency = language === 'ar' ? 'د.م' : 'DH';
  const isFullyPaid = remainingAmount <= 0;

  const PAYMENT_METHOD_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
    cash: { color: '#15803d', icon: Banknote },
    check: { color: '#a16207', icon: FileText },
    bank_transfer: { color: '#1d4ed8', icon: Building2 },
    credit_card: { color: '#7e22ce', icon: CreditCard },
    mobile_payment: { color: '#4338ca', icon: Smartphone },
    other: { color: '#475569', icon: CreditCard },
  };

  const paymentTypeOptions = Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({
    label: label as string,
    value,
  }));

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', padding: '0.5rem 0 0' }}>
      <Button label={t('cancel')} outlined onClick={onClose} style={{ borderRadius: '0.5rem' }} />
      <Button
        label={payment ? t('edit') : t('add')}
        loading={loading}
        onClick={handleSubmit}
        style={{ borderRadius: '0.5rem', background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none' }}
      />
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #235ae4, #1a47b8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard style={{ width: '1rem', height: '1rem', color: '#fff' }} />
          </div>
          <span>{payment ? t('invoice.editPayment') : t('invoice.addPayment')}</span>
        </div>
      }
      footer={footerContent}
      modal
      style={{ width: '95vw', maxWidth: '42rem' }}
      breakpoints={{ '960px': '75vw', '640px': '95vw' }}
      contentStyle={{ overflowY: 'auto', padding: '1.25rem 1.5rem' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-column gap-4">
        {error && <Message severity="error" text={error} style={{ width: '100%', borderRadius: '0.5rem' }} />}

        {/* Payment Progress Card */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '0.875rem', padding: '1.25rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative blob */}
          <div style={{ position: 'absolute', top: '-1.5rem', right: '-1.5rem', width: '6rem', height: '6rem', borderRadius: '50%', background: 'rgba(35,90,228,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-1rem', left: '30%', width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          {/* Three stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t('invoice.totalInvoice')}</div>
              <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#f1f5f9' }}>
                {formatAmount(invoiceTotal, 2)}
                <span style={{ fontSize: '0.6875rem', color: '#64748b', marginLeft: '0.25rem' }}>{currency}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t('invoice.totalPaid')}</div>
              <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#34d399' }}>
                {formatAmount(totalPaid, 2)}
                <span style={{ fontSize: '0.6875rem', color: '#64748b', marginLeft: '0.25rem' }}>{currency}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t('invoice.remaining')}</div>
              <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: isFullyPaid ? '#34d399' : '#fbbf24' }}>
                {formatAmount(remainingAmount, 2)}
                <span style={{ fontSize: '0.6875rem', color: '#64748b', marginLeft: '0.25rem' }}>{currency}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{t('invoice.totalPaid')}</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: isFullyPaid ? '#34d399' : '#fbbf24' }}>{paidPercent.toFixed(0)}%</span>
            </div>
            <div style={{ height: '0.375rem', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${paidPercent}%`,
                background: isFullyPaid ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {isFullyPaid && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.75rem', color: '#34d399', fontSize: '0.8125rem', fontWeight: 600 }}>
              <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
              Facture entièrement payée
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="flex flex-column gap-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{t('invoice.paymentAmount')} *</label>
            {remainingAmount > 0 && !payment && (
              <Button
                type="button"
                onClick={() => setFormData({ ...formData, amount: remainingAmount })}
                icon={<AlertCircle style={{ width: '0.625rem', height: '0.625rem' }} />}
                label={`Payer le reste (${formatAmount(remainingAmount, 2)} ${currency})`}
                pt={{ root: { style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '9999px', padding: '0.1875rem 0.625rem', fontSize: '0.6875rem', fontWeight: 700, gap: '0.25rem' } } }}
                text
                size="small"
              />
            )}
          </div>
          <div style={{ position: 'relative', width: '100%' }}>
            <CreditCard style={{ width: 15, height: 15, position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1, pointerEvents: 'none' }} />
            <InputNumber
              value={formData.amount}
              onValueChange={(e) => setFormData({ ...formData, amount: e.value ?? null })}
              mode="decimal"
              minFractionDigits={2}
              maxFractionDigits={2}
              min={0}
              placeholder="0.00"
              inputStyle={{ width: '100%', paddingLeft: '2.5rem', fontWeight: 600, fontSize: '1rem' }}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Date + Payment Type side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Payment Date */}
          <div className="flex flex-column gap-2">
            <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{t('invoice.paymentDate')} *</label>
            <Calendar
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.value as Date })}
              dateFormat="dd/mm/yy"
              showIcon
              style={{ width: '100%' }}
              inputStyle={{ width: '100%' }}
              showButtonBar
              touchUI={false}
            />
          </div>

          {/* Payment Type */}
          <div className="flex flex-column gap-2">
            <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{t('invoice.paymentMethod')} *</label>
            <Dropdown
              value={formData.paymentType}
              options={paymentTypeOptions}
              onChange={(e) => setFormData({ ...formData, paymentType: e.value })}
              style={{ width: '100%' }}
              itemTemplate={(option) => {
                const cfg = PAYMENT_METHOD_CONFIG[option.value];
                const Icon = cfg?.icon || CreditCard;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon style={{ width: '0.875rem', height: '0.875rem', color: cfg?.color || '#475569' }} />
                    {option.label}
                  </div>
                );
              }}
            />
          </div>
        </div>

        {/* Reference Number */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{t('invoice.referenceNumber')} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.75rem' }}>— {t('referenceNumberHint')}</span></label>
          <span className="p-input-icon-left" style={{ width: '100%' }}>
            <InputText
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder={t('referenceNumberPlaceholder')}
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </span>
        </div>

        {/* Notes */}
        <div className="flex flex-column gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{t('invoice.additionalNotes')}</label>
          <InputTextarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder={t('invoice.notesPlaceholder2')}
            style={{ width: '100%', resize: 'none' }}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default PaymentModal;
