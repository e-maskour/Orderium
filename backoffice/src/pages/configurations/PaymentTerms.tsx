import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paymentTermsService, PaymentTerm, CreatePaymentTermDTO, UpdatePaymentTermDTO } from '../../modules/payment-terms';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';

export default function PaymentTerms() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<PaymentTerm>({
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
    if (!confirm(t('confirmDeletePaymentTerm'))) return;
    deleteMutation.mutate(index);
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
            <input
              type="text"
              placeholder={t('searchPaymentTerms')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-64"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('addPaymentTerm')}
          </button>
        </div>
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

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingIndex !== null ? t('editPaymentTerm') : t('addPaymentTerm')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('label')}
            </label>
            <input
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={t('paymentTermLabelPlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('key')}
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: generateSlug(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
              placeholder={t('paymentTermKeyPlaceholder')}
              readOnly={editingIndex === null}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              {editingIndex === null ? t('autoGeneratedFromLabel') : t('lowercaseWithUnderscores')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('days')}
            </label>
            <input
              type="number"
              min="0"
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
            <p className="mt-1 text-xs text-slate-500">{t('numberOfDaysUntilDue')}</p>
          </div>

          <div className="flex items-center gap-2">
            <div
              onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                formData.isDefault
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white border-slate-300'
              }`}
            >
              {formData.isDefault && <CheckSquare className="w-4 h-4" />}
            </div>
            <label htmlFor="isDefault" className="text-sm text-slate-700">
              {t('setAsDefaultPaymentTerm')}
            </label>
          </div>

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