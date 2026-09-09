import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, saveConfig, configPath, AgentConfig } from '../config';

const CONFIG: AgentConfig = {
  apiUrl: 'https://api.example.com',
  tenantSlug: 'acme',
  agentId: 'a1',
  agentKey: 'k'.repeat(64),
  warehouseId: 7,
};

describe('configPath', () => {
  it('is an absolute path under the user directory', () => {
    expect(path.isAbsolute(configPath())).toBe(true);
    expect(configPath()).toContain('orderium-print-agent');
  });
});

describe('loadConfig / saveConfig', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-'));
    process.env.ORDERIUM_AGENT_HOME = dir;
  });

  afterEach(async () => {
    delete process.env.ORDERIUM_AGENT_HOME;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns null before the agent is paired', async () => {
    await expect(loadConfig()).resolves.toBeNull();
  });

  it('round-trips a saved config', async () => {
    await saveConfig(CONFIG);
    await expect(loadConfig()).resolves.toEqual(CONFIG);
  });

  it('stores the key file readable only by its owner', async () => {
    await saveConfig(CONFIG);
    const stat = await fs.stat(configPath());
    // The file holds a long-lived credential.
    expect(stat.mode & 0o077).toBe(0);
  });

  it('returns null rather than throwing on a corrupt file', async () => {
    // A service manager restarts on crash; a corrupt file would loop forever.
    await fs.mkdir(path.dirname(configPath()), { recursive: true });
    await fs.writeFile(configPath(), 'not json');
    await expect(loadConfig()).resolves.toBeNull();
  });
});
