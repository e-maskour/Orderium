import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export const AGENT_VERSION = '1.0.0';

export interface AgentConfig {
  apiUrl: string;
  tenantSlug: string;
  agentId: string;
  agentKey: string;
  warehouseId: number;
}

/** Overridable via ORDERIUM_AGENT_HOME so tests never touch a real install. */
export function configPath(): string {
  const home = process.env.ORDERIUM_AGENT_HOME ?? os.homedir();
  return path.join(home, '.orderium-print-agent', 'config.json');
}

export async function loadConfig(): Promise<AgentConfig | null> {
  try {
    return JSON.parse(await fs.readFile(configPath(), 'utf8')) as AgentConfig;
  } catch {
    // Missing or corrupt. Return null so the caller prints pairing
    // instructions rather than crashing a service the OS restarts in a loop.
    return null;
  }
}

export async function saveConfig(config: AgentConfig): Promise<void> {
  const file = configPath();
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, JSON.stringify(config, null, 2), { mode: 0o600 });
  // mkdir/writeFile modes are umask-dependent; chmod is not.
  await fs.chmod(file, 0o600);
}
