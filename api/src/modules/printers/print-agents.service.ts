import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PrintAgent } from './entities/print-agent.entity';
import { Printer } from './entities/printer.entity';
import { CreatePrintAgentDto } from './dto/create-print-agent.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import type { AuthenticatedAgent } from '../auth/decorators/current-agent.decorator';

/** Three missed 30s heartbeats before an agent is considered offline. */
export const AGENT_ONLINE_WINDOW_MS = 90_000;

const PAIRING_TTL_MS = 15 * 60_000;
const BCRYPT_ROUNDS = 10;

/** Excludes O, I, 0 and 1: operators read these codes off a screen. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface PrintAgentWithStatus extends PrintAgent {
  online: boolean;
}

@Injectable()
export class PrintAgentsService {
  constructor(private readonly tenantConnService: TenantConnectionService) {}

  private get repo(): Repository<PrintAgent> {
    return this.tenantConnService.getRepository(PrintAgent);
  }

  private get printers(): Repository<Printer> {
    return this.tenantConnService.getRepository(Printer);
  }

  private randomCode(len = 8): string {
    // rejection-free: the alphabet length (32) divides 256 evenly, so a plain
    // modulo introduces no bias.
    return Array.from(randomBytes(len))
      .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
      .join('');
  }

  /**
   * Creates an agent and issues a single-use pairing code. The returned string
   * is `<tenantSlug>-<code>`; the prefix tells the agent which X-Tenant-ID to
   * send, so the operator configures nothing by hand.
   */
  async create(dto: CreatePrintAgentDto): Promise<{
    agent: PrintAgent;
    pairingCode: string;
  }> {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    const code = this.randomCode();

    const agent = await this.repo.save(
      this.repo.create({
        name: dto.name,
        warehouseId: dto.warehouseId,
        pairingCode: code,
        pairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MS),
        isEnabled: true,
      }),
    );

    return { agent, pairingCode: `${slug}-${code}` };
  }

  /**
   * Exchanges a pairing string for a permanent key. The plaintext key is
   * returned exactly once and never persisted.
   */
  async pair(pairingString: string): Promise<{
    agentId: string;
    agentKey: string;
    warehouseId: number;
  }> {
    const code = pairingString.split('-').pop() ?? '';

    const agent = await this.repo.findOne({
      where: { pairingCode: code },
      select: ['id', 'warehouseId', 'pairingExpiresAt'],
    });

    if (
      !agent ||
      !agent.pairingExpiresAt ||
      agent.pairingExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired pairing code');
    }

    const agentKey = randomBytes(32).toString('hex'); // 64 chars

    await this.repo.save({
      ...agent,
      keyHash: await bcrypt.hash(agentKey, BCRYPT_ROUNDS),
      keyPrefix: agentKey.slice(0, 8),
      pairingCode: null,
      pairingExpiresAt: null,
    });

    return { agentId: agent.id, agentKey, warehouseId: agent.warehouseId };
  }

  async list(): Promise<PrintAgentWithStatus[]> {
    const agents = await this.repo.find({ order: { name: 'ASC' } });
    const cutoff = Date.now() - AGENT_ONLINE_WINDOW_MS;

    return agents.map((a) => ({
      ...a,
      online: !!a.lastSeenAt && a.lastSeenAt.getTime() > cutoff,
    }));
  }

  /**
   * Records that an agent is alive, and which of its printers it can reach.
   *
   * Only reachable printers are stamped: an unreachable one simply goes stale
   * and the UI shows it offline, which is the honest signal. Printer updates
   * are scoped by warehouse so a compromised agent cannot touch another shop.
   */
  async heartbeat(agent: AuthenticatedAgent, dto: HeartbeatDto): Promise<void> {
    await this.repo.update(
      { id: agent.id },
      {
        lastSeenAt: new Date(),
        version: dto.version,
        platform: dto.platform,
      },
    );

    const seenAt = new Date();
    for (const printer of dto.printers ?? []) {
      if (!printer.reachable) continue;
      await this.printers.update(
        { id: printer.id, warehouseId: agent.warehouseId },
        { lastSeenAt: seenAt },
      );
    }
  }

  async revoke(id: string): Promise<void> {
    const res = await this.repo.update(
      { id },
      { revokedAt: new Date(), isEnabled: false },
    );
    if (!res.affected) throw new NotFoundException('Print agent not found');
  }
}
