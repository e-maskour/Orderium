import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesService, CreateWarehouseDTO, UpdateWarehouseDTO } from '../modules/warehouses';
import { Plus, Edit, Trash2, Search, Building2, MapPin, X, Package, Hash } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import {
  toastCreated,
  toastUpdated,
  toastDeleted,
  toastError,
  toastDeleteError,
  toastConfirm,
} from '../services/toast.service';

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
  const filteredWarehouses = warehouses.filter(
    (wh) =>
      wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.city?.toLowerCase().includes(searchTerm.toLowerCase()),
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
    onError: (error: Error) => {
      toastDeleteError(error, t);
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
    toastConfirm(t('deleteWarehouseTitle'), () => deleteMutation.mutate(id), {
      description: t('confirmDeleteWarehouse'),
    });
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Building2}
          title={t('warehouses')}
          subtitle={t('manageWarehousesSubtitle')}
          actions={
            <Button
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label={t('addWarehouse')}
              onClick={() => handleOpenModal()}
            />
          }
        />

        {/* Search */}
        <div className="page-quick-search" style={{ marginBottom: '1.5rem' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search style={{ width: '1rem', height: '1rem' }} />
          </span>
          <InputText
            id="search-warehouses"
            type="text"
            placeholder={t('searchWarehouses')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.25rem',
              paddingRight: searchTerm ? '2.5rem' : '0.875rem',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#94a3b8',
                padding: '0.25rem',
              }}
            >
              <X style={{ width: '1rem', height: '1rem' }} />
            </button>
          )}
        </div>

        {/* Warehouses Grid */}
        {isLoading ? (
          <div className="responsive-card-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="wh-card wh-card-skeleton">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: '0.875rem',
                        width: '8rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '0.25rem',
                        marginBottom: '0.5rem',
                      }}
                    />
                    <div
                      style={{
                        height: '0.75rem',
                        width: '5rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '0.25rem',
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    height: '0.75rem',
                    width: '12rem',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '0.25rem',
                    marginBottom: '0.5rem',
                  }}
                />
                <div
                  style={{
                    height: '0.75rem',
                    width: '6rem',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '0.25rem',
                  }}
                />
              </div>
            ))}
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              paddingTop: '4rem',
              paddingBottom: '4rem',
              background: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                background: 'linear-gradient(135deg, #eff3ff, #dbeafe)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Building2 style={{ width: '2rem', height: '2rem', color: '#235ae4' }} />
            </div>
            <p
              style={{ color: '#475569', fontWeight: 500, fontSize: '1rem', margin: '0 0 0.25rem' }}
            >
              {t('noWarehousesFound')}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
              {searchTerm ? t('tryDifferentSearch') : t('createFirstWarehouse')}
            </p>
          </div>
        ) : (
          <div className="responsive-card-grid">
            {filteredWarehouses.map((warehouse) => (
              <div key={warehouse.id} className="wh-card">
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}
                  >
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        background: warehouse.isActive
                          ? 'linear-gradient(135deg, #235ae4, #1a47b8)'
                          : 'linear-gradient(135deg, #94a3b8, #64748b)',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: warehouse.isActive
                          ? '0 4px 12px rgba(35, 90, 228, 0.25)'
                          : 'none',
                      }}
                    >
                      <Building2
                        style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          fontSize: '0.9375rem',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {warehouse.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          marginTop: '0.125rem',
                        }}
                      >
                        <Hash style={{ width: '0.75rem', height: '0.75rem', color: '#94a3b8' }} />
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: '#64748b',
                            fontFamily: 'monospace',
                          }}
                        >
                          {warehouse.code}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`erp-badge ${warehouse.isActive ? 'erp-badge--active' : 'erp-badge--draft'}`}
                    style={{ flexShrink: 0 }}
                  >
                    {warehouse.isActive ? t('active') : t('inactive')}
                  </span>
                </div>

                {/* Card Body — Info rows */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                    padding: '0.875rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.625rem',
                    marginBottom: '1rem',
                  }}
                >
                  {warehouse.address ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <MapPin
                        style={{
                          width: '0.875rem',
                          height: '0.875rem',
                          color: '#235ae4',
                          flexShrink: 0,
                          marginTop: '0.125rem',
                        }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.4 }}>
                        {warehouse.address}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin
                        style={{
                          width: '0.875rem',
                          height: '0.875rem',
                          color: '#cbd5e1',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}
                      >
                        {t('noAddress')}
                      </span>
                    </div>
                  )}
                  {warehouse.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Package
                        style={{
                          width: '0.875rem',
                          height: '0.875rem',
                          color: '#235ae4',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: '#334155' }}>
                        {warehouse.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer — Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <Button
                    icon={<Edit style={{ width: '0.875rem', height: '0.875rem' }} />}
                    label={t('edit')}
                    onClick={() => handleOpenModal(warehouse)}
                    text
                    size="small"
                    severity="secondary"
                  />
                  <Button
                    icon={<Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                    label={t('delete')}
                    onClick={() => handleDeleteClick(warehouse.id)}
                    text
                    size="small"
                    severity="danger"
                  />
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
          <form
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
                  {t('code')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
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
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('warehouseNamePlaceholder')}
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
                {t('address')}
              </label>
              <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                <MapPin
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                />
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
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '0.25rem',
                }}
              >
                {t('city')}
              </label>
              <InputText
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t('cityName')}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
              <Button
                type="button"
                label={t('cancel')}
                onClick={handleCloseModal}
                outlined
                style={{ flex: 1 }}
              />
              <Button
                type="submit"
                label={editingWarehouse ? t('update') : t('create')}
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
