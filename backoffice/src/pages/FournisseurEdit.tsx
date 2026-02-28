import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';
import { AdminLayout } from '../components/AdminLayout';
import { PartnerForm } from '../components/PartnerForm';
import { Users, ArrowLeft } from 'lucide-react';
import { toastUpdated, toastError } from '../services/toast.service';
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
        {/* Compact Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/fournisseurs')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">{t('editSupplier')}</h1>
                  <p className="text-sm text-slate-500">{`${t('edit')} ${partner.name}`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
