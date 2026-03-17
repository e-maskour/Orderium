import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { KpiCard, KpiGrid } from '../components/KpiCard';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { Wallet, Search, Edit2, Trash2, Calendar, CreditCard, Banknote, Building2, Smartphone, FileCheck } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
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
  const thisMonthPayments = filteredPayments.filter(p => {
    const d = new Date(p.paymentDate); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  const PAYMENT_METHOD_CONFIG: Record<string, { bg: string; color: string; border: string; icon: React.ElementType }> = {
    cash: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: Banknote },
    check: { bg: '#fefce8', color: '#a16207', border: '#fde68a', icon: FileCheck },
    bank_transfer: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: Building2 },
    credit_card: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: CreditCard },
    mobile_payment: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: Smartphone },
    other: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: Wallet },
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Wallet}
          title={t('salesPayments')}
          subtitle={t('manageSalesPayments')}
        />

        {/* KPI Cards */}
        <div style={{ marginBottom: '1.5rem' }}>
          <KpiGrid count={3}>
            <KpiCard label={t('totalPayments')} value={filteredPayments.length} icon={CreditCard} color="blue" />
            <KpiCard
              label={t('totalAmount')}
              value={`${totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${language === 'ar' ? 'د.م' : 'DH'}`}
              icon={Wallet}
              color="emerald"
            />
            <KpiCard
              label={t('thisMonth')}
              value={`${thisMonthAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${language === 'ar' ? 'د.م' : 'DH'}`}
              icon={Calendar}
              color="purple"
              subtitle={`${thisMonthPayments.length} paiements`}
            />
          </KpiGrid>
        </div>

        {/* Table Card */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '14rem' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.875rem', height: '0.875rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <InputText
                id="search-sales-payments"
                type="text"
                placeholder={t('searchBySalesInvoice')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.25rem', height: '2.25rem', fontSize: '0.875rem', borderRadius: '0.5rem' }}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {selectedRows.length > 0 && (
                <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', padding: '0.125rem 0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  {selectedRows.length} sélectionnés
                </span>
              )}
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                {filteredPayments.length} résultat{filteredPayments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <style>{`
            .pv-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
            .pv-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; }
            .pv-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
            .pv-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
            .pv-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: transparent; padding: 0.125rem 0.5rem; border-radius: 0; }
            .pv-datatable .p-paginator .p-paginator-pages .p-paginator-page.p-highlight { background: #235ae4; color: #fff; border-color: #235ae4; }
          `}</style>

          <DataTable
            className="pv-datatable"
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
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid #bbf7d0' }}>
                  <Wallet style={{ width: '1.5rem', height: '1.5rem', color: '#10b981' }} />
                </div>
                <p style={{ color: '#1e293b', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>Aucun paiement trouvé</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Aucun paiement de vente ne correspond à votre recherche</p>
              </div>
            }
            paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
            currentPageReportTemplate="{first}-{last} of {totalRecords}"
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />

            {/* Date */}
            <Column field="paymentDate" header={t('invoice.date')} sortable body={(p: Payment) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '1.875rem', height: '1.875rem', borderRadius: '0.4rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar style={{ width: '0.875rem', height: '0.875rem', color: '#3b82f6' }} />
                </div>
                <span style={{ fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                  {new Date(p.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )} />

            {/* Invoice */}
            <Column header={t('invoice')} body={(p: Payment) => (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
                borderRadius: '0.375rem', padding: '0.1875rem 0.5rem',
                fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace',
                letterSpacing: '0.02em',
              }}>
                {getInvoiceNumber(p.invoiceId)}
              </span>
            )} />

            {/* Customer */}
            <Column header={t('client')} body={(p: Payment) => {
              const name = getCustomerName(p.invoiceId);
              const initials = name !== '-'
                ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                : '?';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '1.875rem', height: '1.875rem', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', fontSize: '0.625rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <span style={{ color: '#334155', fontWeight: 500 }}>{name}</span>
                </div>
              );
            }} />

            {/* Payment Method */}
            <Column field="paymentType" header={t('paymentMethod')} sortable body={(p: Payment) => {
              const cfg = PAYMENT_METHOD_CONFIG[p.paymentType] || PAYMENT_METHOD_CONFIG.other;
              const MethodIcon = cfg.icon;
              return (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                  borderRadius: '9999px', padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  <MethodIcon style={{ width: '0.75rem', height: '0.75rem' }} />
                  {PAYMENT_TYPE_LABELS[p.paymentType]}
                </span>
              );
            }} />

            {/* Reference */}
            <Column field="referenceNumber" header={t('reference')} sortable body={(p: Payment) => (
              p.referenceNumber
                ? <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569', background: '#f8fafc', padding: '0.125rem 0.4375rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>{p.referenceNumber}</span>
                : <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>—</span>
            )} />

            {/* Amount */}
            <Column field="amount" header={t('amount')} sortable align="right" headerStyle={{ textAlign: 'right' }} body={(p: Payment) => (
              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#059669' }}>
                  +{p.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span style={{ color: '#94a3b8', fontSize: '0.6875rem', fontWeight: 500, marginLeft: '0.25rem' }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                </div>
              </div>
            )} />

            {/* Actions */}
            <Column header={t('invoice.actions')} align="center" headerStyle={{ textAlign: 'center' }} body={(p: Payment) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Button icon={<Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />} onClick={() => handleEdit(p)} text rounded severity="info" title={t('modify')} />
                <Button icon={<Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />} onClick={() => handleDelete(p.id)} text rounded severity="danger" title={t('delete')} />
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
