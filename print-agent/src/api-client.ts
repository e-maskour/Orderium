import { AGENT_VERSION, type AgentConfig } from './config';

export interface PrintJobSummary {
  id: string;
  documentType: string;
}

/** Where to send the bytes. Mirrors DeviceTarget in the API. */
export interface DeviceTarget {
  printerId: string;
  connectionType: 'network' | 'usb' | 'system';
  ip: string | null;
  port: number;
  systemName: string | null;
  paperWidth: 80 | 148;
}

export interface PrintPayload {
  kind: 'escpos' | 'pdf';
  dataBase64: string;
  fileName?: string;
  target: DeviceTarget;
}

export interface PrintResult {
  status: 'done' | 'failed';
  durationMs: number;
  error?: string;
}

interface Envelope<T> {
  code: string;
  status: number;
  message: string;
  data: T;
}

export class ApiClient {
  constructor(private readonly config: AgentConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantSlug,
      'X-Agent-Id': this.config.agentId,
      Authorization: `Bearer ${this.config.agentKey}`,
    };
  }

  private url(path: string): string {
    return `${this.config.apiUrl}/api${path}`;
  }

  private static async errorFrom(res: {
    status: number;
    statusText?: string;
    json: () => Promise<unknown>;
  }): Promise<Error> {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return new Error(`${res.status} ${body.message ?? res.statusText ?? 'request failed'}`);
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const res = await fetch(this.url(path), {
      method: init.method ?? 'GET',
      headers: this.headers(),
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });

    if (!res.ok) throw await ApiClient.errorFrom(res);
    return ((await res.json()) as Envelope<T>).data;
  }

  async pending(): Promise<PrintJobSummary[]> {
    return this.request<PrintJobSummary[]>('/print-jobs/agent/pending');
  }

  /**
   * 409 means another agent won the race. That is a normal outcome of two
   * agents watching one warehouse, not an error worth logging as one.
   */
  async claim(jobId: string): Promise<'claimed' | 'lost'> {
    const res = await fetch(this.url(`/print-jobs/agent/claim/${jobId}`), {
      method: 'POST',
      headers: this.headers(),
    });

    if (res.status === 409) return 'lost';
    if (!res.ok) throw await ApiClient.errorFrom(res);
    return 'claimed';
  }

  async payload(jobId: string): Promise<PrintPayload> {
    return this.request<PrintPayload>(`/print-jobs/agent/payload/${jobId}`);
  }

  async report(jobId: string, result: PrintResult): Promise<void> {
    await this.request<null>(`/print-jobs/agent/result/${jobId}`, {
      method: 'POST',
      body: result,
    });
  }

  async printers(): Promise<DeviceTarget[]> {
    return this.request<DeviceTarget[]>('/print-jobs/agent/printers');
  }

  async heartbeat(printers: { id: string; reachable: boolean }[]): Promise<void> {
    await this.request<null>('/print-agents/heartbeat', {
      method: 'POST',
      body: { version: AGENT_VERSION, platform: process.platform, printers },
    });
  }

  /**
   * Exchanges a pairing string for a permanent key.
   *
   * The string is `<tenantSlug>-<code>` and a slug may itself contain hyphens
   * ("cafe-du-coin"), so split on the LAST hyphen, not the first.
   */
  static async pair(apiUrl: string, pairingString: string): Promise<AgentConfig> {
    const cut = pairingString.lastIndexOf('-');
    if (cut < 1) {
      throw new Error('Pairing code must look like <tenant>-<code>');
    }
    const tenantSlug = pairingString.slice(0, cut);

    const res = await fetch(`${apiUrl}/api/print-agents/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantSlug },
      body: JSON.stringify({ pairingCode: pairingString }),
    });

    if (!res.ok) throw await ApiClient.errorFrom(res);

    const { data } = (await res.json()) as Envelope<{
      agentId: string;
      agentKey: string;
      warehouseId: number;
    }>;

    return { apiUrl, tenantSlug, ...data };
  }
}
