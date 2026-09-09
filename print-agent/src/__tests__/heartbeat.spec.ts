import { Heartbeat, HEARTBEAT_INTERVAL_MS } from '../heartbeat';

const TARGET = {
  printerId: 'p1',
  connectionType: 'network' as const,
  ip: '127.0.0.1',
  port: 9100,
  systemName: null,
  paperWidth: 80 as const,
};

function build(probe: jest.Mock, printers: unknown[] = [TARGET]) {
  const api = {
    printers: jest.fn().mockResolvedValue(printers),
    heartbeat: jest.fn().mockResolvedValue(undefined),
  };
  const devices = { forTarget: () => ({ print: jest.fn(), probe }) };
  return { hb: new Heartbeat(api as never, devices as never), api };
}

describe('Heartbeat.beat', () => {
  it('reports a reachable printer', async () => {
    const { hb, api } = build(jest.fn().mockResolvedValue(true));
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([{ id: 'p1', reachable: true }]);
  });

  it('reports an unreachable printer as offline', async () => {
    const { hb, api } = build(jest.fn().mockResolvedValue(false));
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([{ id: 'p1', reachable: false }]);
  });

  it('treats a probe that throws as unreachable', async () => {
    const { hb, api } = build(jest.fn().mockRejectedValue(new Error('boom')));
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([{ id: 'p1', reachable: false }]);
  });

  it('still reports liveness when the printer list cannot be fetched', async () => {
    // "The agent is alive" is useful on its own — it distinguishes a dead
    // agent from a dead printer.
    const api = {
      printers: jest.fn().mockRejectedValue(new Error('500')),
      heartbeat: jest.fn().mockResolvedValue(undefined),
    };
    const hb = new Heartbeat(api as never, { forTarget: jest.fn() } as never);
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([]);
  });

  it('does not throw when the API is unreachable', async () => {
    const api = {
      printers: jest.fn().mockResolvedValue([]),
      heartbeat: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const hb = new Heartbeat(api as never, { forTarget: jest.fn() } as never);
    await expect(hb.beat()).resolves.toBeUndefined();
  });

  it('probes several printers', async () => {
    const probe = jest.fn().mockResolvedValue(true);
    const { hb, api } = build(probe, [TARGET, { ...TARGET, printerId: 'p2' }]);
    await hb.beat();
    expect(api.heartbeat).toHaveBeenCalledWith([
      { id: 'p1', reachable: true },
      { id: 'p2', reachable: true },
    ]);
  });
});

describe('HEARTBEAT_INTERVAL_MS', () => {
  it('allows at least two misses inside the API online window', () => {
    // The API treats an agent as offline after 90s (AGENT_ONLINE_WINDOW_MS).
    expect(HEARTBEAT_INTERVAL_MS * 3).toBeLessThanOrEqual(90_000);
  });
});
