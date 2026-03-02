import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Ruler, Search, Filter } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { Link } from 'react-router-dom';
import { uomService, IUnitOfMeasure, CreateUomDTO, UpdateUomDTO, UOM_CATEGORIES } from '../../modules/uom';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';

export default function UnitsOfMeasure() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingUom, setEditingUom] = useState<IUnitOfMeasure | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<CreateUomDTO>({
        name: '',
        code: '',
        category: 'Unit',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        baseUnitId: null,
        isActive: true,
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { data: uoms = [], isLoading } = useQuery({
        queryKey: ['uom', filterCategory],
        queryFn: () => uomService.getAll(filterCategory || undefined),
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateUomDTO) => uomService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['uom'] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateUomDTO }) =>
            uomService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['uom'] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => uomService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['uom'] });
        },
    });

    const openCreateModal = () => {
        setEditingUom(null);
        setFormData({
            name: '',
            code: '',
            category: 'Unit',
            ratio: 1,
            roundingPrecision: '0.01',
            isBaseUnit: false,
            baseUnitId: null,
            isActive: true,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUom(null);
        setFormData({
            name: '',
            code: '',
            category: 'Unit',
            ratio: 1,
            roundingPrecision: '0.01',
            isBaseUnit: false,
            baseUnitId: null,
            isActive: true,
        });
    };

    const openEditModal = (uom: IUnitOfMeasure) => {
        setEditingUom(uom);
        setFormData({
            name: uom.name,
            code: uom.code,
            category: uom.category,
            ratio: uom.ratio,
            roundingPrecision: uom.roundingPrecision || '0.01',
            isBaseUnit: uom.isBaseUnit,
            baseUnitId: uom.baseUnitId || null,
            isActive: uom.isActive ?? true,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            ratio: formData.isBaseUnit ? 1 : formData.ratio,
            baseUnitId: formData.isBaseUnit ? null : formData.baseUnitId,
        };

        if (editingUom) {
            updateMutation.mutate({ id: editingUom.id!, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleDelete = (id: number) => {
        toastConfirm(t('confirmDeleteUom') || 'Are you sure you want to delete this unit of measure?', () => {
            deleteMutation.mutate(id);
        });
    };

    // Filter UOMs based on search and category
    const filteredUoms = uoms.filter((uom: IUnitOfMeasure) => {
        const matchesSearch = searchTerm === '' ||
            uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            uom.code.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    // Get base units for the selected category (for dropdown)
    const baseUnitsForCategory = uoms.filter(
        (uom: IUnitOfMeasure) => uom.category === formData.category && uom.isBaseUnit
    );

    // Group UOMs by category for display
    const groupedUoms = filteredUoms.reduce((acc: Record<string, IUnitOfMeasure[]>, uom: IUnitOfMeasure) => {
        if (!acc[uom.category]) {
            acc[uom.category] = [];
        }
        acc[uom.category].push(uom);
        return acc;
    }, {});

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
                icon={Ruler}
                title={t('unitsOfMeasure') || 'Units of Measure'}
                subtitle={t('manageUomDescription') || 'Manage units of measure for your inventory'}
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
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '28rem' }}>
                            <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
                                <InputText
                                    type="text"
                                    placeholder={t('searchUom') || 'Search by name or code...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                                />
                            </span>
                        </div>

                        <div style={{ position: 'relative' }} ref={categoryRef}>
                            <button
                                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Filter style={{ width: '1rem', height: '1rem' }} />
                                {filterCategory || t('allCategories') || 'All Categories'}
                            </button>
                            {showCategoryDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem', width: '12rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '16rem', overflowY: 'auto' }}>
                                    <button
                                        onClick={() => {
                                            setFilterCategory('');
                                            setShowCategoryDropdown(false);
                                        }}
                                        style={{ width: '100%', padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        {t('allCategories') || 'All Categories'}
                                    </button>
                                    {UOM_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setFilterCategory(cat);
                                                setShowCategoryDropdown(false);
                                            }}
                                            style={{ width: '100%', padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addUom') || 'Add UOM'} onClick={openCreateModal} />
                </div>

                <div>
                    {Object.keys(groupedUoms).length === 0 ? (
                        <div style={{ padding: '1.5rem 1.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                            {t('noUomFound') || 'No units of measure found'}
                        </div>
                    ) : (
                        Object.entries(groupedUoms).map(([category, categoryUoms]) => (
                            <div key={category} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ padding: '0.75rem 1.5rem', background: '#f8fafc' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{category}</h3>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%' }}>
                                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <tr>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('name')}</th>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('code')}</th>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('type') || 'Type'}</th>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('ratio')}</th>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('rounding') || 'Rounding'}</th>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('status')}</th>
                                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>{t('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categoryUoms.map((uom: IUnitOfMeasure) => (
                                                <tr key={uom.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{uom.name}</td>
                                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{uom.code}</td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        {uom.isBaseUnit ? (
                                                            <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#dbeafe', color: '#1e40af', borderRadius: '0.375rem' }}>
                                                                {t('baseUnit') || 'Base Unit'}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '0.75rem', color: '#475569' }}>{t('derived') || 'Derived'}</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{uom.ratio}</td>
                                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>{uom.roundingPrecision || '-'}</td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        {uom.isActive ? (
                                                            <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', borderRadius: '0.375rem' }}>
                                                                {t('active')}
                                                            </span>
                                                        ) : (
                                                            <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#fee2e2', color: '#991b1b', borderRadius: '0.375rem' }}>
                                                                {t('inactive')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => openEditModal(uom)}
                                                            style={{ color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none', padding: '0.25rem', marginRight: '0.75rem' }}
                                                        >
                                                            <Pencil style={{ width: '1rem', height: '1rem' }} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(uom.id!)}
                                                            style={{ color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none', padding: '0.25rem' }}
                                                        >
                                                            <Trash2 style={{ width: '1rem', height: '1rem' }} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingUom ? (t('editUom') || 'Edit Unit of Measure') : (t('addUom') || 'Add Unit of Measure')}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
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
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('code')} <span style={{ color: '#ef4444' }}>*</span></label>
                            <InputText
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('category')} <span style={{ color: '#ef4444' }}>*</span></label>
                        <Dropdown
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.value })}
                            options={UOM_CATEGORIES.map((cat) => ({ label: cat, value: cat }))}
                            optionLabel="label"
                            optionValue="value"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Checkbox
                            checked={formData.isBaseUnit ?? false}
                            onChange={(e) => setFormData({ ...formData, isBaseUnit: e.checked ?? false })}
                        />
                        <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('isBaseUnit') || 'This is a base unit'}</label>
                    </div>

                    {!formData.isBaseUnit && (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('baseUnit') || 'Base Unit'}</label>
                                <Dropdown
                                    value={formData.baseUnitId || ''}
                                    onChange={(e) => setFormData({ ...formData, baseUnitId: e.value ? parseInt(e.value) : null })}
                                    options={[{ label: t('selectBaseUnit') || 'Select a base unit', value: '' }, ...baseUnitsForCategory.map((baseUom: IUnitOfMeasure) => ({ label: `${baseUom.name} (${baseUom.code})`, value: String(baseUom.id) }))]}
                                    optionLabel="label"
                                    optionValue="value"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{`${t('ratio')} (${t('ratioHelp') || '1 this unit = X base units'})`} <span style={{ color: '#ef4444' }}>*</span></label>
                                <InputText
                                    type="number"
                                    step="0.000001"
                                    min="0"
                                    value={String(formData.ratio)}
                                    onChange={(e) => setFormData({ ...formData, ratio: parseFloat(e.target.value) })}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('roundingPrecision') || 'Rounding Precision'}</label>
                        <Dropdown
                            value={formData.roundingPrecision}
                            onChange={(e) => setFormData({ ...formData, roundingPrecision: e.value })}
                            options={[{ label: '1', value: '1' }, { label: '0.1', value: '0.1' }, { label: '0.01', value: '0.01' }, { label: '0.001', value: '0.001' }, { label: '0.0001', value: '0.0001' }]}
                            optionLabel="label"
                            optionValue="value"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Checkbox
                            checked={formData.isActive ?? false}
                            onChange={(e) => setFormData({ ...formData, isActive: e.checked ?? false })}
                        />
                        <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('active')}</label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem' }}>
                        <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
                        <Button
                            type="submit"
                            loading={createMutation.isPending || updateMutation.isPending}
                            label={t('save')}
                        />
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
