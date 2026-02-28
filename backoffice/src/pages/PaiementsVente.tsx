import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { Wallet, Search, Edit2, Trash2, Calendar, CreditCard, FileText, Plus } from 'lucide-react';
import { Input } from '../components/ui/input';
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
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Wallet}
          title={t('salesPayments')}
          subtitle={t('manageSalesPayments')}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{t('totalPayments')}</p>
                <p className="text-2xl font-bold text-slate-900">{filteredPayments.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{t('totalAmount')}</p>
                <p className="text-2xl font-bold text-emerald-600">{totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{t('thisMonth')}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredPayments.filter(p => {
                    const date = new Date(p.paymentDate);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            id="search-sales-payments"
            type="text"
            placeholder={t('searchBySalesInvoice')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leadingIcon={Search}
            fullWidth
            aria-label={t('searchBySalesInvoice')}
          />
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('invoice.date')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('invoice')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('client')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('paymentMethod')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('reference')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('amount')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('invoice.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </td>
                  </tr>
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {getInvoiceNumber(payment.invoiceId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {getCustomerName(payment.invoiceId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          {PAYMENT_TYPE_LABELS[payment.paymentType]}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {payment.referenceNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-emerald-600">
                        {payment.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('modify')}
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
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Aucun paiement trouvé</p>
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
