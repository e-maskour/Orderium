import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
/**
 * Decorator that marks a route as requiring a specific permission.
 * @example @RequirePermission('invoices.create')
 */
export const RequirePermission = (permission: string) =>
    SetMetadata(REQUIRE_PERMISSION_KEY, permission);
