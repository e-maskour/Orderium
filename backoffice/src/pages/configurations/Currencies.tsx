import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
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
    const [selectedRows, setSelectedRows] = useState<(Currency & { _idx: number })[]>([]);
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
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
                    <div style={{ color: '#475569' }}>{t('loading')}</div>
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
                        style={{ padding: '0.5rem 1rem', background: '#f1f5f9', color: '#334155', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                    >
                        <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
                        {t('retour')}
                    </Link>
                }
            />

            <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <InputText
                            type="text"
                            placeholder={t('searchCurrencies')}
                            style={{ width: '16rem' }}
                        />
                    </div>
                    <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addCurrency')} onClick={openCreateModal} severity="warning" />
                </div>
                <style>{`
                    .curr-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                    .curr-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
                    .curr-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
                    .curr-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
                    .curr-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 0.375rem 0.75rem; border-radius: 0; }
                    .curr-datatable .p-paginator .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
                `}</style>
                <DataTable
                    className="curr-datatable"
                    value={currencies.map((c, i) => ({ ...c, _idx: i }))}
                    selection={selectedRows}
                    onSelectionChange={(e) => setSelectedRows(e.value as (Currency & { _idx: number })[])}
                    selectionMode="checkbox"
                    dataKey="_idx"
                    paginator
                    paginatorPosition="top"
                    rows={25}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    removableSort
                    emptyMessage={<div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('noCurrenciesConfigured')}</div>}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
                    currentPageReportTemplate="{first} - {last} / {totalRecords}"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                    <Column field="code" header={t('code')} sortable body={(row) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.code}</span>} />
                    <Column field="name" header={t('name')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.name}</span>} />
                    <Column field="symbol" header={t('symbol')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.symbol}</span>} />
                    <Column field="isDefault" header={t('status')} body={(row) => row.isDefault ? <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', borderRadius: '0.375rem' }}>{t('default')}</span> : null} />
                    <Column header={t('actions')} headerStyle={{ textAlign: 'right' }} body={(row) => (
                        <div style={{ textAlign: 'right' }}>
                            <button onClick={() => openEditModal(row._idx)} style={{ color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none', padding: '0.25rem', marginRight: '0.75rem' }}>
                                <Pencil style={{ width: '1rem', height: '1rem' }} />
                            </button>
                            <button onClick={() => handleDelete(row._idx)} style={{ color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', padding: '0.25rem' }}>
                                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                            </button>
                        </div>
                    )} />
                </DataTable>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingIndex !== null ? t('editCurrency') : t('addCurrency')}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
                        <Button
                            form="currencies-modal-form"
                            type="submit"
                            loading={updateMutation.isPending}
                            label={t('save')}
                        />
                    </div>
                }
            >
                <form id="currencies-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('code')}</label>
                        <InputText
                            id="curr-code"
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder={t('currencyCodePlaceholder')}
                            maxLength={3}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('name')}</label>
                        <InputText
                            id="curr-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('currencyNamePlaceholder')}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('symbol')}</label>
                        <InputText
                            id="curr-symbol"
                            type="text"
                            value={formData.symbol}
                            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                            placeholder={t('currencySymbolPlaceholder')}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Checkbox
                            inputId="isDefault"
                            checked={formData.isDefault}
                            onChange={(e) => setFormData({ ...formData, isDefault: e.checked ?? false })}
                        />
                        <label htmlFor="isDefault" style={{ fontSize: '0.875rem', color: '#334155' }}>{t('setAsDefaultCurrency')}</label>
                    </div>

                </form>
            </Modal>
        </AdminLayout>
    );
}
