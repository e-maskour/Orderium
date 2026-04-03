import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';
import { ApiResult } from '../api-response';

export const SERIALIZE_KEY = 'serialize_dto';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const DtoClass = this.reflector.getAllAndOverride<
      new (...args: any[]) => unknown
    >(SERIALIZE_KEY, [context.getHandler(), context.getClass()]);

    return next.handle().pipe(
      map((result: unknown) => {
        if (!DtoClass || !(result instanceof ApiResult)) return result;

        const raw = result.data;
        const serialized = serializeWith(DtoClass, raw);

        return new ApiResult(
          serialized,
          result.message,
          result.code,
          result.status,
          result.metadata,
        );
      }),
    );
  }
}

/**
 * Serialize a value (scalar, object, or array) using the given DTO class.
 * Handles paginated wrappers by serializing the inner array only.
 */
function serializeWith<T>(
  DtoClass: new (...args: any[]) => T,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) =>
      plainToInstance(DtoClass, item, { excludeExtraneousValues: true }),
    );
  }

  return plainToInstance(DtoClass, value, { excludeExtraneousValues: true });
}
