import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Percent, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { FormField } from '../../components/ui/form-field';
import { Link } from 'react-router-dom';
import { taxesService, TaxRate, ITaxRate, CreateTaxRateDTO, UpdateTaxRateDTO } from '../../modules/taxes';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function Taxes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ITaxRate>({
    name: '',
    rate: 0,
    isDefault: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['taxes', 'configuration'],
    queryFn: () => taxesService.getConfiguration(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaxRateDTO) => taxesService.createRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, data }: { index: number; data: UpdateTaxRateDTO }) =>
      taxesService.updateRate(index, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => taxesService.deleteRate(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });

  const rates: TaxRate[] = config?.rates || [];
  const defaultRate = config?.defaultRate || 0;

  const openCreateModal = () => {
    setEditingIndex(null);
    setFormData({ name: '', rate: 0, isDefault: false });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setFormData({ name: '', rate: 0, isDefault: false });
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setFormData(rates[index]);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (index: number) => {
    toastConfirm(t('confirmDeleteTaxRate'), () => {
      deleteMutation.mutate(index);
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-slate-600">{t('loading')}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        icon={Percent}
        title={t('taxRates')}
        subtitle={t('manageTaxRatesAndSettings')}
        actions={
          <Link
            to="/configurations"
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('retour')}
          </Link>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              type="text"
              placeholder={t('searchTaxRates')}
              leadingIcon={Search}
              className="w-64"
            />
          </div>
          <Button onClick={openCreateModal} leadingIcon={Plus}>
            {t('addTaxRate')}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('ratePercentage')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {t('noTaxRatesConfigured')}
                  </td>
                </tr>
              ) : (
                rates.map((rate, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{rate.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{rate.rate}%</td>
                    <td className="px-6 py-4">
                      {rate.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          {t('default')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(index)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingIndex !== null ? t('editTaxRate') : t('addTaxRate')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('name')} required>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
          </FormField>

          <FormField label={t('ratePercentage')} required>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
              trailingIcon={Percent}
              required
              fullWidth
            />
          </FormField>

          <Checkbox
            checked={formData.isDefault}
            onChange={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
            label={t('setAsDefaultTaxRate')}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              loading={updateMutation.isPending}
              loadingText={t('saving')}
            >
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}