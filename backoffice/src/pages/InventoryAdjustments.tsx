import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { ClipboardCheck, Plus, Search, Filter, Eye, Play, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
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
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="animate-spin" style={{ borderRadius: '9999px', width: '3rem', height: '3rem', borderBottom: '2px solid #f59e0b', margin: '0 auto' }}></div>
            <p style={{ color: '#475569', marginTop: '1rem' }}>Chargement...</p>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <ClipboardCheck style={{ width: '4rem', height: '4rem', color: '#cbd5e1', margin: '0 auto', marginBottom: '1rem' }} />
            <p style={{ color: '#475569', marginBottom: '0.5rem' }}>{t('noAdjustmentsFound')}</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('createFirstAdjustment')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ textAlign: 'left', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Référence
                  </th>
                  <th style={{ textAlign: 'left', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nom
                  </th>
                  <th style={{ textAlign: 'left', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Entrepôt
                  </th>
                  <th style={{ textAlign: 'center', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Date
                  </th>
                  <th style={{ textAlign: 'center', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Statut
                  </th>
                  <th style={{ textAlign: 'center', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Lignes
                  </th>
                  <th style={{ textAlign: 'right', paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {adjustment.reference}
                      </span>
                    </td>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#334155' }}>{adjustment.name}</span>
                    </td>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>{adjustment.warehouseName || `Entrepôt ${adjustment.warehouseId}`}</span>
                    </td>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                        {adjustment.adjustmentDate
                          ? new Date(adjustment.adjustmentDate).toLocaleDateString('fr-FR')
                          : '-'}
                      </span>
                    </td>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center' }}>
                      {getStatusBadge(adjustment.status)}
                    </td>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#334155', fontWeight: 700, paddingLeft: '0.625rem', paddingRight: '0.625rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        {adjustment.lines?.length || 0}
                      </span>
                    </td>
                    <td style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {adjustment.status === 'draft' && (
                          <button
                            onClick={() => startCountingMutation.mutate(adjustment.id)}
                            style={{ padding: '0.375rem', color: '#2563eb', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title={t('start')}
                          >
                            <Play style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                        {adjustment.status === 'in_progress' && (
                          <button
                            onClick={() => setSelectedAdjustment(adjustment)}
                            style={{ padding: '0.375rem', color: '#059669', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title={t('validate')}
                          >
                            <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedAdjustment(adjustment)}
                          style={{ padding: '0.375rem', color: '#475569', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          title={t('details')}
                        >
                          <Eye style={{ width: '1rem', height: '1rem' }} />
                        </button>
                        {adjustment.status === 'draft' && (
                          <>
                            <button
                              onClick={() => cancelMutation.mutate(adjustment.id)}
                              style={{ padding: '0.375rem', color: '#ea580c', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              title={t('cancel')}
                            >
                              <XCircle style={{ width: '1rem', height: '1rem' }} />
                            </button>
                            <button
                              onClick={() => {
                                toastConfirm(t('confirmDeleteAdjustment'), () => {
                                  deleteMutation.mutate(adjustment.id);
                                });
                              }}
                              style={{ padding: '0.375rem', color: '#dc2626', borderRadius: '0.5rem', transition: 'background-color 0.15s', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              title={t('delete')}
                            >
                              <Trash2 style={{ width: '1rem', height: '1rem' }} />
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
