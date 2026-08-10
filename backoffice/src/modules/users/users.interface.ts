import type { Role } from '../roles/roles.interface';

export type UserType = 'admin' | 'client';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  name: string;
  phoneNumber: string;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isCustomer: boolean;
  isDelivery: boolean;
  isActive: boolean;
  userType: UserType;
  status: 'pending' | 'approved' | 'rejected';
  /** @deprecated Read `roles`; kept for one release. */
  roleId: number | null;
  /** @deprecated Read `roles`; kept for one release. */
  role: Role | null;
  /** Access groups held by this user — effective rights are their union. */
  roles: Role[];
  dateCreated: string;
  dateUpdated: string;
}

// `email` accepts null as well as undefined: the form sends null to clear it,
// and the API's `@IsOptional()` skips validation for both.
export interface CreateUserPayload {
  name: string;
  phoneNumber: string;
  email?: string | null;
  password: string;
  avatarUrl?: string;
  status?: UserStatus;
  userType: UserType;
  roleIds?: number[];
  isAdmin?: boolean;
  isCustomer?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  phoneNumber?: string;
  email?: string | null;
  password?: string;
  avatarUrl?: string;
  status?: UserStatus;
  userType?: UserType;
  roleIds?: number[];
  isAdmin?: boolean;
  isCustomer?: boolean;
}

export interface UsersResponse {
  users: User[];
  total: number;
}
