import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const corsOrigin = configService.get<string[]>('app.corsOrigin') ?? [];
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';

  // CORS: allow configured origins + wildcard subdomain matching
  const corsOriginOption = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) {
      callback(null, true);
      return;
    }
    // In development, allow any *.localhost origin for tenant subdomains
    if (
      nodeEnv !== 'production' &&
      /^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
      return;
    }
    // Check configured origins (exact match or wildcard subdomains)
    const allowed = corsOrigin.some((o) => {
      if (o.startsWith('https://*.') || o.startsWith('http://*.')) {
        // Convert wildcard pattern to regex: https://*.example.com -> any subdomain
        const domain = o.replace(/^https?:\/\/\*\./, '');
        const regex = new RegExp(
          `^https?://[a-z0-9-]+\\.${domain.replace(/\./g, '\\.')}$`,
        );
        return regex.test(origin);
      }
      return o === origin;
    });
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };

  // Root path handler - redirect to API documentation or health check
  app.use(
    '/',
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (req.path === '/') {
        res.json({
          message: 'Morocom API',
          version: '1.0.0',
          docs: '/api/docs',
          health: '/api/health',
        });
        return;
      }
      next();
    },
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Increase body limit to handle base64-encoded logo uploads in onboarding
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            'data:',
            'http://localhost:9000',
            'https://*.amazonaws.com',
          ],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS
  app.enableCors({
    origin: corsOriginOption,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ApiResponseInterceptor(),
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Global unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Start server
  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`);
}
void bootstrap();
