import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { KpiCard, KpiGrid } from '../components/KpiCard';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Truck, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Phone, Mail } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonService } from '../modules/delivery';
import { DeliveryPerson } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toastCreated, toastUpdated, toastDeleted, toastError, toastConfirm } from '../services/toast.service';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { Modal } from '../components/Modal';

export default function DeliveryPersons() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
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
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
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
      toastError(`${t('failedToDelete')}: ${error.message}`);
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
        email: formData.email || undefined,
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
        email: formData.email || ''
      });
    }
  };

  const toggleSelectPerson = (id: number) => {
    setSelectedPersons(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPersons.length === filteredPersons.length) {
      setSelectedPersons([]);
    } else {
      setSelectedPersons(filteredPersons.map((p: DeliveryPerson) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedPersons([]);
  };

  // Filter delivery persons by search term
  const filteredPersons = deliveryPersons.filter((person: DeliveryPerson) =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.phoneNumber.includes(searchTerm) ||
    person.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewPerson = (person: DeliveryPerson) => {
    // Navigate to view page if exists
    console.log('View person:', person.id);
  };

  const handleEditPerson = (person: DeliveryPerson) => {
    openEditModal(person);
  };

  const handleDeletePerson = (person: DeliveryPerson) => {
    toastConfirm(
      t('confirmDelete'),
      () => deleteMutation.mutate(person.id),
      { description: t('deleteDeliveryPersonConfirm'), confirmLabel: t('delete') }
    );
  };

  const getFloatingActions = () => {
    if (selectedPersons.length === 1) {
      const person = deliveryPersons.find((p: DeliveryPerson) => p.id === selectedPersons[0]);
      return [
        {
          id: 'view',
          label: t('view'),
          icon: <Eye style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => {
            if (person) {
              handleViewPerson(person);
            }
          },
        },
        {
          id: 'edit',
          label: t('edit'),
          icon: <Edit2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => {
            if (person) {
              handleEditPerson(person);
            }
          },
        },
        {
          id: 'delete',
          label: t('delete'),
          icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => {
            if (person) {
              handleDeletePerson(person);
            }
          },
          variant: 'danger' as const,
        },
      ];
    }
    return [];
  };

  const tabs = [
    { key: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { key: 'list', label: t('deliveryPersonList'), icon: List },
  ];

  // Calculate statistics
  const totalPersons = deliveryPersons.length;
  const activePersons = deliveryPersons.filter((p: DeliveryPerson) => p.isActive).length;
  const inactivePersons = deliveryPersons.filter((p: DeliveryPerson) => !p.isActive).length;

  // Recent delivery persons
  const recentPersons = [...deliveryPersons]
    .sort((a: DeliveryPerson, b: DeliveryPerson) => (b.id || 0) - (a.id || 0))
    .slice(0, 5);

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Truck}
          title={t('deliveryPersons')}
          subtitle={t('manageDeliveryPersonnel')}
          actions={
            <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label="Nouveau livreur" onClick={openCreateModal} />
          }
        />

        {/* Tabs Navigation */}
        <div style={{ background: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  text={activeTab !== tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={activeTab === tab.key
                    ? { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, background: '#f59e0b', color: '#ffffff', boxShadow: '0 4px 6px -1px rgba(245,158,11,0.25)' }
                    : { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569', background: 'transparent' }}
                  icon={<Icon style={{ width: '1rem', height: '1rem' }} />}
                  label={tab.label}
                />
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '0.75rem', paddingTop: '0.5rem' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Stats Cards */}
                <KpiGrid count={3}>
                  <KpiCard label="Livreurs totaux" value={totalPersons} icon={Truck} color="blue" />
                  <KpiCard label="Livreurs actifs" value={activePersons} icon={CheckCircle} color="emerald" />
                  <KpiCard label="Livreurs inactifs" value={inactivePersons} icon={Clock} color="amber" />
                </KpiGrid>

                {/* Dashboard Grid - Recent Delivery Persons */}
                <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Les 5 derniers livreurs ajoutés</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem' }}>Nom</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem' }}>Téléphone</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', width: '6rem', textAlign: 'right' }}>Statut</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentPersons.map((person) => (
                      <div key={person.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Truck style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
                          <Button
                            link
                            label={person.name}
                            onClick={() => handleViewPerson(person)}
                            style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', padding: 0 }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flex: 1, marginLeft: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem' }}>{person.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem' }}>{person.phoneNumber}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '6rem', textAlign: 'right', color: person.isActive ? '#059669' : '#475569' }}>
                            {person.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {recentPersons.length === 0 && (
                      <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', paddingTop: '1rem', paddingBottom: '1rem' }}>Aucun livreur trouvé</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  {/* Search */}
                  <span style={{ position: 'relative', display: 'block', width: '24rem' }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
                    <InputText
                      id="search-delivery-persons"
                      type="text"
                      placeholder={t('searchDeliveryPersons')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', paddingLeft: '2.5rem' }}
                      aria-label={t('searchDeliveryPersons')}
                    />
                    {searchTerm && (
                      <Button
                        text
                        rounded
                        onClick={() => setSearchTerm('')}
                        icon={<X style={{ width: '1rem', height: '1rem' }} />}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 10 }}
                      />
                    )}
                  </span>
                </div>

                {/* Delivery Persons List */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
                      <div style={{ width: '2.5rem', height: '2.5rem', border: '4px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '9999px' }} className="animate-spin"></div>
                    </div>
                  ) : filteredPersons.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem', background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <Truck style={{ width: '5rem', height: '5rem', color: '#cbd5e1', display: 'block', margin: '0 auto', marginBottom: '1rem' }} />
                      <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>{t('noDeliveryPersonsFound')}</p>
                    </div>
                  ) : (
                    <>
                      <style>{`
                        .dp-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                        .dp-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
                        .dp-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
                        .dp-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
                        .dp-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: transparent; padding: 0.125rem 0.5rem; border-radius: 0; }
                        .dp-datatable .p-paginator .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
                      `}</style>
                      <DataTable
                        className="dp-datatable"
                        value={filteredPersons}
                        selection={filteredPersons.filter((p: DeliveryPerson) => selectedPersons.includes(p.id))}
                        onSelectionChange={(e) => setSelectedPersons((e.value as DeliveryPerson[]).map((p) => p.id))}
                        selectionMode="checkbox"
                        dataKey="id"
                        paginator
                        paginatorPosition="top"
                        rows={25}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        removableSort
                        emptyMessage={<div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('noDeliveryPersonsFound')}</div>}
                        paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                currentPageReportTemplate="{first}-{last} of {totalRecords}"
                      >
                        <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                        <Column field="name" header="Nom" sortable body={(row: DeliveryPerson) => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{row.name}</span>
                          </div>
                        )} />
                        <Column field="phoneNumber" header="Téléphone" sortable body={(row: DeliveryPerson) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.phoneNumber}</span>} />
                        <Column field="email" header="Email" sortable body={(row: DeliveryPerson) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.email || '-'}</span>} />
                        <Column field="isActive" header="Statut" body={(row: DeliveryPerson) => (
                          <span style={{ display: 'inline-flex', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...(row.isActive ? { background: '#d1fae5', color: '#047857' } : { background: '#f1f5f9', color: '#475569' }) }}>
                            {row.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        )} />
                        <Column header="Actions" headerStyle={{ textAlign: 'right' }} body={(row: DeliveryPerson) => (
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                            <Button text rounded severity="info" onClick={(e) => { e.stopPropagation(); handleViewPerson(row); }} icon={<Eye style={{ width: '1rem', height: '1rem' }} />} style={{ padding: '0.375rem' }} />
                            <Button text rounded severity="warning" onClick={(e) => { e.stopPropagation(); handleEditPerson(row); }} icon={<Edit2 style={{ width: '1rem', height: '1rem' }} />} style={{ padding: '0.375rem' }} />
                            <Button text rounded severity="danger" onClick={(e) => { e.stopPropagation(); handleDeletePerson(row); }} icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />} style={{ padding: '0.375rem' }} />
                          </div>
                        )} />
                      </DataTable>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedPersons.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedPersons.length === filteredPersons.length && filteredPersons.length > 0}
        totalCount={filteredPersons.length}
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
            <Button
              form="delivery-modal-form"
              type="submit"
              label={editingPerson ? t('update') : t('create')}
              loading={createMutation.isPending || updateMutation.isPending}
            />
            <Button type="button" label={t('cancel')} onClick={closeModal} outlined />
          </div>
        }
      >
        <form id="delivery-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('name')} <span style={{ color: '#ef4444' }}>*</span></label>
              <InputText
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('phoneNumber')} <span style={{ color: '#ef4444' }}>*</span></label>
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
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('email')}</label>
              <InputText
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                {editingPerson ? <>{t('password')} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Laisser vide pour ne pas modifier)</span></> : t('password')}
                {!editingPerson && <span style={{ color: '#ef4444' }}> *</span>}
              </label>
              <InputText
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingPerson}
                placeholder={editingPerson ? t('newPasswordOptional') : t('minCharacters')}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Checkbox checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.checked ?? false })} />
                <label style={{ fontSize: '0.875rem', color: '#334155' }}>{t('active')}</label>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
