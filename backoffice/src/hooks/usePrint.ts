import { useCallback, useEffect, useRef, useState } from 'react';
import { printersService } from '../modules/printers';
import type { IPrintJob, QueuePrintJobDTO } from '../modules/printers';

export const POLL_INTERVAL_MS = 1000;
/** After this, the job is queued but no agent has taken it — say so plainly. */
export const POLL_TIMEOUT_MS = 12_000;

export type PrintState =
  | 'idle'
  | 'queuing'
  | 'waiting'
  | 'printed'
  | 'offline'
  | 'failed';

/**
 * Queues a print job and follows it to a terminal state.
 *
 * The browser never prints as a side effect here. `printHere` exists so the
 * operator can fall back deliberately, having been told what went wrong —
 * the old behaviour opened the dialog silently and hid every failure.
 */
export function usePrint() {
  const [state, setState] = useState<PrintState>('idle');
  const [job, setJob] = useState<IPrintJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guards against setting state after the component unmounts, and lets
  // reset() abandon an in-flight poll.
  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState('idle');
    setJob(null);
    setError(null);
  }, []);

  const print = useCallback(async (dto: QueuePrintJobDTO) => {
    cancelled.current = false;
    setError(null);
    setState('queuing');

    let queued: IPrintJob;
    try {
      queued = await printersService.queueJob(dto);
      if (cancelled.current) return;
      setJob(queued);
    } catch (e) {
      if (cancelled.current) return;
      setError((e as Error).message);
      setState('failed');
      return;
    }

    setState('waiting');
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (cancelled.current) return;

      let current: IPrintJob;
      try {
        current = await printersService.getJob(queued.id);
      } catch {
        // A transient error must not abandon a job that may still print.
        continue;
      }
      if (cancelled.current) return;
      setJob(current);

      if (current.status === 'done') {
        setState('printed');
        return;
      }
      if (current.status === 'failed' || current.status === 'cancelled') {
        setError(current.errorMessage ?? 'Print failed');
        setState('failed');
        return;
      }
    }

    // Still queued or claimed: no agent finished it in time. The job is not
    // lost — it prints when an agent comes online, within the staleness window.
    if (!cancelled.current) setState('offline');
  }, []);

  /** The explicit fallback. Only ever runs because the operator asked. */
  const printHere = useCallback(() => window.print(), []);

  return { print, printHere, state, job, error, reset };
}
