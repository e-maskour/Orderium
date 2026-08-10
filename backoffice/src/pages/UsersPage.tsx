import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { TabView, TabPanel } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import {
  Users as UsersIcon,
  Shield,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import {
  usersService,
  type User,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserType,
} from '../modules/users';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { rolesService, type Role } from '../modules/roles';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';
import { useAccessLabels } from '../hooks/useAccessLabels';

export default function UsersPage() {
  const { t, dir } = useLanguage();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const perPage = 20;

  const currentUserType: UserType = activeTab === 0 ? 'admin' : 'client';

  // form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleIds, setFormRoleIds] = useState<number[]>([]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', currentUserType, page, searchQuery, roleFilter, statusFilter],
    queryFn: () =>
      usersService.getAll({
        page,
        perPage,
        search: searchQuery || undefined,
        userType: currentUserType,
        roleId: roleFilter !== 'all' ? (roleFilter as number) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
  });

  const roles: Role[] = rolesData ?? [];
  const { roleName: translatedRoleName } = useAccessLabels();

  const users: User[] = usersData?.users ?? [];
  const totalRecords = usersData?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (p: CreateUserPayload) => usersService.create(p),
    onSuccess: () => {
      toastSuccess(t('userCreated'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (e: any) => toastError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      usersService.update(id, payload),
    onSuccess: () => {
      toastSuccess(t('userUpdated'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (e: any) => toastError(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? usersService.activate(id) : usersService.deactivate(id),
    onSuccess: (_data, variables) => {
      toastSuccess(variables.active ? t('userActivated') : t('userDeactivated'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.remove(id),
    onSuccess: () => {
      toastSuccess(t('userDeleted'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toastError(e.message),
  });

  const approveUserMutation = useMutation({
    mutationFn: (id: number) => usersService.approve(id),
    onSuccess: () => {
      toastSuccess(t('userApproved'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toastError(e.message),
  });

  const rejectUserMutation = useMutation({
    mutationFn: (id: number) => usersService.reject(id),
    onSuccess: () => {
      toastSuccess(t('userRejected'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toastError(e.message),
  });

  const openCreate = () => {
    setEditingUser(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormRoleIds([]);
    setFormStatus('active');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormPhone(user.phoneNumber || '');
    setFormEmail(user.email || '');
    setFormPassword('');
    setFormRoleIds((user.roles ?? []).map((r) => r.id));
    setFormStatus(user.isActive ? 'active' : 'inactive');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toastError(t('nameRequired2'));
      return;
    }
    if (!formPhone.trim()) {
      toastError(t('phoneRequired'));
      return;
    }
    if (!editingUser && formPassword.length < 8) {
      toastError(t('passwordMinLength'));
      return;
    }

    if (editingUser) {
      const payload: UpdateUserPayload = {
        name: formName,
        phoneNumber: formPhone,
        email: formEmail || null,
        status: formStatus,
        roleIds: formRoleIds,
      };
      if (formPassword.length >= 8) payload.password = formPassword;
      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      createMutation.mutate({
        name: formName,
        phoneNumber: formPhone,
        email: formEmail || null,
        password: formPassword,
        status: formStatus,
        userType: currentUserType,
        roleIds: formRoleIds,
        isAdmin: currentUserType === 'admin',
        isCustomer: currentUserType === 'client',
      });
    }
  };

  const handleDelete = (user: User) => {
    if (user.id === admin?.id) {
      toastError(t('cannotDeleteSelf'));
      return;
    }
    toastConfirm(t('confirmDeleteUser'), () => deleteMutation.mutate(user.id));
  };

  const handleToggleActive = (user: User) => {
    if (user.id === admin?.id && user.isActive) {
      toastError(t('cannotDeactivateSelf'));
      return;
    }
    const isDeactivating = user.isActive;
    if (isDeactivating) {
      toastConfirm(
        t('confirmDeactivateUser'),
        () => toggleActiveMutation.mutate({ id: user.id, active: false }),
        { variant: 'warning', confirmLabel: t('deactivate') },
      );
    } else {
      toggleActiveMutation.mutate({ id: user.id, active: true });
    }
  };

  const statusTemplate = (user: User) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '50%',
          background: user.isActive ? '#22c55e' : '#ef4444',
          boxShadow: user.isActive ? '0 0 6px rgba(34,197,94,0.4)' : '0 0 6px rgba(239,68,68,0.4)',
        }}
      />
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: user.isActive ? '#16a34a' : '#dc2626',
        }}
      >
        {user.isActive ? t('active') : t('inactive')}
      </span>
    </div>
  );

  const portalStatusColors: Record<
    string,
    { bg: string; color: string; border: string; icon: typeof Clock }
  > = {
    pending: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', icon: Clock },
    approved: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', icon: CheckCircle },
    rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', icon: XCircle },
  };

  const handlePortalStatusChange = (user: User, newStatus: string) => {
    if (newStatus === user.status) return;
    if (newStatus === 'approved') {
      approveUserMutation.mutate(user.id);
    } else if (newStatus === 'rejected') {
      toastConfirm(t('confirmRejectUser'), () => rejectUserMutation.mutate(user.id), {
        variant: 'destructive',
        confirmLabel: t('reject'),
      });
    }
  };

  const portalStatusTemplate = (user: User) => {
    const status = user.status || 'pending';
    const statuses = [
      { value: 'pending', icon: Clock },
      { value: 'approved', icon: CheckCircle },
      { value: 'rejected', icon: XCircle },
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {statuses.map(({ value, icon: Icon }) => {
          const s = portalStatusColors[value];
          const isActive = status === value;
          return (
            <button
              key={value}
              title={t(value as any) || value}
              onClick={() => handlePortalStatusChange(user, value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.875rem',
                height: '1.875rem',
                borderRadius: '0.375rem',
                border: `1.5px solid ${isActive ? s.border : '#e2e8f0'}`,
                background: isActive ? s.bg : '#f8fafc',
                color: isActive ? s.color : '#94a3b8',
                cursor: value === status ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon style={{ width: '0.875rem', height: '0.875rem' }} />
            </button>
          );
        })}
      </div>
    );
  };

  const roleTemplate = (user: User) => {
    const held = user.roles ?? [];
    if (!held.length)
      return <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>{t('userNoRoles')}</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {held.map((role) => (
          <Tag
            key={role.id}
            value={role.isSuperAdmin ? t('superAdminBadge') : translatedRoleName(role.name)}
            style={{
              background: role.isSuperAdmin
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(35,90,228,0.1)',
              color: role.isSuperAdmin ? '#fff' : '#235ae4',
              border: role.isSuperAdmin ? 'none' : '1px solid rgba(35,90,228,0.2)',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '0.375rem',
              padding: '0.2rem 0.5rem',
            }}
          />
        ))}
      </div>
    );
  };

  const actionsTemplate = (user: User) => (
    <div style={{ display: 'flex', gap: '0.375rem' }}>
      <Button
        icon={<Pencil style={{ width: '0.875rem', height: '0.875rem' }} />}
        text
        rounded
        onClick={() => openEdit(user)}
        style={{ width: '2rem', height: '2rem', color: '#235ae4' }}
      />
      <Button
        icon={
          user.isActive ? (
            <UserX style={{ width: '0.875rem', height: '0.875rem' }} />
          ) : (
            <UserCheck style={{ width: '0.875rem', height: '0.875rem' }} />
          )
        }
        text
        rounded
        onClick={() => handleToggleActive(user)}
        style={{ width: '2rem', height: '2rem', color: user.isActive ? '#f59e0b' : '#22c55e' }}
      />
      <Button
        icon={<Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />}
        text
        rounded
        severity="danger"
        onClick={() => handleDelete(user)}
        style={{ width: '2rem', height: '2rem' }}
      />
    </div>
  );

  const clearUserSelection = () => setSelectedUsers([]);
  const toggleSelectAllUsers = () =>
    selectedUsers.length === users.length ? setSelectedUsers([]) : setSelectedUsers(users);

  const renderTable = () => (
    <>
      <div className="responsive-table-mobile">
        <MobileList
          items={users}
          keyExtractor={(u: User) => u.id}
          loading={isLoading}
          totalCount={totalRecords}
          countLabel={t('usersCountLabel')}
          emptyMessage={t('noUsersFound')}
          hasMore={page * perPage < totalRecords}
          onLoadMore={() => setPage((p) => p + 1)}
          onTap={(u: User) => openEdit(u)}
          selectedKeys={new Set(selectedUsers.map((u) => u.id))}
          onToggleSelect={(key) =>
            setSelectedUsers((prev) => {
              // MobileList hands back the key from `keyExtractor`, not the row.
              if (prev.some((x) => x.id === key)) return prev.filter((x) => x.id !== key);
              const user = users.find((u: User) => u.id === key);
              return user ? [...prev, user] : prev;
            })
          }
          config={{
            topLeft: (u: User) => u.name || u.email || '—',
            topRight: (u: User) => u.phoneNumber || '',
            bottomLeft: (u: User) => u.role?.name || '—',
            bottomRight: (u: User) => {
              if (currentUserType === 'client') {
                const status = u.status || 'pending';
                const colors: Record<string, { bg: string; color: string }> = {
                  pending: { bg: '#fef9c3', color: '#a16207' },
                  approved: { bg: '#d1fae5', color: '#047857' },
                  rejected: { bg: '#fef2f2', color: '#dc2626' },
                };
                const s = colors[status] || colors.pending;
                const labels: Record<string, string> = {
                  pending: t('pending'),
                  approved: t('approved'),
                  rejected: t('rejected'),
                };
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
                    {labels[status]}
                  </span>
                );
              }
              return (
                <span
                  style={{
                    display: 'inline-flex',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    ...(u.isActive
                      ? { background: '#d1fae5', color: '#047857' }
                      : { background: '#fef2f2', color: '#dc2626' }),
                  }}
                >
                  {u.isActive ? 'Actif' : 'Inactif'}
                </span>
              );
            },
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
          value={users}
          loading={isLoading}
          paginator
          paginatorPosition="top"
          rows={perPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          totalRecords={totalRecords}
          lazy
          first={(page - 1) * perPage}
          onPage={(e) => setPage(Math.floor((e.first ?? 0) / perPage) + 1)}
          paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate={t('pageReportTemplate')}
          emptyMessage={<EmptyState icon={UsersIcon} title={t('noResults')} />}
          dataKey="id"
          stripedRows
          selectionMode="checkbox"
          selection={selectedUsers}
          onSelectionChange={(e) => setSelectedUsers(e.value as User[])}
          onRowClick={(e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (target.closest('button') || target.closest('a') || target.closest('.p-checkbox'))
              return;
            const selCol = target.closest('.p-selection-column');
            if (selCol) {
              (selCol.querySelector('.p-checkbox-box') as HTMLElement)?.click();
              return;
            }
            openEdit(e.data as User);
          }}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
          <Column
            header={t('name')}
            field="name"
            body={(user: User) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {(user.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                    {user.name}
                  </div>
                  {user.email && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
                  )}
                </div>
              </div>
            )}
            style={{ minWidth: '14rem' }}
          />
          <Column
            header={t('phone')}
            field="phoneNumber"
            style={{ minWidth: '9rem' }}
            body={(user: User) => (
              <span
                style={{ fontSize: '0.8125rem', color: '#475569', fontFamily: 'var(--font-latin)' }}
              >
                {user.phoneNumber}
              </span>
            )}
          />
          <Column header={t('role')} body={roleTemplate} style={{ minWidth: '8rem' }} />
          <Column
            header={t('status')}
            body={currentUserType === 'client' ? portalStatusTemplate : statusTemplate}
            style={{ minWidth: currentUserType === 'client' ? '7rem' : '7rem' }}
          />
        </DataTable>
      </div>
    </>
  );

  const roleOptions = roles.map((r) => ({
    label: r.isSuperAdmin ? `⭐ ${translatedRoleName(r.name)}` : translatedRoleName(r.name),
    value: r.id,
  }));

  return (
    <AdminLayout>
      <div
        dir={dir}
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
          <PageHeader
            icon={UsersIcon}
            title={t('usersManagement')}
            subtitle={t('usersAndRoles')}
            actions={
              <Button
                icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
                label={t('createUser')}
                onClick={openCreate}
              />
            }
          />
        </div>

        {/* Filter bar */}
        <div
          className="page-quick-search products-filter-row"
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            width: '100%',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: '12rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('search')}
            </span>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  insetInlineStart: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  width: '1rem',
                  height: '1rem',
                  pointerEvents: 'none',
                }}
              />
              <InputText
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`${t('search')}...`}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '0.875rem',
                  paddingInlineStart: '2.5rem',
                  paddingInlineEnd: searchInput ? '2.5rem' : '0.875rem',
                  borderRadius: '0.625rem',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                }}
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
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
                    alignItems: 'center',
                    padding: '0.25rem',
                  }}
                >
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>
              )}
            </div>
          </div>

          <div className="orders-filter-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('role')}
              </span>
              <Dropdown
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.value);
                  setPage(1);
                }}
                options={[
                  { label: t('all'), value: 'all' },
                  ...roles.map((r) => ({ label: r.name, value: r.id })),
                ]}
                style={{ height: '3rem', minWidth: '9rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('status')}
              </span>
              <Dropdown
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.value);
                  setPage(1);
                }}
                options={[
                  { label: t('all'), value: 'all' },
                  { label: t('active'), value: 'active' },
                  { label: t('inactive'), value: 'inactive' },
                ]}
                style={{ height: '3rem', minWidth: '9rem', fontSize: '0.875rem', width: '100%' }}
              />
            </div>
          </div>
        </div>
        <TabView
          activeIndex={activeTab}
          onTabChange={(e) => {
            setActiveTab(e.index);
            setPage(1);
            setSearchInput('');
            setSearchQuery('');
            setRoleFilter('all');
            setStatusFilter('all');
          }}
          pt={{
            root: { className: 'product-tabview' },
            panelContainer: { style: { padding: '0.75rem 0 0', background: 'transparent' } },
            nav: { style: { background: 'transparent' } },
          }}
        >
          <TabPanel
            header={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="pi pi-shield" style={{ fontSize: '0.85rem' }} />
                {t('adminUsers')}
              </span>
            }
          >
            {renderTable()}
          </TabPanel>
          <TabPanel
            header={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="pi pi-users" style={{ fontSize: '0.85rem' }} />
                {t('clientUsers')}
              </span>
            }
          >
            {renderTable()}
          </TabPanel>
        </TabView>

        {/* ── Create / Edit Modal ── */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingUser ? t('editUser') : t('createUser')}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button label={t('cancel')} onClick={closeModal} text style={{ color: '#64748b' }} />
              <Button
                label={editingUser ? t('update') : t('create')}
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                  border: 'none',
                  borderRadius: '0.625rem',
                  fontWeight: 600,
                }}
              />
            </div>
          }
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}
          >
            <div>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'block',
                  marginBottom: '0.375rem',
                }}
              >
                {t('name')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <InputText
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    display: 'block',
                    marginBottom: '0.375rem',
                  }}
                >
                  {t('phone')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <InputText
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    display: 'block',
                    marginBottom: '0.375rem',
                  }}
                >
                  {t('email')}
                </label>
                <InputText
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'block',
                  marginBottom: '0.375rem',
                }}
              >
                {editingUser ? t('newPassword') : t('password')}{' '}
                {!editingUser && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <InputText
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingUser ? `(${t('newPassword')})` : ''}
                style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    display: 'block',
                    marginBottom: '0.375rem',
                  }}
                >
                  {t('userRoles')}
                </label>
                <MultiSelect
                  value={formRoleIds}
                  options={roles.map((r) => ({
                    label: translatedRoleName(r.name),
                    value: r.id,
                  }))}
                  onChange={(e) => setFormRoleIds(e.value as number[])}
                  display="chip"
                  filter
                  placeholder={t('userNoRoles')}
                  style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                />
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#94a3b8' }}>
                  {t('userRolesHelp')}
                </small>
              </div>
              <div>
                <label
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    display: 'block',
                    marginBottom: '0.375rem',
                  }}
                >
                  {t('status')}
                </label>
                <Dropdown
                  value={formStatus}
                  options={[
                    { label: t('active'), value: 'active' },
                    { label: t('inactive'), value: 'inactive' },
                  ]}
                  onChange={(e) => setFormStatus(e.value)}
                  style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                />
              </div>
            </div>
          </div>
        </Modal>
      </div>

      <FloatingActionBar
        selectedCount={selectedUsers.length}
        onClearSelection={clearUserSelection}
        onSelectAll={toggleSelectAllUsers}
        isAllSelected={selectedUsers.length === users.length && users.length > 0}
        totalCount={totalRecords}
        itemLabel={t('userCountLabel')}
        actions={[
          ...(selectedUsers.length === 1
            ? [
                {
                  id: 'edit',
                  label: t('edit'),
                  icon: <Pencil style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => openEdit(selectedUsers[0]),
                  variant: 'secondary' as const,
                },
                {
                  id: 'toggle',
                  label: selectedUsers[0].isActive ? t('deactivate') : t('activate'),
                  icon: selectedUsers[0].isActive ? (
                    <UserX style={{ width: '0.875rem', height: '0.875rem' }} />
                  ) : (
                    <UserCheck style={{ width: '0.875rem', height: '0.875rem' }} />
                  ),
                  onClick: () => handleToggleActive(selectedUsers[0]),
                  variant: 'secondary' as const,
                },
              ]
            : []),
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
            onClick: () => {
              if (selectedUsers.length === 1) {
                handleDelete(selectedUsers[0]);
              } else {
                const deletable = selectedUsers.filter((u) => u.id !== admin?.id);
                toastConfirm(
                  t('confirmDeleteUsersPlural').replace('{count}', String(deletable.length)),
                  () => {
                    deletable.forEach((u) => deleteMutation.mutate(u.id));
                    clearUserSelection();
                  },
                );
              }
            },
            variant: 'danger' as const,
          },
        ]}
      />
    </AdminLayout>
  );
}
