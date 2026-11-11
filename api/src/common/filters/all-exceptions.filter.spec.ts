import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter, planErrorDetails } from './all-exceptions.filter';

const limitBody = {
  error: 'PLAN_LIMIT_REACHED',
  resource: 'products',
  limit: 100,
  used: 100,
  plan: 'starter',
  message: 'Limite de votre abonnement atteinte : 100 produits maximum.',
};

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/products', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return json.mock.calls[0][0] as Record<string, unknown>;
}

describe('planErrorDetails', () => {
  it('returns the body of a plan-limit 403', () => {
    expect(planErrorDetails(new ForbiddenException(limitBody))).toEqual(
      limitBody,
    );
  });

  it('ignores ordinary 403s and other statuses', () => {
    expect(planErrorDetails(new ForbiddenException('Accès refusé'))).toBeNull();
    expect(
      planErrorDetails(
        new BadRequestException({ error: 'PLAN_LIMIT_REACHED' }),
      ),
    ).toBeNull();
    expect(planErrorDetails(new Error('boom'))).toBeNull();
  });
});

describe('AllExceptionsFilter in production', () => {
  const env = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => {
    process.env.NODE_ENV = env;
    jest.restoreAllMocks();
  });

  it('keeps plan-limit details so the back-office can show the limit dialog', () => {
    const body = run(new ForbiddenException(limitBody));
    expect(body.status).toBe(403);
    expect(body.metadata).toEqual({ details: limitBody });
  });

  it('still strips metadata from every other error', () => {
    expect(run(new ForbiddenException('Accès refusé')).metadata).toBeNull();
    expect(run(new BadRequestException('bad')).metadata).toBeNull();
  });
});
