import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { FolderTree, Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { categoriesService, Category, CreateCategoryDTO, UpdateCategoryDTO } from '../modules/categories';
import { toastCreated, toastUpdated, toastDeleted, toastError, toastConfirm } from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';

export default function Categories() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState<CreateCategoryDTO>({
    name: '',
    description: '',
    type: 'product',
    parentId: undefined,
    isActive: true,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'product'],
    queryFn: () => categoriesService.getHierarchy('product'),
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories', 'all', 'product'],
    queryFn: () => categoriesService.getByType('product'),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryDTO) => categoriesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toastCreated(t('categoryCreated'));
      closeModal();
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToCreate'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryDTO }) =>
      categoriesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toastUpdated(t('categoryUpdated'));
      closeModal();
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToUpdate'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toastDeleted(t('categoryDeleted'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToDelete'));
    },
  });

  const openCreateModal = (parentId?: number) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      type: 'product',
      parentId,
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      type: category.type,
      parentId: category.parentId,
      isActive: category.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      type: 'product',
      parentId: undefined,
      isActive: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toastError(t('nameRequired'));
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    toastConfirm(t('confirmDeleteCategory').replace('{{name}}', name), () => {
      deleteMutation.mutate(id);
    });
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.5rem', paddingLeft: `${level * 24 + 12}px`, borderBottom: '1px solid #f1f5f9' }}
        >
          {hasChildren ? (
            <Button
              icon={isExpanded ? <ChevronDown style={{ width: '1rem', height: '1rem' }} /> : <ChevronRight style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => toggleExpand(category.id)}
              text rounded
            />
          ) : (
            <div style={{ width: '1.5rem' }} />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ fontWeight: 500, color: '#0f172a', margin: 0 }}>{category.name}</h4>
              {!category.isActive && (
                <span style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.125rem', paddingBottom: '0.125rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '0.25rem' }}>
                  Inactive
                </span>
              )}
            </div>
            {category.description && (
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{category.description}</p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => openCreateModal(category.id)}
              text rounded severity="info"
              title={t('addSubcategory')}
            />
            <Button
              icon={<Pencil style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => openEditModal(category)}
              text rounded severity="warning"
            />
            <Button
              icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => handleDelete(category.id, category.name)}
              text rounded severity="danger"
            />
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <PageHeader
        icon={FolderTree}
        title={t('categories')}
        subtitle={t('manageCategories')}
        actions={
          <Button
            onClick={() => openCreateModal()}
            severity="warning"
            icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
            label={t('addCategory')}
          />
        }
      />

      {/* Categories List */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>{t('loading')}</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            {t('noCategoriesFound')}. {t('createFirstCategory')}.
          </div>
        ) : (
          <div>
            {categories.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingCategory ? t('editCategory') : t('createCategory')}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label={t('cancel')} onClick={closeModal} outlined />
            <Button
              severity="warning"
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              label={editingCategory ? t('update') : t('create')}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="cat-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('categoryName')} <span style={{ color: '#ef4444' }}>*</span></label>
            <InputText
              id="cat-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('enterCategoryName')}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="cat-parent" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('parentCategory')}</label>
            <Dropdown
              id="cat-parent"
              value={formData.parentId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parentId: e.value ? Number(e.value) : undefined,
                })
              }
              options={[
                { label: 'No Parent (Root Category)', value: '' },
                ...allCategories
                  .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                  .map(cat => ({ label: cat.name, value: cat.id }))
              ]}
              optionLabel="label"
              optionValue="value"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="cat-desc" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Description</label>
            <InputTextarea
              id="cat-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Checkbox
              inputId="isActive"
              checked={formData.isActive ?? false}
              onChange={(e) => setFormData({ ...formData, isActive: e.checked ?? false })}
            />
            <label htmlFor="isActive" style={{ fontSize: '0.875rem', color: '#334155' }}>Active</label>
          </div>
        </div>

      </Modal>
    </AdminLayout>
  );
}
