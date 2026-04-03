import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { createQueueBoardAuthMiddleware } from './queue-board-auth.factory';

/**
 * Mounts the Bull Board queue-monitoring dashboard at /queues.
 *
 * Security:
 *   The route is protected by HTTP Basic Auth via createQueueBoardAuthMiddleware().
 *   The middleware is applied BEFORE the Bull Board Express router inside
 *   BullBoardModule.forRoot()'s configure(), so every request (UI, API calls,
 *   static assets) is authenticated before Bull Board handles it.
 *
 *   Credentials are configured via the env vars QUEUE_BOARD_USER / QUEUE_BOARD_PASS.
 *   The dashboard is blocked entirely when QUEUE_BOARD_PASS is not set.
 *
 * Prefix exclusion:
 *   main.ts excludes '/queues' from the global 'api' prefix so the dashboard
 *   is served at /queues (not /api/queues). BullBoardModule.forRoot() detects
 *   this exclusion and sets the correct basePath for the client-side SPA.
 *
 * Queue registration:
 *   Individual queues are registered via BullBoardModule.forFeature() inside
 *   each feature module (pdf, notifications, bulk). Because BullBoardModule is
 *   global, forFeature() calls from any module are automatically linked here.
 */
@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      middleware: createQueueBoardAuthMiddleware(),
    }),
  ],
})
export class QueueBoardModule {}
