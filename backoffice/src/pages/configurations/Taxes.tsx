import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Percent, Search } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Link, useNavigate } from 'react-router-dom';
import { taxesService, TaxRate, ITaxRate, CreateTaxRateDTO, UpdateTaxRateDTO } from '../../modules/taxes';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function Taxes() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [selectedRows, setSelectedRows] = useState<(TaxRate & { _idx: number })[]>([]);
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
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
                    <div style={{ color: '#475569' }}>{t('loading')}</div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button
                            onClick={() => navigate('/configurations')}
                            icon={<ArrowLeft style={{ width: 16, height: 16 }} />}
                            label={t('retour')}
                            severity="secondary"
                            outlined
                            size="small"
                        />
                        <Button
                            onClick={openCreateModal}
                            icon={<Plus style={{ width: 16, height: 16 }} />}
                            label={t('addTaxRate')}
                            size="small"
                        />
                    </div>
                }
            />

            <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <style>{`
                    .tax-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                    .tax-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
                    .tax-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
                    .tax-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
                    .tax-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: transparent; padding: 0.125rem 0.5rem; border-radius: 0; }
                    .tax-datatable .p-paginator .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
                `}</style>
                <DataTable
                    className="tax-datatable"
                    value={rates.map((r, i) => ({ ...r, _idx: i }))}
                    selection={selectedRows}
                    onSelectionChange={(e) => setSelectedRows(e.value as (TaxRate & { _idx: number })[])}
                    selectionMode="checkbox"
                    dataKey="_idx"
                    paginator
                    paginatorPosition="top"
                    rows={25}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    removableSort
                    emptyMessage={<div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('noTaxRatesConfigured')}</div>}
                    paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                    currentPageReportTemplate="{first}-{last} of {totalRecords}"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                    <Column field="name" header={t('name')} sortable body={(row) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.name}</span>} />
                    <Column field="rate" header={t('ratePercentage')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.rate}%</span>} />
                    <Column field="isDefault" header={t('status')} body={(row) => row.isDefault ? <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', borderRadius: '0.375rem' }}>{t('default')}</span> : null} />
                    <Column header={t('actions')} headerStyle={{ textAlign: 'right' }} body={(row) => (
                        <div style={{ textAlign: 'right' }}>
                            <Button icon={<Pencil style={{ width: '1rem', height: '1rem' }} />} onClick={() => openEditModal(row._idx)} text rounded severity="info" />
                            <Button icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => handleDelete(row._idx)} text rounded severity="danger" />
                        </div>
                    )} />
                </DataTable>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingIndex !== null ? t('editTaxRate') : t('addTaxRate')}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
                        <Button
                            form="taxes-modal-form"
                            type="submit"
                            loading={updateMutation.isPending}
                            label={t('save')}
                        />
                    </div>
                }
            >
                <form id="taxes-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('name')} <span style={{ color: '#ef4444' }}>*</span></label>
                        <InputText
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('ratePercentage')} <span style={{ color: '#ef4444' }}>*</span></label>
                        <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                            <InputText
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={String(formData.rate)}
                                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                                required
                                style={{ width: '100%', paddingRight: '2.5rem' }}
                            />
                            <Percent style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Checkbox
                            checked={formData.isDefault}
                            onChange={(e) => setFormData({ ...formData, isDefault: e.checked ?? false })}
                        />
                        <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('setAsDefaultTaxRate')}</label>
                    </div>

                </form>
            </Modal>
        </AdminLayout>
    );
}
