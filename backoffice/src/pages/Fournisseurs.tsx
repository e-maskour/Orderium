import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useState, useEffect, useRef } from 'react';
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
import { EmptyState } from '../components/EmptyState';
import { MobileList } from '../components/MobileList';

export default function Fournisseurs() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['partners-suppliers', debouncedSearch],
    queryFn: () => partnersService.getAll({ search: debouncedSearch || undefined }),
  });

  const suppliers = data?.partners?.filter((p: Partner) => p.isSupplier) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partnersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners-suppliers'] });
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
    setSelectedSuppliers((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedSuppliers.length === suppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(suppliers.map((s: Partner) => s.id));
    }
  };

  const clearSelection = () => {
    setSelectedSuppliers([]);
  };

  const handleViewSupplier = (supplier: Partner) => {
    navigate(`/fournisseurs/${supplier.id}`); // unified edit+detail page
  };

  const handleEditSupplier = (supplier: Partner) => {
    navigate(`/fournisseurs/${supplier.id}`); // same unified page
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
          onClick: () => {
            if (supplier) handleViewSupplier(supplier);
          },
        },
        {
          id: 'edit',
          label: t('edit'),
          icon: <Edit2 style={{ width: '1rem', height: '1rem' }} />,
          onClick: () => {
            if (supplier) handleEditSupplier(supplier);
          },
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
            () => {
              selectedSuppliers.forEach((id) => deleteMutation.mutate(id));
              clearSelection();
            },
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
            <Button
              onClick={() => navigate('/fournisseurs/create')}
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label="Ajouter fournisseur"
            />
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {/* Search */}
          <div className="page-quick-search">
            <Search
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                width: '1rem',
                height: '1rem',
              }}
            />
            <InputText
              id="search-suppliers"
              type="text"
              placeholder={t('searchSuppliersPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              aria-label={t('searchSuppliersPlaceholder')}
            />
            {searchInput && (
              <Button
                text
                rounded
                onClick={() => setSearchInput('')}
                icon={<X style={{ width: '1rem', height: '1rem' }} />}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  zIndex: 10,
                  padding: '0.25rem',
                }}
              />
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            {/* Mobile cards */}
            <div className="responsive-table-mobile">
              <MobileList
                items={suppliers}
                keyExtractor={(s: Partner) => s.id}
                onTap={(s: Partner) => handleViewSupplier(s)}
                loading={isLoading}
                totalCount={suppliers.length}
                countLabel={t('suppliers')}
                emptyMessage="Aucun fournisseur trouvé"
                config={{
                  topLeft: (s: Partner) => s.name,
                  topRight: (s: Partner) => s.phoneNumber || '',
                  bottomLeft: (s: Partner) => s.email || '',
                  bottomRight: (s: Partner) => (
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        ...(s.isEnabled
                          ? { backgroundColor: '#dcfce7', color: '#166534' }
                          : { backgroundColor: '#fee2e2', color: '#991b1b' }),
                      }}
                    >
                      {s.isEnabled ? t('active') : t('inactive')}
                    </span>
                  ),
                }}
              />
            </div>

            {/* Desktop DataTable */}
            {suppliers.length === 0 ? (
              <div
                className="responsive-table-desktop"
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <EmptyState icon={Users} title="Aucun fournisseur trouvé" />
              </div>
            ) : (
              <div
                className="responsive-table-desktop"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <DataTable
                  className="fourn-datatable"
                  value={suppliers}
                  selection={suppliers.filter((s: Partner) => selectedSuppliers.includes(s.id))}
                  onSelectionChange={(e) =>
                    setSelectedSuppliers((e.value as Partner[]).map((s) => s.id))
                  }
                  selectionMode="checkbox"
                  onRowClick={(e) => {
                    const target = e.originalEvent.target as HTMLElement;
                    if (
                      target.closest('button') ||
                      target.closest('a') ||
                      target.closest('.p-checkbox')
                    )
                      return;
                    handleViewSupplier(e.data as Partner);
                  }}
                  rowClassName={() => 'ord-row-clickable'}
                  dataKey="id"
                  paginator
                  paginatorPosition="top"
                  rows={25}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  removableSort
                  emptyMessage={
                    <EmptyState icon={Users} title="Aucun fournisseur trouvé" compact />
                  }
                  paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                  currentPageReportTemplate={t('pageReportTemplate')}
                >
                  <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                  <Column
                    field="name"
                    header={t('name')}
                    sortable
                    body={(row: Partner) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '2rem',
                            height: '2rem',
                            background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)',
                            borderRadius: '0.375rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Users style={{ width: '1rem', height: '1rem', color: 'white' }} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                          {row.name}
                        </span>
                      </div>
                    )}
                  />
                  <Column
                    field="phoneNumber"
                    header={t('phone')}
                    sortable
                    body={(row: Partner) => (
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                        {row.phoneNumber || '-'}
                      </span>
                    )}
                  />
                  <Column
                    field="email"
                    header={t('email')}
                    sortable
                    body={(row: Partner) => (
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                        {row.email || '-'}
                      </span>
                    )}
                  />
                  <Column
                    field="isEnabled"
                    header={t('status')}
                    body={(row: Partner) => (
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          ...(row.isEnabled
                            ? { backgroundColor: '#dcfce7', color: '#166534' }
                            : { backgroundColor: '#fee2e2', color: '#991b1b' }),
                        }}
                      >
                        {row.isEnabled ? t('active') : t('inactive')}
                      </span>
                    )}
                  />
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
          isAllSelected={selectedSuppliers.length === suppliers.length}
          totalCount={suppliers.length}
        />
      )}

      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxWidth: '28rem',
              width: '100%',
              padding: '1.5rem',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              {t('confirmDelete')}
            </h3>
            <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
              Êtes-vous sûr de vouloir supprimer ce fournisseur ?
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <Button outlined onClick={() => setShowDeleteConfirm(false)} label={t('cancel')} />
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
