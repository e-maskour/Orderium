import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { FormField } from '../../components/ui/form-field';
import { Link } from 'react-router-dom';
import { paymentTermsService, PaymentTerm, IPaymentTerm, CreatePaymentTermDTO, UpdatePaymentTermDTO } from '../../modules/payment-terms';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function PaymentTerms() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<IPaymentTerm>({
    key: '',
    label: '',
    days: 0,
    isDefault: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['payment-terms', 'configuration'],
    queryFn: () => paymentTermsService.getConfiguration(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentTermDTO) => paymentTermsService.createTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, data }: { index: number; data: UpdatePaymentTermDTO }) =>
      paymentTermsService.updateTerm(index, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => paymentTermsService.deleteTerm(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
    },
  });

  const terms: PaymentTerm[] = config?.terms || [];
  const defaultTerm = config?.default || '';

  const generateSlug = (label: string) => {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };

  const openCreateModal = () => {
    setEditingIndex(null);
    setFormData({ key: '', label: '', days: 0, isDefault: false });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setFormData({ key: '', label: '', days: 0, isDefault: false });
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setFormData(terms[index]);
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
    toastConfirm(t('confirmDeletePaymentTerm'), () => {
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
        icon={Calendar}
        title={t('paymentTerms')}
        subtitle={t('configurePaymentTermsAndDueDates')}
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
              placeholder={t('searchPaymentTerms')}
              leadingIcon={Search}
              className="w-64"
            />
          </div>
          <Button onClick={openCreateModal} leadingIcon={Plus}>
            {t('addPaymentTerm')}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('label')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('key')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('days')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {terms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {t('noPaymentTermsConfigured')}
                  </td>
                </tr>
              ) : (
                terms.map((term, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{term.label}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{term.key}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{term.days} {t('daysLabel')}</td>
                    <td className="px-6 py-4">
                      {term.isDefault && (
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
        title={editingIndex !== null ? t('editPaymentTerm') : t('addPaymentTerm')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('label')} required>
            <Input
              type="text"
              value={formData.label}
              onChange={(e) => {
                const newLabel = e.target.value;
                setFormData({
                  ...formData,
                  label: newLabel,
                  key: editingIndex === null ? generateSlug(newLabel) : formData.key
                });
              }}
              placeholder={t('paymentTermLabelPlaceholder')}
              required
              fullWidth
            />
          </FormField>

          <FormField label={t('key')} hint={editingIndex === null ? t('autoGeneratedFromLabel') : t('lowercaseWithUnderscores')} required>
            <Input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: generateSlug(e.target.value) })}
              placeholder={t('paymentTermKeyPlaceholder')}
              readOnly={editingIndex === null}
              required
              fullWidth
              className={editingIndex === null ? 'bg-slate-50' : ''}
            />
          </FormField>

          <FormField label={t('days')} hint={t('numberOfDaysUntilDue')} required>
            <Input
              type="number"
              min="0"
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
              required
              fullWidth
            />
          </FormField>

          <Checkbox
            checked={formData.isDefault}
            onChange={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
            label={t('setAsDefaultPaymentTerm')}
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