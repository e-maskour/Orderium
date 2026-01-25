import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { FolderTree, Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { categoriesService, Category, CreateCategoryDTO, UpdateCategoryDTO } from '../modules/categories';
import { toast } from 'sonner';

export default function Categories() {
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
      toast.success('Category created successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryDTO }) =>
      categoriesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
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
      toast.error('Category name is required');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
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
          className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-slate-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-600" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-slate-900">{category.name}</h4>
              {!category.isActive && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                  Inactive
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-sm text-slate-500 mt-1">{category.description}</p>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
            <button
              onClick={() => openCreateModal(category.id)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add subcategory"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openEditModal(category)}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category.id, category.name)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
        title="Categories"
        subtitle="Manage product categories"
        actions={
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        }
      />

      {/* Categories List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No categories found. Create your first category to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">

              Parent Category
            </label>
            <select
              value={formData.parentId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parentId: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">No Parent (Root Category)</option>
              {allCategories
                .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {editingCategory ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
