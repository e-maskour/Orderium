import { UseInterceptors, SetMetadata, applyDecorators } from '@nestjs/common';
import {
  SerializeInterceptor,
  SERIALIZE_KEY,
} from '../interceptors/serialize.interceptor';

/**
 * Apply response serialization to a controller method or entire controller.
 *
 * Wraps the response `data` through `plainToInstance(DtoClass, data, { excludeExtraneousValues: true })`.
 * Only fields decorated with `@Expose()` in the DTO class are included in the output.
 *
 * Usage:
 *   @Serialize(OrderResponseDto)          // on a method
 *   @Serialize(OrderListResponseDto)      // on a controller (applies to all methods)
 *
 * @param DtoClass - The DTO class to serialize the response data into.
 */
export function Serialize(DtoClass: new (...args: any[]) => unknown) {
  return applyDecorators(
    SetMetadata(SERIALIZE_KEY, DtoClass),
    UseInterceptors(SerializeInterceptor),
  );
}
