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

export default function FournisseurEdit() {
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
      toastUpdated(t('supplierUpdated'));
      navigate('/fournisseurs');
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
          isCustomer: false,
          isSupplier: true,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
            <div className="animate-spin" style={{ borderRadius: '9999px', height: '2rem', width: '2rem', borderBottom: '2px solid #f59e0b' }}></div>
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
            <p style={{ color: '#64748b' }}>{t('supplierNotFound')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/fournisseurs')}
              text rounded
              style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0 }}
            />
            <div style={{ width: '2.75rem', height: '2.75rem', background: 'linear-gradient(135deg, #1e1e2d, #16213e)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(30,30,45,0.25)' }}>
              <Users style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{t('editSupplier')}</h1>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.125rem', fontWeight: 500 }}>{partner.name}</p>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
          <PartnerForm
            partner={partner}
            type="supplier"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/fournisseurs')}
            isSubmitting={updateMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
