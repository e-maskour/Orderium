#!/usr/bin/env node
import { ApiClient } from './api-client';
import { AGENT_VERSION, configPath, loadConfig, saveConfig } from './config';
import { DefaultDeviceRegistry, JobRunner } from './job-runner';
import { Heartbeat } from './heartbeat';
import { JobStream } from './job-stream';
import { Poller } from './poller';
import { log } from './logger';

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

export async function runPair(argv: string[]): Promise<number> {
  const url = arg(argv, 'url');
  const code = arg(argv, 'code');

  if (!url || !code) {
    log.error(
      'Usage: orderium-print-agent pair --url <apiUrl> --code <tenant-CODE>',
    );
    return 1;
  }

  try {
    const config = await ApiClient.pair(url, code);
    await saveConfig(config);
    log.info(`Paired as agent ${config.agentId} for warehouse ${config.warehouseId}`);
    log.info(`Config written to ${configPath()}`);
    return 0;
  } catch (err) {
    log.error(`Pairing failed: ${(err as Error).message}`);
    log.error('Pairing codes expire after 15 minutes — generate a fresh one.');
    return 1;
  }
}

export async function runAgent(): Promise<number> {
  const config = await loadConfig();
  if (!config) {
    log.error('Not paired yet.');
    log.error('Run: orderium-print-agent pair --url <apiUrl> --code <tenant-CODE>');
    return 1;
  }

  log.info(`Orderium print agent ${AGENT_VERSION} on ${process.platform}`);
  log.info(`Tenant ${config.tenantSlug}, warehouse ${config.warehouseId}`);

  const api = new ApiClient(config);
  const devices = new DefaultDeviceRegistry();
  const runner = new JobRunner(api, devices);
  const poller = new Poller(api, runner);
  const heartbeat = new Heartbeat(api, devices);
  const stream = new JobStream(config, (jobId) => {
    void runner
      .handle(jobId)
      .catch((e) => log.error(`Job ${jobId}: ${(e as Error).message}`));
  });

  poller.start();
  heartbeat.start();
  stream.start();

  // Finish the job in hand before exiting, so no receipt is cut in half.
  const shutdown = async (signal: string): Promise<void> => {
    log.info(`${signal} received, shutting down`);
    stream.stop();
    heartbeat.stop();
    await poller.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  return 0;
}

export async function main(argv: string[]): Promise<number> {
  if (argv[0] === 'pair') return runPair(argv);
  return runAgent();
}

if (require.main === module) {
  void main(process.argv.slice(2)).then((code) => {
    if (code !== 0) process.exit(code);
  });
}
