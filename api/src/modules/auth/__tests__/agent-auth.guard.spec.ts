import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AgentAuthGuard } from '../guards/agent-auth.guard';

jest.mock('bcrypt');
const mockedCompare = bcrypt.compare as unknown as jest.Mock;

interface FakeRequest {
  headers: Record<string, string>;
  agent?: { id: string; warehouseId: number };
}

const ctx = (headers: Record<string, string>) => {
  const req: FakeRequest = { headers };
  return {
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never,
    req,
  };
};

const AGENT = {
  id: 'a1',
  warehouseId: 7,
  keyHash: 'hashed',
  isEnabled: true,
  revokedAt: null,
};

describe('AgentAuthGuard', () => {
  let findOne: jest.Mock;
  let guard: AgentAuthGuard;

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue({ ...AGENT });
    mockedCompare.mockReset().mockResolvedValue(true);
    guard = new AgentAuthGuard({
      getRepository: () => ({ findOne }),
    } as never);
  });

  const headers = { 'x-agent-id': 'a1', authorization: 'Bearer thekey' };

  it('rejects a request with no credentials', async () => {
    await expect(guard.canActivate(ctx({}).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request with an agent id but no key', async () => {
    await expect(
      guard.canActivate(ctx({ 'x-agent-id': 'a1' }).ctx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown agent', async () => {
    findOne.mockResolvedValue(null);
    await expect(guard.canActivate(ctx(headers).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a revoked agent', async () => {
    findOne.mockResolvedValue({ ...AGENT, revokedAt: new Date() });
    await expect(guard.canActivate(ctx(headers).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a disabled agent', async () => {
    findOne.mockResolvedValue({ ...AGENT, isEnabled: false });
    await expect(guard.canActivate(ctx(headers).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an agent that has never been paired', async () => {
    findOne.mockResolvedValue({ ...AGENT, keyHash: null });
    await expect(guard.canActivate(ctx(headers).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong key', async () => {
    mockedCompare.mockResolvedValue(false);
    await expect(guard.canActivate(ctx(headers).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the agent to the request on success', async () => {
    const { ctx: c, req } = ctx(headers);
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(req.agent).toEqual({ id: 'a1', warehouseId: 7 });
  });

  it('selects the key hash explicitly, since the column is select:false', async () => {
    await guard.canActivate(ctx(headers).ctx);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.arrayContaining(['keyHash']),
      }),
    );
  });
});
