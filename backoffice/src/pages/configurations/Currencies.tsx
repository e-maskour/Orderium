import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { FormField } from '../../components/ui/form-field';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { currenciesService, Currency, ICurrency, CreateCurrencyDTO, UpdateCurrencyDTO } from '../../modules/currencies';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function Currencies() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ICurrency>({
    code: '',
    name: '',
    symbol: '',
    isDefault: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['currencies', 'configuration'],
    queryFn: () => currenciesService.getConfiguration(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCurrencyDTO) => currenciesService.createCurrency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, data }: { index: number; data: UpdateCurrencyDTO }) =>
      currenciesService.updateCurrency(index, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => currenciesService.deleteCurrency(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
  });

  const currencies: Currency[] = config?.currencies || [];
  const defaultCurrency = config?.default || '';

  const openCreateModal = () => {
    setEditingIndex(null);
    setFormData({ code: '', name: '', symbol: '', isDefault: false });
    setShowModal(true);
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setFormData(currencies[index]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setFormData({ code: '', name: '', symbol: '', isDefault: false });
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
    toastConfirm(t('confirmDeleteCurrency'), () => {
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
        icon={DollarSign}
        title={t('currencies')}
        subtitle={t('manageSupportedCurrencies')}
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
              placeholder={t('searchCurrencies')}
              className="w-64"
            />
          </div>
          <Button variant="warning" onClick={openCreateModal} leadingIcon={<Plus className="w-4 h-4" />}>
            {t('addCurrency')}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('code')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('symbol')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currencies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {t('noCurrenciesConfigured')}
                  </td>
                </tr>
              ) : (
                currencies.map((currency, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{currency.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{currency.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{currency.symbol}</td>
                    <td className="px-6 py-4">
                      {currency.isDefault && (
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
        title={editingIndex !== null ? t('editCurrency') : t('addCurrency')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('code')} htmlFor="curr-code">
            <Input
              id="curr-code"
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder={t('currencyCodePlaceholder')}
              maxLength={3}
              required
            />
          </FormField>

          <FormField label={t('name')} htmlFor="curr-name">
            <Input
              id="curr-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('currencyNamePlaceholder')}
              required
            />
          </FormField>

          <FormField label={t('symbol')} htmlFor="curr-symbol">
            <Input
              id="curr-symbol"
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder={t('currencySymbolPlaceholder')}
              required
            />
          </FormField>

          <Checkbox
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            label={t('setAsDefaultCurrency')}
          />

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {updateMutation.isPending ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}