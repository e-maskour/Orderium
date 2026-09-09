import type { DeviceTarget } from '../api-client';

/**
 * The only place OS- and transport-specific behaviour may live.
 * Nothing outside src/devices/ is allowed to branch on process.platform.
 */
export interface Device {
  /** Write finished bytes to the device. Throws on failure. */
  print(bytes: Buffer, target: DeviceTarget, fileName?: string): Promise<void>;

  /** Cheap liveness check for the heartbeat. Must never throw. */
  probe(target: DeviceTarget): Promise<boolean>;
}
