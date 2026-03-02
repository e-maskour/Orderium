import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { Wallet, Search, Edit2, Trash2, Calendar, CreditCard, FileText, Plus } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Payment, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import { invoicesService } from '../modules/invoices';
import PaymentModal from '../components/PaymentModal';
import { toastConfirm, toastError } from '../services/toast.service';

export default function PaiementsVente() {
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);


  useEffect(() => {
    loadPayments();
    loadInvoices();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentsService.getAll();
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const data = await invoicesService.getAll();
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleDelete = async (id: number) => {
    toastConfirm(
      t('deletePayment'),
      async () => {
        try {
          await paymentsService.delete(id);
          await loadPayments();
        } catch (error) {
          console.error('Error deleting payment:', error);
          toastError(t('error'), { description: t('errorDeletingPayment') });
        }
      },
      { description: t('confirmDeletePayment'), confirmLabel: t('delete') }
    );
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const getInvoiceNumber = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.invoice.id === invoiceId);
    return invoice?.invoice.invoiceNumber || `#${invoiceId}`;
  };

  const getCustomerName = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.invoice.id === invoiceId);
    return invoice?.invoice.customerName || '-';
  };

  const getInvoiceTotal = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.invoice.id === invoiceId);
    return invoice?.invoice.total || 0;
  };

  const filteredPayments = payments.filter(payment => {
    // Only show sales payments (invoices with customerId)
    const invoice = invoices.find(inv => inv.invoice.id === payment.invoiceId);
    if (!invoice || !invoice.invoice.customerId) return false;

    const invoiceNumber = getInvoiceNumber(payment.invoiceId);
    const customerName = getCustomerName(payment.invoiceId);
    const search = searchTerm.toLowerCase();
    return (
      invoiceNumber.toLowerCase().includes(search) ||
      customerName.toLowerCase().includes(search) ||
      payment.referenceNumber?.toLowerCase().includes(search)
    );
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <AdminLayout>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <PageHeader
          icon={Wallet}
          title={t('salesPayments')}
          subtitle={t('manageSalesPayments')}
        />

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{t('totalPayments')}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{filteredPayments.length}</p>
              </div>
              <div style={{ width: '3rem', height: '3rem', background: '#eff6ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{t('totalAmount')}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</p>
              </div>
              <div style={{ width: '3rem', height: '3rem', background: '#ecfdf5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{t('thisMonth')}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                  {filteredPayments.filter(p => {
                    const date = new Date(p.paymentDate);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div style={{ width: '3rem', height: '3rem', background: '#fffbeb', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ position: 'relative', display: 'block', width: '100%' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
            <InputText
              id="search-sales-payments"
              type="text"
              placeholder={t('searchBySalesInvoice')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('searchBySalesInvoice')}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </span>
        </div>

        {/* Payments Table */}
        <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('invoice.date')}
                  </th>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('invoice')}
                  </th>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('client')}
                  </th>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('paymentMethod')}
                  </th>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('reference')}
                  </th>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('amount')}
                  </th>
                  <th style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('invoice.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ paddingTop: '3rem', paddingBottom: '3rem', textAlign: 'center' }}>
                      <div className="animate-spin" style={{ display: 'inline-block', borderRadius: '9999px', height: '2rem', width: '2rem', borderBottom: '2px solid #2563eb' }}></div>
                    </td>
                  </tr>
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} style={{ borderTop: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '0.875rem', color: '#0f172a' }}>
                        {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>
                        {getInvoiceNumber(payment.invoiceId)}
                      </td>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
                        {getCustomerName(payment.invoiceId)}
                      </td>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CreditCard style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
                          {PAYMENT_TYPE_LABELS[payment.paymentType]}
                        </div>
                      </td>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
                        {payment.referenceNumber || '-'}
                      </td>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', color: '#059669' }}>
                        {payment.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                      </td>
                      <td style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEdit(payment)}
                            style={{ padding: '0.5rem', color: '#2563eb', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title={t('modify')}
                          >
                            <Edit2 style={{ width: '1rem', height: '1rem' }} />
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            style={{ padding: '0.5rem', color: '#dc2626', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title={t('delete')}
                          >
                            <Trash2 style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ paddingTop: '3rem', paddingBottom: '3rem', textAlign: 'center' }}>
                      <Wallet style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto', marginBottom: '0.75rem' }} />
                      <p style={{ color: '#64748b' }}>Aucun paiement trouvé</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          onSuccess={() => {
            loadPayments();
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
          invoiceId={selectedPayment.invoiceId}
          invoiceTotal={getInvoiceTotal(selectedPayment.invoiceId)}
          payment={selectedPayment}
        />
      )}

    </AdminLayout>
  );
}
