import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Eye, Edit2, Trash2, Search, X } from 'lucide-react';
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
import { MobileList } from '../components/MobileList';

export default function Fournisseurs() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
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
    const actions: any[] = [];
    if (selectedSuppliers.length === 1) {
      const supplier = suppliers.find((s: Partner) => s.id === selectedSuppliers[0]);
      actions.push(
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
      );
    }
    actions.push({
      id: 'delete',
      label: t('delete'),
      icon: <Trash2 style={{ width: '1rem', height: '1rem' }} />,
      onClick: () => {
        if (selectedSuppliers.length === 1) {
          const supplier = suppliers.find((s: Partner) => s.id === selectedSuppliers[0]);
          if (supplier) handleDeletePartner(supplier);
        } else {
          toastConfirm(
            `${t('delete')} ${selectedSuppliers.length} ${t('suppliers').toLowerCase()}?`,
            () => { selectedSuppliers.forEach(id => deleteMutation.mutate(id)); clearSelection(); }
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
          title={t('suppliers')}
          subtitle={t('manageSuppliers')}
          actions={
            <Button onClick={() => navigate('/fournisseurs/create')} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label="Ajouter fournisseur" />
          }
        />

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
            {/* Mobile cards */}
            <div className="responsive-table-mobile">
              <MobileList
                items={filteredSuppliers}
                keyExtractor={(s: Partner) => s.id}
                onTap={(s: Partner) => handleViewSupplier(s)}
                loading={isLoading}
                totalCount={filteredSuppliers.length}
                countLabel={t('suppliers')}
                emptyMessage="Aucun fournisseur trouvé"
                config={{
                  topLeft: (s: Partner) => s.name,
                  topRight: (s: Partner) => s.phoneNumber || '',
                  bottomLeft: (s: Partner) => s.email || '',
                  bottomRight: (s: Partner) => (
                    <span style={{ display: 'inline-flex', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...(s.isEnabled ? { backgroundColor: '#dcfce7', color: '#166534' } : { backgroundColor: '#fee2e2', color: '#991b1b' }) }}>
                      {s.isEnabled ? t('active') : t('inactive')}
                    </span>
                  ),
                }}
              />
            </div>

            {/* Desktop DataTable */}
            {filteredSuppliers.length === 0 ? (
              <div className="responsive-table-desktop" style={{ textAlign: 'center', padding: '4rem 0', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <Users style={{ width: '5rem', height: '5rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>Aucun fournisseur trouvé</p>
              </div>
            ) : (
              <div className="responsive-table-desktop" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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

                </DataTable>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSuppliers.length > 0 && (
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
