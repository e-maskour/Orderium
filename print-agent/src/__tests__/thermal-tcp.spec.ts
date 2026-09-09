import * as net from 'net';
import { TcpThermalDevice } from '../devices/thermal-tcp';
import type { DeviceTarget } from '../api-client';

/** A real socket server standing in for a receipt printer on port 9100. */
function fakePrinter(): Promise<{
  port: number;
  received: Buffer[];
  close: () => void;
}> {
  const received: Buffer[] = [];
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => received.push(chunk));
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      resolve({ port, received, close: () => server.close() });
    });
  });
}

const target = (port: number): DeviceTarget => ({
  printerId: 'p1',
  connectionType: 'network',
  ip: '127.0.0.1',
  port,
  systemName: null,
  paperWidth: 80,
});

describe('TcpThermalDevice.print', () => {
  it('writes the exact bytes to the printer socket', async () => {
    const printer = await fakePrinter();
    const bytes = Buffer.from([0x1b, 0x40, 0x41, 0x42, 0x1d, 0x56, 0x41, 0x00]);

    await new TcpThermalDevice().print(bytes, target(printer.port));
    await new Promise((r) => setTimeout(r, 50));

    // Byte-for-byte: the API produced these, the agent must not touch them.
    expect(Buffer.concat(printer.received)).toEqual(bytes);
    printer.close();
  });

  it('handles a payload larger than one TCP segment', async () => {
    const printer = await fakePrinter();
    const bytes = Buffer.alloc(200_000, 0x41);

    await new TcpThermalDevice().print(bytes, target(printer.port));
    await new Promise((r) => setTimeout(r, 200));

    expect(Buffer.concat(printer.received).length).toBe(bytes.length);
    printer.close();
  });

  it('fails clearly when nothing is listening', async () => {
    await expect(
      new TcpThermalDevice().print(Buffer.from('x'), target(1)),
    ).rejects.toThrow();
  });

  it('rejects a target with no IP', async () => {
    const t = { ...target(9100), ip: null };
    await expect(
      new TcpThermalDevice().print(Buffer.from('x'), t),
    ).rejects.toThrow(/ip/i);
  });
});

describe('TcpThermalDevice.probe', () => {
  it('reports a listening printer as reachable', async () => {
    const printer = await fakePrinter();
    await expect(
      new TcpThermalDevice().probe(target(printer.port)),
    ).resolves.toBe(true);
    printer.close();
  });

  it('reports an absent printer as unreachable without throwing', async () => {
    // probe() feeds the heartbeat, which must never crash the agent.
    await expect(new TcpThermalDevice().probe(target(1))).resolves.toBe(false);
  });

  it('reports a target with no IP as unreachable', async () => {
    await expect(
      new TcpThermalDevice().probe({ ...target(9100), ip: null }),
    ).resolves.toBe(false);
  });
});
