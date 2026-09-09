import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResult } from '../api-response';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Server-sent events must pass through untouched. Nest's @Sse() expects a
    // stream of raw { data } MessageEvents; wrapping each one in the API
    // envelope puts `{"code":...,"data":{"data":{...}}}` on the wire, which
    // parses fine but carries no usable fields — the client silently ignores
    // every event and the stream looks dead with nothing logged anywhere.
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler()) === true) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) => {
        // Skip if response was handled manually (@Res decorator)
        if (data === undefined) {
          return data;
        }

        const response = context.switchToHttp().getResponse();
        const statusCode: number = response.statusCode;

        // Handle ApiResult marker objects (controllers should always use ApiRes/ApiPaginated)
        if (data instanceof ApiResult) {
          response.status(data.status);
          return {
            code: data.code,
            status: data.status,
            message: data.message,
            data: data.data,
            metadata: data.metadata ?? null,
          };
        }

        // Fallback: auto-wrap plain return values that haven't been wrapped yet
        return {
          code: `GEN${statusCode}_00`,
          status: statusCode,
          message: 'Success',
          data,
          metadata: null,
        };
      }),
    );
  }
}
