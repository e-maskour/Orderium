import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import {
  ClipboardCheck,
  Plus,
  Search,
  Eye,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { inventoryAdjustmentService } from '../modules/inventory/inventory-adjustments.service';
import { InventoryAdjustment } from '../modules/inventory/inventory.model';
import {
  toastSuccess,
  toastValidated,
  toastDeleted,
  toastCancelled,
  toastError,
  toastConfirm,
} from '../services/toast.service';
import { MobileList } from '../components/MobileList';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionBar } from '../components/FloatingActionBar';

export default function InventoryAdjustments() {
  const { dir, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null);
  const [selectedRows, setSelectedRows] = useState<InventoryAdjustment[]>([]);

  const queryClient = useQueryClient();

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['inventory-adjustments', statusFilter, warehouseFilter],
    queryFn: () =>
      inventoryAdjustmentService.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        warehouseId: warehouseFilter !== 'all' ? parseInt(warehouseFilter) : undefined,
      }),
  });

  const startCountingMutation = useMutation({
    mutationFn: (id: number) => inventoryAdjustmentService.startCounting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      toastSuccess(t('countingStartedSuccess'));
    },
    onError: (error: Error) => {
      toastError(`${t('errorPrefix')}: ${error.message}`);
    },
  });

  const validateMutation = useMutation({
    mutationFn: (data: { adjustmentId: number; lines: any[] }) =>
      inventoryAdjustmentService.validate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      toastValidated(t('adjustmentValidatedSuccess'));
    },
    onError: (error: Error) => {
      toastError(`${t('errorPrefix')}: ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => inventoryAdjustmentService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      toastCancelled(t('adjustmentCancelled'));
    },
    onError: (error: Error) => {
      toastError(`${t('errorPrefix')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryAdjustmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      toastDeleted(t('adjustmentDeleted'));
    },
    onError: (error: Error) => {
      toastError(`${t('errorPrefix')}: ${error.message}`);
    },
  });

  const filteredAdjustments = adjustments.filter(
    (adj) =>
      adj.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const clearSelection = () => setSelectedRows([]);
  const toggleSelectAll = () =>
    selectedRows.length === filteredAdjustments.length
      ? setSelectedRows([])
      : setSelectedRows(filteredAdjustments);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; cls: string }> = {
      draft: { label: t('draft'), cls: 'erp-badge erp-badge--draft' },
      in_progress: { label: t('inProgress'), cls: 'erp-badge erp-badge--active' },
      done: { label: t('validated'), cls: 'erp-badge erp-badge--paid' },
      cancelled: { label: t('cancelled'), cls: 'erp-badge erp-badge--unpaid' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={config.cls}>{config.label}</span>;
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={ClipboardCheck}
          title={t('inventoryAdjustments')}
          subtitle={t('manageInventoryAdjustments')}
        />

        {/* Filters and Actions Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
            {/* Search */}
            <div style={{ flex: 1 }}>
              <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                />
                <InputText
                  id="search-adjustments"
                  type="text"
                  placeholder={t('searchByReference')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label={t('searchByReference')}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
              </span>
            </div>

            {/* Status Filter */}
            <Dropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.value)}
              options={[
                { label: 'Tous les statuts', value: 'all' },
                { label: 'Brouillon', value: 'draft' },
                { label: 'En cours', value: 'in_progress' },
                { label: 'Validé', value: 'done' },
                { label: 'Annulé', value: 'cancelled' },
              ]}
              optionLabel="label"
              optionValue="value"
              style={{ minWidth: '12rem' }}
            />

            {/* Create Button */}
            <Button
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label={t('newAdjustment')}
              onClick={() => setShowCreateModal(true)}
            />
          </div>
        </div>

        {/* Adjustments List */}
        <div className="responsive-table-mobile">
          <MobileList
            items={filteredAdjustments}
            keyExtractor={(adj: InventoryAdjustment) => adj.id}
            loading={isLoading}
            totalCount={filteredAdjustments.length}
            countLabel="ajustements"
            emptyMessage="Aucun ajustement trouvé"
            config={{
              topLeft: (adj: InventoryAdjustment) => adj.reference,
              topRight: (adj: InventoryAdjustment) =>
                adj.warehouseName || `Entrepôt ${adj.warehouseId}`,
              bottomLeft: (adj: InventoryAdjustment) => adj.notes || adj.adjustmentDate || '',
              bottomRight: (adj: InventoryAdjustment) => getStatusBadge(adj.status),
            }}
          />
        </div>
        <div
          className="responsive-table-desktop"
          style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <DataTable
            className="ia-datatable"
            value={filteredAdjustments}
            selection={selectedRows}
            onSelectionChange={(e) => setSelectedRows(e.value as InventoryAdjustment[])}
            selectionMode="checkbox"
            dataKey="id"
            paginator
            paginatorPosition="top"
            rows={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            removableSort
            loading={isLoading}
            emptyMessage={
              <EmptyState icon={ClipboardCheck} title={t('noAdjustmentsFound')} compact />
            }
            paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
            currentPageReportTemplate={t('pageReportTemplate')}
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
            <Column
              field="reference"
              header={t('reference')}
              sortable
              body={(adj: InventoryAdjustment) => (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1e293b',
                  }}
                >
                  {adj.reference}
                </span>
              )}
            />
            <Column
              field="name"
              header={t('name')}
              sortable
              body={(adj: InventoryAdjustment) => (
                <span style={{ fontSize: '0.875rem', color: '#334155' }}>{adj.name}</span>
              )}
            />
            <Column
              field="warehouseName"
              header={t('warehouse')}
              sortable
              body={(adj: InventoryAdjustment) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  {adj.warehouseName || `${t('warehouse')} ${adj.warehouseId}`}
                </span>
              )}
            />
            <Column
              field="adjustmentDate"
              header={t('date')}
              sortable
              align="center"
              headerStyle={{ textAlign: 'center' }}
              body={(adj: InventoryAdjustment) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  {adj.adjustmentDate
                    ? new Date(adj.adjustmentDate).toLocaleDateString('fr-FR')
                    : '-'}
                </span>
              )}
            />
            <Column
              field="status"
              header={t('status')}
              sortable
              align="center"
              headerStyle={{ textAlign: 'center' }}
              body={(adj: InventoryAdjustment) => getStatusBadge(adj.status)}
            />
            <Column
              header={t('lines')}
              align="center"
              headerStyle={{ textAlign: 'center' }}
              body={(adj: InventoryAdjustment) => (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontWeight: 700,
                    padding: '0.25rem 0.625rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {adj.lines?.length || 0}
                </span>
              )}
            />
          </DataTable>
        </div>

        <FloatingActionBar
          selectedCount={selectedRows.length}
          onClearSelection={clearSelection}
          onSelectAll={toggleSelectAll}
          isAllSelected={
            selectedRows.length === filteredAdjustments.length && filteredAdjustments.length > 0
          }
          totalCount={filteredAdjustments.length}
          itemLabel="ajustement"
          actions={(() => {
            const adj = selectedRows.length === 1 ? selectedRows[0] : null;
            const acts: any[] = [];
            if (adj) {
              if (adj.status === 'draft') {
                acts.push({
                  id: 'start',
                  label: t('start'),
                  icon: <Play style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => startCountingMutation.mutate(adj.id),
                  variant: 'primary' as const,
                });
              }
              if (adj.status === 'in_progress') {
                acts.push({
                  id: 'validate',
                  label: t('validate'),
                  icon: <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => setSelectedAdjustment(adj),
                  variant: 'primary' as const,
                });
              }
              acts.push({
                id: 'view',
                label: t('details'),
                icon: <Eye style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => setSelectedAdjustment(adj),
              });
              if (adj.status === 'draft') {
                acts.push({
                  id: 'cancel',
                  label: t('cancel'),
                  icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(
                      t('confirmCancelAdjustment') || 'Annuler cet ajustement ?',
                      () => {
                        cancelMutation.mutate(adj.id);
                        clearSelection();
                      },
                      { variant: 'warning', confirmLabel: t('cancel') || 'Annuler' },
                    ),
                  variant: 'secondary' as const,
                });
                acts.push({
                  id: 'delete',
                  label: t('delete'),
                  icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(t('confirmDeleteAdjustment'), () => {
                      deleteMutation.mutate(adj.id);
                      clearSelection();
                    }),
                  variant: 'danger' as const,
                });
              }
            } else {
              const draftSelected = selectedRows.filter((r) => r.status === 'draft');
              if (draftSelected.length > 0) {
                acts.push({
                  id: 'delete',
                  label: `${t('delete')} (${draftSelected.length})`,
                  icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(t('confirmDeleteAdjustment'), () => {
                      draftSelected.forEach((r) => deleteMutation.mutate(r.id));
                      clearSelection();
                    }),
                  variant: 'danger' as const,
                });
              }
            }
            return acts;
          })()}
        />
      </div>
    </AdminLayout>
  );
}
