import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/api';
import { Customer } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Users, Edit2, Search, X, Grid3x3, List, Phone, Mail, MapPin, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { FloatingActionBar } from '../components/FloatingActionBar';

export default function Customers() {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [editingValues, setEditingValues] = useState<{
    Name: string;
    PhoneNumber: string;
    Email: string;
    Address: string;
    City: string;
  }>({ Name: '', PhoneNumber: '', Email: '', Address: '', City: '' });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customerService.getAll,
  });

  const customers = data?.customers || [];

  const updateMutation = useMutation({
    mutationFn: ({ phone, data }: { phone: string; data: Partial<Customer> }) =>
      customerService.update(phone, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(t('customerUpdated'));
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUpdate')}: ${error.message}`);
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
      setSelectedCustomers(filteredCustomers.map((c: Customer) => c.Id));
    }
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.PhoneNumber?.includes(searchTerm) ||
    customer.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.City?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startInlineEdit = (customer: Customer) => {
    setEditingId(customer.Id);
    setEditingValues({
      Name: customer.Name,
      PhoneNumber: customer.PhoneNumber || '',
      Email: customer.Email || '',
      Address: customer.Address || '',
      City: customer.City || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditingValues({ Name: '', PhoneNumber: '', Email: '', Address: '', City: '' });
  };

  const saveInlineEdit = (customer: Customer) => {
    if (!customer.PhoneNumber) {
      toast.error(t('phoneNumberRequired'));
      return;
    }

    const updatedData = {
      Name: editingValues.Name,
      Email: editingValues.Email || undefined,
      Address: editingValues.Address || undefined,
      City: editingValues.City || undefined,
    };
    
    updateMutation.mutate({ phone: customer.PhoneNumber, data: updatedData });
  };

  const getFloatingActions = () => {
    if (selectedCustomers.length === 1) {
      return [
        {
          id: 'details',
          label: t('details'),
          onClick: () => {
            const customer = customers.find((c: Customer) => c.Id === selectedCustomers[0]);
            if (customer) {
              startInlineEdit(customer);
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
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search and View Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('customers')}</h1>
            <p className="text-slate-600">{t('manageCustomers')}</p>
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
                placeholder={t('searchCustomers')}
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
                    {filteredCustomers.map((customer: Customer) => {
                      const isSelected = selectedCustomers.includes(customer.Id);
                      const isEditing = editingId === customer.Id;

                      return (
                        <div
                          key={customer.Id}
                          onClick={() => !isEditing && toggleSelectCustomer(customer.Id)}
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
                              customer.IsEnabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {customer.IsEnabled ? t('active') : t('inactive')}
                            </span>
                          </div>

                          {/* Card Content */}
                          <div className="p-3 space-y-2">
                            {/* Header: Icon, Name and Status */}
                            <div className="flex items-start justify-between gap-2 mt-8">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Users className="w-5 h-5 text-amber-600" />
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
                                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1" title={customer.Name}>
                                      {customer.Name}
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
                                <span className="truncate">{customer.PhoneNumber || '-'}</span>
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
                                  <span className="truncate">{customer.Email || '-'}</span>
                                )}
                              </div>

                              {/* City */}
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingValues.City}
                                    onChange={(e) => setEditingValues({ ...editingValues, City: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 px-1.5 py-0.5 text-xs border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none"
                                  />
                                ) : (
                                  <span className="truncate">{customer.City || '-'}</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            {isEditing && (
                              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveInlineEdit(customer);
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
                                  startInlineEdit(customer);
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
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 border border-slate-200/60 rounded-lg bg-white">
                  {filteredCustomers.map((customer: Customer) => {
                    const isSelected = selectedCustomers.includes(customer.Id);
                    const isEditing = editingId === customer.Id;

                    return (
                      <div
                        key={customer.Id}
                        onClick={() => !isEditing && toggleSelectCustomer(customer.Id)}
                        className={`bg-white rounded-lg shadow-sm border px-4 py-3 hover:shadow-md transition-all cursor-pointer ${
                          selectedCustomers.includes(customer.Id)
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
                                toggleSelectCustomer(customer.Id);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                selectedCustomers.includes(customer.Id)
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'bg-white border-slate-300 hover:border-amber-400'
                              }`}
                            >
                              {selectedCustomers.includes(customer.Id) && (
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
                            {isEditing ? (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('name')}</p>
                                <input
                                  type="text"
                                  value={editingValues.Name}
                                  onChange={(e) => setEditingValues({ ...editingValues, Name: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                                <p className="text-sm font-semibold text-slate-800 truncate">{customer.Name}</p>
                              </div>
                            )}
                          </div>

                          {/* Phone */}
                          <div className="w-32">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                            <p className="text-sm text-slate-600">{customer.PhoneNumber || '-'}</p>
                          </div>

                          {/* Email */}
                          <div className="w-48">
                            {isEditing ? (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('email')}</p>
                                <input
                                  type="email"
                                  value={editingValues.Email}
                                  onChange={(e) => setEditingValues({ ...editingValues, Email: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                                />
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('email')}</p>
                                <p className="text-sm text-slate-600 truncate">{customer.Email || '-'}</p>
                              </div>
                            )}
                          </div>

                          {/* City */}
                          <div className="w-32">
                            {isEditing ? (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('city')}</p>
                                <input
                                  type="text"
                                  value={editingValues.City}
                                  onChange={(e) => setEditingValues({ ...editingValues, City: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                                />
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('city')}</p>
                                <p className="text-sm text-slate-600">{customer.City || '-'}</p>
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="w-24 flex flex-col items-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              customer.IsEnabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.IsEnabled ? t('active') : t('inactive')}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="w-16 flex justify-center">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveInlineEdit(customer);
                                  }}
                                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                  title={t('save')}
                                >
                                  <CheckSquare className="w-4 h-4" />
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
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startInlineEdit(customer);
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
      </div>
    </AdminLayout>
  );
}
