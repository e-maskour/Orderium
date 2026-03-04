import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ClipboardCheck, Plus, Search, Eye, Play, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { inventoryAdjustmentService } from '../modules/inventory/inventory-adjustments.service';
import { InventoryAdjustment } from '../modules/inventory/inventory.model';
import { toastSuccess, toastValidated, toastDeleted, toastCancelled, toastError, toastConfirm } from '../services/toast.service';

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
    queryFn: () => inventoryAdjustmentService.getAll({
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

  const filteredAdjustments = adjustments.filter(adj =>
    adj.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adj.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: t('draft'), style: { background: '#f1f5f9', color: '#334155' } },
      in_progress: { label: t('inProgress'), style: { background: '#dbeafe', color: '#1d4ed8' } },
      done: { label: t('validated'), style: { background: '#d1fae5', color: '#047857' } },
      cancelled: { label: t('cancelled'), style: { background: '#fee2e2', color: '#b91c1c' } },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span style={{ display: 'inline-block', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...config.style }}>
        {config.label}
      </span>
    );
  };

  return (
    <AdminLayout>
      <PageHeader
        icon={ClipboardCheck}
        title={t('inventoryAdjustments')}
        subtitle={t('manageInventoryAdjustments')}
      />

      {/* Filters and Actions Bar */}
      <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
          {/* Search */}
          <div style={{ flex: 1 }}>
            <span style={{ position: 'relative', display: 'block', width: '100%' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <InputText id="search-adjustments" type="text" placeholder={t('searchByReference')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label={t('searchByReference')} style={{ width: '100%', paddingLeft: '2.5rem' }} />
            </span>
          </div>

          {/* Status Filter */}
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.value)} options={[{ label: 'Tous les statuts', value: 'all' }, { label: 'Brouillon', value: 'draft' }, { label: 'En cours', value: 'in_progress' }, { label: 'Validé', value: 'done' }, { label: 'Annulé', value: 'cancelled' }]} optionLabel="label" optionValue="value" style={{ minWidth: '12rem' }} />

          {/* Create Button */}
          <Button icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('newAdjustment')} onClick={() => setShowCreateModal(true)} />
        </div>
      </div>

      {/* Adjustments List */}
      <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <style>{`
          .ia-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
          .ia-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
          .ia-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
          .ia-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
          .ia-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: transparent; padding: 0.125rem 0.5rem; border-radius: 0; }
          .ia-datatable .p-paginator .p-paginator-pages .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
        `}</style>
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
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <ClipboardCheck style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 0.5rem', display: 'block' }} />
              {t('noAdjustmentsFound')}
            </div>
          }
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="{first} - {last} / {totalRecords}"
        >
          <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
          <Column field="reference" header="Référence" sortable body={(adj: InventoryAdjustment) => (
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{adj.reference}</span>
          )} />
          <Column field="name" header="Nom" sortable body={(adj: InventoryAdjustment) => (
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>{adj.name}</span>
          )} />
          <Column field="warehouseName" header="Entrepôt" sortable body={(adj: InventoryAdjustment) => (
            <span style={{ fontSize: '0.875rem', color: '#475569' }}>{adj.warehouseName || `Entrepôt ${adj.warehouseId}`}</span>
          )} />
          <Column field="adjustmentDate" header="Date" sortable align="center" headerStyle={{ textAlign: 'center' }} body={(adj: InventoryAdjustment) => (
            <span style={{ fontSize: '0.875rem', color: '#475569' }}>
              {adj.adjustmentDate ? new Date(adj.adjustmentDate).toLocaleDateString('fr-FR') : '-'}
            </span>
          )} />
          <Column field="status" header="Statut" sortable align="center" headerStyle={{ textAlign: 'center' }} body={(adj: InventoryAdjustment) => getStatusBadge(adj.status)} />
          <Column header="Lignes" align="center" headerStyle={{ textAlign: 'center' }} body={(adj: InventoryAdjustment) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#334155', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              {adj.lines?.length || 0}
            </span>
          )} />
          <Column header="Actions" align="right" headerStyle={{ textAlign: 'right' }} body={(adj: InventoryAdjustment) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {adj.status === 'draft' && (
                <Button icon={<Play style={{ width: '1rem', height: '1rem' }} />} onClick={() => startCountingMutation.mutate(adj.id)} text rounded severity="info" title={t('start')} />
              )}
              {adj.status === 'in_progress' && (
                <Button icon={<CheckCircle2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => setSelectedAdjustment(adj)} text rounded severity="success" title={t('validate')} />
              )}
              <Button icon={<Eye style={{ width: '1rem', height: '1rem' }} />} onClick={() => setSelectedAdjustment(adj)} text rounded severity="secondary" title={t('details')} />
              {adj.status === 'draft' && (
                <>
                  <Button icon={<XCircle style={{ width: '1rem', height: '1rem' }} />} onClick={() => cancelMutation.mutate(adj.id)} text rounded severity="warning" title={t('cancel')} />
                  <Button icon={<Trash2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => toastConfirm(t('confirmDeleteAdjustment'), () => deleteMutation.mutate(adj.id))} text rounded severity="danger" title={t('delete')} />
                </>
              )}
            </div>
          )} />
        </DataTable>
      </div>
    </AdminLayout>
  );
}
