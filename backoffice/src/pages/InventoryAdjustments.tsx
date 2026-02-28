import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ClipboardCheck, Plus, Search, Filter, Eye, Play, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { NativeSelect } from '../components/ui/native-select';
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
      draft: { label: t('draft'), color: 'bg-slate-100 text-slate-700' },
      in_progress: { label: t('inProgress'), color: 'bg-blue-100 text-blue-700' },
      done: { label: t('validated'), color: 'bg-emerald-100 text-emerald-700' },
      cancelled: { label: t('cancelled'), color: 'bg-red-100 text-red-700' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              id="search-adjustments"
              type="text"
              placeholder={t('searchByReference')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leadingIcon={Search}
              fullWidth
              aria-label={t('searchByReference')}
            />
          </div>

          {/* Status Filter */}
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="in_progress">En cours</option>
            <option value="done">Validé</option>
            <option value="cancelled">Annulé</option>
          </NativeSelect>

          {/* Create Button */}
          <Button
            onClick={() => setShowCreateModal(true)}
            leadingIcon={Plus}
          >
            {t('newAdjustment')}
          </Button>
        </div>
      </div>

      {/* Adjustments List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="text-slate-600 mt-4">Chargement...</p>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">{t('noAdjustmentsFound')}</p>
            <p className="text-sm text-slate-500">{t('createFirstAdjustment')}</p>
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
                    Nom
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Entrepôt
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Lignes
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-semibold text-slate-800">
                        {adjustment.reference}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-700">{adjustment.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">{adjustment.warehouseName || `Entrepôt ${adjustment.warehouseId}`}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-slate-600">
                        {adjustment.adjustmentDate
                          ? new Date(adjustment.adjustmentDate).toLocaleDateString('fr-FR')
                          : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(adjustment.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-sm">
                        {adjustment.lines?.length || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {adjustment.status === 'draft' && (
                          <button
                            onClick={() => startCountingMutation.mutate(adjustment.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('start')}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {adjustment.status === 'in_progress' && (
                          <button
                            onClick={() => setSelectedAdjustment(adjustment)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={t('validate')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedAdjustment(adjustment)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {adjustment.status === 'draft' && (
                          <>
                            <button
                              onClick={() => cancelMutation.mutate(adjustment.id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title={t('cancel')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                toastConfirm(t('confirmDeleteAdjustment'), () => {
                                  deleteMutation.mutate(adjustment.id);
                                });
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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
