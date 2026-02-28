import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Users, TrendingUp, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Grid3x3, List as ListIcon, Phone, Mail, Check } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { Partner } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toastDeleted, toastError } from '../services/toast.service';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { formatDH, formatFrenchNumber } from '../utils/formatNumber';

export default function Customers() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: partnersService.getAll,
  });

  const customers = data?.partners?.filter((p: Partner) => p.isCustomer) || [];

  // Fetch dashboard stats from API
  const { data: dashboardData } = useQuery({
    queryKey: ['customers-dashboard'],
    queryFn: () => partnersService.getCustomersDashboard(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partnersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toastDeleted(t('customerDeleted'));
      setShowDeleteConfirm(false);
      setDeletingPartnerId(null);
      setSelectedCustomers([]);
    },
    onError: (error: Error) => {
      const message = error.message.includes('Cannot delete customer that has')
        ? error.message
        : `${t('failedToDelete')}: ${error.message}`;
      toastError(message);
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

  const handleViewCustomer = (customer: Partner) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleEditCustomer = (customer: Partner) => {
    navigate(`/customers/edit/${customer.id}`);
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
          id: 'view',
          label: t('view'),
          icon: <Eye className="w-4 h-4" />,
          onClick: () => {
            if (customer) {
              handleViewCustomer(customer);
            }
          },
        },
        {
          id: 'edit',
          label: t('edit'),
          icon: <Edit2 className="w-4 h-4" />,
          onClick: () => {
            if (customer) {
              handleEditCustomer(customer);
            }
          },
        },
        {
          id: 'delete',
          label: t('delete'),
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => {
            if (customer) {
              handleDeletePartner(customer);
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
    { key: 'list', label: t('customerList'), icon: List },
  ];

  // Get dashboard statistics from API
  const totalCustomers = dashboardData?.kpis?.totalCustomers || 0;
  const customersWithInvoices = dashboardData?.kpis?.customersWithInvoices || 0;
  const totalRevenue = dashboardData?.kpis?.totalRevenue || 0;
  const totalInvoices = dashboardData?.kpis?.totalInvoices || 0;
  const topCustomers = dashboardData?.topCustomers || [];
  const lastUpdatedCustomers = dashboardData?.lastUpdatedCustomers || [];
  const totalPayments = topCustomers.reduce((sum: number, c: any) => sum + c.total, 0);
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Users}
          title={t('customers')}
          subtitle={t('manageCustomers')}
          actions={
            <Button onClick={() => navigate('/customers/create')} leadingIcon={Plus}>
              {t('addCustomer')}
            </Button>
          }
        />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 mb-4 sm:mb-6">
          <div className="flex items-center gap-1 sm:gap-2 p-2 border-b border-slate-200 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.key
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-3 pt-2">
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Total Clients</p>
                        <h3 className="text-2xl font-bold text-slate-900">{totalCustomers}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Avec Factures</p>
                        <h3 className="text-2xl font-bold text-slate-900">{customersWithInvoices}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-purple-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Revenu Total</p>
                        <h3 className="text-xl font-bold text-slate-900">{formatDH(totalRevenue, 0)}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-amber-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Total Factures</p>
                        <h3 className="text-2xl font-bold text-slate-900">{totalInvoices}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Grid - 2 Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Dynamic Bar Chart - Top 5 Customers by Revenue */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Top 5 clients par revenu</h3>
                        <p className="text-xs text-slate-500 mt-1">Classement par chiffre d'affaires</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">{formatFrenchNumber(totalPayments, 0)}</p>
                        <p className="text-xs text-slate-500">DH Total</p>
                      </div>
                    </div>
                    {topCustomers.length === 0 ? (
                      <div className="text-center py-16">
                        <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 text-sm">Aucune donnée de revenu disponible</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {topCustomers.slice(0, 5).map((customer: any, index: number) => {
                          const percentage = ((customer.total / totalPayments) * 100);
                          const barColors = [
                            { from: 'from-blue-500', to: 'to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
                            { from: 'from-purple-500', to: 'to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700' },
                            { from: 'from-pink-500', to: 'to-pink-600', bg: 'bg-pink-50', text: 'text-pink-700' },
                            { from: 'from-amber-500', to: 'to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700' },
                            { from: 'from-emerald-500', to: 'to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                          ];
                          const color = barColors[index];

                          return (
                            <div key={index} className="group">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <div className={`flex items-center justify-center w-6 h-6 rounded-full ${color.bg} ${color.text} text-xs font-bold`}>
                                    {index + 1}
                                  </div>
                                  <button
                                    onClick={() => navigate(`/customers/${customer.id}`)}
                                    className="text-sm font-semibold text-slate-800 hover:text-amber-600 transition-colors truncate max-w-[200px]"
                                    title={customer.name}
                                  >
                                    {customer.name}
                                  </button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-500">{percentage.toFixed(1).replace('.', ',')}%</span>
                                  <span className="text-sm font-bold text-slate-900 min-w-[80px] text-right">{formatDH(customer.total, 0)}</span>
                                </div>
                              </div>
                              <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                                <div
                                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color.from} ${color.to} rounded-lg transition-all duration-1000 ease-out group-hover:opacity-90 flex items-center justify-end pr-3`}
                                  style={{ width: `${Math.max(percentage, 5)}%` }}
                                >
                                  <span className="text-xs font-bold text-white">
                                    {percentage < 13 ? customer.invoicesCount : `${customer.invoicesCount} facture${customer.invoicesCount > 1 ? 's' : ''}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Last 5 Updated Customers */}
                  <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200">
                    <div className="mb-4">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2">Dernières mises à jour clients</h3>
                      <div className="hidden sm:flex items-center justify-between">
                        <span className="text-xs text-slate-500">Client</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-32">Téléphone</span>
                          <span className="text-xs text-slate-500 w-24 text-right">Factures</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {lastUpdatedCustomers.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune mise à jour récente</p>
                      ) : (
                        lastUpdatedCustomers.map((customer: any) => (
                          <div key={customer.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 last:border-0 gap-2 sm:gap-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <button
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate"
                              >
                                {customer.name}
                              </button>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0">
                              <span className="text-xs text-slate-500 sm:w-32 truncate">{customer.phoneNumber || '-'}</span>
                              <span className="text-sm font-bold text-purple-600 sm:w-24 text-right">{customer.invoicesCount}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-3 sm:space-y-1">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 rounded-lg p-1 flex-shrink-0">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${viewMode === 'card'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <Grid3x3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <ListIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 sm:flex-none">
                    <Input
                      id="search-customers"
                      type="text"
                      placeholder={t('searchCustomers')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      leadingIcon={Search}
                      className="w-full sm:w-96"
                      aria-label={t('searchCustomers')}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 z-10"
                      >
                        <X className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Customers List */}
                <div className="border-t border-slate-200 pt-4">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                      <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-800 font-semibold text-lg">{t('noCustomersFound')}</p>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'card' ? (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {filteredCustomers.map((customer: Partner) => {
                            const isSelected = selectedCustomers.includes(customer.id);

                            return (
                              <div
                                key={customer.id}
                                onClick={() => toggleSelectCustomer(customer.id)}
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
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${customer.isEnabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {customer.isEnabled ? t('active') : t('inactive')}
                                  </span>
                                </div>

                                {/* Card Content */}
                                <div className="p-3 space-y-2">
                                  {/* Header */}
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
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      <span className="truncate">{customer.phoneNumber || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      <span className="truncate">{customer.email || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredCustomers.map((customer: Partner) => (
                            <div
                              key={customer.id}
                              onClick={() => toggleSelectCustomer(customer.id)}
                              className={`bg-white rounded-lg shadow-sm border px-4 py-3 hover:shadow-md transition-all cursor-pointer ${selectedCustomers.includes(customer.id)
                                ? 'border-amber-500 ring-2 ring-amber-500/20'
                                : 'border-slate-200/60 hover:border-slate-300/60'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Checkbox */}
                                <div className="w-12 flex items-center justify-center">
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${selectedCustomers.includes(customer.id)
                                      ? 'bg-amber-500 border-amber-500 text-white'
                                      : 'bg-white border-slate-300 hover:border-amber-400'
                                      }`}
                                  >
                                    {selectedCustomers.includes(customer.id) && (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                </div>

                                {/* Icon */}
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Users className="w-5 h-5 text-white" />
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                                  <p className="text-sm font-semibold text-slate-800 truncate">{customer.name}</p>
                                </div>

                                {/* Phone */}
                                <div className="w-32">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                                  <p className="text-sm text-slate-600">{customer.phoneNumber || '-'}</p>
                                </div>

                                {/* Email */}
                                <div className="w-48">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('email')}</p>
                                  <p className="text-sm text-slate-600 truncate">{customer.email || '-'}</p>
                                </div>

                                {/* Status */}
                                <div className="w-24 flex flex-col items-center">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${customer.isEnabled
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {customer.isEnabled ? t('active') : t('inactive')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
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
      {selectedCustomers.length > 0 && activeTab === 'list' && (
        <FloatingActionBar
          selectedCount={selectedCustomers.length}
          onSelectAll={toggleSelectAll}
          onClearSelection={clearSelection}
          actions={getFloatingActions()}
          isAllSelected={selectedCustomers.length === filteredCustomers.length}
          totalCount={filteredCustomers.length}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('confirmDelete')}</h3>
            <p className="text-slate-600 mb-6">{t('deletePartnerConfirmation')}</p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                loading={deleteMutation.isPending}
                loadingText={t('deleting')}
              >
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
