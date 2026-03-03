import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { KpiCard, KpiGrid } from '../components/KpiCard';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { Wallet, Search, Edit2, Trash2, Calendar, CreditCard } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Payment, PAYMENT_TYPE_LABELS, paymentsService } from '../modules/payments';
import { invoicesService } from '../modules/invoices';
import PaymentModal from '../components/PaymentModal';
import { toastConfirm, toastError } from '../services/toast.service';

export default function PaiementsAchat() {
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<Payment[]>([]);


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

  const getSupplierName = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.invoice.id === invoiceId);
    return invoice?.invoice.supplierName || '-';
  };

  const getInvoiceTotal = (invoiceId: number) => {
    const invoice = invoices.find(inv => inv.invoice.id === invoiceId);
    return invoice?.invoice.total || 0;
  };

  const filteredPayments = payments.filter(payment => {
    // Only show purchase payments (invoices with supplierId)
    const invoice = invoices.find(inv => inv.invoice.id === payment.invoiceId);
    if (!invoice || !invoice.invoice.supplierId) return false;

    const invoiceNumber = getInvoiceNumber(payment.invoiceId);
    const supplierName = getSupplierName(payment.invoiceId);
    const search = searchTerm.toLowerCase();
    return (
      invoiceNumber.toLowerCase().includes(search) ||
      supplierName.toLowerCase().includes(search) ||
      payment.referenceNumber?.toLowerCase().includes(search)
    );
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Wallet}
          title={t('purchasePayments')}
          subtitle={t('managePurchasePayments')}
        />

        {/* Stats Cards */}
        <div style={{ marginBottom: '1.5rem' }}>
          <KpiGrid count={3}>
            <KpiCard label={t('totalPayments')} value={filteredPayments.length} icon={CreditCard} color="blue" />
            <KpiCard label={t('totalAmount')} value={`${totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${language === 'ar' ? 'د.م' : 'DH'}`} icon={Wallet} color="red" />
            <KpiCard label={t('thisMonth')} value={filteredPayments.filter(p => { const d = new Date(p.paymentDate); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length} icon={Calendar} color="amber" />
          </KpiGrid>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ position: 'relative', display: 'block', width: '100%' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
            <InputText
              id="search-payments"
              type="text"
              placeholder={t('searchByInvoice')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('searchByInvoice')}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </span>
        </div>

        {/* Payments Table */}
        <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <style>{`
            .pa-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 1rem 1.5rem; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
            .pa-datatable .p-datatable-tbody > tr > td { padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
            .pa-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
            .pa-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
            .pa-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 0.375rem 0.75rem; border-radius: 0; }
            .pa-datatable .p-paginator .p-paginator-pages .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
          `}</style>
          <DataTable
            className="pa-datatable"
            value={filteredPayments}
            selection={selectedRows}
            onSelectionChange={(e) => setSelectedRows(e.value as Payment[])}
            selectionMode="checkbox"
            dataKey="id"
            paginator
            paginatorPosition="top"
            rows={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            removableSort
            loading={loading}
            emptyMessage={
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Wallet style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 0.5rem', display: 'block' }} />
                <p style={{ color: '#64748b' }}>Aucun paiement trouvé</p>
              </div>
            }
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            currentPageReportTemplate="{first} - {last} / {totalRecords}"
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
            <Column field="paymentDate" header={t('invoice.date')} sortable body={(p: Payment) => (
              <span>{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</span>
            )} />
            <Column header={t('invoice')} body={(p: Payment) => (
              <span style={{ fontWeight: 500, color: '#0f172a' }}>{getInvoiceNumber(p.invoiceId)}</span>
            )} />
            <Column header={t('supplier')} body={(p: Payment) => (
              <span style={{ color: '#475569' }}>{getSupplierName(p.invoiceId)}</span>
            )} />
            <Column field="paymentType" header={t('paymentMethod')} sortable body={(p: Payment) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                <CreditCard style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
                {PAYMENT_TYPE_LABELS[p.paymentType]}
              </div>
            )} />
            <Column field="referenceNumber" header={t('reference')} sortable body={(p: Payment) => (
              <span style={{ color: '#475569' }}>{p.referenceNumber || '-'}</span>
            )} />
            <Column field="amount" header={t('amount')} sortable align="right" headerStyle={{ textAlign: 'right' }} body={(p: Payment) => (
              <span style={{ fontWeight: 600, color: '#dc2626' }}>
                {p.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
              </span>
            )} />
            <Column header={t('invoice.actions')} align="center" headerStyle={{ textAlign: 'center' }} body={(p: Payment) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Button icon={<Edit2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => handleEdit(p)} text rounded severity="info" title={t('modify')} />
                <Button icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => handleDelete(p.id)} text rounded severity="danger" title={t('delete')} />
              </div>
            )} />
          </DataTable>
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
