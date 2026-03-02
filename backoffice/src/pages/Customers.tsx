import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Users, TrendingUp, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Grid3x3, List as ListIcon, Phone, Mail, Check } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
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
          icon: <Eye style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => { if (customer) handleViewCustomer(customer); },
        },
        {
          id: 'edit',
          label: t('edit'),
          icon: <Edit2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => { if (customer) handleEditCustomer(customer); },
        },
        {
          id: 'delete',
          label: t('delete'),
          icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => { if (customer) handleDeletePartner(customer); },
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
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <PageHeader
          icon={Users}
          title={t('customers')}
          subtitle={t('manageCustomers')}
          actions={
            <Button onClick={() => navigate('/customers/create')} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addCustomer')} />
          }
        />

        {/* Tabs Navigation */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }} className="scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                    borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500,
                    whiteSpace: 'nowrap', flexShrink: 0, border: 'none', cursor: 'pointer',
                    ...(activeTab === tab.key
                      ? { backgroundColor: '#f59e0b', color: 'white', boxShadow: '0 4px 6px -1px rgba(245,158,11,0.25)' }
                      : { backgroundColor: 'transparent', color: '#475569' }),
                  }}
                >
                  <Icon style={{ width: '1rem', height: '1rem' }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '0.75rem', paddingTop: '0.5rem' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '3rem', height: '3rem', backgroundColor: '#dbeafe', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#475569' }}>Total Clients</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalCustomers}</h3>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '3rem', height: '3rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#475569' }}>Avec Factures</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{customersWithInvoices}</h3>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '3rem', height: '3rem', backgroundColor: '#f3e8ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp style={{ width: '1.5rem', height: '1.5rem', color: '#9333ea' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#475569' }}>Revenu Total</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{formatDH(totalRevenue, 0)}</h3>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '3rem', height: '3rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#475569' }}>Total Factures</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalInvoices}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  {/* Top 5 Customers by Revenue */}
                  <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Top 5 clients par revenu</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Classement par chiffre d'affaires</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{formatFrenchNumber(totalPayments, 0)}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>DH Total</p>
                      </div>
                    </div>
                    {topCustomers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <TrendingUp style={{ width: '4rem', height: '4rem', color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
                        <p style={{ color: '#475569', fontSize: '0.875rem' }}>Aucune donnée de revenu disponible</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {topCustomers.slice(0, 5).map((customer: any, index: number) => {
                          const percentage = ((customer.total / totalPayments) * 100);
                          const bgColors = ['#eff6ff', '#f5f3ff', '#fdf2f8', '#fffbeb', '#ecfdf5'];
                          const textColors = ['#1d4ed8', '#6d28d9', '#be185d', '#b45309', '#047857'];
                          const barGradients = [
                            'linear-gradient(to right, #3b82f6, #2563eb)',
                            'linear-gradient(to right, #8b5cf6, #7c3aed)',
                            'linear-gradient(to right, #ec4899, #db2777)',
                            'linear-gradient(to right, #f59e0b, #d97706)',
                            'linear-gradient(to right, #10b981, #059669)',
                          ];

                          return (
                            <div key={index}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '9999px', backgroundColor: bgColors[index], color: textColors[index], fontSize: '0.75rem', fontWeight: 700 }}>
                                    {index + 1}
                                  </div>
                                  <button
                                    onClick={() => navigate(`/customers/${customer.id}`)}
                                    style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', background: 'none', border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}
                                    title={customer.name}
                                  >
                                    {customer.name}
                                  </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{percentage.toFixed(1).replace('.', ',')}%</span>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', minWidth: '80px', textAlign: 'right' }}>{formatDH(customer.total, 0)}</span>
                                </div>
                              </div>
                              <div style={{ position: 'relative', height: '2rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                <div
                                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, background: barGradients[index], borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.75rem', width: `${Math.max(percentage, 5)}%` }}
                                >
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
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
                  <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Dernières mises à jour clients</h3>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Client</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem' }}>Téléphone</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '6rem', textAlign: 'right' }}>Factures</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {lastUpdatedCustomers.length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Aucune mise à jour récente</p>
                      ) : (
                        lastUpdatedCustomers.map((customer: any) => (
                          <div key={customer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                              <Users style={{ width: '1rem', height: '1rem', color: '#a855f7', flexShrink: 0 }} />
                              <button
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              >
                                {customer.name}
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.phoneNumber || '-'}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#9333ea', width: '6rem', textAlign: 'right' }}>{customer.invoicesCount}</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '0.25rem' }}>
                    <button
                      onClick={() => setViewMode('card')}
                      style={{
                        padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                        border: 'none', cursor: 'pointer',
                        ...(viewMode === 'card'
                          ? { backgroundColor: 'white', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                          : { backgroundColor: 'transparent', color: '#475569' }),
                      }}
                    >
                      <Grid3x3 style={{ width: '1rem', height: '1rem' }} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      style={{
                        padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                        border: 'none', cursor: 'pointer',
                        ...(viewMode === 'list'
                          ? { backgroundColor: 'white', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                          : { backgroundColor: 'transparent', color: '#475569' }),
                      }}
                    >
                      <ListIcon style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>

                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <InputText
                      id="search-customers"
                      type="text"
                      placeholder={t('searchCustomers')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '24rem' }}
                      aria-label={t('searchCustomers')}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', zIndex: 10 }}
                      >
                        <X style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Customers List */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <Users style={{ width: '5rem', height: '5rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                      <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>{t('noCustomersFound')}</p>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'card' ? (
                        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                          {filteredCustomers.map((customer: Partner) => {
                            const isSelected = selectedCustomers.includes(customer.id);

                            return (
                              <div
                                key={customer.id}
                                onClick={() => toggleSelectCustomer(customer.id)}
                                style={{
                                  position: 'relative', backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', cursor: 'pointer',
                                  ...(isSelected
                                    ? { outline: '2px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }
                                    : { boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }),
                                }}
                              >
                                {/* Selection Checkbox */}
                                <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10 }}>
                                  <div style={{
                                    width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', border: '2px solid',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    ...(isSelected
                                      ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white' }
                                      : { backgroundColor: 'white', borderColor: '#cbd5e1' }),
                                  }}>
                                    {isSelected && <Check style={{ width: '1rem', height: '1rem' }} />}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
                                  <span style={{
                                    padding: '0.125rem 0.5rem', borderRadius: '0.375rem', fontSize: '10px', fontWeight: 500,
                                    ...(customer.isEnabled
                                      ? { backgroundColor: '#dcfce7', color: '#15803d' }
                                      : { backgroundColor: '#f1f5f9', color: '#475569' }),
                                  }}>
                                    {customer.isEnabled ? t('active') : t('inactive')}
                                  </span>
                                </div>

                                {/* Card Content */}
                                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginTop: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                      <div style={{ width: '2.25rem', height: '2.25rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Users style={{ width: '1.25rem', height: '1.25rem', color: '#d97706' }} />
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={customer.name}>
                                          {customer.name}
                                        </h3>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                                      <Phone style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.phoneNumber || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                                      <Mail style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {filteredCustomers.map((customer: Partner) => (
                            <div
                              key={customer.id}
                              onClick={() => toggleSelectCustomer(customer.id)}
                              style={{
                                backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                padding: '0.75rem 1rem', cursor: 'pointer',
                                ...(selectedCustomers.includes(customer.id)
                                  ? { border: '1px solid #f59e0b', outline: '2px solid rgba(245,158,11,0.2)' }
                                  : { border: '1px solid #e2e8f0' }),
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div
                                    style={{
                                      width: '1.25rem', height: '1.25rem', borderRadius: '0.25rem', border: '2px solid',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                      ...(selectedCustomers.includes(customer.id)
                                        ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white' }
                                        : { backgroundColor: 'white', borderColor: '#cbd5e1' }),
                                    }}
                                  >
                                    {selectedCustomers.includes(customer.id) && <Check style={{ width: '0.875rem', height: '0.875rem' }} />}
                                  </div>
                                </div>

                                <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(to bottom right, #f59e0b, #d97706)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Users style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('name')}</p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</p>
                                </div>

                                <div style={{ width: '8rem' }}>
                                  <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('phone')}</p>
                                  <p style={{ fontSize: '0.875rem', color: '#475569' }}>{customer.phoneNumber || '-'}</p>
                                </div>

                                <div style={{ width: '12rem' }}>
                                  <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('email')}</p>
                                  <p style={{ fontSize: '0.875rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email || '-'}</p>
                                </div>

                                <div style={{ width: '6rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t('status')}</p>
                                  <span style={{
                                    display: 'inline-flex', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                                    ...(customer.isEnabled
                                      ? { backgroundColor: '#dcfce7', color: '#166534' }
                                      : { backgroundColor: '#fee2e2', color: '#991b1b' }),
                                  }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '28rem', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{t('confirmDelete')}</h3>
            <p style={{ color: '#475569', marginBottom: '1.5rem' }}>{t('deletePartnerConfirmation')}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                outlined
                onClick={() => setShowDeleteConfirm(false)}
                label={t('cancel')}
              />
              <Button
                severity="danger"
                onClick={confirmDelete}
                loading={deleteMutation.isPending}
                label={t('delete')}
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
