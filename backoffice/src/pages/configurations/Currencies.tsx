import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
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
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('code')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('name')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('symbol')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('status')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currencies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '1.5rem 1.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                                        {t('noCurrenciesConfigured')}
                                    </td>
                                </tr>
                            ) : (
                                currencies.map((currency, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{currency.code}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{currency.name}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{currency.symbol}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {currency.isDefault && (
                                                <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', borderRadius: '0.375rem' }}>
                                                    {t('default')}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => openEditModal(index)}
                                                style={{ color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none', padding: '0.25rem', marginRight: '0.75rem' }}
                                            >
                                                <Pencil style={{ width: '1rem', height: '1rem' }} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(index)}
                                                style={{ color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', padding: '0.25rem' }}
                                            >
                                                <Trash2 style={{ width: '1rem', height: '1rem' }} />
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
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={closeModal}
                            style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: 'none', cursor: 'pointer' }}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: '#fff', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                        >
                            {updateMutation.isPending ? t('saving') : t('save')}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
