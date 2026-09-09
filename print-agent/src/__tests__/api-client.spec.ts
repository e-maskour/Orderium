import { ApiClient } from '../api-client';
import type { AgentConfig } from '../config';

const CONFIG: AgentConfig = {
  apiUrl: 'https://api.example.com',
  tenantSlug: 'acme',
  agentId: 'a1',
  agentKey: 'secret',
  warehouseId: 7,
};

const ok = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ code: 'X', status: 200, message: 'ok', data }),
});

const fail = (status: number, message: string) => ({
  ok: false,
  status,
  statusText: message,
  json: async () => ({ message }),
});

describe('ApiClient headers', () => {
  it('identifies the tenant and the agent on every call', async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok([]));
    global.fetch = fetchMock as never;

    await new ApiClient(CONFIG).pending();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/print-jobs/agent/pending');
    expect(init.headers).toMatchObject({
      'X-Tenant-ID': 'acme',
      'X-Agent-Id': 'a1',
      Authorization: 'Bearer secret',
    });
  });
});

describe('ApiClient.claim', () => {
  it('reports a won race', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ id: 'j1' })) as never;
    await expect(new ApiClient(CONFIG).claim('j1')).resolves.toBe('claimed');
  });

  it('treats 409 as a lost race, not an error', async () => {
    // Another agent got there first. Normal, not exceptional.
    global.fetch = jest.fn().mockResolvedValue(fail(409, 'taken')) as never;
    await expect(new ApiClient(CONFIG).claim('j1')).resolves.toBe('lost');
  });

  it('throws on a server error', async () => {
    global.fetch = jest.fn().mockResolvedValue(fail(500, 'boom')) as never;
    await expect(new ApiClient(CONFIG).claim('j1')).rejects.toThrow(/500/);
  });
});

describe('ApiClient.pair', () => {
  it('derives the tenant slug from the pairing string', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(ok({ agentId: 'a9', agentKey: 'k9', warehouseId: 3 })) as never;

    const config = await ApiClient.pair('https://api.example.com', 'acme-4F7K2Q9X');

    expect(config).toEqual({
      apiUrl: 'https://api.example.com',
      tenantSlug: 'acme',
      agentId: 'a9',
      agentKey: 'k9',
      warehouseId: 3,
    });
  });

  it('handles a tenant slug containing hyphens', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(ok({ agentId: 'a9', agentKey: 'k9', warehouseId: 3 })) as never;
    const config = await ApiClient.pair('https://x', 'cafe-du-coin-4F7K2Q9X');
    expect(config.tenantSlug).toBe('cafe-du-coin');
  });

  it('rejects a pairing string with no slug prefix', async () => {
    await expect(ApiClient.pair('https://x', 'NOSLUG')).rejects.toThrow(/tenant/i);
  });

  it('surfaces an expired code clearly', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(fail(401, 'Invalid or expired pairing code')) as never;
    await expect(ApiClient.pair('https://x', 'acme-BAD')).rejects.toThrow(/expired/i);
  });
});

describe('ApiClient.report', () => {
  it('posts the outcome to the result endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok(null));
    global.fetch = fetchMock as never;

    await new ApiClient(CONFIG).report('j1', {
      status: 'failed',
      durationMs: 5,
      error: 'no paper',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/print-jobs/agent/result/j1');
    expect(JSON.parse(init.body)).toEqual({
      status: 'failed',
      durationMs: 5,
      error: 'no paper',
    });
  });
});

describe('ApiClient.heartbeat', () => {
  it('reports version, platform and printer reachability', async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok(null));
    global.fetch = fetchMock as never;

    await new ApiClient(CONFIG).heartbeat([{ id: 'p1', reachable: true }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/print-agents/heartbeat');
    const body = JSON.parse(init.body);
    expect(body.printers).toEqual([{ id: 'p1', reachable: true }]);
    expect(body.platform).toBe(process.platform);
    expect(body.version).toBeTruthy();
  });
});
