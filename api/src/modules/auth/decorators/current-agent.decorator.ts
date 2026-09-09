import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedAgent {
  id: string;
  warehouseId: number;
}

/** The agent AgentAuthGuard attached to this request. */
export const CurrentAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAgent =>
    ctx.switchToHttp().getRequest<{ agent: AuthenticatedAgent }>().agent,
);
