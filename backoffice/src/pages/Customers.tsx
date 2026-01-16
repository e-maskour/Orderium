import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { Partner } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Users, Edit2, Search, X, Grid3x3, List, Phone, Mail, MapPin, CheckSquare, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { PartnerForm } from '../components/PartnerForm';
import { CreatePartnerDTO } from '../modules/partners/partners.interface';

export default function Customers() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: partnersService.getAll,
  });

  const customers = data?.partners?.filter((p: Partner) => p.isCustomer) || [];

  const createMutation = useMutation({
    mutationFn: (data: CreatePartnerDTO) => partnersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('customerCreated'));
      setShowPartnerForm(false);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToCreate')}: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Partner> }) =>
      partnersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('customerUpdated'));
      setShowPartnerForm(false);
      setEditingPartner(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUpdate')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partnersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(t('customerDeleted'));
      setShowDeleteConfirm(false);
      setDeletingPartnerId(null);
      setSelectedCustomers([]);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToDelete')}: ${error.message}`);
    },
  });

  const toggleSelectCustomer = (id: number) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c: Partner) => c.id));
    }
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter((customer: Partner) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phoneNumber?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreatePartner = () => {
    setEditingPartner(null);
    setShowPartnerForm(true);
  };

  const handleEditPartner = (customer: Partner) => {
    setEditingPartner(customer);
    setShowPartnerForm(true);
  };

  const handleFormSubmit = (data: CreatePartnerDTO) => {
    if (editingPartner) {
      // Update existing partner
      updateMutation.mutate({ id: editingPartner.id, data });
    } else {
      // Create new partner
      createMutation.mutate(data);
    }
  };

  const handleFormCancel = () => {
    setShowPartnerForm(false);
    setEditingPartner(null);
  };

  const handleDeletePartner = (customer: Partner) => {
    setDeletingPartnerId(customer.id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deletingPartnerId) {
      deleteMutation.mutate(deletingPartnerId);
    }
  };

  const getFloatingActions = () => {
    if (selectedCustomers.length === 1) {
      const customer = customers.find((c: Partner) => c.id === selectedCustomers[0]);
      return [
        {
          id: 'edit',
          label: t('edit'),
          onClick: () => {
            if (customer) {
              handleEditPartner(customer);
            }
          },
        },
        {
          id: 'delete',
          label: t('delete'),
          onClick: () => {
            if (customer) {
              handleDeletePartner(customer);
            }
          },
        },
      ];
    }
    return [];
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-slate-500">{t('loading')}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex-shrink-0">
          <PageHeader
            icon={Users}
            title={t('customers')}
            subtitle={t('manageCustomers')}
          />
        </div>

        {/* Toolbar: View Toggle, Search, Add Button */}
        <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
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

          <div className="flex items-center gap-3 flex-1 sm:flex-none w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('searchCustomers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-96 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
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

            {/* Add Customer Button */}
            <button
              onClick={handleCreatePartner}
              className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('addCustomer')}
            </button>
          </div>
        </div>

        {/* Customers Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {filteredCustomers.length === 0 ? (
            <div className="flex items-center justify-center flex-1 p-16">
              <div className="text-center">
                <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-800 font-semibold text-lg">{t('noCustomersFound')}</p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'card' ? (
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {filteredCustomers.map((customer: Partner) => {
                      const isSelected = selectedCustomers.includes(customer.id);

                      return (
                        <div
                          key={customer.id}
                          onClick={() => toggleSelectCustomer(customer.id)}
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
                              customer.isEnabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {customer.isEnabled ? t('active') : t('inactive')}
                            </span>
                          </div>

                          {/* Card Content */}
                          <div className="p-3 space-y-2">
                            {/* Header: Icon, Name */}
                            <div className="flex items-start justify-between gap-2 mt-8">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Users className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1" title={customer.name}>
                                    {customer.name}
                                  </h3>
                                </div>
                              </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-1.5">
                              {/* Phone */}
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{customer.phoneNumber || '-'}</span>
                              </div>

                              {/* Email */}
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{customer.email || '-'}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPartner(customer);
                                }}
                                className="flex-1 px-2 py-1.5 bg-slate-50 text-slate-700 rounded hover:bg-slate-100 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                              >
                                <Edit2 className="w-3 h-3" />
                                {t('edit')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePartner(customer);
                                }}
                                className="px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-xs font-medium"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 border border-slate-200/60 rounded-lg bg-white">
                  {filteredCustomers.map((customer: Partner) => {

                    return (
                      <div
                        key={customer.id}
                        onClick={() => toggleSelectCustomer(customer.id)}
                        className={`bg-white rounded-lg shadow-sm border px-4 py-3 hover:shadow-md transition-all cursor-pointer ${
                          selectedCustomers.includes(customer.id)
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
                                toggleSelectCustomer(customer.id);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                selectedCustomers.includes(customer.id)
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'bg-white border-slate-300 hover:border-amber-400'
                              }`}
                            >
                              {selectedCustomers.includes(customer.id) && (
                                <CheckSquare className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>

                          {/* Icon */}
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-white" />
                          </div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                              <p className="text-sm font-semibold text-slate-800 truncate">{customer.name}</p>
                            </div>
                          </div>

                          {/* Phone */}
                          <div className="w-32">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                            <p className="text-sm text-slate-600">{customer.phoneNumber || '-'}</p>
                          </div>

                          {/* Email */}
                          <div className="w-48">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('email')}</p>
                              <p className="text-sm text-slate-600 truncate">{customer.email || '-'}</p>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="w-24 flex flex-col items-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              customer.isEnabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.isEnabled ? t('active') : t('inactive')}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="w-20 flex justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPartner(customer);
                              }}
                              className="p-1.5 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
                              title={t('edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePartner(customer);
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </>
            )}
          </div>

        {/* Floating Action Bar */}
        {selectedCustomers.length > 0 && (
          <FloatingActionBar
            selectedCount={selectedCustomers.length}
            onSelectAll={toggleSelectAll}
            onClearSelection={clearSelection}
            actions={getFloatingActions()}
            isAllSelected={selectedCustomers.length === filteredCustomers.length}
            totalCount={filteredCustomers.length}
          />
        )}

        {/* Partner Form Modal */}
        {showPartnerForm && (
          <PartnerForm
            partner={editingPartner}
            type="customer"
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('confirmDelete')}</h3>
              <p className="text-slate-600 mb-6">{t('deletePartnerConfirmation')}</p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? t('deleting') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
