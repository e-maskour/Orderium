import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ArrowLeftRight, Search, Plus, Eye, CheckCircle2, XCircle, Package, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
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
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="animate-spin" style={{ borderRadius: '9999px', height: '3rem', width: '3rem', borderBottom: '2px solid #f59e0b', margin: '0 auto' }}></div>
            <p style={{ color: '#475569', marginTop: '1rem' }}>Chargement...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <ArrowLeftRight style={{ width: '4rem', height: '4rem', color: '#cbd5e1', margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: '#475569', marginBottom: '0.5rem' }}>Aucun mouvement trouvé</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Les mouvements de stock apparaîtront ici</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Référence</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produit</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origine → Destination</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantité</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {movement.reference}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getTypeIcon(movement.movementType)}
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>{getTypeLabel(movement.movementType)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', margin: 0 }}>
                          {movement.productName || `Produit #${movement.productId}`}
                        </p>
                        {movement.productCode && (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{movement.productCode}</p>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                        <span>{movement.sourceWarehouseName || (movement.sourceWarehouseId ? `Entrepôt ${movement.sourceWarehouseId}` : '-')}</span>
                        <ArrowLeftRight style={{ width: '0.75rem', height: '0.75rem' }} />
                        <span>{movement.destWarehouseName || (movement.destWarehouseId ? `Entrepôt ${movement.destWarehouseId}` : '-')}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        {parseFloat(movement.quantity.toString()).toFixed(2)} {movement.unitOfMeasureCode || 'U'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                        {movement.dateDone
                          ? new Date(movement.dateDone).toLocaleDateString('fr-FR')
                          : movement.dateScheduled
                            ? new Date(movement.dateScheduled).toLocaleDateString('fr-FR')
                            : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {getStatusBadge(movement.status)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {(movement.status === 'draft' || movement.status === 'waiting' || movement.status === 'confirmed') && (
                          <button
                            onClick={() => validateMutation.mutate(movement.id)}
                            style={{ padding: '0.375rem', color: '#059669', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}
                            title={t('validate')}
                          >
                            <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedMovement(movement)}
                          style={{ padding: '0.375rem', color: '#475569', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}
                          title={t('details')}
                        >
                          <Eye style={{ width: '1rem', height: '1rem' }} />
                        </button>
                        {movement.status !== 'done' && movement.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              toastConfirm(t('confirmCancelMovement'), () => {
                                cancelMutation.mutate(movement.id);
                              });
                            }}
                            style={{ padding: '0.375rem', color: '#dc2626', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}
                            title={t('cancel')}
                          >
                            <XCircle style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
