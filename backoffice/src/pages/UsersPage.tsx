import { useState } from 'react';
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
import { TabView, TabPanel } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Users as UsersIcon, Shield, Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { usersService, type User, type CreateUserPayload, type UpdateUserPayload, type UserType } from '../modules/users';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { rolesService, type Role } from '../modules/roles';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';

export default function UsersPage() {
    const { t, dir } = useLanguage();
    const { admin } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
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
    const [formRoleId, setFormRoleId] = useState<number | null>(null);
    const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

    const { data: usersData, isLoading } = useQuery({
        queryKey: ['users', currentUserType, page, searchQuery],
        queryFn: () =>
            usersService.getAll({
                page,
                perPage,
                search: searchQuery || undefined,
                userType: currentUserType,
            }),
    });

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rolesService.getAll(),
    });

    const roles: Role[] = rolesData ?? [];
    const users: User[] = usersData?.users ?? [];
    const totalRecords = usersData?.total ?? 0;

    const createMutation = useMutation({
        mutationFn: (p: CreateUserPayload) => usersService.create(p),
        onSuccess: () => {
            toastSuccess(t('userCreated' as any));
            queryClient.invalidateQueries({ queryKey: ['users'] });
            closeModal();
        },
        onError: (e: any) => toastError(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
            usersService.update(id, payload),
        onSuccess: () => {
            toastSuccess(t('userUpdated' as any));
            queryClient.invalidateQueries({ queryKey: ['users'] });
            closeModal();
        },
        onError: (e: any) => toastError(e.message),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, active }: { id: number; active: boolean }) =>
            active ? usersService.activate(id) : usersService.deactivate(id),
        onSuccess: (_data, variables) => {
            toastSuccess(variables.active ? t('userActivated' as any) : t('userDeactivated' as any));
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (e: any) => toastError(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => usersService.remove(id),
        onSuccess: () => {
            toastSuccess(t('userDeleted' as any));
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
        setFormRoleId(null);
        setFormStatus('active');
        setShowModal(true);
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setFormName(user.name || '');
        setFormPhone(user.phoneNumber || '');
        setFormEmail(user.email || '');
        setFormPassword('');
        setFormRoleId(user.roleId);
        setFormStatus(user.isActive ? 'active' : 'inactive');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const handleSubmit = () => {
        if (!formName.trim()) { toastError(t('nameRequired2' as any)); return; }
        if (!formPhone.trim()) { toastError(t('phoneRequired' as any)); return; }
        if (!editingUser && formPassword.length < 8) { toastError(t('passwordMinLength' as any)); return; }

        if (editingUser) {
            const payload: UpdateUserPayload = {
                name: formName,
                phoneNumber: formPhone,
                email: formEmail || undefined,
                status: formStatus,
                roleId: formRoleId,
            };
            if (formPassword.length >= 8) payload.password = formPassword;
            updateMutation.mutate({ id: editingUser.id, payload });
        } else {
            createMutation.mutate({
                name: formName,
                phoneNumber: formPhone,
                email: formEmail || undefined,
                password: formPassword,
                status: formStatus,
                userType: currentUserType,
                roleId: formRoleId ?? undefined,
                isAdmin: currentUserType === 'admin',
                isCustomer: currentUserType === 'client',
            });
        }
    };

    const handleDelete = (user: User) => {
        if (user.id === admin?.id) { toastError(t('cannotDeleteSelf' as any)); return; }
        toastConfirm(t('confirmDeleteUser' as any), () => deleteMutation.mutate(user.id));
    };

    const handleToggleActive = (user: User) => {
        if (user.id === admin?.id && user.isActive) { toastError(t('cannotDeactivateSelf' as any)); return; }
        toggleActiveMutation.mutate({ id: user.id, active: !user.isActive });
    };

    const statusTemplate = (user: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
                width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                background: user.isActive ? '#22c55e' : '#ef4444',
                boxShadow: user.isActive ? '0 0 6px rgba(34,197,94,0.4)' : '0 0 6px rgba(239,68,68,0.4)',
            }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: user.isActive ? '#16a34a' : '#dc2626' }}>
                {user.isActive ? t('active' as any) : t('inactive' as any)}
            </span>
        </div>
    );

    const roleTemplate = (user: User) => {
        if (!user.role) return <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>—</span>;
        return (
            <Tag
                value={user.role.isSuperAdmin ? t('superAdminBadge' as any) : user.role.name}
                style={{
                    background: user.role.isSuperAdmin
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'rgba(35,90,228,0.1)',
                    color: user.role.isSuperAdmin ? '#fff' : '#235ae4',
                    border: user.role.isSuperAdmin ? 'none' : '1px solid rgba(35,90,228,0.2)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.375rem',
                    padding: '0.2rem 0.5rem',
                }}
            />
        );
    };

    const actionsTemplate = (user: User) => (
        <div style={{ display: 'flex', gap: '0.375rem' }}>
            <Button
                icon={<Pencil style={{ width: '0.875rem', height: '0.875rem' }} />}
                text rounded
                onClick={() => openEdit(user)}
                style={{ width: '2rem', height: '2rem', color: '#235ae4' }}
            />
            <Button
                icon={user.isActive
                    ? <UserX style={{ width: '0.875rem', height: '0.875rem' }} />
                    : <UserCheck style={{ width: '0.875rem', height: '0.875rem' }} />
                }
                text rounded
                onClick={() => handleToggleActive(user)}
                style={{ width: '2rem', height: '2rem', color: user.isActive ? '#f59e0b' : '#22c55e' }}
            />
            <Button
                icon={<Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                text rounded
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
                    countLabel="utilisateurs"
                    emptyMessage="Aucun utilisateur trouvé"
                    hasMore={page * perPage < totalRecords}
                    onLoadMore={() => setPage((p) => p + 1)}
                    config={{
                        topLeft: (u: User) => u.name || u.email || '—',
                        topRight: (u: User) => u.phoneNumber || '',
                        bottomLeft: (u: User) => u.role?.name || '—',
                        bottomRight: (u: User) => (
                            <span style={{ display: 'inline-flex', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...(u.isActive ? { background: '#d1fae5', color: '#047857' } : { background: '#fef2f2', color: '#dc2626' }) }}>
                                {u.isActive ? 'Actif' : 'Inactif'}
                            </span>
                        ),
                    }}
                />
            </div>
            <div className="responsive-table-desktop" style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
                    paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                    currentPageReportTemplate="{first}-{last} of {totalRecords}"
                    emptyMessage={t('noResults' as any) || 'No users found'}
                    dataKey="id"
                    stripedRows
                    selectionMode="checkbox"
                    selection={selectedUsers}
                    onSelectionChange={(e) => setSelectedUsers(e.value as User[])}
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                    <Column
                        header={t('name' as any)}
                        field="name"
                        body={(user: User) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <div style={{
                                    width: '2rem', height: '2rem', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                                }}>
                                    {(user.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{user.name}</div>
                                    {user.email && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>}
                                </div>
                            </div>
                        )}
                        style={{ minWidth: '14rem' }}
                    />
                    <Column
                        header={t('phone' as any)}
                        field="phoneNumber"
                        style={{ minWidth: '9rem' }}
                        body={(user: User) => (
                            <span style={{ fontSize: '0.8125rem', color: '#475569', fontFamily: 'var(--font-latin)' }}>{user.phoneNumber}</span>
                        )}
                    />
                    <Column header={t('role' as any)} body={roleTemplate} style={{ minWidth: '8rem' }} />
                    <Column header={t('status' as any)} body={statusTemplate} style={{ minWidth: '7rem' }} />
                </DataTable>
            </div>
        </>
    );

    const roleOptions = roles.map((r) => ({ label: r.isSuperAdmin ? `⭐ ${r.name}` : r.name, value: r.id }));

    return (
        <AdminLayout>
            <div dir={dir} className="page-container">
                <PageHeader
                    icon={UsersIcon}
                    title={t('usersManagement' as any)}
                    subtitle={t('usersAndRoles' as any)}
                    actions={
                        <Button
                            icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
                            label={t('createUser' as any)}
                            onClick={openCreate}
                            style={{
                                background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                                border: 'none',
                                borderRadius: '0.625rem',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                padding: '0.5rem 1rem',
                            }}
                        />
                    }
                />

                <div style={{ marginTop: '1rem' }}>
                    {/* Search bar */}
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span className="p-input-icon-left" style={{ flex: 1, minWidth: '16rem' }}>
                            <i className="pi pi-search" style={{ left: '0.75rem', color: '#94a3b8' }} />
                            <InputText
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                placeholder={`${t('search' as any)}...`}
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.5rem',
                                    borderRadius: '0.625rem',
                                    border: '1.5px solid #e2e8f0',
                                    height: '2.5rem',
                                    fontSize: '0.8125rem',
                                }}
                            />
                        </span>
                    </div>

                    {/* Tabs */}
                    <TabView
                        activeIndex={activeTab}
                        onTabChange={(e) => { setActiveTab(e.index); setPage(1); setSearchQuery(''); }}
                    >
                        <TabPanel
                            header={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield style={{ width: '1rem', height: '1rem' }} />
                                    <span>{t('adminUsers' as any)}</span>
                                </div>
                            }
                        >
                            {renderTable()}
                        </TabPanel>
                        <TabPanel
                            header={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <UsersIcon style={{ width: '1rem', height: '1rem' }} />
                                    <span>{t('clientUsers' as any)}</span>
                                </div>
                            }
                        >
                            {renderTable()}
                        </TabPanel>
                    </TabView>
                </div>

                {/* ── Create / Edit Modal ── */}
                <Modal
                    isOpen={showModal}
                    onClose={closeModal}
                    title={editingUser ? t('editUser' as any) : t('createUser' as any)}
                    size="md"
                    footer={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <Button
                                label={t('cancel' as any)}
                                onClick={closeModal}
                                text
                                style={{ color: '#64748b' }}
                            />
                            <Button
                                label={editingUser ? t('update' as any) : t('create' as any)}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                        <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                                {t('name' as any)} <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <InputText
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                                    {t('phone' as any)} <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <InputText
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                                    {t('email' as any)}
                                </label>
                                <InputText
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                                {editingUser ? t('newPassword' as any) : t('password' as any)} {!editingUser && <span style={{ color: '#ef4444' }}>*</span>}
                            </label>
                            <InputText
                                type="password"
                                value={formPassword}
                                onChange={(e) => setFormPassword(e.target.value)}
                                placeholder={editingUser ? `(${t('newPassword' as any)})` : ''}
                                style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                                    {t('role' as any)}
                                </label>
                                <Dropdown
                                    value={formRoleId}
                                    options={roleOptions}
                                    onChange={(e) => setFormRoleId(e.value)}
                                    placeholder={t('noRole' as any)}
                                    showClear
                                    style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                                    {t('status' as any)}
                                </label>
                                <Dropdown
                                    value={formStatus}
                                    options={[
                                        { label: t('active' as any), value: 'active' },
                                        { label: t('inactive' as any), value: 'inactive' },
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
                itemLabel="utilisateur"
                actions={[
                    ...(selectedUsers.length === 1 ? [
                        {
                            id: 'edit',
                            label: t('edit' as any),
                            icon: <Pencil style={{ width: '0.875rem', height: '0.875rem' }} />,
                            onClick: () => openEdit(selectedUsers[0]),
                            variant: 'secondary' as const,
                        },
                        {
                            id: 'toggle',
                            label: selectedUsers[0].isActive ? t('deactivate' as any) || 'Désactiver' : t('activate' as any) || 'Activer',
                            icon: selectedUsers[0].isActive
                                ? <UserX style={{ width: '0.875rem', height: '0.875rem' }} />
                                : <UserCheck style={{ width: '0.875rem', height: '0.875rem' }} />,
                            onClick: () => handleToggleActive(selectedUsers[0]),
                            variant: 'secondary' as const,
                        },
                    ] : []),
                    {
                        id: 'delete',
                        label: t('delete' as any),
                        icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                        onClick: () => {
                            if (selectedUsers.length === 1) {
                                handleDelete(selectedUsers[0]);
                            } else {
                                const deletable = selectedUsers.filter(u => u.id !== admin?.id);
                                toastConfirm(
                                    `${t('delete' as any)} ${deletable.length} utilisateur(s)?`,
                                    () => { deletable.forEach(u => deleteMutation.mutate(u.id)); clearUserSelection(); }
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
