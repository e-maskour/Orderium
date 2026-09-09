import * as net from 'net';
import type { Device } from './index';
import type { DeviceTarget } from '../api-client';

export const TCP_TIMEOUT_MS = 5000;
const PROBE_TIMEOUT_MS = 1500;

/**
 * Network receipt printers accept raw bytes on port 9100 (JetDirect).
 *
 * No printing library is involved: the API has already produced the ESC/POS,
 * so this is a socket write. That is what keeps the agent free of native
 * modules and identical on every platform.
 */
export class TcpThermalDevice implements Device {
  print(bytes: Buffer, target: DeviceTarget): Promise<void> {
    if (!target.ip) {
      return Promise.reject(new Error('Network printer has no ip configured'));
    }

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(err);
      };

      socket.setTimeout(TCP_TIMEOUT_MS);
      socket.once('error', fail);
      socket.once('timeout', () =>
        fail(new Error(`Printer did not respond within ${TCP_TIMEOUT_MS}ms`)),
      );

      socket.connect(target.port, target.ip as string, () => {
        socket.write(bytes, (err) => {
          if (err) return fail(err);
          // end() flushes the write; 'close' means the bytes left the machine.
          socket.end(() => {
            if (settled) return;
            settled = true;
            resolve();
          });
        });
      });
    });
  }

  probe(target: DeviceTarget): Promise<boolean> {
    if (!target.ip) return Promise.resolve(false);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;
      const done = (reachable: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(reachable);
      };

      socket.setTimeout(PROBE_TIMEOUT_MS);
      socket.once('error', () => done(false));
      socket.once('timeout', () => done(false));
      socket.connect(target.port, target.ip as string, () => done(true));
    });
  }
}
