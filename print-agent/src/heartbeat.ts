import type { ApiClient } from './api-client';
import type { DeviceRegistry } from './job-runner';
import { log } from './logger';

/**
 * Must leave room for two misses inside the API's AGENT_ONLINE_WINDOW_MS
 * (90s), so a single dropped request does not show the shop as offline.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;

export class Heartbeat {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly api: ApiClient,
    private readonly devices: DeviceRegistry,
    private readonly opts: { intervalMs?: number } = {},
  ) {}

  async beat(): Promise<void> {
    let reachability: { id: string; reachable: boolean }[] = [];

    try {
      const printers = await this.api.printers();
      reachability = await Promise.all(
        printers.map(async (target) => ({
          id: target.printerId,
          reachable: await this.devices
            .forTarget(target, 'escpos')
            .probe(target)
            .catch(() => false),
        })),
      );
    } catch (err) {
      // Send the beat anyway: "the agent is alive" distinguishes a dead agent
      // from a dead printer, which is exactly what support needs to know.
      log.warn(`Could not list printers: ${(err as Error).message}`);
    }

    try {
      await this.api.heartbeat(reachability);
    } catch (err) {
      log.warn(`Heartbeat failed: ${(err as Error).message}`);
    }
  }

  start(): void {
    void this.beat();
    this.timer = setInterval(
      () => void this.beat(),
      this.opts.intervalMs ?? HEARTBEAT_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
