import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PartnerForm } from '../components/PartnerForm';
import { Users, ArrowLeft } from 'lucide-react';
import { toastUpdated, toastError } from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersService.getById(Number(id)),
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

  if (isLoading) {
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

  if (!partner) {
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

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Compact Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button
                icon={<ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />}
                onClick={() => navigate('/customers')}
                text rounded
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: '1.25rem', height: '1.25rem', color: '#235ae4' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>{t('editCustomer')}</h1>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{`${t('edit')} ${partner.name}`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <PartnerForm
            partner={partner}
            type="customer"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/customers')}
            isSubmitting={updateMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
}