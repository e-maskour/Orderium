import {
  PrintJobsReaper,
  CLAIM_TIMEOUT_SECONDS,
  STALE_QUEUE_MINUTES,
} from '../print-jobs.reaper.service';

function build() {
  const query = jest.fn().mockResolvedValue([[], 0]);
  const reaper = new PrintJobsReaper(
    { getRepository: () => ({ query }) } as never,
    { getActiveTenantSlugs: jest.fn().mockResolvedValue([]) } as never,
  );
  return { reaper, query };
}

const sqlOf = (query: jest.Mock) =>
  query.mock.calls.map(([sql]) => (sql as string).replace(/\s+/g, ' '));

describe('PrintJobsReaper.sweep', () => {
  it('requeues jobs stuck in claimed that still have attempts left', async () => {
    const { reaper, query } = build();
    await reaper.sweep();
    const requeue = sqlOf(query).find((s) => s.includes("SET status = 'queued'"));
    expect(requeue).toBeDefined();
    expect(requeue).toContain("status = 'claimed'");
    expect(requeue).toContain('attempts < max_attempts');
  });

  it('gives up on claimed jobs that are out of attempts', async () => {
    const { reaper, query } = build();
    await reaper.sweep();
    const exhausted = sqlOf(query).find(
      (s) => s.includes("status = 'claimed'") && s.includes('attempts >= max_attempts'),
    );
    expect(exhausted).toContain("SET status = 'failed'");
  });

  it('NEVER requeues a job that was already printing', async () => {
    const { reaper, query } = build();
    await reaper.sweep();

    const printingStatements = sqlOf(query).filter((s) =>
      s.includes("status = 'printing'"),
    );
    expect(printingStatements.length).toBeGreaterThan(0);
    // A job whose bytes reached the device may have printed. Requeuing it
    // would hand the customer a second receipt and unbalance the till.
    for (const stmt of printingStatements) {
      expect(stmt).not.toContain("SET status = 'queued'");
      expect(stmt).toContain("SET status = 'failed'");
    }
  });

  it('cancels jobs that sat queued past the staleness window', async () => {
    const { reaper, query } = build();
    await reaper.sweep();
    const cancel = sqlOf(query).find((s) => s.includes("SET status = 'cancelled'"));
    expect(cancel).toBeDefined();
    expect(cancel).toContain("status = 'queued'");
  });

  it('claims time out well before jobs go stale', () => {
    // Otherwise a job could expire while an agent was still legitimately
    // working on it.
    expect(CLAIM_TIMEOUT_SECONDS).toBeLessThan(STALE_QUEUE_MINUTES * 60);
  });

  it('reports what it changed', async () => {
    const query = jest.fn().mockResolvedValue([[], 2]);
    const reaper = new PrintJobsReaper(
      { getRepository: () => ({ query }) } as never,
      { getActiveTenantSlugs: jest.fn() } as never,
    );
    const result = await reaper.sweep();
    expect(result).toEqual({ requeued: 2, failed: 4, expired: 2 });
  });
});
