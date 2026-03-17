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
import { toastDeleted, toastError } from '../services/toast.service';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { formatDH, formatFrenchNumber } from '../utils/formatNumber';

export default function Fournisseurs() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: partnersService.getAll,
  });

  const suppliers = data?.partners?.filter((p: Partner) => p.isSupplier) || [];

  const { data: dashboardData } = useQuery({
    queryKey: ['suppliers-dashboard'],
    queryFn: () => partnersService.getSuppliersDashboard(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partnersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toastDeleted(t('supplierDeleted'));
      setShowDeleteConfirm(false);
      setDeletingPartnerId(null);
      setSelectedSuppliers([]);
    },
    onError: (error: Error) => {
      toastError(`${t('failedToDelete')}: ${error.message}`);
    },
  });

  const toggleSelectSupplier = (id: number) => {
    setSelectedSuppliers(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSuppliers.length === filteredSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(filteredSuppliers.map((s: Partner) => s.id));
    }
  };

  const clearSelection = () => {
    setSelectedSuppliers([]);
  };

  const filteredSuppliers = suppliers.filter((supplier: Partner) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phoneNumber?.includes(searchTerm) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewSupplier = (supplier: Partner) => {
    navigate(`/fournisseurs/${supplier.id}`);
  };

  const handleEditSupplier = (supplier: Partner) => {
    navigate(`/fournisseurs/edit/${supplier.id}`);
  };

  const handleDeletePartner = (supplier: Partner) => {
    setDeletingPartnerId(supplier.id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deletingPartnerId) {
      deleteMutation.mutate(deletingPartnerId);
    }
  };

  const getFloatingActions = () => {
    if (selectedSuppliers.length === 1) {
      const supplier = suppliers.find((s: Partner) => s.id === selectedSuppliers[0]);
      return [
        {
          id: 'view',
          label: t('view'),
          icon: <Eye style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => { if (supplier) handleViewSupplier(supplier); },
        },
        {
          id: 'edit',
          label: t('edit'),
          icon: <Edit2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => { if (supplier) handleEditSupplier(supplier); },
        },
        {
          id: 'delete',
          label: t('delete'),
          icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => { if (supplier) handleDeletePartner(supplier); },
          variant: 'danger' as const,
        },
      ];
    }
    return [];
  };

  const tabs = [
    { key: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { key: 'list', label: t('supplierList'), icon: List },
  ];

  const totalSuppliers = dashboardData?.kpis?.totalSuppliers || 0;
  const suppliersWithInvoices = dashboardData?.kpis?.suppliersWithInvoices || 0;
  const totalExpenses = dashboardData?.kpis?.totalExpenses || 0;
  const totalInvoices = dashboardData?.kpis?.totalInvoices || 0;
  const topSuppliers = dashboardData?.topSuppliers || [];
  const lastUpdatedSuppliers = dashboardData?.lastUpdatedSuppliers || [];
  const totalPayments = topSuppliers.reduce((sum: number, s: any) => sum + s.total, 0);
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#10b981'];

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={Users}
          title={t('suppliers')}
          subtitle={t('manageSuppliers')}
          actions={
            <Button onClick={() => navigate('/fournisseurs/create')} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label="Ajouter fournisseur" />
          }
        />

        {/* Tabs Navigation */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }} className="scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  text={activeTab !== tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={activeTab === tab.key
                    ? { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, backgroundColor: '#235ae4', color: 'white', boxShadow: '0 4px 6px -1px rgba(35,90,228,0.25)' }
                    : { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, color: '#475569' }}
                  icon={<Icon style={{ width: '1rem', height: '1rem' }} />}
                  label={tab.label}
                />
              );
            })}
          </div>

          <div style={{ padding: '0.75rem', paddingTop: '0.5rem' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Stats Cards */}
                <KpiGrid count={4}>
                  <KpiCard label="Fournisseurs" value={totalSuppliers} icon={Users} color="blue" />
                  <KpiCard label="Avec Factures" value={suppliersWithInvoices} icon={TrendingUp} color="emerald" />
                  <KpiCard label="Dépenses" value={formatDH(totalExpenses, 0)} icon={TrendingUp} color="purple" />
                  <KpiCard label="Total Factures" value={totalInvoices} icon={CheckCircle} color="indigo" />
                </KpiGrid>

                {/* Dashboard Grid */}
                <div className="partner-dash-grid">
                  {/* Top 5 Suppliers */}
                  <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Top 5 fournisseurs par dépenses</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Classement par volume d'achats</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9333ea' }}>{formatFrenchNumber(totalPayments, 0)}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>DH Total</p>
                      </div>
                    </div>
                    {topSuppliers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <TrendingUp style={{ width: '4rem', height: '4rem', color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
                        <p style={{ color: '#475569', fontSize: '0.875rem' }}>Aucune donnée de dépenses disponible</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {topSuppliers.slice(0, 5).map((supplier: any, index: number) => {
                          const percentage = ((supplier.total / totalPayments) * 100);
                          const bgColors = ['#eff6ff', '#f5f3ff', '#fdf2f8', '#fffbeb', '#ecfdf5'];
                          const textColors = ['#1d4ed8', '#6d28d9', '#be185d', '#b45309', '#047857'];
                          const barGradients = [
                            'linear-gradient(to right, #3b82f6, #2563eb)',
                            'linear-gradient(to right, #8b5cf6, #7c3aed)',
                            'linear-gradient(to right, #ec4899, #db2777)',
                            'linear-gradient(to right, #235ae4, #1a47b8)',
                            'linear-gradient(to right, #10b981, #059669)',
                          ];
                          return (
                            <div key={index}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '9999px', backgroundColor: bgColors[index], color: textColors[index], fontSize: '0.75rem', fontWeight: 700 }}>
                                    {index + 1}
                                  </div>
                                  <Button link label={supplier.name} onClick={() => navigate(`/fournisseurs/${supplier.id}`)} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', padding: 0 }} title={supplier.name} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{percentage.toFixed(1).replace('.', ',')}%</span>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', minWidth: '80px', textAlign: 'right' }}>{formatDH(supplier.total, 0)}</span>
                                </div>
                              </div>
                              <div style={{ position: 'relative', height: '2rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, background: barGradients[index], borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.75rem', width: `${Math.max(percentage, 5)}%` }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                                    {percentage < 13 ? supplier.invoicesCount : `${supplier.invoicesCount} facture${supplier.invoicesCount > 1 ? 's' : ''}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Last 5 Updated Suppliers */}
                  <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Dernières mises à jour fournisseurs</h3>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Fournisseur</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem' }}>Téléphone</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '6rem', textAlign: 'right' }}>Factures</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {lastUpdatedSuppliers.length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Aucune mise à jour récente</p>
                      ) : (
                        lastUpdatedSuppliers.map((supplier: any) => (
                          <div key={supplier.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                              <Users style={{ width: '1rem', height: '1rem', color: '#a855f7', flexShrink: 0 }} />
                              <Button link label={supplier.name} onClick={() => navigate(`/fournisseurs/${supplier.id}`)} style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', width: '8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.phoneNumber || '-'}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#9333ea', width: '6rem', textAlign: 'right' }}>{supplier.invoicesCount}</span>
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
                <div className="partner-list-toolbar">
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.9rem', height: '0.9rem', color: '#94a3b8', pointerEvents: 'none' }} />
                    <InputText id="search-suppliers" type="text" placeholder={t('searchSuppliersPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', paddingLeft: '2.25rem' }} aria-label={t('searchSuppliersPlaceholder')} />
                    {searchTerm && (
                      <Button text rounded onClick={() => setSearchTerm('')} icon={<X style={{ width: '1rem', height: '1rem' }} />} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 10 }} />
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  {filteredSuppliers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <Users style={{ width: '5rem', height: '5rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                      <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>Aucun fournisseur trouvé</p>
                    </div>
                  ) : (
                    <>
                      <DataTable
                        className="fourn-datatable"
                        value={filteredSuppliers}
                        selection={filteredSuppliers.filter((s: Partner) => selectedSuppliers.includes(s.id))}
                        onSelectionChange={(e) => setSelectedSuppliers((e.value as Partner[]).map((s) => s.id))}
                        selectionMode="checkbox"
                        dataKey="id"
                        paginator
                        paginatorPosition="top"
                        rows={25}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        removableSort
                        emptyMessage={<div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Aucun fournisseur trouvé</div>}
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
                        <Column header={t('actions')} headerStyle={{ textAlign: 'right' }} body={(row: Partner) => (
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <Button text rounded severity="secondary" onClick={() => handleViewSupplier(row)} icon={<Eye style={{ width: '1rem', height: '1rem' }} />} style={{ padding: '0.25rem' }} />
                            <Button text rounded severity="info" onClick={() => handleEditSupplier(row)} icon={<Edit2 style={{ width: '1rem', height: '1rem' }} />} style={{ padding: '0.25rem' }} />
                            <Button text rounded severity="danger" onClick={() => handleDeletePartner(row)} icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />} style={{ padding: '0.25rem' }} />
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

      {selectedSuppliers.length > 0 && activeTab === 'list' && (
        <FloatingActionBar
          selectedCount={selectedSuppliers.length}
          onSelectAll={toggleSelectAll}
          onClearSelection={clearSelection}
          actions={getFloatingActions()}
          isAllSelected={selectedSuppliers.length === filteredSuppliers.length}
          totalCount={filteredSuppliers.length}
        />
      )}

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '28rem', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{t('confirmDelete')}</h3>
            <p style={{ color: '#475569', marginBottom: '1.5rem' }}>Êtes-vous sûr de vouloir supprimer ce fournisseur ?</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button outlined onClick={() => setShowDeleteConfirm(false)} label={t('cancel')} />
              <Button severity="danger" onClick={confirmDelete} loading={deleteMutation.isPending} label={t('delete')} />
            </div>
          </div>
        </div>
      )}
      <style>{`
        .partner-dash-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .partner-list-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }
        @media (max-width: 1023px) {
          .partner-dash-grid {
            grid-template-columns: 1fr;
          }
          .partner-list-col-email {
            display: none;
          }
        }
        @media (max-width: 639px) {
          .partner-list-col-phone,
          .partner-list-col-email {
            display: none;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
