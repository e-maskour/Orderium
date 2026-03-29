import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { PartnerForm } from '../components/PartnerForm';
import { KpiCard, KpiSheet } from '../components/KpiCard';
import { formatDH } from '../utils/formatNumber';
import { Users, ArrowLeft, FileText, Clock, CreditCard, Truck, DollarSign, AlertCircle, Save } from 'lucide-react';
import { toastUpdated, toastError } from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['customer-analytics', id],
    queryFn: () => partnersService.getCustomerAnalytics(Number(id), new Date().getFullYear()),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreatePartnerDTO }) =>
      partnersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner', id] });
      toastUpdated(t('customerUpdated'));
      navigate('/customers');
    },
    onError: (error: Error) => {
      toastError(`${t('failedToUpdate')}: ${error.message}`);
    },
  });

  const handleSubmit = (data: CreatePartnerDTO) => {
    if (id) {
      updateMutation.mutate({
        id: Number(id),
        data: {
          ...data,
          isCustomer: true,
          isSupplier: false,
        },
      });
    }
  };

  if (partnerLoading || analyticsLoading) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
            <div className="animate-spin" style={{ borderRadius: '9999px', height: '2rem', width: '2rem', borderBottom: '2px solid #235ae4' }}></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!partner || !analytics) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: '#64748b' }}>{t('customerNotFound')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { kpis } = analytics;
  const { totalInvoices, totalRevenue, unpaidAmount, totalOrders, totalOrderRevenue, unpaidOrderAmount } = kpis;

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Users}
          title={partner.name}
          subtitle={t('customerDetails')}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/customers')}
              style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0, background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: '0.625rem', padding: 0 }}
            />
          }
          actions={
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <Button type="button" label={t('cancel')} outlined onClick={() => navigate('/customers')} />
              <Button
                type="submit"
                form="partner-form"
                label={t('updatePartner')}
                icon={<Save style={{ width: '0.875rem', height: '0.875rem' }} />}
                loading={updateMutation.isPending}
              />
            </div>
          }
        />

        {/* KPIs */}
        <div style={{ marginBottom: '1.5rem' }}>
          <KpiSheet count={6} label="Statistiques">
            <KpiCard label="Total Factures" value={totalInvoices} icon={FileText} color="blue" />
            <KpiCard label="Revenu Total des Factures" value={formatDH(totalRevenue, 0)} icon={CreditCard} color="emerald" />
            <KpiCard label="Impayé des Factures" value={formatDH(unpaidAmount, 0)} icon={Clock} color="amber" />
            <KpiCard label="Total Bon de livraison" value={totalOrders} icon={Truck} color="indigo" />
            <KpiCard label="Revenu Total des Bon" value={formatDH(totalOrderRevenue, 0)} icon={DollarSign} color="green" />
            <KpiCard label="Impayé des Bons" value={formatDH(unpaidOrderAmount, 0)} icon={AlertCircle} color="orange" />
          </KpiSheet>
        </div>

        {/* Edit Form */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <PartnerForm
            partner={partner}
            type="customer"
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
}