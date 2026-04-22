import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import {
  ArrowLeftRight,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { stockMovementService } from '../modules/inventory/stock-movements.service';
import { StockMovement } from '../modules/inventory/inventory.model';
import {
  toastValidated,
  toastCancelled,
  toastError,
  toastConfirm,
} from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';
import { translateUomCode } from '../lib/uom-translations';
import { MobileList } from '../components/MobileList';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionBar } from '../components/FloatingActionBar';

export default function StockMovements() {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [selectedRows, setSelectedRows] = useState<StockMovement[]>([]);

  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements', statusFilter, typeFilter, debouncedSearch],
    queryFn: () =>
      stockMovementService.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        movementType: typeFilter !== 'all' ? typeFilter : undefined,
        search: debouncedSearch || undefined,
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 500);
  };

  const clearSelection = () => setSelectedRows([]);
  const toggleSelectAll = () =>
    selectedRows.length === movements.length ? setSelectedRows([]) : setSelectedRows(movements);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; cls: string }> = {
      draft: { label: t('draft'), cls: 'erp-badge erp-badge--draft' },
      waiting: { label: t('pending'), cls: 'erp-badge erp-badge--pending' },
      confirmed: { label: t('confirmed'), cls: 'erp-badge erp-badge--active' },
      assigned: { label: t('assigned'), cls: 'erp-badge erp-badge--active' },
      done: { label: t('done'), cls: 'erp-badge erp-badge--paid' },
      cancelled: { label: t('cancelled'), cls: 'erp-badge erp-badge--unpaid' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={config.cls}>{config.label}</span>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <TrendingUp style={{ width: '1rem', height: '1rem', color: '#059669' }} />;
      case 'delivery':
        return <TrendingDown style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />;
      case 'internal':
        return <RefreshCw style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />;
      case 'adjustment':
        return <Package style={{ width: '1rem', height: '1rem', color: '#d97706' }} />;
      default:
        return <ArrowLeftRight style={{ width: '1rem', height: '1rem', color: '#475569' }} />;
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
    { label: t('movementTypes.returnIn'), value: 'return_in' },
    { label: t('movementTypes.returnOut'), value: 'return_out' },
    { label: t('movementTypes.scrap'), value: 'scrap' },
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
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={ArrowLeftRight}
          title={t('stockMovements')}
          subtitle={t('stockMovementsSubtitle')}
        />

        {/* Filters and Actions Bar */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            {/* Search — 50% on desktop, 100% on mobile */}
            <div style={{ flex: '1 1 50%', minWidth: '0', position: 'relative' }}>
              <Search
                style={{
                  width: '1rem',
                  height: '1rem',
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
              <InputText
                type="text"
                placeholder={t('searchByReferenceOrProduct')}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                aria-label={t('searchByReferenceOrProduct')}
              />
            </div>

            {/* Dropdowns — share remaining 50% on desktop, full width on mobile */}
            <div style={{ flex: '1 1 40%', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Type Filter */}
              <Dropdown
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.value)}
                options={typeOptions}
                optionLabel="label"
                optionValue="value"
                style={{ flex: '1 1 10rem' }}
              />

              {/* Status Filter */}
              <Dropdown
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.value)}
                options={statusOptions}
                optionLabel="label"
                optionValue="value"
                style={{ flex: '1 1 10rem' }}
              />
            </div>
          </div>
        </div>

        {/* Movements List */}
        <div className="responsive-table-mobile" style={{ marginBottom: '0.5rem' }}>
          <MobileList
            items={movements}
            keyExtractor={(m: StockMovement) => m.id}
            loading={isLoading}
            totalCount={movements.length}
            countLabel="mouvements"
            emptyMessage={t('noMovementsFound' as any)}
            config={{
              topLeft: (m: StockMovement) => m.reference,
              topRight: (m: StockMovement) => {
                const outboundTypes = ['delivery', 'return_out', 'production_out', 'scrap'];
                let isOutbound: boolean;
                if (m.movementType === 'adjustment') {
                  isOutbound = !m.destWarehouseId && !!m.sourceWarehouseId;
                } else {
                  isOutbound = outboundTypes.includes(m.movementType);
                }
                const sign = isOutbound ? '-' : '+';
                const uom = m.unitOfMeasureCode
                  ? ` ${translateUomCode(m.unitOfMeasureCode, language)}`
                  : '';
                return `${sign}${parseFloat(m.quantity.toString()).toFixed(2)}${uom}`;
              },
              bottomLeft: (m: StockMovement) => m.productName || `Produit #${m.productId}`,
              bottomRight: (m: StockMovement) => getStatusBadge(m.status),
            }}
          />
        </div>
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
            className="sm-datatable"
            value={movements}
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
              <EmptyState icon={ArrowLeftRight} title={t('noMovementsFound' as any)} compact />
            }
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            currentPageReportTemplate={t('pageReportTemplate')}
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
            <Column
              field="reference"
              header={t('reference')}
              sortable
              body={(mov: StockMovement) => (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1e293b',
                  }}
                >
                  {mov.reference}
                </span>
              )}
            />
            <Column
              field="movementType"
              header={t('type')}
              sortable
              body={(mov: StockMovement) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getTypeIcon(mov.movementType)}
                  <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                    {getTypeLabel(mov.movementType)}
                  </span>
                </div>
              )}
            />
            <Column
              field="productName"
              header={t('product')}
              sortable
              body={(mov: StockMovement) => (
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', margin: 0 }}>
                    {mov.productName || `#${mov.productId}`}
                  </p>
                  {mov.productCode && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                      {mov.productCode}
                    </p>
                  )}
                </div>
              )}
            />
            <Column
              header={t('originDestination' as any)}
              body={(mov: StockMovement) => {
                const inboundTypes = ['receipt', 'return_in', 'production_in'];
                const outboundTypes = ['delivery', 'return_out', 'production_out', 'scrap'];
                const externalLabel = mov.partnerName || 'Externe';

                let source: string;
                let dest: string;

                if (inboundTypes.includes(mov.movementType)) {
                  source = externalLabel;
                  dest =
                    mov.destWarehouseName ||
                    (mov.destWarehouseId ? `${t('warehouse')} ${mov.destWarehouseId}` : '-');
                } else if (outboundTypes.includes(mov.movementType)) {
                  source =
                    mov.sourceWarehouseName ||
                    (mov.sourceWarehouseId ? `${t('warehouse')} ${mov.sourceWarehouseId}` : '-');
                  dest = externalLabel;
                } else {
                  // internal / adjustment
                  source =
                    mov.sourceWarehouseName ||
                    (mov.sourceWarehouseId ? `${t('warehouse')} ${mov.sourceWarehouseId}` : '-');
                  dest =
                    mov.destWarehouseName ||
                    (mov.destWarehouseId ? `${t('warehouse')} ${mov.destWarehouseId}` : '-');
                }

                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#475569',
                    }}
                  >
                    <span
                      style={
                        inboundTypes.includes(mov.movementType)
                          ? { color: '#64748b', fontStyle: 'italic' }
                          : undefined
                      }
                    >
                      {source}
                    </span>
                    <ArrowLeftRight
                      style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0 }}
                    />
                    <span
                      style={
                        outboundTypes.includes(mov.movementType)
                          ? { color: '#64748b', fontStyle: 'italic' }
                          : undefined
                      }
                    >
                      {dest}
                    </span>
                  </div>
                );
              }}
            />
            <Column
              field="quantity"
              header={t('quantity')}
              sortable
              align="center"
              headerStyle={{ textAlign: 'center' }}
              body={(mov: StockMovement) => {
                const outboundTypes = ['delivery', 'return_out', 'production_out', 'scrap'];
                // For adjustment movements, direction is determined by warehouse IDs:
                // destWarehouseId set = inbound (increase), sourceWarehouseId only = outbound (decrease)
                let isOutbound: boolean;
                if (mov.movementType === 'adjustment') {
                  isOutbound = !mov.destWarehouseId && !!mov.sourceWarehouseId;
                } else {
                  isOutbound = outboundTypes.includes(mov.movementType);
                }
                const qty = parseFloat(mov.quantity.toString()).toFixed(2);
                const sign = isOutbound ? '-' : '+';
                return (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: isOutbound ? '#fee2e2' : '#dcfce7',
                      color: isOutbound ? '#dc2626' : '#15803d',
                      fontWeight: 700,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      gap: '0.25rem',
                    }}
                  >
                    {sign}
                    {qty}
                    {mov.unitOfMeasureCode && (
                      <span style={{ fontWeight: 500, opacity: 0.75 }}>
                        {translateUomCode(mov.unitOfMeasureCode, language)}
                      </span>
                    )}
                  </span>
                );
              }}
            />
            <Column
              field="dateDone"
              header={t('date')}
              sortable
              align="center"
              headerStyle={{ textAlign: 'center' }}
              body={(mov: StockMovement) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  {mov.dateDone
                    ? new Date(mov.dateDone).toLocaleDateString('fr-FR')
                    : mov.dateScheduled
                      ? new Date(mov.dateScheduled).toLocaleDateString('fr-FR')
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
              body={(mov: StockMovement) => getStatusBadge(mov.status)}
            />
          </DataTable>
        </div>

        {/* ── Movement Detail Dialog ── */}
        <Dialog
          visible={!!selectedMovement}
          onHide={() => setSelectedMovement(null)}
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {selectedMovement && getTypeIcon(selectedMovement.movementType)}
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {selectedMovement?.reference}
              </span>
            </div>
          }
          style={{ width: '32rem' }}
          breakpoints={{ '768px': '95vw' }}
          dismissableMask
        >
          {selectedMovement &&
            (() => {
              const mov = selectedMovement;
              const rows: { label: string; value: React.ReactNode }[] = [
                {
                  label: t('type'),
                  value: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      {getTypeIcon(mov.movementType)}
                      {getTypeLabel(mov.movementType)}
                    </span>
                  ),
                },
                { label: t('product'), value: mov.productName || `#${mov.productId}` },
                ...(mov.productCode
                  ? [
                      {
                        label: t('code'),
                        value: <span style={{ fontFamily: 'monospace' }}>{mov.productCode}</span>,
                      },
                    ]
                  : []),
                {
                  label: t('quantity'),
                  value: (() => {
                    const outboundTypes = ['delivery', 'return_out', 'production_out', 'scrap'];
                    const isOut =
                      mov.movementType === 'adjustment'
                        ? !mov.destWarehouseId && !!mov.sourceWarehouseId
                        : outboundTypes.includes(mov.movementType);
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: isOut ? '#fee2e2' : '#dcfce7',
                          color: isOut ? '#dc2626' : '#15803d',
                          fontWeight: 700,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        {isOut ? '-' : '+'}
                        {parseFloat(mov.quantity.toString()).toFixed(2)}
                        {mov.unitOfMeasureCode && (
                          <span style={{ fontWeight: 500, opacity: 0.75 }}>
                            {translateUomCode(mov.unitOfMeasureCode, language)}
                          </span>
                        )}
                      </span>
                    );
                  })(),
                },
                { label: t('status'), value: getStatusBadge(mov.status) },
                ...(mov.sourceWarehouseName || mov.sourceWarehouseId
                  ? [
                      {
                        label: t('source'),
                        value:
                          mov.sourceWarehouseName || `${t('warehouse')} ${mov.sourceWarehouseId}`,
                      },
                    ]
                  : []),
                ...(mov.destWarehouseName || mov.destWarehouseId
                  ? [
                      {
                        label: t('destination'),
                        value: mov.destWarehouseName || `${t('warehouse')} ${mov.destWarehouseId}`,
                      },
                    ]
                  : []),
                ...(mov.partnerName ? [{ label: t('partner'), value: mov.partnerName }] : []),
                ...(mov.origin
                  ? [
                      {
                        label: t('origin'),
                        value: (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {mov.origin}
                          </span>
                        ),
                      },
                    ]
                  : []),
                ...(mov.lotNumber ? [{ label: t('lotNumber'), value: mov.lotNumber }] : []),
                ...(mov.serialNumber
                  ? [{ label: t('serialNumber'), value: mov.serialNumber }]
                  : []),
                ...(mov.dateDone
                  ? [
                      {
                        label: t('dateDone'),
                        value: new Date(mov.dateDone).toLocaleString('fr-FR'),
                      },
                    ]
                  : []),
                ...(mov.dateScheduled && !mov.dateDone
                  ? [
                      {
                        label: t('dateScheduled'),
                        value: new Date(mov.dateScheduled).toLocaleDateString('fr-FR'),
                      },
                    ]
                  : []),
                ...(mov.notes ? [{ label: t('notes'), value: mov.notes }] : []),
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        padding: '0.625rem 0',
                        borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: '#64748b',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        {row.label}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#1e293b', textAlign: 'right' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
        </Dialog>

        <FloatingActionBar
          selectedCount={selectedRows.length}
          onClearSelection={clearSelection}
          onSelectAll={toggleSelectAll}
          isAllSelected={selectedRows.length === movements.length && movements.length > 0}
          totalCount={movements.length}
          itemLabel="mouvement"
          actions={(() => {
            const mov = selectedRows.length === 1 ? selectedRows[0] : null;
            const acts: any[] = [];
            if (mov) {
              if (['draft', 'waiting', 'confirmed'].includes(mov.status)) {
                acts.push({
                  id: 'validate',
                  label: t('validate'),
                  icon: <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(
                      t('confirmValidateMovement') || 'Valider ce mouvement ?',
                      () => validateMutation.mutate(mov.id),
                      { variant: 'info', confirmLabel: t('validate') || 'Valider' },
                    ),
                  variant: 'primary' as const,
                });
              }
              acts.push({
                id: 'view',
                label: t('details'),
                icon: <Eye style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => setSelectedMovement(mov),
              });
              if (mov.status !== 'done' && mov.status !== 'cancelled') {
                acts.push({
                  id: 'cancel',
                  label: t('cancel'),
                  icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(t('confirmCancelMovement'), () => {
                      cancelMutation.mutate(mov.id);
                      clearSelection();
                    }),
                  variant: 'danger' as const,
                });
              }
            } else {
              const validatable = selectedRows.filter((r) =>
                ['draft', 'waiting', 'confirmed'].includes(r.status),
              );
              if (validatable.length > 0) {
                acts.push({
                  id: 'validate',
                  label: `${t('validate')} (${validatable.length})`,
                  icon: <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(
                      `${t('validate') || 'Valider'} (${validatable.length}) ?`,
                      () => {
                        validatable.forEach((r) => validateMutation.mutate(r.id));
                        clearSelection();
                      },
                      { variant: 'info', confirmLabel: t('validate') || 'Valider' },
                    ),
                  variant: 'primary' as const,
                });
              }
              const cancellable = selectedRows.filter(
                (r) => r.status !== 'done' && r.status !== 'cancelled',
              );
              if (cancellable.length > 0) {
                acts.push({
                  id: 'cancel',
                  label: `${t('cancel')} (${cancellable.length})`,
                  icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () =>
                    toastConfirm(t('confirmCancelMovement'), () => {
                      cancellable.forEach((r) => cancelMutation.mutate(r.id));
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
