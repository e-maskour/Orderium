import type { Permission } from '../permissions/permissions.interface';

/** Slim reference to another role, as returned on `implies`. */
export interface ImpliedRole {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSuperAdmin: boolean;
  /** Seeded preset — cannot be renamed or deleted. */
  isSystem: boolean;
  category: string | null;
  permissions: Permission[];
  /** Roles whose permissions this role also grants (Odoo `implied_ids`). */
  implies: ImpliedRole[];
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  category?: string;
  isSuperAdmin?: boolean;
  /** Preferred over `permissionIds` — keys survive a catalogue re-seed. */
  permissionKeys?: string[];
  permissionIds?: number[];
  impliedRoleIds?: number[];
}

export type UpdateRolePayload = Partial<CreateRolePayload>;
