import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Search } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Link, useNavigate } from 'react-router-dom';
import { paymentTermsService, PaymentTerm, IPaymentTerm, CreatePaymentTermDTO, UpdatePaymentTermDTO } from '../../modules/payment-terms';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';
import { MobileList } from '../../components/MobileList';

export default function PaymentTerms() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [selectedRows, setSelectedRows] = useState<(PaymentTerm & { _idx: number })[]>([]);
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
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');
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
                    icon={Calendar}
                    title={t('paymentTerms')}
                    subtitle={t('configurePaymentTermsAndDueDates')}
                    actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Button
                                onClick={openCreateModal}
                                icon={<Plus style={{ width: 16, height: 16 }} />}
                                label={t('addPaymentTerm')}
                                size="small"
                            />
                        </div>
                    }
                />

                <div className="responsive-table-mobile">
                    <MobileList
                        items={terms}
                        keyExtractor={(term: PaymentTerm) => term.key}
                        loading={isLoading}
                        totalCount={terms.length}
                        countLabel="conditions"
                        emptyMessage="Aucune condition configurée"
                        config={{
                            topLeft: (term: PaymentTerm) => term.label,
                            topRight: (term: PaymentTerm) => `${term.days} ${t('daysLabel')}`,
                            bottomLeft: (term: PaymentTerm) => term.key,
                            bottomRight: (term: PaymentTerm) => term.isDefault ? <span className="erp-badge erp-badge--paid">{t('default')}</span> : null,
                        }}
                    />
                </div>
                <div className="responsive-table-desktop" style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <DataTable
                        className="pt-datatable"
                        value={terms.map((t2, i) => ({ ...t2, _idx: i }))}
                        selection={selectedRows}
                        onSelectionChange={(e) => setSelectedRows(e.value as (PaymentTerm & { _idx: number })[])}
                        selectionMode="checkbox"
                        dataKey="_idx"
                        paginator
                        paginatorPosition="top"
                        rows={25}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        removableSort
                        emptyMessage={<EmptyState icon={Calendar} title={t('noPaymentTermsConfigured')} compact />}
                        paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                        currentPageReportTemplate={t('pageReportTemplate')}
                    >
                        <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                        <Column field="label" header={t('label')} sortable body={(row) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.label}</span>} />
                        <Column field="key" header={t('key')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.key}</span>} />
                        <Column field="days" header={t('days')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.days} {t('daysLabel')}</span>} />
                        <Column field="isDefault" header={t('status')} body={(row) => row.isDefault ? <span className="erp-badge erp-badge--paid">{t('default')}</span> : null} />
                        <Column header={t('actions')} headerStyle={{ textAlign: 'right' }} body={(row) => (
                            <div style={{ textAlign: 'right' }}>
                                <Button icon={<Pencil style={{ width: '1rem', height: '1rem' }} />} onClick={() => openEditModal(row._idx)} text rounded severity="info" />
                                <Button icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => handleDelete(row._idx)} text rounded severity="danger" />
                            </div>
                        )} />
                    </DataTable>
                </div>

                <Modal
                    isOpen={showModal}
                    onClose={closeModal}
                    title={editingIndex !== null ? t('editPaymentTerm') : t('addPaymentTerm')}
                    footer={
                        <div className="flex justify-content-end gap-2">
                            <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
                            <Button
                                form="payment-terms-modal-form"
                                type="submit"
                                loading={updateMutation.isPending}
                                label={t('save')}
                            />
                        </div>
                    }
                >
                    <form id="payment-terms-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('label')} <span style={{ color: '#ef4444' }}>*</span></label>
                            <InputText
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
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                                {t('key')} <span style={{ color: '#ef4444' }}>*</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>{editingIndex === null ? t('autoGeneratedFromLabel') : t('lowercaseWithUnderscores')}</span>
                            </label>
                            <InputText
                                type="text"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: generateSlug(e.target.value) })}
                                placeholder={t('paymentTermKeyPlaceholder')}
                                readOnly={editingIndex === null}
                                required
                                style={{ width: '100%', ...(editingIndex === null ? { background: '#f8fafc' } : {}) }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                                {t('days')} <span style={{ color: '#ef4444' }}>*</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>{t('numberOfDaysUntilDue')}</span>
                            </label>
                            <InputText
                                type="number"
                                min="0"
                                value={String(formData.days)}
                                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Checkbox
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.checked ?? false })}
                            />
                            <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('setAsDefaultPaymentTerm')}</label>
                        </div>

                    </form>
                </Modal>
            </div>
        </AdminLayout>
    );
}
