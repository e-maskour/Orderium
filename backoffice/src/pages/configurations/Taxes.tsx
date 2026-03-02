import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Percent, Search } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Link } from 'react-router-dom';
import { taxesService, TaxRate, ITaxRate, CreateTaxRateDTO, UpdateTaxRateDTO } from '../../modules/taxes';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function Taxes() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
                        <span style={{ position: 'relative', display: 'block', width: '16rem' }}>
                            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
                            <InputText
                                type="text"
                                placeholder={t('searchTaxRates')}
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            />
                        </span>
                    </div>
                    <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addTaxRate')} onClick={openCreateModal} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('name')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('ratePercentage')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('status')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rates.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '1.5rem 1.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                                        {t('noTaxRatesConfigured')}
                                    </td>
                                </tr>
                            ) : (
                                rates.map((rate, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{rate.name}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{rate.rate}%</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {rate.isDefault && (
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
                title={editingIndex !== null ? t('editTaxRate') : t('addTaxRate')}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem' }}>
                        <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
                        <Button
                            type="submit"
                            loading={updateMutation.isPending}
                            label={t('save')}
                        />
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
