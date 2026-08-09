import { EntityManager } from 'typeorm';

/**
 * Seeders are convergent, not sequential.
 *
 * A migration runs once and is recorded in the `migrations` table; "pending"
 * is therefore a fact TypeORM can look up. A seeder has no ledger and no
 * version — it is a declaration of data that ought to exist, and re-running it
 * is always safe. So "pending" here cannot mean "never executed"; it has to
 * mean "the tenant is missing some of what this seeder declares".
 *
 * That is what `check()` answers, without writing anything.
 */
export interface SeederCheckResult {
  /** How many declared items are absent. 0 means converged. */
  missing: number;
  /** Human-readable breakdown, e.g. "12 of 34 templates missing". */
  detail: string;
}

export interface SeederRunResult {
  created: number;
  pruned: number;
  detail: string;
}

/**
 * An input a seeder needs before it can run. Declared by the seeder rather
 * than hard-coded in the UI, so the confirm dialog can render any seeder's
 * inputs without the super-admin module knowing which seeder it is talking to.
 */
export interface SeederOptionDef {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'password';
  required?: boolean;
  /** Rendered as a warning beside the field. Presence marks the option risky. */
  danger?: string;
  /** Minimum length for `text` / `password` inputs. */
  minLength?: number;
  placeholder?: string;
}

export type SeederOptions = Record<string, unknown>;

export interface SeederDefinition {
  /** Stable identifier used in URLs and run logs. Never rename. */
  key: string;
  name: string;
  description: string;
  /**
   * Seeders that create login-capable accounts or grant privileges. The UI
   * excludes these from bulk "run all pending" actions unless explicitly
   * selected, and always confirms them individually.
   */
  privileged?: boolean;
  options?: SeederOptionDef[];
  check(m: EntityManager): Promise<SeederCheckResult>;
  run(m: EntityManager, options?: SeederOptions): Promise<SeederRunResult>;
}

/** Thrown when a required option is missing or fails validation. */
export class SeederOptionError extends Error {}

export function requireString(
  options: SeederOptions | undefined,
  def: SeederOptionDef,
): string {
  const raw = options?.[def.key];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    throw new SeederOptionError(`"${def.label}" is required.`);
  }
  if (def.minLength && value.length < def.minLength) {
    throw new SeederOptionError(
      `"${def.label}" must be at least ${def.minLength} characters.`,
    );
  }
  return value;
}

export function readBoolean(
  options: SeederOptions | undefined,
  key: string,
): boolean {
  return options?.[key] === true || options?.[key] === 'true';
}
