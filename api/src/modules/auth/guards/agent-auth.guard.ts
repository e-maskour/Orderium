import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { PrintAgent } from '../../printers/entities/print-agent.entity';
import type { AuthenticatedAgent } from '../decorators/current-agent.decorator';

/**
 * Authenticates a print agent by its key.
 *
 * The tenant is resolved upstream by TenantMiddleware from the X-Tenant-ID
 * header, exactly as for any other API client, so the agent record is looked
 * up in that tenant's database. A key is bound to one warehouse; scoping is
 * enforced by the queries that use `agent.warehouseId`, never by filtering
 * results after the fact.
 */
@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      agent?: AuthenticatedAgent;
    }>();

    const agentId = req.headers['x-agent-id'];
    const key = req.headers['authorization']?.replace(/^Bearer /, '');

    if (!agentId || !key) {
      throw new UnauthorizedException('Missing agent credentials');
    }

    const repo = this.tenantConnService.getRepository(PrintAgent);
    const agent = await repo.findOne({
      where: { id: agentId },
      // keyHash is select:false on the entity, so ask for it explicitly.
      select: ['id', 'warehouseId', 'keyHash', 'isEnabled', 'revokedAt'],
    });

    if (!agent || !agent.isEnabled || agent.revokedAt || !agent.keyHash) {
      throw new UnauthorizedException('Unknown or revoked agent');
    }

    if (!(await bcrypt.compare(key, agent.keyHash))) {
      throw new UnauthorizedException('Invalid agent key');
    }

    req.agent = { id: agent.id, warehouseId: agent.warehouseId };
    return true;
  }
}
