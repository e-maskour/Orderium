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
    roleId: number | null;
    role: Role | null;
    dateCreated: string;
    dateUpdated: string;
}

export interface CreateUserPayload {
    name: string;
    phoneNumber: string;
    email?: string;
    password: string;
    avatarUrl?: string;
    status?: UserStatus;
    userType: UserType;
    roleId?: number;
    isAdmin?: boolean;
    isCustomer?: boolean;
}

export interface UpdateUserPayload {
    name?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    avatarUrl?: string;
    status?: UserStatus;
    userType?: UserType;
    roleId?: number | null;
    isAdmin?: boolean;
    isCustomer?: boolean;
}

export interface UsersResponse {
    users: User[];
    total: number;
}
