import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Hash, RotateCcw } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import {
  sequencesService,
  Sequence,
  CreateSequenceDTO,
  UpdateSequenceDTO,
  SequenceEntityType,
} from '../../modules/sequences';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';
import { MobileList } from '../../components/MobileList';

// ── helpers ────────────────────────────────────────────────────────────────────

function buildLocalPreview(data: CreateSequenceDTO): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const trimester = `T${Math.ceil((now.getMonth() + 1) / 3)}`;
  const counter = String(1).padStart(data.numberLength || 4, '0');

  const parts: string[] = [];
  if (data.prefix) parts.push(data.prefix.trim());
  if (data.yearInPrefix) parts.push(year);
  if (data.trimesterInPrefix) parts.push(trimester);
  if (data.monthInPrefix && !data.trimesterInPrefix) parts.push(month);
  if (data.dayInPrefix) parts.push(day);
  parts.push(counter);
  if (data.suffix) parts.push(data.suffix.trim());

  return parts.join('-');
}

// ── component ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateSequenceDTO = {
  name: '',
  entityType: 'invoice_sale',
  prefix: '',
  suffix: '',
  numberLength: 4,
  isActive: true,
  yearInPrefix: true,
  monthInPrefix: true,
  dayInPrefix: false,
  trimesterInPrefix: false,
  resetPeriod: 'yearly',
};

export default function Sequences() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [formData, setFormData] = useState<CreateSequenceDTO>(EMPTY_FORM);

  const preview = buildLocalPreview(formData);
  const isLocked = !!editingSequence && editingSequence.nextNumber > 1;

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences', 'configuration'],
    queryFn: () => sequencesService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSequenceDTO) => sequencesService.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sequences'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSequenceDTO }) =>
      sequencesService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sequences'] }); closeModal(); },
  });

  const resetMutation = useMutation({
    mutationFn: (entityType: string) => sequencesService.resetSequence(entityType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequences'] }),
  });

  const entityTypeOptions: { value: SequenceEntityType; label: string }[] = [
    { value: 'invoice_sale', label: t('invoiceSale') },
    { value: 'invoice_purchase', label: t('invoicePurchase') },
    { value: 'quote', label: t('quote') },
    { value: 'delivery_note', label: t('deliveryNote') },
    { value: 'price_request', label: t('priceRequest') },
    { value: 'purchase_order', label: t('purchaseOrder') },
    { value: 'payment', label: t('payment') },
    { value: 'receipt', label: t('receipt') },
    { value: 'order', label: t('posOrder') },
  ];

  const resetPeriodOptions = [
    { value: 'never', label: t('resetNever') },
    { value: 'yearly', label: t('resetYearly') },
    { value: 'monthly', label: t('resetMonthly') },
    { value: 'daily', label: t('resetDaily') },
  ];

  const openCreateModal = () => {
    setEditingSequence(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSequence(null);
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
      resetPeriod: sequence.resetPeriod ?? 'yearly',
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
      resetMutation.mutate(sequence.entityType);
    });
  };

  const set = (patch: Partial<CreateSequenceDTO>) => setFormData((f) => ({ ...f, ...patch }));

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
          <div style={{ color: '#475569' }}>{t('loading')}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Hash}
          title={t('sequences')}
          subtitle={t('manageDocumentSequences')}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/configurations')}
              style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0, background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: '0.625rem', padding: 0 }}
            />
          }
          actions={undefined}
        />

        <div className="responsive-table-mobile">
          <MobileList
            items={sequences}
            keyExtractor={(seq: Sequence) => seq.id}
            loading={isLoading}
            totalCount={sequences.length}
            countLabel={t('sequenceCountLabel')}
            emptyMessage={t('noSequencesConfigured')}
            config={{
              topLeft: (seq: Sequence) => seq.name,
              topRight: (seq: Sequence) => seq.nextFormattedNumber,
              bottomLeft: (seq: Sequence) => seq.formatTemplate || '',
              bottomRight: (seq: Sequence) =>
                seq.isActive ? (
                  <span className="erp-badge erp-badge--active">{t('active')}</span>
                ) : (
                  <span className="erp-badge erp-badge--unpaid">{t('inactive')}</span>
                ),
            }}
          />
        </div>

        <div className="responsive-table-desktop" style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <DataTable
            className="seq-datatable"
            value={sequences}
            dataKey="id"
            paginator
            paginatorPosition="top"
            rows={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            removableSort
            emptyMessage={<EmptyState icon={Hash} title={t('noSequencesConfigured')} compact />}
            paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
            currentPageReportTemplate={t('pageReportTemplate')}
          >
            <Column field="name" header={t('name')} sortable
              body={(row: Sequence) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.name}</span>}
            />
            <Column field="entityType" header={t('entityType')} sortable
              body={(row: Sequence) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{entityTypeOptions.find((o) => o.value === row.entityType)?.label || row.entityType}</span>}
            />
            <Column field="formatTemplate" header={t('format')} sortable
              body={(row: Sequence) => <span style={{ fontSize: '0.875rem', color: '#475569', fontFamily: 'monospace' }}>{row.formatTemplate || '—'}</span>}
            />
            <Column header={t('nextDocumentNumber')}
              body={(row: Sequence) => (
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a', fontFamily: 'monospace' }}>{row.nextFormattedNumber}</span>
              )}
            />
            <Column field="resetPeriod" header={t('resetPeriod')} sortable
              body={(row: Sequence) => {
                const opt = resetPeriodOptions.find((o) => o.value === row.resetPeriod);
                return <span style={{ fontSize: '0.875rem', color: '#475569' }}>{opt?.label || row.resetPeriod}</span>;
              }}
            />
            <Column field="isActive" header={t('status')}
              body={(row: Sequence) => (
                <span className={`erp-badge ${row.isActive ? 'erp-badge--active' : 'erp-badge--unpaid'}`}>
                  {row.isActive ? t('active') : t('inactive')}
                </span>
              )}
            />
            <Column header={t('actions')} headerStyle={{ textAlign: 'right' }}
              body={(row: Sequence) => (
                <div style={{ textAlign: 'right' }}>
                  <Button icon={<RotateCcw style={{ width: '1rem', height: '1rem' }} />} onClick={() => handleReset(row)} text rounded severity="warning" title={t('resetSequence')} />
                  <Button icon={<Pencil style={{ width: '1rem', height: '1rem' }} />} onClick={() => openEditModal(row)} text rounded severity="info" title={t('edit')} />
                </div>
              )}
            />
          </DataTable>
        </div>

        {/* ── Modal ──────────────────────────────────────────────────────────── */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingSequence ? t('editSequence') : t('addSequence')}
          size="lg"
          footer={
            <div className="flex justify-content-end gap-2">
              <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
              <Button
                form="sequences-modal-form"
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                label={t('save')}
              />
            </div>
          }
        >
          <form id="sequences-modal-form" onSubmit={handleSubmit}>

            {/* ── Live preview banner ────────────────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', borderRadius: '0.75rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                  {t('preview')}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em' }}>
                  {preview}
                </div>
              </div>
              {editingSequence && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                    {t('nextNumber')}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    {editingSequence.nextDocumentNumber || `#${editingSequence.nextNumber}`}
                  </div>
                </div>
              )}
            </div>

            {/* ── Locked warning ────────────────────────────────────────────── */}
            {isLocked && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.625rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                <p style={{ fontSize: '0.8125rem', color: '#92400e', margin: 0, lineHeight: 1.5 }}>{t('sequenceInUseReadonly')}</p>
              </div>
            )}

            {/* ── Section: Identity ──────────────────────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                {t('identity')}
              </div>
              <div className="form-grid-2" style={{ gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    {t('name')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <InputText
                    value={formData.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder={t('sequenceNamePlaceholder')}
                    disabled={isLocked}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    {t('entityType')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <Dropdown
                    value={formData.entityType}
                    onChange={(e) => set({ entityType: e.value as SequenceEntityType })}
                    options={entityTypeOptions}
                    optionLabel="label"
                    optionValue="value"
                    disabled={isLocked}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Numbering ────────────────────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                {t('numbering')}
              </div>
              <div className="form-grid-2" style={{ gap: '0.875rem', marginBottom: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>{t('prefix')}</label>
                  <InputText
                    value={formData.prefix}
                    onChange={(e) => set({ prefix: e.target.value })}
                    placeholder="FA"
                    disabled={isLocked}
                    style={{ width: '100%', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>{t('suffix')}</label>
                  <InputText
                    value={formData.suffix}
                    onChange={(e) => set({ suffix: e.target.value })}
                    disabled={isLocked}
                    style={{ width: '100%', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
              <div className="form-grid-2" style={{ gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    {t('numberLength')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <InputText
                    type="number"
                    min="1"
                    max="10"
                    value={String(formData.numberLength)}
                    onChange={(e) => set({ numberLength: parseInt(e.target.value) || 4 })}
                    disabled={isLocked}
                    required
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                    {String(1).padStart(formData.numberLength || 4, '0')}
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>{t('resetPeriod')}</label>
                  <Dropdown
                    value={formData.resetPeriod}
                    onChange={(e) => set({ resetPeriod: e.value })}
                    options={resetPeriodOptions}
                    optionLabel="label"
                    optionValue="value"
                    disabled={isLocked}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Date components ──────────────────────────────────── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                {t('dateComponents')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                {/* Year */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${formData.yearInPrefix ? '#3b82f6' : '#e2e8f0'}`, background: formData.yearInPrefix ? '#eff6ff' : '#fafafa', cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                  <Checkbox checked={formData.yearInPrefix} onChange={() => !isLocked && set({ yearInPrefix: !formData.yearInPrefix })} disabled={isLocked} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{t('year')}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>2026</div>
                  </div>
                </label>

                {/* Trimester */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${formData.trimesterInPrefix ? '#3b82f6' : '#e2e8f0'}`, background: formData.trimesterInPrefix ? '#eff6ff' : '#fafafa', cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                  <Checkbox checked={formData.trimesterInPrefix} onChange={() => !isLocked && set({ trimesterInPrefix: !formData.trimesterInPrefix, monthInPrefix: formData.trimesterInPrefix ? formData.monthInPrefix : false })} disabled={isLocked} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{t('trimester')}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>T2</div>
                  </div>
                </label>

                {/* Month */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${formData.monthInPrefix && !formData.trimesterInPrefix ? '#3b82f6' : '#e2e8f0'}`, background: formData.monthInPrefix && !formData.trimesterInPrefix ? '#eff6ff' : '#fafafa', cursor: (isLocked || formData.trimesterInPrefix) ? 'not-allowed' : 'pointer', opacity: formData.trimesterInPrefix ? 0.45 : 1, transition: 'all 0.15s' }}>
                  <Checkbox checked={formData.monthInPrefix && !formData.trimesterInPrefix} onChange={() => !isLocked && !formData.trimesterInPrefix && set({ monthInPrefix: !formData.monthInPrefix })} disabled={isLocked || formData.trimesterInPrefix} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{t('month')}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>04</div>
                  </div>
                </label>

                {/* Day */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${formData.dayInPrefix ? '#3b82f6' : '#e2e8f0'}`, background: formData.dayInPrefix ? '#eff6ff' : '#fafafa', cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                  <Checkbox checked={formData.dayInPrefix} onChange={() => !isLocked && set({ dayInPrefix: !formData.dayInPrefix })} disabled={isLocked} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{t('day')}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>04</div>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Active toggle ──────────────────────────────────────────────── */}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '0.625rem', border: '1.5px solid #e2e8f0', background: '#fafafa', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{t('active')}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('sequenceActiveDescription')}</div>
              </div>
              <Checkbox checked={formData.isActive} onChange={() => !isLocked && set({ isActive: !formData.isActive })} disabled={isLocked} />
            </label>

          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}

