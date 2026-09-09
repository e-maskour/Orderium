import { PrintAgentsService } from '../print-agents.service';
import { PrintAgent } from '../entities/print-agent.entity';

function build() {
  const agentRepo = { update: jest.fn() };
  const printerRepo = { update: jest.fn() };
  const svc = new PrintAgentsService({
    getRepository: (entity: { name: string }) =>
      entity === PrintAgent || entity.name === 'PrintAgent' ? agentRepo : printerRepo,
    getCurrentTenantSlug: () => 'acme',
  } as never);
  return { svc, agentRepo, printerRepo };
}

const AGENT = { id: 'a1', warehouseId: 7 };

describe('PrintAgentsService.heartbeat', () => {
  it('records liveness, version and platform', async () => {
    const { svc, agentRepo } = build();
    await svc.heartbeat(AGENT, { version: '1.0.0', platform: 'win32', printers: [] });
    expect(agentRepo.update).toHaveBeenCalledWith(
      { id: 'a1' },
      expect.objectContaining({
        version: '1.0.0',
        platform: 'win32',
        lastSeenAt: expect.any(Date),
      }),
    );
  });

  it('marks reachable printers as seen', async () => {
    const { svc, printerRepo } = build();
    await svc.heartbeat(AGENT, {
      version: '1.0.0',
      platform: 'linux',
      printers: [{ id: 'p1', reachable: true }],
    });
    expect(printerRepo.update).toHaveBeenCalledWith(
      { id: 'p1', warehouseId: 7 },
      expect.objectContaining({ lastSeenAt: expect.any(Date) }),
    );
  });

  it('does not touch unreachable printers, so they go stale and show offline', async () => {
    const { svc, printerRepo } = build();
    await svc.heartbeat(AGENT, {
      version: '1.0.0',
      platform: 'linux',
      printers: [{ id: 'p2', reachable: false }],
    });
    expect(printerRepo.update).not.toHaveBeenCalled();
  });

  it('scopes printer updates to the agent warehouse', async () => {
    // An agent must never be able to touch another shop's printers, even by
    // reporting an id it does not own.
    const { svc, printerRepo } = build();
    await svc.heartbeat(AGENT, {
      version: '1.0.0',
      platform: 'linux',
      printers: [{ id: 'other-shop-printer', reachable: true }],
    });
    expect(printerRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 7 }),
      expect.anything(),
    );
  });
});
