import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesService, CreateWarehouseDTO, UpdateWarehouseDTO } from '../modules/warehouses';
import { Plus, Edit, Trash2, Search, Building2, MapPin } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { toastCreated, toastUpdated, toastDeleted, toastError, toastConfirm } from '../services/toast.service';

export default function Warehouses() {
  const { dir, t } = useLanguage();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);

  const [formData, setFormData] = useState<CreateWarehouseDTO>({
    code: '',
    name: '',
    address: '',
    city: '',
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesService.getAll(),
  });

  // Filter warehouses by search term
  const filteredWarehouses = warehouses.filter(wh =>
    wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wh.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateWarehouseDTO) => warehousesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      handleCloseModal();
      toastCreated(t('warehouseCreated'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToCreateWarehouse'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWarehouseDTO }) =>
      warehousesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      handleCloseModal();
      toastUpdated(t('warehouseUpdated'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToUpdateWarehouse'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => warehousesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toastDeleted(t('warehouseDeleted'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToDeleteWarehouse'));
    },
  });

  const handleOpenModal = (warehouse?: any) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address || '',
        city: warehouse.city || '',
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        code: '',
        name: '',
        address: '',
        city: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (id: number) => {
    toastConfirm(
      t('deleteWarehouseTitle'),
      () => deleteMutation.mutate(id),
      { description: t('confirmDeleteWarehouse') }
    );
  };

  return (
    <AdminLayout>
      <PageHeader
        icon={Building2}
        title={t('warehouses')}
        subtitle={t('manageWarehousesSubtitle')}
        actions={
          <Button onClick={() => handleOpenModal()} leadingIcon={Plus}>
            {t('addWarehouse')}
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-6">
        <Input
          id="search-warehouses"
          type="text"
          placeholder={t('searchWarehouses')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leadingIcon={Search}
          fullWidth
        />
      </div>

      {/* Warehouses Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No warehouses found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWarehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="bg-white rounded-lg border border-slate-200 hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{warehouse.name}</h3>
                    <p className="text-sm text-slate-500">{warehouse.code}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(warehouse)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(warehouse.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {warehouse.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{warehouse.address}</span>
                  </div>
                )}
                {warehouse.city && (
                  <div className="text-sm text-slate-600">
                    {warehouse.city}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${warehouse.isActive
                  ? 'bg-green-50 text-green-700'
                  : 'bg-slate-100 text-slate-600'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${warehouse.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                  {warehouse.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingWarehouse ? t('editWarehouse') : t('addWarehouse')}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Code" required>
                  <Input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={t('warehouseCode')}
                    fullWidth
                  />
                </FormField>

                <FormField label="Name" required>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('warehouseNamePlaceholder')}
                    fullWidth
                  />
                </FormField>
              </div>

              <FormField label="Address">
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('locationPlaceholder')}
                  leadingIcon={MapPin}
                  fullWidth
                />
              </FormField>

              <FormField label="City">
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('cityName')}
                  fullWidth
                />
              </FormField>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  loadingText="Saving..."
                  className="flex-1"
                >
                  {editingWarehouse ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
