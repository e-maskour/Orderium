import { Poller } from '../poller';

function build(
  pending: unknown[],
  handle: jest.Mock = jest.fn().mockResolvedValue('printed'),
) {
  const api = { pending: jest.fn().mockResolvedValue(pending) };
  const runner = { handle };
  return {
    poller: new Poller(api as never, runner as never, { sweepIntervalMs: 20 }),
    api,
    handle,
  };
}

describe('Poller.sweep', () => {
  it('handles every queued job', async () => {
    const { poller, handle } = build([{ id: 'j1' }, { id: 'j2' }]);
    await expect(poller.sweep()).resolves.toBe(2);
    expect(handle).toHaveBeenCalledWith('j1');
    expect(handle).toHaveBeenCalledWith('j2');
  });

  it('processes jobs one at a time', async () => {
    // A shop has one printer; concurrent writes would interleave receipts.
    const order: string[] = [];
    const handle = jest.fn(async (id: string) => {
      order.push(`start:${id}`);
      await new Promise((r) => setTimeout(r, 10));
      order.push(`end:${id}`);
      return 'printed';
    });
    const { poller } = build([{ id: 'j1' }, { id: 'j2' }], handle as never);
    await poller.sweep();
    expect(order).toEqual(['start:j1', 'end:j1', 'start:j2', 'end:j2']);
  });

  it('keeps going when one job throws', async () => {
    const handle = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('printed');
    const { poller } = build([{ id: 'j1' }, { id: 'j2' }], handle as never);
    await expect(poller.sweep()).resolves.toBe(1);
    expect(handle).toHaveBeenCalledTimes(2);
  });

  it('survives the API being unreachable', async () => {
    const api = { pending: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const poller = new Poller(api as never, { handle: jest.fn() } as never);
    await expect(poller.sweep()).resolves.toBe(0);
  });

  it('does not run two sweeps concurrently', async () => {
    const { poller, api } = build([]);
    await Promise.all([poller.sweep(), poller.sweep()]);
    expect(api.pending).toHaveBeenCalledTimes(1);
  });

  it('counts only jobs it actually printed', async () => {
    const handle = jest
      .fn()
      .mockResolvedValueOnce('printed')
      .mockResolvedValueOnce('lost')
      .mockResolvedValueOnce('failed');
    const { poller } = build([{ id: 'a' }, { id: 'b' }, { id: 'c' }], handle as never);
    await expect(poller.sweep()).resolves.toBe(1);
  });
});

describe('Poller.stop', () => {
  it('waits for the job in hand rather than cutting a receipt short', async () => {
    let finished = false;
    const handle = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 40));
      finished = true;
      return 'printed';
    });
    const { poller } = build([{ id: 'j1' }], handle as never);

    const sweeping = poller.sweep();
    await new Promise((r) => setTimeout(r, 5));
    await poller.stop();

    expect(finished).toBe(true);
    await sweeping;
  });
});
