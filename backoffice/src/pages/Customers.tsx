import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Users, TrendingUp, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Grid3x3, List as ListIcon, Phone, Mail, CheckSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { invoicesService } from '../modules/invoices';
import { Partner } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { FloatingActionBar } from '../components/FloatingActionBar';

export default function Customers() {
  const { t } = useLanguage();
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

  // Fetch invoices
  const { data: invoicesData = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesService.getAll(),
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
      const message = error.message.includes('Cannot delete customer that has') 
        ? error.message 
        : `${t('failedToDelete')}: ${error.message}`;
      toast.error(message);
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
          label: 'Voir',
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
    { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'list', label: 'Liste des clients', icon: List },
  ];

  // Calculate statistics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c: Partner) => c.isEnabled).length;
  const inactiveCustomers = customers.filter((c: Partner) => !c.isEnabled).length;
  
  // Calculate total revenue from customers
  const customerInvoices = invoicesData.filter((inv: any) => inv.invoice.customerId);
  const totalRevenue = customerInvoices.reduce((sum: number, inv: any) => sum + inv.invoice.total, 0);
  const paidRevenue = customerInvoices
    .filter((inv: any) => inv.invoice.status === 'paid')
    .reduce((sum: number, inv: any) => sum + inv.invoice.total, 0);

  // Top customers by revenue
  const getTopCustomersByRevenue = () => {
    const customerRevenue = customers.map((customer: Partner) => {
      const custInvoices = invoicesData.filter(
        (inv: any) => inv.invoice.customerId === customer.id
      );
      const total = custInvoices.reduce(
        (sum: number, inv: any) => sum + inv.invoice.total,
        0
      );
      return {
        id: customer.id,
        name: customer.name,
        total,
        invoicesCount: custInvoices.length,
      };
    });

    return customerRevenue
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const topCustomers = getTopCustomersByRevenue();

  // Recent customers
  const recentCustomers = [...customers]
    .sort((a: Partner, b: Partner) => (b.id || 0) - (a.id || 0))
    .slice(0, 5);

  // Last 5 updated customers (customers with most recent invoices)
  const getLastUpdatedCustomers = () => {
    const customerLastUpdate = customers.map((customer: Partner) => {
      const custInvoices = invoicesData.filter(
        (inv: any) => inv.invoice.customerId === customer.id
      );
      const lastInvoiceDate = custInvoices.length > 0
        ? Math.max(...custInvoices.map((inv: any) => new Date(inv.invoice.date).getTime()))
        : 0;
      return {
        id: customer.id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        lastUpdate: lastInvoiceDate,
        invoicesCount: custInvoices.length,
      };
    });

    return customerLastUpdate
      .filter((c) => c.lastUpdate > 0)
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
      .slice(0, 5);
  };

  const lastUpdatedCustomers = getLastUpdatedCustomers();

  // Customers with most invoices
  const getCustomersWithMostInvoices = () => {
    const customerInvoiceCounts = customers.map((customer: Partner) => {
      const custInvoices = invoicesData.filter(
        (inv: any) => inv.invoice.customerId === customer.id
      );
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        invoicesCount: custInvoices.length,
      };
    });

    return customerInvoiceCounts
      .filter((c) => c.invoicesCount > 0)
      .sort((a, b) => b.invoicesCount - a.invoicesCount)
      .slice(0, 5);
  };

  const customersWithMostInvoices = getCustomersWithMostInvoices();

  const totalPayments = topCustomers.reduce((sum, c) => sum + c.total, 0);
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={Users}
          title={t('customers')}
          subtitle={t('manageCustomers')}
          actions={
            <button
              onClick={() => navigate('/customers/create')}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('addCustomer')}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-1">{totalCustomers}</h3>
                    <p className="text-sm text-blue-700">Clients totaux</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">Actifs</span>
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-900 mb-1">{activeCustomers}</h3>
                    <p className="text-sm text-emerald-700">Clients actifs</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">Inactifs</span>
                    </div>
                    <h3 className="text-2xl font-bold text-amber-900 mb-1">{inactiveCustomers}</h3>
                    <p className="text-sm text-amber-700">Clients inactifs</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">Revenu</span>
                    </div>
                    <h3 className="text-2xl font-bold text-purple-900 mb-1">{totalRevenue.toFixed(2)} DH</h3>
                    <p className="text-sm text-purple-700">Revenu total</p>
                  </div>
                </div>

                {/* Dashboard Grid - 2 Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart - Top 5 Customers by Revenue */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Top 5 clients par revenu</h3>
                    {topCustomers.length === 0 ? (
                      <div className="text-center py-16">
                        <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600">Aucune donnée de revenu disponible</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <div className="relative w-64 h-64">
                          <svg viewBox="0 0 200 200" className="transform -rotate-90">
                            {topCustomers.map((customer, index) => {
                              const percentage = (customer.total / totalPayments) * 100;
                              const previousPercentages = topCustomers
                                .slice(0, index)
                                .reduce((sum, c) => sum + (c.total / totalPayments) * 100, 0);
                              
                              const circumference = 2 * Math.PI * 80;
                              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                              const strokeDashoffset = -((previousPercentages / 100) * circumference);

                              return (
                                <circle
                                  key={index}
                                  cx="100"
                                  cy="100"
                                  r="80"
                                  fill="none"
                                  stroke={colors[index]}
                                  strokeWidth="40"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  className="transition-all duration-300 hover:opacity-80"
                                />
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <p className="text-2xl font-bold text-slate-900">{totalPayments.toFixed(0)}</p>
                            <p className="text-xs text-slate-600">DH Total</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 space-y-2">
                      {topCustomers.map((customer, index) => {
                        const percentage = ((customer.total / totalPayments) * 100).toFixed(1);
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors[index] }}
                              />
                              <p className="text-xs font-semibold text-slate-900 truncate">{customer.name}</p>
                              <p className="text-xs text-slate-600">{percentage}%</p>
                            </div>
                            <p className="text-xs font-bold text-slate-900">{customer.total.toFixed(2)} DH</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Last 5 Updated Customers */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-slate-800 mb-2">Dernières mises à jour clients</h3>
                      <div className="flex items-center justify-between">
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
                        lastUpdatedCustomers.map((customer) => (
                          <div key={customer.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-500" />
                              <button
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              >
                                {customer.name}
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 w-32 truncate">{customer.phoneNumber || '-'}</span>
                              <span className="text-sm font-bold text-purple-600 w-24 text-right">{customer.invoicesCount}</span>
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
                      placeholder={t('searchCustomers')}
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

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/customers/${customer.id}`);
                                    }}
                                    className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Voir
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/customers/edit/${customer.id}`);
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
                    ) : (
                      <div className="space-y-2">
                        {filteredCustomers.map((customer: Partner) => (
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
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  customer.isEnabled
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {customer.isEnabled ? t('active') : t('inactive')}
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="w-24 flex justify-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/customers/${customer.id}`);
                                  }}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Voir"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/customers/edit/${customer.id}`);
                                  }}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
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
    </AdminLayout>
  );
}
