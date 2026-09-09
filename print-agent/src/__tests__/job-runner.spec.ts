import { JobRunner } from '../job-runner';
import type { PrintPayload } from '../api-client';

const TARGET = {
  printerId: 'p1',
  connectionType: 'network' as const,
  ip: '127.0.0.1',
  port: 9100,
  systemName: null,
  paperWidth: 80 as const,
};

const PAYLOAD: PrintPayload = {
  kind: 'escpos',
  dataBase64: Buffer.from([0x1b, 0x40]).toString('base64'),
  target: TARGET,
};

function build(
  overrides: Partial<{
    claim: jest.Mock;
    payload: jest.Mock;
    report: jest.Mock;
    print: jest.Mock;
  }> = {},
) {
  const api = {
    claim: overrides.claim ?? jest.fn().mockResolvedValue('claimed'),
    payload: overrides.payload ?? jest.fn().mockResolvedValue(PAYLOAD),
    report: overrides.report ?? jest.fn().mockResolvedValue(undefined),
  };
  const print = overrides.print ?? jest.fn().mockResolvedValue(undefined);
  const forTarget = jest.fn().mockReturnValue({ print, probe: jest.fn() });
  return {
    runner: new JobRunner(api as never, { forTarget } as never),
    api,
    print,
    forTarget,
  };
}

describe('JobRunner.handle', () => {
  it('claims, fetches, prints and reports success', async () => {
    const { runner, api, print } = build();
    await expect(runner.handle('j1')).resolves.toBe('printed');

    expect(api.claim).toHaveBeenCalledWith('j1');
    expect(print).toHaveBeenCalledWith(Buffer.from([0x1b, 0x40]), TARGET, undefined);
    expect(api.report).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ status: 'done' }),
    );
  });

  it('stops quietly when another agent won the claim', async () => {
    const { runner, api, print } = build({
      claim: jest.fn().mockResolvedValue('lost'),
    });
    await expect(runner.handle('j1')).resolves.toBe('lost');
    expect(print).not.toHaveBeenCalled();
    expect(api.report).not.toHaveBeenCalled();
  });

  it('picks the device from the payload target and kind', async () => {
    const { runner, forTarget } = build();
    await runner.handle('j1');
    expect(forTarget).toHaveBeenCalledWith(TARGET, 'escpos');
  });

  it('reports a device failure with its message', async () => {
    const { runner, api } = build({
      print: jest.fn().mockRejectedValue(new Error('out of paper')),
    });
    await expect(runner.handle('j1')).resolves.toBe('failed');
    expect(api.report).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('out of paper'),
      }),
    );
  });

  it('never retries the device itself — the API owns retry policy', async () => {
    const print = jest.fn().mockRejectedValue(new Error('boom'));
    const { runner } = build({ print });
    await runner.handle('j1');
    // A second write could emit a second physical receipt.
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('reports failure even when fetching the payload throws', async () => {
    const { runner, api } = build({
      payload: jest.fn().mockRejectedValue(new Error('500 boom')),
    });
    await expect(runner.handle('j1')).resolves.toBe('failed');
    expect(api.report).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('does not throw when even reporting the failure fails', async () => {
    // The API being unreachable must not take the agent down.
    const { runner } = build({
      print: jest.fn().mockRejectedValue(new Error('boom')),
      report: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    await expect(runner.handle('j1')).resolves.toBe('failed');
  });

  it('measures how long the print took', async () => {
    const { runner, api } = build();
    await runner.handle('j1');
    const [, result] = (api.report as jest.Mock).mock.calls[0];
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
