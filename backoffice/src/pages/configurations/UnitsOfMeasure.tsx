import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Ruler, Search, Filter } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { FormField } from '../../components/ui/form-field';
import { NativeSelect } from '../../components/ui/native-select';
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
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-slate-600">{t('loading')}</div>
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
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('retour')}
          </Link>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Input
                type="text"
                placeholder={t('searchUom') || 'Search by name or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leadingIcon={Search}
                fullWidth
              />
            </div>

            <div className="relative" ref={categoryRef}>
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {filterCategory || t('allCategories') || 'All Categories'}
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilterCategory('');
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm"
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
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button onClick={openCreateModal} leadingIcon={Plus}>
            {t('addUom') || 'Add UOM'}
          </Button>
        </div>

        <div className="divide-y divide-slate-200">
          {Object.keys(groupedUoms).length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              {t('noUomFound') || 'No units of measure found'}
            </div>
          ) : (
            Object.entries(groupedUoms).map(([category, categoryUoms]) => (
              <div key={category}>
                <div className="px-6 py-3 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-700">{category}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('name')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('code')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('type') || 'Type'}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('ratio')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('rounding') || 'Rounding'}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('status')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {categoryUoms.map((uom: IUnitOfMeasure) => (
                        <tr key={uom.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">{uom.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{uom.code}</td>
                          <td className="px-6 py-4">
                            {uom.isBaseUnit ? (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {t('baseUnit') || 'Base Unit'}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">{t('derived') || 'Derived'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{uom.ratio}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{uom.roundingPrecision || '-'}</td>
                          <td className="px-6 py-4">
                            {uom.isActive ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                {t('active')}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                {t('inactive')}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openEditModal(uom)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(uom.id!)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('name')} required>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
            </FormField>

            <FormField label={t('code')} required>
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                fullWidth
              />
            </FormField>
          </div>

          <FormField label={t('category')} required>
            <NativeSelect
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              fullWidth
            >
              {UOM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </NativeSelect>
          </FormField>

          <Checkbox
            checked={formData.isBaseUnit}
            onChange={() => setFormData({ ...formData, isBaseUnit: !formData.isBaseUnit })}
            label={t('isBaseUnit') || 'This is a base unit'}
          />

          {!formData.isBaseUnit && (
            <>
              <FormField label={t('baseUnit') || 'Base Unit'}>
                <NativeSelect
                  value={formData.baseUnitId || ''}
                  onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value ? parseInt(e.target.value) : null })}
                  fullWidth
                >
                  <option value="">{t('selectBaseUnit') || 'Select a base unit'}</option>
                  {baseUnitsForCategory.map((baseUom: IUnitOfMeasure) => (
                    <option key={baseUom.id} value={baseUom.id}>
                      {baseUom.name} ({baseUom.code})
                    </option>
                  ))}
                </NativeSelect>
              </FormField>

              <FormField label={`${t('ratio')} (${t('ratioHelp') || '1 this unit = X base units'})`} required>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={formData.ratio}
                  onChange={(e) => setFormData({ ...formData, ratio: parseFloat(e.target.value) })}
                  required
                  fullWidth
                />
              </FormField>
            </>
          )}

          <FormField label={t('roundingPrecision') || 'Rounding Precision'}>
            <NativeSelect
              value={formData.roundingPrecision}
              onChange={(e) => setFormData({ ...formData, roundingPrecision: e.target.value })}
              fullWidth
            >
              <option value="1">1</option>
              <option value="0.1">0.1</option>
              <option value="0.01">0.01</option>
              <option value="0.001">0.001</option>
              <option value="0.0001">0.0001</option>
            </NativeSelect>
          </FormField>

          <Checkbox
            checked={formData.isActive}
            onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
            label={t('active')}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              loadingText={t('saving')}
            >
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
