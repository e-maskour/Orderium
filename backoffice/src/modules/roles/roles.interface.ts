import type { Permission } from '../permissions/permissions.interface';

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSuperAdmin: boolean;
  permissions: Permission[];
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  isSuperAdmin?: boolean;
  permissionIds?: number[];
}

export type UpdateRolePayload = Partial<CreateRolePayload>;
