import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { PartnerForm } from '../components/PartnerForm';
import { Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

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
      toast.success(t('supplierUpdated'));
      navigate('/fournisseurs');
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUpdate')}: ${error.message}`);
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!partner) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-slate-500">{t('supplierNotFound')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Users}
          title={t('editSupplier')}
          subtitle={`${t('edit')} ${partner.name}`}
          actions={
            <button
              onClick={() => navigate('/fournisseurs')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </button>
          }
        />

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
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
