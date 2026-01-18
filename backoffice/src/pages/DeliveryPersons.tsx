import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Truck, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Grid3x3, List as ListIcon, Phone, Mail, CheckSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonService } from '../modules/delivery';
import { DeliveryPerson } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { FloatingActionBar } from '../components/FloatingActionBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';

export default function DeliveryPersons() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersons, setSelectedPersons] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPersonId, setDeletingPersonId] = useState<number | null>(null);
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
      toast.success('Livreur créé avec succès');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => deliveryPersonService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success('Livreur modifié avec succès');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deliveryPersonService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success('Livreur supprimé');
      setShowDeleteConfirm(false);
      setDeletingPersonId(null);
      setSelectedPersons([]);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToDelete')}: ${error.message}`);
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
        toast.error('Le mot de passe est requis');
        return;
      }
      createMutation.mutate({
        ...formData,
        email: formData.email || undefined
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
    setDeletingPersonId(person.id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deletingPersonId) {
      deleteMutation.mutate(deletingPersonId);
    }
  };

  const getFloatingActions = () => {
    if (selectedPersons.length === 1) {
      const person = deliveryPersons.find((p: DeliveryPerson) => p.id === selectedPersons[0]);
      return [
        {
          id: 'view',
          label: 'Voir',
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
    { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'list', label: 'Liste des livreurs', icon: List },
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
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau livreur
            </button>
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
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
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'card'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'list'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ListIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Rechercher livreurs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-96 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                              className={`group relative bg-white rounded-lg overflow-hidden transition-all ${
                                isSelected
                                  ? 'ring-2 ring-amber-500 shadow-md cursor-pointer'
                                  : 'shadow-sm hover:shadow-md cursor-pointer border border-slate-200'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <div className="absolute top-2 left-2 z-10">
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-amber-500 border-amber-500 text-white' 
                                    : 'bg-white border-slate-300'
                                }`}>
                                  {isSelected && <CheckSquare className="w-4 h-4" />}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="absolute top-2 right-2 z-10">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                  person.isActive
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
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedPersons.length === filteredPersons.length && filteredPersons.length > 0}
                                  onChange={toggleSelectAll}
                                  className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                                />
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
                                className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                                  selectedPersons.includes(person.id) ? 'bg-amber-50' : ''
                                }`}
                                onClick={() => toggleSelectPerson(person.id)}
                              >
                                <td className="py-3 px-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedPersons.includes(person.id)}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                                  />
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
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      person.isActive
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
                                      title="Voir"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPerson(person);
                                      }}
                                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                      title="Modifier"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePerson(person);
                                      }}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Supprimer"
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

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingPersonId(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le livreur"
        message="Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible."
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={editingPerson ? 'Modifier le livreur' : 'Ajouter un livreur'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">{t('name')} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">{t('phoneNumber')} *</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                placeholder="06XXXXXXXX"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">{t('email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                {t('password')} {!editingPerson && '*'}
                {editingPerson && <span className="text-xs text-slate-500">(Laisser vide pour ne pas modifier)</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                required={!editingPerson}
                placeholder={editingPerson ? 'Nouveau mot de passe (optionnel)' : 'Min 6 caractères'}
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 mr-3"
                />
                <span className="text-sm font-semibold text-slate-700">{t('active')}</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? (editingPerson ? 'Modification...' : 'Création...') 
                : (editingPerson ? 'Modifier' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-all"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
