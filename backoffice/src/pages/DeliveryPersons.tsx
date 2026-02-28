import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Truck, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Grid3x3, List as ListIcon, Phone, Mail, Check } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
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
          icon: <Eye className="w-4 h-4" />,
          onClick: () => {
            if (person) {
              handleViewPerson(person);
            }
          },
        },
        {
          id: 'edit',
          label: t('edit'),
          icon: <Edit2 className="w-4 h-4" />,
          onClick: () => {
            if (person) {
              handleEditPerson(person);
            }
          },
        },
        {
          id: 'delete',
          label: t('delete'),
          icon: <Trash2 className="w-4 h-4" />,
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
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Truck}
          title={t('deliveryPersons')}
          subtitle={t('manageDeliveryPersonnel')}
          actions={
            <Button onClick={openCreateModal} leadingIcon={Plus}>
              Nouveau livreur
            </Button>
          }
        />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 p-2 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-3 pt-2">
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-1">{totalPersons}</h3>
                    <p className="text-sm text-blue-700">Livreurs totaux</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">Actifs</span>
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-900 mb-1">{activePersons}</h3>
                    <p className="text-sm text-emerald-700">Livreurs actifs</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">Inactifs</span>
                    </div>
                    <h3 className="text-2xl font-bold text-amber-900 mb-1">{inactivePersons}</h3>
                    <p className="text-sm text-amber-700">Livreurs inactifs</p>
                  </div>
                </div>

                {/* Dashboard Grid - Recent Delivery Persons */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Les 5 derniers livreurs ajoutés</h3>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 w-32">Nom</span>
                      <span className="text-xs text-slate-500 w-32">Téléphone</span>
                      <span className="text-xs text-slate-500 w-24 text-right">Statut</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {recentPersons.map((person) => (
                      <div key={person.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-500" />
                          <button
                            onClick={() => handleViewPerson(person)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {person.name}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 flex-1 ml-4">
                          <span className="text-xs text-slate-500 w-32">{person.name}</span>
                          <span className="text-xs text-slate-500 w-32">{person.phoneNumber}</span>
                          <span className={`text-xs font-semibold w-24 text-right ${person.isActive ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {person.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {recentPersons.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun livreur trouvé</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-1">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'card'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <ListIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Input
                      id="search-delivery-persons"
                      type="text"
                      placeholder={t('searchDeliveryPersons')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      leadingIcon={Search}
                      className="w-96"
                      aria-label={t('searchDeliveryPersons')}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery Persons List */}
                <div className="border-t border-slate-200 pt-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : filteredPersons.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                      <Truck className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-800 font-semibold text-lg">{t('noDeliveryPersonsFound')}</p>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'card' ? (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {filteredPersons.map((person: DeliveryPerson) => {
                            const isSelected = selectedPersons.includes(person.id);

                            return (
                              <div
                                key={person.id}
                                onClick={() => toggleSelectPerson(person.id)}
                                className={`group relative bg-white rounded-lg overflow-hidden transition-all ${isSelected
                                  ? 'ring-2 ring-amber-500 shadow-md cursor-pointer'
                                  : 'shadow-sm hover:shadow-md cursor-pointer border border-slate-200'
                                  }`}
                              >
                                {/* Selection Checkbox */}
                                <div className="absolute top-2 left-2 z-10">
                                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'bg-white border-slate-300'
                                    }`}>
                                    {isSelected && <Check className="w-4 h-4" />}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className="absolute top-2 right-2 z-10">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${person.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {person.isActive ? t('active') : t('inactive')}
                                  </span>
                                </div>

                                {/* Card Content */}
                                <div className="p-3 space-y-2">
                                  {/* Header */}
                                  <div className="flex items-start justify-between gap-2 mt-8">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-900 line-clamp-1" title={person.name}>
                                          {person.name}
                                        </h3>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Contact Info */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      <span className="truncate">{person.phoneNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      <span className="truncate">{person.email || '-'}</span>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPerson(person);
                                      }}
                                      className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      Voir
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPerson(person);
                                      }}
                                      className="flex-1 px-2 py-1.5 bg-slate-50 text-slate-700 rounded hover:bg-slate-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Modifier
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="py-3 px-4 text-left">
                                    <div
                                      onClick={toggleSelectAll}
                                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${selectedPersons.length === filteredPersons.length && filteredPersons.length > 0
                                        ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-white border-slate-300'
                                        }`}
                                    >
                                      {selectedPersons.length === filteredPersons.length && filteredPersons.length > 0 && <Check className="w-4 h-4" />}
                                    </div>
                                  </th>
                                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Nom</th>
                                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Téléphone</th>
                                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                                  <th className="py-3 px-4 text-center text-xs font-semibold text-slate-600 uppercase">Statut</th>
                                  <th className="py-3 px-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredPersons.map((person: DeliveryPerson) => (
                                  <tr
                                    key={person.id}
                                    className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedPersons.includes(person.id) ? 'bg-amber-50' : ''
                                      }`}
                                    onClick={() => toggleSelectPerson(person.id)}
                                  >
                                    <td className="py-3 px-4">
                                      {/* Checkbox is now handled above */}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium text-slate-800">{person.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{person.phoneNumber}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{person.email || '-'}</td>
                                    <td className="py-3 px-4">
                                      <div className="flex justify-center">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${person.isActive
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-slate-100 text-slate-600'
                                          }`}>
                                          {person.isActive ? 'Actif' : 'Inactif'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewPerson(person);
                                          }}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title={t('seeDetails')}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditPerson(person);
                                          }}
                                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                          title={t('edit')}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePerson(person);
                                          }}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title={t('delete')}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
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
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('name')} required>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
            </FormField>
            <FormField label={t('phoneNumber')} required>
              <Input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="06XXXXXXXX"
                fullWidth
                required
              />
            </FormField>
            <FormField label={t('email')}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />
            </FormField>
            <FormField
              label={editingPerson ? <>{t('password')} <span className="text-xs text-slate-500">(Laisser vide pour ne pas modifier)</span></> : t('password')}
              required={!editingPerson}
            >
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingPerson}
                placeholder={editingPerson ? t('newPasswordOptional') : t('minCharacters')}
                fullWidth
              />
            </FormField>
            <div className="flex items-center pt-6">
              <Checkbox
                checked={formData.isActive}
                onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
                label={t('active')}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              loadingText={editingPerson ? t('updating') : t('creatingDeliveryPerson')}
            >
              {editingPerson ? t('update') : t('create')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
