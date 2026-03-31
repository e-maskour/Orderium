import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Hash, Eye, RotateCcw, Search } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
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
import { MobileList } from '../../components/MobileList';

export default function Sequences() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
    const [previewSequence, setPreviewSequence] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<Sequence[]>([]);
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

    const updatePreview = async () => {
        try {
            const previewData = {
                ...formData,
                nextNumber: 1
            };
            const preview = await sequencesService.generatePreview(previewData);
            setPreviewSequence(preview.example);
        } catch (error) {
            setPreviewSequence('Preview error');
        }
    };

    useEffect(() => {
        updatePreview();
    }, [formData]);

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
                    actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Button
                                onClick={openCreateModal}
                                icon={<Plus style={{ width: 16, height: 16 }} />}
                                label={t('addSequence')}
                                size="small"
                            />
                        </div>
                    }
                />

                <div className="responsive-table-mobile">
                    <MobileList
                        items={sequences}
                        keyExtractor={(seq: Sequence) => seq.id}
                        loading={isLoading}
                        totalCount={sequences.length}
                        countLabel="séquences"
                        emptyMessage="Aucune séquence configurée"
                        config={{
                            topLeft: (seq: Sequence) => seq.name,
                            topRight: (seq: Sequence) => seq.nextDocumentNumber || 'N/A',
                            bottomLeft: (seq: Sequence) => seq.format || '',
                            bottomRight: (seq: Sequence) => seq.isActive
                                ? <span className="erp-badge erp-badge--active">{t('active')}</span>
                                : <span className="erp-badge erp-badge--unpaid">{t('inactive')}</span>,
                        }}
                    />
                </div>
                <div className="responsive-table-desktop" style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <DataTable
                        className="seq-datatable"
                        value={sequences}
                        selection={selectedRows}
                        onSelectionChange={(e) => setSelectedRows(e.value as Sequence[])}
                        selectionMode="checkbox"
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
                        <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                        <Column field="name" header={t('name')} sortable body={(row: Sequence) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.name}</span>} />
                        <Column field="entityType" header={t('entityType')} sortable body={(row: Sequence) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{entityTypeOptions.find(opt => opt.value === row.entityType)?.label || row.entityType}</span>} />
                        <Column field="format" header={t('format')} sortable body={(row: Sequence) => <span style={{ fontSize: '0.875rem', color: '#475569', fontFamily: 'monospace' }}>{row.format || 'N/A'}</span>} />
                        <Column field="nextDocumentNumber" header={t('nextDocumentNumber')} sortable body={(row: Sequence) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#16a34a', fontFamily: 'monospace' }}>{row.nextDocumentNumber || 'N/A'}</span>} />
                        <Column field="isActive" header={t('status')} body={(row: Sequence) => (
                            <span className={`erp-badge ${row.isActive ? 'erp-badge--active' : 'erp-badge--unpaid'}`}>
                                {row.isActive ? t('active') : t('inactive')}
                            </span>
                        )} />
                        <Column header={t('actions')} headerStyle={{ textAlign: 'right' }} body={(row: Sequence) => (
                            <div style={{ textAlign: 'right' }}>
                                <Button icon={<RotateCcw style={{ width: '1rem', height: '1rem' }} />} onClick={() => handleReset(row)} text rounded severity="warning" title={t('resetSequence')} />
                                <Button icon={<Pencil style={{ width: '1rem', height: '1rem' }} />} onClick={() => openEditModal(row)} text rounded severity="info" title={t('edit')} />
                            </div>
                        )} />
                    </DataTable>
                </div>

                {/* Modal */}
                <Modal
                    isOpen={showModal}
                    onClose={closeModal}
                    title={editingSequence ? t('editSequence') : t('addSequence')}
                    footer={
                        <div className="flex justify-content-end gap-2">
                            <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
                            <Button
                                form="sequences-modal-form"
                                type="submit"
                                loading={createMutation.isPending || updateMutation.isPending}
                                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                label={t('save')}
                            />
                        </div>
                    }
                >
                    <form id="sequences-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {editingSequence && editingSequence.nextNumber > 1 && (
                            <div style={{ padding: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
                                    ⚠️ {t('sequenceInUseReadonly')}
                                </p>
                            </div>
                        )}

                        <div className="form-grid-2">
                            <InputText
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('sequenceNamePlaceholder')}
                                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('entityType')} <span style={{ color: '#ef4444' }}>*</span></label>
                            <Dropdown
                                value={formData.entityType}
                                onChange={(e) => setFormData({ ...formData, entityType: e.value as SequenceEntityType })}
                                options={entityTypeOptions}
                                optionLabel="label"
                                optionValue="value"
                                disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-grid-2">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('prefix')}</label>
                                <InputText
                                    type="text"
                                    value={formData.prefix}
                                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                                    placeholder="INV-"
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('suffix')}</label>
                                <InputText
                                    type="text"
                                    value={formData.suffix}
                                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                                    {t('nextNumber')}
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>{t('nextNumberAutoManaged')}</span>
                                </label>
                                <InputText
                                    type="text"
                                    value={editingSequence ?
                                        (editingSequence.realTimeNextNumber ?? editingSequence.nextNumber).toString()
                                        : '1'
                                    }
                                    readOnly
                                    style={{ width: '100%', background: '#f8fafc' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('numberLength')} <span style={{ color: '#ef4444' }}>*</span></label>
                                <InputText
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={String(formData.numberLength)}
                                    onChange={(e) => setFormData({ ...formData, numberLength: parseInt(e.target.value) })}
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Checkbox
                                    checked={formData.yearInPrefix}
                                    onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, yearInPrefix: !formData.yearInPrefix })}
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                />
                                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{`${t('includeYearInPrefix')} (2025)`}</label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Checkbox
                                    checked={formData.trimesterInPrefix}
                                    onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, trimesterInPrefix: !formData.trimesterInPrefix })}
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                />
                                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{`${t('includeTrimesterInPrefix')} (01, 04, 07, 10)`}</label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Checkbox
                                    checked={formData.monthInPrefix}
                                    onChange={() => !formData.trimesterInPrefix && !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, monthInPrefix: !formData.monthInPrefix })}
                                    disabled={formData.trimesterInPrefix || (!!editingSequence && editingSequence.nextNumber > 1)}
                                />
                                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{`${t('includeMonthInPrefix')} (12)${formData.trimesterInPrefix ? ' (désactivé par trimestre)' : ''}`}</label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Checkbox
                                    checked={formData.dayInPrefix}
                                    onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, dayInPrefix: !formData.dayInPrefix })}
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                />
                                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{`${t('includeDayInPrefix')} (01)`}</label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Checkbox
                                    checked={formData.isActive}
                                    onChange={() => !(editingSequence && editingSequence.nextNumber > 1) && setFormData({ ...formData, isActive: !formData.isActive })}
                                    disabled={!!editingSequence && editingSequence.nextNumber > 1}
                                />
                                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('isActive')}</label>
                            </div>
                        </div>

                        {/* Preview */}
                        {previewSequence && (
                            <div style={{ padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a' }}>
                                    <Eye style={{ width: '1rem', height: '1rem' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('preview')}:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{previewSequence}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#235ae4', marginLeft: '0.5rem' }}>
                                        ({t('exampleOnly')})
                                    </span>
                                </div>
                                {editingSequence && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#1a47b8' }}>
                                        💾 {t('actualNextNumber')}:
                                        <span style={{ fontWeight: 500, marginLeft: '0.25rem' }}>
                                            {editingSequence.realTimeNextNumber ?? editingSequence.nextNumber}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                    </form>
                </Modal>
            </div>
        </AdminLayout >
    );
}
