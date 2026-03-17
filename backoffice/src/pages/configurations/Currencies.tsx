import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Link, useNavigate } from 'react-router-dom';
import { currenciesService, Currency, ICurrency, CreateCurrencyDTO, UpdateCurrencyDTO } from '../../modules/currencies';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';
import { MobileList } from '../../components/MobileList';

export default function Currencies() {
    const { t } = useLanguage();
    const navigate = useNavigate();
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
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <PageHeader
                icon={DollarSign}
                title={t('currencies')}
                subtitle={t('manageSupportedCurrencies')}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button
                            onClick={openCreateModal}
                            icon={<Plus style={{ width: 16, height: 16 }} />}
                            label={t('addCurrency')}
                            size="small"
                        />
                    </div>
                }
            />

            <div className="responsive-table-mobile">
                <MobileList
                    items={currencies}
                    keyExtractor={(c: Currency) => c.code}
                    loading={isLoading}
                    totalCount={currencies.length}
                    countLabel="devises"
                    emptyMessage="Aucune devise configurée"
                    config={{
                        topLeft: (c: Currency) => `${c.code} ${c.symbol}`,
                        topRight: (c: Currency) => c.name,
                        bottomRight: (c: Currency) => c.isDefault ? <span className="erp-badge erp-badge--paid">{t('default')}</span> : null,
                    }}
                />
            </div>
            <div className="responsive-table-desktop" style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
                    paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                    currentPageReportTemplate="{first}-{last} of {totalRecords}"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                    <Column field="code" header={t('code')} sortable body={(row) => <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.code}</span>} />
                    <Column field="name" header={t('name')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.name}</span>} />
                    <Column field="symbol" header={t('symbol')} sortable body={(row) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.symbol}</span>} />
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
            </div>
        </AdminLayout>
    );
}
