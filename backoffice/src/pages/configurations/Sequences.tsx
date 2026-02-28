import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Hash, Eye, RotateCcw, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { FormField } from '../../components/ui/form-field';
import { NativeSelect } from '../../components/ui/native-select';
import { Link } from 'react-router-dom';
import {
  sequencesService,
  Sequence,
  CreateSequenceDTO,
  UpdateSequenceDTO,
  SequenceEntityType
} from '../../modules/sequences';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function Sequences() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [previewSequence, setPreviewSequence] = useState<string>('');
  const [formData, setFormData] = useState<CreateSequenceDTO>({
    name: '',
    entityType: 'invoice_sale',
    prefix: '',
    suffix: '',
    numberLength: 4,
    isActive: true,
    yearInPrefix: false,
    monthInPrefix: false,
    dayInPrefix: false,
    trimesterInPrefix: false,
  });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences', 'configuration'],
    queryFn: () => sequencesService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSequenceDTO) => sequencesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSequenceDTO }) =>
      sequencesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sequencesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => sequencesService.resetSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });

  const entityTypeOptions: { value: SequenceEntityType; label: string }[] = [
    { value: 'invoice_sale', label: t('invoiceSale') },
    { value: 'invoice_purchase', label: t('invoicePurchase') },
    { value: 'quote', label: t('quote') },
    { value: 'delivery_note', label: t('deliveryNote') },
    { value: 'price_request', label: t('priceRequest') },
    { value: 'purchase_order', label: t('purchaseOrder') },
    { value: 'payment', label: t('payment') },
    { value: 'credit_note', label: t('creditNote') },
    { value: 'receipt', label: t('receipt') },
  ];

  useEffect(() => {
    updatePreview();
  }, [formData]);

  const updatePreview = async () => {
    try {
      const previewData = {
        ...formData,
        nextNumber: 1 // Preview always uses 1 for example
      };
      const preview = await sequencesService.generatePreview(previewData);
      setPreviewSequence(preview.example);
    } catch (error) {
      setPreviewSequence('Preview error');
    }
  };

  const openCreateModal = () => {
    setEditingSequence(null);
    setFormData({
      name: '',
      entityType: 'invoice_sale',
      prefix: '',
      suffix: '',
      numberLength: 4,
      isActive: true,
      yearInPrefix: false,
      monthInPrefix: false,
      dayInPrefix: false,
      trimesterInPrefix: false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSequence(null);
    setPreviewSequence('');
  };

  const openEditModal = (sequence: Sequence) => {
    setEditingSequence(sequence);
    setFormData({
      name: sequence.name,
      entityType: sequence.entityType,
      prefix: sequence.prefix,
      suffix: sequence.suffix,
      numberLength: sequence.numberLength,
      isActive: sequence.isActive,
      yearInPrefix: sequence.yearInPrefix,
      monthInPrefix: sequence.monthInPrefix,
      dayInPrefix: sequence.dayInPrefix ?? false,
      trimesterInPrefix: sequence.trimesterInPrefix ?? false,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSequence) {
      updateMutation.mutate({ id: editingSequence.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleReset = (sequence: Sequence) => {
    toastConfirm(t('confirmResetSequence'), () => {
      resetMutation.mutate(sequence.id);
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
        icon={Hash}
        title={t('sequences')}
        subtitle={t('manageDocumentSequences')}
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
              placeholder={t('searchSequences')}
              leadingIcon={Search}
              className="w-64"
            />
          </div>
          <Button onClick={openCreateModal} leadingIcon={Plus}>
            {t('addSequence')}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('entityType')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('format')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('nextDocumentNumber')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sequences.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {t('noSequencesConfigured')}
                  </td>
                </tr>
              ) : (
                sequences.map((sequence) => (
                  <tr key={sequence.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{sequence.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {entityTypeOptions.find(opt => opt.value === sequence.entityType)?.label || sequence.entityType}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {sequence.format || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600 font-mono">
                      {sequence.nextDocumentNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${sequence.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {sequence.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleReset(sequence)}
                        className="text-orange-600 hover:text-orange-800 mr-3"
                        title={t('resetSequence')}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(sequence)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('edit')}
                      >
                        <Pencil className="w-4 h-4" />
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
        title={editingSequence ? t('editSequence') : t('addSequence')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingSequence && editingSequence.nextNumber > 1 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ {t('sequenceInUseReadonly')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('name')} required>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('sequenceNamePlaceholder')}
                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                required
                fullWidth
              />
            </FormField>

            <FormField label={t('entityType')} required>
              <NativeSelect
                value={formData.entityType}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value as SequenceEntityType })}
                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                required
                fullWidth
              >
                {entityTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('prefix')}>
              <Input
                type="text"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                placeholder="INV-"
                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                fullWidth
              />
            </FormField>

            <FormField label={t('suffix')}>
              <Input
                type="text"
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                fullWidth
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('nextNumber')} hint={t('nextNumberAutoManaged')}>
              <Input
                type="text"
                value={editingSequence ?
                  (editingSequence.realTimeNextNumber ?? editingSequence.nextNumber).toString()
                  : '1'
                }
                readOnly
                fullWidth
                className="bg-slate-50"
              />
            </FormField>

            <FormField label={t('numberLength')} required>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.numberLength}
                onChange={(e) => setFormData({ ...formData, numberLength: parseInt(e.target.value) })}
                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                required
                fullWidth
              />
            </FormField>
          </div>

          <div className="space-y-3">
            <Checkbox
              checked={formData.yearInPrefix}
              onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, yearInPrefix: !formData.yearInPrefix })}
              label={`${t('includeYearInPrefix')} (2025)`}
              disabled={!!editingSequence && editingSequence.nextNumber > 1}
            />

            <Checkbox
              checked={formData.trimesterInPrefix}
              onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, trimesterInPrefix: !formData.trimesterInPrefix })}
              label={`${t('includeTrimesterInPrefix')} (01, 04, 07, 10)`}
              disabled={!!editingSequence && editingSequence.nextNumber > 1}
            />

            <Checkbox
              checked={formData.monthInPrefix}
              onChange={() => !formData.trimesterInPrefix && !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, monthInPrefix: !formData.monthInPrefix })}
              label={`${t('includeMonthInPrefix')} (12)${formData.trimesterInPrefix ? ' (désactivé par trimestre)' : ''}`}
              disabled={formData.trimesterInPrefix || (!!editingSequence && editingSequence.nextNumber > 1)}
            />

            <Checkbox
              checked={formData.dayInPrefix}
              onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, dayInPrefix: !formData.dayInPrefix })}
              label={`${t('includeDayInPrefix')} (01)`}
              disabled={!!editingSequence && editingSequence.nextNumber > 1}
            />

            <Checkbox
              checked={formData.isActive}
              onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, isActive: !formData.isActive })}
              label={t('isActive')}
              disabled={!!editingSequence && editingSequence.nextNumber > 1}
            />
          </div>

          {/* Preview */}
          {previewSequence && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">{t('preview')}:</span>
                <span className="font-mono font-bold">{previewSequence}</span>
                <span className="text-xs text-amber-600 ml-2">
                  ({t('exampleOnly')})
                </span>
              </div>
              {editingSequence && (
                <div className="mt-2 text-xs text-amber-700">
                  💾 {t('actualNextNumber')}:
                  <span className="font-medium ml-1">
                    {editingSequence.realTimeNextNumber ?? editingSequence.nextNumber}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              loadingText={t('saving')}
              disabled={!!editingSequence && editingSequence.nextNumber > 1}
            >
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}