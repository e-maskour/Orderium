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
import { Dropdown } from 'primereact/dropdown';
import {
  toastDeleted,
  toastError,
  toastDeleteError,
  toastConfirm,
} from '../services/toast.service';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { EmptyState } from '../components/EmptyState';
import { MobileList } from '../components/MobileList';

export default function Fournisseurs() {
  const { t, language, dir } = useLanguage();
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const isEnabledParam = statusFilter === 'all' ? undefined : statusFilter === 'active';
  const { data, isLoading } = useQuery({
    queryKey: ['partners-suppliers', debouncedSearch, statusFilter],
    queryFn: () =>
      partnersService.getAll({
        search: debouncedSearch || undefined,
        type: 'supplier',
        isEnabled: isEnabledParam,
      }),
  });

  const suppliers = data?.partners || [];

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
      toastDeleteError(error, t);
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
      <div
        dir={dir}
        style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
          <PageHeader
            icon={Users}
            title={t('suppliers')}
            subtitle={t('manageSuppliers')}
            actions={
              <Button
                onClick={() => navigate('/fournisseurs/create')}
                icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
                label={t('addSupplier')}
              />
            }
          />
        </div>

        {/* Filter bar */}
        <div
          className="page-quick-search products-filter-row"
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            width: '100%',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: '12rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('search')}
            </span>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  insetInlineStart: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  width: '1rem',
                  height: '1rem',
                  pointerEvents: 'none',
                }}
              />
              <InputText
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`${t('search')}...`}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '0.875rem',
                  paddingInlineStart: '2.5rem',
                  paddingInlineEnd: searchInput ? '2.5rem' : '0.875rem',
                  borderRadius: '0.625rem',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                }}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                  }}
                >
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>
              )}
            </div>
          </div>

          <div className="orders-filter-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('status')}
              </span>
              <Dropdown
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.value)}
                options={[
                  { label: t('all'), value: 'all' },
                  { label: t('active'), value: 'active' },
                  { label: t('inactive'), value: 'inactive' },
                ]}
                style={{ height: '3rem', minWidth: '9rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
          </div>
        </div>
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
                const selCol = target.closest('.p-selection-column');
                if (selCol) {
                  (selCol.querySelector('.p-checkbox-box') as HTMLElement)?.click();
                  return;
                }
                handleViewSupplier(e.data as Partner);
              }}
              rowClassName={() => 'ord-row-clickable'}
              dataKey="id"
              paginator
              paginatorPosition="top"
              rows={25}
              rowsPerPageOptions={[10, 25, 50, 100]}
              removableSort
              emptyMessage={<EmptyState icon={Users} title="Aucun fournisseur trouvé" compact />}
              paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
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
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>{row.email || '-'}</span>
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
    </AdminLayout>
  );
}
