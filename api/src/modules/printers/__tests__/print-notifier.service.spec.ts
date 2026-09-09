import { firstValueFrom, timeout } from 'rxjs';
import { PrintNotifier, printChannel } from '../print-notifier.service';

const tenantConn = (slug = 'acme') =>
  ({ getCurrentTenantSlug: () => slug }) as never;
const config = { get: () => undefined } as never;

describe('printChannel', () => {
  it('namespaces by tenant and warehouse', () => {
    expect(printChannel('acme', 7)).toBe('print:acme:7');
  });
});

describe('PrintNotifier', () => {
  it('delivers a notification to a subscriber of the same warehouse', async () => {
    const notifier = new PrintNotifier(tenantConn(), config);
    const received = firstValueFrom(notifier.stream(7).pipe(timeout(500)));
    notifier.handleMessage('print:acme:7', JSON.stringify({ jobId: 'j1' }));
    await expect(received).resolves.toEqual({ jobId: 'j1' });
  });

  it('does not leak notifications across warehouses', () => {
    const notifier = new PrintNotifier(tenantConn(), config);
    const seen: unknown[] = [];
    notifier.stream(7).subscribe((v) => seen.push(v));
    notifier.handleMessage('print:acme:9', JSON.stringify({ jobId: 'j2' }));
    expect(seen).toEqual([]);
  });

  it('does not leak notifications across tenants', () => {
    const notifier = new PrintNotifier(tenantConn('acme'), config);
    const seen: unknown[] = [];
    notifier.stream(7).subscribe((v) => seen.push(v));
    notifier.handleMessage('print:other:7', JSON.stringify({ jobId: 'j3' }));
    expect(seen).toEqual([]);
  });

  it('ignores a malformed message rather than killing the stream', () => {
    const notifier = new PrintNotifier(tenantConn(), config);
    const seen: unknown[] = [];
    notifier.stream(7).subscribe((v) => seen.push(v));
    expect(() =>
      notifier.handleMessage('print:acme:7', 'not json'),
    ).not.toThrow();
    notifier.handleMessage('print:acme:7', JSON.stringify({ jobId: 'ok' }));
    expect(seen).toEqual([{ jobId: 'ok' }]);
  });

  it('still delivers in-process when Redis is unavailable', async () => {
    const notifier = new PrintNotifier(tenantConn(), config);
    const received = firstValueFrom(notifier.stream(7).pipe(timeout(500)));
    notifier.notify(7, 'j9'); // no Redis client connected
    await expect(received).resolves.toEqual({ jobId: 'j9' });
  });
});
