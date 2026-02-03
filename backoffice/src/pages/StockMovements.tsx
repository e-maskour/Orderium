import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ArrowLeftRight, Search, Plus, Eye, CheckCircle2, XCircle, Package, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { stockMovementService, StockMovement } from '../modules/inventory/stock-movements.service';
import { toast } from 'sonner';
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
      toast.success(t('movementValidated'));
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => stockMovementService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success(t('movementCancelled'));
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const filteredMovements = movements.filter(mov =>
    mov.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mov.productName && mov.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: t('draft'), color: 'bg-slate-100 text-slate-700' },
      waiting: { label: t('pending'), color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: t('confirmed'), color: 'bg-blue-100 text-blue-700' },
      assigned: { label: t('assigned'), color: 'bg-indigo-100 text-indigo-700' },
      done: { label: t('done'), color: 'bg-emerald-100 text-emerald-700' },
      cancelled: { label: t('cancelled'), color: 'bg-red-100 text-red-700' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'delivery': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'internal': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'adjustment': return <Package className="w-4 h-4 text-amber-600" />;
      default: return <ArrowLeftRight className="w-4 h-4 text-slate-600" />;
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

  return (
    <AdminLayout>
      <PageHeader
        icon={ArrowLeftRight}
        title={t('stockMovements')}
        subtitle={t('stockMovementsSubtitle')}
      />

      {/* Filters and Actions Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchByReferenceOrProduct')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">{t('allTypes')}</option>
            <option value="receipt">{t('movementTypes.receipt')}</option>
            <option value="delivery">{t('movementTypes.delivery')}</option>
            <option value="internal">{t('movementTypes.internal')}</option>
            <option value="adjustment">{t('movementTypes.adjustment')}</option>
            <option value="production_in">{t('movementTypes.productionIn')}</option>
            <option value="production_out">{t('movementTypes.productionOut')}</option>
            <option value="return_in">Retour client</option>
            <option value="return_out">Retour fournisseur</option>
            <option value="scrap">Mise au rebut</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">{t('allStatuses')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="waiting">{t('pending')}</option>
            <option value="confirmed">{t('confirmed')}</option>
            <option value="assigned">{t('assigned')}</option>
            <option value="done">{t('done')}</option>
            <option value="cancelled">{t('cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="text-slate-600 mt-4">Chargement...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowLeftRight className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Aucun mouvement trouvé</p>
            <p className="text-sm text-slate-500">Les mouvements de stock apparaîtront ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Origine → Destination
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-semibold text-slate-800">
                        {movement.reference}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(movement.movementType)}
                        <span className="text-sm text-slate-700">{getTypeLabel(movement.movementType)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {movement.productName || `Produit #${movement.productId}`}
                        </p>
                        {movement.productCode && (
                          <p className="text-xs text-slate-500">{movement.productCode}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>{movement.sourceWarehouseName || (movement.sourceWarehouseId ? `Entrepôt ${movement.sourceWarehouseId}` : '-')}</span>
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>{movement.destWarehouseName || (movement.destWarehouseId ? `Entrepôt ${movement.destWarehouseId}` : '-')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-lg text-sm">
                        {parseFloat(movement.quantity.toString()).toFixed(2)} {movement.unitOfMeasureCode || 'U'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-slate-600">
                        {movement.dateDone 
                          ? new Date(movement.dateDone).toLocaleDateString('fr-FR')
                          : movement.dateScheduled
                          ? new Date(movement.dateScheduled).toLocaleDateString('fr-FR')
                          : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(movement.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {(movement.status === 'draft' || movement.status === 'waiting' || movement.status === 'confirmed') && (
                          <button
                            onClick={() => validateMutation.mutate(movement.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={t('validate')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedMovement(movement)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {movement.status !== 'done' && movement.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (confirm(t('confirmCancelMovement'))) {
                                cancelMutation.mutate(movement.id);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('cancel')}
                          >
                            <XCircle className="w-4 h-4" />
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
