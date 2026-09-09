import type { AgentConfig } from './config';
import { log } from './logger';

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Minimal server-sent-events parser.
 *
 * Written by hand rather than pulling in a dependency: the agent needs only
 * `data:` fields, and every SSE package on npm is now ESM-only, which this
 * CommonJS service cannot require.
 */
export class SseParser {
  private buffer = '';
  private data: string[] = [];

  constructor(private readonly onEvent: (data: string) => void) {}

  push(chunk: string): void {
    this.buffer += chunk.replace(/\r\n/g, '\n');

    let newline: number;
    while ((newline = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);

      if (line === '') {
        // Blank line terminates the event.
        if (this.data.length) {
          this.onEvent(this.data.join('\n'));
          this.data = [];
        }
        continue;
      }

      if (line.startsWith(':')) continue; // keep-alive comment

      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      if (field !== 'data') continue; // event/id/retry are not used

      const value = colon === -1 ? '' : line.slice(colon + 1);
      this.data.push(value.startsWith(' ') ? value.slice(1) : value);
    }
  }
}

/**
 * Latency optimisation only.
 *
 * Every failure here is a warning, never an error: the Poller's sweep still
 * delivers the job, so a dead stream costs latency rather than correctness.
 */
export class JobStream {
  private controller?: AbortController;
  private stopped = false;
  private backoff = RECONNECT_MIN_MS;

  constructor(
    private readonly config: AgentConfig,
    private readonly onJob: (jobId: string) => void,
  ) {}

  start(): void {
    this.stopped = false;
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.controller?.abort();
    this.controller = undefined;
  }

  private async connect(): Promise<void> {
    while (!this.stopped) {
      this.controller = new AbortController();

      try {
        const res = await fetch(
          `${this.config.apiUrl}/api/print-jobs/agent/stream`,
          {
            headers: {
              Accept: 'text/event-stream',
              'X-Tenant-ID': this.config.tenantSlug,
              'X-Agent-Id': this.config.agentId,
              Authorization: `Bearer ${this.config.agentKey}`,
            },
            signal: this.controller.signal,
          },
        );

        if (!res.ok || !res.body) {
          throw new Error(`stream returned ${res.status}`);
        }

        log.info('Job stream connected');
        this.backoff = RECONNECT_MIN_MS;

        const parser = new SseParser((data) => {
          try {
            const { jobId } = JSON.parse(data) as { jobId: string };
            if (jobId) this.onJob(jobId);
          } catch {
            log.warn('Ignoring malformed job notification');
          }
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }

        throw new Error('stream closed by server');
      } catch (err) {
        if (this.stopped) return;
        log.warn(
          `Job stream disconnected (${(err as Error).message}); retrying in ${this.backoff}ms`,
        );
        await new Promise((r) => setTimeout(r, this.backoff));
        this.backoff = Math.min(this.backoff * 2, RECONNECT_MAX_MS);
      }
    }
  }
}
