import { useState, useRef, useCallback } from 'react';
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
  Package,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag as PTag } from 'primereact/tag';
import { inventoryAdjustmentService } from '../modules/inventory/inventory-adjustments.service';
import { warehousesService } from '../modules/warehouses';
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
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', warehouseId: 0, notes: '' });
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'validate' | null>(null);
  const [validateLines, setValidateLines] = useState<
    Array<{
      productId: number;
      productName: string;
      productCode?: string;
      theoreticalQuantity: number;
      countedQuantity: number;
    }>
  >([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedRows, setSelectedRows] = useState<InventoryAdjustment[]>([]);
  const [validateSearch, setValidateSearch] = useState('');
  const [debouncedValidateSearch, setDebouncedValidateSearch] = useState('');
  const [validatePage, setValidatePage] = useState(1);
  const [validateTotal, setValidateTotal] = useState(0);
  const [validateWarehouseId, setValidateWarehouseId] = useState<number | null>(null);
  const validateSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesService.getAll(),
  });

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['inventory-adjustments', statusFilter, warehouseFilter],
    queryFn: () =>
      inventoryAdjustmentService.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        warehouseId: warehouseFilter !== 'all' ? parseInt(warehouseFilter) : undefined,
      }),
  });

  // Paginated product search for validate modal — only runs when user has typed a search term
  const { data: searchResult, isFetching: isFetchingSearch } = useQuery({
    queryKey: ['counting-list-search', validateWarehouseId, debouncedValidateSearch, validatePage],
    queryFn: () =>
      inventoryAdjustmentService.generateCountingList(validateWarehouseId!, {
        search: debouncedValidateSearch,
        page: validatePage,
        limit: 50,
      }),
    enabled: !!debouncedValidateSearch && validateWarehouseId !== null,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; warehouseId: number; notes?: string }) =>
      inventoryAdjustmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      toastSuccess(t('adjustmentCreated') || 'Ajustement créé avec succès');
      setShowCreateModal(false);
      setCreateForm({ name: '', warehouseId: 0, notes: '' });
    },
    onError: (error: Error) => {
      toastError(`${t('errorPrefix')}: ${error.message}`);
    },
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
    mutationFn: async (data: { adjustmentId: number; lines: Array<{ productId: number; theoreticalQuantity: number; countedQuantity: number }> }) => {
      const changedLines = data.lines.filter((l) => l.countedQuantity !== l.theoreticalQuantity);
      if (changedLines.length > 0) {
        await inventoryAdjustmentService.update(data.adjustmentId, { lines: changedLines } as any);
      }
      return inventoryAdjustmentService.validate({ adjustmentId: data.adjustmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      toastValidated(t('adjustmentValidatedSuccess'));
      closeDialog();
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

  const closeDialog = () => {
    setSelectedAdjustment(null);
    setDialogMode(null);
    setValidateLines([]);
    setValidateSearch('');
    setDebouncedValidateSearch('');
    setValidatePage(1);
    setValidateTotal(0);
    setValidateWarehouseId(null);
    if (validateSearchRef.current) clearTimeout(validateSearchRef.current);
  };

  const openViewDialog = async (adj: InventoryAdjustment) => {
    setSelectedAdjustment(adj);
    setDialogMode('view');
    setIsLoadingDetail(true);
    try {
      const fresh = await inventoryAdjustmentService.getById(adj.id);
      setSelectedAdjustment(fresh);
    } catch {
      // keep stale data if fetch fails
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const openValidateDialog = async (adj: InventoryAdjustment) => {
    setSelectedAdjustment(adj);
    setDialogMode('validate');
    setIsLoadingLines(true);
    setValidatePage(1);
    setValidateTotal(0);
    setValidateSearch('');
    setDebouncedValidateSearch('');
    if (validateSearchRef.current) clearTimeout(validateSearchRef.current);
    try {
      // Fetch adjustment details and counting list concurrently
      const [fresh, listing] = await Promise.all([
        inventoryAdjustmentService.getById(adj.id),
        inventoryAdjustmentService.generateCountingList(adj.warehouseId, { page: 1, limit: 50 }),
      ]);

      // Build initial lines: start from counting list (all products in warehouse),
      // then overlay any already-saved per-line counts from the adjustment
      const savedMap = new Map(
        (fresh.lines || []).map((l) => [l.productId, l]),
      );
      const items = (listing.data || []).map((item: any) => {
        const saved = savedMap.get(item.productId);
        return {
          productId: item.productId,
          productName: item.productName || `Produit #${item.productId}`,
          productCode: item.productCode,
          theoreticalQuantity: parseFloat(item.theoreticalQuantity) || 0,
          countedQuantity: saved?.countedQuantity ?? parseFloat(item.theoreticalQuantity) ?? 0,
        };
      });
      setValidateLines(items);
      setValidateTotal(listing.total || 0);
      setValidateWarehouseId(adj.warehouseId);
    } catch {
      toastError(t('errorPrefix') + ': impossible de charger les lignes');
      closeDialog();
    } finally {
      setIsLoadingLines(false);
    }
  };

  const handleValidateSearchChange = useCallback((value: string) => {
    setValidateSearch(value);
    setValidatePage(1);
    if (validateSearchRef.current) clearTimeout(validateSearchRef.current);
    if (!value) {
      // Cleared — immediately reset to pre-loaded data
      setDebouncedValidateSearch('');
    } else {
      validateSearchRef.current = setTimeout(() => setDebouncedValidateSearch(value), 500);
    }
  }, []);

  // Lines to display in validate modal:
  // - if search is active: use search results from API (preserve edited counts)
  // - otherwise: use pre-loaded validateLines
  const displayedLines = (() => {
    if (debouncedValidateSearch) {
      const apiItems = searchResult?.data || [];
      return apiItems.map((item: any) => {
        const edited = validateLines.find((l) => l.productId === item.productId);
        return {
          productId: item.productId,
          productName: item.productName || `Produit #${item.productId}`,
          productCode: item.productCode,
          theoreticalQuantity: parseFloat(item.theoreticalQuantity) || 0,
          countedQuantity: edited?.countedQuantity ?? parseFloat(item.theoreticalQuantity) ?? 0,
        };
      });
    }
    return validateLines;
  })();

  const isSearchFetching = isFetchingSearch && !!debouncedValidateSearch;

  const updateLine = (productId: number, countedQty: number) => {
    setValidateLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === productId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], countedQuantity: countedQty };
        return updated;
      }
      // Product not in list yet (from search result not in first page)
      const src = (searchResult?.data || []).find((d: any) => d.productId === productId);
      if (src) {
        return [
          ...prev,
          {
            productId: src.productId,
            productName: src.productName || `Produit #${src.productId}`,
            productCode: src.productCode,
            theoreticalQuantity: parseFloat(src.theoreticalQuantity) || 0,
            countedQuantity: countedQty,
          },
        ];
      }
      return prev;
    });
  };

  const clearSelection = () => setSelectedRows([]);
  const toggleSelectAll = () =>
    selectedRows.length === filteredAdjustments.length
      ? setSelectedRows([])
      : setSelectedRows(filteredAdjustments);

  const getStatusBadge = (status: string) => {
    const map: Record<
      string,
      { label: string; severity: 'secondary' | 'success' | 'danger' | 'warn' | 'info' | 'contrast' }
    > = {
      draft: { label: t('adjDraft'), severity: 'secondary' },
      in_progress: { label: t('adjInProgress'), severity: 'info' },
      done: { label: t('adjDone'), severity: 'success' },
      cancelled: { label: t('adjCancelled'), severity: 'danger' },
    };
    const cfg = map[status] || map.draft;
    return <PTag value={cfg.label} severity={cfg.severity} />;
  };

  const getWarehouseName = (adj: InventoryAdjustment) =>
    adj.warehouseName ||
    warehouses.find((w) => w.id === adj.warehouseId)?.name ||
    `Entrepôt #${adj.warehouseId}`;

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            {/* Search — 50% on desktop, 100% on mobile */}
            <div style={{ flex: '1 1 50%', minWidth: 0 }}>
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

            {/* Status Filter + Create Button — share remaining space */}
            <div style={{ flex: '1 1 40%', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Status Filter */}
              <Dropdown
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.value)}
                options={[
                  { label: t('allStatuses'), value: 'all' },
                  { label: t('adjDraft'), value: 'draft' },
                  { label: t('adjInProgress'), value: 'in_progress' },
                  { label: t('adjDone'), value: 'done' },
                  { label: t('adjCancelled'), value: 'cancelled' },
                ]}
                optionLabel="label"
                optionValue="value"
                style={{ flex: '1 1 10rem' }}
              />

              {/* Create Button */}
              <Button
                icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
                label={t('newAdjustment')}
                onClick={() => setShowCreateModal(true)}
              />
            </div>
          </div>
        </div>

        {/* Adjustments List */}
        <div className="responsive-table-mobile">
          <MobileList
            items={filteredAdjustments}
            keyExtractor={(adj: InventoryAdjustment) => adj.id}
            loading={isLoading}
            totalCount={filteredAdjustments.length}
            countLabel={t('inventoryAdjustments')}
            emptyMessage={t('noAdjustmentsFound')}
            config={{
              topLeft: (adj: InventoryAdjustment) => adj.reference,
              topRight: (adj: InventoryAdjustment) => getWarehouseName(adj),
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
              header={t('adjReference')}
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
              header={t('adjName')}
              sortable
              body={(adj: InventoryAdjustment) => (
                <span style={{ fontSize: '0.875rem', color: '#334155' }}>{adj.name}</span>
              )}
            />
            <Column
              field="warehouseName"
              header={t('adjWarehouse')}
              sortable
              body={(adj: InventoryAdjustment) => (
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  {getWarehouseName(adj)}
                </span>
              )}
            />
            <Column
              field="adjustmentDate"
              header={t('adjDate')}
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
              header={t('adjStatus')}
              sortable
              align="center"
              headerStyle={{ textAlign: 'center' }}
              body={(adj: InventoryAdjustment) => getStatusBadge(adj.status)}
            />
            <Column
              header={t('adjLines')}
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
                  label: t('startCounting'),
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
                  onClick: () => openValidateDialog(adj),
                  variant: 'primary' as const,
                });
              }
              acts.push({
                id: 'view',
                label: t('details'),
                icon: <Eye style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => openViewDialog(adj),
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
                    toastConfirm(t('confirmDeleteAdjustment') || 'Supprimer cet ajustement ?', () => {
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
                    toastConfirm(t('confirmDeleteAdjustment') || 'Supprimer ces ajustements ?', () => {
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

      {/* ─────────────── View / Detail Dialog ─────────────── */}
      <Dialog
        visible={dialogMode === 'view' && selectedAdjustment !== null}
        onHide={closeDialog}
        header={
          selectedAdjustment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                {selectedAdjustment.reference}
              </span>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {selectedAdjustment.name}
              </span>
            </div>
          ) : ''
        }
        modal
        dismissableMask
        style={{ width: '54rem', maxHeight: '90vh' }}
        footer={<Button label={t('close')} onClick={closeDialog} outlined />}
      >
        {isLoadingDetail ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '0.875rem' }}>{t('adjLoadingDetail')}</div>
          </div>
        ) : selectedAdjustment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Meta cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  {t('adjInfoWarehouse')}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                  {getWarehouseName(selectedAdjustment)}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  {t('adjInfoStatus')}
                </div>
                <div>{getStatusBadge(selectedAdjustment.status)}</div>
              </div>
              {selectedAdjustment.adjustmentDate && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    {t('adjInfoDate')}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                    {new Date(selectedAdjustment.adjustmentDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedAdjustment.notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#78350f' }}>
                <div style={{ fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', color: '#92400e' }}>
                  {t('adjInfoNotes')}
                </div>
                {selectedAdjustment.notes}
              </div>
            )}

            {/* Lines */}
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {t('adjLinesTitle')}
                <span style={{ background: '#e2e8f0', color: '#475569', borderRadius: '999px', padding: '0.125rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  {selectedAdjustment.lines?.length || 0}
                </span>
              </div>
              {selectedAdjustment.lines && selectedAdjustment.lines.length > 0 ? (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.625rem', overflow: 'hidden', maxHeight: '55vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: '14rem', maxWidth: '14rem', fontSize: '0.8125rem' }}>{t('adjProduct')}</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{t('adjTheoreticalQty')}</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{t('adjCountedQty')}</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>{t('adjDifference')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAdjustment.lines.map((line, i) => {
                        const diff = line.difference ?? (line.countedQuantity - line.theoreticalQuantity);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{line.productName || `#${line.productId}`}</div>
                              {line.productCode && (
                                <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.125rem' }}>{line.productCode}</div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#334155', fontSize: '0.875rem' }}>{line.theoreticalQuantity}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#334155', fontWeight: 500, fontSize: '0.875rem' }}>{line.countedQuantity}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                fontWeight: 700,
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                background: diff > 0 ? '#dcfce7' : diff < 0 ? '#fee2e2' : '#f1f5f9',
                                color: diff > 0 ? '#15803d' : diff < 0 ? '#dc2626' : '#94a3b8',
                              }}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem', background: '#f8fafc', borderRadius: '0.625rem', border: '1px dashed #e2e8f0' }}>
                  <Package style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p>{t('adjNoLines')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
      {/* ─────────────── Validate Dialog ─────────────── */}
      <Dialog
        visible={dialogMode === 'validate' && selectedAdjustment !== null}
        onHide={closeDialog}
        header={
          selectedAdjustment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                {selectedAdjustment.reference}
              </span>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {t('adjValidateTitle')}
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 400 }}>
                {getWarehouseName(selectedAdjustment)}
              </span>
            </div>
          ) : ''
        }
        modal
        dismissableMask
        style={{ width: '76rem', maxHeight: '92vh' }}
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button label={t('cancel')} onClick={closeDialog} outlined />
            <Button
              label={t('validateAdjustment')}
              icon={<CheckCircle2 style={{ width: '1rem', height: '1rem' }} />}
              loading={validateMutation.isPending}
              disabled={isLoadingLines}
              onClick={() => {
                if (!selectedAdjustment) return;
                // Merge all edited lines with displayed lines
                const allLines = [...validateLines];
                displayedLines.forEach((dl) => {
                  if (!allLines.find((l) => l.productId === dl.productId)) {
                    allLines.push(dl);
                  }
                });
                validateMutation.mutate({
                  adjustmentId: selectedAdjustment.id,
                  lines: allLines.map((l) => ({
                    productId: l.productId,
                    theoreticalQuantity: l.theoreticalQuantity,
                    countedQuantity: l.countedQuantity,
                  })),
                });
              }}
            />
          </div>
        }
      >
        {isLoadingLines ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            {t('adjLoadingProducts')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Subtitle */}
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              {t('adjValidateSubtitle')}
            </p>

            {/* Search bar */}
            <div style={{ position: 'relative' }}>
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
                value={validateSearch}
                onChange={(e) => handleValidateSearchChange(e.target.value)}
                placeholder={t('adjSearchProduct')}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Total info */}
            {validateTotal > 0 && (
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                {validateTotal} {t('adjTotalProducts')}
              </div>
            )}

            {/* Table */}
            {isSearchFetching ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                {t('adjLoadingProducts')}
              </div>
            ) : displayedLines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem', background: '#f8fafc', borderRadius: '0.625rem', border: '1px dashed #e2e8f0' }}>
                <Package style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p>{validateSearch ? t('adjNoProductsMatchSearch') : t('adjNoProductsFound')}</p>
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.625rem', overflow: 'hidden', maxHeight: '55vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: '14rem', maxWidth: '14rem' }}>{t('adjProduct')}</th>
                      <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', width: '9rem' }}>{t('adjTheoreticalQty')}</th>
                      <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', width: '10rem', borderLeft: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0' }}>{t('adjCountedQty')} <span style={{ color: '#ef4444' }}>*</span></th>
                      <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: '8rem' }}>{t('adjDifference')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLines.map((line) => {
                      const diff = line.countedQuantity - line.theoreticalQuantity;
                      return (
                        <tr key={line.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0.875rem', color: '#1e293b', width: '14rem', maxWidth: '14rem', overflow: 'hidden' }}>
                            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.productName}</div>
                            {line.productCode && (
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.productCode}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.875rem', textAlign: 'center', color: '#94a3b8', fontWeight: 500, width: '9rem' }}>
                            {line.theoreticalQuantity}
                          </td>
                          <td style={{ padding: 0, width: '10rem', borderLeft: '2px solid #f1f5f9', borderRight: '2px solid #f1f5f9', background: '#fafbff' }}>
                            <InputNumber
                              value={line.countedQuantity}
                              onValueChange={(e) => updateLine(line.productId, e.value ?? 0)}
                              min={0}
                              minFractionDigits={0}
                              maxFractionDigits={4}
                              style={{ width: '100%', display: 'block' }}
                              inputStyle={{ textAlign: 'center', width: '100%', border: 'none', borderRadius: 0, background: 'transparent', padding: '0.5rem 0.375rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.875rem', textAlign: 'center', width: '8rem' }}>
                            <span style={{
                              display: 'inline-block',
                              fontWeight: 700,
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem',
                              background: diff > 0 ? '#dcfce7' : diff < 0 ? '#fee2e2' : '#f1f5f9',
                              color: diff > 0 ? '#15803d' : diff < 0 ? '#dc2626' : '#94a3b8',
                            }}>
                              {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination — only for search results when total > 50 */}
            {debouncedValidateSearch && searchResult && searchResult.total > 50 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', paddingTop: '0.5rem' }}>
                <Button
                  label={t('previous')}
                  onClick={() => setValidatePage((p) => Math.max(1, p - 1))}
                  disabled={validatePage === 1}
                  outlined
                  size="small"
                />
                <span style={{ fontSize: '0.8125rem', color: '#64748b', padding: '0 0.5rem' }}>
                  {validatePage} / {Math.ceil(searchResult.total / 50)}
                </span>
                <Button
                  label={t('next')}
                  onClick={() => setValidatePage((p) => p + 1)}
                  disabled={validatePage >= Math.ceil(searchResult.total / 50)}
                  outlined
                  size="small"
                />
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* ─────────────── Create Adjustment Dialog ─────────────── */}
      <Dialog
        visible={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setCreateForm({ name: '', warehouseId: 0, notes: '' });
        }}
        header={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
              {t('createAdjustmentTitle')}
            </span>
          </div>
        }
        modal
        dismissableMask
        style={{ width: '36rem' }}
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              label={t('cancel')}
              onClick={() => {
                setShowCreateModal(false);
                setCreateForm({ name: '', warehouseId: 0, notes: '' });
              }}
              outlined
            />
            <Button
              label={t('create')}
              loading={createMutation.isPending}
              disabled={!createForm.name.trim() || !createForm.warehouseId}
              onClick={() => {
                if (!createForm.name.trim() || !createForm.warehouseId) return;
                createMutation.mutate({
                  name: createForm.name.trim(),
                  warehouseId: createForm.warehouseId,
                  notes: createForm.notes.trim() || undefined,
                });
              }}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.25rem' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              {t('adjustmentNameLabel')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <InputText
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder={t('adjustmentNamePlaceholder')}
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          {/* Warehouse */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              {t('adjWarehouse')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <Dropdown
              value={createForm.warehouseId || null}
              onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.value })}
              options={warehouses.map((wh) => ({ label: wh.name, value: wh.id }))}
              optionLabel="label"
              optionValue="value"
              placeholder={t('selectWarehouse')}
              style={{ width: '100%' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              {t('optionalNotes')}
            </label>
            <InputTextarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              rows={3}
              placeholder={t('adjNotesPlaceholder')}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  );
}
