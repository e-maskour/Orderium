export interface Permission {
    id: number;
    key: string;
    name: string;
    description: string | null;
    module: string;
    action: string;
    dateCreated: string;
    dateUpdated: string;
}

export interface PermissionsGrouped {
    [module: string]: Permission[];
}

export const groupPermissionsByModule = (permissions: Permission[]): PermissionsGrouped => {
    return permissions.reduce<PermissionsGrouped>((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
    }, {});
};
