import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Search } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Link } from 'react-router-dom';
import { paymentTermsService, PaymentTerm, IPaymentTerm, CreatePaymentTermDTO, UpdatePaymentTermDTO } from '../../modules/payment-terms';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function PaymentTerms() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
            <PageHeader
                icon={Calendar}
                title={t('paymentTerms')}
                subtitle={t('configurePaymentTermsAndDueDates')}
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
                                placeholder={t('searchPaymentTerms')}
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            />
                        </span>
                    </div>
                    <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addPaymentTerm')} onClick={openCreateModal} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('label')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('key')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('days')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('status')}</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {terms.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '1.5rem 1.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                                        {t('noPaymentTermsConfigured')}
                                    </td>
                                </tr>
                            ) : (
                                terms.map((term, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{term.label}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{term.key}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{term.days} {t('daysLabel')}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {term.isDefault && (
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
                title={editingIndex !== null ? t('editPaymentTerm') : t('addPaymentTerm')}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
