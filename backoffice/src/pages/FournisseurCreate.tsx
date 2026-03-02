import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PartnerForm } from '../components/PartnerForm';
import { Users, ArrowLeft } from 'lucide-react';
import { toastCreated, toastError } from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';

export default function FournisseurCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const createMutation = useMutation({
    mutationFn: (data: CreatePartnerDTO) => partnersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toastCreated(t('supplierCreated'));
      navigate('/fournisseurs');
    },
    onError: (error: Error) => {
      toastError(`${t('failedToCreate')}: ${error.message}`);
    },
  });

  const handleSubmit = (data: CreatePartnerDTO) => {
    createMutation.mutate({
      ...data,
      isCustomer: false,
      isSupplier: true,
    });
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Compact Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/fournisseurs')}
                style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
              >
                <ArrowLeft style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: '1.25rem', height: '1.25rem', color: '#d97706' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>{t('newSupplier')}</h1>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('addSupplier')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <PartnerForm
            type="supplier"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/fournisseurs')}
            isSubmitting={createMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
