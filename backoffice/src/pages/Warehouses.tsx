import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesService, CreateWarehouseDTO, UpdateWarehouseDTO } from '../modules/warehouses';
import { Plus, Edit, Trash2, Search, Building2, MapPin } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
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
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <PageHeader
        icon={Building2}
        title={t('warehouses')}
        subtitle={t('manageWarehousesSubtitle')}
        actions={
          <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addWarehouse')} onClick={() => handleOpenModal()} />
        }
      />

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ position: 'relative', display: 'block', width: '100%' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
          <InputText
            id="search-warehouses"
            type="text"
            placeholder={t('searchWarehouses')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </span>
      </div>

      {/* Warehouses Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '4px solid #235ae4', borderTopColor: 'transparent', borderRadius: '9999px' }} className="animate-spin"></div>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem', background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <Building2 style={{ width: '4rem', height: '4rem', color: '#cbd5e1', margin: '0 auto', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b' }}>No warehouses found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
          {filteredWarehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem', transition: 'box-shadow 0.15s' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 style={{ width: '1.5rem', height: '1.5rem', color: '#ffffff' }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, color: '#0f172a' }}>{warehouse.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{warehouse.code}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    icon={<Edit style={{ width: '1rem', height: '1rem' }} />}
                    onClick={() => handleOpenModal(warehouse)}
                    text rounded severity="secondary"
                  />
                  <Button
                    icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />}
                    onClick={() => handleDeleteClick(warehouse.id)}
                    text rounded severity="danger"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {warehouse.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                    <MapPin style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                    <span>{warehouse.address}</span>
                  </div>
                )}
                {warehouse.city && (
                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                    {warehouse.city}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <span className={`erp-badge ${warehouse.isActive ? 'erp-badge--active' : 'erp-badge--draft'}`}>
                  {warehouse.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        visible={isModalOpen}
        onHide={handleCloseModal}
        header={editingWarehouse ? t('editWarehouse') : t('addWarehouse')}
        modal
        dismissableMask
        style={{ width: '42rem', maxHeight: '90vh' }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Code <span style={{ color: '#ef4444' }}>*</span></label>
              <InputText
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={t('warehouseCode')}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Name <span style={{ color: '#ef4444' }}>*</span></label>
              <InputText
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('warehouseNamePlaceholder')}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>Address</label>
            <span style={{ position: 'relative', display: 'block', width: '100%' }}>
              <MapPin style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <InputText
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('locationPlaceholder')}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>City</label>
            <InputText
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder={t('cityName')}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
            <Button type="button" label="Cancel" onClick={handleCloseModal} outlined style={{ flex: 1 }} />
            <Button
              type="submit"
              label={editingWarehouse ? 'Update' : 'Create'}
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ flex: 1 }}
            />
          </div>
        </form>
      </Dialog>

      </div>
    </AdminLayout>
  );
}
