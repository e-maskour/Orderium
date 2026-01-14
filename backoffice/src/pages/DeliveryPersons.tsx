import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonService } from '../services/api';
import { DeliveryPerson } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { UserPlus, Edit2, Trash2, Truck, Search, X, Grid3x3, List, CheckSquare, Phone, Mail, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { FloatingActionBar } from '../components/FloatingActionBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function DeliveryPersons() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersons, setSelectedPersons] = useState<number[]>([]);
  const [editingValues, setEditingValues] = useState<{
    Name: string;
    PhoneNumber: string;
    Email: string;
  }>({ Name: '', PhoneNumber: '', Email: '' });
  const [formData, setFormData] = useState({
    Name: '',
    PhoneNumber: '',
    Email: '',
    Password: '',
    IsActive: true,
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
      toast.success(t('deliveryPersonCreated'));
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToCreate')}: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DeliveryPerson> }) =>
      deliveryPersonService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success(t('deliveryPersonUpdated'));
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUpdate')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deliveryPersonService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPersons'] });
      toast.success(t('deliveryPersonDeleted'));
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToDelete')}: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ Name: '', PhoneNumber: '', Email: '', Password: '', IsActive: true });
    setShowForm(false);
    setEditingId(null);
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
      setSelectedPersons(filteredPersons.map((p: DeliveryPerson) => p.Id));
    }
  };

  const clearSelection = () => {
    setSelectedPersons([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(t('confirmDelete'))) {
      selectedPersons.forEach(id => {
        deleteMutation.mutate(id);
      });
      clearSelection();
    }
  };

  // Filter delivery persons by search term
  const filteredPersons = deliveryPersons.filter((person: DeliveryPerson) =>
    person.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.PhoneNumber.includes(searchTerm) ||
    person.Email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startInlineEdit = (person: DeliveryPerson) => {
    setEditingId(person.Id);
    setEditingValues({
      Name: person.Name,
      PhoneNumber: person.PhoneNumber,
      Email: person.Email || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditingValues({ Name: '', PhoneNumber: '', Email: '' });
  };

  const saveInlineEdit = (person: DeliveryPerson) => {
    const updatedData = {
      Name: editingValues.Name,
      PhoneNumber: editingValues.PhoneNumber,
      Email: editingValues.Email || undefined,
      IsActive: person.IsActive,
    };
    
    updateMutation.mutate({ id: person.Id, data: updatedData });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { Password, Email, ...updateData } = formData;
      updateMutation.mutate({ 
        id: editingId, 
        data: { 
          ...updateData, 
          Email: Email || undefined 
        } 
      });
    } else {
      if (!formData.Password) {
        toast.error(t('passwordRequired'));
        return;
      }
      createMutation.mutate({
        ...formData,
        Email: formData.Email || undefined
      });
    }
  };

  const handleEdit = (person: DeliveryPerson) => {
    setFormData({
      Name: person.Name,
      PhoneNumber: person.PhoneNumber,
      Email: person.Email || '',
      Password: '',
      IsActive: person.IsActive,
    });
    setEditingId(person.Id);
    setShowForm(true);
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search and Add Button */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('deliveryPersons')}</h1>
            <p className="text-slate-600">{t('manageDeliveryPersonnel')}</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
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
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
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
        </div>

        {/* Add New Person Form */}
        {showForm && (
          <div className="bg-white shadow-sm rounded-2xl p-6 mb-6 border border-slate-200/60">
            <h2 className="text-lg font-bold mb-4 text-slate-800">
              {editingId ? t('edit') : t('add')} {t('deliveryPerson')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{t('name')} *</label>
                  <input
                    type="text"
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{t('phoneNumber')} *</label>
                  <input
                    type="tel"
                    value={formData.PhoneNumber}
                    onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                    placeholder="06XXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">{t('email')}</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">{t('password')} *</label>
                    <input
                      type="password"
                      value={formData.Password}
                      onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700"
                      required={!editingId}
                      placeholder={t('minSixCharacters')}
                    />
                  </div>
                )}
                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.IsActive}
                      onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 mr-3 rtl:ml-3 rtl:mr-0"
                    />
                    <span className="text-sm font-semibold text-slate-700">{t('active')}</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
                >
                  {editingId ? t('update') : t('create')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-medium transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delivery Persons Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPersons.length === 0 ? (
            <div className="flex items-center justify-center flex-1 p-16">
              <div className="text-center">
                <Truck className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-800 font-semibold text-lg">{t('noDeliveryPersonsFound')}</p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {filteredPersons.map((person: DeliveryPerson) => {
                  const isEditing = editingId === person.Id;
                  return (
                    <div
                      key={person.Id}
                      onClick={() => !isEditing && toggleSelectPerson(person.Id)}
                      className={`bg-white rounded-lg shadow-sm border px-4 py-3 hover:shadow-md transition-all ${!isEditing && 'cursor-pointer'} ${
                        selectedPersons.includes(person.Id)
                          ? 'border-amber-500 ring-2 ring-amber-500/20'
                          : 'border-slate-200/60 hover:border-slate-300/60'
                      }`}
                    >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div className="w-12 flex items-center justify-center">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectPerson(person.Id);
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            selectedPersons.includes(person.Id)
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-slate-300 hover:border-amber-400'
                          }`}
                        >
                          {selectedPersons.includes(person.Id) && (
                            <CheckSquare className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      {/* Icon */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5 text-white" />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingValues.Name}
                            onChange={(e) => setEditingValues({ ...editingValues, Name: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 truncate">{person.Name}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="w-40">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editingValues.PhoneNumber}
                            onChange={(e) => setEditingValues({ ...editingValues, PhoneNumber: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                          />
                        ) : (
                          <p className="text-sm text-slate-700 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {person.PhoneNumber}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="w-48 hidden lg:block">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('email')}</p>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editingValues.Email}
                            onChange={(e) => setEditingValues({ ...editingValues, Email: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                          />
                        ) : (
                          <p className="text-sm text-slate-600 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {person.Email || '-'}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="w-24 flex flex-col items-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          person.IsActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {person.IsActive ? t('active') : t('inactive')}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="w-32 flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveInlineEdit(person);
                              }}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title={t('save')}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelInlineEdit();
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title={t('cancel')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startInlineEdit(person);
                            }}
                            className="p-1.5 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
                            title={t('edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredPersons.map((person: DeliveryPerson) => {
                  const isEditing = editingId === person.Id;
                  const isSelected = selectedPersons.includes(person.Id);
                  return (
                    <div
                      key={person.Id}
                      onClick={() => !isEditing && toggleSelectPerson(person.Id)}
                      className={`group relative bg-white rounded-lg overflow-hidden transition-all ${
                        isEditing 
                          ? 'ring-2 ring-amber-400 shadow-md cursor-default' 
                          : isSelected
                            ? 'ring-2 ring-amber-500 shadow-md cursor-pointer'
                            : 'shadow-sm hover:shadow-md cursor-pointer border border-slate-200'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      {!isEditing && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-amber-500 border-amber-500 text-white' 
                              : 'bg-white border-slate-300'
                          }`}>
                            {isSelected && <CheckSquare className="w-4 h-4" />}
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          person.IsActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {person.IsActive ? t('active') : t('inactive')}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="p-3 space-y-2">
                        {/* Header: Icon, Name and Status */}
                        <div className="flex items-start justify-between gap-2 mt-8">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Truck className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValues.Name}
                                  onChange={(e) => setEditingValues({ ...editingValues, Name: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1.5 text-sm border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none font-semibold"
                                  autoFocus
                                />
                              ) : (
                                <h3 className="text-sm font-semibold text-slate-900 line-clamp-1" title={person.Name}>
                                  {person.Name}
                                </h3>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5">
                          {/* Phone */}
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {isEditing ? (
                              <input
                                type="tel"
                                value={editingValues.PhoneNumber}
                                onChange={(e) => setEditingValues({ ...editingValues, PhoneNumber: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-1.5 py-0.5 text-xs border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none"
                              />
                            ) : (
                              <span className="truncate">{person.PhoneNumber}</span>
                            )}
                          </div>

                          {/* Email */}
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {isEditing ? (
                              <input
                                type="email"
                                value={editingValues.Email}
                                onChange={(e) => setEditingValues({ ...editingValues, Email: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-1.5 py-0.5 text-xs border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none"
                              />
                            ) : (
                              <span className="truncate">{person.Email || '-'}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {isEditing && (
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveInlineEdit(person);
                              }}
                              className="flex-1 px-2 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                            >
                                <CheckSquare className="w-3 h-3" />
                              {t('save')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelInlineEdit();
                              }}
                              className="px-2 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors text-xs font-medium"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {!isEditing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startInlineEdit(person);
                            }}
                            className="w-full mt-1 px-2 py-1.5 bg-slate-50 text-slate-700 rounded hover:bg-slate-100 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                          >
                            <Edit2 className="w-3 h-3" />
                            {t('edit')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedPersons.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedPersons.length === filteredPersons.length}
        totalCount={filteredPersons.length}
        actions={[
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: handleBulkDelete,
            variant: 'danger' as const,
          },
        ]}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDeliveryPerson')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDeliveryPersonConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
