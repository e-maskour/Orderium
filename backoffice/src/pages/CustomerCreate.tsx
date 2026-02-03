import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { PartnerForm } from '../components/PartnerForm';
import { Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

export default function CustomerCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const createMutation = useMutation({
    mutationFn: (data: CreatePartnerDTO) => partnersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('customerCreated'));
      navigate('/customers');
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToCreate')}: ${error.message}`);
    },
  });

  const handleSubmit = (data: CreatePartnerDTO) => {
    createMutation.mutate({
      ...data,
      isCustomer: true,
      isSupplier: false,
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Users}
          title={t('newCustomer')}
          subtitle={t('addCustomer')}
          actions={
            <button
              onClick={() => navigate('/customers')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </button>
          }
        />

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <PartnerForm
            type="customer"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/customers')}
            isSubmitting={createMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
}