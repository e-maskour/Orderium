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
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }
}
