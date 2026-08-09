import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { TabView, TabPanel } from 'primereact/tabview';
import { CheckCircle, XCircle, Clock, Search, X, UserRoundCheck, Inbox } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';
import {
  clientRequestsService,
  type ClientRequest,
  type ClientRequestStatus,
} from '../modules/client-requests';

const PER_PAGE = 20;

/** Tab index ↔ status filter. `undefined` = all statuses. */
const TABS: {
  status?: ClientRequestStatus;
  labelKey: 'pending' | 'approved' | 'rejected' | 'all';
}[] = [
  { status: 'pending', labelKey: 'pending' },
  { status: 'approved', labelKey: 'approved' },
  { status: 'rejected', labelKey: 'rejected' },
  { status: undefined, labelKey: 'all' },
];

const STATUS_COLORS: Record<ClientRequestStatus, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#d1fae5', color: '#047857' },
  rejected: { bg: '#fef2f2', color: '#dc2626' },
};

/**
 * Client access requests — accounts created from the customer portal that an
 * admin has to approve or decline before the client can log in.
 */
export default function ClientRequestsPage() {
  const { t, dir } = useLanguage();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<ClientRequest[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canDecide = hasPermission('users.edit');
  const status = TABS[activeTab].status;

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['client-requests', status ?? 'all', page, searchQuery],
    queryFn: () =>
      clientRequestsService.getAll({ page, pageSize: PER_PAGE, status, search: searchQuery }),
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['client-requests', 'pending-count'],
    queryFn: () => clientRequestsService.getPendingCount(),
  });

  const requests = useMemo(() => data?.requests ?? [], [data]);
  const totalRecords = data?.total ?? 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['client-requests'] });
    // The Users page lists the same accounts.
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const decideMutation = useMutation({
    mutationFn: ({ ids, decision }: { ids: number[]; decision: 'approved' | 'rejected' }) =>
      clientRequestsService.decideMany(ids, decision),
    onSuccess: (_data, variables) => {
      toastSuccess(variables.decision === 'approved' ? t('requestApproved') : t('requestDeclined'));
      setSelected([]);
      invalidate();
    },
    onError: (e: Error) => toastError(e.message),
  });

  const approve = (ids: number[]) => decideMutation.mutate({ ids, decision: 'approved' });

  const decline = (ids: number[]) =>
    toastConfirm(
      t('confirmDeclineRequest'),
      () => decideMutation.mutate({ ids, decision: 'rejected' }),
      {
        variant: 'destructive',
        confirmLabel: t('declineRequest'),
      },
    );

  const statusBadge = (request: ClientRequest) => {
    const s = STATUS_COLORS[request.status] ?? STATUS_COLORS.pending;
    return (
      <span
        style={{
          display: 'inline-flex',
          padding: '0.25rem 0.625rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: s.bg,
          color: s.color,
        }}
      >
        {t(request.status)}
      </span>
    );
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(dir === 'rtl' ? 'ar-MA' : 'fr-MA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const rowActions = (request: ClientRequest) => {
    if (!canDecide || request.status !== 'pending') return null;
    return (
      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
        <Button
          label={t('approveRequest')}
          icon={<CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />}
          size="small"
          severity="success"
          disabled={decideMutation.isPending}
          onClick={() => approve([request.id])}
        />
        <Button
          label={t('declineRequest')}
          icon={<XCircle style={{ width: '0.875rem', height: '0.875rem' }} />}
          size="small"
          severity="danger"
          outlined
          disabled={decideMutation.isPending}
          onClick={() => decline([request.id])}
        />
      </div>
    );
  };

  const selectedIds = selected.map((r) => r.id);
  const selectedPendingIds = selected.filter((r) => r.status === 'pending').map((r) => r.id);

  return (
    <AdminLayout>
      <PageHeader
        icon={UserRoundCheck}
        title={t('clientRequests')}
        subtitle={t('clientRequestsSubtitle')}
      />

      {/* ── Search ── */}
      <div style={{ margin: '1rem 0', maxWidth: '420px', position: 'relative' }}>
        <Search
          style={{
            position: 'absolute',
            insetInlineStart: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '1rem',
            height: '1rem',
            color: '#94a3b8',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <InputText
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('searchClientRequests')}
          style={{ width: '100%', paddingInlineStart: '2.25rem', paddingInlineEnd: '2.25rem' }}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            aria-label={t('clearSearch')}
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
            }}
          >
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        )}
      </div>

      <TabView
        activeIndex={activeTab}
        onTabChange={(e) => {
          setActiveTab(e.index);
          setPage(1);
          setSelected([]);
        }}
      >
        {TABS.map((tab) => (
          <TabPanel
            key={tab.labelKey}
            header={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {tab.status === 'pending' && (
                  <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
                )}
                {t(tab.labelKey)}
                {tab.status === 'pending' && pendingCount > 0 && (
                  <span
                    style={{
                      background: '#f59e0b',
                      color: '#fff',
                      borderRadius: '9999px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.05rem 0.4rem',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </span>
            }
          >
            {/* ── Mobile ── */}
            <div className="responsive-table-mobile">
              <MobileList
                items={requests}
                keyExtractor={(r: ClientRequest) => r.id}
                loading={isLoading}
                totalCount={totalRecords}
                countLabel={t('clientRequestsCountLabel')}
                emptyMessage={t('noClientRequests')}
                emptyIcon={Inbox}
                hasMore={page * PER_PAGE < totalRecords}
                onLoadMore={() => setPage((p) => p + 1)}
                selectedKeys={new Set(selectedIds)}
                onToggleSelect={(key) =>
                  setSelected((prev) =>
                    prev.some((r) => r.id === key)
                      ? prev.filter((r) => r.id !== key)
                      : [...prev, ...requests.filter((r) => r.id === key)],
                  )
                }
                config={{
                  topLeft: (r: ClientRequest) => r.name || r.customerName || '—',
                  topRight: (r: ClientRequest) => r.phoneNumber,
                  bottomLeft: (r: ClientRequest) => formatDate(r.dateCreated),
                  bottomRight: (r: ClientRequest) => statusBadge(r),
                }}
              />
            </div>

            {/* ── Desktop ── */}
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
                value={requests}
                loading={isLoading}
                paginator
                paginatorPosition="top"
                rows={PER_PAGE}
                totalRecords={totalRecords}
                lazy
                first={(page - 1) * PER_PAGE}
                onPage={(e) => setPage(Math.floor((e.first ?? 0) / PER_PAGE) + 1)}
                paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                currentPageReportTemplate={t('pageReportTemplate')}
                emptyMessage={<EmptyState icon={Inbox} title={t('noClientRequests')} />}
                dataKey="id"
                stripedRows
                selectionMode="checkbox"
                selection={selected}
                onSelectionChange={(e) => setSelected(e.value as ClientRequest[])}
              >
                <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                <Column
                  header={t('name')}
                  body={(r: ClientRequest) => r.name || r.customerName || '—'}
                />
                <Column field="phoneNumber" header={t('phoneNumber')} />
                <Column header={t('email')} body={(r: ClientRequest) => r.email || '—'} />
                <Column
                  header={t('requestedOn')}
                  body={(r: ClientRequest) => formatDate(r.dateCreated)}
                />
                <Column header={t('status')} body={statusBadge} />
                <Column body={rowActions} headerStyle={{ width: '16rem' }} />
              </DataTable>
            </div>
          </TabPanel>
        ))}
      </TabView>

      {canDecide && selected.length > 0 && (
        <FloatingActionBar
          selectedCount={selected.length}
          onClearSelection={() => setSelected([])}
          onSelectAll={() => setSelected(requests)}
          isAllSelected={selected.length === requests.length && requests.length > 0}
          totalCount={totalRecords}
          itemLabel={t('clientRequestsCountLabel')}
          actions={[
            {
              id: 'approve',
              label: t('bulkApprove'),
              icon: <CheckCircle style={{ width: '1rem', height: '1rem' }} />,
              variant: 'primary',
              hidden: selectedPendingIds.length === 0,
              onClick: () => approve(selectedPendingIds),
            },
            {
              id: 'decline',
              label: t('bulkDecline'),
              icon: <XCircle style={{ width: '1rem', height: '1rem' }} />,
              variant: 'danger',
              hidden: selectedPendingIds.length === 0,
              onClick: () => decline(selectedPendingIds),
            },
          ]}
        />
      )}
    </AdminLayout>
  );
}
