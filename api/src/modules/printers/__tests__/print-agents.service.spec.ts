import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  PrintAgentsService,
  AGENT_ONLINE_WINDOW_MS,
} from '../print-agents.service';

jest.mock('bcrypt');
(bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashed-key');

const tenantConn = (repo: Record<string, unknown>) =>
  ({
    getRepository: () => repo,
    getCurrentTenantSlug: () => 'acme',
  }) as never;

describe('PrintAgentsService.create', () => {
  it('issues a pairing code prefixed with the tenant slug', async () => {
    const repo = {
      create: (x: unknown) => x,
      save: jest.fn(async (x) => ({ ...(x as object), id: 'a1' })),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    const { pairingCode } = await svc.create({ name: 'Caisse', warehouseId: 7 });
    // The slug prefix tells the agent which X-Tenant-ID to send, so the
    // operator configures nothing by hand.
    expect(pairingCode).toMatch(/^acme-[A-Z0-9]{8}$/);
  });

  it('uses an alphabet free of look-alike characters', async () => {
    const repo = {
      create: (x: unknown) => x,
      save: jest.fn(async (x) => ({ ...(x as object), id: 'a1' })),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    for (let i = 0; i < 40; i++) {
      const { pairingCode } = await svc.create({ name: 'C', warehouseId: 7 });
      expect(pairingCode.split('-')[1]).not.toMatch(/[OI01]/);
    }
  });

  it('sets an expiry on the pairing code', async () => {
    const save = jest.fn(async (x) => ({ ...(x as object), id: 'a1' }));
    const svc = new PrintAgentsService(tenantConn({ create: (x: unknown) => x, save }));
    await svc.create({ name: 'Caisse', warehouseId: 7 });
    const saved = save.mock.calls[0][0] as { pairingExpiresAt: Date };
    expect(saved.pairingExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('PrintAgentsService.pair', () => {
  const validAgent = () => ({
    id: 'a1',
    warehouseId: 7,
    pairingExpiresAt: new Date(Date.now() + 60_000),
  });

  it('rejects an unknown code', async () => {
    const svc = new PrintAgentsService(
      tenantConn({ findOne: jest.fn().mockResolvedValue(null), save: jest.fn() }),
    );
    await expect(svc.pair('acme-AAAAAAAA')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired code', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        ...validAgent(),
        pairingExpiresAt: new Date(Date.now() - 1_000),
      }),
      save: jest.fn(),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    await expect(svc.pair('acme-AAAAAAAA')).rejects.toThrow(UnauthorizedException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns a 64-character key and consumes the code', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(validAgent()),
      save: jest.fn(async (x) => x),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    const res = await svc.pair('acme-AAAAAAAA');

    expect(res.agentKey).toHaveLength(64);
    expect(res).toMatchObject({ agentId: 'a1', warehouseId: 7 });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pairingCode: null, pairingExpiresAt: null }),
    );
  });

  it('never stores the plaintext key', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(validAgent()),
      save: jest.fn(async (x) => x),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    const { agentKey } = await svc.pair('acme-AAAAAAAA');
    const saved = JSON.stringify(repo.save.mock.calls[0][0]);
    expect(saved).not.toContain(agentKey);
    expect(saved).toContain('hashed-key');
  });

  it('accepts the code half regardless of the slug prefix', async () => {
    const findOne = jest.fn().mockResolvedValue(validAgent());
    const svc = new PrintAgentsService(tenantConn({ findOne, save: jest.fn(async (x) => x) }));
    await svc.pair('some-tenant-ABCDEFGH');
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pairingCode: 'ABCDEFGH' } }),
    );
  });
});

describe('PrintAgentsService.list', () => {
  it('marks an agent online only within the heartbeat window', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([
        { id: 'a', lastSeenAt: new Date(Date.now() - 1_000) },
        { id: 'b', lastSeenAt: new Date(Date.now() - AGENT_ONLINE_WINDOW_MS - 1_000) },
        { id: 'c', lastSeenAt: null },
      ]),
    };
    const svc = new PrintAgentsService(tenantConn(repo));
    const list = await svc.list();
    expect(list.map((a) => a.online)).toEqual([true, false, false]);
  });
});

describe('PrintAgentsService.revoke', () => {
  it('disables the agent and stamps revokedAt', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const svc = new PrintAgentsService(tenantConn({ update }));
    await svc.revoke('a1');
    expect(update).toHaveBeenCalledWith(
      { id: 'a1' },
      expect.objectContaining({ isEnabled: false, revokedAt: expect.any(Date) }),
    );
  });

  it('throws when the agent does not exist', async () => {
    const svc = new PrintAgentsService(
      tenantConn({ update: jest.fn().mockResolvedValue({ affected: 0 }) }),
    );
    await expect(svc.revoke('nope')).rejects.toThrow(NotFoundException);
  });
});
