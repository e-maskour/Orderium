import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { httpStatusToErrorDef } from '../response-codes';

const PLAN_ERROR_CODES = ['PLAN_LIMIT_REACHED', 'PLAN_FEATURE_UNAVAILABLE'];

/** The body of a subscription enforcement 403, or null for any other error. */
export function planErrorDetails(
  exception: unknown,
): Record<string, unknown> | null {
  if (!(exception instanceof HttpException)) return null;
  if (exception.getStatus() !== HttpStatus.FORBIDDEN) return null;
  const body = exception.getResponse();
  if (typeof body !== 'object' || body === null) return null;
  const code = (body as Record<string, unknown>)['error'];
  return typeof code === 'string' && PLAN_ERROR_CODES.includes(code)
    ? (body as Record<string, unknown>)
    : null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const isDev = process.env.NODE_ENV !== 'production';
    const errDef = httpStatusToErrorDef(status);

    const errorResponse: Record<string, any> = {
      code: errDef.code,
      status,
      message: isDev
        ? message
        : status < 500
          ? message
          : 'Internal server error',
      data: null,
      metadata: null,
    };

    if (isDev) {
      errorResponse.metadata = {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...(exception instanceof HttpException
          ? { details: exception.getResponse() }
          : {}),
      };
    } else {
      // Subscription errors carry no secrets and the back-office needs the
      // resource / limit / used values to show the "limit reached" dialog.
      const planDetails = planErrorDetails(exception);
      if (planDetails) errorResponse.metadata = { details: planDetails };
    }

    const SILENT_PATHS = ['/.well-known/'];
    const isSilent = SILENT_PATHS.some((p) => request.url.startsWith(p));

    if (!isSilent) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    // For validation errors, log the individual field messages so they appear in server logs
    if (exception instanceof HttpException && status === 400) {
      const body = exception.getResponse();
      if (
        typeof body === 'object' &&
        body !== null &&
        Array.isArray((body as Record<string, unknown>)['message'])
      ) {
        this.logger.error(
          `Validation errors: ${((body as Record<string, unknown>)['message'] as string[]).join(' | ')}`,
        );
      }
    }

    response.status(status).json(errorResponse);
  }
}
