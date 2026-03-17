import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ArrowLeftRight, Search, Eye, CheckCircle2, XCircle, Package, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { stockMovementService } from '../modules/inventory/stock-movements.service';
import { StockMovement } from '../modules/inventory/inventory.model';
import { toastValidated, toastCancelled, toastError, toastConfirm } from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';

export default function StockMovements() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [selectedRows, setSelectedRows] = useState<StockMovement[]>([]);

  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements', statusFilter, typeFilter],
    queryFn: () => stockMovementService.getAll({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      movementType: typeFilter !== 'all' ? typeFilter : undefined,
    }),
  });

  const validateMutation = useMutation({
    mutationFn: (movementId: number) => stockMovementService.validate({ movementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toastValidated(t('movementValidated'));
    },
    onError: (error: Error) => {
      toastError(`${t('error')}: ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => stockMovementService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toastCancelled(t('movementCancelled'));
    },
    onError: (error: Error) => {
      toastError(`${t('error')}: ${error.message}`);
    },
  });

  const filteredMovements = movements.filter(mov =>
    mov.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mov.productName && mov.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
      draft: { label: t('draft'), bg: '#f1f5f9', color: '#334155' },
      waiting: { label: t('pending'), bg: '#fef9c3', color: '#a16207' },
      confirmed: { label: t('confirmed'), bg: '#dbeafe', color: '#1d4ed8' },
      assigned: { label: t('assigned'), bg: '#e0e7ff', color: '#4338ca' },
      done: { label: t('done'), bg: '#d1fae5', color: '#047857' },
      cancelled: { label: t('cancelled'), bg: '#fee2e2', color: '#b91c1c' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: config.bg, color: config.color }}>
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <TrendingUp style={{ width: '1rem', height: '1rem', color: '#059669' }} />;
      case 'delivery': return <TrendingDown style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />;
      case 'internal': return <RefreshCw style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />;
      case 'adjustment': return <Package style={{ width: '1rem', height: '1rem', color: '#d97706' }} />;
      default: return <ArrowLeftRight style={{ width: '1rem', height: '1rem', color: '#475569' }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      receipt: t('movementTypes.receipt'),
      delivery: t('movementTypes.delivery'),
      internal: t('movementTypes.internal'),
      adjustment: t('movementTypes.adjustment'),
      production_in: t('movementTypes.productionIn'),
      production_out: t('movementTypes.productionOut'),
      return_in: t('movementTypes.receipt'),
      return_out: t('movementTypes.delivery'),
      scrap: t('movementTypes.scrap'),
    };
    return labels[type] || type;
  };

  const typeOptions = [
    { label: t('allTypes'), value: 'all' },
    { label: t('movementTypes.receipt'), value: 'receipt' },
    { label: t('movementTypes.delivery'), value: 'delivery' },
    { label: t('movementTypes.internal'), value: 'internal' },
    { label: t('movementTypes.adjustment'), value: 'adjustment' },
    { label: t('movementTypes.productionIn'), value: 'production_in' },
    { label: t('movementTypes.productionOut'), value: 'production_out' },
    { label: 'Retour client', value: 'return_in' },
    { label: 'Retour fournisseur', value: 'return_out' },
    { label: 'Mise au rebut', value: 'scrap' },
  ];

  const statusOptions = [
    { label: t('allStatuses'), value: 'all' },
    { label: t('draft'), value: 'draft' },
    { label: t('pending'), value: 'waiting' },
    { label: t('confirmed'), value: 'confirmed' },
    { label: t('assigned'), value: 'assigned' },
    { label: t('done'), value: 'done' },
    { label: t('cancelled'), value: 'cancelled' },
  ];

  return (
    <AdminLayout>
      <PageHeader
        icon={ArrowLeftRight}
        title={t('stockMovements')}
        subtitle={t('stockMovementsSubtitle')}
      />

      {/* Filters and Actions Bar */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ width: '1rem', height: '1rem', position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
            <InputText
              type="text"
              placeholder={t('searchByReferenceOrProduct')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              aria-label={t('searchByReferenceOrProduct')}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Type Filter */}
            <Dropdown
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.value)}
              options={typeOptions}
              optionLabel="label"
              optionValue="value"
              style={{ minWidth: '12rem' }}
            />

            {/* Status Filter */}
            <Dropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.value)}
              options={statusOptions}
              optionLabel="label"
              optionValue="value"
              style={{ minWidth: '12rem' }}
            />
          </div>
        </div>
      </div>

      {/* Movements List */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataTable
          className="sm-datatable"
          value={filteredMovements}
          selection={selectedRows}
          onSelectionChange={(e) => setSelectedRows(e.value as StockMovement[])}
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
              <ArrowLeftRight style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 0.5rem', display: 'block' }} />
              Aucun mouvement trouvé
            </div>
          }
          paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}-{last} of {totalRecords}"
        >
          <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
          <Column field="reference" header="Référence" sortable body={(mov: StockMovement) => (
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{mov.reference}</span>
          )} />
          <Column field="movementType" header="Type" sortable body={(mov: StockMovement) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getTypeIcon(mov.movementType)}
              <span style={{ fontSize: '0.875rem', color: '#334155' }}>{getTypeLabel(mov.movementType)}</span>
            </div>
          )} />
          <Column field="productName" header="Produit" sortable body={(mov: StockMovement) => (
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', margin: 0 }}>{mov.productName || `Produit #${mov.productId}`}</p>
              {mov.productCode && <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{mov.productCode}</p>}
            </div>
          )} />
          <Column header="Origine → Destination" body={(mov: StockMovement) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
              <span>{mov.sourceWarehouseName || (mov.sourceWarehouseId ? `Entrepôt ${mov.sourceWarehouseId}` : '-')}</span>
              <ArrowLeftRight style={{ width: '0.75rem', height: '0.75rem' }} />
              <span>{mov.destWarehouseName || (mov.destWarehouseId ? `Entrepôt ${mov.destWarehouseId}` : '-')}</span>
            </div>
          )} />
          <Column field="quantity" header="Quantité" sortable align="center" headerStyle={{ textAlign: 'center' }} body={(mov: StockMovement) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              {parseFloat(mov.quantity.toString()).toFixed(2)} {mov.unitOfMeasureCode || 'U'}
            </span>
          )} />
          <Column field="dateDone" header="Date" sortable align="center" headerStyle={{ textAlign: 'center' }} body={(mov: StockMovement) => (
            <span style={{ fontSize: '0.875rem', color: '#475569' }}>
              {mov.dateDone ? new Date(mov.dateDone).toLocaleDateString('fr-FR') : mov.dateScheduled ? new Date(mov.dateScheduled).toLocaleDateString('fr-FR') : '-'}
            </span>
          )} />
          <Column field="status" header="Statut" sortable align="center" headerStyle={{ textAlign: 'center' }} body={(mov: StockMovement) => getStatusBadge(mov.status)} />
          <Column header="Actions" align="right" headerStyle={{ textAlign: 'right' }} body={(mov: StockMovement) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {(mov.status === 'draft' || mov.status === 'waiting' || mov.status === 'confirmed') && (
                <Button icon={<CheckCircle2 style={{ width: '1rem', height: '1rem' }} />} onClick={() => validateMutation.mutate(mov.id)} text rounded severity="success" title={t('validate')} />
              )}
              <Button icon={<Eye style={{ width: '1rem', height: '1rem' }} />} onClick={() => setSelectedMovement(mov)} text rounded severity="secondary" title={t('details')} />
              {mov.status !== 'done' && mov.status !== 'cancelled' && (
                <Button
                  icon={<XCircle style={{ width: '1rem', height: '1rem' }} />}
                  onClick={() => toastConfirm(t('confirmCancelMovement'), () => cancelMutation.mutate(mov.id))}
                  text rounded severity="danger" title={t('cancel')}
                />
              )}
            </div>
          )} />
        </DataTable>
      </div>
    </AdminLayout>
  );
}
