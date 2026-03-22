import { SetMetadata } from '@nestjs/common';

export const IS_PORTAL_ROUTE_KEY = 'isPortalRoute';
/** Mark a controller or handler as a portal route.
 *  The global JwtAuthGuard uses this to allow portal-scoped tokens
 *  and to block them from non-portal (backoffice) routes. */
export const PortalRoute = () => SetMetadata(IS_PORTAL_ROUTE_KEY, true);
