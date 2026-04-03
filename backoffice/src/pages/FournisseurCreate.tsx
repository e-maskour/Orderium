import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { PartnerForm } from '../components/PartnerForm';
import { Users, ArrowLeft, Save } from 'lucide-react';
import { Button } from 'primereact/button';
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
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Users}
          title={t('newSupplier')}
          subtitle={t('addSupplier')}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/fournisseurs')}
              style={{
                width: '2.25rem',
                height: '2.25rem',
                flexShrink: 0,
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                color: '#64748b',
                borderRadius: '0.625rem',
                padding: 0,
              }}
            />
          }
          actions={
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <Button
                type="button"
                label={t('cancel')}
                outlined
                onClick={() => navigate('/fournisseurs')}
              />
              <Button
                type="submit"
                form="partner-form"
                label={t('createPartner')}
                icon={<Save style={{ width: '0.875rem', height: '0.875rem' }} />}
                loading={createMutation.isPending}
              />
            </div>
          }
        />
        <PartnerForm
          type="supplier"
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
