import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Truck, Edit2, Trash2, Search, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonService } from '../modules/delivery';
import { DeliveryPerson } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  toastCreated,
  toastUpdated,
  toastDeleted,
  toastError,
  toastDeleteError,
  toastConfirm,
} from '../services/toast.service';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { Modal } from '../components/Modal';

export default function DeliveryPersons() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const [selectedPersons, setSelectedPersons] = useState<number[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<DeliveryPerson | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data: deliveryPersons = [], isLoading } = useQuery({
    queryKey: ['deliveryPersons', searchTerm],
    queryFn: () => deliveryPersonService.getAll(searchTerm || undefined),
  });

  const createMutation = useMutation({
    mutationFn: deliveryPersonService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toastCreated(t('deliveryPersonCreated'));
      closeModal();
    },
    onError: (error: Error) => {
      toastError(`${t('error')}: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => deliveryPersonService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toastUpdated(t('deliveryPersonUpdated'));
      closeModal();
    },
    onError: (error: Error) => {
      toastError(`${t('error')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deliveryPersonService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toastDeleted(t('deliveryPersonDeleted'));
      setSelectedPersons([]);
    },
    onError: (error: Error) => {
      toastDeleteError(error, t);
    },
  });

  const closeModal = () => {
    setShowFormModal(false);
    setEditingPerson(null);
    setFormData({ name: '', phoneNumber: '', email: '', password: '', isActive: true });
  };

  const openCreateModal = () => {
    setEditingPerson(null);
    setFormData({ name: '', phoneNumber: '', email: '', password: '', isActive: true });
    setShowFormModal(true);
  };

  const openEditModal = (person: DeliveryPerson) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      phoneNumber: person.phoneNumber,
      email: person.email || '',
      password: '',
      isActive: person.isActive,
    });
    setShowFormModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPerson) {
      // Update existing person
      const updateData: any = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email || null,
        isActive: formData.isActive,
      };
      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingPerson.id, data: updateData });
    } else {
      // Create new person
      if (!formData.password) {
        toastError(t('passwordRequiredError'));
        return;
      }
      createMutation.mutate({
        ...formData,
        email: formData.email || null,
      });
    }
  };

  const toggleSelectPerson = (id: number) => {
    setSelectedPersons((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedPersons.length === deliveryPersons.length) {
      setSelectedPersons([]);
    } else {
      setSelectedPersons(deliveryPersons.map((p: DeliveryPerson) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedPersons([]);
  };

  const handleViewPerson = (person: DeliveryPerson) => {
    // Navigate to view page if exists
    console.log('View person:', person.id);
  };

  const handleEditPerson = (person: DeliveryPerson) => {
    openEditModal(person);
  };

  const handleDeletePerson = (person: DeliveryPerson) => {
    toastConfirm(t('confirmDelete'), () => deleteMutation.mutate(person.id), {
      description: t('deleteDeliveryPersonConfirm'),
      confirmLabel: t('delete'),
    });
  };

  const getFloatingActions = () => {
    const actions: any[] = [];
    if (selectedPersons.length === 1) {
      const person = deliveryPersons.find((p: DeliveryPerson) => p.id === selectedPersons[0]);
      actions.push({
        id: 'edit',
        label: t('edit'),
        icon: <Edit2 style={{ width: '1rem', height: '1rem' }} />,
        onClick: () => {
          if (person) handleEditPerson(person);
        },
      });
    }
    actions.push({
      id: 'delete',
      label: t('delete'),
      icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
      onClick: () => {
        if (selectedPersons.length === 1) {
          const person = deliveryPersons.find((p: DeliveryPerson) => p.id === selectedPersons[0]);
          if (person) handleDeletePerson(person);
        } else {
          toastConfirm(`${t('delete')} ${selectedPersons.length} livreurs?`, () => {
            selectedPersons.forEach((id) => deleteMutation.mutate(id));
            clearSelection();
          });
        }
      },
      variant: 'danger' as const,
    });
    return actions;
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Truck}
          title={t('deliveryPersons')}
          subtitle={t('manageDeliveryPersonnel')}
          actions={
            <Button
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label="Nouveau livreur"
              onClick={openCreateModal}
            />
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {/* Search */}
          <div className="page-quick-search">
            <Search
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
              id="search-delivery-persons"
              type="text"
              placeholder={t('searchDeliveryPersons')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                paddingRight: searchInput ? '2.5rem' : '0.875rem',
              }}
              aria-label={t('searchDeliveryPersons')}
            />
            {searchInput && (
              <Button
                text
                rounded
                onClick={() => setSearchInput('')}
                icon={<X style={{ width: '1rem', height: '1rem' }} />}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  zIndex: 10,
                }}
              />
            )}
          </div>

          {/* Delivery Persons List */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div className="responsive-table-mobile">
              <MobileList
                items={deliveryPersons}
                keyExtractor={(p: DeliveryPerson) => p.id}
                loading={isLoading}
                totalCount={deliveryPersons.length}
                countLabel="livreurs"
                emptyMessage="Aucun livreur trouvé"
                config={{
                  topLeft: (p: DeliveryPerson) => p.name,
                  topRight: (p: DeliveryPerson) => p.phoneNumber,
                  bottomLeft: (p: DeliveryPerson) => p.email || '',
                  bottomRight: (p: DeliveryPerson) => (
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        ...(p.isActive
                          ? { background: '#d1fae5', color: '#047857' }
                          : { background: '#f1f5f9', color: '#475569' }),
                      }}
                    >
                      {p.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  ),
                }}
              />
            </div>
            <div className="responsive-table-desktop">
              {isLoading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: '4rem',
                    paddingBottom: '4rem',
                  }}
                >
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      border: '4px solid #235ae4',
                      borderTopColor: 'transparent',
                      borderRadius: '9999px',
                    }}
                    className="animate-spin"
                  ></div>
                </div>
              ) : deliveryPersons.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <EmptyState icon={Truck} title={t('noDeliveryPersonsFound') as string} />
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <DataTable
                    className="dp-datatable"
                    value={deliveryPersons}
                    selection={deliveryPersons.filter((p: DeliveryPerson) =>
                      selectedPersons.includes(p.id),
                    )}
                    onSelectionChange={(e) =>
                      setSelectedPersons((e.value as DeliveryPerson[]).map((p) => p.id))
                    }
                    selectionMode="checkbox"
                    dataKey="id"
                    paginator
                    paginatorPosition="top"
                    rows={25}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    removableSort
                    emptyMessage={
                      <EmptyState
                        icon={Truck}
                        title={t('noDeliveryPersonsFound') as string}
                        compact
                      />
                    }
                    paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                    currentPageReportTemplate={t('pageReportTemplate')}
                    onRowClick={(e) => openEditModal(e.data as DeliveryPerson)}
                    rowClassName={() => 'cursor-pointer'}
                  >
                    <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                    <Column
                      field="name"
                      header={t('name')}
                      sortable
                      body={(row: DeliveryPerson) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Truck style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                            {row.name}
                          </span>
                        </div>
                      )}
                    />
                    <Column
                      field="phoneNumber"
                      header={t('phone')}
                      sortable
                      body={(row: DeliveryPerson) => (
                        <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                          {row.phoneNumber}
                        </span>
                      )}
                    />
                    <Column
                      field="email"
                      header={t('email')}
                      sortable
                      body={(row: DeliveryPerson) => (
                        <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                          {row.email || '-'}
                        </span>
                      )}
                    />
                    <Column
                      field="isActive"
                      header={t('status')}
                      body={(row: DeliveryPerson) => (
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            ...(row.isActive
                              ? { background: '#d1fae5', color: '#047857' }
                              : { background: '#f1f5f9', color: '#475569' }),
                          }}
                        >
                          {row.isActive ? t('active') : t('inactive')}
                        </span>
                      )}
                    />
                  </DataTable>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedPersons.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={
          selectedPersons.length === deliveryPersons.length && deliveryPersons.length > 0
        }
        totalCount={deliveryPersons.length}
        itemLabel="livreur"
        actions={getFloatingActions()}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={editingPerson ? t('editDeliveryPersonTitle') : t('addDeliveryPersonTitle')}
        size="md"
        footer={
          <div className="flex gap-2">
            <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
            <Button
              form="delivery-modal-form"
              type="submit"
              label={editingPerson ? t('update') : t('create')}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        }
      >
        <form
          id="delivery-modal-form"
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
                style={{ width: '100%' }}
                required
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
                {t('phoneNumber')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <InputText
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="06XXXXXXXX"
                style={{ width: '100%' }}
                required
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
                {t('email')}
              </label>
              <InputText
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                {editingPerson ? (
                  <>
                    {t('password')}{' '}
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (Laisser vide pour ne pas modifier)
                    </span>
                  </>
                ) : (
                  t('password')
                )}
                {!editingPerson && <span style={{ color: '#ef4444' }}> *</span>}
              </label>
              <InputText
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingPerson}
                placeholder={editingPerson ? t('newPasswordOptional') : t('minCharacters')}
                autoComplete="new-password"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Checkbox
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.checked ?? false })}
                />
                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('active')}</label>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
