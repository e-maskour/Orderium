type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 1;

/** A shop's log file gets emailed to support; keys must not travel with it. */
function redact(message: string): string {
  return message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]');
}

function emit(level: Level, message: string): void {
  if (ORDER[level] < threshold) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${redact(message)}\n`;
  (level === 'error' ? process.stderr : process.stdout).write(line);
}

export const log = {
  debug: (m: string) => emit('debug', m),
  info: (m: string) => emit('info', m),
  warn: (m: string) => emit('warn', m),
  error: (m: string) => emit('error', m),
};
