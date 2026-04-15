import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { EmptyState } from '../components/EmptyState';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Shield, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  rolesService,
  type Role,
  type CreateRolePayload,
  type UpdateRolePayload,
} from '../modules/roles';
import { MobileList } from '../components/MobileList';
import { FloatingActionBar } from '../components/FloatingActionBar';
import {
  permissionsService,
  type Permission,
  groupPermissionsByModule,
} from '../modules/permissions';
import { toastSuccess, toastError, toastConfirm } from '../services/toast.service';

const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

export default function RolesPage() {
  const { t, dir } = useLanguage();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);

  // form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsService.getAll(),
  });

  const roles: Role[] = rolesData ?? [];
  const allPerms: Permission[] = permissions ?? [];
  const grouped = groupPermissionsByModule(allPerms);

  const createMutation = useMutation({
    mutationFn: (p: CreateRolePayload) => rolesService.create(p),
    onSuccess: () => {
      toastSuccess(t('roleCreated' as any));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (e: any) => toastError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRolePayload }) =>
      rolesService.update(id, payload),
    onSuccess: () => {
      toastSuccess(t('roleUpdated' as any));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (e: any) => toastError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesService.remove(id),
    onSuccess: () => {
      toastSuccess(t('roleDeleted' as any));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e: any) => toastError(e.message),
  });

  const openCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setSelectedPermIds(new Set());
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setSelectedPermIds(new Set(role.permissions.map((p) => p.id)));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const togglePermission = (id: number) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (moduleName: string) => {
    const modulePerms = grouped[moduleName] || [];
    const allSelected = modulePerms.every((p) => selectedPermIds.has(p.id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toastError(t('nameRequired2' as any));
      return;
    }
    const payload = {
      name: formName,
      description: formDescription || undefined,
      permissionIds: Array.from(selectedPermIds),
    };
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (role: Role) => {
    if (role.isSuperAdmin) {
      toastError(t('cannotDeleteSuperAdmin' as any));
      return;
    }
    toastConfirm(t('confirmDeleteRole' as any), () => deleteMutation.mutate(role.id));
  };

  // =====================  Table templates  =====================

  const nameTemplate = (role: Role) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{role.name}</span>
      {role.isSuperAdmin && (
        <Tag
          value={t('superAdminBadge' as any)}
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
      {role.isSuperAdmin
        ? t('allPermissions' as any)
        : `${role.permissions.length} / ${allPerms.length}`}
    </span>
  );

  const actionsTemplate = (role: Role) => (
    <div style={{ display: 'flex', gap: '0.375rem' }}>
      <Button
        icon={<Pencil style={{ width: '0.875rem', height: '0.875rem' }} />}
        text
        rounded
        onClick={() => openEdit(role)}
        style={{ width: '2rem', height: '2rem', color: '#235ae4' }}
      />
      {!role.isSuperAdmin && (
        <Button
          icon={<Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />}
          text
          rounded
          severity="danger"
          onClick={() => handleDelete(role)}
          style={{ width: '2rem', height: '2rem' }}
        />
      )}
    </div>
  );

  // =====================  Permission matrix  =====================

  const renderPermissionMatrix = () => {
    const moduleNames = Object.keys(grouped).sort();
    if (!moduleNames.length)
      return (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
          {t('noResults' as any)}
        </p>
      );

    return (
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            minWidth: '30rem',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr repeat(4, 1fr)',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '0.75rem 1rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#475569',
                textTransform: 'uppercase',
              }}
            >
              {t('module' as any)}
            </span>
            {ACTIONS.map((a) => (
              <span
                key={a}
                style={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: '#475569',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {t(a as any)}
              </span>
            ))}
          </div>
          {/* Rows */}
          {moduleNames.map((mod, idx) => {
            const perms = grouped[mod];
            const allChecked = perms.every((p) => selectedPermIds.has(p.id));
            const someChecked = !allChecked && perms.some((p) => selectedPermIds.has(p.id));

            return (
              <div
                key={mod}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr repeat(4, 1fr)',
                  alignItems: 'center',
                  padding: '0.625rem 1rem',
                  borderBottom: idx < moduleNames.length - 1 ? '1px solid #f1f5f9' : undefined,
                  background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleModule(mod)}
                >
                  <Checkbox
                    checked={allChecked}
                    onChange={() => toggleModule(mod)}
                    style={{ width: '1.125rem', height: '1.125rem' }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: allChecked ? '#235ae4' : someChecked ? '#475569' : '#64748b',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mod.replace(/_/g, ' ')}
                  </span>
                </div>
                {ACTIONS.map((action) => {
                  const perm = perms.find((p) => p.action === action);
                  if (!perm)
                    return (
                      <div key={action} style={{ textAlign: 'center', color: '#e2e8f0' }}>
                        —
                      </div>
                    );
                  const checked = selectedPermIds.has(perm.id);
                  return (
                    <div key={action} style={{ textAlign: 'center' }}>
                      <div
                        onClick={() => togglePermission(perm.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          border: checked ? '2px solid #235ae4' : '2px solid #cbd5e1',
                          background: checked ? '#235ae4' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        {checked && (
                          <Check
                            style={{
                              width: '0.875rem',
                              height: '0.875rem',
                              color: '#fff',
                              strokeWidth: 3,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const selectAll = () => setSelectedPermIds(new Set(allPerms.map((p) => p.id)));
  const deselectAll = () => setSelectedPermIds(new Set());

  const clearRoleSelection = () => setSelectedRoles([]);
  const toggleSelectAllRoles = () =>
    selectedRoles.length === roles.length ? setSelectedRoles([]) : setSelectedRoles(roles);

  return (
    <AdminLayout>
      <div dir={dir} className="page-container">
        <PageHeader
          icon={Shield}
          title={t('rolesManagement' as any)}
          subtitle={t('rolesDescription' as any)}
          actions={
            <Button
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label={t('createRole' as any)}
              onClick={openCreate}
              style={{
                background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                border: 'none',
                borderRadius: '0.625rem',
                fontWeight: 600,
              }}
            />
          }
        />

        <div className="responsive-table-mobile" style={{ marginTop: '1rem' }}>
          <MobileList
            items={roles}
            keyExtractor={(r: Role) => r.id}
            loading={isLoading}
            totalCount={roles.length}
            countLabel="rôles"
            emptyMessage="Aucun rôle trouvé"
            config={{
              topLeft: (r: Role) => r.name,
              topRight: (r: Role) =>
                r.isSuperAdmin ? 'Super Admin' : `${r.permissions.length} permis.`,
              bottomLeft: (r: Role) => r.description || '',
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
                    Admin
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
            emptyMessage={<EmptyState title={t('noResults' as any) || 'No roles found'} />}
            dataKey="id"
            stripedRows
            selectionMode="checkbox"
            selection={selectedRoles}
            onSelectionChange={(e) => setSelectedRoles(e.value as Role[])}
            onRowClick={(e) => openEdit(e.data as Role)}
            rowClassName={() => 'cursor-pointer'}
          >
            <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
            <Column header={t('name' as any)} body={nameTemplate} style={{ minWidth: '14rem' }} />
            <Column
              header={t('description' as any)}
              field="description"
              style={{ minWidth: '14rem' }}
              body={(r: Role) => (
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {r.description || '—'}
                </span>
              )}
            />
            <Column
              header={t('permissionsCount' as any)}
              body={permCountTemplate}
              style={{ minWidth: '9rem' }}
            />
          </DataTable>
        </div>
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingRole ? t('editRole' as any) : t('createRole' as any)}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button
                label={t('cancel' as any)}
                onClick={closeModal}
                text
                style={{ color: '#64748b' }}
              />
              <Button
                label={editingRole ? t('update' as any) : t('create' as any)}
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
                  {t('name' as any)} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <InputText
                  value={formName}
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
                  {t('description' as any)}
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

            {/* Permission matrix */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
                  {t('permissionsMatrix' as any)}
                  <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '0.5rem' }}>
                    ({selectedPermIds.size}/{allPerms.length})
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <Button
                    label={t('selectAll' as any)}
                    text
                    size="small"
                    onClick={selectAll}
                    style={{ color: '#235ae4', fontSize: '0.75rem' }}
                  />
                  <Button
                    label={t('deselectAll' as any)}
                    text
                    size="small"
                    onClick={deselectAll}
                    style={{ color: '#94a3b8', fontSize: '0.75rem' }}
                  />
                </div>
              </div>
              {renderPermissionMatrix()}
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
        itemLabel="rôle"
        actions={[
          ...(selectedRoles.length === 1
            ? [
                {
                  id: 'edit',
                  label: t('edit' as any),
                  icon: <Pencil style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => openEdit(selectedRoles[0]),
                  variant: 'secondary' as const,
                },
              ]
            : []),
          ...(!selectedRoles.every((r) => r.isSuperAdmin)
            ? [
                {
                  id: 'delete',
                  label: t('delete' as any),
                  icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
                  onClick: () => {
                    const deletable = selectedRoles.filter((r) => !r.isSuperAdmin);
                    if (deletable.length === 1) {
                      handleDelete(deletable[0]);
                    } else {
                      toastConfirm(`${t('delete' as any)} ${deletable.length} rôles?`, () => {
                        deletable.forEach((r) => deleteMutation.mutate(r.id));
                        clearRoleSelection();
                      });
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
