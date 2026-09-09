import type { ApiClient, DeviceTarget, PrintPayload } from './api-client';
import type { Device } from './devices';
import { TcpThermalDevice } from './devices/thermal-tcp';
import { PdfSpoolerDevice, RawSpoolerDevice } from './devices/spooler';
import { log } from './logger';

export interface DeviceRegistry {
  forTarget(target: DeviceTarget, kind: PrintPayload['kind']): Device;
}

export class DefaultDeviceRegistry implements DeviceRegistry {
  private readonly tcp = new TcpThermalDevice();
  private readonly raw = new RawSpoolerDevice();
  private readonly pdf = new PdfSpoolerDevice();

  forTarget(target: DeviceTarget, kind: PrintPayload['kind']): Device {
    if (kind === 'pdf') return this.pdf;
    return target.connectionType === 'network' ? this.tcp : this.raw;
  }
}

export class JobRunner {
  constructor(
    private readonly api: ApiClient,
    private readonly devices: DeviceRegistry,
  ) {}

  /**
   * Runs one job to completion.
   *
   * Deliberately never retries the device write. A write that threw may still
   * have emitted paper, so a retry here could hand the customer a second
   * receipt. The API decides what is safe to retry — it is the only side that
   * knows whether the bytes were ever sent.
   */
  async handle(jobId: string): Promise<'printed' | 'lost' | 'failed'> {
    if ((await this.api.claim(jobId)) === 'lost') {
      log.debug(`Job ${jobId} was claimed by another agent`);
      return 'lost';
    }

    const started = Date.now();

    try {
      const payload = await this.api.payload(jobId);
      const device = this.devices.forTarget(payload.target, payload.kind);

      await device.print(
        Buffer.from(payload.dataBase64, 'base64'),
        payload.target,
        payload.fileName,
      );

      const durationMs = Date.now() - started;
      await this.api.report(jobId, { status: 'done', durationMs });
      log.info(`Printed job ${jobId} in ${durationMs}ms`);
      return 'printed';
    } catch (err) {
      const message = (err as Error).message;
      log.error(`Job ${jobId} failed: ${message}`);

      await this.api
        .report(jobId, {
          status: 'failed',
          durationMs: Date.now() - started,
          error: message,
        })
        .catch((e) =>
          // The API being unreachable must not take the agent down; the
          // server-side reaper will time this job out anyway.
          log.error(`Could not report failure for ${jobId}: ${(e as Error).message}`),
        );

      return 'failed';
    }
  }
}
