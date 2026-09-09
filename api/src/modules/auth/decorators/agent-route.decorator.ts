import { SetMetadata } from '@nestjs/common';

export const IS_AGENT_ROUTE_KEY = 'isAgentRoute';

/** Mark a controller or handler as authenticated by a print-agent key rather
 *  than a JWT. The global JwtAuthGuard skips these; AgentAuthGuard validates
 *  them. Agents are unattended machines, so no human token exists. */
export const AgentRoute = () => SetMetadata(IS_AGENT_ROUTE_KEY, true);
