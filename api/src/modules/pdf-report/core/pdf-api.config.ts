import { ConfigService } from '@nestjs/config';
import {
  PdfApiAuth,
  PdfApiConfigError,
  PdfApiRetryOptions,
  DEFAULT_RETRY_OPTIONS,
} from '../types';
import {
  GenericAdapterOptions,
  GenericResponseMode,
} from './vendors/generic-html-to-pdf.adapter';

/**
 * Environment contract for the PDF rendering API.
 *
 * | Variable                | Required | Purpose                                        |
 * | ----------------------- | -------- | ---------------------------------------------- |
 * | `PDF_API_KEY`           | yes      | API credential. Never hardcode or log this.    |
 * | `PDF_API_URL`           | yes      | Render endpoint.                               |
 * | `PDF_API_AUTH_HEADER`   | no       | Header carrying the key (`Authorization`).     |
 * | `PDF_API_AUTH_SCHEME`   | no       | Value prefix (`Bearer`); empty for raw keys.   |
 * | `PDF_API_RESPONSE_MODE` | no       | `binary` \| `base64` \| `url`.                 |
 * | `PDF_API_RESPONSE_PATH` | no       | JSON dot-path for `base64`/`url` modes.        |
 * | `PDF_API_TIMEOUT_MS`    | no       | Per-attempt timeout.                           |
 * | `PDF_API_MAX_ATTEMPTS`  | no       | Total attempts including the first.            |
 * | `PDF_API_RETRY_BASE_MS` | no       | First backoff delay.                           |
 */
export const PDF_API_ENV = {
  key: 'PDF_API_KEY',
  url: 'PDF_API_URL',
  authHeader: 'PDF_API_AUTH_HEADER',
  authScheme: 'PDF_API_AUTH_SCHEME',
  responseMode: 'PDF_API_RESPONSE_MODE',
  responsePath: 'PDF_API_RESPONSE_PATH',
  timeoutMs: 'PDF_API_TIMEOUT_MS',
  maxAttempts: 'PDF_API_MAX_ATTEMPTS',
  retryBaseMs: 'PDF_API_RETRY_BASE_MS',
} as const;

const VALID_RESPONSE_MODES: GenericResponseMode[] = ['binary', 'base64', 'url'];

/**
 * Reads credentials from the environment.
 *
 * Called lazily per request so a deployment missing `PDF_API_KEY` fails the
 * PDF call with a clear error instead of refusing to boot the whole API.
 */
export function resolvePdfApiAuth(config: ConfigService): PdfApiAuth {
  const apiKey = config.get<string>(PDF_API_ENV.key)?.trim();
  if (!apiKey) {
    throw new PdfApiConfigError(
      `${PDF_API_ENV.key} is not set — cannot authenticate against the PDF rendering API.`,
    );
  }

  const endpoint = config.get<string>(PDF_API_ENV.url)?.trim();
  if (!endpoint) {
    throw new PdfApiConfigError(
      `${PDF_API_ENV.url} is not set — cannot reach the PDF rendering API.`,
    );
  }

  return {
    apiKey,
    endpoint,
    headerName:
      config.get<string>(PDF_API_ENV.authHeader)?.trim() || 'Authorization',
    // An explicitly empty scheme means "send the raw key" — some vendors use
    // a bare `X-API-Key` value rather than a `Bearer` token.
    headerScheme: (
      config.get<string>(PDF_API_ENV.authScheme) ?? 'Bearer'
    ).trim(),
  };
}

/** Reads retry/timeout tuning from the environment, falling back to defaults. */
export function resolvePdfApiRetryOptions(
  config: ConfigService,
): PdfApiRetryOptions {
  const numeric = (envKey: string, fallback: number): number => {
    const raw = config.get<string | number>(envKey);
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    ...DEFAULT_RETRY_OPTIONS,
    timeoutMs: numeric(PDF_API_ENV.timeoutMs, DEFAULT_RETRY_OPTIONS.timeoutMs),
    maxAttempts: numeric(
      PDF_API_ENV.maxAttempts,
      DEFAULT_RETRY_OPTIONS.maxAttempts,
    ),
    baseDelayMs: numeric(
      PDF_API_ENV.retryBaseMs,
      DEFAULT_RETRY_OPTIONS.baseDelayMs,
    ),
  };
}

/** Reads the response-handling mode for the generic vendor adapter. */
export function resolveGenericAdapterOptions(
  config: ConfigService,
): GenericAdapterOptions {
  const rawMode = config.get<string>(PDF_API_ENV.responseMode)?.trim();
  const responseMode = VALID_RESPONSE_MODES.includes(
    rawMode as GenericResponseMode,
  )
    ? (rawMode as GenericResponseMode)
    : 'binary';

  return {
    responseMode,
    responsePath:
      config.get<string>(PDF_API_ENV.responsePath)?.trim() || 'data',
  };
}
