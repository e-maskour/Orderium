import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Ruler, Search, Filter } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import {
  uomService,
  IUnitOfMeasure,
  CreateUomDTO,
  UpdateUomDTO,
  UOM_CATEGORIES,
} from '../../modules/uom';
import { Modal } from '../../components/Modal';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { toastConfirm } from '../../services/toast.service';
import { MobileList } from '../../components/MobileList';

export default function UnitsOfMeasure() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUom, setEditingUom] = useState<IUnitOfMeasure | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedRows, setSelectedRows] = useState<IUnitOfMeasure[]>([]);
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
    mutationFn: ({ id, data }: { id: number; data: UpdateUomDTO }) => uomService.update(id, data),
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
    toastConfirm(
      t('confirmDeleteUom') || 'Are you sure you want to delete this unit of measure?',
      () => {
        deleteMutation.mutate(id);
      },
    );
  };

  // Filter UOMs based on search and category
  const filteredUoms = uoms.filter((uom: IUnitOfMeasure) => {
    const matchesSearch =
      searchTerm === '' ||
      uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uom.code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Get base units for the selected category (for dropdown)
  const baseUnitsForCategory = uoms.filter(
    (uom: IUnitOfMeasure) => uom.category === formData.category && uom.isBaseUnit,
  );

  // Group UOMs by category for display
  const groupedUoms = filteredUoms.reduce(
    (acc: Record<string, IUnitOfMeasure[]>, uom: IUnitOfMeasure) => {
      if (!acc[uom.category]) {
        acc[uom.category] = [];
      }
      acc[uom.category].push(uom);
      return acc;
    },
    {},
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '16rem',
          }}
        >
          <div style={{ color: '#475569' }}>{t('loading')}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Ruler}
          title={t('unitsOfMeasure') || 'Units of Measure'}
          subtitle={t('manageUomDescription') || 'Manage units of measure for your inventory'}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/configurations')}
              style={{
                width: '2.25rem',
                height: '2.25rem',
                flexShrink: 0,
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                color: '#64748b',
                borderRadius: '0.625rem',
                padding: 0,
              }}
            />
          }
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                onClick={openCreateModal}
                icon={<Plus style={{ width: 16, height: 16 }} />}
                label={t('addUom') || 'Add UOM'}
                size="small"
              />
            </div>
          }
        />

        <div className="responsive-table-mobile">
          <MobileList
            items={filteredUoms}
            keyExtractor={(uom: IUnitOfMeasure) => uom.id ?? String(uom.code)}
            loading={isLoading}
            totalCount={filteredUoms.length}
            countLabel="unités"
            emptyMessage="Aucune unité trouvée"
            config={{
              topLeft: (uom: IUnitOfMeasure) => uom.name,
              topRight: (uom: IUnitOfMeasure) => uom.code,
              bottomLeft: (uom: IUnitOfMeasure) => uom.category,
              bottomRight: (uom: IUnitOfMeasure) =>
                uom.isActive ? (
                  <span className="erp-badge erp-badge--paid">{t('active')}</span>
                ) : (
                  <span className="erp-badge erp-badge--unpaid">{t('inactive')}</span>
                ),
            }}
          />
        </div>
        <div
          className="responsive-table-desktop"
          style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <DataTable
            className="uom-datatable"
            value={filteredUoms.slice().sort((a, b) => a.category.localeCompare(b.category))}
            dataKey="id"
            paginator
            paginatorPosition="top"
            rows={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            removableSort
            rowGroupMode="subheader"
            groupRowsBy="category"
            rowGroupHeaderTemplate={(row: IUnitOfMeasure) => <span>{row.category}</span>}
            emptyMessage={
              <EmptyState
                icon={Ruler}
                title={t('noUomFound') || 'No units of measure found'}
                compact
              />
            }
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            currentPageReportTemplate={t('pageReportTemplate')}
          >
            <Column
              field="name"
              header={t('name')}
              sortable
              body={(row: IUnitOfMeasure) => (
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                  {row.name}
                </span>
              )}
            />
            <Column
              field="code"
              header={t('code')}
              sortable
              body={(row: IUnitOfMeasure) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.code}</span>
              )}
            />
            <Column
              field="isBaseUnit"
              header={t('type') || 'Type'}
              body={(row: IUnitOfMeasure) =>
                row.isBaseUnit ? (
                  <span className="erp-badge erp-badge--active">
                    {t('baseUnit') || 'Base Unit'}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                    {t('derived') || 'Derived'}
                  </span>
                )
              }
            />
            <Column
              field="ratio"
              header={t('ratio')}
              sortable
              body={(row: IUnitOfMeasure) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.ratio}</span>
              )}
            />
            <Column
              field="roundingPrecision"
              header={t('rounding') || 'Rounding'}
              body={(row: IUnitOfMeasure) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  {row.roundingPrecision || '-'}
                </span>
              )}
            />
            <Column
              field="isActive"
              header={t('status')}
              body={(row: IUnitOfMeasure) =>
                row.isActive ? (
                  <span className="erp-badge erp-badge--paid">{t('active')}</span>
                ) : (
                  <span className="erp-badge erp-badge--unpaid">{t('inactive')}</span>
                )
              }
            />
            <Column
              header={t('actions')}
              headerStyle={{ textAlign: 'right' }}
              body={(row: IUnitOfMeasure) => (
                <div style={{ textAlign: 'right' }}>
                  <Button
                    icon={<Pencil style={{ width: '1rem', height: '1rem' }} />}
                    onClick={() => openEditModal(row)}
                    text
                    rounded
                    severity="info"
                  />
                  <Button
                    icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
                    onClick={() => handleDelete(row.id!)}
                    text
                    rounded
                    severity="danger"
                  />
                </div>
              )}
            />
          </DataTable>
        </div>

        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={
            editingUom
              ? t('editUom') || 'Edit Unit of Measure'
              : t('addUom') || 'Add Unit of Measure'
          }
          footer={
            <div className="flex justify-content-end gap-2">
              <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
              <Button
                form="uom-modal-form"
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                label={t('save')}
              />
            </div>
          }
        >
          <form
            id="uom-modal-form"
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div className="form-grid-2">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <InputText
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('code')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
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
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '0.25rem',
                }}
              >
                {t('category')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
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
              <label style={{ fontSize: '0.875rem', color: '#334155' }}>
                {t('isBaseUnit') || 'This is a base unit'}
              </label>
            </div>

            {!formData.isBaseUnit && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#334155',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('baseUnit') || 'Base Unit'}
                  </label>
                  <Dropdown
                    value={formData.baseUnitId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, baseUnitId: e.value ? parseInt(e.value) : null })
                    }
                    options={[
                      { label: t('selectBaseUnit') || 'Select a base unit', value: '' },
                      ...baseUnitsForCategory.map((baseUom: IUnitOfMeasure) => ({
                        label: `${baseUom.name} (${baseUom.code})`,
                        value: String(baseUom.id),
                      })),
                    ]}
                    optionLabel="label"
                    optionValue="value"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#334155',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {`${t('ratio')} (${t('ratioHelp') || '1 this unit = X base units'})`}{' '}
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <InputText
                    type="number"
                    step="0.000001"
                    min="0"
                    value={String(formData.ratio)}
                    onChange={(e) =>
                      setFormData({ ...formData, ratio: parseFloat(e.target.value) })
                    }
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '0.25rem',
                }}
              >
                {t('roundingPrecision') || 'Rounding Precision'}
              </label>
              <Dropdown
                value={formData.roundingPrecision}
                onChange={(e) => setFormData({ ...formData, roundingPrecision: e.value })}
                options={[
                  { label: '1', value: '1' },
                  { label: '0.1', value: '0.1' },
                  { label: '0.01', value: '0.01' },
                  { label: '0.001', value: '0.001' },
                  { label: '0.0001', value: '0.0001' },
                ]}
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
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
