import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { KpiCard, KpiGrid } from '../components/KpiCard';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Users, TrendingUp, Clock, CheckCircle, Eye, Edit2, Trash2, Search, X, Phone, Mail } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersService } from '../modules/partners';
import { Partner } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { toastDeleted, toastError, toastConfirm } from '../services/toast.service';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { formatDH, formatFrenchNumber } from '../utils/formatNumber';
import { MobileList } from '../components/MobileList';

export default function Customers() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
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
    const actions: any[] = [];
    if (selectedCustomers.length === 1) {
      const customer = customers.find((c: Partner) => c.id === selectedCustomers[0]);
      actions.push(
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
      );
    }
    actions.push({
      id: 'delete',
      label: t('delete'),
      icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
      onClick: () => {
        if (selectedCustomers.length === 1) {
          const customer = customers.find((c: Partner) => c.id === selectedCustomers[0]);
          if (customer) handleDeletePartner(customer);
        } else {
          toastConfirm(
            `${t('delete')} ${selectedCustomers.length} ${t('customers').toLowerCase()}?`,
            () => { selectedCustomers.forEach(id => deleteMutation.mutate(id)); clearSelection(); }
          );
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
          icon={Users}
          title={t('customers')}
          subtitle={t('manageCustomers')}
          actions={
            <Button onClick={() => navigate('/customers/create')} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('addCustomer')} />
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                <Button
                  icon={<X style={{ width: '1rem', height: '1rem' }} />}
                  onClick={() => setSearchTerm('')}
                  text rounded
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 10, padding: '0.25rem' }}
                />
              )}
            </div>
          </div>

          {/* Customers List */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            {/* Mobile cards */}
            <div className="responsive-table-mobile">
              <MobileList
                items={filteredCustomers}
                keyExtractor={(c: Partner) => c.id}
                onTap={(c: Partner) => handleViewCustomer(c)}
                loading={isLoading}
                totalCount={filteredCustomers.length}
                countLabel={t('customers')}
                emptyMessage={t('noCustomersFound')}
                config={{
                  topLeft: (c: Partner) => c.name,
                  topRight: (c: Partner) => c.phoneNumber || '',
                  bottomLeft: (c: Partner) => c.email || '',
                  bottomRight: (c: Partner) => (
                    <span style={{ display: 'inline-flex', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...(c.isEnabled ? { backgroundColor: '#dcfce7', color: '#166534' } : { backgroundColor: '#fee2e2', color: '#991b1b' }) }}>
                      {c.isEnabled ? t('active') : t('inactive')}
                    </span>
                  ),
                }}
              />
            </div>

            {/* Desktop DataTable */}
            {filteredCustomers.length === 0 ? (
              <div className="responsive-table-desktop" style={{ textAlign: 'center', padding: '4rem 0', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <Users style={{ width: '5rem', height: '5rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>{t('noCustomersFound')}</p>
              </div>
            ) : (
              <div className="responsive-table-desktop" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <DataTable
                  className="cust-datatable"
                  value={filteredCustomers}
                  selection={filteredCustomers.filter((c: Partner) => selectedCustomers.includes(c.id))}
                  onSelectionChange={(e) => setSelectedCustomers((e.value as Partner[]).map((c) => c.id))}
                  selectionMode="checkbox"
                  dataKey="id"
                  paginator
                  paginatorPosition="top"
                  rows={25}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  removableSort
                  emptyMessage={<div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('noCustomersFound')}</div>}
                  paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                  currentPageReportTemplate="{first}-{last} of {totalRecords}"
                >
                  <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                  <Column field="name" header={t('name')} sortable body={(row: Partner) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '2rem', height: '2rem', background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users style={{ width: '1rem', height: '1rem', color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{row.name}</span>
                    </div>
                  )} />
                  <Column field="phoneNumber" header={t('phone')} sortable body={(row: Partner) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.phoneNumber || '-'}</span>} />
                  <Column field="email" header={t('email')} sortable body={(row: Partner) => <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.email || '-'}</span>} />
                  <Column field="isEnabled" header={t('status')} body={(row: Partner) => (
                    <span style={{ display: 'inline-flex', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...(row.isEnabled ? { backgroundColor: '#dcfce7', color: '#166534' } : { backgroundColor: '#fee2e2', color: '#991b1b' }) }}>
                      {row.isEnabled ? t('active') : t('inactive')}
                    </span>
                  )} />

                </DataTable>
              </div>
            )}
          </div>
        </div>
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
