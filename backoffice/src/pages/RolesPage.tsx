import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { EmptyState } from '../components/EmptyState';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Shield, Plus, Pencil, Trash2, Lock, RefreshCw } from 'lucide-react';
import {
  rolesService,
  type Role,
  type CreateRolePayload,
  type UpdateRolePayload,
} from '../modules/roles';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { RoleAccessMatrix } from '../components/RoleAccessMatrix';
import { Can } from '../components/Can';
import { usePermissions } from '../hooks/usePermissions';
import { useAccessLabels } from '../hooks/useAccessLabels';
import { accessService } from '../modules/access';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';

export default function RolesPage() {
  const { t, dir } = useLanguage();
  const queryClient = useQueryClient();
  const { hasPermission, refreshAccess } = usePermissions();
  const { roleName: translatedRoleName, roleDescription } = useAccessLabels();

  const canEdit = hasPermission('roles.edit');
  const canCreate = hasPermission('roles.create');
  const canDelete = hasPermission('roles.delete');

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);

  // form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(new Set());
  const [impliedRoleIds, setImpliedRoleIds] = useState<number[]>([]);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
  });

  const { data: registry } = useQuery({
    queryKey: ['access-registry'],
    queryFn: () => accessService.getRegistry(),
    // The registry is compiled into the API — it only changes on deploy.
    staleTime: Infinity,
  });

  const roles: Role[] = useMemo(() => rolesData ?? [], [rolesData]);
  const totalPermissions = registry
    ? registry.modules.reduce((n, m) => n + m.actions.length, 0)
    : 0;

  /**
   * Keys the role would gain from the roles it implies, walked transitively so
   * the matrix shows the same set the server will resolve.
   */
  const inheritedKeys = useMemo(() => {
    const byId = new Map(roles.map((r) => [r.id, r]));
    const seen = new Set<number>();
    const queue = [...impliedRoleIds];
    const keys = new Set<string>();

    while (queue.length) {
      const id = queue.shift() as number;
      if (seen.has(id)) continue;
      seen.add(id);
      const role = byId.get(id);
      if (!role) continue;
      role.permissions.forEach((p) => keys.add(p.key));
      role.implies.forEach((r) => queue.push(r.id));
    }
    return keys;
  }, [impliedRoleIds, roles]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    // Editing a role can change what the editor themselves may do.
    void refreshAccess();
  };

  const createMutation = useMutation({
    mutationFn: (p: CreateRolePayload) => rolesService.create(p),
    onSuccess: () => {
      toastSuccess(t('roleCreated'));
      invalidate();
      closeModal();
    },
    onError: (e: any) => toastError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRolePayload }) =>
      rolesService.update(id, payload),
    onSuccess: () => {
      toastSuccess(t('roleUpdated'));
      invalidate();
      closeModal();
    },
    onError: (e: any) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesService.remove(id),
    onSuccess: () => {
      toastSuccess(t('roleDeleted'));
      invalidate();
    },
    onError: (e: any) => toastError(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => accessService.sync(),
    onSuccess: () => {
      toastSuccess(t('roleSyncCatalogueDone'));
      queryClient.invalidateQueries({ queryKey: ['access-registry'] });
      invalidate();
    },
    onError: (e: any) => toastError(e.message),
  });

  const openCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setPermissionKeys(new Set());
    setImpliedRoleIds([]);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setPermissionKeys(new Set(role.permissions.map((p) => p.key)));
    setImpliedRoleIds(role.implies.map((r) => r.id));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toastError(t('nameRequired2'));
      return;
    }
    const payload: CreateRolePayload = {
      name: formName,
      description: formDescription || undefined,
      permissionKeys: Array.from(permissionKeys),
      impliedRoleIds,
    };
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      toastError(t('roleSystemLocked'));
      return;
    }
    if (role.isSuperAdmin) {
      toastError(t('cannotDeleteSuperAdmin'));
      return;
    }
    toastConfirm(t('confirmDeleteRole'), () => deleteMutation.mutate(role.id));
  };

  // =====================  Table templates  =====================

  const nameTemplate = (role: Role) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
        {translatedRoleName(role.name)}
      </span>
      {role.isSystem && (
        <Lock size={12} style={{ color: '#94a3b8' }} aria-label={t('roleSystemBadge')} />
      )}
      {role.isSuperAdmin && (
        <Tag
          value={t('superAdminBadge')}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            borderRadius: '0.375rem',
            padding: '0.15rem 0.45rem',
          }}
        />
      )}
    </div>
  );

  const permCountTemplate = (role: Role) => (
    <span
      style={{
        fontSize: '0.8125rem',
        color: role.isSuperAdmin ? '#f59e0b' : '#235ae4',
        fontWeight: 600,
      }}
    >
      {role.isSuperAdmin ? t('allPermissions') : `${role.permissions.length} / ${totalPermissions}`}
    </span>
  );

  const impliesTemplate = (role: Role) => (
    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
      {role.implies.length ? role.implies.map((r) => translatedRoleName(r.name)).join(', ') : '—'}
    </span>
  );

  const clearRoleSelection = () => setSelectedRoles([]);
  const toggleSelectAllRoles = () =>
    selectedRoles.length === roles.length ? setSelectedRoles([]) : setSelectedRoles(roles);

  const impliedOptions = roles
    .filter((r) => r.id !== editingRole?.id)
    .map((r) => ({ label: translatedRoleName(r.name), value: r.id }));

  const isSystemRole = editingRole?.isSystem ?? false;
  const isSuperAdminRole = editingRole?.isSuperAdmin ?? false;

  return (
    <AdminLayout>
      <div dir={dir} className="page-container">
        <PageHeader
          icon={Shield}
          title={t('rolesManagement')}
          subtitle={t('rolesDescription')}
          actions={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Can permission="roles.edit">
                <Button
                  icon={<RefreshCw style={{ width: '1rem', height: '1rem' }} />}
                  label={t('roleSyncCatalogue')}
                  text
                  loading={syncMutation.isPending}
                  onClick={() => syncMutation.mutate()}
                />
              </Can>
              <Can permission="roles.create">
                <Button
                  icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
                  label={t('createRole')}
                  onClick={openCreate}
                />
              </Can>
            </div>
          }
        />

        <div className="responsive-table-mobile" style={{ marginTop: '1rem' }}>
          <MobileList
            items={roles}
            keyExtractor={(r: Role) => r.id}
            loading={isLoading}
            totalCount={roles.length}
            countLabel={t('rolesCountLabel')}
            emptyMessage={t('noRolesFound')}
            config={{
              topLeft: (r: Role) => translatedRoleName(r.name),
              topRight: (r: Role) =>
                r.isSuperAdmin
                  ? t('superAdminBadge')
                  : t('rolePermissionsShort').replace('{count}', String(r.permissions.length)),
              bottomLeft: (r: Role) => roleDescription(r.name, r.description || ''),
              bottomRight: (r: Role) =>
                r.isSuperAdmin ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: '#235ae4',
                      color: '#fff',
                    }}
                  >
                    {t('superAdminBadge')}
                  </span>
                ) : null,
            }}
          />
        </div>
        <div
          className="responsive-table-desktop"
          style={{
            marginTop: '1rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <DataTable
            value={roles}
            loading={isLoading}
            emptyMessage={<EmptyState title={t('noRolesFound')} />}
            dataKey="id"
            stripedRows
            selectionMode="checkbox"
            selection={selectedRoles}
            onSelectionChange={(e) => setSelectedRoles(e.value as Role[])}
            onRowClick={(e) => {
              const target = e.originalEvent.target as HTMLElement;
              if (target.closest('button') || target.closest('a') || target.closest('.p-checkbox'))
                return;
              const selCol = target.closest('.p-selection-column');
              if (selCol) {
                (selCol.querySelector('.p-checkbox-box') as HTMLElement)?.click();
                return;
              }
              openEdit(e.data as Role);
            }}
            rowClassName={() => 'cursor-pointer'}
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
            <Column header={t('name')} body={nameTemplate} style={{ minWidth: '14rem' }} />
            <Column
              header={t('description')}
              field="description"
              style={{ minWidth: '12rem' }}
              body={(r: Role) => (
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {roleDescription(r.name, r.description || '') || '—'}
                </span>
              )}
            />
            <Column
              header={t('roleImplied')}
              body={impliesTemplate}
              style={{ minWidth: '12rem' }}
            />
            <Column
              header={t('permissionsCount')}
              body={permCountTemplate}
              style={{ minWidth: '9rem' }}
            />
          </DataTable>
        </div>

        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingRole ? t('editRole') : t('createRole')}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button label={t('cancel')} onClick={closeModal} text style={{ color: '#64748b' }} />
              <Button
                label={editingRole ? t('update') : t('create')}
                onClick={handleSubmit}
                disabled={editingRole ? !canEdit : !canCreate}
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
            {isSystemRole && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                <Lock size={14} />
                {t('roleSystemLocked')}
              </div>
            )}

            {/* Name & Description */}
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
                  {t('name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <InputText
                  value={formName}
                  disabled={isSystemRole}
                  onChange={(e) => setFormName(e.target.value)}
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
                  {t('description')}
                </label>
                <InputTextarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={1}
                  autoResize
                  style={{ width: '100%', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0' }}
                />
              </div>
            </div>

            {/* Implied roles */}
            <div>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#374151',
                  display: 'block',
                  marginBottom: '0.25rem',
                }}
              >
                {t('roleImplied')}
              </label>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                {t('roleImpliedHelp')}
              </p>
              <MultiSelect
                value={impliedRoleIds}
                options={impliedOptions}
                onChange={(e) => setImpliedRoleIds(e.value as number[])}
                display="chip"
                filter
                placeholder={t('roleImplied')}
                style={{ width: '100%', borderRadius: '0.5rem' }}
              />
            </div>

            {/* Access matrix */}
            <div>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#374151',
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                {t('roleAccessMatrix')}
              </label>

              {isSuperAdminRole ? (
                <p
                  style={{
                    margin: 0,
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: '0.8125rem',
                    color: '#92400e',
                  }}
                >
                  {t('roleSuperAdminHelp')}
                </p>
              ) : registry ? (
                <RoleAccessMatrix
                  registry={registry}
                  value={permissionKeys}
                  onChange={setPermissionKeys}
                  inherited={inheritedKeys}
                  disabled={editingRole ? !canEdit : !canCreate}
                />
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>{t('loading')}</p>
              )}
            </div>
          </div>
        </Modal>
      </div>

      <FloatingActionBar
        selectedCount={selectedRoles.length}
        onClearSelection={clearRoleSelection}
        onSelectAll={toggleSelectAllRoles}
        isAllSelected={selectedRoles.length === roles.length && roles.length > 0}
        totalCount={roles.length}
        itemLabel={t('roleCountLabel')}
        actions={[
          ...(selectedRoles.length === 1
            ? [
                {
                  id: 'edit',
                  label: t('edit'),
                  icon: <Pencil style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => openEdit(selectedRoles[0]),
                  variant: 'secondary' as const,
                },
              ]
            : []),
          ...(canDelete && selectedRoles.some((r) => !r.isSystem && !r.isSuperAdmin)
            ? [
                {
                  id: 'delete',
                  label: t('delete'),
                  icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => {
                    const deletable = selectedRoles.filter((r) => !r.isSystem && !r.isSuperAdmin);
                    if (deletable.length === 1) {
                      handleDelete(deletable[0]);
                    } else {
                      toastConfirm(
                        t('confirmDeleteRolesPlural').replace('{count}', String(deletable.length)),
                        () => {
                          deletable.forEach((r) => deleteMutation.mutate(r.id));
                          clearRoleSelection();
                        },
                      );
                    }
                  },
                  variant: 'danger' as const,
                },
              ]
            : []),
        ]}
      />
    </AdminLayout>
  );
}
