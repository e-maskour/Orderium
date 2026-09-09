import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runPair } from '../index';
import { ApiClient } from '../api-client';
import { loadConfig } from '../config';

jest.mock('../api-client');

describe('runPair', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-'));
    process.env.ORDERIUM_AGENT_HOME = dir;
    jest.resetAllMocks();
  });

  afterEach(async () => {
    delete process.env.ORDERIUM_AGENT_HOME;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('saves the config returned by pairing', async () => {
    (ApiClient.pair as jest.Mock).mockResolvedValue({
      apiUrl: 'https://x',
      tenantSlug: 'acme',
      agentId: 'a1',
      agentKey: 'k',
      warehouseId: 7,
    });

    await expect(
      runPair(['pair', '--url', 'https://x', '--code', 'acme-ABC']),
    ).resolves.toBe(0);
    await expect(loadConfig()).resolves.toMatchObject({ agentId: 'a1' });
  });

  it('exits non-zero when arguments are missing', async () => {
    await expect(runPair(['pair'])).resolves.toBe(1);
    expect(ApiClient.pair).not.toHaveBeenCalled();
  });

  it('exits non-zero and saves nothing when pairing is rejected', async () => {
    (ApiClient.pair as jest.Mock).mockRejectedValue(
      new Error('Invalid or expired pairing code'),
    );
    await expect(
      runPair(['pair', '--url', 'https://x', '--code', 'acme-BAD']),
    ).resolves.toBe(1);
    // A half-written config would leave the service in a broken state.
    await expect(loadConfig()).resolves.toBeNull();
  });
});
