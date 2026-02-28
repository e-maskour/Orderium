import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResult } from '../api-response';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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
