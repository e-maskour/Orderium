import { firstValueFrom, of } from 'rxjs';
import { SSE_METADATA } from '@nestjs/common/constants';
import { ApiResponseInterceptor } from '../api-response.interceptor';
import { ApiRes } from '../../api-response';
import { PJB } from '../../response-codes';

function context(isSse = false) {
  const handler = () => undefined;
  // Mirrors how Nest's @Sse() marks the route handler.
  if (isSse) Reflect.defineMetadata(SSE_METADATA, true, handler);
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: 200, status: jest.fn() }),
    }),
    getHandler: () => handler,
    getClass: () => class {},
  } as never;
}

const handlerOf = (value: unknown) => ({ handle: () => of(value) }) as never;

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor();

  it('wraps an ApiRes marker in the standard envelope', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context(), handlerOf(ApiRes(PJB.LIST, [1, 2]))),
    );
    expect(result).toMatchObject({ code: 'PJB200_01', data: [1, 2] });
  });

  it('auto-wraps a plain return value', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context(), handlerOf({ x: 1 })),
    );
    expect(result).toMatchObject({ code: 'GEN200_00', data: { x: 1 } });
  });

  it('leaves an SSE event untouched', async () => {
    // Nest's @Sse() expects raw { data } MessageEvents. Wrapping them in the
    // API envelope produces `data: {"code":...,"data":{"data":{...}}}` on the
    // wire, which parses fine but carries no usable fields — the client
    // silently ignores every event and the stream appears dead.
    const event = { data: { jobId: 'j1' } };
    const result = await firstValueFrom(
      interceptor.intercept(context(true), handlerOf(event)),
    );
    expect(result).toBe(event);
  });
});
